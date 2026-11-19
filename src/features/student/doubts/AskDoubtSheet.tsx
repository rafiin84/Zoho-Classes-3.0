"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Microphone, Camera, FileText, X, Sparkle, UserCircle, Paperclip } from "@phosphor-icons/react";
import { Modal, Button, Field, Input, Textarea, Select, Badge, toast } from "@/components/ui";
import { SUBJECTS, TEACHERS, teacherName } from "@/lib/mock-data/core";
import { courseService, doubtService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { studentKeys } from "../keys";
import { teacherForSubject } from "../hooks";
import { VoiceRecorder } from "../components/VoiceRecorder";
import type { DoubtThread } from "@/types";

export interface DoubtContext {
  courseId?: string; lessonId?: string; lessonTitle?: string; q?: string; subjectId?: string; fromTutor?: boolean;
  /** Free-text origin, e.g. "Assignment: Baking with fractions" */
  origin?: string;
}
type Att = { name: string; kind: "image" | "doc" | "audio" };

const schema = z.object({
  title: z.string().trim().min(5, "Give your doubt a short title (5+ characters)").max(120),
  text: z.string().trim().min(10, "Tell your teacher a little more (10+ characters)"),
  subjectId: z.string().min(1, "Pick a subject"),
  teacherId: z.string().min(1),
});
type Form = z.infer<typeof schema>;

/** Reusable Ask-a-Doubt composer (bottom sheet on phones). Context chips are auto-attached and can be removed. */
export function AskDoubtSheet({ open, onOpenChange, context, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; context?: DoubtContext; onCreated?: (t: DoubtThread) => void }) {
  const { studentId } = useActors();
  const qc = useQueryClient();
  const [ctx, setCtx] = useState<DoubtContext>(context ?? {});
  const [atts, setAtts] = useState<Att[]>([]);
  const [recording, setRecording] = useState(false);
  const [voiceSecs, setVoiceSecs] = useState<number | null>(null);
  const [created, setCreated] = useState<DoubtThread | null>(null);

  const course = useQuery({ queryKey: studentKeys.course(ctx.courseId ?? "none", studentId), queryFn: () => courseService.get(ctx.courseId!, studentId), enabled: open && !!ctx.courseId });
  const subjectGuess = ctx.subjectId ?? course.data?.subjectId ?? "sub-math";
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { title: "", text: ctx.q ?? "", subjectId: subjectGuess, teacherId: teacherForSubject(subjectGuess).id } });
  const subjectId = form.watch("subjectId");
  const teacherId = form.watch("teacherId");

  // reset when opened with fresh context
  useEffect(() => {
    if (!open) return;
    setCtx(context ?? {}); setAtts([]); setVoiceSecs(null); setRecording(false); setCreated(null);
    const sid = context?.subjectId ?? "sub-math";
    form.reset({ title: context?.q ? context.q.slice(0, 80) : "", text: context?.q ?? "", subjectId: sid, teacherId: teacherForSubject(sid).id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, context?.courseId, context?.lessonId, context?.q]);
  useEffect(() => { if (course.data && !context?.subjectId) { form.setValue("subjectId", course.data.subjectId); form.setValue("teacherId", teacherForSubject(course.data.subjectId).id); }   }, [course.data?.subjectId]);

  const chips = useMemo(() => {
    const c: { key: keyof DoubtContext; label: string }[] = [];
    if (ctx.courseId) c.push({ key: "courseId", label: course.data ? `Course · ${course.data.title}` : "Course attached" });
    if (ctx.lessonId) c.push({ key: "lessonId", label: `Lesson · ${ctx.lessonTitle ?? ctx.lessonId}` });
    if (ctx.origin) c.push({ key: "origin", label: ctx.origin });
    if (ctx.fromTutor) c.push({ key: "fromTutor", label: "From your AI Tutor chat" });
    return c;
  }, [ctx, course.data]);
  const teachers = TEACHERS.filter((t) => t.status === "active");
  const subject = SUBJECTS.find((s) => s.id === subjectId);

  const m = useMutation({
    mutationFn: (v: Form) => doubtService.create({
      studentId, teacherId: v.teacherId, subjectId: v.subjectId, title: v.title, text: v.text, courseId: ctx.courseId, lessonId: ctx.lessonId,
      context: [course.data?.title, ctx.lessonTitle, ctx.origin].filter(Boolean).join(" › ") || undefined, kind: voiceSecs ? "voice" : "text",
      attachments: atts, escalatedFromTutor: ctx.fromTutor,
    }),
    onSuccess: (t) => { qc.invalidateQueries({ queryKey: studentKeys.doubts(studentId) }); qc.invalidateQueries({ queryKey: studentKeys.notifications }); setCreated(t); onCreated?.(t); toast.success("Doubt sent to your teacher"); },
    onError: () => toast.error("Couldn't send your doubt. Your text is still here — try again."),
  });
  const addAtt = (a: Att) => setAtts((x) => (x.some((y) => y.name === a.name) ? x : [...x, a]));
  const tutorQ = encodeURIComponent(form.watch("text") || form.watch("title") || "");

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={created ? "Doubt sent" : "Ask a doubt"} description={created ? undefined : "A real teacher will answer you. You can try the AI Tutor first, but you never have to."} className="sm:max-w-xl">
      {created ? (
        <div className="space-y-4 text-center" role="status">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success-soft text-success"><UserCircle size={30} weight="duotone" /></div>
          <p className="font-semibold">Sent to {teacherName(created.teacherId)}</p>
          <p className="text-sm text-text-2">You’ll get a notification when they reply. They can answer with text, a voice note or an annotated explanation.</p>
          <div className="flex flex-wrap justify-center gap-2"><Button asChild><Link href={`/student/doubts/${created.id}`} onClick={() => onOpenChange(false)}>Open thread</Link></Button><Button variant="ghost" onClick={() => onOpenChange(false)}>Done</Button></div>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit((v) => m.mutate(v))} className="space-y-4" noValidate>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Attached context">
              {chips.map((c) => (
                <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-lilac py-1 pl-3 pr-1 text-xs font-semibold text-primary">{c.label}
                  <button type="button" aria-label={`Remove ${c.label}`} className="rounded-full p-1 hover:bg-primary/10" onClick={() => setCtx((x) => ({ ...x, [c.key]: undefined }))}><X size={12} weight="bold" /></button></span>
              ))}
            </div>
          )}
          <Field label="What’s the doubt?" htmlFor="dt-title" error={form.formState.errors.title?.message} required><Input id="dt-title" aria-invalid={!!form.formState.errors.title} placeholder="e.g. Why do we need a common denominator?" {...form.register("title")} /></Field>
          <Field label="Explain where you’re stuck" htmlFor="dt-text" error={form.formState.errors.text?.message} required><Textarea id="dt-text" aria-invalid={!!form.formState.errors.text} placeholder="Share what you tried and what confused you." {...form.register("text")} /></Field>
          {recording ? <VoiceRecorder onCancel={() => setRecording(false)} onDone={(s) => { setRecording(false); setVoiceSecs(s); addAtt({ name: `voice-note-${s}s.m4a`, kind: "audio" }); }} /> : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setRecording(true)}><Microphone size={16} />Record voice</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addAtt({ name: "handwritten-work.jpg", kind: "image" })}><Camera size={16} />Photo of my work</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addAtt({ name: "class-notes.pdf", kind: "doc" })}><FileText size={16} />Document</Button>
            </div>
          )}
          {atts.length > 0 && <ul className="flex flex-wrap gap-1.5" aria-label="Attachments">{atts.map((a) => <li key={a.name} className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-2.5 pr-1 text-xs font-medium"><Paperclip size={12} />{a.name}<button type="button" aria-label={`Remove ${a.name}`} onClick={() => setAtts((x) => x.filter((y) => y.name !== a.name))} className="rounded-full p-1 hover:bg-border"><X size={10} weight="bold" /></button></li>)}</ul>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subject" htmlFor="dt-sub" error={form.formState.errors.subjectId?.message}>
              <Select id="dt-sub" value={subjectId} onChange={(e) => { form.setValue("subjectId", e.target.value); form.setValue("teacherId", teacherForSubject(e.target.value).id); }}>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
            </Field>
            <Field label="Goes to" htmlFor="dt-teacher" hint={`Auto-routed from ${subject?.name ?? "subject"}`}>
              <Select id="dt-teacher" value={teacherId} onChange={(e) => form.setValue("teacherId", e.target.value)}>{teachers.map((t) => <option key={t.id} value={t.id}>{teacherName(t.id)} · {t.departmentName}</option>)}</Select>
            </Field>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-lilac p-3 text-sm">
            <Sparkle size={20} weight="fill" className="mt-0.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1"><p className="font-semibold">Want a quick hint while you wait?</p><p className="text-text-2">Your AI Tutor can explain it right now. This is optional — your teacher still gets your doubt.</p></div>
            <Button asChild size="sm" variant="soft"><Link href={`/student/tutor?q=${tutorQ}`} onClick={() => onOpenChange(false)}>Try AI Tutor</Link></Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge tone="info">Human teacher reply</Badge>
            <div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" loading={m.isPending}>Send to teacher</Button></div>
          </div>
        </form>
      )}
    </Modal>
  );
}
