"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle, Circle, Lightbulb, X, Fire, Trophy, Star } from "@phosphor-icons/react";
import { Button, Badge, Progress, cn } from "@/components/ui";
import { learningProfileService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { MICRO_BANK, MICRO_TOPICS, type MicroQ, type MicroTopicId } from "@/lib/mock-data/micro";
import { Confetti } from "../components/Confetti";
import { StreakFlame } from "../components/StreakWidget";
import { useInvalidateLearning } from "../hooks";

export type SessionTopic = MicroTopicId | "mixed" | "baseline";
const TOTAL = 5;
const DIFF_LABEL = { 1: "Warm-up", 2: "Steady", 3: "Stretch" } as const;

function pickNext(topic: SessionTopic, used: string[], diff: 1 | 2 | 3, n: number): MicroQ | null {
  const ids: MicroTopicId[] = topic === "mixed" || topic === "baseline" ? MICRO_TOPICS.map((t) => t.id) : [topic];
  const t = ids[n % ids.length];
  const pool = MICRO_BANK.filter((q) => q.topic === t && !used.includes(q.id));
  const fallback = MICRO_BANK.filter((q) => ids.includes(q.topic) && !used.includes(q.id));
  const list = pool.length ? pool : fallback;
  return [...list].sort((a, b) => Math.abs(a.difficulty - diff) - Math.abs(b.difficulty - diff))[0] ?? null;
}

export function Session({ topic, wasDone, streakBefore, onExit }: { topic: SessionTopic; wasDone: boolean; streakBefore: number; onExit: () => void }) {
  const { studentId } = useActors(); const inv = useInvalidateLearning();
  const [used, setUsed] = useState<string[]>([]); const [diff, setDiff] = useState<1 | 2 | 3>(topic === "baseline" ? 1 : 2);
  const [q, setQ] = useState<MicroQ | null>(() => pickNext(topic, [], topic === "baseline" ? 1 : 2, 0));
  const [sel, setSel] = useState<number | null>(null); const [results, setResults] = useState<{ q: MicroQ; ok: boolean }[]>([]);
  const [done, setDone] = useState(false); const [burst, setBurst] = useState(false);
  const saved = useRef(false);
  const label = topic === "mixed" ? "Mixed review" : topic === "baseline" ? "Starter check-in" : MICRO_TOPICS.find((t) => t.id === topic)!.label;
  const score = results.filter((r) => r.ok).length;
  const finish = useMutation({
    mutationFn: async (res: { q: MicroQ; ok: boolean }[]) => { for (const r of res) await learningProfileService.recordMastery(studentId, r.q.objectiveId, r.ok, r.q.label, r.q.subjectId); return learningProfileService.completeChallenge(studentId, res.filter((x) => x.ok).length, res.length, label); },
    onSuccess: () => { inv(); if (!wasDone) { setBurst(true); setTimeout(() => setBurst(false), 2200); } },
  });
  useEffect(() => { if (done && !saved.current) { saved.current = true; finish.mutate(results); } }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = (i: number) => { if (sel !== null || !q) return; setSel(i); };
  const next = () => {
    if (!q || sel === null) return; const ok = sel === q.answer; const res = [...results, { q, ok }]; setResults(res);
    if (res.length >= TOTAL) { setDone(true); return; }
    const nd = (ok ? Math.min(3, diff + 1) : Math.max(1, diff - 1)) as 1 | 2 | 3; const u = [...used, q.id]; setUsed(u); setDiff(nd); setQ(pickNext(topic, u, nd, res.length)); setSel(null);
  };
  const weak = useMemo(() => { const m: Record<string, { label: string; wrong: number }> = {}; results.forEach((r) => { if (!r.ok) { m[r.q.topic] = { label: r.q.label, wrong: (m[r.q.topic]?.wrong ?? 0) + 1 }; } }); return Object.values(m).sort((a, b) => b.wrong - a.wrong)[0]; }, [results]);

  if (done) {
    const points = score * 20;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-xl space-y-5 text-center" role="status">
        <Confetti show={burst} />
        <div className="rounded-[1.75rem] bg-gradient-to-br from-primary via-[#6048e0] to-violet p-7 text-white shadow-glow">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.15 }} className="mx-auto mb-3 flex w-fit"><StreakFlame streak={!wasDone ? streakBefore + 1 : streakBefore} size={84} glow /></motion.div>
          <h2 className="text-3xl font-extrabold tracking-tight">{score === TOTAL ? "Perfect round!" : score >= 3 ? "Nicely done!" : "You showed up — that counts"}</h2>
          <p className="mt-1 text-white/85">{!wasDone ? `Your streak is now ${streakBefore + 1} ${streakBefore + 1 === 1 ? "day" : "days"}.` : "Bonus practice — streak already counted today."}</p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[{ l: "Correct", v: `${score}/${TOTAL}`, i: CheckCircle }, { l: "Points", v: `+${points}`, i: Star }, { l: "Minutes", v: "5", i: Trophy }].map((s) => <div key={s.l} className="rounded-2xl bg-white/15 p-3"><s.i size={20} weight="fill" className="mx-auto mb-1" /><p className="tnum text-xl font-bold">{s.v}</p><p className="text-xs text-white/80">{s.l}</p></div>)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-left">
          <p className="text-label text-text-2">Your next step</p>
          {weak ? <><p className="mt-1 font-semibold">“{weak.label}” is worth another look</p><p className="text-sm text-text-2">A couple of questions tripped you up — totally normal. A short revision path or a quick tutor chat usually fixes it fast.</p>
            <div className="mt-3 flex flex-wrap gap-2"><Button asChild size="sm"><Link href="/student/learn">Open revision path</Link></Button><Button asChild size="sm" variant="outline"><Link href={`/student/tutor?mode=practice&q=${encodeURIComponent(`Explain ${weak.label}`)}`}>Ask my tutor</Link></Button></div></> :
            <><p className="mt-1 font-semibold">You’re on a roll</p><p className="text-sm text-text-2">Try a different topic tomorrow, or keep the momentum with your course.</p><div className="mt-3 flex gap-2"><Button asChild size="sm"><Link href="/student/learn">Continue my journey</Link></Button></div></>}
        </div>
        <ol className="space-y-1.5 text-left" aria-label="Question review">{results.map((r, i) => <li key={r.q.id} className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">{r.ok ? <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-success" /> : <Lightbulb size={18} weight="fill" className="mt-0.5 shrink-0 text-warning" />}<span><span className="tnum font-semibold">{i + 1}. </span>{r.q.q}<span className="block text-xs text-text-2">{r.ok ? "Correct" : r.q.explain}</span></span></li>)}</ol>
        <div className="flex justify-center gap-2"><Button onClick={onExit} variant="soft">Back to daily challenge</Button><Button asChild variant="ghost"><Link href="/student/home">Go Home</Link></Button></div>
        {finish.isPending && <p className="text-xs text-text-2" aria-live="polite">Saving your progress…</p>}
      </motion.div>
    );
  }
  if (!q) return null;
  const answered = sel !== null; const correct = sel === q.answer;
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center gap-3"><Button variant="ghost" size="iconSm" aria-label="Leave session" onClick={onExit}><X size={20} /></Button><Progress value={((results.length + (answered ? 1 : 0)) / TOTAL) * 100} className="flex-1" label="Session progress" /><span className="tnum text-sm font-semibold text-text-2">{results.length + 1}/{TOTAL}</span></div>
      <div className="flex items-center justify-between"><Badge tone="primary">{label}</Badge><Badge tone={diff === 3 ? "highlight" : "neutral"} icon={<Fire size={12} weight="fill" />}>{DIFF_LABEL[diff]}</Badge></div>
      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-4">
          <h2 className="text-2xl font-bold leading-snug tracking-tight sm:text-3xl">{q.q}</h2>
          <div className="space-y-2.5" role="group" aria-label="Answer options">
            {q.options.map((o, i) => {
              const isAns = i === q.answer; const chosen = sel === i;
              return <button key={i} type="button" onClick={() => answer(i)} disabled={answered} aria-pressed={chosen}
                className={cn("flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base font-medium transition-all", !answered && "border-border bg-surface hover:-translate-y-0.5 hover:border-primary hover:shadow-card", answered && isAns && "border-success bg-success-soft text-success", answered && chosen && !isAns && "border-warning bg-warning-soft text-warning", answered && !isAns && !chosen && "border-border opacity-55")}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-text-2">{String.fromCharCode(65 + i)}</span>{o}
                {answered && isAns && <CheckCircle size={22} weight="fill" className="ml-auto" />}{answered && chosen && !isAns && <Circle size={22} className="ml-auto" />}
              </button>;
            })}
          </div>
          {answered && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="status" className={cn("rounded-2xl p-4", correct ? "bg-success-soft" : "bg-highlight-soft")}>
            <p className={cn("font-bold", correct ? "text-success" : "text-warning")}>{correct ? "Yes — nice thinking!" : "Not this time — here’s the trick"}</p><p className="mt-0.5 text-sm text-text-2">{q.explain}</p>
          </motion.div>}
        </motion.div>
      </AnimatePresence>
      <Button size="lg" className="w-full" disabled={!answered} onClick={next}>{results.length + 1 >= TOTAL ? "Finish" : "Next question"}<ArrowRight size={18} weight="bold" /></Button>
    </div>
  );
}
