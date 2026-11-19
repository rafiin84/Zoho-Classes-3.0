"use client";
import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Pause, Play, SkipForward, Stop, X, ArrowCounterClockwise, CheckCircle, UsersThree, Trophy, Gear } from "@phosphor-icons/react";
import type { ScreenProps } from "@/types/screens";
import { useViewer } from "../community/useViewer";
import { connectTug, GAME_CODE, questionOf, TEAM_META, TOTAL_Q, useTug, type Team, type WrongRule } from "./tug-store";
import { AnswerGrid, Countdown, Rope, Scoreboard, useRecordResult } from "./tug-ui";

const BTN = "inline-flex h-14 items-center justify-center gap-2 rounded-2xl px-6 text-lg font-bold focus-visible:outline-4 focus-visible:outline-white disabled:opacity-40";

export function PlayersList({ team, big }: { team: Team; big?: boolean }) {
  const s = useTug((x) => x.session)!;
  const ps = s.players.filter((p) => p.team === team);
  const m = TEAM_META[team];
  return (
    <div className="rounded-2xl border-2 p-4" style={{ borderColor: m.colour, background: m.soft }}>
      <p className={big ? "text-2xl font-bold" : "font-bold"} style={{ color: m.colour }}>{m.name} <span className="tnum text-white/80">· {ps.length + (team === "B" && s.botB ? 2 : 0)}</span></p>
      <ul className={big ? "mt-2 space-y-1 text-xl" : "mt-2 space-y-1 text-sm"}>
        {ps.map((p) => <li key={p.id}>{p.name} <span className="text-white/60">· {p.source}</span></li>)}
        {team === "B" && s.botB && <><li>Practice bot 1 <span className="text-white/60">· simulated</span></li><li>Practice bot 2 <span className="text-white/60">· simulated</span></li></>}
        {ps.length === 0 && !(team === "B" && s.botB) && <li className="text-white/60">Waiting for players…</li>}
      </ul>
    </div>
  );
}

export default function TugHostScreen({ searchParams }: ScreenProps) {
  const viewer = useViewer();
  const s = useTug((x) => x.session);
  const st = useTug();
  const launched = searchParams.launch === "teacher";
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const off = connectTug(true);
    const cur = useTug.getState().session;
    if (!cur || cur.phase === "finished" || (launched && cur.launchedBy !== "teacher" && cur.phase === "lobby")) useTug.getState().host({ launchedBy: launched ? "teacher" : "self" });
    setReady(true);
    return off;
  }, [launched]);
  const saved = useRecordResult(s, true);
  if (!ready || !s) return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#12102e] text-2xl text-white" role="status">Setting up the game…</div>;

  const q = questionOf(s);
  const playing = s.phase === "question" || s.phase === "reveal" || s.phase === "paused";
  const lastLog = s.log[s.log.length - 1];

  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-[#12102e] text-white" data-mode="tug-host">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/15 px-5 py-3">
        <Link href="/student/play" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/10 px-4 font-semibold hover:bg-white/20" aria-label="Exit game"><X size={20} /> Exit</Link>
        <div className="mr-auto"><p className="text-xs uppercase tracking-widest text-white/70">Tug of War · shared screen</p><p className="text-lg font-bold">Join code <span className="tnum rounded-lg bg-white/15 px-2 py-0.5 tracking-widest">{s.code}</span></p></div>
        {playing && <p className="tnum text-xl font-bold" aria-live="polite">Question {Math.min(s.qIndex + 1, TOTAL_Q)} / {s.questionIds.length}</p>}
        {playing && (<div className="flex gap-2" role="group" aria-label="Host controls">
          {s.phase === "paused" ? <button className={`${BTN} bg-[#12805C]`} onClick={st.resume}><Play size={22} weight="fill" /> Resume</button> : <button className={`${BTN} bg-white/15`} onClick={st.pause} disabled={s.phase !== "question"}><Pause size={22} weight="fill" /> Pause</button>}
          <button className={`${BTN} bg-white/15`} onClick={st.next} disabled={s.phase === "paused"}><SkipForward size={22} weight="fill" /> Next</button>
          <button className={`${BTN} bg-[#8B1F25]`} onClick={st.end}><Stop size={22} weight="fill" /> End</button>
        </div>)}
      </header>

      {s.phase === "lobby" && (
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-8 p-6 lg:p-10">
          {s.launchedBy === "teacher" && <p className="rounded-2xl bg-[#1D6FB8]/40 px-5 py-3 text-xl font-semibold">Launched by Mrs. Priya Nair for Grade 8B · Mathematics</p>}
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h1 className="text-6xl font-extrabold leading-tight tracking-tight">Tug of War</h1>
              <p className="mt-3 text-2xl text-white/85">Fractions, ecosystems and ratios. {TOTAL_Q} questions. Pull the rope to your side.</p>
              <p className="mt-8 text-xl text-white/80">On your phone open <b>Play → Tug of War → Join</b> and enter</p>
              <p className="tnum mt-2 text-8xl font-extrabold tracking-widest" aria-label={`Join code ${s.code.split("").join(" ")}`}>{s.code}</p>
              <p className="mt-4 text-lg text-white/70">No phone? Tap answers on this screen — you play for {TEAM_META.A.name} against practice bots.</p>
            </div>
            <div className="space-y-4"><PlayersList team="A" big /><PlayersList team="B" big />
              <div className="rounded-2xl border border-white/20 p-4" aria-label="Game settings">
                <p className="mb-3 flex items-center gap-2 text-lg font-bold"><Gear size={20} /> Rules</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold">When a team answers wrong
                    <select value={s.rule} onChange={(e) => st.setRule(e.target.value as WrongRule)} className="mt-1 h-12 w-full rounded-xl border-2 border-white/30 bg-[#1d1a4a] px-3 text-base text-white">
                      <option value="slip">Rope slips back one step</option><option value="none">No move</option><option value="bonus">Other team gains 5 bonus points</option></select></label>
                  <label className="text-sm font-semibold">Seconds per question
                    <select value={s.timeLimit} onChange={(e) => st.setTime(Number(e.target.value))} className="mt-1 h-12 w-full rounded-xl border-2 border-white/30 bg-[#1d1a4a] px-3 text-base text-white"><option value={12}>12</option><option value={20}>20</option><option value={30}>30</option></select></label>
                </div>
                <label className="mt-3 flex items-center gap-3 text-base"><input type="checkbox" className="size-6" checked={s.botB} onChange={(e) => st.setBot(e.target.checked)} /> Practice bots play {TEAM_META.B.name} (simulated)</label>
              </div>
            </div>
          </div>
          <div className="flex justify-center"><button className={`${BTN} h-20 bg-[#5146E5] px-14 text-3xl`} onClick={st.start}><Play size={32} weight="fill" /> Start game</button></div>
        </main>
      )}

      {playing && (
        <main className="mx-auto grid w-full max-w-[1500px] flex-1 content-start gap-5 p-5 lg:p-8">
          <Scoreboard s={s} big />
          <Rope rope={s.rope} big />
          <Countdown s={s} big />
          <motion.h2 key={s.qIndex} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-extrabold leading-tight lg:text-6xl">{q.q}</motion.h2>
          {s.phase === "paused" && <p role="status" className="rounded-2xl bg-white/15 p-4 text-2xl font-bold">Paused by the host. Press Resume to continue.</p>}
          <AnswerGrid s={s} big picked={s.answers.A?.choice ?? null} disabled={s.phase !== "question" || !!s.answers.A} onPick={(i) => st.answer("A", i)} />
          <p className="text-lg text-white/75">{s.phase === "question" ? (s.answers.A ? `${TEAM_META.A.name} locked in. Waiting for ${TEAM_META.B.name}…` : `Tap an answer for ${TEAM_META.A.name} — or let phones answer for their teams.`) : ""}</p>
          {s.phase === "reveal" && lastLog && (
            <div role="status" className="rounded-2xl bg-white/10 p-5 text-2xl">
              <p className="font-bold">{lastLog.delta > 0 ? `${TEAM_META.A.name} pulls ${lastLog.delta} step${lastLog.delta > 1 ? "s" : ""}!` : lastLog.delta < 0 ? `${TEAM_META.B.name} pulls ${-lastLog.delta} step${lastLog.delta < -1 ? "s" : ""}!` : "The rope holds steady."}</p>
              <p className="mt-1 text-xl text-white/85">{q.why}</p>
            </div>
          )}
        </main>
      )}

      {s.phase === "finished" && (
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
          <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}><Trophy size={120} weight="duotone" className="text-[#F5C66A]" /></motion.div>
          <h1 className="text-7xl font-extrabold">{s.winner === "draw" ? "It's a draw!" : `${TEAM_META[s.winner as Team].name} wins!`}</h1>
          <p className="text-3xl text-white/85">{s.winner === "draw" ? "Both teams pulled equally hard." : "Great teamwork from everyone who played."}</p>
          <div className="w-full"><Scoreboard s={s} big /></div>
          <div className="w-full"><Rope rope={s.rope} big /></div>
          <p className="flex items-center gap-2 text-xl" role="status"><CheckCircle size={26} weight="fill" className="text-[#7CF0B0]" /> {saved ? <>Result saved in learning activity history for {viewer.name}. <Link className="underline" href="/student/you/learning-profile">View</Link></> : "Saving result to learning activity history…"}</p>
          <div className="flex flex-wrap justify-center gap-3"><button className={`${BTN} bg-[#5146E5]`} onClick={st.reset}><ArrowCounterClockwise size={22} /> Play again</button><Link href="/student/play" className={`${BTN} bg-white/15`}>Back to Play</Link></div>
        </main>
      )}
      <footer className="border-t border-white/10 px-5 py-2 text-sm text-white/65"><UsersThree size={14} className="mr-1 inline" /> Open <b>/student/play/tug-of-war/join</b> in a second tab to join as a phone player (code {GAME_CODE}). Demo content — bots are simulated.</footer>
    </div>
  );
}
