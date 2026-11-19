"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldWarning, ArrowsClockwise, PaperPlaneTilt, CheckCircle, PencilSimple, XCircle, Clock } from "@phosphor-icons/react";
import { Badge, StatusBadge, AIBadge, Button, Textarea, Field, Card, CardBody, Modal, toast, SectionHeader, Input } from "@/components/ui";
import { gradingService, baseMarks, needsReview } from "@/lib/api/gradingService";
import { FORMAT_LABEL, type GradingItem, type RubricCriterion, type ReviewPolicy } from "@/types/grading";
import type { Role } from "@/types";
import { relTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SubmissionEvidence, RubricTable } from "./Evidence";

const STATUS_LABEL: Record<GradingItem["status"], string> = { "ai-drafted": "AI draft: awaiting review", approved: "Approved (not released)", overridden: "Overridden (not released)", rejected: "AI draft rejected", released: "Released to student" };
export const statusLabel = (s: GradingItem["status"]) => STATUS_LABEL[s];
const statusKey = (s: GradingItem["status"]) => (s === "ai-drafted" ? "pending review" : s === "rejected" ? "rejected" : s === "released" ? "released" : "approved");

export function ConfidenceMeter({ value, policy }: { value: number; policy: number }) {
  const low = value < policy;
  return <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", low ? "text-warning" : "text-success")} title={`Policy threshold ${Math.round(policy * 100)}%`}>
    {low ? <ShieldWarning size={14} weight="fill" /> : <CheckCircle size={14} weight="fill" />}<span className="tnum">{Math.round(value * 100)}% confidence</span><span className="sr-only">{low ? "below review threshold, needs review" : "meets review threshold"}</span></span>;
}

const reviewSchema = (max: number) => z.object({ marks: z.number({ message: "Enter marks" }).min(0, "Marks cannot be negative").max(max, `Maximum is ${max}`), feedback: z.string().trim().min(5, "Add feedback the student can act on") });
const reasonSchema = z.object({ reason: z.string().trim().min(10, "Give at least 10 characters") });
const rejectSchema = z.object({ reason: z.string().trim().min(5, "Give a short reason") });

export function Workspace({ item, role, actor, policy }: { item: GradingItem; role: Role; actor: string; policy: ReviewPolicy }) {
  const qc = useQueryClient();
  const locked = item.status === "released";
  const hwBlocked = item.format === "handwritten" && !item.evidence.contentReviewed;
  const base = baseMarks(item);
  const [criteria, setCriteria] = React.useState<RubricCriterion[]>(item.evidence.criteria ?? []);
  const [dlg, setDlg] = React.useState<null | "override" | "reject" | "release" | "moderate">(null);
  const form = useForm<{ marks: number; feedback: string }>({ resolver: zodResolver(reviewSchema(item.maxMarks)), defaultValues: { marks: item.finalMarks ?? base ?? 0, feedback: item.finalFeedback ?? item.suggestedFeedback }, mode: "onChange" });
  React.useEffect(() => { setCriteria(item.evidence.criteria ?? []); form.reset({ marks: item.finalMarks ?? base ?? 0, feedback: item.finalFeedback ?? item.suggestedFeedback }); }, [item.id, item.status, item.suggestedMarks, item.evidence.contentReviewed, item.reEvalCount]); // eslint-disable-line react-hooks/exhaustive-deps
  const marks = form.watch("marks");
  const differs = base !== undefined && Number(marks) !== base;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["grading"] }); qc.invalidateQueries({ predicate: (q) => ["assignments", "assignment", "home", "notifications"].some((k) => String(q.queryKey[0]).includes(k)) }); };
  const onErr = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong");

  const confirmTx = useMutation({ mutationFn: (t: string) => gradingService.confirmTranscription(item.id, t, actor), onSuccess: () => { toast.success("Extraction confirmed. Marks suggested."); refresh(); }, onError: onErr });
  const reeval = useMutation({ mutationFn: () => gradingService.reEvaluate(item.id, actor), onSuccess: () => { toast.success("Re-evaluated. Review the refreshed suggestion."); refresh(); }, onError: onErr });
  const approve = useMutation({ mutationFn: (v: { marks: number; feedback: string }) => gradingService.approve(item.id, { ...v, criteria, actor }), onSuccess: () => { toast.success("Approved. Marks stay private until you release them."); refresh(); }, onError: onErr });
  const override = useMutation({ mutationFn: (v: { reason: string }) => gradingService.override(item.id, { marks: Number(form.getValues("marks")), feedback: form.getValues("feedback"), criteria, actor, reason: v.reason }), onSuccess: () => { toast.success("Override recorded in the audit trail."); setDlg(null); refresh(); }, onError: onErr });
  const reject = useMutation({ mutationFn: (v: { reason: string }) => gradingService.reject(item.id, v.reason, actor), onSuccess: () => { toast.info("AI draft rejected. No marks recorded."); setDlg(null); refresh(); }, onError: onErr });
  const release = useMutation({ mutationFn: () => gradingService.release([item.id], actor), onSuccess: () => { toast.success(`Released to ${item.studentName}.`); setDlg(null); refresh(); }, onError: onErr });
  const moderate = useMutation({ mutationFn: (v: { reason: string }) => gradingService.moderate(item.id, v.reason, actor), onSuccess: () => { toast.success("Moderation note added."); setDlg(null); refresh(); }, onError: onErr });

  const reasonForm = useForm<{ reason: string }>({ resolver: zodResolver(dlg === "reject" ? rejectSchema : reasonSchema), defaultValues: { reason: "" } });
  React.useEffect(() => { reasonForm.reset({ reason: "" }); }, [dlg]); // eslint-disable-line react-hooks/exhaustive-deps
  const flagged = needsReview(item, policy);
  const useCriteria = (c: RubricCriterion[]) => { setCriteria(c); if (item.format !== "mcq" && !hwBlocked) form.setValue("marks", c.reduce((a, x) => a + x.score, 0), { shouldValidate: true }); };

  return (
    <div className="space-y-5" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h3 className="text-heading">{item.studentName}</h3><p className="text-sm text-text-2">{item.assessmentTitle} · {item.className} · submitted {relTime(item.submittedAt)}</p></div>
        <div className="flex flex-wrap items-center gap-1.5"><Badge tone="primary">{FORMAT_LABEL[item.format]}</Badge><StatusBadge status={statusKey(item.status)} label={STATUS_LABEL[item.status]} /></div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {item.format === "mcq" ? <Badge tone="neutral">Auto-scored (answer key)</Badge> : <AIBadge label="AI-suggested · demo" />}
        <ConfidenceMeter value={item.confidence} policy={policy.confidenceThreshold} />
        {flagged && <Badge tone="warning" icon={<ShieldWarning size={12} />}>Needs review</Badge>}
        {item.moderated && <Badge tone="info">Moderated</Badge>}
      </div>
      {item.flags.length > 0 && <ul className="space-y-1 rounded-xl bg-warning-soft p-3 text-sm text-warning" aria-label="Review flags">{item.flags.map((f) => <li key={f} className="flex items-start gap-2"><ShieldWarning size={16} className="mt-0.5 shrink-0" />{f}</li>)}</ul>}
      {item.status === "rejected" && <p className="rounded-xl bg-danger-soft p-3 text-sm text-danger">AI draft rejected: {item.rejectReason}. Re-evaluate to request a new draft.</p>}
      {item.overrideReason && <p className="rounded-xl bg-info-soft p-3 text-sm text-info">Override reason: {item.overrideReason}</p>}

      <SubmissionEvidence item={item} onConfirmTranscript={(t) => confirmTx.mutate(t)} busy={confirmTx.isPending} readOnly={locked} />
      {item.evidence.criteria && <RubricTable criteria={criteria} onChange={useCriteria} readOnly={locked || item.status === "rejected"} withheld={hwBlocked} />}

      <Card><CardBody className="space-y-3">
        <SectionHeader title="Marks and feedback" />
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-text-2">{item.format === "mcq" ? "Auto-scored" : "AI-suggested"}</p><p className="tnum text-lg font-bold">{base === undefined ? "Withheld" : `${base}/${item.maxMarks}`}</p></div>
          <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-text-2">Rubric total</p><p className="tnum text-lg font-bold">{criteria.length ? `${criteria.reduce((a, c) => a + c.score, 0)}/${item.maxMarks}` : "n/a"}</p></div>
          <div className="rounded-xl bg-lilac p-3"><p className="text-xs text-text-2">Final marks</p><p className="tnum text-lg font-bold">{item.finalMarks === undefined ? "Not set" : `${item.finalMarks}/${item.maxMarks}`}</p></div>
        </div>
        <form id="review-form" onSubmit={form.handleSubmit((v) => approve.mutate(v))} className="space-y-3" noValidate>
          <Field label={`Marks (out of ${item.maxMarks})`} htmlFor="marks" error={form.formState.errors.marks?.message} hint={hwBlocked ? "Confirm the extracted handwriting first." : differs ? "Differs from the suggestion: use Override and give a reason." : undefined}>
            <Input id="marks" type="number" step={0.5} className="max-w-32" disabled={locked || hwBlocked} aria-invalid={!!form.formState.errors.marks} {...form.register("marks", { valueAsNumber: true })} />
          </Field>
          <Field label="Feedback to student" htmlFor="fb" error={form.formState.errors.feedback?.message}>
            <Textarea id="fb" disabled={locked} aria-invalid={!!form.formState.errors.feedback} {...form.register("feedback")} />
          </Field>
          {!locked && <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("feedback", item.suggestedFeedback, { shouldValidate: true })}>Use AI-suggested feedback</Button>}
        </form>
        {!locked ? (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" form="review-form" loading={approve.isPending} disabled={hwBlocked || differs || item.status === "approved" || item.status === "overridden"}><CheckCircle size={18} />Approve</Button>
            <Button variant="outline" onClick={() => setDlg("override")} disabled={hwBlocked || !form.formState.isValid}><PencilSimple size={18} />Override…</Button>
            <Button variant="outline" onClick={() => setDlg("reject")} disabled={item.status === "rejected"}><XCircle size={18} />Reject</Button>
            <Button variant="ghost" onClick={() => reeval.mutate()} loading={reeval.isPending} disabled={hwBlocked}><ArrowsClockwise size={18} />Re-evaluate</Button>
            {(item.status === "approved" || item.status === "overridden") && <Button variant="success" onClick={() => setDlg("release")}><PaperPlaneTilt size={18} />Release feedback…</Button>}
          </div>
        ) : <p className="flex items-center gap-1.5 text-sm text-success"><CheckCircle size={16} />Released {item.releasedAt ? relTime(item.releasedAt) : ""}. Students see these marks and feedback only.</p>}
        <p className="text-xs text-text-2">Students never see AI drafts. Approving keeps marks private; only an explicit release shares marks and feedback{item.assignmentSubmissionId ? " (this updates the student's Assignment Centre)" : ""}.</p>
        {role === "institution" && <Button variant="soft" size="sm" onClick={() => setDlg("moderate")}>Add moderation note</Button>}
      </CardBody></Card>

      <section><SectionHeader title="Audit trail" subtitle="AI suggestion, teacher change, final approval" />
        <ol className="space-y-2 border-l-2 border-border pl-4">{item.audit.map((a) => (
          <li key={a.id} className="relative text-sm"><span className="absolute -left-[22px] top-1.5 size-2.5 rounded-full bg-primary" />
            <div className="flex flex-wrap items-center gap-2"><Badge tone={a.kind === "override" ? "warning" : a.kind === "reject" ? "danger" : a.kind === "release" || a.kind === "approve" || a.kind === "bulk-approve" ? "success" : "neutral"}>{a.kind.replace("-", " ")}</Badge><span className="text-xs text-text-2"><Clock size={12} className="mr-1 inline" />{relTime(a.at)} · {a.actor}</span></div>
            <p className="mt-0.5 text-text-2">{a.text}</p></li>))}</ol>
      </section>

      <Modal open={dlg === "override"} onOpenChange={(v) => !v && setDlg(null)} title="Override suggested marks" description={`Final marks ${marks}/${item.maxMarks}. A reason is required and recorded in the audit trail.`}
        footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button type="submit" form="override-form" loading={override.isPending}>Record override</Button></>}>
        <form id="override-form" onSubmit={reasonForm.handleSubmit((v) => override.mutate(v))} noValidate><Field label="Reason for override" error={reasonForm.formState.errors.reason?.message} htmlFor="ov-r" required><Textarea id="ov-r" {...reasonForm.register("reason")} /></Field></form>
      </Modal>
      <Modal open={dlg === "reject"} onOpenChange={(v) => !v && setDlg(null)} title="Reject AI draft" description="No marks are recorded. You can grade manually or request a re-evaluation later."
        footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button type="submit" form="reject-form" variant="danger" loading={reject.isPending}>Reject draft</Button></>}>
        <form id="reject-form" onSubmit={reasonForm.handleSubmit((v) => reject.mutate(v))} noValidate><Field label="Reason" error={reasonForm.formState.errors.reason?.message} htmlFor="rj-r" required><Textarea id="rj-r" {...reasonForm.register("reason")} /></Field></form>
      </Modal>
      <Modal open={dlg === "moderate"} onOpenChange={(v) => !v && setDlg(null)} title="Moderation note" description="Visible in the audit trail. Does not change marks."
        footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button type="submit" form="mod-form" loading={moderate.isPending}>Save note</Button></>}>
        <form id="mod-form" onSubmit={reasonForm.handleSubmit((v) => moderate.mutate({ reason: v.reason }))} noValidate><Field label="Note" error={reasonForm.formState.errors.reason?.message} htmlFor="md-r" required><Textarea id="md-r" {...reasonForm.register("reason")} /></Field></form>
      </Modal>
      <Modal open={dlg === "release"} onOpenChange={(v) => !v && setDlg(null)} title="Release marks and feedback?" description={`${item.studentName} will see ${item.finalMarks}/${item.maxMarks} and your feedback. This cannot be silently undone.`}
        footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button variant="success" loading={release.isPending} onClick={() => release.mutate()}>Release now</Button></>}><p className="text-sm text-text-2">A notification is sent to the student.</p></Modal>
    </div>
  );
}
