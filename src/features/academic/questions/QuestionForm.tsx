"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Modal, Button, Field, Input, Select, Textarea, Badge, toast } from "@/components/ui";
import { SUBJECTS, GRADES, OBJECTIVES } from "@/lib/mock-data/core";
import { BLOOM, BLOOM_HELP, DIFFICULTY, QTYPES, type Question, type QuestionInput, type QType } from "@/types/questions";
import { questionBankService } from "@/lib/api/questionBankService";
import { LANGUAGES, needsOptions, hasRubric } from "./shared";

const schema = z.object({
  subjectId: z.string().min(1, "Choose a subject"), gradeId: z.string().min(1, "Choose a grade"), objectiveId: z.string().min(1, "Map to a learning objective"),
  type: z.string().min(1), stem: z.string().min(12, "Write the full question (at least 12 characters)"), options: z.string(), answer: z.string().min(1, "Answer key is required"),
  explanation: z.string().min(5, "Add a short explanation"), rubric: z.string(), marks: z.string().regex(/^\d+(\.\d)?$/, "Enter marks like 2 or 2.5").refine((v) => Number(v) > 0 && Number(v) <= 20, "Marks must be between 0.5 and 20"),
  difficulty: z.enum(DIFFICULTY), bloom: z.enum(BLOOM), language: z.string(), tags: z.string(), source: z.string().min(2, "Cite a source or reference"), note: z.string(),
}).superRefine((v, ctx) => {
  const lines = v.options.split("\n").map((s) => s.trim()).filter(Boolean);
  if ((v.type === "mcq" || v.type === "multi") && lines.length < 3) ctx.addIssue({ code: "custom", path: ["options"], message: "Provide at least 3 options, one per line" });
  if (v.type === "mcq" && !(Number(v.answer) >= 0 && Number(v.answer) < lines.length && /^\d+$/.test(v.answer))) ctx.addIssue({ code: "custom", path: ["answer"], message: "For MCQ enter the index of the correct option (A = 0, B = 1, …)" });
  if (v.type === "tf" && !["true", "false"].includes(v.answer.toLowerCase())) ctx.addIssue({ code: "custom", path: ["answer"], message: "Enter true or false" });
  if (v.rubric.trim()) { const sum = v.rubric.split("\n").filter(Boolean).reduce((a, l) => a + Number(l.split("|")[1] ?? NaN), 0); if (!Number.isFinite(sum) || Math.abs(sum - Number(v.marks)) > 0.01) ctx.addIssue({ code: "custom", path: ["rubric"], message: `Rubric lines must be “criterion | marks” and add up to ${v.marks}` }); }
});
type FormVals = z.infer<typeof schema>;

const toVals = (q?: Question): FormVals => ({
  subjectId: q?.subjectId ?? "sub-math", gradeId: q?.gradeId ?? "g8", objectiveId: q?.objectiveIds[0] ?? "", type: q?.type ?? "mcq", stem: q?.stem ?? "", options: q?.options?.join("\n") ?? "", answer: q?.answer ?? "", explanation: q?.explanation ?? "",
  rubric: q?.rubric?.map((r) => `${r.criterion} | ${r.marks}`).join("\n") ?? "", marks: String(q?.marks ?? 1), difficulty: q?.difficulty ?? "Medium", bloom: q?.bloom ?? "Understand", language: q?.language ?? "English", tags: q?.tags.join(", ") ?? "", source: q?.source ?? "", note: "",
});

export function QuestionFormModal({ open, onOpenChange, question, onSaved, onSubmit }: { open: boolean; onOpenChange: (v: boolean) => void; question?: Question; onSaved?: () => void; onSubmit: (input: QuestionInput, note: string) => Promise<unknown> }) {
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormVals>({ resolver: zodResolver(schema), defaultValues: toVals(question) });
  React.useEffect(() => { if (open) reset(toVals(question)); }, [open, question, reset]);
  const v = watch(); const type = v.type as QType;
  const objs = OBJECTIVES.filter((o) => o.subjectId === v.subjectId && o.gradeId === v.gradeId);
  const sim = useQuery({ queryKey: ["qb-similar", v.stem, question?.id], queryFn: () => questionBankService.findSimilar(v.stem, question?.id), enabled: open && v.stem.length > 15 });
  const err = (k: keyof FormVals) => errors[k]?.message as string | undefined;
  const save = handleSubmit(async (d) => {
    const lines = d.options.split("\n").map((s) => s.trim()).filter(Boolean); const o = OBJECTIVES.find((x) => x.id === d.objectiveId)!;
    const input: QuestionInput = { subjectId: d.subjectId, gradeId: d.gradeId, chapterId: o.chapterId, objectiveIds: [d.objectiveId], type, stem: d.stem.trim(), options: needsOptions(type) ? lines : undefined, answer: d.answer.trim().toLowerCase() === "true" || d.answer.trim().toLowerCase() === "false" ? d.answer.trim().toLowerCase() : d.answer.trim(),
      explanation: d.explanation, rubric: d.rubric.trim() ? d.rubric.split("\n").filter(Boolean).map((l) => ({ criterion: l.split("|")[0].trim(), marks: Number(l.split("|")[1]) })) : undefined, marks: Number(d.marks), difficulty: d.difficulty, bloom: d.bloom, language: d.language, tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean), source: d.source };
    try { await onSubmit(input, d.note); toast.success(question ? `Saved as version ${question.version + 1}` : "Question created as draft"); onSaved?.(); onOpenChange(false); } catch (e) { toast.error((e as Error).message); }
  });
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={question ? `Edit question · creates version ${question.version + 1}` : "New question"} className="sm:max-w-2xl"
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} loading={isSubmitting} disabled={isSubmitting}>{question ? "Save new version" : "Create draft"}</Button></>}>
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2" noValidate>
        <Field label="Subject" htmlFor="qf-sub" error={err("subjectId")} required><Select id="qf-sub" {...register("subjectId")}>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Grade" htmlFor="qf-gr" error={err("gradeId")} required><Select id="qf-gr" {...register("gradeId")}>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</Select></Field>
        <Field label="Learning objective" htmlFor="qf-lo" error={err("objectiveId")} required className="sm:col-span-2" hint="Chapter is derived from the objective."><Select id="qf-lo" {...register("objectiveId")}><option value="">Select objective…</option>{objs.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.title}</option>)}</Select></Field>
        <Field label="Question type" htmlFor="qf-type"><Select id="qf-type" {...register("type")}>{QTYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</Select></Field>
        <Field label="Marks" htmlFor="qf-m" error={err("marks")} required><Input id="qf-m" inputMode="decimal" {...register("marks")} aria-invalid={!!errors.marks} /></Field>
        <Field label="Question" htmlFor="qf-stem" error={err("stem")} required className="sm:col-span-2"><Textarea id="qf-stem" {...register("stem")} aria-invalid={!!errors.stem} /></Field>
        {sim.data && sim.data.length > 0 && (
          <div className="rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm sm:col-span-2" role="status">
            <p className="font-semibold text-warning">Possible duplicate (mock detection)</p>
            {sim.data.map((r) => <p key={r.q.id} className="mt-1 text-xs text-text-2"><Badge tone="warning">{Math.round(r.score * 100)}% similar</Badge> {r.q.id}: {r.q.stem.slice(0, 90)}</p>)}
          </div>
        )}
        {needsOptions(type) && <Field label={type === "match" ? "Match items (one per line)" : "Options (one per line)"} htmlFor="qf-opt" error={err("options")} className="sm:col-span-2"><Textarea id="qf-opt" {...register("options")} aria-invalid={!!errors.options} /></Field>}
        <Field label={type === "mcq" ? "Correct option index (A=0, B=1, …)" : type === "multi" ? "Correct option indexes, comma separated" : type === "tf" ? "Correct answer (true / false)" : "Answer key / model answer"} htmlFor="qf-ans" error={err("answer")} required className="sm:col-span-2"><Textarea id="qf-ans" className="min-h-16" {...register("answer")} aria-invalid={!!errors.answer} /></Field>
        <Field label="Explanation / rationale" htmlFor="qf-exp" error={err("explanation")} required className="sm:col-span-2"><Textarea id="qf-exp" className="min-h-16" {...register("explanation")} /></Field>
        {hasRubric(type) && <Field label="Rubric (criterion | marks, one per line)" htmlFor="qf-rub" error={err("rubric")} optional className="sm:col-span-2"><Textarea id="qf-rub" className="min-h-16" {...register("rubric")} /></Field>}
        <fieldset className="rounded-xl border border-primary/30 bg-lilac p-3 sm:col-span-2">
          <legend className="px-1 text-xs font-bold text-primary">Cognitive level and difficulty are separate</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bloom level" htmlFor="qf-bloom" hint={BLOOM_HELP[v.bloom]}><Select id="qf-bloom" {...register("bloom")}>{BLOOM.map((b) => <option key={b}>{b}</option>)}</Select></Field>
            <Field label="Difficulty" htmlFor="qf-diff" hint="How hard students typically find it, whatever the thinking level."><Select id="qf-diff" {...register("difficulty")}>{DIFFICULTY.map((d) => <option key={d}>{d}</option>)}</Select></Field>
          </div>
          <p className="mt-2 text-xs text-text-2">Bloom’s taxonomy describes the kind of thinking: Remember, Understand, Apply, Analyse, Evaluate, Create. A Remember question can still be Hard (obscure fact); an Apply question can be Easy.</p>
        </fieldset>
        <Field label="Language" htmlFor="qf-lang"><Select id="qf-lang" {...register("language")}>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</Select></Field>
        <Field label="Tags" htmlFor="qf-tags" hint="Comma separated"><Input id="qf-tags" {...register("tags")} /></Field>
        <Field label="Source / reference" htmlFor="qf-src" error={err("source")} required className="sm:col-span-2"><Input id="qf-src" {...register("source")} placeholder="e.g. Textbook ch. 3, p. 42" /></Field>
        {question && <Field label="What changed?" htmlFor="qf-note" optional className="sm:col-span-2"><Input id="qf-note" {...register("note")} placeholder="Shown in version history" /></Field>}
      </form>
    </Modal>
  );
}
