"use client";
import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, CardBody, Drawer, EmptyState, ListToolbar, NoResults, PageHeader, Segmented, Select, StatusBadge, toast } from "@/components/ui";
import { ShieldCheck, Info } from "@phosphor-icons/react";
import type { ScreenProps } from "@/types/screens";
import type { ApprovalItem, AuditEntry } from "@/types/government";
import { governmentService } from "@/lib/api/governmentService";
import { fmtDateTime, relTime } from "@/lib/format";
import { Async, DecisionDialog, DemoBanner, Panel, G } from "../components/shared";

type Tab = "approvals" | "audit" | "policies" | "roles";
const ROLES = ["State Education Secretary", "State Academic Council", "District Officer", "Content Officer", "Assessment Cell", "Policy Officer"];
const AREAS = ["View aggregate analytics", "Create programmes", "Approve programmes", "Distribute content", "Approve AI Teachers", "View student-level records", "Export reports"];
const MATRIX: Record<string, ("full" | "scoped" | "view" | "none")[]> = {
  "State Education Secretary": ["full", "full", "full", "full", "full", "none", "full"], "State Academic Council": ["full", "full", "none", "view", "view", "none", "full"], "District Officer": ["scoped", "none", "none", "scoped", "none", "none", "scoped"],
  "Content Officer": ["view", "none", "none", "full", "none", "none", "view"], "Assessment Cell": ["full", "view", "none", "none", "none", "none", "full"], "Policy Officer": ["view", "none", "none", "none", "view", "none", "view"],
};

export default function Governance(_: ScreenProps) {
  const qc = useQueryClient(); const [tab, setTab] = React.useState<Tab>("approvals");
  const aq = useQuery({ queryKey: ["gov", "approvals"], queryFn: () => governmentService.approvals() });
  const [query, setQuery] = React.useState(""); const [type, setType] = React.useState(""); const [outcome, setOutcome] = React.useState("");
  const lq = useQuery({ queryKey: ["gov", "audit", query, type, outcome], queryFn: () => governmentService.audit({ q: query, type, outcome }) });
  const [dec, setDec] = React.useState<{ it: ApprovalItem; d: "approved" | "rejected" } | null>(null); const [entry, setEntry] = React.useState<AuditEntry | null>(null);
  const done = useMutation({ mutationFn: async () => undefined });
  void done; void relTime;
  return (
    <div>
      <PageHeader title="Governance" subtitle="State policy centre: approvals, audit trail, data policies and role permissions." />
      <DemoBanner />
      <p className="mb-4 flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-2 text-sm"><Info size={16} />Prototype permissions are illustrative, not production security.</p>
      <div className="mb-4"><Segmented<Tab> label="Governance sections" value={tab} onChange={setTab} options={[{ value: "approvals", label: "Approvals queue", count: aq.data?.length }, { value: "audit", label: "Audit trail" }, { value: "policies", label: "Policies" }, { value: "roles", label: "Role matrix" }]} /></div>

      {tab === "approvals" && <Async q={aq}>{(items) => items.length === 0 ? <EmptyState icon={<ShieldCheck size={28} weight="duotone" />} title="Nothing awaiting approval" body="Programmes, AI Teachers and content distributions submitted for approval appear here." /> : (
        <ul className="space-y-3">{items.map((it) => <li key={`${it.kind}-${it.id}`}><Card><CardBody className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge tone="primary">{it.kind.replace("-", " ")}</Badge><Badge tone={it.risk === "high" ? "danger" : "warning"}>{it.risk} impact</Badge></div><p className="mt-1 font-semibold">{it.title}</p><p className="text-sm text-text-2">{it.scope} · {it.summary}</p><p className="text-xs text-text-2">Submitted by {it.submittedBy} · {fmtDateTime(it.at)}</p>{it.href && <Link href={it.href} className="text-sm font-semibold text-primary hover:underline">Review details</Link>}</div><div className="flex gap-2"><Button variant="danger" size="sm" onClick={() => setDec({ it, d: "rejected" })}>Reject</Button><Button variant="success" size="sm" onClick={() => setDec({ it, d: "approved" })}>Approve</Button></div></CardBody></Card></li>)}</ul>)}</Async>}

      {tab === "audit" && <>
        <ListToolbar query={query} onQuery={setQuery} placeholder="Search audit trail" count={lq.data?.length} hasFilters={!!(type || outcome)} onClear={() => { setQuery(""); setType(""); setOutcome(""); }}>
          <Select aria-label="Entity type" className="w-auto" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{["programme", "distribution", "ai-teacher", "assessment", "access", "policy", "agent"].map((t) => <option key={t}>{t}</option>)}</Select>
          <Select aria-label="Outcome" className="w-auto" value={outcome} onChange={(e) => setOutcome(e.target.value)}><option value="">Any outcome</option><option value="success">Success</option><option value="rejected">Rejected</option><option value="blocked">Blocked</option></Select>
        </ListToolbar>
        <Async q={lq}>{(list) => list.length === 0 ? <NoResults query={query} onClear={() => { setQuery(""); setType(""); setOutcome(""); }} /> : (
          <Card><ul className="divide-y divide-border">{list.map((e) => <li key={e.id}><button className="flex w-full flex-wrap items-center gap-3 p-3 text-left hover:bg-surface-2" onClick={() => setEntry(e)}><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{e.action}</p><p className="text-xs text-text-2">{e.entity} · {e.actor}</p></div><StatusBadge status={e.outcome === "success" ? "completed" : e.outcome === "rejected" ? "rejected" : "failed"} label={e.outcome} /><span className="text-xs text-text-2">{fmtDateTime(e.at)}</span></button></li>)}</ul></Card>)}</Async></>}

      {tab === "policies" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Approved AI providers and budget" subtitle="Bring-your-own-key only. No Zoho-owned AI provider." src="Source: state AI policy (demo data)"><ul className="space-y-1.5 text-sm"><li>Approved providers: OpenAI, Gemini, Claude (demo key labels, masked)</li><li>Monthly AI budget cap: INR 40 lakh (demo estimate)</li><li>Autonomous statewide actions: require explicit human approval</li></ul><Button asChild size="sm" variant="soft" className="mt-3"><Link href={G("ai-providers")}>Open AI Provider Policy</Link></Button></Panel>
          <Panel title="Data governance and consent"><ul className="list-disc space-y-1.5 pl-5 text-sm text-text-2"><li>Institutions own their student data; state sees aggregates by default.</li><li>Student-level access needs a scoped, purposeful grant from the institution.</li><li>Private student conversations (tutor, doubts, parent messages) are never accessible to government roles.</li><li>Minors: parental consent rules follow institution policy.</li></ul></Panel>
          <Panel title="Retention and archival"><ul className="list-disc space-y-1.5 pl-5 text-sm text-text-2"><li>Baselines are retained for the full academic cycle and never overwritten.</li><li>Programme outcomes archived on completion for 7 years (demo policy).</li><li>Audit trail retained 10 years (demo policy).</li></ul></Panel>
          <Panel title="Statewide launch rule"><p className="text-sm text-text-2">Statewide programmes and distributions to 6 or more districts always require explicit human approval with notes. AI can propose but never launch.</p></Panel>
        </div>)}

      {tab === "roles" && <Panel title="Role matrix: state and district officials" subtitle="Illustrative only"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-text-2"><th className="py-2">Role</th>{AREAS.map((a) => <th key={a} className="px-2 text-center">{a}</th>)}</tr></thead><tbody>{ROLES.map((r) => <tr key={r} className="border-t border-border"><th className="py-2 pr-2 text-left font-semibold">{r}</th>{MATRIX[r].map((v, i) => <td key={i} className="px-2 text-center"><Badge tone={v === "full" ? "success" : v === "none" ? "neutral" : "info"}>{v}</Badge></td>)}</tr>)}</tbody></table></div></Panel>}

      <DecisionDialog open={!!dec} onOpenChange={(o) => !o && setDec(null)} decision={dec?.d ?? "approved"} title={`${dec?.d === "rejected" ? "Reject" : "Approve"}: ${dec?.it.title ?? ""}`} requireConfirm={dec?.it.risk === "high"} confirmLabel="I confirm explicit human approval for this statewide-scope action."
        onSubmit={async (notes, ok) => { await governmentService.decide(dec!.it, dec!.d, notes, ok); qc.invalidateQueries({ queryKey: ["gov"] }); toast.success(dec!.d === "approved" ? "Approved" : "Rejected", "Recorded in the audit trail."); }} />
      <Drawer open={!!entry} onOpenChange={(o) => !o && setEntry(null)} title="Audit entry">{entry && <dl className="space-y-3 text-sm">{([["Action", entry.action], ["Entity", `${entry.entity} (${entry.entityType})`], ["Actor", `${entry.actor}, ${entry.role}`], ["When", fmtDateTime(entry.at)], ["Outcome", entry.outcome], ["Detail", entry.detail || "None"]] as [string, string][]).map(([k, v]) => <div key={k}><dt className="text-xs font-semibold text-text-2">{k}</dt><dd>{v}</dd></div>)}</dl>}</Drawer>
    </div>
  );
}
