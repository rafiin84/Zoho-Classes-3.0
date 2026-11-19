"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Image as ImageIcon, MusicNotes, LinkSimple, X, FloppyDisk, PaperPlaneTilt, File as FileIcon } from "@phosphor-icons/react";
import { assignmentService } from "@/lib/api";
import { Button, Field, Textarea, Input, ConfirmDialog, toast, Badge } from "@/components/ui";
import { useApp } from "@/stores/app-store";
import type { Assignment, AssignmentSubmission } from "@/types";
import { ck } from "../keys";

type Att = { name: string; kind: string };
const schema = z.object({ text: z.string().max(5000, "Keep it under 5,000 characters"), link: z.string().optional() });
type Form = z.infer<typeof schema>;
const KIND_ICON: Record<string, React.ReactNode> = { image: <ImageIcon size={16} />, audio: <MusicNotes size={16} />, link: <LinkSimple size={16} />, file: <FileIcon size={16} /> };

export function SubmissionComposer({ assignment, submission, studentId }: { assignment: Assignment; submission: AssignmentSubmission; studentId: string }) {
  const qc = useQueryClient(); const setUnsaved = useApp((s) => s.setUnsaved);
  const types = assignment.submissionTypes; const needsText = types.includes("text");
  const { register, handleSubmit, watch, setError, clearErrors, getValues, setValue, formState: { errors, isDirty } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { text: submission.text ?? "", link: "" } });
  const [atts, setAtts] = useState<Att[]>(submission.attachments ?? []);
  const [confirm, setConfirm] = useState(false); const [savedAt, setSavedAt] = useState<string | null>(null); const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null); const pendingKind = useRef<string>("file");
  const text = watch("text");
  const resub = submission.status === "returned"; const late = submission.status === "overdue";
  useEffect(() => { setUnsaved(isDirty || atts.length !== (submission.attachments?.length ?? 0)); return () => setUnsaved(false); }, [isDirty, atts, submission.attachments, setUnsaved]);
  const invalidate = () => { qc.invalidateQueries({ queryKey: ck.assignments(studentId) }); qc.invalidateQueries({ queryKey: ck.assignment(assignment.id, studentId) }); qc.invalidateQueries({ queryKey: ["notifications"] }); };
  const save = useMutation({ mutationFn: () => assignmentService.saveDraft(assignment.id, studentId, getValues("text"), atts), onSuccess: () => { setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })); toast.success("Draft saved"); invalidate(); }, onError: () => toast.error("Couldn't save the draft. Your text is still here.") });
  const submit = useMutation({ mutationFn: () => assignmentService.submit(assignment.id, studentId, getValues("text"), atts), onSuccess: () => { setDone(true); setUnsaved(false); toast.success(resub ? "Resubmitted. Your teacher has been notified." : "Submitted. Your teacher can now review it."); invalidate(); }, onError: () => toast.error("Submission failed. Nothing was lost, so please try again.") });
  const pick = (kind: string, accept: string) => { pendingKind.current = kind; if (fileRef.current) { fileRef.current.accept = accept; fileRef.current.click(); } };
  const addFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setAtts((a) => [...a, { name: f.name, kind: pendingKind.current }]); e.target.value = ""; };
  const addLink = () => { const v = (getValues("link") ?? "").trim(); try { const u = new URL(v); if (!/^https?:$/.test(u.protocol)) throw 0; setAtts((a) => [...a, { name: v, kind: "link" }]); setValue("link", ""); clearErrors("link"); } catch { setError("link", { message: "Enter a full link starting with https://" }); } };
  const onSubmit = handleSubmit(() => {
    if (!text.trim() && atts.length === 0) { setError("text", { message: "Add your answer or attach your work before submitting." }); return; }
    if (needsText && !atts.length && text.trim().length < 20) { setError("text", { message: "Write at least a couple of sentences (20+ characters) or attach your work." }); return; }
    setConfirm(true);
  });
  if (done) return <div className="rounded-2xl bg-success-soft p-5 text-success" role="status"><h3 className="font-semibold">Submitted. Nice work!</h3><p className="mt-1 text-sm">Your teacher will review it. You'll get a notification when marks and feedback are released.</p></div>;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Submission composer">
      {resub && <div className="rounded-2xl bg-info-soft p-3 text-sm text-info" role="status">Your teacher returned this for another try{submission.resubmissions ? ` (resubmission ${submission.resubmissions + 1})` : ""}. Update your work and submit again.</div>}
      {late && <div className="rounded-2xl bg-warning-soft p-3 text-sm text-warning" role="status">The due date has passed. You can still submit, but it will be marked as late.</div>}
      {(needsText || types.length === 0) && <Field label="Your answer" htmlFor="asg-text" error={errors.text?.message} hint={`${text.length} characters`}><Textarea id="asg-text" rows={7} placeholder="Type your answer here. Show your steps." aria-invalid={!!errors.text} {...register("text")} /></Field>}
      <div>
        <p className="mb-2 text-sm font-semibold">Attachments <span className="text-xs font-normal text-text-2">(demo: only the file name is kept, nothing is uploaded)</span></p>
        <div className="flex flex-wrap gap-2">
          {types.includes("file") && <Button type="button" size="sm" variant="outline" onClick={() => pick("file", ".pdf,.doc,.docx,.txt")}><Paperclip size={16} />Add file</Button>}
          {types.includes("image") && <Button type="button" size="sm" variant="outline" onClick={() => pick("image", "image/*")}><ImageIcon size={16} />Add photo</Button>}
          {types.includes("audio") && <><Button type="button" size="sm" variant="outline" onClick={() => pick("audio", "audio/*,video/*")}><MusicNotes size={16} />Add audio/video</Button></>}
        </div>
        <input ref={fileRef} type="file" className="sr-only" tabIndex={-1} aria-hidden onChange={addFile} />
        {types.includes("link") && <div className="mt-3"><Field label="Add a link" htmlFor="asg-link" error={errors.link?.message}><div className="flex gap-2"><Input id="asg-link" placeholder="https://" {...register("link")} /><Button type="button" variant="soft" onClick={addLink}>Add</Button></div></Field></div>}
        {atts.length > 0 && <ul className="mt-3 space-y-1.5" aria-label="Attached items">{atts.map((a, i) => <li key={i} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm"><span className="flex min-w-0 items-center gap-2">{KIND_ICON[a.kind] ?? KIND_ICON.file}<span className="truncate">{a.name}</span><Badge>{a.kind}</Badge></span><button type="button" aria-label={`Remove ${a.name}`} className="rounded-full p-1.5 hover:bg-border" onClick={() => setAtts((x) => x.filter((_, j) => j !== i))}><X size={14} /></button></li>)}</ul>}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="button" variant="outline" loading={save.isPending} onClick={() => save.mutate()}><FloppyDisk size={18} />Save draft</Button>
        <Button type="submit" loading={submit.isPending} disabled={submit.isPending}><PaperPlaneTilt size={18} weight="fill" />{resub ? "Resubmit" : "Submit"}</Button>
        {savedAt && <span className="text-xs text-text-2" aria-live="polite">Draft saved at {savedAt}</span>}
      </div>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={resub ? "Resubmit this assignment?" : "Submit this assignment?"} body={`${atts.length} attachment${atts.length === 1 ? "" : "s"} and ${text.trim().length} characters of text will go to ${assignment.teacherName}.${late ? " It will be marked late." : ""} You can't edit after submitting unless your teacher returns it.`} confirmLabel="Yes, submit" onConfirm={() => submit.mutate()} />
    </form>
  );
}
