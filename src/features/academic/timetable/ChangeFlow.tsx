"use client";
import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Warning, CheckCircle, Users, ChalkboardTeacher } from "@phosphor-icons/react";
import { Button, Card, CardBody, Field, Input, Modal, Select, Textarea, Badge, StatusBadge, EmptyState, ErrorState, SkeletonCards, SectionHeader, Checkbox, toast } from "@/components/ui";
import type { ChangeProposal, ChangeRequest } from "@/types/timetable";
import { timetableService } from "@/lib/api/timetableService";
import { TEACHERS, CLASSROOMS, SUBJECTS } from "@/lib/mock-data/core";
import { ROOMS } from "@/lib/mock-data/academic";
import { relTime } from "@/lib/format";
import { useInvalidateTT, subjName, className, tShort, roomName, DAYS, PERIODS, ConflictBadge } from "./common";

const kinds = [["move", "Reschedule a period"], ["teacher", "Reassign teacher"], ["room", "Change room"], ["cancel", "Cancel a period"], ["substitute", "Substitution"], ["special", "Add special session"]] as const;
const schema = z.object({
  kind: z.enum(["move", "teacher", "room", "cancel", "substitute", "special"]), entryId: z.string(), day: z.string(), period: z.string(), teacherId: z.string(), roomId: z.string(),
  classId: z.string(), subjectId: z.string(), title: z.string(), reason: z.string().trim().min(5, "Give a reason (at least 5 characters)."),
}).superRefine((v, ctx) => {
  const need = (k: keyof typeof v, msg: string) => { if (!v[k]) ctx.addIssue({ code: "custom", path: [k], message: msg }); };
  if (v.kind !== "special") need("entryId", "Choose the period to change.");
  if (v.kind === "move") { need("day", "Choose a day."); need("period", "Choose a period."); }
  if (v.kind === "teacher" || v.kind === "substitute") need("teacherId", "Choose a teacher.");
  if (v.kind === "room") need("roomId", "Choose a room.");
  if (v.kind === "special") { need("classId", "Choose a class."); need("subjectId", "Choose a subject."); need("title", "Name the session."); need("day", "Choose a day."); need("period", "Choose a period."); need("teacherId", "Choose a teacher."); need("roomId", "Choose a room."); }
});
type FV = z.infer<typeof schema>;
const toReq = (v: FV): ChangeRequest => ({ kind: v.kind, entryId: v.entryId || undefined, reason: v.reason, dayOfWeek: v.day ? Number(v.day) : undefined, periodId: v.period || undefined, teacherId: v.kind === "substitute" ? undefined : v.teacherId || undefined, substituteTeacherId: v.kind === "substitute" ? v.teacherId || undefined : undefined, roomId: v.roomId || undefined, special: v.kind === "special" ? { classId: v.classId, subjectId: v.subjectId, title: v.title } : undefined });
const ready = (v: FV) => schema.safeParse(v).success;

export function ProposeDialog({ open, onOpenChange, role, teacherId, by, initialEntryId }: { open: boolean; onOpenChange: (v: boolean) => void; role: "teacher" | "institution"; teacherId: string; by: string; initialEntryId?: string }) {
  const inv = useInvalidateTT();
  const ents = useQuery({ queryKey: ["academic", "tt", "pub"], queryFn: timetableService.all, enabled: open });
  const f = useForm<FV>({ resolver: zodResolver(schema), defaultValues: { kind: "move", entryId: "", day: "", period: "", teacherId: "", roomId: "", classId: "", subjectId: "", title: "", reason: "" } });
  React.useEffect(() => { if (open) f.reset({ kind: "move", entryId: initialEntryId ?? "", day: "", period: "", teacherId: "", roomId: "", classId: "", subjectId: "", title: "", reason: "" }); }, [open, initialEntryId]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = useWatch({ control: f.control }) as FV;
  const req = ready(v) ? toReq(v) : null;
  const prev = useQuery({ queryKey: ["academic", "tt", "preview", JSON.stringify(req)], queryFn: () => timetableService.previewChange(req!), enabled: open && !!req });
  const m = useMutation({ mutationFn: (r: ChangeRequest) => timetableService.proposeChange(r, by, role), onSuccess: () => { toast.success("Change proposed. The timetable office will review it before anything changes."); inv(); onOpenChange(false); }, onError: (e: Error) => toast.error(e.message) });
  const mine = (ents.data ?? []).filter((e) => role === "institution" || e.teacherId === teacherId);
  const err = f.formState.errors;
  const showEntry = v.kind !== "special";
  return (
    <Modal open={open} onOpenChange={onOpenChange} className="sm:max-w-xl" title="Propose a timetable change" description="Nothing changes until an administrator approves. Affected classes, staff and rooms are shown before you submit.">
      <form onSubmit={f.handleSubmit((vals) => m.mutate(toReq(vals)))} className="space-y-3" noValidate>
        <Field label="Type of change" htmlFor="chg-kind"><Select id="chg-kind" {...f.register("kind")}>{kinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        {showEntry && (
          <Field label="Period" htmlFor="chg-entry" error={err.entryId?.message} required>
            <Select id="chg-entry" {...f.register("entryId")}><option value="">Select a period…</option>
              {mine.map((e) => <option key={e.id} value={e.id}>{className(e.classId)} · {subjName(e.subjectId)} · {DAYS.find((d) => d.n === e.dayOfWeek)?.short} {PERIODS.find((p) => p.id === e.periodId)?.label}</option>)}
            </Select>
          </Field>
        )}
        {v.kind === "special" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Class" htmlFor="chg-class" error={err.classId?.message} required><Select id="chg-class" {...f.register("classId")}><option value="">Select…</option>{CLASSROOMS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Subject" htmlFor="chg-subj" error={err.subjectId?.message} required><Select id="chg-subj" {...f.register("subjectId")}><option value="">Select…</option>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="Session title" htmlFor="chg-title" error={err.title?.message} required className="sm:col-span-2"><Input id="chg-title" {...f.register("title")} placeholder="e.g. Science fair rehearsal" /></Field>
          </div>
        )}
        {(v.kind === "move" || v.kind === "special") && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="New day" htmlFor="chg-day" error={err.day?.message} required><Select id="chg-day" {...f.register("day")}><option value="">Select…</option>{DAYS.map((d) => <option key={d.n} value={d.n}>{d.label}</option>)}</Select></Field>
            <Field label="New period" htmlFor="chg-period" error={err.period?.message} required><Select id="chg-period" {...f.register("period")}><option value="">Select…</option>{PERIODS.filter((p) => p.kind === "teaching").map((p) => <option key={p.id} value={p.id}>{p.label} ({p.start})</option>)}</Select></Field>
          </div>
        )}
        {(v.kind === "teacher" || v.kind === "substitute" || v.kind === "special") && <Field label={v.kind === "substitute" ? "Substitute teacher" : "Teacher"} htmlFor="chg-teacher" error={err.teacherId?.message} required><Select id="chg-teacher" {...f.register("teacherId")}><option value="">Select…</option>{TEACHERS.filter((t) => t.status === "active").map((t) => <option key={t.id} value={t.id}>{t.displayName} · {t.departmentName}</option>)}</Select></Field>}
        {(v.kind === "room" || v.kind === "special") && <Field label="Room" htmlFor="chg-room" error={err.roomId?.message} required><Select id="chg-room" {...f.register("roomId")}><option value="">Select…</option>{ROOMS.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.kind})</option>)}</Select></Field>}
        <Field label="Reason" htmlFor="chg-reason" error={err.reason?.message} required><Textarea id="chg-reason" {...f.register("reason")} className="min-h-16" placeholder="Why is this change needed?" /></Field>
        <div aria-live="polite" className="rounded-xl bg-surface-2 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold text-text-2">Impact check</p>
          {!req ? <p className="text-text-2">Complete the form to see affected classes, staff, rooms and conflicts.</p> : prev.isLoading ? <p className="text-text-2">Checking…</p> : prev.data ? (
            <div className="space-y-2">
              <p className="font-medium">{prev.data.summary}</p>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-2"><span className="inline-flex items-center gap-1"><Users size={13} />{prev.data.affected.classIds.map(className).join(", ")} (~{prev.data.affected.students} students)</span><span className="inline-flex items-center gap-1"><ChalkboardTeacher size={13} />{prev.data.affected.teacherIds.map(tShort).join(", ")}</span><span>Rooms: {prev.data.affected.roomIds.map(roomName).join(", ")}</span></p>
              {prev.data.conflicts.length ? <ul className="space-y-1 text-xs text-danger">{prev.data.conflicts.map((c) => <li key={c.id} className="flex gap-1.5"><Warning size={14} weight="fill" className="mt-px shrink-0" />{c.message}</li>)}</ul> : <p className="flex items-center gap-1 text-xs font-medium text-success"><CheckCircle size={14} weight="fill" /> No new conflicts detected.</p>}
            </div>
          ) : <p className="text-danger">Could not check impact.</p>}
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" loading={m.isPending}>Submit for approval</Button></div>
      </form>
    </Modal>
  );
}

function Decide({ p, open, onOpenChange, by }: { p: ChangeProposal; open: boolean; onOpenChange: (v: boolean) => void; by: string }) {
  const inv = useInvalidateTT(); const [note, setNote] = React.useState(""); const [ack, setAck] = React.useState(false);
  const m = useMutation({ mutationFn: (d: "approved" | "rejected") => timetableService.decideChange(p.id, d, by, note, ack), onSuccess: (r) => { toast.success(r.status === "approved" ? "Approved. Timetables updated, notifications sent and the previous schedule kept in history." : "Proposal rejected."); inv(); onOpenChange(false); }, onError: (e: Error) => toast.error(e.message) });
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Review timetable change" description={p.summary}>
      <div className="space-y-3 text-sm">
        <p><span className="font-semibold">Reason from {p.proposedBy}:</span> {p.request.reason}</p>
        <p className="text-xs text-text-2">Affects {p.affected.classIds.map(className).join(", ")}, staff {p.affected.teacherIds.map(tShort).join(", ")}, rooms {p.affected.roomIds.map(roomName).join(", ")}.</p>
        {p.conflicts.length > 0 && <div className="space-y-2 rounded-xl bg-danger-soft p-3"><ul className="space-y-1 text-xs text-danger">{p.conflicts.map((c) => <li key={c.id}>{c.message}</li>)}</ul><Checkbox checked={ack} onChange={setAck} label="I acknowledge these conflicts and still want to approve" /></div>}
        <Field label="Decision note" htmlFor="dec-note" optional><Textarea id="dec-note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16" /></Field>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => m.mutate("rejected")} loading={m.isPending}>Reject</Button><Button onClick={() => m.mutate("approved")} loading={m.isPending} disabled={p.conflicts.length > 0 && !ack}>Approve and apply</Button></div>
      </div>
    </Modal>
  );
}

export function ChangeFlow({ role, teacherId, by }: { role: "teacher" | "institution"; teacherId: string; by: string }) {
  const [open, setOpen] = React.useState(false); const [dec, setDec] = React.useState<ChangeProposal | null>(null);
  const q = useQuery({ queryKey: ["academic", "tt", "proposals"], queryFn: timetableService.proposals });
  const ver = useQuery({ queryKey: ["academic", "tt", "versions"], queryFn: timetableService.versions });
  const list = (q.data ?? []).filter((p) => role === "institution" || p.proposedByRole === "teacher");
  return (
    <div className="space-y-6">
      <section>
        <SectionHeader title="Change requests" subtitle="Propose, check impact, approve, then timetables update and people are notified." action={<Button size="sm" onClick={() => setOpen(true)}><Plus size={16} /> Propose change</Button>} />
        {q.isLoading ? <SkeletonCards n={2} h="h-24" /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : list.length === 0 ? <EmptyState title="No change requests yet" body="When a period must move, be covered or be cancelled, propose it here so affected classes and staff are informed once it is approved." action={{ label: "Propose a change", onClick: () => setOpen(true) }} /> : (
          <ul className="space-y-2">{list.map((p) => (
            <li key={p.id}><Card><CardBody className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1"><p className="font-semibold">{p.summary}</p><p className="text-xs text-text-2">By {p.proposedBy} · {relTime(p.createdAt)} · “{p.request.reason}”</p>
                <div className="flex flex-wrap gap-1.5"><StatusBadge status={p.status === "proposed" ? "Awaiting approval" : p.status} />{p.conflicts.length > 0 && <Badge tone="danger" icon={<Warning size={12} weight="fill" />}>{p.conflicts.length} conflict{p.conflicts.length > 1 ? "s" : ""}</Badge>}<Badge>{p.affected.classIds.length} class{p.affected.classIds.length > 1 ? "es" : ""} · {p.affected.teacherIds.length} staff</Badge></div>
                {p.decisionNote && <p className="text-xs text-text-2">Decision ({p.decidedBy}): {p.decisionNote}</p>}</div>
              {role === "institution" && p.status === "proposed" && <Button size="sm" variant="soft" onClick={() => setDec(p)}>Review</Button>}
            </CardBody></Card></li>))}</ul>
        )}
      </section>
      <section>
        <SectionHeader title="Version history" subtitle="Superseded schedules are retained." />
        {ver.isLoading ? <SkeletonCards n={1} h="h-16" /> : ver.data?.length ? <ul className="divide-y divide-border rounded-xl border border-border bg-surface">{ver.data.map((v) => <li key={v.version + v.note} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span><span className="font-semibold">Version {v.version}</span> · {v.note}</span><span className="text-xs text-text-2">retired {relTime(v.publishedAt)} · {v.acknowledgedConflicts} acknowledged conflicts</span></li>)}</ul> : <p className="text-sm text-text-2">Only the current version exists. Earlier versions appear here once a change is approved or the draft is republished.</p>}
      </section>
      <ProposeDialog open={open} onOpenChange={setOpen} role={role} teacherId={teacherId} by={by} />
      {dec && <Decide p={dec} open onOpenChange={(v) => !v && setDec(null)} by={by} />}
    </div>
  );
}
export { ConflictBadge };
