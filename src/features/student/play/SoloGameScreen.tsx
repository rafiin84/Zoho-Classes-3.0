"use client";
import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Flame, CaretLeft, Trophy } from "@phosphor-icons/react";
import type { ScreenProps } from "@/types/screens";
import { learningProfileService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { Button, Card, CardBody, EmptyState, Progress, toast } from "@/components/ui";
import { cn } from "@/lib/utils";
import { GAMES } from "./games";
import { byTopic, type Topic } from "./questions";

const SECS = 15;
export default function SoloGameScreen({ params }: ScreenProps) {
  const game = GAMES.find((g) => g.id === params.id && g.mode === "solo");
  const { studentId } = useActors();
  const qc = useQueryClient();
  const qs = React.useMemo(() => (game ? byTopic(game.id as Topic | "mixed").slice(0, game.id === "mixed" ? 8 : 4) : []), [game]);
  const [i, setI] = React.useState(0);
  const [pick, setPick] = React.useState<number | null>(null);
  const [score, setScore] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  const [correct, setCorrect] = React.useState(0);
  const [left, setLeft] = React.useState(SECS);
  const [done, setDone] = React.useState(false);
  const save = useMutation({ mutationFn: () => learningProfileService.recordGame(studentId, `${game!.title} (solo)`, `${correct}/${qs.length} · ${score} pts`), onSuccess: () => qc.invalidateQueries({ predicate: (q) => /profile|learning/i.test(JSON.stringify(q.queryKey)) }), onError: () => toast.error("Couldn't save the result", "Try again from the button below.") });
  React.useEffect(() => { if (done || pick !== null) return; if (left <= 0) { setPick(-1); setStreak(0); return; } const t = setTimeout(() => setLeft((l) => l - 1), 1000); return () => clearTimeout(t); }, [left, pick, done]);
  React.useEffect(() => { if (done && !save.isSuccess && !save.isPending && !save.isError) save.mutate(); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!game) return <EmptyState title="That game isn't available" body="Pick one from the catalogue." action={{ label: "All games", href: "/student/play/games" }} />;
  const q = qs[i];
  const choose = (n: number) => { if (pick !== null) return; setPick(n); if (n === q.answer) { setCorrect((c) => c + 1); setStreak((s) => s + 1); setScore((s) => s + 10 + Math.min(streak, 4) * 2 + Math.floor(left / 3)); } else setStreak(0); };
  const next = () => { if (i + 1 >= qs.length) setDone(true); else { setI(i + 1); setPick(null); setLeft(SECS); } };
  const restart = () => { setI(0); setPick(null); setScore(0); setStreak(0); setCorrect(0); setLeft(SECS); setDone(false); save.reset(); };

  if (done) return (
    <div className="mx-auto max-w-lg"><Card><CardBody className="space-y-3 text-center">
      <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 12 }}><Trophy size={64} weight="duotone" className="mx-auto text-highlight" /></motion.div>
      <h1 className="text-display">{correct === qs.length ? "Perfect run!" : correct >= qs.length / 2 ? "Nice work!" : "Good try — every round helps"}</h1>
      <p className="tnum text-lg">{correct}/{qs.length} correct · {score} points</p>
      <p role="status" className="rounded-xl bg-surface-2 p-3 text-sm">{save.isSuccess ? <><CheckCircle size={16} weight="fill" className="mr-1 inline text-success" />Result saved in your learning activity history. <Link className="font-semibold text-primary underline" href="/student/you/learning-profile">View</Link></> : save.isError ? "Couldn't save yet." : "Saving to your learning history…"}</p>
      <div className="flex justify-center gap-2"><Button onClick={restart}>Play again</Button><Button asChild variant="soft"><Link href="/student/play">Back to Play</Link></Button>{save.isError && <Button variant="outline" onClick={() => save.mutate()}>Retry save</Button>}</div>
    </CardBody></Card></div>
  );
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/student/play" className="inline-flex items-center gap-1 text-sm font-semibold text-text-2"><CaretLeft size={16} /> Quit</Link>
      <div className="flex items-center gap-3"><span className="tnum text-sm font-semibold">{i + 1}/{qs.length}</span><Progress value={((i + (pick !== null ? 1 : 0)) / qs.length) * 100} label="Game progress" /><span className="inline-flex items-center gap-1 text-sm font-bold text-warning"><Flame size={16} weight="fill" /><span className="tnum">{streak}</span></span><span className="tnum text-sm font-bold">{score}</span></div>
      <div className="flex items-center gap-2" role="timer" aria-label={`${left} seconds left`}><span className="tnum w-8 text-lg font-bold">{left}</span><Progress value={(left / SECS) * 100} tone={left <= 5 ? "danger" : "primary"} size="sm" label="Time left" /></div>
      <Card><CardBody><p className="text-xl font-bold leading-snug">{q.q}</p></CardBody></Card>
      <div className="grid gap-3" role="group" aria-label="Answers">{q.options.map((o, n) => {
        const right = pick !== null && n === q.answer, wrong = pick === n && n !== q.answer;
        return <button key={n} disabled={pick !== null} onClick={() => choose(n)} className={cn("flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 text-left font-semibold transition-colors", right ? "border-success bg-success-soft" : wrong ? "border-danger bg-danger-soft" : "border-border bg-surface hover:bg-surface-2")}><span className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-sm font-bold">{"ABCD"[n]}</span><span className="flex-1">{o}</span>{right && <CheckCircle size={22} weight="fill" className="text-success" />}{wrong && <XCircle size={22} weight="fill" className="text-danger" />}</button>;
      })}</div>
      {pick !== null && <div role="status" className="rounded-2xl bg-lilac p-4 text-sm"><p className="font-semibold">{pick === q.answer ? "Correct!" : pick === -1 ? "Time's up — no worries." : "Not quite."}</p><p className="mt-1">{q.why}</p><Button className="mt-3" onClick={next}>{i + 1 >= qs.length ? "Finish" : "Next question"}</Button></div>}
    </div>
  );
}
