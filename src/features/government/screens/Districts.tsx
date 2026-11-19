"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Badge, ListToolbar, NoResults, PageHeader, Segmented, Select, Skeleton } from "@/components/ui";
import type { ScreenProps } from "@/types/screens";
import type { MetricKey } from "@/types/government";
import { governmentService, METRICS } from "@/lib/api/governmentService";
import { SRC } from "@/lib/mock-data/government";
import { fmtCompact } from "@/lib/format";
import { Async, DemoBanner, Panel, Src, G, useLowBaseline } from "../components/shared";
import { DistrictMap, CompareMode } from "../components/Explorer";

export default function Districts(_: ScreenProps) {
  const low = useLowBaseline(); const router = useRouter();
  const q = useQuery({ queryKey: ["gov", "districts", low], queryFn: () => governmentService.districts(low) });
  const [view, setView] = React.useState<"list" | "map" | "compare">("list");
  const [query, setQuery] = React.useState(""); const [region, setRegion] = React.useState(""); const [sort, setSort] = React.useState("name"); const [data, setData] = React.useState(""); const [metric, setMetric] = React.useState<MetricKey>("baselineCoverage");
  const clear = () => { setQuery(""); setRegion(""); setSort("name"); setData(""); };
  return (
    <div>
      <PageHeader title="Districts & Institutions" subtitle="Browse the 12 demo districts and open one to see its institutions, grades and objectives." />
      <DemoBanner />
      <div className="mb-4"><Segmented<"list" | "map" | "compare"> label="View" value={view} onChange={setView} options={[{ value: "list", label: "List" }, { value: "map", label: "Map" }, { value: "compare", label: "Compare" }]} /></div>
      <Async q={q} skeleton={<Skeleton className="h-96" />}>{(ds) => {
        const regions = [...new Set(ds.map((d) => d.region))];
        let list = ds.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()) && (!region || d.region === region) && (!data || d.dataStatus === data));
        list = [...list].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "coverage" ? a.baselineCoverage - b.baselineCoverage : sort === "students" ? b.students - a.students : b.improvement - a.improvement);
        if (view === "compare") return <Panel title="Compare districts or periods"><CompareMode districts={ds} /></Panel>;
        return (
          <>
            <ListToolbar query={query} onQuery={setQuery} placeholder="Search districts" count={list.length} hasFilters={!!(region || data || sort !== "name")} onClear={clear}>
              <Select aria-label="Region" className="w-auto" value={region} onChange={(e) => setRegion(e.target.value)}><option value="">All regions</option>{regions.map((r) => <option key={r}>{r}</option>)}</Select>
              <Select aria-label="Data status" className="w-auto" value={data} onChange={(e) => setData(e.target.value)}><option value="">Any data status</option><option value="complete">Complete</option><option value="partial">Partial</option></Select>
              <Select aria-label="Sort" className="w-auto" value={sort} onChange={(e) => setSort(e.target.value)}><option value="name">Name</option><option value="coverage">Lowest coverage</option><option value="students">Most students</option><option value="improvement">Most improvement</option></Select>
            </ListToolbar>
            {list.length === 0 ? <NoResults query={query} onClear={clear} /> : view === "map" ? (
              <Panel title="District map" src={SRC.baseline}><div className="mb-3"><Segmented<MetricKey> label="Metric" value={metric} onChange={setMetric} options={METRICS.map((m) => ({ value: m.key, label: m.label }))} /></div><DistrictMap districts={list} metric={metric} onSelect={(id) => router.push(G(`districts/${id}`))} /></Panel>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map((d) => (
                <li key={d.id}><Link href={G(`districts/${d.id}`)} className="block h-full rounded-[1.25rem] border border-border bg-surface p-4 shadow-soft hover:border-primary">
                  <div className="flex items-start justify-between gap-2"><div><p className="font-bold">{d.name}</p><p className="text-xs text-text-2">{d.region}</p></div>{d.dataStatus === "partial" ? <Badge tone="warning">Partial data</Badge> : <Badge tone="success">Complete</Badge>}</div>
                  <dl className="tnum mt-3 grid grid-cols-3 gap-2 text-sm"><div><dt className="text-[11px] text-text-2">Students</dt><dd className="font-semibold">{fmtCompact(d.students)}</dd></div><div><dt className="text-[11px] text-text-2">Coverage</dt><dd className={`font-semibold ${d.baselineCoverage < 45 ? "text-danger" : ""}`}>{d.baselineCoverage}%</dd></div><div><dt className="text-[11px] text-text-2">Change</dt><dd className="font-semibold">+{d.improvement} pts</dd></div></dl>
                </Link></li>))}</ul>
            )}
            <Src text={`${SRC.baseline}. Student counts are demo scale.`} />
          </>);
      }}</Async>
    </div>
  );
}
