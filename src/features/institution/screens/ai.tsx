"use client";
import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Robot } from "@phosphor-icons/react";
import { PageHeader, Segmented, Card, Button, Badge, StatusBadge, AIBadge, Avatar, Drawer, Modal, Field, Input, Select, Checkbox, ListToolbar, NoResults, EmptyState, ConfirmDialog, toast } from "@/components/ui";
import { aiTeacherService, isDeployed } from "@/lib/api/aiTeacherService";
import { agentService } from "@/lib/api/agentService";
import { governanceService } from "@/lib/api/governanceService";
import { TEACHERS } from "@/lib/mock-data/core";
import type { AITeacherRecord, AgentRecord } from "@/types/teacher";
import { relTime, fmtDateTime } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { useQ, Q, DemoNote, onErr, Panel, ReasonModal, ACTOR, DataTable } from "../kit";

const CLASSES = [{ id: "cls-8b", label: "Grade 8 · B" }, { id: "cls-8a", label: "Grade 8 · A" }, { id: "cls-7a", label: "Grade 7 · A" }, { id: "cls-9c", label: "Grade 9 · C" }];
const FUNCS = ["Answer questions", "Teach", "Give feedback", "Create practice tests"];
const schema = z.object({ name: z.string().min(3, "Name needs 3+ characters"), subject: z.string().min(2, "Choose a subject"), grade: z.string().min(2, "Enter grades, e.g. Grades 6–8"), personality: z.string().min(10, "Describe the teaching style (10+ characters)"), source: z.string().min(3, "Add an approved source") });
type Tab = "teachers" | "roster" | "agents" | "history";
const audit = <Link href="/institution/governance?tab=audit" className="text-xs underline">Audit trail</Link>;

export default function AIScreen(_: ScreenProps) {
  const [tab, setTab] = React.useState<Tab>("teachers");
  return (
    <div>
      <PageHeader title="AI Teachers & Agents" subtitle="Approve, deploy and monitor institution-governed AI. These are not a student's personal AI Tutor." />
      <DemoNote>Prototype: AI Teachers and agents are simulated. Unapproved AI Teachers are never shown as deployed, and consequential agent actions always need a person.</DemoNote>
      <div className="mb-5 overflow-x-auto"><Segmented label="AI sections" value={tab} onChange={setTab} options={[{ value: "teachers", label: "AI Teachers" }, { value: "roster", label: "Roster" }, { value: "agents", label: "Agents" }, { value: "history", label: "Execution history" }]} /></div>
      {tab === "teachers" && <Teachers />}{tab === "roster" && <Roster />}{tab === "agents" && <Agents />}{tab === "history" && <History />}
    </div>
  );
}

function Teachers() {
  const qc = useQueryClient(); const [q, setQ] = React.useState(""); const [st, setSt] = React.useState(""); const [sel, setSel] = React.useState<string | null>(null); const [create, setCreate] = React.useState(false);
  const [rej, setRej] = React.useState<AITeacherRecord | null>(null); const [sus, setSus] = React.useState<AITeacherRecord | null>(null); const [ret, setRet] = React.useState<AITeacherRecord | null>(null); const [asg, setAsg] = React.useState<AITeacherRecord | null>(null);
  const list = useQ(["ai-teachers"], () => aiTeacherService.list());
  const usage = useQ(["ai-usage", sel ?? ""], () => (sel ? aiTeacherService.usage(sel) : Promise.resolve(null)));
  const inval = () => { qc.invalidateQueries({ queryKey: ["inst", "ai-teachers"] }); qc.invalidateQueries({ queryKey: ["inst", "approvals"] }); qc.invalidateQueries({ queryKey: ["inst", "audit"] }); qc.invalidateQueries({ queryKey: ["ai-teachers"] }); };
  const rec = (a: string, t: AITeacherRecord, ctx = "AI Teachers governance") => governanceService.record({ actor: ACTOR, actorRole: "Institution admin", action: a, category: "AI Teacher publication", target: `AI Teacher · ${t.name} ${t.version}`, context: ctx });
  const act = useMutation({ mutationFn: async (v: { k: "approve" | "reject" | "suspend" | "reinstate" | "retire"; t: AITeacherRecord; reason?: string }) => { const r = v.k === "approve" ? await aiTeacherService.approve(v.t.id, ACTOR) : v.k === "reject" ? await aiTeacherService.reject(v.t.id, v.reason ?? "") : v.k === "suspend" ? await aiTeacherService.suspend(v.t.id, v.reason) : v.k === "reinstate" ? await aiTeacherService.reinstate(v.t.id) : await aiTeacherService.retire(v.t.id); rec(`${v.k[0].toUpperCase()}${v.k.slice(1)}${v.k.endsWith("e") ? "d" : "ed"} AI Teacher`, v.t, v.reason); return r; }, onSuccess: (_, v) => { toast.success(`AI Teacher ${v.k === "approve" ? "approved — status updated for teachers and students" : v.k + (v.k.endsWith("e") ? "d" : "ed")}.`); inval(); setRej(null); setSus(null); setRet(null); }, onError: onErr });
  const rows = (list.data ?? []).filter((t) => (!q || `${t.name} ${t.subject}`.toLowerCase().includes(q.toLowerCase())) && (!st || t.status === st));
  const clear = () => { setQ(""); setSt(""); };
  const cur = list.data?.find((t) => t.id === sel);
  return (
    <div>
      <ListToolbar query={q} onQuery={setQ} placeholder="Search AI Teachers" count={rows.length} hasFilters={!!st} onClear={clear}>
        <Select aria-label="Status" className="w-auto" value={st} onChange={(e) => setSt(e.target.value)}><option value="">Any status</option>{["draft", "awaiting-approval", "approved", "rejected", "suspended", "retired"].map((s) => <option key={s}>{s}</option>)}</Select>
        <Button onClick={() => setCreate(true)}><Plus size={14} /> Create AI Teacher</Button>
      </ListToolbar>
      <Q q={list}>{(all) => !all.length ? <EmptyState icon={<Robot size={28} />} title="No AI Teachers" body="Create one or adopt from the marketplace." /> : !rows.length ? <NoResults query={q} onClear={clear} /> : (
        <div className="grid gap-3 md:grid-cols-2">{rows.map((t) => (
          <Card key={t.id} className="p-4"><div className="flex items-start gap-3"><Avatar name={t.name} color={t.avatarColor} ai size={44} />
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><h3 className="font-bold">{t.name}</h3><Badge tone="ai">AI Teacher</Badge><StatusBadge status={t.status} /></div>
              <p className="text-xs text-text-2">{t.subject} · {t.grade} · {t.version} · owner: {t.owner}</p>
              <p className="mt-1 text-xs"><Badge tone={isDeployed(t) ? "success" : "neutral"}>{isDeployed(t) ? `Deployed to ${t.assignments.filter((a) => a.status === "active").length} class(es)` : "Not deployed"}</Badge></p>
              {t.suspendedReason && <p className="mt-1 text-xs text-danger">{t.suspendedReason}</p>}{t.rejectionReason && <p className="mt-1 text-xs text-danger">Rejected: {t.rejectionReason}</p>}</div></div>
            <div className="mt-3 flex flex-wrap gap-2">
              {t.status === "awaiting-approval" && <><Button size="sm" onClick={() => act.mutate({ k: "approve", t })} loading={act.isPending && act.variables?.t.id === t.id}>Approve</Button><Button size="sm" variant="outline" onClick={() => setRej(t)}>Reject</Button></>}
              {t.status === "approved" && <><Button size="sm" variant="outline" onClick={() => setAsg(t)}>Deploy to class</Button><Button size="sm" variant="ghost" onClick={() => setSus(t)}>Suspend</Button></>}
              {t.status === "suspended" && <Button size="sm" variant="outline" onClick={() => act.mutate({ k: "reinstate", t })}>Reinstate</Button>}
              {!["retired", "awaiting-approval"].includes(t.status) && <Button size="sm" variant="ghost" onClick={() => setRet(t)}>Retire</Button>}
              <Button size="sm" variant="ghost" onClick={() => setSel(t.id)}>Usage & history</Button></div></Card>))}</div>)}</Q>
      <Drawer open={!!sel} onOpenChange={(v) => !v && setSel(null)} title={cur ? `${cur.name} · AI Teacher` : ""} width="sm:max-w-lg">
        {cur && <div className="space-y-4 text-sm"><AIBadge label="AI Teacher" />
          <Q q={usage} rows={1}>{(u) => u && <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-surface-2 p-2"><p className="tnum text-lg font-bold">{u.sessions.toLocaleString("en-IN")}</p><p className="text-xs text-text-2">Sessions</p></div><div className="rounded-xl bg-surface-2 p-2"><p className="tnum text-lg font-bold">{u.students}</p><p className="text-xs text-text-2">Students</p></div><div className="rounded-xl bg-surface-2 p-2"><p className="tnum text-lg font-bold">{u.escalations}</p><p className="text-xs text-text-2">Escalations</p></div></div>}</Q>
          <Panel title="Student feedback">{cur.feedback.length ? <ul className="space-y-2">{cur.feedback.map((f) => <li key={f.id}><b>{f.rating}/5</b> · {f.student}<span className="block text-xs text-text-2">{f.comment}</span></li>)}</ul> : <p className="text-text-2">No feedback yet.</p>}</Panel>
          <Panel title="Assignments">{cur.assignments.length ? <ul className="space-y-1">{cur.assignments.map((a) => <li key={a.id} className="flex items-center justify-between gap-2"><span>{a.targetLabel}<span className="block text-xs text-text-2">{a.functions.join(", ")}</span></span><span className="flex gap-1"><StatusBadge status={a.status} /><Button size="sm" variant="ghost" onClick={() => aiTeacherService.unassign(cur.id, a.id).then(() => { toast.success("Unassigned."); inval(); }).catch(onErr)}>Remove</Button></span></li>)}</ul> : <p className="text-text-2">Not assigned to any class.</p>}</Panel>
          <Panel title="History" action={audit}><ul className="space-y-1 text-xs">{cur.history.slice(0, 8).map((h, i) => <li key={i}>{relTime(h.at)} · {h.text}</li>)}</ul></Panel></div>}
      </Drawer>
      <CreateTeacher open={create} onClose={() => setCreate(false)} onDone={inval} />
      <ReasonModal open={!!rej} onOpenChange={(v) => !v && setRej(null)} title={`Reject ${rej?.name}`} confirmLabel="Reject" busy={act.isPending} onSubmit={(reason) => rej && act.mutate({ k: "reject", t: rej, reason })} />
      <ReasonModal open={!!sus} onOpenChange={(v) => !v && setSus(null)} title={`Suspend ${sus?.name}`} confirmLabel="Suspend" busy={act.isPending} onSubmit={(reason) => sus && act.mutate({ k: "suspend", t: sus, reason })} />
      <ConfirmDialog open={!!ret} onOpenChange={(v) => !v && setRet(null)} destructive title={`Retire ${ret?.name}?`} body="All class assignments are removed. This cannot be undone." confirmLabel="Retire" onConfirm={() => ret && act.mutate({ k: "retire", t: ret })} />
      <Assign t={asg} onClose={() => setAsg(null)} onDone={inval} />
    </div>
  );
}

function Assign({ t, onClose, onDone }: { t: AITeacherRecord | null; onClose: () => void; onDone: () => void }) {
  const [cls, setCls] = React.useState(CLASSES[0].id); const [fn, setFn] = React.useState<string[]>(["Answer questions"]);
  const m = useMutation({ mutationFn: () => aiTeacherService.assign(t!.id, { targetType: "class", targetId: cls, targetLabel: CLASSES.find((c) => c.id === cls)!.label, functions: fn, availability: "school-hours", assignedBy: ACTOR }), onSuccess: () => { toast.success("Deployed. Students in that class can now use this AI Teacher."); onDone(); onClose(); }, onError: onErr });
  return <Modal open={!!t} onOpenChange={(v) => !v && onClose()} title={`Deploy ${t?.name} (AI Teacher)`} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={() => m.mutate()}>Deploy</Button></>}>
    <div className="space-y-3"><Field label="Class" htmlFor="as-c"><Select id="as-c" value={cls} onChange={(e) => setCls(e.target.value)}>{CLASSES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field><fieldset className="space-y-2"><legend className="text-sm font-semibold">Permitted functions</legend>{FUNCS.map((f) => <Checkbox key={f} label={f} checked={fn.includes(f)} onChange={(v) => setFn(v ? [...fn, f] : fn.filter((x) => x !== f))} />)}</fieldset></div></Modal>;
}

function CreateTeacher({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const f = useForm<z.input<typeof schema>>({ resolver: zodResolver(schema) as never, defaultValues: { name: "", subject: "Mathematics", grade: "Grades 6–8", personality: "", source: "" } });
  const m = useMutation({ mutationFn: async (d: z.input<typeof schema>) => { const t = await aiTeacherService.create({ name: d.name, subject: d.subject, grade: d.grade, languages: ["English"], personality: d.personality, avatarColor: "#5146E5", sources: [d.source], tools: ["Answer questions", "Teach"], owner: "Greenfield International School", ownerType: "institution" }); await aiTeacherService.submitForApproval(t.id); return t; }, onSuccess: (t) => { toast.success(`${t.name} created and submitted for approval. It is not deployed until approved.`); onDone(); f.reset(); onClose(); }, onError: onErr });
  const e = f.formState.errors;
  return <Modal open={open} onOpenChange={(v) => !v && onClose()} title="Create AI Teacher" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={f.handleSubmit((d) => m.mutate(d))}>Create & submit</Button></>}>
    <form className="space-y-3" onSubmit={f.handleSubmit((d) => m.mutate(d))}>
      <Field label="Name" error={e.name?.message} required htmlFor="at-n"><Input id="at-n" aria-invalid={!!e.name} {...f.register("name")} /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Subject" error={e.subject?.message} htmlFor="at-s"><Select id="at-s" {...f.register("subject")}>{["Mathematics", "Science", "English", "Hindi", "Social Science", "Computer Science"].map((s) => <option key={s}>{s}</option>)}</Select></Field><Field label="Grades" error={e.grade?.message} htmlFor="at-g"><Input id="at-g" {...f.register("grade")} /></Field></div>
      <Field label="Teaching style" error={e.personality?.message} required htmlFor="at-p"><Input id="at-p" aria-invalid={!!e.personality} {...f.register("personality")} /></Field>
      <Field label="Approved source" error={e.source?.message} required htmlFor="at-so" hint="Textbook or document it may teach from"><Input id="at-so" aria-invalid={!!e.source} {...f.register("source")} /></Field><button type="submit" className="sr-only">Create</button>
    </form></Modal>;
}

function Roster() {
  const list = useQ(["ai-teachers"], () => aiTeacherService.list());
  return (
    <Q q={list}>{(ai) => (
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Human teachers"><ul className="space-y-2">{TEACHERS.map((t) => <li key={t.id} className="flex items-center gap-3"><Avatar name={t.displayName} color={t.avatarColor} size={34} /><span className="text-sm"><b>{t.title} {t.displayName}</b><span className="block text-xs text-text-2">{t.departmentName} · {t.classIds.length} classes</span></span><Badge className="ml-auto">Teacher</Badge></li>)}</ul></Panel>
        <Panel title="AI Teachers (not people)"><ul className="space-y-2">{ai.filter((t) => t.status !== "retired").map((t) => <li key={t.id} className="flex items-center gap-3"><Avatar name={t.name} color={t.avatarColor} ai size={34} /><span className="text-sm"><b>{t.name}</b><span className="block text-xs text-text-2">{t.subject} · {isDeployed(t) ? "Deployed" : "Not deployed"} · {t.status}</span></span><Badge tone="ai" className="ml-auto">AI Teacher</Badge></li>)}</ul></Panel>
      </div>)}</Q>
  );
}

function Agents() {
  const qc = useQueryClient(); const [sel, setSel] = React.useState<AgentRecord | null>(null); const [ret, setRet] = React.useState<AgentRecord | null>(null);
  const list = useQ(["agents"], () => agentService.list()); const hist = useQ(["agent-history", sel?.id ?? ""], () => (sel ? agentService.history(sel.id) : Promise.resolve([])));
  const m = useMutation({ mutationFn: async (v: { k: "approve" | "pause" | "resume" | "retire"; a: AgentRecord }) => { const r = v.k === "approve" ? await agentService.approve(v.a.id, ACTOR) : v.k === "pause" ? await agentService.pause(v.a.id) : v.k === "resume" ? await agentService.resume(v.a.id) : await agentService.retire(v.a.id); governanceService.record({ actor: ACTOR, actorRole: "Institution admin", action: `Agent ${v.k}`, category: "Agent execution", target: v.a.name, context: `Autonomy: ${v.a.autonomy}` }); return r; }, onSuccess: () => { toast.success("Agent updated."); qc.invalidateQueries({ queryKey: ["inst", "agents"] }); qc.invalidateQueries({ queryKey: ["inst", "audit"] }); setRet(null); }, onError: onErr });
  return (
    <div>
      <Q q={list}>{(rows) => !rows.length ? <EmptyState title="No agents" body="Teachers and the institution create agents; they appear here for governance." /> : (
        <ul className="space-y-3">{rows.map((a) => (
          <li key={a.id}><Card className="p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><h3 className="font-bold">{a.name}</h3><Badge tone="ai">Agent</Badge><StatusBadge status={a.status} /><Badge tone={a.autonomy === "autonomous" ? "warning" : "primary"}>Autonomy: {a.autonomy}</Badge><Badge tone={a.status === "awaiting-approval" ? "warning" : ["published", "paused"].includes(a.status) ? "success" : "neutral"}>{a.status === "awaiting-approval" ? "Approval pending" : ["published", "paused"].includes(a.status) ? "Approved" : "Not approved"}</Badge></div>
            <p className="mt-1 text-sm text-text-2">{a.description}</p><p className="mt-1 text-xs text-text-2">Owner: {a.ownerName} ({a.ownerLevel}) · {a.trigger.label} · scope: {a.dataScope.join(", ")} · {a.provider}/{a.model} · key: {a.keyLabel}</p></div>
            <div className="flex flex-wrap gap-2">{a.status === "awaiting-approval" && <Button size="sm" onClick={() => m.mutate({ k: "approve", a })}>Approve</Button>}{a.status === "published" && <Button size="sm" variant="outline" onClick={() => m.mutate({ k: "pause", a })}>Pause</Button>}{a.status === "paused" && <Button size="sm" variant="outline" onClick={() => m.mutate({ k: "resume", a })}>Resume</Button>}{a.status !== "retired" && <Button size="sm" variant="ghost" onClick={() => setRet(a)}>Retire</Button>}<Button size="sm" variant="ghost" onClick={() => setSel(a)}>History</Button></div></div></Card></li>))}</ul>)}</Q>
      <Drawer open={!!sel} onOpenChange={(v) => !v && setSel(null)} title={sel ? `${sel.name} · executions` : ""}><Q q={hist} rows={2}>{(h) => !h.length ? <p className="text-sm text-text-2">No runs yet.</p> : <ul className="space-y-2 text-sm">{h.map((r) => <li key={r.id} className="rounded-xl border border-border p-3"><div className="flex justify-between gap-2"><b>{r.action}</b><StatusBadge status={r.outcome} /></div><p className="text-xs text-text-2">{fmtDateTime(r.at)} · {r.scope} · audit ref {r.auditRef}</p></li>)}</ul>}</Q><div className="mt-3">{audit}</div></Drawer>
      <ConfirmDialog open={!!ret} onOpenChange={(v) => !v && setRet(null)} destructive title={`Retire ${ret?.name}?`} body="The agent stops permanently. Its history stays in the audit trail." confirmLabel="Retire" onConfirm={() => ret && m.mutate({ k: "retire", a: ret })} />
    </div>
  );
}

function History() {
  const h = useQ(["agent-history", "all"], () => agentService.history()); const l = useQ(["agents"], () => agentService.list());
  return <Q q={h}>{(rows) => !rows.length ? <EmptyState title="No executions yet" body="Agent runs will be listed with their approval outcome." /> : <DataTable ariaLabel="Agent execution history" rows={rows} rowKey={(r) => r.id} pageSize={10} cols={[{ key: "a", header: "Agent", cell: (r) => l.data?.find((x) => x.id === r.agentId)?.name ?? r.agentId }, { key: "ac", header: "Action", cell: (r) => r.action }, { key: "s", header: "Scope", cell: (r) => r.scope }, { key: "o", header: "Outcome", cell: (r) => <StatusBadge status={r.outcome} /> }, { key: "t", header: "When", cell: (r) => relTime(r.at), sort: (a, b) => a.at.localeCompare(b.at) }]} />}</Q>;
}
