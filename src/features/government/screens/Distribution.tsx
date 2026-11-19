"use client";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, CardBody, EmptyState, ListToolbar, NoResults, PageHeader, Segmented, Select, StatTile, StatusBadge, Skeleton, Modal, Checkbox, Field, Input, toast } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { Warning } from "@phosphor-icons/react";
import type { ScreenProps } from "@/types/screens";
import type { ResourceType, DistributionSelection } from "@/types/government";
import { distributionService, type ResourceFilter } from "@/lib/api/distributionService";
import { governmentService } from "@/lib/api/governmentService";
import { GRADES, SUBJECTS, subjectById } from "@/lib/mock-data/core";
import { SRC, ILLUSTRATIVE } from "@/lib/mock-data/government";
import { fmtDateTime, fmtCompact } from "@/lib/format";
import { Async, DemoBanner, Panel, Src, errMsg } from "../components/shared";

export default function Distribution(_: ScreenProps) {
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<"planner" | "inventory" | "history">("planner");
  const [f, setF] = React.useState<ResourceFilter>({}); const [query, setQuery] = React.useState("");
  const [sel, setSel] = React.useState<string[]>([]); const [dists, setDists] = React.useState<string[]>([]); const [grades, setGrades] = React.useState<string[]>([]); const [note, setNote] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const rq = useQuery({ queryKey: ["gov", "resources", f, query], queryFn: () => distributionService.resources({ ...f, q: query }) });
  const inv = useQuery({ queryKey: ["gov", "inventory"], queryFn: () => distributionService.inventory() });
  const hist = useQuery({ queryKey: ["gov", "dist-history"], queryFn: () => distributionService.history() });
  const dq = useQuery({ queryKey: ["gov", "districts", false], queryFn: () => governmentService.districts(false) });
  const selection: DistributionSelection = { resourceIds: sel, districtIds: dists, gradeIds: grades, note };
  const prev = useMutation({ mutationFn: () => distributionService.preview(selection), onSuccess: () => setOpen(true), onError: (e) => toast.error("Preview failed", errMsg(e)) });
  const confirm = useMutation({
    mutationFn: () => distributionService.confirm(selection),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["gov"] }); setOpen(false); setSel([]); setDists([]); setNote(""); setTab("history"); toast.success(r.status === "awaiting-approval" ? "Sent for approval" : "Distribution scheduled", r.status === "awaiting-approval" ? "Statewide-scale distributions need explicit approval in Governance." : `${r.resources} resources to ${r.districtLabel}.`); },
    onError: (e) => toast.error("Could not distribute", errMsg(e)),
  });
  const startPreview = () => {
    if (!sel.length) return toast.warning("Select resources first");
    if (!dists.length) return toast.warning("Select at least one district");
    prev.mutate();
  };
  const toggle = (arr: string[], set: (v: string[]) => void, id: string) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  const hasF = !!(f.type || f.gradeId || f.subjectId || f.language || f.approval || f.mapping);

  return (
    <div>
      <PageHeader title="Content Distribution" subtitle="Plan and distribute curriculum-mapped resources by grade, subject, chapter, objective, language and district." />
      <DemoBanner extra="Inventory totals are illustrative programme figures, not verified platform inventory." />
      <div className="mb-4"><Segmented label="Distribution sections" value={tab} onChange={setTab} options={[{ value: "planner", label: "Library & planner" }, { value: "inventory", label: "Inventory & analytics" }, { value: "history", label: "Distribution history" }]} /></div>

      {tab === "planner" && (
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ListToolbar query={query} onQuery={setQuery} placeholder="Search resources or chapters" count={rq.data?.length} hasFilters={hasF} onClear={() => { setF({}); setQuery(""); }}>
              <Select aria-label="Type" className="w-auto" value={f.type ?? ""} onChange={(e) => setF({ ...f, type: e.target.value as ResourceType })}><option value="">All types</option>{["video", "mcq", "game", "course", "document", "microlearning"].map((t) => <option key={t}>{t}</option>)}</Select>
              <Select aria-label="Grade" className="w-auto" value={f.gradeId ?? ""} onChange={(e) => setF({ ...f, gradeId: e.target.value })}><option value="">All grades</option>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</Select>
              <Select aria-label="Subject" className="w-auto" value={f.subjectId ?? ""} onChange={(e) => setF({ ...f, subjectId: e.target.value })}><option value="">All subjects</option>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
              <Select aria-label="Language" className="w-auto" value={f.language ?? ""} onChange={(e) => setF({ ...f, language: e.target.value })}><option value="">All languages</option><option>English</option><option>Hindi</option><option>Karuvani</option></Select>
              <Select aria-label="Approval" className="w-auto" value={f.approval ?? ""} onChange={(e) => setF({ ...f, approval: e.target.value })}><option value="">Any approval</option><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option></Select>
              <Select aria-label="Mapping" className="w-auto" value={f.mapping ?? ""} onChange={(e) => setF({ ...f, mapping: e.target.value as "unmapped" | "" })}><option value="">Any mapping</option><option value="unmapped">Missing objective mapping</option></Select>
            </ListToolbar>
            <Async q={rq} skeleton={<Skeleton className="h-96" />}>{(list) => list.length === 0 ? <NoResults query={query} onClear={() => { setF({}); setQuery(""); }} /> : (
              <Card><div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Resource library</caption><thead><tr className="text-left text-xs text-text-2"><th className="p-3"><Checkbox label="All" checked={list.every((r) => sel.includes(r.id))} onChange={(c) => setSel(c ? [...new Set([...sel, ...list.filter((r) => r.approval === "approved").map((r) => r.id)])] : sel.filter((s) => !list.some((r) => r.id === s)))} /></th><th>Resource</th><th>Mapping</th><th>Language</th><th>Approval</th><th>Version</th></tr></thead>
                <tbody>{list.slice(0, 40).map((r) => (
                  <tr key={r.id} className="border-t border-border"><td className="p-3"><input type="checkbox" aria-label={`Select ${r.title}`} className="size-5 accent-[var(--primary)]" checked={sel.includes(r.id)} disabled={r.approval !== "approved"} onChange={() => toggle(sel, setSel, r.id)} /></td>
                    <td className="py-2 pr-2"><p className="font-medium">{r.title}</p><p className="text-xs text-text-2">{r.type} · {subjectById(r.subjectId).name} · {GRADES.find((g) => g.id === r.gradeId)?.label} · {r.chapter}</p><p className="text-xs text-text-2">Source: {r.source}</p></td>
                    <td>{r.objectiveId ? <Badge tone="success">Mapped</Badge> : <Badge tone="warning" icon={<Warning size={12} />}>No objective</Badge>}</td><td>{r.language}</td><td><StatusBadge status={r.approval} /></td><td className="text-xs">{r.version}{r.replacedBy && <Badge tone="info" className="ml-1">Replacement available</Badge>}</td></tr>))}</tbody></table></div>
                {list.length > 40 && <p className="p-3 text-xs text-text-2">Showing 40 of {list.length}. Refine filters to see others.</p>}</Card>)}</Async>
            <Src text={SRC.content} />
          </div>
          <Panel title="Distribution plan" subtitle={`${sel.length} resource(s) selected`}>
            <div className="space-y-3">
              <fieldset><legend className="mb-1 text-sm font-semibold">Districts</legend><div className="flex gap-2 pb-1"><Button size="sm" variant="outline" onClick={() => setDists((dq.data ?? []).map((d) => d.id))}>All</Button><Button size="sm" variant="ghost" onClick={() => setDists([])}>None</Button></div>
                <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto">{(dq.data ?? []).map((d) => <Checkbox key={d.id} label={d.name} checked={dists.includes(d.id)} onChange={() => toggle(dists, setDists, d.id)} />)}</div></fieldset>
              <fieldset><legend className="mb-1 text-sm font-semibold">Grades (optional)</legend><div className="grid grid-cols-2 gap-1">{GRADES.map((g) => <Checkbox key={g.id} label={g.label} checked={grades.includes(g.id)} onChange={() => toggle(grades, setGrades, g.id)} />)}</div></fieldset>
              <Field label="Note" htmlFor="d-note" optional><Input id="d-note" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <Button className="w-full" loading={prev.isPending} onClick={startPreview}>Preview bulk distribution</Button>
              <Button className="w-full" variant="ghost" onClick={() => { setSel([]); setDists([]); setGrades([]); setNote(""); }}>Clear plan</Button>
            </div>
          </Panel>
        </div>
      )}

      {tab === "inventory" && <Async q={inv}>{(i) => (
        <div className="space-y-5">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatTile label="Videos" value={fmtCompact(ILLUSTRATIVE.videos)} hint="Illustrative" /><StatTile label="MCQs" value={fmtCompact(ILLUSTRATIVE.mcqs)} hint="Illustrative" /><StatTile label="Games" value={ILLUSTRATIVE.games} hint="Illustrative" /><StatTile label="Courses" value={ILLUSTRATIVE.courses} hint="Illustrative" /></section>
          <Src text={SRC.inventory} className="-mt-3" />
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Mapping validation" src={`Checked over ${i.sampleSize} sample resources in this prototype`}><ul className="space-y-2 text-sm"><li className="flex items-center gap-2"><Warning className="text-warning" size={16} />{i.unmapped} resources missing objective mapping</li><li className="flex items-center gap-2"><Warning className="text-warning" size={16} />{i.pending} resources pending approval</li><li className="flex items-center gap-2"><Warning className="text-text-2" size={16} />{i.replaced} resources have a replacement version</li></ul><Button size="sm" variant="outline" className="mt-3" onClick={() => { setF({ mapping: "unmapped" }); setTab("planner"); }}>Review unmapped</Button></Panel>
            <Panel title="Consumption analytics" src={SRC.content}><p className="tnum text-sm">Views {i.views.toLocaleString("en-IN")} · Completions {i.completions.toLocaleString("en-IN")} ({Math.round((i.completions / i.views) * 100)}% completion rate)</p></Panel>
            <Panel title="By type (sample)" src={SRC.content}><BarChart horizontal ariaLabel="Resources by type" data={i.byType} /></Panel>
            <Panel title="By language (sample)" src={SRC.content}><BarChart horizontal ariaLabel="Resources by language" data={i.byLanguage} /></Panel>
          </div>
        </div>)}</Async>}

      {tab === "history" && <Async q={hist}>{(h) => h.length === 0 ? <EmptyState title="No distributions yet" body="Plan a distribution to see it here." /> : (
        <ul className="space-y-3">{h.map((d) => <li key={d.id}><Card><CardBody className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{d.note || d.resourceTitles[0]}</p><p className="text-sm text-text-2">{d.resources} resources to {d.districtLabel} · about {d.students.toLocaleString("en-IN")} students (demo)</p><p className="text-xs text-text-2">{fmtDateTime(d.at)} · {d.by}{d.decidedBy ? ` · approved by ${d.decidedBy}` : ""}</p></div><StatusBadge status={d.status} label={d.status.replace("-", " ")} /></CardBody></Card></li>)}</ul>)}</Async>}

      <Modal open={open} onOpenChange={setOpen} title="Bulk distribution preview" description="Nothing is sent until you confirm."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button loading={confirm.isPending} disabled={!!prev.data?.blocked.length} onClick={() => confirm.mutate()}>{prev.data?.needsApproval ? "Confirm and send for approval" : "Confirm distribution"}</Button></>}>
        {prev.data && <div className="space-y-3 text-sm" aria-live="polite">
          <dl className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-surface-2 p-3"><dt className="text-xs text-text-2">Resources</dt><dd className="tnum text-xl font-bold">{prev.data.resources}</dd></div><div className="rounded-xl bg-surface-2 p-3"><dt className="text-xs text-text-2">Districts</dt><dd className="tnum text-xl font-bold">{prev.data.districts}</dd></div><div className="rounded-xl bg-surface-2 p-3"><dt className="text-xs text-text-2">Institutions</dt><dd className="tnum text-xl font-bold">{prev.data.institutions.toLocaleString("en-IN")}</dd></div><div className="rounded-xl bg-surface-2 p-3"><dt className="text-xs text-text-2">Students (demo)</dt><dd className="tnum text-xl font-bold">{fmtCompact(prev.data.students)}</dd></div></dl>
          {prev.data.warnings.map((w) => <p key={w} className="flex gap-2 rounded-lg bg-warning-soft p-2"><Warning size={16} className="mt-0.5 shrink-0" />{w}</p>)}
          {prev.data.blocked.map((w) => <p key={w} className="rounded-lg bg-danger-soft p-2 text-danger">{w}</p>)}
          {prev.data.needsApproval && <p className="rounded-lg bg-lilac p-2">Distribution to 6 or more districts needs explicit approval. It will appear in the Governance approvals queue.</p>}
        </div>}
      </Modal>
    </div>
  );
}
