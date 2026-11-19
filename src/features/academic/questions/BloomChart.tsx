"use client";
import * as React from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { BLOOM, DIFFICULTY, type Paper } from "@/types/questions";
import { analysePaper, bloomActual, difficultyActual, sumMarks } from "@/lib/api/questionPaperService";

/** Live Bloom distribution vs blueprint (marks). Shows text and icons, never colour alone. */
export function BloomChart({ paper }: { paper: Paper }) {
  const act = bloomActual(paper.questions); const tgt = paper.blueprint.bloomMarks; const max = Math.max(1, ...BLOOM.map((b) => Math.max(act[b], tgt[b] ?? 0)));
  const da = difficultyActual(paper.questions); const total = sumMarks(paper.questions);
  return (
    <div>
      <p className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-text-2"><span>Bloom distribution (marks)</span><span className="tnum normal-case">{total} / {paper.totalMarks}</span></p>
      <ul className="space-y-2" aria-label="Bloom distribution versus blueprint">
        {BLOOM.map((b) => { const a = act[b], t = tgt[b] ?? 0, d = a - t, met = Math.abs(d) <= 1;
          return (
            <li key={b} aria-label={`${b}: ${a} marks, blueprint ${t}, ${met ? "met" : d > 0 ? `${d} over` : `${-d} short`}`}>
              <div className="flex items-center justify-between text-xs"><span className="font-semibold">{b}</span><span className={cn("tnum flex items-center gap-1", met ? "text-success" : "text-warning")}>{met ? <CheckCircle size={14} weight="fill" /> : <WarningCircle size={14} weight="fill" />}{a} / {t}{!met && ` (${d > 0 ? "+" : ""}${d})`}</span></div>
              <div className="relative mt-1 h-3 rounded-full bg-surface-2">
                <div className={cn("h-full rounded-full transition-all", met ? "bg-primary" : "bg-warning")} style={{ width: `${(a / max) * 100}%` }} />
                <div className="absolute top-[-2px] h-[16px] w-0.5 bg-text" style={{ left: `calc(${(t / max) * 100}% - 1px)` }} aria-hidden title={`Blueprint target ${t}`} />
              </div>
            </li>
          ); })}
      </ul>
      <p className="mt-1 text-[11px] text-text-2">Bar = marks in paper. Vertical line = blueprint target.</p>
      <p className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide text-text-2">Difficulty (set separately)</p>
      <ul className="space-y-1 text-xs">{DIFFICULTY.map((d) => <li key={d} className="flex justify-between"><span>{d}</span><span className="tnum">{da[d]}% <span className="text-text-2">target {paper.blueprint.difficultyPct[d]}%</span></span></li>)}</ul>
    </div>
  );
}

export function PaperChecks({ paper }: { paper: Paper }) {
  const checks = analysePaper(paper);
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-2">Validation</p>
      <ul className="space-y-1.5 text-xs" aria-live="polite">{checks.filter((c) => !c.key.startsWith("bloom-") || !c.ok).map((c) => (
        <li key={c.key} className={cn("flex gap-1.5", c.ok ? "text-text-2" : c.level === "error" ? "text-danger" : "text-warning")}>{c.ok ? <CheckCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-success" /> : <WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0" />}<span>{!c.ok && <b>{c.level === "error" ? "Blocks publishing: " : "Warning: "}</b>}{c.text}</span></li>
      ))}</ul>
    </div>
  );
}
