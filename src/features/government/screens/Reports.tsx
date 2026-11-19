"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Card, CardBody, PageHeader, Select, Skeleton, toast, SectionHeader } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { DownloadSimple, ShieldCheck } from "@phosphor-icons/react";
import type { ScreenProps } from "@/types/screens";
import { governmentService } from "@/lib/api/governmentService";
import { GRADES } from "@/lib/mock-data/core";
import { Async, DemoBanner, Panel, Src, G, useLowBaseline } from "../components/shared";
import { AskBox } from "./CommandCentre";
import Link from "next/link";

const CATALOGUE = [
  { id: "baseline-followup", title: "Baseline vs follow-up by district", body: "Maths proficiency change against the original baseline." },
  { id: "programme-effect", title: "Programme effectiveness", body: "Participation, completion and average change per programme." },
  { id: "participation", title: "Participation", body: "Programme participation by district." },
  { id: "consumption", title: "Content consumption", body: "Views and completions of distributed content." },
  { id: "gap-trend", title: "Learning-gap trend", body: "Share below proficiency over time." },
  { id: "compliance", title: "Institution compliance", body: "Baseline coverage against the 80% compliance bar." },
];

export default function Reports(_: ScreenProps) {
  const low = useLowBaseline();
  const [id, setId] = React.useState(CATALOGUE[0].id); const [districtId, setD] = React.useState(""); const [gradeId, setG] = React.useState(""); const [range, setR] = React.useState("ay");
  const dq = useQuery({ queryKey: ["gov", "districts", low], queryFn: () => governmentService.districts(low) });
  const rq = useQuery({ queryKey: ["gov", "report", id, districtId, gradeId, range, low], queryFn: () => governmentService.report(id, { districtId: districtId || undefined, gradeId: gradeId || undefined, range }, low) });
  const exportCsv = (r: { title: string; columns: string[]; rows: (string | number)[][] }) => {
    const csv = [r.columns, ...r.rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `${r.title.toLowerCase().replace(/\W+/g, "-")}-demo.csv`; a.click(); } catch { /* ignore */ }
    toast.success("Export simulated", "A demo CSV was generated locally. Nothing was sent anywhere.");
  };
  return (
    <div>
      <PageHeader title="Reports & Outcomes" subtitle="Evidence for decisions. Every report states its source, period and metric definitions." />
      <DemoBanner />
      <p className="mb-4 flex items-center gap-2 rounded-xl bg-lilac/50 px-3 py-2 text-sm"><ShieldCheck size={18} className="text-primary" />Authorised oversight only. Reports show aggregates for your scope. Finance and fee reporting is optional and permission-configured; not every government collects fees.</p>
      <div className="grid gap-5 lg:grid-cols-4">
        <nav aria-label="Report catalogue" className="space-y-2 lg:col-span-1">{CATALOGUE.map((c) => <button key={c.id} onClick={() => setId(c.id)} aria-pressed={id === c.id} className={`w-full rounded-2xl border p-3 text-left ${id === c.id ? "border-primary bg-lilac" : "border-border bg-surface hover:bg-surface-2"}`}><p className="text-sm font-semibold">{c.title}</p><p className="text-xs text-text-2">{c.body}</p></button>)}</nav>
        <div className="space-y-4 lg:col-span-3">
          <Card><CardBody className="flex flex-wrap items-center gap-2">
            <Select aria-label="District" className="w-auto" value={districtId} onChange={(e) => setD(e.target.value)}><option value="">All districts</option>{(dq.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
            <Select aria-label="Grade" className="w-auto" value={gradeId} onChange={(e) => setG(e.target.value)}><option value="">All grades</option>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</Select>
            <Select aria-label="Date range" className="w-auto" value={range} onChange={(e) => setR(e.target.value)}><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="ay">Academic year 2026–27</option></Select>
            {(districtId || gradeId || range !== "ay") && <Button variant="ghost" size="sm" onClick={() => { setD(""); setG(""); setR("ay"); }}>Clear</Button>}
          </CardBody></Card>
          <Async q={rq} skeleton={<Skeleton className="h-96" />}>{(r) => (
            <Panel title={r.title} subtitle={r.context} src={r.source} actions={<Button size="sm" variant="outline" onClick={() => exportCsv(r)}><DownloadSimple size={16} />Export (simulated)</Button>}>
              <BarChart horizontal ariaLabel={r.title} unit={r.unit} data={r.chart} />
              <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-text-2">{r.columns.map((c) => <th key={c} className="py-1.5 pr-3">{c}</th>)}</tr></thead><tbody>{r.rows.map((row, i) => <tr key={i} className="border-t border-border">{row.map((c, j) => <td key={j} className="tnum py-1.5 pr-3">{j === 0 && typeof c === "string" && r.id !== "programme-effect" && r.id !== "gap-trend" ? <Link className="text-primary hover:underline" href={G("districts")}>{c}</Link> : c}</td>)}</tr>)}</tbody></table></div>
              <h3 className="mt-4 text-sm font-semibold">Metric definitions</h3><dl className="mt-1 space-y-1 text-sm">{r.definitions.map((d) => <div key={d.term}><dt className="inline font-semibold">{d.term}: </dt><dd className="inline text-text-2">{d.text}</dd></div>)}</dl>
              {r.note && <p className="mt-3 rounded-xl bg-warning-soft p-3 text-sm">{r.note}</p>}
            </Panel>)}</Async>
          <Panel title="Ask about this data" subtitle="Conversational analytics over aggregate data. Read-only."><AskBox compact /></Panel>
        </div>
      </div>
      <Src text="Reports use aggregate data only; no private student conversations are accessed." />
    </div>
  );
}
