"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Path, CheckCircle } from "@phosphor-icons/react";
import { Card, CardBody, Field, Input, Textarea, Select, Button, Badge, Progress, EmptyState, ConfirmDialog, toast, Skeleton, StatusBadge } from "@/components/ui";
import { learningProfileService } from "@/lib/api";
import { teacherInsightService, nameOf } from "@/lib/api/teacherInsightService";
import { OBJECTIVES } from "@/lib/mock-data/core";
import { fmtDate, inDays } from "@/lib/format";
import { uid } from "@/lib/utils";
import { KEYS, errMsg } from "../components/common";
import { getExtras, type Outline } from "./model";

const schema = z.object({
  objectiveId: z.string().min(1, "Choose the learning gap that triggers this journey"), prerequisiteId: z.string().optional(),
  lessonTitle: z.string().min(4, "Give the short lesson a title"), workedExample: z.string().min(8, "Describe the worked example"),
  practiceCount: z.coerce.number().int().min(3, "At least 3 practice questions").max(20, "At most 20"), reassessmentTitle: z.string().min(4, "Name the reassessment"),
  targetDate: z.string().min(1, "Choose a target date"), message: z.string().min(20, "Write a supportive message (20+ characters)").refine((v) => !/\b(fail|failed|weak|stupid|bad at|behind everyone)\b/i.test(v), "Use encouraging language — avoid words like “fail” or “weak”"),
});
type FormV = z.infer<typeof schema>;

export function RemedialTab({ courseId, outline, subjectId, teacherId }: { courseId: string; outline: Outline; subjectId: string; teacherId: string }) {
  const qc = useQueryClient(); const ex = getExtras(courseId); const [, force] = React.useReducer((x: number) => x + 1, 0);
  const objs = OBJECTIVES.filter((o) => o.subjectId === subjectId);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormV>({ resolver: zodResolver(schema) as any, defaultValues: { objectiveId: "", lessonTitle: "", workedExample: "", practiceCount: 8, reassessmentTitle: "", targetDate: inDays(9).slice(0, 10), message: "Let's build this skill together — a few short steps at your own pace. Nothing here affects your marks." } });
  const attention = useQuery({ queryKey: [...KEYS.attention, teacherId], queryFn: () => teacherInsightService.attention(teacherId) });
  const allRem = useQuery({ queryKey: [...KEYS.remedial, "all"], queryFn: () => learningProfileService.allRemedial() });
  const profiles = useQuery({ queryKey: ["t", "profiles-all"], queryFn: () => learningProfileService.all() });
  const [applyId, setApplyId] = React.useState<string | null>(null);
  const acts = outline.flatMap((m) => m.activities);
  const save = (v: FormV) => { ex.journeys.unshift({ id: uid("rj"), gapObjectiveId: v.objectiveId, prerequisiteId: v.prerequisiteId || undefined, lessonTitle: v.lessonTitle, workedExample: v.workedExample, practiceCount: v.practiceCount, reassessmentTitle: v.reassessmentTitle, targetDate: v.targetDate, message: v.message, savedAt: new Date().toISOString(), appliedTo: [] }); toast.success("Remedial journey template saved"); reset(); force(); };
  const affected = (objectiveId: string) => (profiles.data ?? []).filter((p) => p.gaps.some((g) => g.objectiveId === objectiveId));
  const apply = useMutation({
    mutationFn: async (jid: string) => { const j = ex.journeys.find((x) => x.id === jid)!; const targets = affected(j.gapObjectiveId); if (!targets.length) throw new Error("No student currently has this gap."); let n = 0;
      for (const p of targets) { const g = p.gaps.find((x) => x.objectiveId === j.gapObjectiveId)!; if (g.remedialPathId) continue; await learningProfileService.proposeRemedial(p.studentId, g.id, j.lessonTitle, "teacher"); j.appliedTo.push(p.studentId); n++; } return n; },
    onSuccess: (n) => { toast.success(n ? `Journey assigned to ${n} student${n > 1 ? "s" : ""}` : "Everyone with this gap already has a path"); qc.invalidateQueries({ queryKey: [...KEYS.remedial] }); qc.invalidateQueries({ queryKey: [...KEYS.attention] }); qc.invalidateQueries({ queryKey: ["t", "profiles-all"] }); force(); }, onError: (e) => toast.error(errMsg(e)),
  });
  const gapLabel = (id: string) => OBJECTIVES.find((o) => o.id === id)?.title ?? id;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardBody>
        <h2 className="mb-1 text-sm font-bold">Remedial journey builder</h2><p className="mb-3 text-xs text-text-2">Define a reusable path for a learning gap: prerequisite refresher, short lesson, worked example, practice and a reassessment.</p>
        <form onSubmit={handleSubmit(save)} className="space-y-3" noValidate>
          <Field label="Triggered by learning gap" required error={errors.objectiveId?.message} htmlFor="rj-obj"><Select id="rj-obj" {...register("objectiveId")}><option value="">Choose objective…</option>{objs.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.title} ({affected(o.id).length} student{affected(o.id).length === 1 ? "" : "s"} with this gap)</option>)}</Select></Field>
          <Field label="Prerequisite content" optional htmlFor="rj-pre" hint="Existing activity students revisit first"><Select id="rj-pre" {...register("prerequisiteId")}><option value="">None</option>{acts.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</Select></Field>
          <Field label="Short lesson" required error={errors.lessonTitle?.message} htmlFor="rj-les"><Input id="rj-les" {...register("lessonTitle")} placeholder="e.g. Why denominators must match" /></Field>
          <Field label="Worked example" required error={errors.workedExample?.message} htmlFor="rj-ex"><Textarea id="rj-ex" {...register("workedExample")} placeholder="e.g. 1/3 + 1/4 shown with fraction strips" /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Practice questions" required error={errors.practiceCount?.message} htmlFor="rj-n"><Input id="rj-n" type="number" {...register("practiceCount")} /></Field><Field label="Target date" required error={errors.targetDate?.message} htmlFor="rj-d"><Input id="rj-d" type="date" {...register("targetDate")} /></Field></div>
          <Field label="Reassessment" required error={errors.reassessmentTitle?.message} htmlFor="rj-re"><Input id="rj-re" {...register("reassessmentTitle")} placeholder="e.g. 6-question follow-up check" /></Field>
          <Field label="Message shown to the student" required error={errors.message?.message} htmlFor="rj-m" hint="Supportive and specific — students read this."><Textarea id="rj-m" {...register("message")} /></Field>
          <Button type="submit" loading={isSubmitting}><Path size={16} />Save journey template</Button>
        </form>
      </CardBody></Card>
      <div className="space-y-4">
        <Card><CardBody>
          <h2 className="mb-2 text-sm font-bold">Saved journeys</h2>
          {!ex.journeys.length ? <EmptyState title="No journey templates yet" body="Save one on the left, then assign it to students who have the gap." /> : (
            <ul className="space-y-3">{ex.journeys.map((j) => { const n = affected(j.gapObjectiveId).length; return <li key={j.id} className="rounded-xl border border-border p-3 text-sm"><p className="font-semibold">{j.lessonTitle}</p><p className="text-xs text-text-2">Gap: {gapLabel(j.gapObjectiveId)} · target {fmtDate(j.targetDate)} · {j.practiceCount} practice questions · {j.reassessmentTitle}</p><p className="mt-1 rounded-lg bg-lilac p-2 text-xs">“{j.message}”</p><div className="mt-2 flex items-center gap-2"><Button size="sm" variant="soft" disabled={apply.isPending} onClick={() => setApplyId(j.id)}>Assign to {n} student{n === 1 ? "" : "s"}</Button>{j.appliedTo.length > 0 && <Badge tone="success" icon={<CheckCircle size={12} />}>Assigned to {j.appliedTo.length}</Badge>}</div></li>; })}</ul>
          )}
        </CardBody></Card>
        <Card><CardBody>
          <h2 className="mb-2 text-sm font-bold">Completion & follow-up tracking</h2>
          {allRem.isLoading || profiles.isLoading ? <Skeleton className="h-20" /> : !allRem.data?.length ? <p className="text-sm text-text-2">No remedial paths in progress.</p> : (
            <ul className="space-y-2">{allRem.data.map((r) => { const done = r.steps.filter((s) => s.done).length; const gap = profiles.data?.find((p) => p.studentId === r.studentId)?.gaps.find((g) => g.id === r.gapId); return <li key={r.id} className="rounded-xl bg-surface-2 p-2.5 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{nameOf(r.studentId)}</span><StatusBadge status={r.status} /></div><p className="text-xs text-text-2">{r.title} · from gap: {gap?.label ?? r.gapId}{!gap && r.status === "completed" ? " (closed)" : ""}</p><Progress value={(done / r.steps.length) * 100} size="sm" label="Steps completed" className="mt-1" /><p className="mt-1 text-xs text-text-2">{done}/{r.steps.length} steps · target {fmtDate(r.targetDate)}{r.status === "completed" ? " · follow-up check passed" : done === r.steps.length - 1 ? " · re-check is next" : ""}</p></li>; })}</ul>
          )}
        </CardBody></Card>
      </div>
      <ConfirmDialog open={!!applyId} onOpenChange={(v) => !v && setApplyId(null)} title="Assign this journey?" body="Students with this gap and no existing path will see it in their journey straight away." confirmLabel="Assign" onConfirm={() => applyId && apply.mutate(applyId)} />
    </div>
  );
}
