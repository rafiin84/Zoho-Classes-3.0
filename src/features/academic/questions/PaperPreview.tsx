"use client";
import * as React from "react";
import { Badge } from "@/components/ui";
import { objectiveById, subjectById, GRADES } from "@/lib/mock-data/core";
import { BLOOM, qTypeLabel, type Paper } from "@/types/questions";
import { bloomActual } from "@/lib/api/questionPaperService";
import { QuestionBody, answerText } from "./shared";

const bySection = (p: Paper) => { const m = new Map<string, Paper["questions"]>(); [...p.questions].sort((a, b) => a.section.localeCompare(b.section)).forEach((q) => m.set(q.section, [...(m.get(q.section) ?? []), q])); return [...m.entries()]; };

/** Staff mode shows mapping and Bloom summary; student mode shows only what a candidate would receive (no answers, no tags). */
export function PaperPreview({ paper, mode }: { paper: Paper; mode: "student" | "staff" }) {
  let n = 0; const act = bloomActual(paper.questions);
  return (
    <article className="rounded-2xl border border-border bg-surface p-5 print:border-0" aria-label={`${mode === "student" ? "Student-facing" : "Staff"} preview of ${paper.title}`}>
      <header className="border-b border-border pb-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-2">Greenfield International School · {paper.academicYearId.replace("ay-", "")}</p>
        <h2 className="mt-1 text-xl font-bold">{paper.title}</h2>
        <p className="text-sm text-text-2">{subjectById(paper.subjectId).name} · {GRADES.find((g) => g.id === paper.gradeId)?.label} · {paper.examType} · {paper.term}</p>
        <p className="tnum mt-1 text-sm font-semibold">Time: {paper.durationMin} minutes · Maximum marks: {paper.totalMarks}</p>
      </header>
      <section className="mt-3"><h3 className="text-sm font-bold">General instructions</h3><p className="whitespace-pre-line text-sm text-text-2">{paper.instructions || "No instructions added."}</p></section>
      {bySection(paper).map(([sec, qs]) => (
        <section key={sec} className="mt-4"><h3 className="flex justify-between border-b border-border pb-1 text-sm font-bold"><span>{sec}</span><span className="tnum text-text-2">{qs.reduce((a, q) => a + q.marks, 0)} marks</span></h3>
          <ol className="mt-2 space-y-3">{qs.map((q) => { n++; return (
            <li key={q.qid} className="flex gap-3"><span className="tnum w-6 shrink-0 text-sm font-bold">{n}.</span>
              <div className="min-w-0 flex-1"><QuestionBody q={q.snapshot} />{mode === "staff" && <p className="mt-1 flex flex-wrap gap-1 text-[11px]"><Badge>{qTypeLabel(q.snapshot.type)}</Badge><Badge tone="primary">Bloom · {q.snapshot.bloom}</Badge><Badge>Difficulty · {q.snapshot.difficulty}</Badge><Badge tone="info">{q.snapshot.objectiveIds.map((o) => objectiveById(o)?.code).join(", ") || "Unmapped"}</Badge></p>}</div>
              <span className="tnum shrink-0 text-sm font-semibold">[{q.marks}]</span></li>); })}</ol></section>
      ))}
      {!paper.questions.length && <p className="mt-6 text-center text-sm text-text-2">No questions yet. Add questions to preview the paper.</p>}
      {mode === "staff" && paper.questions.length > 0 && (
        <footer className="mt-5 rounded-xl bg-surface-2 p-3 text-xs"><p className="font-bold">Bloom summary (staff only)</p><p className="tnum mt-1">{BLOOM.map((b) => `${b} ${act[b]}`).join(" · ")}</p></footer>
      )}
    </article>
  );
}

/** Answer key is a SEPARATE view; it is never included in the student-facing preview or studentView(). */
export function AnswerKey({ paper }: { paper: Paper }) {
  let n = 0;
  return (
    <article className="rounded-2xl border border-danger/30 bg-surface p-5" aria-label="Answer key (staff only)">
      <p role="note" className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">Staff only. The answer key is never shown in the student-facing paper.</p>
      <h2 className="text-lg font-bold">{paper.title} — answer key</h2>
      <ol className="mt-3 space-y-3">{[...paper.questions].sort((a, b) => a.section.localeCompare(b.section)).map((q) => { n++; return (
        <li key={q.qid} className="border-b border-border pb-2 text-sm"><p className="font-semibold">{n}. <span className="font-normal text-text-2">{q.snapshot.stem.slice(0, 100)}</span> <span className="tnum">[{q.marks}]</span></p>
          <p className="mt-1 rounded-lg bg-success-soft px-2.5 py-1.5">{answerText(q.snapshot)}</p><p className="mt-1 text-xs text-text-2">{q.snapshot.explanation}</p>
          {q.snapshot.rubric && <p className="mt-1 text-xs">Rubric: {q.snapshot.rubric.map((r) => `${r.criterion} (${r.marks})`).join("; ")}</p>}</li>); })}</ol>
    </article>
  );
}
