"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "@phosphor-icons/react";
import { PageHeader, Segmented, Button, Badge, StatusBadge, StatTile, Modal, Field, Input, Select, ListToolbar, NoResults, EmptyState, toast, DemoTag } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { financeService } from "@/lib/api/financeService";
import { feeService } from "@/lib/api/feeService";
import type { FeePlan, AdjustmentRequest } from "@/types/institution";
import { fmtMoney, fmtDate, fmtDateTime } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { useQ, Q, DataTable, DemoNote, onErr, Panel, ReasonModal, simulateExport, useCtx } from "../kit";

const HEADS = ["Tuition", "Admission", "Examination", "Transport", "Laboratory", "Library", "Hostel", "Activity", "Miscellaneous (approved)"];
const schema = z.object({ name: z.string().min(5, "Name needs 5+ characters"), head: z.string().min(1), year: z.string().regex(/^\d{4}[–-]\d{2}$/, "Use 2026–27"), grade: z.string().min(2, "Enter grade or programme"), branch: z.string().min(1), amount: z.coerce.number().min(1, "Enter an amount above 0").max(1000000, "Amount too large"), dueDate: z.string().min(1, "Choose a due date"), split: z.string().regex(/^\d+(,\d+)*$/, "Use numbers like 40,30,30").refine((s) => s.split(",").reduce((a, b) => a + Number(b), 0) === 100, "Percentages must add to 100"), lateFee: z.string().min(2, "Describe the late-fee rule (or 'None')"), group: z.string().min(2, "Name the student group") });
type Tab = "overview" | "plans" | "invoices" | "payments" | "adjustments" | "reminders";

export default function FeesScreen(_: ScreenProps) {
  const { instName } = useCtx(); const qc = useQueryClient(); const [tab, setTab] = React.useState<Tab>("overview"); const [scope, setScope] = React.useState<"admin" | "finance">("admin");
  const en = useQ(["fees-enabled"], () => financeService.enabled());
  const on = useMutation({ mutationFn: (v: boolean) => financeService.setEnabled(v), onSuccess: () => { toast.success("Fees setting updated."); qc.invalidateQueries({ queryKey: ["inst", "fees-enabled"] }); }, onError: onErr });
  return (
    <div>
      <PageHeader title="Fees & Finance" subtitle={`${instName} · institutional fees only. Paid-course sales are in Courses & Content.`} actions={<><DemoTag label="Demo — no real gateway" /><Select aria-label="View as" className="h-9 w-auto text-xs" value={scope} onChange={(e) => setScope(e.target.value as "admin" | "finance")}><option value="admin">View as institution admin</option><option value="finance">View as finance staff (North Campus scope)</option></Select></>} />
      <Q q={en} rows={2}>{(enabled) => !enabled ? <EmptyState title="Fees are not enabled" body="This institution has not turned on fee management. Enable it to define fee structures and track dues." action={{ label: "Enable fees (demo)", onClick: () => on.mutate(true) }} /> : (
        <div>
          {scope === "finance" && <DemoNote tone="info">Finance staff see only authorised scope: North Campus accounts and adjustments. Lakeside data and AI/academic areas are hidden.</DemoNote>}
          <div className="mb-5 overflow-x-auto"><Segmented label="Fees sections" value={tab} onChange={setTab} options={[{ value: "overview", label: "Collections" }, { value: "plans", label: "Fee structures" }, { value: "invoices", label: "Invoices & dues" }, { value: "payments", label: "Payments" }, { value: "adjustments", label: "Refunds & concessions" }, { value: "reminders", label: "Reminders & reports" }]} /></div>
          {tab === "overview" && <Overview scope={scope} />}{tab === "plans" && <Plans />}{tab === "invoices" && <Invoices />}{tab === "payments" && <Payments />}{tab === "adjustments" && <Adjustments scope={scope} />}{tab === "reminders" && <Reminders />}
        </div>)}</Q>
    </div>
  );
}

const useConsole = () => useQ(["fees-console"], () => financeService.console());
function Overview({ scope }: { scope: "admin" | "finance" }) {
  const c = useConsole();
  return <Q q={c} rows={3} h="h-32">{(d) => (
    <div className="space-y-4"><DemoNote tone="info">Live from fee accounts: a parent's simulated payment appears here after it is made.</DemoNote>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><StatTile label="Assessed (net)" value={fmtMoney(d.summary.assessed)} /><StatTile label="Collected" value={fmtMoney(d.summary.collected)} /><StatTile label="Outstanding" value={fmtMoney(d.summary.outstanding)} /><StatTile label="Overdue accounts" value={d.summary.overdueAccounts} hint={`${d.summary.pending} pending/failed payments`} /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Outstanding by overdue bucket"><BarChart horizontal ariaLabel="Overdue buckets" data={d.buckets.map((b) => ({ label: b.label, value: b.v, color: b.label === "Not yet due" ? undefined : "#C0262D" }))} unit=" ₹" /></Panel>
        <Panel title="Collections by branch">{scope === "finance" ? <BarChart horizontal ariaLabel="By branch" unit=" ₹" data={[{ label: "North Campus", value: d.byBranch["North Campus"] }]} /> : <BarChart horizontal ariaLabel="By branch" unit=" ₹" data={Object.entries(d.byBranch).map(([label, value]) => ({ label, value }))} />}</Panel>
        <Panel title="Collections by grade"><BarChart horizontal ariaLabel="By grade" unit=" ₹" data={Object.entries(d.byGrade).map(([label, value]) => ({ label, value }))} /></Panel>
        <Panel title="Collections by fee head"><BarChart horizontal ariaLabel="By fee head" unit=" ₹" data={Object.entries(d.byHead).map(([label, value]) => ({ label, value }))} /></Panel>
        <Panel title="Collections by month" className="lg:col-span-2"><BarChart ariaLabel="By month" unit=" ₹" height={150} data={Object.entries(d.byMonth).map(([label, value]) => ({ label, value }))} /></Panel>
      </div></div>)}</Q>;
}

function Plans() {
  const qc = useQueryClient(); const [open, setOpen] = React.useState(false); const [q, setQ] = React.useState(""); const list = useQ(["fee-plans"], () => financeService.plans());
  const f = useForm<z.input<typeof schema>>({ resolver: zodResolver(schema) as never, defaultValues: { name: "", head: "Tuition", year: "2026–27", grade: "Grade 8", branch: "All branches", amount: 0, dueDate: "", split: "40,30,30", lateFee: "₹500 after 7 days", group: "All students in grade" } });
  const save = useMutation({ mutationFn: (d: z.input<typeof schema>) => { const pcts = d.split.split(",").map(Number); const due = new Date(d.dueDate); return financeService.savePlan({ name: d.name, head: d.head, year: d.year, programme: "K-12", grade: d.grade, branch: d.branch, amount: Number(d.amount), dueDate: due.toISOString(), installments: pcts.map((p, i) => ({ label: `Instalment ${i + 1}`, due: new Date(due.getTime() + i * 90 * 864e5).toISOString(), pct: p })), lateFee: d.lateFee, group: d.group }); }, onSuccess: () => { toast.success("Fee plan saved as draft."); setOpen(false); f.reset(); qc.invalidateQueries({ queryKey: ["inst", "fee-plans"] }); }, onError: onErr });
  const act = useMutation({ mutationFn: (id: string) => financeService.activatePlan(id), onSuccess: () => { toast.success("Fee plan activated."); qc.invalidateQueries({ queryKey: ["inst", "fee-plans"] }); }, onError: onErr });
  const e = f.formState.errors;
  return (
    <div><ListToolbar query={q} onQuery={setQ} placeholder="Search fee plans" onClear={() => setQ("")}><Button onClick={() => setOpen(true)}><Plus size={14} /> New fee plan</Button></ListToolbar>
      <Q q={list}>{(all) => { const rows = all.filter((p) => !q || `${p.name} ${p.head}`.toLowerCase().includes(q.toLowerCase())); return !all.length ? <EmptyState title="No fee structures" body="Create a plan per head, grade and branch." /> : !rows.length ? <NoResults query={q} onClear={() => setQ("")} /> : <DataTable ariaLabel="Fee plans" rows={rows} rowKey={(p) => p.id} cols={[{ key: "n", header: "Plan", cell: (p) => <span><b>{p.name}</b><span className="block text-xs text-text-2">{p.head} · {p.year} · {p.grade} · {p.branch} · {p.group}</span></span> }, { key: "a", header: "Amount", cell: (p) => fmtMoney(p.amount, p.currency), align: "right", sort: (a, b) => a.amount - b.amount }, { key: "i", header: "Instalments", cell: (p) => <span className="text-xs">{p.installments.map((i) => `${i.label} ${i.pct}% (${fmtDate(i.due, { day: "numeric", month: "short" })})`).join(" · ")}</span> }, { key: "l", header: "Late fee", cell: (p) => <span className="text-xs">{p.lateFee}</span> }, { key: "s", header: "Status", cell: (p) => <StatusBadge status={p.status} /> }, { key: "x", header: "", cell: (p) => p.status === "draft" ? <Button size="sm" onClick={() => act.mutate(p.id)}>Activate</Button> : null }]} />; }}</Q>
      <Modal open={open} onOpenChange={setOpen} className="sm:max-w-xl" title="New fee plan" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button loading={save.isPending} onClick={f.handleSubmit((d) => save.mutate(d))}>Save plan</Button></>}>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={f.handleSubmit((d) => save.mutate(d))}>
          <Field label="Plan name" error={e.name?.message} required htmlFor="fp-n" className="sm:col-span-2"><Input id="fp-n" aria-invalid={!!e.name} {...f.register("name")} /></Field>
          <Field label="Fee head" htmlFor="fp-h"><Select id="fp-h" {...f.register("head")}>{HEADS.map((h) => <option key={h}>{h}</option>)}</Select></Field>
          <Field label="Academic year" error={e.year?.message} htmlFor="fp-y"><Input id="fp-y" {...f.register("year")} /></Field>
          <Field label="Grade / programme" error={e.grade?.message} htmlFor="fp-g"><Input id="fp-g" {...f.register("grade")} /></Field>
          <Field label="Branch" htmlFor="fp-b"><Select id="fp-b" {...f.register("branch")}>{["All branches", "North Campus", "Lakeside Campus"].map((b) => <option key={b}>{b}</option>)}</Select></Field>
          <Field label="Amount (₹)" error={e.amount?.message} htmlFor="fp-a"><Input id="fp-a" type="number" aria-invalid={!!e.amount} {...f.register("amount")} /></Field>
          <Field label="First due date" error={e.dueDate?.message} htmlFor="fp-d"><Input id="fp-d" type="date" {...f.register("dueDate")} /></Field>
          <Field label="Instalment split (%)" error={e.split?.message} hint="e.g. 40,30,30" htmlFor="fp-s"><Input id="fp-s" {...f.register("split")} /></Field>
          <Field label="Applicable group" error={e.group?.message} htmlFor="fp-gr"><Input id="fp-gr" {...f.register("group")} /></Field>
          <Field label="Late-fee rule" error={e.lateFee?.message} htmlFor="fp-l" className="sm:col-span-2"><Input id="fp-l" {...f.register("lateFee")} /></Field><button type="submit" className="sr-only">Save</button>
        </form></Modal>
    </div>
  );
}

function Invoices() {
  const c = useConsole(); const [q, setQ] = React.useState(""); const [st, setSt] = React.useState("");
  return <Q q={c}>{(d) => { const rows = d.invoices.filter((i) => (!q || `${i.studentId} ${i.label}`.toLowerCase().includes(q.toLowerCase())) && (!st || i.status === st));
    return <div><ListToolbar query={q} onQuery={setQ} placeholder="Search by student or instalment" count={rows.length} hasFilters={!!st} onClear={() => { setQ(""); setSt(""); }}><Select aria-label="Status" className="w-auto" value={st} onChange={(e) => setSt(e.target.value)}><option value="">Any status</option>{["paid", "due", "overdue", "partially-paid", "upcoming"].map((s) => <option key={s}>{s}</option>)}</Select></ListToolbar>
      {!rows.length ? <NoResults query={q} onClear={() => { setQ(""); setSt(""); }} /> : <DataTable ariaLabel="Invoices and dues" rows={rows} rowKey={(i) => i.studentId + i.id} cols={[{ key: "s", header: "Student", cell: (i) => <span><b>{i.studentId.replace("stu-", "")}</b><span className="block text-xs text-text-2">{i.grade}</span></span> }, { key: "l", header: "Instalment", cell: (i) => i.label }, { key: "d", header: "Due", cell: (i) => fmtDate(i.dueDate), sort: (a, b) => a.dueDate.localeCompare(b.dueDate) }, { key: "a", header: "Amount", cell: (i) => fmtMoney(i.amount), align: "right" }, { key: "o", header: "Outstanding", cell: (i) => fmtMoney(i.due), align: "right", sort: (a, b) => a.due - b.due }, { key: "st", header: "Status", cell: (i) => <StatusBadge status={i.status} /> }]} />}</div>; }}</Q>;
}

function Payments() {
  const qc = useQueryClient(); const c = useConsole(); const [st, setSt] = React.useState("");
  const ref = useMutation({ mutationFn: (id: string) => feeService.refresh(id), onSuccess: () => { toast.success("Bank confirmation simulated: payment now successful."); qc.invalidateQueries({ queryKey: ["inst", "fees-console"] }); }, onError: onErr });
  return <Q q={c}>{(d) => { const rows = d.txns.filter((t) => !st || t.status === st); return <div><div className="mb-3"><Select aria-label="Payment status" className="w-auto" value={st} onChange={(e) => setSt(e.target.value)}><option value="">All statuses</option>{["Successful", "Pending", "Failed", "Partially Paid", "Refunded"].map((s) => <option key={s}>{s}</option>)}</Select></div>
    {!rows.length ? <EmptyState title="No payments match" body="Clear the status filter." /> : <DataTable ariaLabel="Payments" rows={rows} rowKey={(t) => t.id} cols={[{ key: "r", header: "Reference", cell: (t) => <span><code className="text-xs">{t.demoReference}</code><span className="block text-xs text-text-2">{t.studentId.replace("stu-", "")} · {t.methodLabel}</span></span> }, { key: "a", header: "Amount", cell: (t) => fmtMoney(t.amount), align: "right", sort: (a, b) => a.amount - b.amount }, { key: "d", header: "When", cell: (t) => fmtDateTime(t.initiatedAt), sort: (a, b) => a.initiatedAt.localeCompare(b.initiatedAt) }, { key: "s", header: "Status", cell: (t) => <StatusBadge status={t.status} /> }, { key: "rc", header: "Reconciliation", cell: (t) => <Badge tone={t.recon === "Reconciled" ? "success" : t.recon.startsWith("Awaiting") ? "warning" : "neutral"}>{t.recon}</Badge> }, { key: "x", header: "", cell: (t) => t.status === "Pending" ? <Button size="sm" variant="outline" onClick={() => ref.mutate(t.id)}>Simulate bank confirm</Button> : null }]} />}
    <p className="mt-2 text-xs text-text-2">Demo payments only. No gateway, card or bank data exists in this prototype.</p></div>; }}</Q>;
}

const KIND_LABEL: Record<string, string> = { refund: "Refund", adjustment: "Adjustment", concession: "Concession", scholarship: "Scholarship award" };
function Adjustments({ scope }: { scope: "admin" | "finance" }) {
  const qc = useQueryClient(); const l = useQ(["fee-adj"], () => financeService.adjustments()); const [rej, setRej] = React.useState<AdjustmentRequest | null>(null); const [sub, setSub] = React.useState<"money" | "concession" | "scholarship">("money");
  const m = useMutation({ mutationFn: (v: { a: AdjustmentRequest; ok: boolean; note: string }) => financeService.decide(v.a.id, v.ok, v.note), onSuccess: (a) => { toast.success(`${KIND_LABEL[a.kind]} ${a.status}.`); setRej(null); qc.invalidateQueries({ queryKey: ["inst", "fee-adj"] }); qc.invalidateQueries({ queryKey: ["inst", "audit"] }); }, onError: onErr });
  return <Q q={l}>{(all) => { const vis = all.filter((a) => scope === "admin" || a.branchId === "br-north"); const rows = vis.filter((a) => sub === "money" ? ["refund", "adjustment"].includes(a.kind) : a.kind === sub);
    return <div><div className="mb-3"><Segmented label="Type" value={sub} onChange={setSub} options={[{ value: "money", label: "Refunds & adjustments", count: vis.filter((a) => ["refund", "adjustment"].includes(a.kind)).length }, { value: "concession", label: "Concessions" }, { value: "scholarship", label: "Scholarship awards" }]} /></div>
      {sub === "scholarship" && <DemoNote tone="info">Scholarship awards are shown separately from payments: they reduce what a student owes; they are not money received.</DemoNote>}
      {!rows.length ? <EmptyState title="Nothing here" body="Requests raised by finance staff or parents appear for approval." /> : <ul className="space-y-2">{rows.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3 text-sm"><span><b>{KIND_LABEL[a.kind]}</b> · {a.student} ({a.grade}) · <span className="tnum font-semibold">{fmtMoney(a.amount)}</span> · {a.head}<span className="block text-xs text-text-2">{a.reason}{a.decidedNote && ` · ${a.decidedNote}`}</span></span><span className="flex items-center gap-2"><StatusBadge status={a.status} />{a.status === "pending" && <><Button size="sm" onClick={() => m.mutate({ a, ok: true, note: "Approved" })} loading={m.isPending && m.variables?.a.id === a.id}>Approve</Button><Button size="sm" variant="outline" onClick={() => setRej(a)}>Reject</Button></>}</span></li>)}</ul>}
      <ReasonModal open={!!rej} onOpenChange={(v) => !v && setRej(null)} title={`Reject ${rej ? KIND_LABEL[rej.kind].toLowerCase() : ""}`} confirmLabel="Reject" busy={m.isPending} onSubmit={(note) => rej && m.mutate({ a: rej, ok: false, note })} /></div>; }}</Q>;
}

function Reminders() {
  const qc = useQueryClient(); const log = useQ(["fee-rem"], () => financeService.reminders()); const c = useConsole(); const [aud, setAud] = React.useState("overdue");
  const n = (d: NonNullable<typeof c.data>) => aud === "overdue" ? d.invoices.filter((i) => i.status === "overdue").length : aud === "due" ? d.invoices.filter((i) => i.status === "due").length : d.invoices.filter((i) => i.due > 0).length;
  const send = useMutation({ mutationFn: () => financeService.sendReminders(aud === "overdue" ? "Overdue accounts" : aud === "due" ? "Due this week" : "All outstanding", c.data ? n(c.data) : 0), onSuccess: (r) => { toast.success(`Reminder to ${r.count} account(s) simulated. Nothing was actually sent.`); qc.invalidateQueries({ queryKey: ["inst", "fee-rem"] }); }, onError: onErr });
  return <div className="grid gap-4 lg:grid-cols-2"><Panel title="Send reminders (simulated)"><Field label="Audience" htmlFor="rm-a"><Select id="rm-a" value={aud} onChange={(e) => setAud(e.target.value)}><option value="overdue">Overdue accounts</option><option value="due">Due this week</option><option value="all">All outstanding</option></Select></Field><p className="my-2 text-sm text-text-2">{c.data ? `${n(c.data)} matching instalment(s).` : "Counting…"}</p><Button loading={send.isPending} disabled={!c.data} onClick={() => send.mutate()}>Send reminder</Button></Panel>
    <Panel title="Reports"><div className="flex flex-wrap gap-2">{["Collections summary", "Outstanding dues", "Payment reconciliation", "Concessions & scholarships"].map((r) => <Button key={r} variant="outline" size="sm" onClick={() => simulateExport(r, "Fees")}>{r} (demo export)</Button>)}</div></Panel>
    <Panel title="Reminder log" className="lg:col-span-2"><Q q={log} rows={1}>{(rows) => !rows.length ? <p className="text-sm text-text-2">No reminders sent.</p> : <ul className="space-y-1 text-sm">{rows.map((r) => <li key={r.id}>{fmtDateTime(r.at)} · {r.audience} · {r.count} accounts · {r.channel}</li>)}</ul>}</Q></Panel></div>;
}
