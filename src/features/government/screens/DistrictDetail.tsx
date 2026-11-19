"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge, EmptyState, PageHeader, Skeleton, StatTile, StatusBadge, ErrorState, Button } from "@/components/ui";
import { BarChart } from "@/components/charts";
import type { ScreenProps } from "@/types/screens";
import { governmentService } from "@/lib/api/governmentService";
import { programmeService } from "@/lib/api/programmeService";
import { SRC } from "@/lib/mock-data/government";
import { fmtCompact } from "@/lib/format";
import { Async, Crumbs, DemoBanner, Panel, Src, G, StudentGate, useLowBaseline } from "../components/shared";
import { DrillDown, CompareMode, RequestAccessModal } from "../components/Explorer";

export default function DistrictDetail({ params }: ScreenProps) {
  const low = useLowBaseline(); const id = params.id;
  const dq = useQuery({ queryKey: ["gov", "districts", low], queryFn: () => governmentService.districts(low) });
  const iq = useQuery({ queryKey: ["gov", "institutions", id], queryFn: () => governmentService.institutions(id) });
  const gq = useQuery({ queryKey: ["gov", "grades", id], queryFn: () => governmentService.grades("district", id) });
  const oq = useQuery({ queryKey: ["gov", "district-objectives", id], queryFn: () => governmentService.objectives(id, 55) });
  const pq = useQuery({ queryKey: ["gov", "programmes"], queryFn: () => programmeService.list() });
  const [ask, setAsk] = React.useState(false);
  if (dq.isLoading) return <div className="space-y-3"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>;
  if (dq.isError) return <ErrorState onRetry={() => dq.refetch()} />;
  const d = dq.data?.find((x) => x.id === id);
  if (!d) return <EmptyState title="District not found" body="Choose a district from the list." action={{ label: "All districts", href: G("districts") }} />;
  return (
    <div>
      <Crumbs items={[{ label: "Karuvana State", href: G("overview") }, { label: "Districts", href: G("districts") }, { label: d.name }]} />
      <PageHeader title={d.name} eyebrow={<div className="flex gap-2"><Badge tone="neutral">{d.region}</Badge>{d.dataStatus === "partial" && <Badge tone="warning">Partial data ({d.completeness}%)</Badge>}<Badge tone="highlight">Demo data</Badge></div>} subtitle={`${fmtCompact(d.students)} students · ${d.institutions.toLocaleString("en-IN")} institutions (demo scale)`} />
      <DemoBanner />
      {d.dataStatus === "partial" && <div role="status" className="mb-4 rounded-xl bg-warning-soft p-3 text-sm"><strong>Partial data.</strong> Some institutions have not reported. Rankings and improvement figures for this district are less reliable. {d.baselineCoverage < 45 && "Baseline coverage is below 45%."}</div>}
      <section className="mb-2 grid grid-cols-2 gap-3 lg:grid-cols-4"><StatTile label="Baseline coverage" value={`${d.baselineCoverage}%`} /><StatTile label="Maths baseline → follow-up" value={`${d.mathsBaseline} → ${d.mathsFollowUp}%`} /><StatTile label="Engagement (30d)" value={`${d.engagement}%`} hint={`was ${d.engagementPrev}%`} /><StatTile label="Follow-up" value={d.followUp.replace("-", " ")} /></section>
      <Src text={`${SRC.baseline}; ${SRC.engagement.replace("Source: ", "")}`} className="mb-4" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Institutions" subtitle="With branches" src={SRC.baseline} className="lg:col-span-2"><Async q={iq} skeleton={<Skeleton className="h-40" />}>{(list) => list.length === 0 ? <EmptyState title="No institutions reported" body="No institutions have shared data for this district yet." /> : (
          <ul className="divide-y divide-border">{list.map((i) => <li key={i.id} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{i.name}</p><p className="text-xs text-text-2">{i.type} · {i.students.toLocaleString("en-IN")} students · branches: {i.branches.map((b) => b.name).join(", ")}</p></div><div className="tnum flex flex-wrap items-center gap-2 text-sm"><span>Coverage {i.baselineCoverage}%</span><span>Maths {i.mathsProficiency}%</span>{i.dataStatus === "partial" && <Badge tone="warning">Partial</Badge>}<StatusBadge status={i.programmes ? "active" : "pending"} label={`${i.programmes} programme${i.programmes === 1 ? "" : "s"}`} /></div></div></li>)}</ul>)}</Async></Panel>
        <Panel title="Grade breakdown" subtitle="Baseline coverage by grade" src={SRC.baseline}><Async q={gq} skeleton={<Skeleton className="h-40" />}>{(rows) => <BarChart ariaLabel="Coverage by grade" unit="%" max={100} data={rows.map((r) => ({ label: r.label.replace("Grade ", "G"), value: r.baselineCoverage }))} />}</Async></Panel>
        <Panel title="Subject and objective analysis" subtitle="Current mastery, lowest 6 objectives" src={SRC.baseline}><Async q={oq} skeleton={<Skeleton className="h-40" />}>{(rows) => <BarChart horizontal unit="%" max={100} ariaLabel="Objective mastery" data={[...rows].sort((a, b) => a.mastery - b.mastery).slice(0, 6).map((r) => ({ label: `${r.code} ${r.title}`.slice(0, 40), value: r.mastery }))} />}</Async></Panel>
        <Panel title="Programme cohorts" src={SRC.programmes}><Async q={pq}>{(ps) => { const here = ps.filter((p) => p.districtIds.includes(id)); return here.length === 0 ? <EmptyState title="No programmes here" body="No state programme includes this district." action={{ label: "Create programme", href: G("programmes/new") }} /> : <ul className="space-y-2">{here.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm"><Link className="font-semibold text-primary hover:underline" href={G(`programmes/${p.id}`)}>{p.name}</Link><StatusBadge status={p.status} label={p.status.replace("-", " ")} /></li>)}</ul>; }}</Async></Panel>
        <Panel title="Student-level detail"><StudentGate scope={d.name} onRequest={() => setAsk(true)} /></Panel>
        <Panel title="Drill down" className="lg:col-span-2">{dq.data && <DrillDown districts={dq.data} initialDistrict={id} low={low} />}</Panel>
        <Panel title="Compare" className="lg:col-span-2">{dq.data && <CompareMode districts={dq.data} />}</Panel>
      </div>
      <RequestAccessModal open={ask} onOpenChange={setAsk} scope={d.name} />
      <div className="mt-4"><Button asChild variant="outline"><Link href={G("districts")}>Back to districts</Link></Button></div>
    </div>
  );
}
