"use client";
import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Warning, CheckCircle } from "@phosphor-icons/react";
import { Button, Field, Modal, Select, Textarea, ConfirmDialog, toast } from "@/components/ui";
import type { TimetableEntry } from "@/types/academic";
import type { AssignOp } from "@/types/timetable";
import { staffAllocationService as svc } from "@/lib/api/staffAllocationService";
import { TEACHERS, CLASSROOMS, SUBJECTS } from "@/lib/mock-data/core";
import { ROOMS } from "@/lib/mock-data/academic";
import { useInvalidateTT, DAYS, PERIODS } from "./common";

const schema = z.object({
  classId: z.string().min(1, "Choose a class."), day: z.string().min(1, "Choose a day."), period: z.string().min(1, "Choose a period."),
  subjectId: z.string().min(1, "Choose a subject."), teacherId: z.string().min(1, "Choose a teacher."), roomId: z.string().min(1, "Choose a room."), reason: z.string(),
});
type FV = z.infer<typeof schema>;
export interface AssignInit { entry?: TimetableEntry; classId?: string; day?: number; period?: string; subjectId?: string; teacherId?: string }

/** Manual assignment dialog. Also the keyboard-accessible alternative to drag and drop (change Day/Period to move). */
export function AssignDialog({ init, onClose, by }: { init: AssignInit | null; onClose: () => void; by: string }) {
  const inv = useInvalidateTT(); const open = !!init; const [confirmClear, setConfirmClear] = React.useState(false);
  const f = useForm<FV>({ resolver: zodResolver(schema), defaultValues: { classId: "", day: "", period: "", subjectId: "", teacherId: "", roomId: "", reason: "" } });
  React.useEffect(() => {
    if (!init) return; const e = init.entry;
    f.reset({ classId: e?.classId ?? init.classId ?? "", day: String(e?.dayOfWeek ?? init.day ?? ""), period: e?.periodId ?? init.period ?? "", subjectId: e?.subjectId ?? init.subjectId ?? "", teacherId: e?.teacherId ?? init.teacherId ?? "", roomId: e?.roomId ?? "", reason: "" });
  }, [init]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = useWatch({ control: f.control }) as FV;
  const op: AssignOp | null = v.classId && v.day && v.period && v.subjectId && v.teacherId && v.roomId ? { classId: v.classId, dayOfWeek: Number(v.day), periodId: v.period, subjectId: v.subjectId, teacherId: v.teacherId, roomId: v.roomId } : null;
  const prev = useQuery({ queryKey: ["academic", "tt", "prevAssign", init?.entry?.id, JSON.stringify(op)], queryFn: () => svc.previewReplace(init?.entry?.id, op!), enabled: open && !!op });
  const m = useMutation({ mutationFn: (x: { op: AssignOp; reason?: string }) => svc.replace(init?.entry?.id, x.op, by, x.reason), onSuccess: (r) => { toast.success(r.overridden ? "Saved as a recorded override." : "Draft updated."); inv(); onClose(); }, onError: (e: Error) => toast.error(e.message) });
  const clear = useMutation({ mutationFn: () => svc.unassign(init!.entry!.id, by), onSuccess: () => { toast.success("Period cleared in the draft."); inv(); onClose(); }, onError: (e: Error) => toast.error(e.message) });
  const needReason = !!prev.data?.requiresReason;
  const qualified = TEACHERS.filter((t) => t.subjectIds.includes(v.subjectId));
  const others = TEACHERS.filter((t) => !t.subjectIds.includes(v.subjectId));
  const isLab = v.subjectId === "sub-sci" || v.subjectId === "sub-cs";
  return (
    <>
      <Modal open={open} onOpenChange={(o) => !o && onClose()} className="sm:max-w-xl" title={init?.entry ? "Edit or move period" : "Assign period"} description="Changes are made to the DRAFT only. Conflicts are checked live; overriding one needs a recorded reason.">
        <form onSubmit={f.handleSubmit((vals) => {
          if (!op) return; if (needReason && vals.reason.trim().length < 8) { f.setError("reason", { message: "A reason of at least 8 characters is required to override conflicts." }); return; }
          m.mutate({ op, reason: needReason ? vals.reason : undefined });
        })} className="space-y-3" noValidate>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Class" htmlFor="as-class" error={f.formState.errors.classId?.message} required><Select id="as-class" {...f.register("classId")} disabled={!!init?.entry}><option value="">Select…</option>{CLASSROOMS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Day" htmlFor="as-day" error={f.formState.errors.day?.message} required><Select id="as-day" {...f.register("day")}><option value="">Select…</option>{DAYS.map((d) => <option key={d.n} value={d.n}>{d.label}</option>)}</Select></Field>
            <Field label="Period" htmlFor="as-period" error={f.formState.errors.period?.message} required><Select id="as-period" {...f.register("period")}><option value="">Select…</option>{PERIODS.filter((p) => p.kind === "teaching").map((p) => <option key={p.id} value={p.id}>{p.label} ({p.start})</option>)}</Select></Field>
          </div>
          <Field label="Subject" htmlFor="as-subj" error={f.formState.errors.subjectId?.message} required><Select id="as-subj" {...f.register("subjectId")}><option value="">Select…</option>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Teacher" htmlFor="as-teacher" error={f.formState.errors.teacherId?.message} hint="Qualified teachers are listed first." required>
            <Select id="as-teacher" {...f.register("teacherId")}><option value="">Select…</option>
              {qualified.length > 0 && <optgroup label="Qualified for this subject">{qualified.map((t) => <option key={t.id} value={t.id}>{t.displayName} · {t.departmentName}{t.status === "on-leave" ? " (on leave)" : ""}</option>)}</optgroup>}
              <optgroup label={qualified.length ? "Other staff (qualification mismatch)" : "All staff"}>{others.map((t) => <option key={t.id} value={t.id}>{t.displayName} · {t.departmentName}{t.status === "on-leave" ? " (on leave)" : ""}</option>)}</optgroup>
            </Select>
          </Field>
          <Field label="Room" htmlFor="as-room" error={f.formState.errors.roomId?.message} hint={isLab ? "This subject normally uses a lab." : undefined} required><Select id="as-room" {...f.register("roomId")}><option value="">Select…</option>{ROOMS.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.kind})</option>)}</Select></Field>
          <div aria-live="polite" className="rounded-xl bg-surface-2 p-3 text-sm">
            {!op ? <p className="text-text-2">Complete the form to run the conflict check.</p> : prev.isLoading ? <p className="text-text-2">Checking conflicts…</p> : prev.data && prev.data.newConflicts.length ? (
              <ul className="space-y-1 text-xs text-danger">{prev.data.newConflicts.map((c) => <li key={c.id} className="flex gap-1.5"><Warning size={14} weight="fill" className="mt-px shrink-0" />{c.message}</li>)}</ul>
            ) : <p className="flex items-center gap-1 text-xs font-medium text-success"><CheckCircle size={14} weight="fill" /> No new conflicts.</p>}
          </div>
          {needReason && <Field label="Override reason (recorded in audit history)" htmlFor="as-reason" error={f.formState.errors.reason?.message} required><Textarea id="as-reason" {...f.register("reason")} className="min-h-16" /></Field>}
          <div className="flex flex-wrap justify-between gap-2">
            {init?.entry ? <Button type="button" variant="ghost" onClick={() => setConfirmClear(true)}>Clear period</Button> : <span />}
            <div className="flex gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" loading={m.isPending} variant={needReason ? "danger" : "primary"}>{needReason ? "Override and save" : "Save to draft"}</Button></div>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={confirmClear} onOpenChange={setConfirmClear} destructive title="Clear this period?" body="The period becomes unassigned in the draft. Published timetables are unaffected until you publish." confirmLabel="Clear period" onConfirm={() => clear.mutate()} />
    </>
  );
}
