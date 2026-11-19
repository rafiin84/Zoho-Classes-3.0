"use client";
/**
 * Shared local game-session store for Tug of War (host / phone / tablet modes).
 * - Pure, deterministic rules. Bot-simulated answers for Team Nova so one person can play.
 * - Sync between tabs: BroadcastChannel (+ localStorage snapshot for late joiners). A "controller" tab (host or tablet)
 *   owns the clock and applies answers sent from phone tabs; phones only send intents.
 * - Timers are absolute timestamps (endsAt / revealUntil), so every tab can render the same countdown without ticking state.
 */
import { create } from "zustand";
import { QUESTIONS, type Mcq } from "./questions";

export type Team = "A" | "B";
export type Phase = "lobby" | "question" | "reveal" | "paused" | "finished";
export type WrongRule = "slip" | "none" | "bonus";
export interface Player { id: string; name: string; team: Team; source: "phone" | "host" | "tablet" }
export interface QResult { qi: number; a: "correct" | "wrong" | "none"; b: "correct" | "wrong" | "none"; delta: number; correctIdx: number }
export interface Session {
  code: string; phase: Phase; rule: WrongRule; timeLimit: number; qIndex: number; qStartAt: number; endsAt: number; pausedLeft: number; revealUntil: number;
  rope: number; scores: Record<Team, number>; answers: Partial<Record<Team, { choice: number; at: number }>>; players: Player[]; botB: boolean;
  log: QResult[]; winner: Team | "draw" | null; recorded: boolean; launchedBy: "self" | "teacher"; questionIds: string[]; rev: number; teamNames: Record<Team, string>;
}

export const ROPE_MAX = 5;
export const TOTAL_Q = 10;
export const REVEAL_MS = 3400;
export const GAME_CODE = "TUG-4721";
export const TEAM_META: Record<Team, { name: string; short: string; colour: string; soft: string; icon: string }> = {
  A: { name: "Team Orbit", short: "Orbit", colour: "#8B7DFF", soft: "rgba(139,125,255,.22)", icon: "Planet" },
  B: { name: "Team Nova", short: "Nova", colour: "#F5C66A", soft: "rgba(245,198,106,.22)", icon: "Star" },
};
const BOT_CORRECT = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0];
const BOT_DELAY_S = [6, 9, 5, 11, 8, 7, 12, 6, 10, 5];
export const questionOf = (s: Session, i = s.qIndex): Mcq => QUESTIONS.find((q) => q.id === s.questionIds[i]) ?? QUESTIONS[0];
export const botPlan = (qi: number, correctIdx: number) => ({ delayMs: BOT_DELAY_S[qi % 10] * 1000, choice: BOT_CORRECT[qi % 10] ? correctIdx : (correctIdx + 1) % 4 });
export const timeLeftMs = (s: Session, now: number) => (s.phase === "paused" ? s.pausedLeft : s.phase === "question" ? Math.max(0, s.endsAt - now) : 0);

const fresh = (o: Partial<Session> = {}): Session => ({
  code: GAME_CODE, phase: "lobby", rule: "slip", timeLimit: 20, qIndex: 0, qStartAt: 0, endsAt: 0, pausedLeft: 0, revealUntil: 0, rope: 0, scores: { A: 0, B: 0 }, answers: {}, players: [],
  botB: true, log: [], winner: null, recorded: false, launchedBy: "self", questionIds: QUESTIONS.slice(0, TOTAL_Q).map((q) => q.id), rev: 1, teamNames: { A: TEAM_META.A.name, B: TEAM_META.B.name }, ...o,
});

function resolve(s: Session, now: number): Session {
  const q = questionOf(s);
  const st = (t: Team): "correct" | "wrong" | "none" => (s.answers[t] ? (s.answers[t]!.choice === q.answer ? "correct" : "wrong") : "none");
  const a = st("A"), b = st("B");
  let delta = 0; const scores = { ...s.scores };
  const pts = (t: Team) => 10 + Math.round(5 * Math.max(0, 1 - ((s.answers[t]!.at - s.qStartAt) / (s.timeLimit * 1000))));
  if (a === "correct") { delta += 1; scores.A += pts("A"); }
  if (b === "correct") { delta -= 1; scores.B += pts("B"); }
  if (a === "correct" && b === "correct") delta += s.answers.A!.at <= s.answers.B!.at ? 1 : -1; // faster team pulls one extra step
  if (a === "wrong") { if (s.rule === "slip") delta -= 1; if (s.rule === "bonus") scores.B += 5; }
  if (b === "wrong") { if (s.rule === "slip") delta += 1; if (s.rule === "bonus") scores.A += 5; }
  const rope = Math.max(-ROPE_MAX, Math.min(ROPE_MAX, s.rope + delta));
  return { ...s, phase: "reveal", rope, scores, revealUntil: now + REVEAL_MS, log: [...s.log, { qi: s.qIndex, a, b, delta, correctIdx: q.answer }] };
}
function finish(s: Session): Session {
  const winner: Session["winner"] = s.rope > 0 ? "A" : s.rope < 0 ? "B" : s.scores.A > s.scores.B ? "A" : s.scores.B > s.scores.A ? "B" : "draw";
  return { ...s, phase: "finished", winner, endsAt: 0 };
}
function begin(s: Session, now: number): Session { return { ...s, phase: "question", answers: {}, qStartAt: now, endsAt: now + s.timeLimit * 1000 }; }

/** Advance the clock. Idempotent and deterministic — safe if two controller tabs both call it. */
export function advance(s: Session, now: number): Session {
  if (s.phase === "question") {
    let n = s;
    if (n.botB && !n.answers.B) { const p = botPlan(n.qIndex, questionOf(n).answer); if (p.delayMs < n.timeLimit * 1000 && now >= n.qStartAt + p.delayMs) n = { ...n, answers: { ...n.answers, B: { choice: p.choice, at: n.qStartAt + p.delayMs } } }; }
    if ((n.answers.A && n.answers.B) || now >= n.endsAt) return resolve(n, Math.max(now, n.qStartAt));
    return n === s ? s : n;
  }
  if (s.phase === "reveal" && now >= s.revealUntil) {
    if (Math.abs(s.rope) >= ROPE_MAX || s.qIndex + 1 >= s.questionIds.length) return finish(s);
    return begin({ ...s, qIndex: s.qIndex + 1 }, now);
  }
  return s;
}

const KEY = "zc3-tug-session";
let channel: BroadcastChannel | null = null;
let controller = false;
export const tabId = typeof window === "undefined" ? "ssr" : Math.random().toString(36).slice(2, 8);

interface TugState {
  session: Session | null;
  me: { id: string; name: string; team: Team } | null;
  /** apply a local change and broadcast it */
  commit: (fn: (s: Session) => Session) => void;
  host: (o?: { launchedBy?: "self" | "teacher" }) => void;
  join: (name: string, source: Player["source"]) => { ok: boolean; reason?: string };
  answer: (team: Team, choice: number) => void;
  start: () => void; pause: () => void; resume: () => void; next: () => void; end: () => void; reset: () => void;
  setRule: (r: WrongRule) => void; setTime: (n: number) => void; setBot: (v: boolean) => void; markRecorded: () => void;
  tick: () => void;
}

const persist = (s: Session | null) => { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* storage unavailable */ } };
const post = (m: unknown) => { try { channel?.postMessage(m); } catch { /* ignore */ } };

export const useTug = create<TugState>((set, get) => ({
  session: null, me: null,
  commit: (fn) => { const cur = get().session; if (!cur) return; const n = { ...fn(cur), rev: cur.rev + 1 }; set({ session: n }); persist(n); post({ t: "state", s: n, from: tabId }); },
  host: (o) => { const n = fresh({ launchedBy: o?.launchedBy ?? "self" }); set({ session: n }); persist(n); post({ t: "state", s: n, from: tabId }); },
  join: (name, source) => {
    const s = get().session;
    if (!s) return { ok: false, reason: "No game found" };
    if (s.phase === "finished") return { ok: false, reason: "That game has finished" };
    const exists = s.players.find((p) => p.name === name && p.source === source);
    const humanA = s.players.filter((p) => p.team === "A").length, humanB = s.players.filter((p) => p.team === "B").length;
    const team: Team = exists?.team ?? (humanA <= humanB ? "A" : "B");
    const pl: Player = exists ?? { id: `${tabId}-${s.players.length}`, name, team, source };
    if (!exists) { if (controller) get().commit((x) => ({ ...x, players: [...x.players, pl], botB: team === "B" ? false : x.botB })); else post({ t: "act", a: "join", pl }); }
    set({ me: { id: pl.id, name, team: pl.team } });
    return { ok: true };
  },
  answer: (team, choice) => {
    const apply = (s: Session): Session => (s.phase === "question" && !s.answers[team] ? { ...s, answers: { ...s.answers, [team]: { choice, at: Date.now() } } } : s);
    if (controller) { get().commit(apply); get().tick(); } else post({ t: "act", a: "answer", team, choice, at: Date.now() });
  },
  start: () => get().commit((s) => (s.phase === "lobby" ? begin({ ...s, rope: 0, scores: { A: 0, B: 0 }, log: [], qIndex: 0, winner: null, recorded: false }, Date.now()) : s)),
  pause: () => get().commit((s) => (s.phase === "question" ? { ...s, phase: "paused", pausedLeft: Math.max(0, s.endsAt - Date.now()) } : s)),
  resume: () => get().commit((s) => (s.phase === "paused" ? { ...s, phase: "question", endsAt: Date.now() + s.pausedLeft, qStartAt: Date.now() - (s.timeLimit * 1000 - s.pausedLeft) } : s)),
  next: () => get().commit((s) => (s.phase === "question" ? resolve(s, Date.now()) : s.phase === "reveal" ? advance({ ...s, revealUntil: 0 }, Date.now()) : s)),
  end: () => get().commit((s) => (s.phase === "finished" || s.phase === "lobby" ? s : finish(s))),
  reset: () => { const s = get().session; get().host({ launchedBy: s?.launchedBy }); },
  setRule: (rule) => get().commit((s) => ({ ...s, rule })),
  setTime: (timeLimit) => get().commit((s) => ({ ...s, timeLimit })),
  setBot: (botB) => get().commit((s) => ({ ...s, botB })),
  markRecorded: () => get().commit((s) => ({ ...s, recorded: true })),
  tick: () => { const s = get().session; if (!s || !controller) return; const n = advance(s, Date.now()); if (n !== s) get().commit(() => n); },
}));

/** Connects this tab to the shared session. `isController` tabs (host/tablet) run the clock and apply phone intents. */
export function connectTug(isController: boolean): () => void {
  if (typeof window === "undefined") return () => {};
  controller = isController;
  try { const raw = localStorage.getItem(KEY); if (raw && !useTug.getState().session) useTug.setState({ session: JSON.parse(raw) as Session }); } catch { /* ignore */ }
  try { channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("zc3-tug") : null; } catch { channel = null; }
  const onMsg = (e: MessageEvent) => {
    const m = e.data as { t: string; s?: Session; from?: string; a?: string; pl?: Player; team?: Team; choice?: number; at?: number };
    if (m.t === "state" && m.s && m.from !== tabId) { const cur = useTug.getState().session; if (!cur || m.s.rev >= cur.rev || m.s.code !== cur.code) useTug.setState({ session: m.s }); }
    if (m.t === "hello" && controller) { const s = useTug.getState().session; if (s) post({ t: "state", s, from: tabId }); }
    if (m.t === "act" && controller) {
      const st = useTug.getState();
      if (m.a === "join" && m.pl) st.commit((s) => (s.players.some((p) => p.id === m.pl!.id) ? s : { ...s, players: [...s.players, m.pl!], botB: m.pl!.team === "B" ? false : s.botB }));
      if (m.a === "answer" && m.team != null && m.choice != null) { st.commit((s) => (s.phase === "question" && !s.answers[m.team!] ? { ...s, answers: { ...s.answers, [m.team!]: { choice: m.choice!, at: m.at ?? Date.now() } } } : s)); st.tick(); }
    }
  };
  const onStorage = (e: StorageEvent) => { if (e.key === KEY && e.newValue) { try { const s = JSON.parse(e.newValue) as Session; const cur = useTug.getState().session; if (!cur || s.rev > cur.rev || s.code !== cur.code) useTug.setState({ session: s }); } catch { /* ignore */ } } };
  channel?.addEventListener("message", onMsg);
  window.addEventListener("storage", onStorage);
  post({ t: "hello" });
  const iv = isController ? window.setInterval(() => useTug.getState().tick(), 250) : 0;
  return () => { channel?.removeEventListener("message", onMsg); channel?.close(); channel = null; window.removeEventListener("storage", onStorage); if (iv) window.clearInterval(iv); controller = false; };
}
