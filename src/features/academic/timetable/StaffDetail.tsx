"use client";
import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Card, CardBody, Field, Input, Textarea, Badge, StatusBadge, SectionHeader, StatTile, Skeleton, ErrorState, EmptyState, toast } from "@/components/ui";
import { BarChart } from "@/components/charts";
import type { TimetableEntry } from "@/types/academic";
import { staffAllocationService as svc } from "@/lib/api/staffAllocationService";
import { timetableService } from "@/lib/api/timetableService";
import { TEACHERS, teacherName } from "@/lib/mock-data/core";
import { WeekGrid, useInvalidateTT, subjName, className, roomName, DAYS, PERIODS } from "./common";

const leaveSchema = z.object({ from: z.string().min(1, "Choose a start date."), to: z.string().min(1, "Choose an end date."), reason: z.string().trim().min(4, "Add a short reason.") }).refine((v) => !v.from || !v.to || v.to >= v.from, { path: ["to"], message: "End date cannot be before the start date." });

export function StaffDetail({ teacherId, canDecideLeave, by }: { teacherId: string; canDecideLeave: boolean; by: string }) {
  const inv = useInvalidateTT(); const t = TEACHERS.find((x) => x.id === teacherId)!;
  const prof = useQuery({ queryKey: ["academic", "tt", "profiles"], queryFn: svc.profiles });
  const mine = useQuery({ queryKey: ["academic", "tt", "forTeacher", teacherId], queryFn: () => timetableService.forTeacher(teacherId) });
  const wl = useQuery({ queryKey: ["academic", "tt", "workload", "published"], queryFn: () => svc.workload("published") });
  const p = prof.data?.find((x) => x.teacherId === teacherId); const w = wl.data?.find((x) => x.teacherId === teacherId);
  const toggle = useMutation({ mutationFn: (x: { d: number; p: string; k: "blocked" | "preferred" | null }) => svc.setAvailability(teacherId, x.d, x.p, x.k, by), onSuccess: inv, onError: (e: Error) => toast.error(e.message) });
  const decide = useMutation({ mutationFn: (x: { id: string; s: "approved" | "rejected" }) => svc.decideLeave(x.id, x.s, by), onSuccess: () => { toast.success("Leave updated."); inv(); }, onError: (e: Error) => toast.error(e.message) });
  const f = useForm<z.infer<typeof leaveSchema>>({ resolver: zodResolver(leaveSchema), defaultValues: { from: "", to: "", reason: "" } });
  const req = useMutation({ mutationFn: (v: z.infer<typeof leaveSchema>) => svc.requestLeave(teacherId, v, by, canDecideLeave), onSuccess: () => { toast.success(canDecideLeave ? "Leave recorded as approved." : "Leave request sent to the timetable office."); f.reset(); inv(); }, onError: (e: Error) => toast.error(e.message) });
  if (prof.isLoading || mine.isLoading) return <Skeleton className="h-64" />;
  if (prof.isError || !p) return <ErrorState onRetry={() => prof.refetch()} />;
  const kindAt = (d: number, pid: string) => p.slots.find((s) => s.dayOfWeek === d && s.periodId === pid)?.kind ?? null;
  const next = (k: "blocked" | "preferred" | null) => (k === null ? "blocked" : k === "blocked" ? "preferred" : null);
  const entriesAt = (d: number, pid: string): TimetableEntry[] => (mine.data ?? []).filter((e) => e.dayOfWeek === d && e.periodId === pid);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Periods / week" value={w ? `${w.periods}` : "…"} hint={`limit ${t.workloadLimit}`} />
        <StatTile label="Load" value={w ? `${w.pct}%` : "…"} hint={w?.flag === "over" ? "above staff average" : w?.flag === "under" ? "below staff average" : "balanced"} />
        <StatTile label="Classes" value={w?.classCount ?? "…"} />
        <StatTile label="Substitutions covered" value={w?.substitutions ?? "…"} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardBody><SectionHeader title="Periods per day" />{w && <BarChart ariaLabel={`${t.displayName} periods per day`} data={DAYS.map((d, i) => ({ label: d.short, value: w.byDay[i] }))} height={140} />}
          <p className="mt-2 text-xs text-text-2">{t.departmentName} · {t.subjectIds.map(subjName).join(", ")} · {p.note ?? "No staff note."}</p></CardBody></Card>
        <Card><CardBody><SectionHeader title="Assigned periods" subtitle="Published timetable" />
          {!mine.data?.length ? <EmptyState title="No assigned periods" body="No periods are assigned in the published timetable yet." /> : <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">{mine.data.slice().sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.periodId.localeCompare(b.periodId)).map((e) => <li key={e.id} className="flex justify-between gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5"><span>{DAYS.find((d) => d.n === e.dayOfWeek)?.short} {PERIODS.find((x) => x.id === e.periodId)?.label}</span><span className="truncate text-text-2">{className(e.classId)} · {subjName(e.subjectId)} · {roomName(e.roomId)}{e.substituteTeacherId === teacherId ? " · substitute" : ""}</span></li>)}</ul>}</CardBody></Card>
      </div>
      <section>
        <SectionHeader title="Availability" subtitle="Select a free slot to cycle: Free → Blocked → Preferred. Blocked slots raise a conflict when allocated; preferred slots guide suggestions." />
        <WeekGrid ariaLabel={`${t.displayName} availability`} compact renderCell={(d, pid) => {
          const k = kindAt(d, pid), es = entriesAt(d, pid);
          return <>{es.map((e) => <p key={e.id} className="rounded bg-lilac px-1.5 py-0.5 text-[11px] font-medium">{className(e.classId)} {subjName(e.subjectId)}</p>)}
            <button type="button" onClick={() => toggle.mutate({ d, p: pid, k: next(k) })} aria-label={`${DAYS.find((x) => x.n === d)?.label} ${pid}: ${k ?? "free"}. Activate to change.`} className={`w-full rounded-md border px-1.5 py-1 text-[11px] font-semibold ${k === "blocked" ? "border-danger bg-danger-soft text-danger" : k === "preferred" ? "border-info bg-info-soft text-info" : "border-border text-text-2 hover:border-primary"}`}>{k === "blocked" ? "Blocked" : k === "preferred" ? "Preferred" : "Free"}</button></>;
        }} />
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardBody><SectionHeader title={canDecideLeave ? "Record or review leave" : "Request leave"} />
          <form onSubmit={f.handleSubmit((v) => req.mutate(v))} className="grid gap-3 sm:grid-cols-2" noValidate>
            <Field label="From" htmlFor="lv-from" error={f.formState.errors.from?.message} required><Input id="lv-from" type="date" {...f.register("from")} /></Field>
            <Field label="To" htmlFor="lv-to" error={f.formState.errors.to?.message} required><Input id="lv-to" type="date" {...f.register("to")} /></Field>
            <Field label="Reason" htmlFor="lv-reason" error={f.formState.errors.reason?.message} required className="sm:col-span-2"><Textarea id="lv-reason" {...f.register("reason")} className="min-h-16" /></Field>
            <div className="sm:col-span-2"><Button type="submit" size="sm" loading={req.isPending}>{canDecideLeave ? "Record approved leave" : "Send request"}</Button></div>
          </form></CardBody></Card>
        <Card><CardBody><SectionHeader title="Leave" />
          {p.leaves.length === 0 ? <EmptyState title="No leave on record" body="Approved leave marks the teacher unavailable in conflict checks and creates substitution needs." /> : <ul className="space-y-2 text-sm">{p.leaves.map((l) => <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-2 p-2.5"><span><span className="tnum font-semibold">{l.from}{l.to !== l.from ? ` → ${l.to}` : ""}</span><span className="block text-xs text-text-2">{l.reason}</span></span><span className="flex items-center gap-2"><StatusBadge status={l.status === "requested" ? "Pending" : l.status} />{canDecideLeave && l.status === "requested" && <><Button size="sm" variant="soft" onClick={() => decide.mutate({ id: l.id, s: "approved" })}>Approve</Button><Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: l.id, s: "rejected" })}>Reject</Button></>}</span></li>)}</ul>}</CardBody></Card>
      </div>
      <p className="text-xs text-text-2">{teacherName(teacherId)} · {t.employeeCode} · availability and leave feed the deterministic conflict rules. Demo data.</p>
    </div>
  );
}
export { Badge };
