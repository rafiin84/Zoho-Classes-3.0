"use client";
import * as React from "react";
import { CheckCircle, XCircle, Warning, FileText, Image as ImageIcon, Microphone, Code, Package, PencilLine } from "@phosphor-icons/react";
import { Badge, Button, Textarea, AIBadge, Card, CardBody } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { GradingItem, RubricCriterion } from "@/types/grading";

const Sub = ({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) => (
  <section className="space-y-2"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-bold">{title}</h4>{badge}</div>{children}</section>
);
const Quote = ({ children }: { children: React.ReactNode }) => <blockquote className="border-l-2 border-primary/50 pl-3 text-sm italic text-text-2">{children}</blockquote>;

/** Submission preview + extracted evidence, per format. */
export function SubmissionEvidence({ item, onConfirmTranscript, busy, readOnly }: { item: GradingItem; onConfirmTranscript: (text: string) => void; busy: boolean; readOnly: boolean }) {
  const e = item.evidence;
  const [tx, setTx] = React.useState(e.transcription ?? "");
  React.useEffect(() => setTx(e.transcription ?? ""), [item.id, e.transcription]);
  switch (item.format) {
    case "mcq":
      return (
        <Sub title="Answer-level results" badge={<Badge tone="neutral" icon={<CheckCircle size={12} />}>Auto-scored from answer key</Badge>}>
          <p className="text-xs text-text-2">Deterministic comparison with the answer key. No AI judgement is involved in these marks.</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2 text-text-2"><tr><th className="p-2">Question</th><th className="p-2">Selected</th><th className="p-2">Key</th><th className="p-2 text-right">Marks</th></tr></thead>
              <tbody>{e.answers?.map((a) => (
                <tr key={a.q} className="border-t border-border align-top">
                  <td className="p-2"><span className="font-medium">{a.q}</span><br /><span className="text-text-2">{a.explanation}</span></td>
                  <td className="p-2">{a.selected}</td><td className="p-2">{a.correct}</td>
                  <td className="tnum p-2 text-right"><span className={cn("inline-flex items-center gap-1 font-semibold", a.marks === a.max ? "text-success" : a.marks > 0 ? "text-warning" : "text-danger")}>
                    {a.marks === a.max ? <CheckCircle size={14} /> : a.marks > 0 ? <Warning size={14} /> : <XCircle size={14} />}{a.marks}/{a.max}{a.partial && a.marks > 0 && a.marks < a.max ? " partial" : ""}</span></td>
                </tr>))}</tbody>
            </table>
          </div>
        </Sub>
      );
    case "short": case "essay":
      return (
        <>
          <Sub title="Student response"><Card tone="plain"><CardBody className="whitespace-pre-wrap text-sm">{e.studentText}</CardBody></Card></Sub>
          {e.modelAnswer && <Sub title="Model answer / expected content"><p className="text-sm text-text-2">{e.modelAnswer}</p></Sub>}
          {e.keyPoints && <Sub title="Model-answer comparison"><ul className="space-y-1">{e.keyPoints.map((k) => <li key={k.point} className="flex items-center gap-2 text-sm">{k.found ? <CheckCircle size={16} className="text-success" /> : <XCircle size={16} className="text-danger" />}<span>{k.point}</span><span className="text-xs text-text-2">{k.found ? "found" : "not found"}</span></li>)}</ul></Sub>}
        </>
      );
    case "handwritten":
      return (
        <Sub title="Handwritten submission" badge={<Badge tone="warning" icon={<PencilLine size={12} />}>OCR confidence {Math.round((e.ocrConfidence ?? 0) * 100)}%</Badge>}>
          <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-border bg-surface-2 text-sm text-text-2" role="img" aria-label={`Scanned image placeholder: ${e.imageLabel}`}><ImageIcon size={22} className="mr-2" />{e.imageLabel} (scan preview)</div>
          <label htmlFor="tx" className="text-xs font-semibold text-text-2">Extracted text (editable). Correct any recognition errors, then confirm.</label>
          <Textarea id="tx" value={tx} onChange={(ev) => setTx(ev.target.value)} className="min-h-36 font-mono text-xs" disabled={readOnly} />
          {e.contentReviewed ? <p className="flex items-center gap-1 text-xs font-semibold text-success" role="status"><CheckCircle size={14} />Content reviewed by teacher. Marks are now suggested.</p>
            : <><p className="text-xs text-warning" role="status">Marks are withheld until you review the extracted content.</p>
              <Button size="sm" onClick={() => onConfirmTranscript(tx)} loading={busy} disabled={readOnly || !tx.trim()}>Confirm extraction and suggest marks</Button></>}
        </Sub>
      );
    case "pdf":
      return (
        <Sub title={e.imageLabel ?? "Document"} badge={<Badge tone="neutral" icon={<FileText size={12} />}>Extracted sections</Badge>}>
          <ul className="space-y-2">{e.pages?.map((p) => (
            <li key={p.page + p.section} className="rounded-xl border border-border p-3 text-sm">
              <div className="mb-1 flex items-center gap-2"><Badge tone="primary">Page {p.page}</Badge><span className="font-semibold">{p.section}</span></div>
              <p className="text-text-2">{p.extract}</p>{p.note && <p className="mt-1 text-xs text-info">{p.note}</p>}
            </li>))}</ul>
        </Sub>
      );
    case "numerical":
      return (
        <>
          <Sub title="Problem"><p className="text-sm">{e.studentText}</p></Sub>
          <Sub title="Step-level analysis" badge={<AIBadge label="AI-suggested" />}>
            <ol className="space-y-2">{e.steps?.map((s) => (
              <li key={s.n} className={cn("rounded-xl border p-3 text-sm", s.status === "error" ? "border-danger/40 bg-danger-soft/40" : s.status === "method" ? "border-info/40 bg-info-soft/40" : "border-border")}>
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs">Step {s.n}: {s.text}</span>
                  <span className="flex items-center gap-2"><Badge tone={s.status === "correct" ? "success" : s.status === "method" ? "info" : "danger"}>{s.status === "correct" ? "Correct" : s.status === "method" ? "Method mark" : "Issue"}</Badge><span className="tnum text-xs font-bold">{s.marks}/{s.max}</span></span></div>
                {s.issue && <p className="mt-1 text-xs text-danger">{s.issue}</p>}
              </li>))}</ol>
          </Sub>
        </>
      );
    case "diagram":
      return (
        <Sub title="Diagram / image evidence">
          <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-border bg-surface-2 text-sm text-text-2" role="img" aria-label={`Image placeholder: ${e.imageLabel}`}><ImageIcon size={22} className="mr-2" />{e.imageLabel}</div>
          <ul className="list-disc space-y-1 pl-5 text-sm">{e.imageObservations?.map((o) => <li key={o}>{o}</li>)}</ul>
        </Sub>
      );
    case "audio-video":
      return (
        <Sub title={e.mediaLabel ?? "Recording"} badge={<Badge tone="neutral" icon={<Microphone size={12} />}>Transcript and segments</Badge>}>
          <p className="rounded-lg bg-warning-soft p-2 text-xs text-warning">AI summarises the transcript only. Delivery, confidence and similar qualities are not objectively assessed. A criterion needs rubric evidence or your own judgement.</p>
          <ul className="space-y-1.5">{e.segments?.map((s) => <li key={s.t} className="flex gap-3 text-sm"><span className="tnum w-24 shrink-0 font-mono text-xs text-text-2">{s.t}</span><span>{s.text}</span></li>)}</ul>
        </Sub>
      );
    case "project":
      return (
        <>
          <Sub title="Artefacts" badge={<Badge tone="neutral" icon={<Package size={12} />}>{e.artefacts?.length} files</Badge>}>
            <ul className="space-y-1">{e.artefacts?.map((a) => <li key={a.name} className="flex flex-wrap items-center gap-2 text-sm"><FileText size={16} className="text-text-2" /><span className="font-medium">{a.name}</span><Badge>{a.kind}</Badge>{a.note && <span className="text-xs text-text-2">{a.note}</span>}</li>)}</ul>
          </Sub>
          <Sub title="Evaluator feedback">
            <ul className="space-y-2">{e.evaluators?.map((v) => <li key={v.name} className="rounded-xl border border-border p-3 text-sm"><div className="flex justify-between"><span className="font-semibold">{v.name} <span className="text-xs font-normal text-text-2">{v.role}</span></span><span className="tnum font-bold">{v.score}</span></div><p className="text-text-2">{v.feedback}</p></li>)}</ul>
          </Sub>
        </>
      );
    case "coding":
      return (
        <>
          <Sub title="Submitted code" badge={<Badge tone="neutral" icon={<Code size={12} />}>Simulated test run</Badge>}><pre className="overflow-x-auto rounded-xl bg-surface-2 p-3 font-mono text-xs">{e.code}</pre></Sub>
          <Sub title="Test cases"><ul className="space-y-1">{e.tests?.map((t) => <li key={t.name} className="flex items-start gap-2 text-sm">{t.passed ? <CheckCircle size={16} className="mt-0.5 text-success" /> : <XCircle size={16} className="mt-0.5 text-danger" />}<span><span className="font-mono text-xs">{t.name}</span>{t.detail && <span className="block text-xs text-text-2">{t.detail}</span>}</span></li>)}</ul></Sub>
        </>
      );
  }
}

/** Rubric alignment with editable criterion scores and evidence quotes. */
export function RubricTable({ criteria, onChange, readOnly, withheld }: { criteria: RubricCriterion[]; onChange: (c: RubricCriterion[]) => void; readOnly: boolean; withheld?: boolean }) {
  return (
    <Sub title="Rubric alignment" badge={<AIBadge label="AI-suggested" />}>
      {withheld && <p className="text-xs text-warning">Criterion scores are provisional until the extracted content is confirmed.</p>}
      <ul className="space-y-2">{criteria.map((c, idx) => (
        <li key={c.id} className="rounded-xl border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={`cr-${c.id}`} className="text-sm font-semibold">{c.name}</label>
            <span className="flex items-center gap-1.5 text-sm"><input id={`cr-${c.id}`} type="number" min={0} max={c.max} step={0.5} value={c.score} disabled={readOnly}
              onChange={(e) => { const v = Math.max(0, Math.min(c.max, Number(e.target.value) || 0)); onChange(criteria.map((x, i) => (i === idx ? { ...x, score: v } : x))); }}
              className="tnum h-9 w-16 rounded-lg border border-border bg-surface px-2 text-right" aria-label={`${c.name} score out of ${c.max}`} /><span className="tnum text-text-2">/ {c.max}</span></span>
          </div>
          <p className="mt-1 text-xs text-text-2">{c.comment}</p>
          {c.quote && <div className="mt-1"><Quote>“{c.quote}”</Quote></div>}
        </li>))}</ul>
    </Sub>
  );
}
