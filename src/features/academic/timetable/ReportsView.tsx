"use client";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, CardBody, SectionHeader, StatTile, ErrorState, SkeletonCards, EmptyState, Progress } from "@/components/ui";
import { staffAllocationService } from "@/lib/api/staffAllocationService";
import { relTime } from "@/lib/format";
import { tShort, className, csvDownload, subjName } from "./common";
import { toast } from "@/components/ui";

export function ReportsView({ source }: { source: "draft" | "published" }) {
  const q = useQuery({ queryKey: ["academic", "tt", "reports", source], queryFn: () => staffAllocationService.reports(source) });
  if (q.isLoading) return <SkeletonCards n={3} h="h-28" />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const r = q.data;
  const exp = () => { csvDownload("allocation-by-teacher.csv", [["Teacher", "Periods", "Classes", "Subjects"], ...r.byTeacher.map((t) => [tShort(t.teacherId), String(t.periods), String(t.classes), String(t.subjects)])]); toast.success("Spreadsheet export simulated: allocation-by-teacher.csv downloaded."); };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Unassigned periods" value={r.unassigned} hint="required, not yet allocated" />
        <StatTile label="Rule conflicts" value={r.conflictCount} hint="excluding unfulfilled periods" />
        <StatTile label="Substitutions" value={r.substitutes.length} />
        <StatTile label="Classes covered" value={`${r.coverage.filter((c) => c.fulfilledPct === 100).length}/${r.coverage.length}`} hint="fully allocated" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardBody><SectionHeader title="Allocation by teacher" action={<Button size="sm" variant="outline" onClick={exp}>Export CSV</Button>} />
          <table className="w-full text-sm"><thead className="text-left text-xs text-text-2"><tr><th className="py-1">Teacher</th><th className="text-right">Periods</th><th className="text-right">Classes</th><th className="text-right">Subjects</th></tr></thead>
            <tbody>{r.byTeacher.map((t) => <tr key={t.teacherId} className="border-t border-border"><td className="py-1.5">{tShort(t.teacherId)}</td><td className="tnum text-right">{t.periods}</td><td className="tnum text-right">{t.classes}</td><td className="tnum text-right">{t.subjects}</td></tr>)}</tbody></table></CardBody></Card>
        <Card><CardBody><SectionHeader title="Class coverage" subtitle="Required periods that have a teacher" />
          <ul className="space-y-3">{r.coverage.map((c) => <li key={c.classId}><div className="mb-1 flex justify-between text-sm"><span>{className(c.classId)}</span><span className="tnum text-text-2">{c.assigned}/{c.required} · {c.fulfilledPct}%</span></div><Progress value={c.fulfilledPct} tone={c.fulfilledPct === 100 ? "success" : "warning"} label={`${className(c.classId)} coverage`} /></li>)}</ul></CardBody></Card>
        <Card><CardBody><SectionHeader title="Room and lab utilisation" subtitle="Share of 30 weekly teaching slots in use" />
          <ul className="space-y-3">{r.rooms.map((m) => <li key={m.roomId}><div className="mb-1 flex justify-between text-sm"><span>{m.name}</span><span className="tnum text-text-2">{m.used}/{m.capacity} · {m.pct}%</span></div><Progress value={m.pct} size="sm" label={`${m.name} utilisation`} /></li>)}</ul></CardBody></Card>
        <Card><CardBody><SectionHeader title="Substitutes" />
          {r.substitutes.length === 0 ? <EmptyState title="No substitutions" body="Periods covered by a substitute appear here after you assign one from a timetable or the Workload screen." /> : <ul className="space-y-2 text-sm">{r.substitutes.map((s) => <li key={s.entryId} className="rounded-lg bg-surface-2 p-2">{s.label}<span className="block text-xs text-text-2">Covered by {tShort(s.substituteId)}</span></li>)}</ul>}</CardBody></Card>
      </div>
      <Card><CardBody><SectionHeader title="Change history" subtitle="Every assignment, override, approval and publication" />
        <ul className="divide-y divide-border">{r.history.map((h) => <li key={h.id} className="py-2 text-sm"><p><span className="font-semibold capitalize">{h.action.replace("-", " ")}</span> · {h.detail}</p><p className="text-xs text-text-2">{h.by} · {relTime(h.at)}{h.reason && ` · Reason: ${h.reason}`}</p></li>)}</ul></CardBody></Card>
    </div>
  );
}
export { subjName };
