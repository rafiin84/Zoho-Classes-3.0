"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, FloppyDisk, PaperPlaneRight, LockSimple } from "@phosphor-icons/react";
import { PageHeader, Card, CardBody, Badge, Button, Select, Field, Input, Textarea, Modal, ConfirmDialog, EmptyState, SkeletonCards, Avatar, toast, ErrorState } from "@/components/ui";
import type { ScreenProps } from "@/types/screens";
import { attendanceService } from "@/lib/api/attendanceService";
import { timetableService } from "@/lib/api";
import { PERIODS } from "@/types/academic";
import { CLASSROOMS, subjectById } from "@/lib/mock-data/core";
import { cn } from "@/lib/utils";
import { useTeacher, errMsg } from "../components/common";
import { attendanceAdapter, type Mark } from "../attendanceAdapter";

const LABEL: Record<Mark, string> = { P: "Present", A: "Absent", L: "Late", E: "Excused" };
const TONE: Record<Mark, string> = { P: "bg-success-soft text-success border-success", A: "bg-danger-soft text-danger border-danger", L: "bg-warning-soft text-warning border-warning", E: "bg-info-soft text-info border-info" };
const drafts: Record<string, Record<string, Mark>> = {};

export default function AttendanceScreen({ searchParams }: ScreenProps) {
  const t = useTeacher(); const qc = useQueryClient();
  const [classId, setClassId] = React.useState(searchParams.class ?? "cls-8b"); const [date, setDate] = React.useState("2026-11-19"); const [period, setPeriod] = React.useState(searchParams.period ?? "p1");
  const [marks, setMarks] = React.useState<Record<string, Mark>>({}); const [confirm, setConfirm] = React.useState(false); const [corr, setCorr] = React.useState(false); const [corrText, setCorrText] = React.useState(""); const [edited, setEdited] = React.useState(false);
  const key = `${classId}|${date}|${period}`;
  const roster = useQuery({ queryKey: ["t", "att-roster", classId], queryFn: () => attendanceService.roster(classId) });
  const tt = useQuery({ queryKey: ["t", "tt", t.id], queryFn: () => timetableService.forTeacher(t.id) });
  const existing = useQuery({ queryKey: ["t", "att", classId, date, period], queryFn: () => attendanceAdapter.get(classId, date, period) });
  const dow = new Date(date + "T00:00:00Z").getUTCDay();
  const periodOpts = [...(tt.data ?? []).filter((e) => e.classId === classId && e.dayOfWeek === dow).map((e) => ({ id: e.periodId, label: `${PERIODS.find((p) => p.id === e.periodId)?.label} · ${subjectById(e.subjectId).name}` })), { id: "daily", label: "Daily register" }];
  React.useEffect(() => { if (tt.data && !periodOpts.some((p) => p.id === period)) setPeriod(periodOpts[0].id);   }, [tt.data, classId, date]);
  React.useEffect(() => { setEdited(false); setMarks(drafts[key] ?? existing.data ?? {});   }, [key, existing.data]);
  const submitted = !!existing.data; const locked = submitted;
  const students = roster.data ?? []; const set = (id: string, m: Mark) => { setMarks((x) => ({ ...x, [id]: m })); setEdited(true); };
  const unmarked = students.filter((s) => !marks[s.id]); const counts = (m: Mark) => students.filter((s) => marks[s.id] === m).length;
  const submit = useMutation({ mutationFn: () => { if (unmarked.length) throw new Error(`${unmarked.length} student(s) are not marked yet.`); return attendanceAdapter.submit(classId, date, period, marks, t.name); },
    onSuccess: () => { delete drafts[key]; toast.success(`Attendance submitted — ${counts("A")} absent. Student and parent views are updated.`); qc.invalidateQueries({ queryKey: ["t", "att"] }); qc.invalidateQueries({ queryKey: ["student"] }); qc.invalidateQueries({ queryKey: ["parent"] }); setEdited(false); }, onError: (e) => toast.error(errMsg(e)) });
  const classes = t.teacher.classIds.map((id) => CLASSROOMS.find((c) => c.id === id)!);
  return (
    <div className="mx-auto max-w-4xl"><PageHeader title="Attendance" subtitle="Mark each student, then submit. Absences notify parents." />
      <Card className="mb-4"><CardBody className="grid gap-3 sm:grid-cols-3">
        <Field label="Class" htmlFor="at-c"><Select id="at-c" value={classId} onChange={(e) => setClassId(e.target.value)}>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Date" htmlFor="at-d"><Input id="at-d" type="date" max="2026-11-19" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
        <Field label="Period" htmlFor="at-p"><Select id="at-p" value={period} onChange={(e) => setPeriod(e.target.value)}>{periodOpts.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select></Field>
      </CardBody></Card>
      {roster.isLoading || existing.isLoading ? <SkeletonCards n={5} h="h-14" /> : roster.isError || existing.isError ? <ErrorState onRetry={() => { roster.refetch(); existing.refetch(); }} /> : !students.length ? <EmptyState title="No students on this roster" body="This class's roster isn't synced in the prototype. Try Grade 8 · B." icon={<CheckSquare size={28} />} /> : (<>
        {locked && <div role="status" className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-success-soft p-3 text-sm text-success"><LockSimple size={18} />This register was submitted. It is read-only; ask for a correction if something is wrong.<Button size="sm" variant="outline" className="ml-auto" onClick={() => setCorr(true)}>Request correction</Button></div>}
        <div className="mb-3 flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" disabled={locked} onClick={() => { setMarks(Object.fromEntries(students.map((s) => [s.id, "P" as Mark]))); setEdited(true); }}>Mark all present</Button><Button size="sm" variant="ghost" disabled={locked} onClick={() => { setMarks({}); setEdited(true); }}>Clear</Button>
          <span aria-live="polite" className="ml-auto flex flex-wrap gap-1.5 text-xs">{(["P", "A", "L", "E"] as Mark[]).map((m) => <Badge key={m} className={cn("border", TONE[m])}>{LABEL[m]} {counts(m)}</Badge>)}<Badge>Unmarked {unmarked.length}</Badge></span></div>
        <Card><ul className="divide-y divide-border">{students.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 p-3"><Avatar name={s.name} color={s.color} size={34} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.name}</span>
            <div role="radiogroup" aria-label={`Attendance for ${s.name}`} className="flex gap-1">{(["P", "A", "L", "E"] as Mark[]).map((m) => <button key={m} role="radio" aria-checked={marks[s.id] === m} aria-label={LABEL[m]} disabled={locked} onClick={() => set(s.id, m)} className={cn("h-10 min-w-10 rounded-xl border px-2 text-sm font-bold disabled:opacity-60", marks[s.id] === m ? TONE[m] : "border-border text-text-2 hover:bg-surface-2")}>{m}</button>)}</div></li>))}</ul></Card>
        {!locked && <div className="sticky bottom-2 mt-4 flex flex-wrap justify-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-soft"><Button variant="outline" disabled={!edited} onClick={() => { drafts[key] = { ...marks }; setEdited(false); toast.success("Draft saved on this device"); }}><FloppyDisk size={16} />Save draft</Button><Button loading={submit.isPending} onClick={() => (unmarked.length ? toast.warning(`${unmarked.length} student(s) still unmarked`) : setConfirm(true))}><PaperPlaneRight size={16} />Submit attendance</Button></div>}
      </>)}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Submit attendance?" body={`${counts("P")} present, ${counts("A")} absent, ${counts("L")} late, ${counts("E")} excused. Parents of absent students will be notified.`} confirmLabel="Submit" onConfirm={() => submit.mutate()} />
      <Modal open={corr} onOpenChange={setCorr} title="Request a correction" description="A correction request goes to the school office. The submitted register stays as is until it is approved (demo)." footer={<><Button variant="ghost" onClick={() => setCorr(false)}>Cancel</Button><Button disabled={corrText.trim().length < 10} onClick={() => { toast.success("Correction request sent to the office"); setCorrText(""); setCorr(false); }}>Send request</Button></>}><Field label="What needs correcting?" required hint="At least 10 characters" htmlFor="corr"><Textarea id="corr" value={corrText} onChange={(e) => setCorrText(e.target.value)} /></Field></Modal>
    </div>
  );
}
