"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Card, CardBody, EmptyState, ListToolbar, NoResults, PageHeader, Progress, Segmented, Select, StatusBadge, Skeleton } from "@/components/ui";
import { Plus, FlagBanner } from "@phosphor-icons/react";
import type { ScreenProps } from "@/types/screens";
import type { ProgrammeStatus } from "@/types/government";
import { programmeService } from "@/lib/api/programmeService";
import { fmtDate } from "@/lib/format";
import { Async, DemoBanner, G, Src } from "../components/shared";
import { SRC } from "@/lib/mock-data/government";
import { districtById } from "@/lib/mock-data/government";

const TABS: { value: "all" | ProgrammeStatus; label: string }[] = [{ value: "all", label: "All" }, { value: "draft", label: "Draft" }, { value: "awaiting-approval", label: "Awaiting approval" }, { value: "active", label: "Active" }, { value: "completed", label: "Completed" }];

export default function Programmes(_: ScreenProps) {
  const q = useQuery({ queryKey: ["gov", "programmes"], queryFn: () => programmeService.list() });
  const [tab, setTab] = React.useState<"all" | ProgrammeStatus>("all");
  const [query, setQuery] = React.useState(""); const [sort, setSort] = React.useState("updated");
  return (
    <div>
      <PageHeader title="Learning Programmes" subtitle="Plan, approve and track state-wide improvement programmes. AI suggests; authorised officials approve." actions={<Button asChild><Link href={G("programmes/new")}><Plus size={18} />New programme</Link></Button>} />
      <DemoBanner />
      <Async q={q} skeleton={<div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-36" /><Skeleton className="h-36" /></div>}>
        {(all) => {
          const count = (s: string) => (s === "all" ? all.length : all.filter((p) => p.status === s).length);
          let list = all.filter((p) => (tab === "all" || p.status === tab) && `${p.name} ${p.objective}`.toLowerCase().includes(query.toLowerCase()));
          list = [...list].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "participation" ? b.delivery.participationPct - a.delivery.participationPct : b.updatedAt.localeCompare(a.updatedAt));
          return (
            <>
              <div className="mb-3"><Segmented label="Status" value={tab} onChange={setTab} options={TABS.map((t) => ({ ...t, count: count(t.value) }))} /></div>
              <ListToolbar query={query} onQuery={setQuery} placeholder="Search programmes" count={list.length} hasFilters={tab !== "all" || sort !== "updated"} onClear={() => { setQuery(""); setTab("all"); setSort("updated"); }}>
                <Select aria-label="Sort programmes" className="w-auto" value={sort} onChange={(e) => setSort(e.target.value)}><option value="updated">Recently updated</option><option value="name">Name</option><option value="participation">Participation</option></Select>
              </ListToolbar>
              {all.length === 0 ? <EmptyState icon={<FlagBanner size={28} weight="duotone" />} title="No programme created" body="Create a learning programme to distribute resources, run baseline assessments and track improvement." action={{ label: "Create programme", href: G("programmes/new") }} />
                : list.length === 0 ? <NoResults query={query} onClear={() => { setQuery(""); setTab("all"); }} />
                : <ul className="grid gap-3 lg:grid-cols-2">{list.map((p) => (
                  <li key={p.id}><Card className="h-full"><CardBody className="flex h-full flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><Link href={p.status === "draft" || p.status === "rejected" ? G(`programmes/${p.id}`) : G(`programmes/${p.id}`)} className="text-base font-bold hover:text-primary hover:underline">{p.name}</Link><p className="text-xs text-text-2">{p.phase} · {p.statewide ? "Statewide" : `${p.districtIds.length} districts (${p.districtIds.slice(0, 2).map((d) => districtById(d)?.name).join(", ")}${p.districtIds.length > 2 ? "…" : ""})`}</p></div><div className="flex gap-1.5">{p.origin === "ai-proposal" && <Badge tone="ai">AI proposal</Badge>}<StatusBadge status={p.status} label={p.status.replace("-", " ")} /></div></div>
                    <p className="line-clamp-2 text-sm text-text-2">{p.objective || "No objective written yet."}</p>
                    {["active", "paused", "completed"].includes(p.status) ? <div className="space-y-2"><div><div className="mb-1 flex justify-between text-xs"><span>Participation</span><span className="tnum">{p.delivery.participationPct}% of {p.participationTarget}% target</span></div><Progress value={p.delivery.participationPct} label="Participation" size="sm" /></div><p className="tnum text-xs text-text-2">Baseline avg {p.delivery.baselineAvg}% → follow-up {p.delivery.followUpAvg ?? "pending"}{p.delivery.followUpAvg ? "%" : ""}</p></div>
                      : <p className="text-xs text-text-2">{p.status === "draft" ? `Draft at step ${Math.min(p.step, 9)} of 10` : p.status === "awaiting-approval" ? `Submitted ${p.submittedAt ? fmtDate(p.submittedAt) : ""}, awaiting an authorised approver` : "Returned with reviewer notes"}</p>}
                    <div className="mt-auto flex items-center justify-between text-xs text-text-2"><span>Updated {fmtDate(p.updatedAt)}</span><Button asChild size="sm" variant="soft"><Link href={G(`programmes/${p.id}`)}>Open</Link></Button></div>
                  </CardBody></Card></li>))}</ul>}
              <Src text={SRC.programmes} />
            </>
          );
        }}
      </Async>
    </div>
  );
}
