"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { learningProfileService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { ROPE_MAX, TEAM_META, questionOf, timeLeftMs, useTug, type Session, type Team } from "./tug-store";

export function useNow(ms = 200) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => { const i = window.setInterval(() => setNow(Date.now()), ms); return () => window.clearInterval(i); }, [ms]);
  return now;
}
export const LETTERS = ["A", "B", "C", "D"];
// Distinct shapes + letters so answer buttons never rely on colour alone.
export const ANSWER_STYLE = ["bg-[#3B33B8] hover:bg-[#4a41d4]", "bg-[#6A2FBF] hover:bg-[#7c3fd6]", "bg-[#0F6B8F] hover:bg-[#1384ad]", "bg-[#8A4B00] hover:bg-[#a55d05]"];

export function Rope({ rope, big }: { rope: number; big?: boolean }) {
  const pct = 50 - (rope / ROPE_MAX) * 42;
  return (
    <div className="w-full" role="img" aria-label={`Rope marker: ${rope === 0 ? "centre" : rope > 0 ? `${rope} step${rope > 1 ? "s" : ""} towards ${TEAM_META.A.name}` : `${-rope} step${-rope > 1 ? "s" : ""} towards ${TEAM_META.B.name}`}`}>
      <div className={cn("relative", big ? "h-24" : "h-16")}>
        <div className="absolute inset-x-[6%] top-1/2 h-3 -translate-y-1/2 rounded-full bg-[#c9a36a] shadow-inner" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 6px, transparent 6px 14px)" }} />
        {Array.from({ length: ROPE_MAX * 2 + 1 }).map((_, i) => (
          <span key={i} className={cn("absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full", i === ROPE_MAX ? "h-8 w-1 bg-white" : "size-1.5 bg-white/50")} style={{ left: `${8 + (i / (ROPE_MAX * 2)) * 84}%` }} />
        ))}
        <div className="absolute left-[3%] top-1/2 flex h-12 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-xs font-extrabold text-black" style={{ background: TEAM_META.A.colour }} aria-hidden>WIN</div>
        <div className="absolute right-[3%] top-1/2 flex h-12 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-xs font-extrabold text-black" style={{ background: TEAM_META.B.colour }} aria-hidden>WIN</div>
        <motion.div className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" animate={{ left: `${pct}%` }} transition={{ type: "spring", stiffness: 140, damping: 16 }}>
          <div className={cn("flex items-center justify-center rounded-full border-4 border-white bg-[#E5484D] shadow-lg", big ? "size-14" : "size-10")}><span className="size-2 rounded-full bg-white" /></div>
        </motion.div>
      </div>
      <div className="flex justify-between px-[3%] text-xs font-bold uppercase tracking-wider opacity-80"><span>{TEAM_META.A.short} side</span><span>{TEAM_META.B.short} side</span></div>
    </div>
  );
}

export function Scoreboard({ s, big }: { s: Session; big?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(["A", "B"] as Team[]).map((t) => {
        const m = TEAM_META[t];
        const ans = s.answers[t];
        return (
          <div key={t} className="rounded-2xl border-2 p-3" style={{ borderColor: m.colour, background: m.soft }}>
            <p className={cn("font-bold", big ? "text-2xl" : "text-sm")} style={{ color: m.colour }}>{m.name}</p>
            <p className={cn("tnum font-extrabold leading-none", big ? "mt-1 text-7xl" : "mt-1 text-4xl")}>{s.scores[t]}</p>
            <p className={cn("mt-1 opacity-85", big ? "text-lg" : "text-xs")}>{s.phase === "question" ? (ans ? "Locked in" : "Thinking…") : `${s.log.filter((l) => (t === "A" ? l.a : l.b) === "correct").length} correct`}{t === "B" && s.botB ? " · practice bots" : ""}</p>
          </div>
        );
      })}
    </div>
  );
}

export function Countdown({ s, big }: { s: Session; big?: boolean }) {
  const now = useNow(100);
  const left = timeLeftMs(s, now) / 1000;
  const pct = Math.max(0, Math.min(100, (left / s.timeLimit) * 100));
  return (
    <div className="flex items-center gap-3" role="timer" aria-label={`${Math.ceil(left)} seconds left`}>
      <span className={cn("tnum font-extrabold", big ? "w-24 text-6xl" : "w-12 text-2xl", left <= 5 && s.phase === "question" && "text-[#FF8A8A]")}>{Math.ceil(left)}</span>
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-white/15"><div className={cn("h-full rounded-full transition-[width] duration-100", left <= 5 ? "bg-[#FF8A8A]" : "bg-white")} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function AnswerGrid({ s, onPick, picked, disabled, big }: { s: Session; onPick?: (i: number) => void; picked?: number | null; disabled?: boolean; big?: boolean }) {
  const q = questionOf(s);
  const reveal = s.phase === "reveal" || s.phase === "finished";
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Answer choices">
      {q.options.map((o, i) => {
        const right = reveal && i === q.answer;
        const wrongPick = reveal && picked === i && i !== q.answer;
        return (
          <button key={i} disabled={disabled || reveal || !onPick} onClick={() => onPick?.(i)} aria-pressed={picked === i}
            className={cn("flex items-center gap-4 rounded-2xl border-4 border-transparent px-5 text-left font-bold text-white transition-transform active:scale-[0.98] disabled:cursor-default focus-visible:outline-4 focus-visible:outline-white", big ? "min-h-28 text-4xl" : "min-h-20 text-2xl", ANSWER_STYLE[i], right && "!border-[#7CF0B0] !bg-[#0E7A47]", wrongPick && "!border-[#FF8A8A] !bg-[#8B1F25]", reveal && !right && !wrongPick && "opacity-45", picked === i && !reveal && "!border-white")}>
            <span className={cn("flex shrink-0 items-center justify-center rounded-xl bg-white/20 font-extrabold", big ? "size-16 text-4xl" : "size-11 text-xl")}>{LETTERS[i]}</span>
            <span className="flex-1">{o}</span>
            {right && <span className="text-lg font-extrabold">Correct</span>}
            {wrongPick && <span className="text-lg font-extrabold">Not quite</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Saves a finished game to learning history once (controller tabs only). */
export function useRecordResult(s: Session | null, enabled: boolean) {
  const { studentId } = useActors();
  const qc = useQueryClient();
  const [saved, setSaved] = React.useState(false);
  const running = React.useRef(false);
  const mark = useTug((x) => x.markRecorded);
  React.useEffect(() => {
    if (!s || s.phase !== "finished" || !enabled || s.recorded || running.current) return;
    running.current = true;
    const res = s.winner === "A" ? "Won" : s.winner === "B" ? "Played" : "Draw";
    learningProfileService.recordGame(studentId, "Tug of War · Fractions, ecosystems & ratios", `${res} · ${TEAM_META.A.short} ${s.scores.A}–${s.scores.B} ${TEAM_META.B.short}`).then(() => {
      setSaved(true); mark();
      qc.invalidateQueries({ predicate: (q) => /profile|learning/i.test(JSON.stringify(q.queryKey)) });
    }).finally(() => { running.current = false; });
  }, [s, enabled, studentId, qc, mark]);
  return saved || !!s?.recorded;
}
