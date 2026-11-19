"use client";
import * as React from "react";
import Link from "next/link";
import { Pause, Play, SkipForward, Stop, ArrowCounterClockwise, CaretLeft } from "@phosphor-icons/react";
import { Button, Card, Select, Badge } from "@/components/ui";
import { connectTug, questionOf, TEAM_META, TOTAL_Q, useTug, type WrongRule } from "./tug-store";
import { Countdown, Rope, Scoreboard, useRecordResult } from "./tug-ui";
import { PlayersList } from "./TugHostScreen";

/** Tablet mode: team captain / teacher co-host. Controls + live scoreboard; shares the session with the host screen. */
export default function TugTabletScreen() {
  const s = useTug((x) => x.session);
  const st = useTug();
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => { const off = connectTug(true); if (!useTug.getState().session) useTug.getState().host(); setReady(true); return off; }, []);
  useRecordResult(s, true);
  if (!ready || !s) return <p role="status" className="p-6">Connecting to the game…</p>;
  const playing = s.phase === "question" || s.phase === "reveal" || s.phase === "paused";
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/student/play" className="inline-flex items-center gap-1 text-sm font-semibold text-text-2"><CaretLeft size={16} /> Play</Link>
      <div className="flex flex-wrap items-center gap-2"><h1 className="text-display">Co-host</h1><Badge tone="primary">Tablet</Badge><Badge>Code {s.code}</Badge><Badge tone={s.phase === "finished" ? "success" : "info"}>{s.phase}</Badge></div>
      <div className="rounded-3xl bg-[#12102e] p-4 text-white sm:p-6" data-mode="tug-tablet">
        <Scoreboard s={s} />
        <div className="my-4"><Rope rope={s.rope} /></div>
        {playing && <><Countdown s={s} /><p className="mt-3 text-xl font-bold">Q{s.qIndex + 1}/{TOTAL_Q}: {questionOf(s).q}</p><p className="text-sm text-white/75">Answer: {["A", "B", "C", "D"][questionOf(s).answer]} · {questionOf(s).options[questionOf(s).answer]} (host-only view)</p></>}
        {s.phase === "finished" && <p className="text-xl font-bold" role="status">{s.winner === "draw" ? "Draw" : `${TEAM_META[s.winner!].name} wins`} · result saved to learning history</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {s.phase === "lobby" && <Button size="lg" onClick={st.start}><Play weight="fill" /> Start game</Button>}
          {s.phase === "question" && <Button size="lg" variant="outline" className="!text-black" onClick={st.pause}><Pause weight="fill" /> Pause</Button>}
          {s.phase === "paused" && <Button size="lg" variant="success" onClick={st.resume}><Play weight="fill" /> Resume</Button>}
          {playing && <Button size="lg" variant="outline" className="!text-black" disabled={s.phase === "paused"} onClick={st.next}><SkipForward weight="fill" /> Next</Button>}
          {playing && <Button size="lg" variant="danger" onClick={st.end}><Stop weight="fill" /> End</Button>}
          {s.phase === "finished" && <Button size="lg" onClick={st.reset}><ArrowCounterClockwise /> New game</Button>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-[#12102e] p-3 text-white"><PlayersList team="A" /></div><div className="rounded-2xl bg-[#12102e] p-3 text-white"><PlayersList team="B" /></div></div>
      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Wrong-answer rule<Select value={s.rule} onChange={(e) => st.setRule(e.target.value as WrongRule)} disabled={playing}><option value="slip">Rope slips back</option><option value="none">No move</option><option value="bonus">Other team +5 bonus</option></Select></label>
        <label className="text-sm font-semibold">Seconds per question<Select value={s.timeLimit} onChange={(e) => st.setTime(Number(e.target.value))} disabled={playing}><option value={12}>12</option><option value={20}>20</option><option value={30}>30</option></Select></label>
      </Card>
    </div>
  );
}
