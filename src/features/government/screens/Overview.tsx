"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge, PageHeader, StatTile, Segmented, Button, Skeleton, StatusBadge, EmptyState } from "@/components/ui";
import { BarChart, Heatmap, LineChart, StackedBar } from "@/components/charts";
import { Warning, Info, Sparkle, ArrowRight } from "@phosphor-icons/react";
import type { ScreenProps } from "@/types/screens";
import type { MetricKey } from "@/types/government";
import { governmentService, METRICS } from "@/lib/api/governmentService";
import { programmeService } from "@/lib/api/programmeService";
import { SRC, DEMO_NOTE } from "@/lib/mock-data/government";
import { fmtCompact } from "@/lib/format";
import { Async, DemoBanner, Panel, Src, G, useLowBaseline } from "../components/shared";
import { DistrictMap, DistrictSummary, DrillDown, CompareMode } from "../components/Explorer";
import { AIBadge } from "@/components/ui";

export default function Overview(_: ScreenProps) {
  const low = useLowBaseline();
  const q = useQuery({ queryKey: ["gov", "overview", low], queryFn: () => governmentService.overview(low) });
  const prog = useQuery({ queryKey: ["gov", "programmes"], queryFn: () => programmeService.list() });
  const insts = useQuery({ queryKey: ["gov", "all-institutions"], queryFn: () => governmentService.allInstitutions() });
  const [metric, setMetric] = React.useState<MetricKey>("baselineCoverage");
  const [view, setView] = React.useState<"map" | "list">("map");
  const [sel, setSel] = React.useState<string | undefined>();
  const [tab, setTab] = React.useState<"drill" | "compare">("drill");
  const [region, setRegion] = React.useState("all");

  return (
    <div>
      <PageHeader eyebrow={<Badge tone="highlight">Demo data · Karuvana State</Badge>} title="State Command Centre" subtitle="Scale, geography, progress and evidence for the State-wide Continuous Learning Improvement System." />
      <DemoBanner extra="Scale figures (62 lakh students, 3.5 lakh teachers, 38,000 institutions) are illustrative demo values." />
      <Async q={q} skeleton={<div className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-96" /></div>}>
        {(o) => {
          const h = o.headline;
          const visible = o.districts.filter((d) => region === "all" || d.region === region);
          const sel_d = o.districts.find((d) => d.id === sel);
          const regions = Array.from(new Set(o.districts.map((d) => d.region)));
          return (
            <div className="space-y-5">
              {low && (
                <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
                  <Warning size={22} weight="fill" className="text-danger" />
                  <div className="min-w-0 flex-1"><strong>Nilgiri Hills baseline coverage is 41%.</strong> Below the 60% reliability threshold; improvement there cannot be measured yet.</div>
                  <Button size="sm" variant="outline" onClick={() => { setMetric("baselineCoverage"); setSel("nilgiri-hills"); }}>Show on map</Button>
                </div>
              )}
              <section aria-label="Headline metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                <StatTile label="Students" value={`${(h.students / 100000).toFixed(0)} lakh`} hint="Demo scale" />
                <StatTile label="Teachers" value={`${(h.teachers / 100000).toFixed(1)} lakh`} hint="Demo scale" />
                <StatTile label="Institutions" value={h.institutions.toLocaleString("en-IN")} hint="Demo scale" />
                <StatTile label="Baseline coverage" value={`${h.baselineCoverage}%`} hint="of enrolled students" delta={low ? { value: "Nilgiri Hills 41%", good: false } : undefined} />
                <StatTile label="Programme participation" value={`${h.participation}%`} hint="Mission Maths Mastery" />
                <StatTile label="Learning improvement" value={`+${h.improvement} pts`} hint="vs original baseline" delta={{ value: "follow-up 1", up: true }} />
              </section>
              <Src text={`${SRC.scale}. Coverage: ${SRC.baseline.replace("Source: ", "")}. Participation: ${SRC.programmes.replace("Source: ", "")}. ${DEMO_NOTE}.`} className="-mt-3" />

              <div className="grid gap-5 xl:grid-cols-5">
                <Panel className="xl:col-span-3" title="District map" subtitle="Click a district to inspect it. Metric toggle changes colour." src={metric === "engagement" ? SRC.engagement : metric === "improvement" || metric === "mathsProficiency" ? SRC.followUp : SRC.baseline}
                  actions={<Segmented<"map" | "list"> label="Map view" value={view} onChange={setView} options={[{ value: "map", label: "Map" }, { value: "list", label: "List" }]} />}>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Segmented<MetricKey> label="Map metric" value={metric} onChange={setMetric} options={METRICS.map((m) => ({ value: m.key, label: m.label }))} />
                    <label className="sr-only" htmlFor="region-filter">Region</label>
                    <select id="region-filter" value={region} onChange={(e) => setRegion(e.target.value)} className="h-9 rounded-full border border-border bg-surface px-3 text-sm"><option value="all">All regions</option>{regions.map((r) => <option key={r}>{r}</option>)}</select>
                  </div>
                  <DistrictMap districts={visible} metric={metric} selected={sel} onSelect={setSel} view={view} />
                </Panel>
                <div className="space-y-5 xl:col-span-2">
                  {sel_d ? <DistrictSummary d={sel_d} /> : <EmptyState title="No district selected" body="Select a district on the map or list to see its scale, coverage, proficiency and engagement." />}
                  <Panel title="Baseline completion" subtitle="Students by baseline state" src={SRC.baseline}>
                    <StackedBar ariaLabel="Baseline completion" segments={[{ label: "Complete", value: o.baselineBreakdown.complete, color: "var(--success)" }, { label: "In progress", value: o.baselineBreakdown.inProgress, color: "var(--warning)" }, { label: "Not started", value: o.baselineBreakdown.notStarted, color: "var(--danger)" }]} />
                    <p className="mt-2 text-xs text-text-2">Percent of enrolled students. Baseline is mandatory at first student login and is never overwritten by follow-ups.</p>
                  </Panel>
                </div>
              </div>

              <Panel title="Explore and compare" subtitle="Permission-aware drill-down, or compare two districts or periods." actions={<Segmented<"drill" | "compare"> label="Explore mode" value={tab} onChange={setTab} options={[{ value: "drill", label: "Drill down" }, { value: "compare", label: "Compare" }]} />}>
                {tab === "drill" ? <DrillDown districts={o.districts} low={low} initialDistrict={undefined} /> : <CompareMode districts={o.districts} />}
              </Panel>

              <div className="grid gap-5 lg:grid-cols-2">
                <Panel title="Follow-up improvement vs original baseline" subtitle="State maths proficiency (%)" src={SRC.followUp}>
                  <LineChart ariaLabel="State maths proficiency: original baseline vs follow-up" labels={o.trend.labels.map((l) => l.split(" (")[0])} unit="%" min={50} max={66} series={[{ name: "Original baseline (locked)", values: o.trend.baseline, dashed: true, color: "#9A93F5" }, { name: "Follow-up", values: o.trend.followUp }]} />
                </Panel>
                <Panel title="Subject and grade gaps" subtitle="% of assessed students below proficiency (higher = larger gap)" src={SRC.baseline}>
                  <Heatmap ariaLabel="Gap percent by grade and subject" rows={o.subjectGrade.grades} cols={o.subjectGrade.subjects.map((s) => s.slice(0, 4))} colTitle={(i) => o.subjectGrade.subjects[i]} values={o.subjectGrade.values} max={60} />
                  <p className="mt-1 text-xs text-text-2">Columns: Math, Scie, Engl, Soci, Hind, Comp. Numbers are percentages.</p>
                </Panel>
                <Panel title="Institution participation" subtitle="Baseline coverage, lowest 8 institutions" src={SRC.baseline} actions={<Button asChild size="sm" variant="ghost"><Link href={G("districts")}>All districts <ArrowRight size={14} /></Link></Button>}>
                  <Async q={insts} skeleton={<Skeleton className="h-48" />}>{(all) => <BarChart horizontal ariaLabel="Lowest institution baseline coverage" unit="%" max={100} data={[...all].sort((a, b) => a.baselineCoverage - b.baselineCoverage).slice(0, 8).map((i) => ({ label: i.name, value: i.baselineCoverage, color: i.baselineCoverage < 60 ? "var(--danger)" : "var(--primary)" }))} />}</Async>
                </Panel>
                <Panel title="Content distribution and consumption" subtitle="Actions by students, last 30 days" src={SRC.content} actions={<Button asChild size="sm" variant="ghost"><Link href={G("distribution")}>Distribution <ArrowRight size={14} /></Link></Button>}>
                  <BarChart horizontal ariaLabel="Consumption" data={o.consumption.map((c) => ({ label: c.label, value: Math.round(c.value / 1000) }))} unit="k" />
                  <p className="mt-2 text-xs text-text-2">Thousands (k), demo scale ({fmtCompact(o.consumption.reduce((a, c) => a + c.value, 0))} total actions).</p>
                </Panel>
              </div>

              <Panel title="Remedial programme status" src={SRC.programmes} actions={<Button asChild size="sm" variant="ghost"><Link href={G("programmes")}>All programmes <ArrowRight size={14} /></Link></Button>}>
                <Async q={prog} skeleton={<Skeleton className="h-24" />}>{(ps) => ps.length === 0 ? <EmptyState title="No programme created" body="Create a learning programme to start tracking distribution and participation." action={{ label: "Create programme", href: G("programmes/new") }} /> : (
                  <ul className="divide-y divide-border">{ps.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5"><Link href={G(`programmes/${p.id}`)} className="min-w-0 flex-1 font-semibold text-primary hover:underline">{p.name}</Link><StatusBadge status={p.status} label={p.status.replace("-", " ")} /><span className="tnum text-xs text-text-2">Participation {p.delivery.participationPct}% · Completion {p.delivery.completionPct}%</span></li>))}</ul>)}</Async>
              </Panel>

              <div className="grid gap-5 lg:grid-cols-2">
                <Panel title="Alerts" src={`Sources vary per alert · as of ${h.asOf}`}>
                  <ul className="space-y-2">{o.alerts.map((a) => (
                    <li key={a.id} className="rounded-xl border border-border p-3"><div className="flex items-start gap-2"><Badge tone={a.tone === "danger" ? "danger" : a.tone === "warning" ? "warning" : "info"} icon={a.tone === "info" ? <Info size={12} /> : <Warning size={12} />}>{a.tone === "danger" ? "Urgent" : a.tone === "warning" ? "Watch" : "Info"}</Badge><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{a.title}</p><p className="text-sm text-text-2">{a.body}</p><Src text={a.source} />{a.href && <Link href={a.href} className="mt-1 inline-block text-sm font-semibold text-primary hover:underline">Open</Link>}</div></div></li>))}</ul>
                </Panel>
                <Panel title="AI recommendations" subtitle="Suggestions for officials. Nothing is executed without approval." actions={<AIBadge />}>
                  <ul className="space-y-2">{o.recommendations.map((r) => (
                    <li key={r.id} className="rounded-xl bg-lilac/50 p-3"><p className="flex items-center gap-1.5 text-sm font-semibold"><Sparkle size={14} className="text-primary" weight="fill" />{r.title}</p><p className="mt-0.5 text-sm text-text-2">{r.body}</p><p className="mt-1 text-xs text-text-2">Basis: {r.basis}</p><Button asChild size="sm" variant="soft" className="mt-2"><Link href={r.cta.href}>{r.cta.label}</Link></Button></li>))}</ul>
                </Panel>
              </div>
            </div>
          );
        }}
      </Async>
    </div>
  );
}
