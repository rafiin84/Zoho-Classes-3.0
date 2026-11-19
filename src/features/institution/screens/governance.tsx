"use client";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Segmented, Badge, StatusBadge, Button, Drawer, ListToolbar, Select, Switch, Field, Input, toast, Card, EmptyState, ConfirmDialog, DemoTag, NoResults } from "@/components/ui";
import { governanceService, AUDIT_CATEGORIES, ROLE_MATRIX, ROLE_MATRIX_AREAS } from "@/lib/api/governanceService";
import { aiTeacherService } from "@/lib/api/aiTeacherService";
import type { ApprovalItem, AuditEvent } from "@/types/institution";
import { fmtDateTime, relTime } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { useQ, Q, DataTable, DemoNote, ReasonModal, onErr, ACTOR, Panel, simulateExport } from "../kit";

type Tab = "approvals" | "audit" | "roles" | "consent" | "sharing" | "retention" | "exports" | "tenant";
const TABS: { value: Tab; label: string }[] = [{ value: "approvals", label: "Approvals" }, { value: "audit", label: "Audit trail" }, { value: "roles", label: "Roles & permissions" }, { value: "consent", label: "Consent centre" }, { value: "sharing", label: "Data sharing" }, { value: "retention", label: "Retention & data" }, { value: "exports", label: "Export requests" }, { value: "tenant", label: "Tenant settings" }];
const ACCESS_TONE = { full: "success", scoped: "info", view: "neutral", none: "danger" } as const;

export default function GovernanceScreen({ searchParams }: ScreenProps) {
  const [tab, setTab] = React.useState<Tab>((TABS.find((t) => t.value === searchParams.tab)?.value) ?? "approvals");
  return (
    <div>
      <PageHeader title="Governance & Audit" subtitle="Approvals, permissions, consent, retention and a tamper-evident activity trail." actions={<DemoTag label="Prototype permissions" />} />
      <DemoNote>Permissions, roles and audit shown here are illustrative for this prototype. They are not production security controls.</DemoNote>
      <div className="mb-5 overflow-x-auto"><Segmented label="Governance sections" value={tab} onChange={setTab} options={TABS} /></div>
      {tab === "approvals" && <Approvals />}{tab === "audit" && <Audit />}{tab === "roles" && <Roles />}{tab === "consent" && <Consent />}
      {tab === "sharing" && <Sharing />}{tab === "retention" && <Retention />}{tab === "exports" && <Exports />}{tab === "tenant" && <Tenant />}
    </div>
  );
}

function Approvals() {
  const qc = useQueryClient();
  const [status, setStatus] = React.useState<"pending" | "approved" | "rejected">("pending");
  const [kind, setKind] = React.useState(""); const [q, setQ] = React.useState("");
  const [rej, setRej] = React.useState<ApprovalItem | null>(null); const [ok, setOk] = React.useState<ApprovalItem | null>(null);
  const list = useQ(["approvals", status], async () => {
    const base = await governanceService.approvals(status);
    const ai = status === "pending" ? (await aiTeacherService.list({ status: "awaiting-approval" })).map((t): ApprovalItem => ({ id: `ait:${t.id}`, kind: "ai-teacher", title: `Approve AI Teacher ${t.name} (${t.version})`, summary: `${t.subject} · ${t.grade}. Submitted by ${t.owner}. Not deployed until approved.`, requestedBy: t.owner, at: t.submittedAt ?? t.createdAt, status: "pending", institutionId: "inst-greenfield", href: "/institution/ai" })) : [];
    return [...ai, ...base];
  });
  const refresh = () => { ["approvals", "audit", "ai-teachers"].forEach((k) => qc.invalidateQueries({ queryKey: ["inst", k] })); qc.invalidateQueries({ queryKey: ["ai-teachers"] }); };
  const decide = useMutation({
    mutationFn: async (v: { a: ApprovalItem; d: "approved" | "rejected"; reason?: string }) => {
      if (v.a.id.startsWith("ait:")) { const id = v.a.id.slice(4); if (v.d === "approved") await aiTeacherService.approve(id, ACTOR); else await aiTeacherService.reject(id, v.reason ?? ""); governanceService.record({ actor: ACTOR, actorRole: "Institution admin", action: v.d === "approved" ? "Approved AI Teacher" : "Rejected AI Teacher", category: "AI Teacher publication", target: v.a.title, context: v.reason ?? "Approvals queue" }); return; }
      await governanceService.decide(v.a.id, v.d, ACTOR, v.reason);
    },
    onSuccess: (_, v) => { toast.success(v.d === "approved" ? "Approved and recorded in the audit trail." : "Rejected — requester will see the reason."); refresh(); setRej(null); }, onError: onErr,
  });
  return (
    <div>
      <div className="mb-3"><Segmented label="Status" value={status} onChange={setStatus} options={[{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }]} /></div>
      <ListToolbar query={q} onQuery={setQ} placeholder="Search approvals" hasFilters={!!kind} onClear={() => { setQ(""); setKind(""); }}>
        <Select aria-label="Kind" className="w-auto" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">All kinds</option>{["ai-teacher", "marksheet", "agent-action", "programme", "intervention", "content", "data-export"].map((k) => <option key={k}>{k}</option>)}</Select>
      </ListToolbar>
      <Q q={list}>{(rows) => { const f = rows.filter((a) => (!kind || a.kind === kind) && (!q || (a.title + a.summary).toLowerCase().includes(q.toLowerCase())));
        if (!rows.length) return <EmptyState title={status === "pending" ? "Nothing waiting" : `No ${status} items`} body="Interventions from the AI Workspace, AI Teacher requests, marksheets and agent actions will appear here." />;
        if (!f.length) return <NoResults query={q} onClear={() => { setQ(""); setKind(""); }} />;
        return <ul className="space-y-3">{f.map((a) => (
          <li key={a.id}><Card className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><div className="mb-1 flex flex-wrap gap-2"><Badge tone="primary">{a.kind}</Badge><StatusBadge status={a.status} /></div><h3 className="font-semibold">{a.title}</h3><p className="mt-1 text-sm text-text-2">{a.summary}</p><p className="mt-1 text-xs text-text-2">Requested by {a.requestedBy} · {relTime(a.at)}{a.decidedBy && ` · decided by ${a.decidedBy}`}{a.reason && ` · reason: ${a.reason}`}</p></div>
              {a.status === "pending" && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setRej(a)}>Reject</Button><Button size="sm" onClick={() => setOk(a)}>Approve</Button></div>}</div>
          </Card></li>))}</ul>; }}</Q>
      <ConfirmDialog open={!!ok} onOpenChange={(v) => !v && setOk(null)} title="Approve this request?" body={ok ? `${ok.title}. This is recorded in the audit trail and takes effect immediately.` : ""} confirmLabel="Approve" onConfirm={() => ok && decide.mutate({ a: ok, d: "approved" })} />
      <ReasonModal open={!!rej} onOpenChange={(v) => !v && setRej(null)} title="Reject request" confirmLabel="Reject" busy={decide.isPending} onSubmit={(reason) => rej && decide.mutate({ a: rej, d: "rejected", reason })} />
    </div>
  );
}

function Audit() {
  const [f, setF] = React.useState({ q: "", category: "", outcome: "", actorRole: "" }); const [sel, setSel] = React.useState<AuditEvent | null>(null);
  const list = useQ(["audit", f.q, f.category, f.outcome, f.actorRole], () => governanceService.audit(f));
  const clear = () => setF({ q: "", category: "", outcome: "", actorRole: "" });
  return (
    <div>
      <ListToolbar query={f.q} onQuery={(q) => setF({ ...f, q })} placeholder="Search actor, action or target" hasFilters={!!(f.category || f.outcome || f.actorRole)} onClear={clear} count={list.data?.length}>
        <Select aria-label="Category" className="w-auto" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">All categories</option>{AUDIT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
        <Select aria-label="Outcome" className="w-auto" value={f.outcome} onChange={(e) => setF({ ...f, outcome: e.target.value })}><option value="">Any outcome</option>{["success", "denied", "failed", "pending"].map((c) => <option key={c}>{c}</option>)}</Select>
        <Select aria-label="Actor role" className="w-auto" value={f.actorRole} onChange={(e) => setF({ ...f, actorRole: e.target.value })}><option value="">Any actor</option>{["Institution admin", "Branch admin", "Teacher", "Finance staff", "Parent", "Agent", "Government"].map((c) => <option key={c}>{c}</option>)}</Select>
        <Button size="sm" variant="outline" onClick={() => simulateExport("Audit trail", "Governance")}>Export (demo)</Button>
      </ListToolbar>
      <Q q={list} rows={5} h="h-12">{(rows) => !rows.length ? <NoResults query={f.q} onClear={clear} /> : <DataTable ariaLabel="Audit trail" rows={rows} rowKey={(r) => r.id} onRowClick={setSel} pageSize={10} cols={[
        { key: "at", header: "When", cell: (r) => <span className="tnum whitespace-nowrap text-xs">{fmtDateTime(r.at)}</span>, sort: (a, b) => a.at.localeCompare(b.at) },
        { key: "actor", header: "Actor", cell: (r) => <span><span className="font-semibold">{r.actor}</span><span className="block text-xs text-text-2">{r.actorRole}</span></span>, sort: (a, b) => a.actor.localeCompare(b.actor) },
        { key: "action", header: "Action", cell: (r) => <span>{r.action}<span className="block text-xs text-text-2">{r.category}</span></span> },
        { key: "target", header: "Target", cell: (r) => <span className="line-clamp-2 text-xs">{r.target}</span> },
        { key: "out", header: "Outcome", cell: (r) => <StatusBadge status={r.outcome === "success" ? "approved" : r.outcome === "denied" ? "rejected" : r.outcome === "failed" ? "failed" : "pending"} label={r.outcome} /> },
      ]} />}</Q>
      <Drawer open={!!sel} onOpenChange={(v) => !v && setSel(null)} title="Audit event">
        {sel && <dl className="space-y-3 text-sm">{([["Event ID", sel.id], ["Timestamp", fmtDateTime(sel.at)], ["Actor", `${sel.actor} (${sel.actorRole})`], ["Action", sel.action], ["Category", sel.category], ["Target", sel.target], ["Context", sel.context], ["Outcome", sel.outcome]] as const).map(([k, v]) => <div key={k}><dt className="text-xs font-semibold text-text-2">{k}</dt><dd>{v}</dd></div>)}<p className="rounded-xl bg-surface-2 p-3 text-xs text-text-2">Audit events are append-only in this prototype: they can be filtered and exported, never edited or deleted.</p></dl>}
      </Drawer>
    </div>
  );
}

function Roles() {
  return (
    <div className="space-y-4">
      <Panel title="Role-based access matrix (illustrative)">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm" aria-label="Role-based access matrix"><thead><tr className="text-left text-xs text-text-2"><th className="p-2">Area</th>{ROLE_MATRIX.map((r) => <th key={r.id} className="p-2">{r.label}</th>)}</tr></thead>
          <tbody>{ROLE_MATRIX_AREAS.map((a) => <tr key={a} className="border-t border-border"><th scope="row" className="p-2 text-left font-medium">{a}</th>{ROLE_MATRIX.map((r) => <td key={r.id} className="p-2"><Badge tone={ACCESS_TONE[r.permissions[a]]}>{r.permissions[a]}</Badge></td>)}</tr>)}</tbody></table></div>
        <p className="mt-3 text-xs text-text-2">full = create/change/approve · scoped = own branch/class only · view = read-only · none = no access. Finance staff see only fees and the people needed to reconcile them.</p>
      </Panel>
    </div>
  );
}

function Consent() {
  const qc = useQueryClient();
  const c = useQ(["consent"], () => governanceService.consents()); const pol = useQ(["policies"], () => governanceService.policies());
  const upd = useMutation({ mutationFn: (v: { id: string; s: "granted" | "pending" | "withdrawn" }) => governanceService.updateConsent(v.id, v.s, ACTOR), onSuccess: () => { toast.success("Consent state recorded."); qc.invalidateQueries({ queryKey: ["inst", "consent"] }); qc.invalidateQueries({ queryKey: ["inst", "audit"] }); }, onError: onErr });
  return (
    <div className="space-y-5">
      <Panel title="Consent states">
        <Q q={c}>{(rows) => <DataTable ariaLabel="Consent records" rows={rows} rowKey={(r) => r.id} pageSize={8} cols={[
          { key: "s", header: "Student", cell: (r) => <span className="font-semibold">{r.subject}</span>, sort: (a, b) => a.subject.localeCompare(b.subject) },
          { key: "g", header: "Guardian", cell: (r) => r.guardian }, { key: "k", header: "Consent for", cell: (r) => r.kind },
          { key: "st", header: "State", cell: (r) => <StatusBadge status={r.state === "granted" ? "approved" : r.state === "withdrawn" ? "revoked" : r.state === "pending" ? "pending" : "neutral"} label={r.state} /> },
          { key: "v", header: "Policy", cell: (r) => `v${r.policyVersion}` },
          { key: "a", header: "", cell: (r) => r.state === "not-required" ? null : <div className="flex gap-1"><Button size="sm" variant="outline" disabled={r.state === "granted" || upd.isPending} onClick={() => upd.mutate({ id: r.id, s: "granted" })}>Record granted</Button><Button size="sm" variant="ghost" disabled={r.state === "withdrawn" || upd.isPending} onClick={() => upd.mutate({ id: r.id, s: "withdrawn" })}>Withdraw</Button></div> },
        ]} />}</Q>
        <p className="mt-2 text-xs text-text-2">Guardians give consent in the Parent experience; staff can only record a consent confirmed offline, and that action is audited. Students 18+ (university) consent for themselves.</p>
      </Panel>
      <Panel title="Student notice & AI data-access permissions"><ul className="space-y-2 text-sm"><li><strong>Student notice:</strong> shown at first sign-in in plain language, with a teacher-readable summary.</li><li><strong>AI data access:</strong> AI Teachers use only class-scoped learning data; personal AI keys for students need age, guardian consent and institutional policy to all be satisfied.</li></ul></Panel>
      <Panel title="Policy versions"><Q q={pol} rows={2}>{(rows) => <ul className="divide-y divide-border">{rows.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span><span className="font-semibold">{p.name}</span> · v{p.version}<span className="block text-xs text-text-2">{p.summary}</span></span><span className="flex items-center gap-2 text-xs"><Badge tone={p.status === "current" ? "success" : p.status === "upcoming" ? "warning" : "neutral"}>{p.status}</Badge>effective {p.effective}</span></li>)}</ul>}</Q></Panel>
    </div>
  );
}

function Sharing() {
  const qc = useQueryClient(); const s = useQ(["sharing"], () => governanceService.sharing());
  const m = useMutation({ mutationFn: (v: { id: string; st: "active" | "revoked" }) => governanceService.setSharing(v.id, v.st), onSuccess: () => { toast.success("Sharing policy updated."); qc.invalidateQueries({ queryKey: ["inst", "sharing"] }); qc.invalidateQueries({ queryKey: ["inst", "audit"] }); }, onError: onErr });
  return (
    <div>
      <DemoNote tone="info">Cross-institution sharing is explicit, consent-based and scoped. Each institution is its own tenant; nothing is shared by default.</DemoNote>
      <Q q={s}>{(rows) => <ul className="space-y-3">{rows.map((r) => <li key={r.id}><Card className="flex flex-wrap items-start justify-between gap-3 p-4"><div><div className="mb-1 flex gap-2"><h3 className="font-semibold">{r.partner}</h3><StatusBadge status={r.state} /></div><p className="text-sm">{r.scope}</p><p className="text-xs text-text-2">Purpose: {r.purpose} · Basis: {r.consent} · Expires {r.expires}</p></div><div className="flex gap-2">{r.state === "active" && <Button size="sm" variant="outline" disabled={m.isPending} onClick={() => m.mutate({ id: r.id, st: "revoked" })}>Revoke</Button>}{r.state === "requested" && <Button size="sm" disabled={m.isPending} onClick={() => m.mutate({ id: r.id, st: "active" })}>Approve sharing</Button>}{r.state === "revoked" && <Button size="sm" variant="outline" disabled={m.isPending} onClick={() => m.mutate({ id: r.id, st: "active" })}>Re-enable</Button>}</div></Card></li>)}</ul>}</Q>
    </div>
  );
}

function Retention() {
  const r = useQ(["retention"], () => governanceService.retention()); const d = useQ(["datacat"], () => governanceService.dataCategories());
  return (
    <div className="space-y-5">
      <Panel title="Retention, archive & delete policies"><Q q={r} rows={2}>{(rows) => <DataTable ariaLabel="Retention rules" rows={rows} rowKey={(x) => x.id} cols={[{ key: "r", header: "Record", cell: (x) => <b>{x.record}</b> }, { key: "u", header: "Rule", cell: (x) => x.rule }, { key: "a", header: "Action", cell: (x) => <Badge>{x.action}</Badge> }, { key: "n", header: "Next run", cell: (x) => x.next }]} />}</Q></Panel>
      <Panel title="Data category catalogue"><Q q={d} rows={2}>{(rows) => <DataTable ariaLabel="Data categories" rows={rows} rowKey={(x) => x.name} cols={[{ key: "n", header: "Category", cell: (x) => <b>{x.name}</b> }, { key: "e", header: "Examples", cell: (x) => x.examples }, { key: "s", header: "Sensitivity", cell: (x) => <Badge tone={x.sensitivity === "Sensitive" ? "danger" : "neutral"}>{x.sensitivity}</Badge> }, { key: "r", header: "Retention", cell: (x) => x.retention }, { key: "l", header: "Basis", cell: (x) => x.lawful }]} />}</Q></Panel>
    </div>
  );
}

function Exports() {
  const qc = useQueryClient(); const l = useQ(["exports"], () => governanceService.exports());
  const [kind, setKind] = React.useState("Student roster (CSV)"); const [scope, setScope] = React.useState("");
  const done = () => { qc.invalidateQueries({ queryKey: ["inst", "exports"] }); qc.invalidateQueries({ queryKey: ["inst", "audit"] }); };
  const add = useMutation({ mutationFn: () => governanceService.requestExport(kind, scope, ACTOR), onSuccess: () => { toast.success("Export request raised."); setScope(""); done(); }, onError: onErr });
  const dec = useMutation({ mutationFn: (v: { id: string; ok: boolean }) => governanceService.decideExport(v.id, v.ok), onSuccess: () => { toast.success("Decision recorded."); done(); }, onError: onErr });
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2"><Q q={l}>{(rows) => <DataTable ariaLabel="Export requests" rows={rows} rowKey={(r) => r.id} cols={[{ key: "i", header: "ID", cell: (r) => r.id }, { key: "k", header: "Export", cell: (r) => <span><b>{r.kind}</b><span className="block text-xs text-text-2">{r.scope} · {r.requestedBy}</span></span> }, { key: "s", header: "Status", cell: (r) => <StatusBadge status={r.status} /> }, { key: "a", header: "", cell: (r) => r.status === "pending" ? <div className="flex gap-1"><Button size="sm" onClick={() => dec.mutate({ id: r.id, ok: true })}>Approve</Button><Button size="sm" variant="ghost" onClick={() => dec.mutate({ id: r.id, ok: false })}>Reject</Button></div> : r.status === "ready" ? <Button size="sm" variant="outline" onClick={() => simulateExport(r.kind, "Governance")}>Download (demo)</Button> : null }]} />}</Q></div>
      <Panel title="Request a data export">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
          <Field label="Export type" htmlFor="ex-k"><Select id="ex-k" value={kind} onChange={(e) => setKind(e.target.value)}>{["Student roster (CSV)", "Fee ledger (CSV)", "Marksheets (PDF bundle)", "Audit events (CSV)", "Consent register (CSV)"].map((k) => <option key={k}>{k}</option>)}</Select></Field>
          <Field label="Scope" htmlFor="ex-s" hint="e.g. Grade 8 · North Campus" required><Input id="ex-s" value={scope} onChange={(e) => setScope(e.target.value)} /></Field>
          <Button type="submit" loading={add.isPending} className="w-full">Submit request</Button>
        </form>
      </Panel>
    </div>
  );
}

function Tenant() {
  const qc = useQueryClient(); const t = useQ(["tenant"], () => governanceService.tenant());
  const m = useMutation({ mutationFn: (p: Record<string, unknown>) => governanceService.updateTenant(p as never), onSuccess: () => { toast.success("Tenant setting saved."); qc.invalidateQueries({ queryKey: ["inst", "tenant"] }); qc.invalidateQueries({ queryKey: ["inst", "audit"] }); }, onError: onErr });
  return <Q q={t}>{(d) => (
    <Panel title="Tenant settings">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Institution name" htmlFor="t-n"><Input id="t-n" defaultValue={d.name} onBlur={(e) => e.target.value.trim().length > 3 && e.target.value !== d.name && m.mutate({ name: e.target.value.trim() })} /></Field>
        <Field label="Default language" htmlFor="t-l"><Select id="t-l" value={d.language} onChange={(e) => m.mutate({ language: e.target.value })}>{["English", "Hindi", "Tamil"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Timezone" htmlFor="t-z"><Select id="t-z" value={d.timezone} onChange={(e) => m.mutate({ timezone: e.target.value })}><option>Asia/Kolkata</option><option>Asia/Dubai</option></Select></Field>
        <Field label="Session timeout (minutes)" htmlFor="t-s"><Select id="t-s" value={d.sessionTimeoutMin} onChange={(e) => m.mutate({ sessionTimeoutMin: Number(e.target.value) })}>{[15, 30, 60].map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <div className="flex items-center justify-between rounded-xl border border-border p-3"><span className="text-sm font-medium">Require MFA for admins (demo)</span><Switch checked={d.mfaForAdmins} onChange={(v) => m.mutate({ mfaForAdmins: v })} label="Require MFA for admins" /></div>
        <div className="flex items-center justify-between rounded-xl border border-border p-3"><span className="text-sm font-medium">Fees module enabled</span><Switch checked={d.feesEnabled} onChange={(v) => m.mutate({ feesEnabled: v })} label="Fees module enabled" /></div>
      </div>
      <p className="mt-3 text-xs text-text-2">Each change is audited under “Tenant settings”. Government policy sits above and may lock some settings.</p>
    </Panel>)}</Q>;
}
