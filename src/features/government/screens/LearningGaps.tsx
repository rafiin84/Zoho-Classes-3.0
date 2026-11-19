"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Drawer, PageHeader, Segmented, StatusBadge, Skeleton } from "@/components/ui";
import { Heatmap, BarChart } from "@/components/charts";
import type { ScreenProps } from "@/types/screens";
import { governmentService } from "@/lib/api/governmentService";
import { Async, DemoBanner, Panel, Src, G, StudentGate, useLowBaseline } from "../components/shared";
import { RequestAccessModal } from "../components/Explorer";

type Sev = "all" | "high" | "improving";
export default function LearningGaps(_: ScreenProps) {
  const low = useLowBaseline();
  const q = useQuery({ queryKey: ["gov", "gaps", low], queryFn: () => governmentService.gaps(low) });
  const [sev, setSev] = React.useState<Sev>("all");
  const [cell, setCell] = React.useState<{ r: number; c: number } | null>(null);
  const [ask, setAsk] = React.useState(false);
  return (
    <div>
      <PageHeader title="Learning Gaps" subtitle="Gap analysis by cohort, subject, school and district. Gaps are associations, not causes." actions={<Button asChild><Link href={G("programmes/new")}>Create remedial programme</Link></Button>} />
      <DemoBanner />
      <div className="mb-4"><Segmented<Sev> label="Severity filter" value={sev} onChange={setSev} options={[{ value: "all", label: "All gaps" }, { value: "high", label: "High severity" }, { value: "improving", label: "Improving" }]} /></div>
      <Async q={q} skeleton={<Skeleton className="h-96" />}>{(g) => {
        const cohorts = g.cohorts.filter((c) => sev === "all" || (sev === "high" ? c.severity === "high" : c.trend === "improving"));
        const schools = g.schools.filter((s) => sev === "all" || (sev === "high" ? s.severity === "high" : s.trend === "improving"));
        const picked = cell ? { d: g.districts[cell.r], o: g.objectives[cell.c], m: g.mastery[cell.r][cell.c], s: g.severity[cell.r][cell.c] } : null;
        return (
          <div className="space-y-5">
            <Panel title="District x objective heatmap" subtitle="Severity: 0 none, 1 mild, 2 moderate, 3 severe. Select a cell to drill down." src={g.source}>
              <Heatmap ariaLabel="Learning-gap severity by district and objective" rows={g.districts.map((d) => d.name.split(" ").map((w) => w[0]).join("") + (d.dataStatus === "partial" ? "*" : ""))} rowTitle={(i) => g.districts[i].name} cols={g.objectives.map((o) => o.code)} colTitle={(i) => g.objectives[i].title} values={g.severity} max={3} onCell={(r, c) => setCell({ r, c })} />
              <p className="mt-2 text-xs text-text-2">Rows are district initials (hover for names); * means partial data. {low && "Nilgiri Hills (NH) has only 41% baseline coverage, so its gaps are less certain."}</p>
            </Panel>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Student cohorts" subtitle="Aggregate cohorts only, no individuals" src={g.source}>
                {cohorts.length === 0 ? <p className="text-sm text-text-2">No cohorts match this filter.</p> : <ul className="space-y-2">{cohorts.map((c) => <li key={c.id} className="rounded-xl border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{c.label}</p><div className="flex gap-1.5"><Badge tone={c.severity === "high" ? "danger" : "warning"}>{c.severity}</Badge><Badge tone={c.trend === "improving" ? "success" : c.trend === "worsening" ? "danger" : "neutral"}>{c.trend}</Badge></div></div><p className="tnum text-xs text-text-2">{c.students.toLocaleString("en-IN")} students (demo scale)</p><Button asChild size="sm" variant="soft" className="mt-2"><Link href={`${G("programmes/new")}?objectives=${c.objective}`}>Plan remedial programme</Link></Button></li>)}</ul>}
              </Panel>
              <Panel title="Subjects" subtitle="% of assessed students below proficiency" src={g.source}><BarChart horizontal unit="%" ariaLabel="Subject gaps" data={g.subjects.map((s) => ({ label: s.name, value: s.gapPct }))} /><p className="mt-2 text-xs text-text-2">Previous period: {g.subjects.map((s) => `${s.name.split(" ")[0]} ${s.previous}%`).join(", ")}</p></Panel>
            </div>
            <Panel title="Schools with the largest maths gaps" src={g.source}>
              {schools.length === 0 ? <p className="text-sm text-text-2">No schools match this filter.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-text-2"><th className="py-1.5">Institution</th><th>District</th><th className="text-right">Proficiency</th><th className="text-right">Coverage</th><th className="text-right">Change</th><th className="text-right">Status</th></tr></thead><tbody>{schools.map((s) => <tr key={s.id} className="border-t border-border"><td className="py-2 pr-2 font-medium">{s.name}{s.partial && <Badge tone="warning" className="ml-1">Partial data</Badge>}</td><td>{s.district}</td><td className="tnum text-right">{s.proficiency}%</td><td className="tnum text-right">{s.coverage}%</td><td className="tnum text-right">+{s.improvement}</td><td className="text-right"><StatusBadge status={s.severity === "high" ? "failed" : s.severity === "medium" ? "pending" : "active"} label={s.severity === "high" ? "High gap" : s.trend === "improving" ? "Improving" : "Watch"} /></td></tr>)}</tbody></table></div>}
            </Panel>
            <Drawer open={!!picked} onOpenChange={(o) => !o && setCell(null)} title="Gap drill-down">
              {picked && <div className="space-y-3 text-sm"><p><strong>{picked.d.name}</strong> · {picked.o.code} {picked.o.title}</p><p className="tnum">Estimated mastery {picked.m}% · severity {picked.s}/3</p>{picked.d.dataStatus === "partial" && <Badge tone="warning">Partial district data</Badge>}<div className="flex flex-wrap gap-2"><Button asChild size="sm"><Link href={`${G("programmes/new")}?objectives=${picked.o.id}`}>Create remedial programme</Link></Button><Button asChild size="sm" variant="outline"><Link href={G(`districts/${picked.d.id}`)}>Open district</Link></Button></div><StudentGate scope={`${picked.d.name} / ${picked.o.code}`} onRequest={() => setAsk(true)} /></div>}
            </Drawer>
            <RequestAccessModal open={ask} onOpenChange={setAsk} scope={picked ? `${picked.d.name} / ${picked.o.code}` : "State"} />
          </div>);
      }}</Async>
      <Src text="Gap = share of assessed students below proficiency on baseline objectives." />
    </div>
  );
}
