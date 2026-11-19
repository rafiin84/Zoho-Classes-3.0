"use client";
import * as React from "react";
import { ArrowUp, ArrowDown, Paperclip, X, CheckCircle, XCircle, MinusCircle, PencilLine } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Badge, Button, Input, Textarea, Select } from "@/components/ui";
import type { Question, QuestionType, AnswerValue, McqQ, MultiQ, TfQ, FillQ, MatchQ, OrderQ, ShortQ, LongQ, NumQ, FileQ } from "@/types/exams";
import { stableShuffle } from "@/lib/assessment/score";
import type { RendererDef, RendererProps, QResult } from "./types";
export type { RendererDef, RendererProps, RenderMode, QResult } from "./types";
export { hasAnswer, scoreQuestion } from "@/lib/assessment/score";

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const opt = "flex min-h-11 w-full cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-lilac has-[:focus-visible]:outline-2 has-[:disabled]:cursor-default";

function Mcq({ question: q, value, onChange, disabled, idPrefix }: RendererProps<McqQ>) {
  return <div role="radiogroup" aria-labelledby={`${idPrefix}-p`} className="space-y-2">{q.options.map((o, i) => <label key={i} className={opt}><input type="radio" name={idPrefix} className="mt-0.5 size-4 accent-[var(--primary)]" checked={value === i} disabled={disabled} onChange={() => onChange(i)} /><span><span className="mr-2 font-semibold text-text-2" aria-hidden>{String.fromCharCode(65 + i)}.</span>{o}</span></label>)}</div>;
}
function Multi({ question: q, value, onChange, disabled, idPrefix }: RendererProps<MultiQ>) {
  const sel = (value as number[] | undefined) ?? [];
  const toggle = (i: number) => { const n = sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i].sort(); onChange(n.length ? n : undefined); };
  return <div role="group" aria-labelledby={`${idPrefix}-p`} className="space-y-2"><p className="text-xs text-text-2">Select all that apply.</p>{q.options.map((o, i) => <label key={i} className={opt}><input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" checked={sel.includes(i)} disabled={disabled} onChange={() => toggle(i)} /><span>{o}</span></label>)}</div>;
}
function Tf({ value, onChange, disabled, idPrefix }: RendererProps<TfQ>) {
  return <div role="radiogroup" aria-labelledby={`${idPrefix}-p`} className="grid grid-cols-2 gap-2">{[true, false].map((v) => <label key={String(v)} className={cn(opt, "justify-center font-semibold")}><input type="radio" name={idPrefix} className="sr-only" checked={value === v} disabled={disabled} onChange={() => onChange(v)} />{v ? "True" : "False"}</label>)}</div>;
}
function Fill({ question: q, value, onChange, disabled, idPrefix }: RendererProps<FillQ>) {
  const parts = q.prompt.split("____"); const vals = (value as string[] | undefined) ?? [];
  const set = (i: number, v: string) => { const n = [...vals]; n[i] = v; onChange(n.some((x) => x?.trim()) ? n : undefined); };
  return <p className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[0.95rem] leading-loose" id={`${idPrefix}-p`}>{parts.map((t, i) => <React.Fragment key={i}>{t}{i < parts.length - 1 && <Input aria-label={`Blank ${i + 1} of ${parts.length - 1}`} className="inline-block h-10 w-40" value={vals[i] ?? ""} disabled={disabled} onChange={(e) => set(i, e.target.value)} />}</React.Fragment>)}</p>;
}
function Matching({ question: q, value, onChange, disabled, idPrefix }: RendererProps<MatchQ>) {
  const rights = React.useMemo(() => q.rightOrder ?? stableShuffle(q.pairs.map((p) => p.right), q.id), [q]); const v = (value as Record<string, string> | undefined) ?? {};
  const set = (l: string, r: string) => { const n = { ...v }; if (r) n[l] = r; else delete n[l]; onChange(Object.keys(n).length ? n : undefined); };
  return <div className="space-y-2" role="group" aria-labelledby={`${idPrefix}-p`}>{q.pairs.map((p, i) => <div key={p.left} className="grid items-center gap-2 sm:grid-cols-[1fr_1.4fr]"><label htmlFor={`${idPrefix}-m${i}`} className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm font-semibold">{p.left}</label><Select id={`${idPrefix}-m${i}`} value={v[p.left] ?? ""} disabled={disabled} onChange={(e) => set(p.left, e.target.value)}><option value="">Choose a match…</option>{rights.map((r) => <option key={r} value={r}>{r}</option>)}</Select></div>)}</div>;
}
function Ordering({ question: q, value, onChange, disabled, idPrefix }: RendererProps<OrderQ>) {
  const order = (value as string[] | undefined) ?? stableShuffle(q.items, q.id);
  const move = (i: number, d: -1 | 1) => { const n = [...order]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return <div><p className="mb-2 text-xs text-text-2">Use the arrows to reorder. {value ? "" : "Move at least one item to record your order."}</p><ol className="space-y-2" aria-labelledby={`${idPrefix}-p`}>{order.map((it, i) => <li key={it} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm"><span className="tnum flex size-6 items-center justify-center rounded-full bg-lilac text-xs font-bold text-primary">{i + 1}</span><span className="flex-1">{it}</span><Button type="button" size="iconSm" variant="ghost" aria-label={`Move ${it} up`} disabled={disabled || i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></Button><Button type="button" size="iconSm" variant="ghost" aria-label={`Move ${it} down`} disabled={disabled || i === order.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></Button></li>)}</ol></div>;
}
function Text({ question: q, value, onChange, disabled, idPrefix, rows }: RendererProps<ShortQ | LongQ> & { rows: number }) {
  const v = (value as string | undefined) ?? ""; const n = words(v); const over = n > q.maxWords;
  return <div><Textarea aria-labelledby={`${idPrefix}-p`} aria-invalid={over} rows={rows} disabled={disabled} value={v} placeholder="Write your answer…" onChange={(e) => onChange(e.target.value || undefined)} /><p className={cn("mt-1 text-xs tnum", over ? "font-semibold text-danger" : "text-text-2")} aria-live="polite">{n} / {q.maxWords} words{over ? " · over the limit" : ""}</p></div>;
}
const Short = (p: RendererProps<ShortQ>) => <Text {...p} rows={3} />;
const Long = (p: RendererProps<LongQ>) => <Text {...p} rows={8} />;
function Numerical({ question: q, value, onChange, disabled, idPrefix }: RendererProps<NumQ>) {
  const v = (value as string | undefined) ?? ""; const bad = v !== "" && Number.isNaN(Number(v));
  return <div><div className="flex max-w-xs items-center gap-2"><Input inputMode="decimal" aria-labelledby={`${idPrefix}-p`} aria-invalid={bad} value={v} disabled={disabled} placeholder="0.00" onChange={(e) => onChange(e.target.value || undefined)} />{q.unit && <span className="text-sm font-semibold text-text-2">{q.unit}</span>}</div>{bad && <p role="alert" className="mt-1 text-xs text-danger">Enter a number, for example 0.375</p>}</div>;
}
function FileUp({ question: q, value, onChange, disabled, idPrefix }: RendererProps<FileQ>) {
  const files = (value as { name: string; kind: string }[] | undefined) ?? []; const ref = React.useRef<HTMLInputElement>(null);
  const add = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f && files.length < q.maxFiles) onChange([...files, { name: f.name, kind: f.type.startsWith("image") ? "image" : "file" }]); e.target.value = ""; };
  return <div><input ref={ref} type="file" className="sr-only" tabIndex={-1} aria-hidden onChange={add} />
    <Button type="button" variant="outline" disabled={disabled || files.length >= q.maxFiles} onClick={() => ref.current?.click()} aria-describedby={`${idPrefix}-p`}><Paperclip size={18} />Choose file ({files.length}/{q.maxFiles})</Button>
    <p className="mt-1 text-xs text-text-2">Accepted: {q.accept.join(", ")}. Demo only: just the file name is recorded.</p>
    {files.length > 0 && <ul className="mt-2 space-y-1.5">{files.map((f, i) => <li key={i} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm"><span className="truncate">{f.name}</span>{!disabled && <button type="button" aria-label={`Remove ${f.name}`} className="rounded-full p-1.5 hover:bg-border" onClick={() => { const n = files.filter((_, j) => j !== i); onChange(n.length ? n : undefined); }}><X size={14} /></button>}</li>)}</ul>}</div>;
}

const optList = (q: { options: string[] }, idx: number[]) => idx.map((i) => q.options[i]).join(", ");
export const RENDERERS: { [K in QuestionType]: RendererDef<Extract<Question, { type: K }>> } = {
  mcq: { type: "mcq", label: "Multiple choice", description: "One correct option", icon: "CheckCircle", Component: Mcq, validate: () => null, keyText: (q) => (q.answer !== undefined ? q.options[q.answer] : null) },
  multi: { type: "multi", label: "Multiple select", description: "Select all that apply", icon: "CheckSquare", Component: Multi, validate: () => null, keyText: (q) => (q.answer ? optList(q, q.answer) : null) },
  tf: { type: "tf", label: "True / False", description: "Judge a statement", icon: "ToggleLeft", Component: Tf, validate: () => null, keyText: (q) => (q.answer === undefined ? null : q.answer ? "True" : "False") },
  fill: { type: "fill", label: "Fill in the blank", description: "Complete the sentence", icon: "TextT", Component: Fill, validate: () => null, keyText: (q) => q.answer?.map((a) => a[0]).join(" · ") ?? null },
  matching: { type: "matching", label: "Matching", description: "Pair items", icon: "ArrowsLeftRight", Component: Matching, validate: () => null, keyText: (q) => q.pairs.map((p) => `${p.left} → ${p.right}`).join("; ") },
  ordering: { type: "ordering", label: "Ordering", description: "Arrange in sequence", icon: "ListNumbers", Component: Ordering, validate: () => null, keyText: (q) => q.items.join(" → ") },
  short: { type: "short", label: "Short answer", description: "One or two sentences", icon: "TextAa", Component: Short, validate: (q, v) => (typeof v === "string" && words(v) > q.maxWords ? `Keep this under ${q.maxWords} words.` : null), keyText: (q) => q.sample ?? null },
  long: { type: "long", label: "Long answer", description: "Extended response", icon: "Article", Component: Long, validate: (q, v) => (typeof v === "string" && words(v) > q.maxWords ? `Keep this under ${q.maxWords} words.` : null), keyText: (q) => q.sample ?? null },
  numerical: { type: "numerical", label: "Numerical", description: "A number answer", icon: "Hash", Component: Numerical, validate: (_q, v) => (typeof v === "string" && v !== "" && Number.isNaN(Number(v)) ? "Enter a valid number." : null), keyText: (q) => (q.answer !== undefined ? `${q.answer}${q.unit ? " " + q.unit : ""}` : null) },
  file: { type: "file", label: "File upload", description: "Attach your work (mock)", icon: "UploadSimple", Component: FileUp, validate: () => null, keyText: () => null },
};

/** Validate one answer against its renderer's rules. */
export function validateAnswer(q: Question, v: AnswerValue | undefined): string | null { return (RENDERERS[q.type] as RendererDef<any>).validate(q, v); }

const outcomeBadge = (r: QResult, max: number) => r.correct === "manual" ? <Badge tone="info" icon={<PencilLine size={12} />}>Teacher will mark · {max} marks</Badge> : r.correct === true ? <Badge tone="success" icon={<CheckCircle size={12} weight="fill" />}>Correct · {r.got}/{max}</Badge> : r.correct === "partial" ? <Badge tone="warning" icon={<MinusCircle size={12} weight="fill" />}>Partly correct · {r.got}/{max}</Badge> : <Badge tone="danger" icon={<XCircle size={12} weight="fill" />}>Not quite · {r.got}/{max}</Badge>;

/** Renders any question type with a consistent header (number, marks, type) and, in review mode, outcome + answer key. */
export function QuestionView({ question, value, onChange, mode = "attempt", disabled, result, showKey, index, flagged, idPrefix = `q-${question.id}`, showMarks = true }: Omit<RendererProps, "idPrefix" | "mode"> & { mode?: RendererProps["mode"]; index?: number; flagged?: boolean; idPrefix?: string; showMarks?: boolean }) {
  const def = RENDERERS[question.type] as RendererDef<any>; const C = def.Component;
  const err = mode === "attempt" ? def.validate(question, value) : null; const key = (mode === "review" || showKey) ? def.keyText(question) : null;
  const promptText = question.type === "fill" ? "Fill in the blank" : question.prompt;
  return (
    <section aria-labelledby={`${idPrefix}-p`} className="space-y-3">
      <header className="flex flex-wrap items-center gap-2">
        {index !== undefined && <span className="tnum flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-fg">{index + 1}</span>}
        <Badge>{def.label}</Badge>{showMarks && <Badge tone="primary">{question.marks} mark{question.marks === 1 ? "" : "s"}</Badge>}{flagged && <Badge tone="highlight">Flagged for review</Badge>}
        {mode === "review" && result && outcomeBadge(result, question.marks)}
      </header>
      {question.type !== "fill" && <p id={`${idPrefix}-p`} className="text-[1.02rem] font-medium leading-relaxed">{question.prompt}</p>}
      {question.type === "fill" && <span id={`${idPrefix}-p`} className="sr-only">{promptText}</span>}
      <C question={question} value={value} onChange={onChange} mode={mode} disabled={disabled || mode === "review"} result={result} showKey={showKey} idPrefix={idPrefix} />
      {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
      {question.hint && mode === "attempt" && <p className="text-xs text-text-2">Hint: {question.hint}</p>}
      {key && <div className="rounded-xl bg-success-soft p-3 text-sm text-success"><span className="font-semibold">Answer key: </span>{key}{question.explanation && <p className="mt-1 text-text">{question.explanation}</p>}</div>}
    </section>
  );
}
export const QUESTION_TYPES = Object.values(RENDERERS).map((r) => ({ type: r.type, label: r.label, description: r.description, icon: r.icon }));
