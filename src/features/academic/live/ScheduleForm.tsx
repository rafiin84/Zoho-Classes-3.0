"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info } from "@phosphor-icons/react";
import { Button, Field, Input, Modal, Select, Switch, Textarea, toast } from "@/components/ui";
import { liveClassService } from "@/lib/api/liveClassService";
import { notificationService } from "@/lib/api/notificationService";
import { CLASSROOMS, TEACHERS, teacherName } from "@/lib/mock-data/core";
import { TZ_LABEL } from "@/lib/format";
import type { Role, LiveClass } from "@/types";

export const KINDS: { value: LiveClass["kind"]; label: string }[] = [
  { value: "class", label: "Class" }, { value: "one-to-one", label: "One-to-one doubt session" }, { value: "group", label: "Small-group tutoring" },
  { value: "office-hours", label: "Office hours" }, { value: "parent-teacher", label: "Parent-teacher meeting" }, { value: "staff", label: "Staff meeting" }, { value: "webinar", label: "Webinar" },
];
const COURSES = [{ id: "crs-fractions", label: "Fractions & Decimals, Made Friendly" }, { id: "crs-ecosystems", label: "Ecosystems: Who Eats Whom?" }, { id: "crs-storycraft", label: "Storycraft" }];
const schema = z.object({
  title: z.string().trim().min(4, "Title needs at least 4 characters").max(80, "Keep the title under 80 characters"),
  kind: z.string(), hostId: z.string().min(1, "Choose a host"),
  target: z.string().min(1, "Choose an audience"), courseId: z.string().optional(),
  date: z.string().min(1, "Pick a date"), time: z.string().min(1, "Pick a start time"),
  durationMinutes: z.coerce.number().int().min(10, "At least 10 minutes").max(240, "At most 240 minutes"),
  agenda: z.string().trim().min(10, "Add a short agenda (10+ characters) so invitees know what to expect"),
  repeat: z.enum(["none", "weekly", "daily"]), occurrences: z.coerce.number().int().min(1).max(8),
  waitingRoom: z.boolean(), recording: z.boolean(), consent: z.boolean(),
}).refine((v) => !v.recording || v.consent, { path: ["consent"], message: "Confirm the recording consent policy to enable recording" })
  .refine((v) => !v.date || !v.time || new Date(`${v.date}T${v.time}:00+05:30`).getTime() > new Date("2026-11-19T10:30:00+05:30").getTime(), { path: ["date"], message: "Choose a time in the future" });
type FormVals = z.infer<typeof schema>;

export const iso = (date: string, time: string) => `${date}T${time}:00+05:30`;

export function ScheduleModal({ open, onOpenChange, role, teacherId }: { open: boolean; onOpenChange: (v: boolean) => void; role: Role; teacherId: string }) {
  const qc = useQueryClient();
  const f = useForm<FormVals>({ resolver: zodResolver(schema) as never, defaultValues: { title: "", kind: "class", hostId: teacherId, target: "cls-8b", courseId: "", date: "", time: "11:00", durationMinutes: 40, agenda: "", repeat: "none", occurrences: 1, waitingRoom: true, recording: false, consent: false } });
  const { register, control, handleSubmit, watch, reset, formState: { errors } } = f;
  const recording = watch("recording"); const repeat = watch("repeat");
  const m = useMutation({
    mutationFn: async (v: FormVals) => {
      const host = TEACHERS.find((t) => t.id === v.hostId)!;
      const cls = CLASSROOMS.find((c) => c.id === v.target);
      const n = v.repeat === "none" ? 1 : v.occurrences; const step = v.repeat === "daily" ? 1 : 7; const made: LiveClass[] = [];
      for (let i = 0; i < n; i++) {
        const d = new Date(`${v.date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i * step);
        made.push(await liveClassService.schedule({ title: v.title, kind: v.kind as LiveClass["kind"], hostId: host.id, hostName: teacherName(host.id), classIds: cls ? [cls.id] : [], audienceLabel: cls ? cls.name : v.target === "staff" ? "All staff" : "Open invitation", courseId: v.courseId || undefined, startAt: iso(d.toISOString().slice(0, 10), v.time), durationMinutes: v.durationMinutes, agenda: v.agenda, waitingRoom: v.waitingRoom, recordingPolicy: v.recording ? "on-with-consent" : "off" }));
      }
      return made;
    },
    onSuccess: (made) => { toast.success(made.length > 1 ? `${made.length} sessions scheduled` : "Live class scheduled"); notificationService.push({ role: "parent", category: "live", title: "Live session scheduled", body: made[0].title, childId: "stu-ananya", href: "/parent/live-classes" }); qc.invalidateQueries({ queryKey: ["live-admin"] }); qc.invalidateQueries({ queryKey: ["live-classes"] }); reset(); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Schedule a live session" description={`All times are in ${TZ_LABEL}.`} className="sm:max-w-2xl"
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="sched-form" loading={m.isPending}>Schedule</Button></>}>
      <form id="sched-form" onSubmit={handleSubmit((v) => m.mutate(v))} className="grid gap-3 sm:grid-cols-2" noValidate>
        <Field className="sm:col-span-2" label="Title" required htmlFor="lt" error={errors.title?.message}><Input id="lt" aria-invalid={!!errors.title} {...register("title")} placeholder="e.g. Ratio and proportion problem clinic" /></Field>
        <Field label="Session type" htmlFor="lk"><Select id="lk" {...register("kind")}>{KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select></Field>
        <Field label="Host" required htmlFor="lh" error={errors.hostId?.message}><Select id="lh" disabled={role !== "institution"} {...register("hostId")}>{TEACHERS.filter((t) => t.status === "active").map((t) => <option key={t.id} value={t.id}>{teacherName(t.id)}</option>)}</Select></Field>
        <Field label="Audience" required htmlFor="la" error={errors.target?.message}><Select id="la" {...register("target")}>{CLASSROOMS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="staff">All staff</option><option value="open">Open invitation (parents / webinar)</option></Select></Field>
        <Field label="Linked course" optional htmlFor="lc"><Select id="lc" {...register("courseId")}><option value="">None</option>{COURSES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
        <Field label="Date" required htmlFor="ld" error={errors.date?.message}><Input id="ld" type="date" min="2026-11-19" aria-invalid={!!errors.date} {...register("date")} /></Field>
        <Field label={`Start time (${TZ_LABEL})`} required htmlFor="ltm" error={errors.time?.message}><Input id="ltm" type="time" {...register("time")} /></Field>
        <Field label="Duration (minutes)" required htmlFor="ldu" error={errors.durationMinutes?.message}><Input id="ldu" type="number" inputMode="numeric" {...register("durationMinutes")} /></Field>
        <Field label="Repeat (mock)" htmlFor="lr"><Select id="lr" {...register("repeat")}><option value="none">Does not repeat</option><option value="weekly">Weekly</option><option value="daily">Daily</option></Select></Field>
        {repeat !== "none" && <Field label="Number of sessions" htmlFor="lo" error={errors.occurrences?.message}><Input id="lo" type="number" min={1} max={8} {...register("occurrences")} /></Field>}
        <Field className="sm:col-span-2" label="Agenda" required htmlFor="lg" error={errors.agenda?.message}><Textarea id="lg" aria-invalid={!!errors.agenda} {...register("agenda")} placeholder="What will be covered, what to prepare" /></Field>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 sm:col-span-2"><div><p className="text-sm font-semibold">Waiting room</p><p className="text-xs text-text-2">Participants are admitted by the host.</p></div><Controller control={control} name="waitingRoom" render={({ field }) => <Switch label="Waiting room" checked={field.value} onChange={field.onChange} />} /></div>
        <div className="rounded-xl border border-border p-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Record this session</p><p className="text-xs text-text-2">Off by default. Recording is a placeholder in this prototype.</p></div><Controller control={control} name="recording" render={({ field }) => <Switch label="Record this session" checked={field.value} onChange={field.onChange} />} /></div>
          {recording && <div className="mt-2 rounded-lg bg-warning-soft p-2.5 text-xs"><p className="flex gap-1.5 font-semibold text-warning"><Info size={14} className="mt-0.5 shrink-0" />Consent policy</p><p className="mt-1 text-text-2">Participants are told before joining that the session is recorded. Students under 18 need guardian consent on file. Recordings are kept only for the institution retention period and are visible only to the audience.</p>
            <label className="mt-2 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4" {...register("consent")} />I confirm consent requirements are met for this audience.</label>{errors.consent && <p role="alert" className="mt-1 text-xs font-medium text-danger">Fix this: {errors.consent.message}</p>}</div>}
        </div>
      </form>
    </Modal>
  );
}
