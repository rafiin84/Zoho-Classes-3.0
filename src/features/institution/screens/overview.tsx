"use client";
import * as React from "react";
import Link from "next/link";
import { Users, Chalkboard, ChartLineUp, CheckSquare, BookBookmark, Target, Lifebuoy, Robot, Lightning, Trophy, Warning } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader, StatTile, SectionHeader, Drawer, Badge, AIBadge, DemoTag, Button, Card, toast, EmptyState } from "@/components/ui";
import { LineChart, BarChart } from "@/components/charts";
import { institutionService } from "@/lib/api/institutionService";
import { eventService } from "@/lib/api/eventService";
import { governanceService } from "@/lib/api/governanceService";
import { fmtCompact, fmtDate } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { useCtx, useQ, Q, DataTable, SevBadge, Panel, ACTOR } from "../kit";
import { BranchDrill } from "../components/BranchDrill";
import { InterventionDialog, type InterventionSeed } from "../components/InterventionDialog";

type Metric = "engagement" | "attendance" | "completion" | "avgScore" | "support" | "aiUsage" | "interventions";
const META: Record<Metric, { label: string; unit: string }> = { engagement: { label: "Engagement", unit: "%" }, attendance: { label: "Attendance", unit: "%" }, completion: { label: "Course completion", unit: "%" }, avgScore: { label: "Academic performance (avg score)", unit: "%" }, support: { label: "Students needing support", unit: "" }, aiUsage: { label: "AI Teacher sessions", unit: "" }, interventions: { label: "Active interventions", unit: "" } };

export default function OverviewScreen(_: ScreenProps) {
  const { ctx, key, instName } = useCtx();
  const qc = useQueryClient();
  const q = useQ(["overview", ...key], () => institutionService.overview(ctx));
  const events = useQ(["events"], () => eventService.list());
  const [drill, setDrill] = React.useState<{ metric?: Metric; branchId?: string; branchName?: string } | null>(null);
  const [interv, setInterv] = React.useState<InterventionSeed | null>(null);

  return (
    <div>
      <PageHeader title="Institution overview" subtitle={`${instName} · ${ctx.branch === "all" ? "All branches" : "Selected branch"} · academic year ${ctx.year === "ay-2026-27" ? "2026–27" : "2025–26"}`} actions={<DemoTag label="Demo data" />} />
      <Q q={q} rows={4}>{(d) => (
        <div className="space-y-6">
          {d.alerts.length > 0 && (
            <section aria-label="Alerts" className="space-y-2">
              {d.alerts.map((a) => (
                <div key={a.id} role="alert" className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm ${a.tone === "danger" ? "border-danger/30 bg-danger-soft" : "border-warning/30 bg-warning-soft"}`}>
                  <span className="flex items-center gap-2"><Warning size={18} weight="fill" className={a.tone === "danger" ? "text-danger" : "text-warning"} />{a.text}</span>
                  {a.branchId ? <Button size="sm" variant="outline" onClick={() => setDrill({ branchId: a.branchId, branchName: d.branchNames[a.branchId] ?? a.branchId })}>Investigate</Button> : <Button size="sm" variant="outline" asChild><Link href="/institution/governance">Open approvals</Link></Button>}
                </div>))}
            </section>)}

          <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { m: null, node: <StatTile label="Students" value={fmtCompact(d.students)} icon={<Users size={20} />} hint={`${d.teachers} teachers`} /> },
              { m: "engagement" as Metric, node: <StatTile label="Engagement" value={`${d.avg.engagement}%`} icon={<ChartLineUp size={20} />} delta={{ value: `${Math.abs(d.engagementDelta)}% this month`, up: d.engagementDelta >= 0, good: d.engagementDelta >= 0 }} /> },
              { m: "attendance" as Metric, node: <StatTile label="Attendance" value={`${d.avg.attendance}%`} icon={<CheckSquare size={20} />} hint="Last 30 days" /> },
              { m: "completion" as Metric, node: <StatTile label="Course completion" value={`${d.avg.completion}%`} icon={<BookBookmark size={20} />} hint="Enrolled courses" /> },
              { m: "avgScore" as Metric, node: <StatTile label="Academic performance" value={`${d.avg.score}%`} icon={<Target size={20} />} hint="Average score, this term" /> },
              { m: "support" as Metric, node: <StatTile label="Needing support" value={d.support} icon={<Lifebuoy size={20} />} hint="Flagged by mastery signals" /> },
              { m: "aiUsage" as Metric, node: <StatTile label="AI Teacher sessions" value={fmtCompact(d.aiUsage)} icon={<Robot size={20} />} hint="This term · approved AI Teachers" /> },
              { m: "interventions" as Metric, node: <StatTile label="Interventions" value={d.interventions} icon={<Lightning size={20} />} hint="Active" /> },
            ].map((t, i) => t.m ? <button key={i} type="button" className="rounded-[1.25rem] text-left transition-shadow hover:shadow-glow focus-visible:outline-2" aria-label={`${META[t.m].label}: open breakdown`} onClick={() => setDrill({ metric: t.m! })}>{t.node}</button> : <div key={i}>{t.node}</div>)}
          </section>

          <div className="grid gap-4 lg:grid-cols-5">
            <Panel title="Engagement trend by branch (Jun–Nov)" className="lg:col-span-3">
              <LineChart ariaLabel="Engagement by branch" labels={d.months} unit="%" min={50} max={90} series={Object.entries(d.trend).map(([name, values]) => ({ name, values }))} />
            </Panel>
            <Panel title="Branch overview" className="lg:col-span-2">
              <DataTable ariaLabel="Branches" rows={d.metrics} rowKey={(m) => m.branchId} onRowClick={(m) => setDrill({ branchId: m.branchId, branchName: d.branchNames[m.branchId] })} pageSize={5} cols={[
                { key: "b", header: "Branch", cell: (m) => <span className="font-semibold">{d.branchNames[m.branchId]}</span> },
                { key: "e", header: "Engagement", cell: (m) => <SevBadge v={m.engagement} />, sort: (a, b) => a.engagement - b.engagement },
                { key: "s", header: "Score", cell: (m) => <SevBadge v={m.avgScore} /> },
              ]} />
              <p className="mt-2 text-xs text-text-2">Select a branch to drill into classes and subject gaps.</p>
            </Panel>
          </div>

          <section aria-label="AI recommendations">
            <SectionHeader title="AI recommendations" subtitle="Suggestions only — nothing happens until a person approves." action={<AIBadge />} />
            <div className="grid gap-3 md:grid-cols-2">
              {d.recs.map((r) => (
                <Card key={r.id} className="p-4">
                  <p className="text-sm font-medium">{r.text}</p>
                  <p className="mt-2 text-xs text-text-2"><strong>Basis:</strong> {r.based}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2"><Badge tone="neutral">Confidence: {r.confidence}</Badge>
                    <Button size="sm" onClick={() => setInterv({ branchId: ctx.branch === "all" ? "br-lakeside" : ctx.branch, branchName: d.branchNames[ctx.branch === "all" ? "br-lakeside" : ctx.branch] ?? "Branch", title: r.text.slice(0, 80) })}>Review as intervention</Button>
                    <Button size="sm" variant="ghost" onClick={() => toast.info("Dismissed for this session (demo).")}>Dismiss</Button></div>
                </Card>))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Events & competitions" action={<Button size="sm" variant="ghost" asChild><Link href="/institution/communication">Manage</Link></Button>}>
              <Q q={events} rows={2} h="h-16">{(ev) => ev.length === 0 ? <EmptyState icon={<Trophy size={26} />} title="No events yet" body="Create an event from Communication & Events." /> : (
                <ul className="divide-y divide-border">{ev.slice(0, 4).map((e) => <li key={e.id} className="flex items-center justify-between gap-2 py-2 text-sm"><span className="min-w-0"><span className="block truncate font-semibold">{e.title}</span><span className="text-xs text-text-2">{fmtDate(e.startAt)} · {e.registered}/{e.capacity} registered</span></span><Badge tone="primary">{e.status.replace(/-/g, " ")}</Badge></li>)}</ul>)}</Q>
            </Panel>
            <Panel title="Students needing support by branch"><BarChart ariaLabel="Students needing support" horizontal data={d.metrics.map((m) => ({ label: d.branchNames[m.branchId], value: m.support }))} onSelect={(x) => { const m = d.metrics.find((y) => d.branchNames[y.branchId] === x.label); if (m) setDrill({ branchId: m.branchId, branchName: x.label }); }} /></Panel>
          </div>
        </div>)}
      </Q>

      <Drawer open={!!drill} onOpenChange={(v) => !v && setDrill(null)} title={drill?.branchId ? `${drill.branchName} · drill-down` : drill?.metric ? META[drill.metric].label : ""} width="sm:max-w-xl">
        {drill?.metric && !drill.branchId && q.data && (
          <div className="space-y-4">
            <BarChart horizontal ariaLabel={META[drill.metric].label} unit={META[drill.metric].unit} data={q.data.metrics.map((m) => ({ label: q.data!.branchNames[m.branchId], value: m[drill.metric!] as number }))} onSelect={(x) => { const m = q.data!.metrics.find((y) => q.data!.branchNames[y.branchId] === x.label)!; setDrill({ branchId: m.branchId, branchName: x.label }); }} />
            <p className="text-xs text-text-2">Select a bar to open that branch. Definitions: engagement = weighted activity, streak and participation index; support = students flagged by mastery below threshold.</p>
          </div>)}
        {drill?.branchId && <BranchDrill branchId={drill.branchId} branchName={drill.branchName ?? ""} onIntervene={(s) => { setInterv({ ...s, title: `Support plan for ${s.className ?? s.branchName}` }); }} />}
      </Drawer>
      <InterventionDialog seed={interv} onClose={() => setInterv(null)} onDone={() => { qc.invalidateQueries({ queryKey: ["inst", "approvals"] }); }} />
    </div>
  );
}
