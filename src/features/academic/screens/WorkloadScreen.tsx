"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, PageHeader, Segmented, Select, Badge, SectionHeader, EmptyState, ErrorState, Skeleton, DemoTag } from "@/components/ui";
import type { ScreenProps } from "@/types/screens";
import type { TimetableEntry } from "@/types/academic";
import { staffAllocationService as svc } from "@/lib/api/staffAllocationService";
import { timetableService } from "@/lib/api/timetableService";
import { useActors } from "@/stores/app-store";
import { TEACHERS, teacherName } from "@/lib/mock-data/core";
import { Button } from "@/components/ui";
import { WorkloadPanel, GapList } from "../timetable/AllocationPanels";
import { StaffDetail } from "../timetable/StaffDetail";
import { SubstituteDialog } from "../timetable/SubstituteDialog";
import { subjName, className, tShort, DAYS, PERIODS } from "../timetable/common";
import { ReportsView } from "../timetable/ReportsView";

type Tab = "overview" | "staff" | "substitutes" | "reports";
export default function WorkloadScreen({ role }: ScreenProps) {
  const admin = role === "institution";
  const { teacherId } = useActors();
  const [tab, setTab] = React.useState<Tab>("overview");
  const [pick, setPick] = React.useState(teacherId);
  const [sub, setSub] = React.useState<TimetableEntry | null>(null);
  const by = admin ? "Timetable office" : teacherName(teacherId);

  if (!admin) return (
    <div>
      <PageHeader title="My workload" subtitle="Your weekly teaching load against your limit, your availability preferences and leave." eyebrow={<DemoTag />} />
      <StaffDetail teacherId={teacherId} canDecideLeave={false} by={by} />
    </div>
  );
  return (
    <div>
      <PageHeader title="Staff workload and availability" subtitle="Compare teaching load with each teacher's limit, spot imbalance, manage leave and assign substitutes." eyebrow={<DemoTag />} />
      <div className="mb-4"><Segmented<Tab> label="Workload sections" value={tab} onChange={setTab} options={[{ value: "overview", label: "Workload overview" }, { value: "staff", label: "Staff profiles" }, { value: "substitutes", label: "Substitutes" }, { value: "reports", label: "Reports" }]} /></div>
      {tab === "overview" && <Overview onPick={(id) => { setPick(id); setTab("staff"); }} />}
      {tab === "staff" && <div className="space-y-4"><div className="max-w-xs"><label className="sr-only" htmlFor="wl-teacher">Staff member</label><Select id="wl-teacher" value={pick} onChange={(e) => setPick(e.target.value)}>{TEACHERS.map((t) => <option key={t.id} value={t.id}>{t.title} {t.displayName} · {t.departmentName}{t.status === "on-leave" ? " (on leave)" : ""}</option>)}</Select></div><StaffDetail key={pick} teacherId={pick} canDecideLeave by={by} /></div>}
      {tab === "substitutes" && <Substitutes onAssign={setSub} />}
      {tab === "reports" && <ReportsView source="published" />}
      <SubstituteDialog entry={sub} open={!!sub} onOpenChange={(v) => !v && setSub(null)} by={by} />
    </div>
  );
}

function Overview({ onPick }: { onPick: (id: string) => void }) {
  const wl = useQuery({ queryKey: ["academic", "tt", "workload", "published"], queryFn: () => svc.workload("published") });
  const ws = useQuery({ queryKey: ["academic", "tt", "ws"], queryFn: svc.workspace });
  if (wl.isLoading) return <Skeleton className="h-72" />; if (wl.isError || !wl.data) return <ErrorState onRetry={() => wl.refetch()} />;
  const bySubject = new Map<string, number>(); ws.data?.gaps.forEach((g) => bySubject.set(g.subjectId, (bySubject.get(g.subjectId) ?? 0) + g.missing));
  return (
    <div className="space-y-6">
      <Card><CardBody><SectionHeader title="Teacher workload vs limit" subtitle="Published timetable. Red = above staff average or over limit; blue = below average." /><WorkloadPanel rows={wl.data} onPick={onPick} /></CardBody></Card>
      <Card><CardBody><SectionHeader title="Subject coverage gaps" subtitle="Required periods still missing a teacher in the draft" />
        {bySubject.size === 0 ? <EmptyState title="All subjects covered" body="Every required period has a teacher." /> : <div className="flex flex-wrap gap-2">{[...bySubject.entries()].map(([s, n]) => <Badge key={s} tone="warning">{subjName(s)}: {n} missing</Badge>)}</div>}
        {ws.data && ws.data.gaps.length > 0 && <div className="mt-3"><GapList gaps={ws.data.gaps} onAssign={() => { /* assignment happens in the Allocation workspace */ }} /><p className="mt-2 text-xs text-text-2">Assign these periods from the Allocation workspace.</p></div>}</CardBody></Card>
    </div>
  );
}

function Substitutes({ onAssign }: { onAssign: (e: TimetableEntry) => void }) {
  const c = useQuery({ queryKey: ["academic", "tt", "pubconf"], queryFn: timetableService.publishedConflicts });
  const all = useQuery({ queryKey: ["academic", "tt", "pub"], queryFn: timetableService.all });
  if (c.isLoading || all.isLoading) return <Skeleton className="h-40" />; if (c.isError || !all.data) return <ErrorState onRetry={() => c.refetch()} />;
  const need = (c.data ?? []).filter((x) => x.kind === "teacher-unavailable").flatMap((x) => x.entryIds).map((id) => all.data!.find((e) => e.id === id)).filter((e): e is TimetableEntry => !!e && !e.substituteTeacherId);
  const covered = all.data.filter((e) => e.substituteTeacherId);
  return (
    <div className="space-y-5">
      <section><SectionHeader title="Needs a substitute" subtitle="Periods where the assigned teacher is on approved leave or unavailable" />
        {need.length === 0 ? <EmptyState title="No uncovered periods" body="Every period affected by leave already has a substitute." /> : <ul className="space-y-2">{need.map((e) => <li key={e.id}><Card><CardBody className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm"><span className="font-semibold">{className(e.classId)} · {subjName(e.subjectId)}</span> · {DAYS.find((d) => d.n === e.dayOfWeek)?.label} {PERIODS.find((p) => p.id === e.periodId)?.label}<span className="block text-xs text-text-2">Regular teacher {tShort(e.teacherId)} is unavailable</span></span><Button size="sm" onClick={() => onAssign(e)}>Assign substitute</Button></CardBody></Card></li>)}</ul>}</section>
      <section><SectionHeader title="Covered" />
        {covered.length === 0 ? <p className="text-sm text-text-2">No substitutions yet.</p> : <ul className="space-y-1.5 text-sm">{covered.map((e) => <li key={e.id} className="rounded-lg bg-surface-2 p-2.5">{className(e.classId)} · {subjName(e.subjectId)} · {DAYS.find((d) => d.n === e.dayOfWeek)?.short} {PERIODS.find((p) => p.id === e.periodId)?.label}: {tShort(e.substituteTeacherId)} covers {tShort(e.teacherId)}</li>)}</ul>}</section>
    </div>
  );
}
