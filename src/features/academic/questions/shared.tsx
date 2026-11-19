"use client";
import * as React from "react";
import { Badge, StatusBadge, cn } from "@/components/ui";
import type { Bloom, Difficulty, Question, QStatus, ShareTier } from "@/types/questions";
import { SHARE_TIERS, isObjective } from "@/types/questions";

/** Bloom (cognitive level) and Difficulty are two separate attributes and are always rendered separately. */
export const BloomBadge = ({ b }: { b: Bloom }) => <Badge tone="primary" title="Bloom level: the kind of thinking required">Bloom · {b}</Badge>;
export const DiffBadge = ({ d }: { d: Difficulty }) => <Badge tone={d === "Easy" ? "success" : d === "Medium" ? "warning" : "danger"} title="Difficulty: how hard students find it">Difficulty · {d}</Badge>;
export const QStatusBadge = ({ s }: { s: QStatus }) => <StatusBadge status={s === "in-review" ? "in review" : s} label={s === "in-review" ? "In review" : s[0].toUpperCase() + s.slice(1)} />;
export const shareLabel = (s: ShareTier) => SHARE_TIERS.find((x) => x.id === s)?.label ?? s;
export const letter = (i: number) => String.fromCharCode(65 + i);

export function correctSet(q: Pick<Question, "type" | "answer">): number[] {
  if (q.type === "mcq") return [Number(q.answer)]; if (q.type === "multi") return q.answer.split(",").map(Number); return [];
}
export function answerText(q: Pick<Question, "type" | "answer" | "options">): string {
  if (q.type === "mcq") return `${letter(Number(q.answer))}. ${q.options?.[Number(q.answer)] ?? ""}`;
  if (q.type === "multi") return correctSet(q).map((i) => `${letter(i)}. ${q.options?.[i] ?? ""}`).join("; ");
  if (q.type === "tf") return q.answer === "true" ? "True" : "False";
  return q.answer;
}
/** Renders the question stem and options. Answer key is only revealed when `showAnswer` is set (never in student-facing views). */
export function QuestionBody({ q, showAnswer, className }: { q: Pick<Question, "type" | "stem" | "options" | "answer">; showAnswer?: boolean; className?: string }) {
  const ok = showAnswer ? correctSet(q) : [];
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-sm">{q.stem}</p>
      {(q.type === "mcq" || q.type === "multi" || q.type === "match") && q.options && (
        <ol className="grid gap-1 text-sm sm:grid-cols-2">
          {q.options.map((o, i) => <li key={i} className={cn("rounded-lg border border-border px-2.5 py-1", ok.includes(i) && "border-success bg-success-soft font-semibold")}><span className="tnum mr-1.5 text-text-2">{q.type === "match" ? i + 1 : letter(i)}.</span>{o}{ok.includes(i) && <span className="ml-1.5 text-xs">(correct)</span>}</li>)}
        </ol>
      )}
      {q.type === "tf" && <p className="text-xs text-text-2">Options: True / False</p>}
    </div>
  );
}
export const needsOptions = (t: Question["type"]) => t === "mcq" || t === "multi" || t === "match";
export const hasRubric = (t: Question["type"]) => !isObjective(t);
export const LANGUAGES = ["English", "Hindi", "Tamil", "Malayalam"];
