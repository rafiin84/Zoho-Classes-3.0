"use client";
import * as React from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { PageHeader, Card, Button, Badge, ListToolbar, NoResults, EmptyState, Select, DemoTag, Drawer } from "@/components/ui";
import { BarChart, LineChart, Donut } from "@/components/charts";
import { institutionService, metricsFor } from "@/lib/api/institutionService";
import { TEACHER_ACTIVITY, TREND, TREND_MONTHS, CLASS_ROWS } from "@/lib/mock-data/institution";
import type { ReportDef } from "@/types/institution";
import type { ScreenProps } from "@/types/screens";
import { useCtx, useQ, Q, DataTable, DemoNote, Panel, simulateExport } from "../kit";
import { BranchDrill } from "../components/BranchDrill";

export default function ReportsScreen(_: ScreenProps) {
  const { instName } = useCtx(); const defs = useQ(["report-defs"], () => institutionService.reportDefs());
  const [q, setQ] = React.useState(""); const [open, setOpen] = React.useState<ReportDef | null>(null);
  return (
    <div>
      <PageHeader title="Institutional report catalogue" subtitle={`${instName} · every report lists its filters, metrics, drill-down and export.`} actions={<DemoTag label="Demo reports" />} />
      {open ? <Report def={open} onBack={() => setOpen(null)} /> : (
        <Q q={defs} rows={4}>{(all) => {
          const rows = all.filter((r) => !q || `${r.title} ${r.group} ${r.desc}`.toLowerCase().includes(q.toLowerCase())); const groups = [...new Set(rows.map((r) => r.group))];
          return <div><ListToolbar query={q} onQuery={setQ} placeholder="Search reports" count={rows.length} onClear={() => setQ("")} />
            {!all.length ? <EmptyState title="No reports" body="Reports appear once data sources are connected." /> : !rows.length ? <NoResults query={q} onClear={() => setQ("")} /> : groups.map((g) => <section key={g} className="mb-6"><h2 className="mb-2 text-heading">{g}</h2><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.filter((r) => r.group === g).map((r) => <Card key={r.id} className="flex flex-col p-4"><h3 className="font-semibold">{r.title}</h3><p className="mt-1 flex-1 text-sm text-text-2">{r.desc}</p><p className="mt-2 text-xs text-text-2">Filters: {r.filters.join(", ")}</p><Button size="sm" className="mt-3 self-start" onClick={() => setOpen(r)}>Open report</Button></Card>)}</div></section>)}</div>; }}</Q>)}
    </div>
  );
}

function Report({ def, onBack }: { def: ReportDef; onBack: () => void }) {
  const { ctx, key } = useCtx(); const [range, setRange] = React.useState("This term"); const [grade, setGrade] = React.useState(""); const [drill, setDrill] = React.useState<{ id: string; name: string } | null>(null);
  const a = useQ(["report", def.id, ...key, range], () => institutionService.analytics(ctx));
  const jitter = range === "Last 30 days" ? -2 : range === "Last year" ? -4 : 0;
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft size={14} /> All reports</Button>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-heading">{def.title}</h2><p className="text-sm text-text-2">{def.desc}</p></div><div className="flex gap-2"><Badge tone="highlight">Demo report</Badge><Button variant="outline" onClick={() => simulateExport(def.title, "Reports")}>Export (demo)</Button></div></div>
      <div className="flex flex-wrap gap-2"><Select aria-label="Date range" className="w-auto" value={range} onChange={(e) => setRange(e.target.value)}>{["This term", "Last 30 days", "Last year"].map((r) => <option key={r}>{r}</option>)}</Select>{def.filters.includes("Grade") && <Select aria-label="Grade" className="w-auto" value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">All grades</option>{["5", "6", "7", "8", "9"].map((g) => <option key={g} value={g}>Grade {g}</option>)}</Select>}<Badge>Metrics: {def.metrics.join(" · ")}</Badge></div>
      <Q q={a} rows={2} h="h-56">{(d) => {
        const ms = d.metrics, nm = d.names;
        const bars = def.id === "rp-workload" ? TEACHER_ACTIVITY.filter((t) => t.load).map((t) => ({ label: t.name.split(" ").slice(1).join(" "), value: t.load })) : def.id === "rp-obe" ? [{ label: "CO1", value: 78 }, { label: "CO2", value: 71 }, { label: "CO3", value: 64 }, { label: "PO1", value: 69 }, { label: "PO2", value: 74 }] : def.id === "rp-fees" ? ms.map((m) => ({ label: nm[m.branchId], value: 70 + (m.engagement % 20) })) : def.id === "rp-ai" ? [{ label: "Euler", value: 18420 / 100 }, { label: "Newton", value: 9120 / 100 }, { label: "Gyan", value: 6240 / 100 }] : def.id === "rp-course" ? CLASS_ROWS.filter((c) => ms.some((m) => m.branchId === c.branchId)).map((c) => ({ label: c.name.replace("Grade ", "G"), value: c.completion })) : ms.map((m) => ({ label: nm[m.branchId], value: Math.max(0, (def.id === "rp-attend" ? m.attendance : def.id === "rp-engage" ? m.engagement : m.avgScore) + jitter) }));
        return (
          <div className="space-y-4">
            <Panel title="Chart">
              {def.chart === "line" ? <LineChart ariaLabel={def.title} labels={TREND_MONTHS} unit={def.unit} min={50} max={100} series={ms.map((m) => ({ name: nm[m.branchId], values: (d.trend[m.branchId] ?? TREND["br-north"]).map((v) => v + jitter) }))} />
                : def.chart === "donut" ? <Donut ariaLabel={def.title} data={[{ label: "Sports", value: 164 }, { label: "Arts", value: 121 }, { label: "Academic", value: 208 }, { label: "Clubs", value: 96 }]} centre="589" />
                : <BarChart horizontal ariaLabel={def.title} unit={def.unit.trim() === "%" ? "%" : def.unit} data={bars} onSelect={def.drill.includes("Branch") ? (x) => { const m = ms.find((y) => nm[y.branchId] === x.label); if (m) setDrill({ id: m.branchId, name: x.label }); } : undefined} />}
              <p className="mt-2 text-xs text-text-2">{def.drill.includes("Branch") ? "Select a bar to drill down: " : "Drill-down: "}{def.drill.join(" → ")}.</p></Panel>
            <Panel title="Table"><DataTable ariaLabel={`${def.title} table`} rows={bars} rowKey={(r) => r.label} pageSize={8} cols={[{ key: "l", header: "Group", cell: (r) => <b>{r.label}</b>, sort: (a, b) => a.label.localeCompare(b.label) }, { key: "v", header: def.metrics[0], cell: (r) => `${r.value}${def.unit}`, align: "right", sort: (a, b) => a.value - b.value }]} empty={<EmptyState title="No data for these filters" body="Widen the date range or clear filters." />} /></Panel>
            <DemoNote>Demo report: figures are illustrative. {def.group === "Fees & collections" && "Institutional fees only; paid-course sales are reported under Courses & Content."}</DemoNote>
          </div>); }}</Q>
      <Drawer open={!!drill} onOpenChange={(v) => !v && setDrill(null)} title={drill ? `${drill.name} · drill-down` : ""} width="sm:max-w-xl">{drill && <BranchDrill branchId={drill.id} branchName={drill.name} />}</Drawer>
    </div>
  );
}
