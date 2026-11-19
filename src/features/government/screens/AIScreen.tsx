"use client";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, CardBody, EmptyState, Field, Input, Modal, PageHeader, Segmented, Select, StatTile, StatusBadge, Skeleton, ConfirmDialog, toast, Avatar, AIBadge } from "@/components/ui";
import { Plus, Info } from "@phosphor-icons/react";
import type { ScreenProps } from "@/types/screens";
import type { AITeacherRecord } from "@/types/teacher";
import { aiTeacherService, isDeployed } from "@/lib/api/aiTeacherService";
import { agentService } from "@/lib/api/agentService";
import { govAiService } from "@/lib/api/govAiService";
import { allInstitutions } from "@/lib/mock-data/government";
import { STATE } from "@/lib/mock-data/core";
import { relTime } from "@/lib/format";
import { Async, DemoBanner, Panel, errMsg, DecisionDialog } from "../components/shared";

type Tab = "teachers" | "agents" | "usage";
export default function AIScreen(_: ScreenProps) {
  const qc = useQueryClient(); const [tab, setTab] = React.useState<Tab>("teachers");
  const tq = useQuery({ queryKey: ["gov", "ai-teachers-all"], queryFn: () => aiTeacherService.list() });
  const aq = useQuery({ queryKey: ["gov", "agents"], queryFn: async () => { const [mine, others] = await Promise.all([govAiService.agents(), agentService.list({ ownerLevel: "government" })]); return { mine, others }; } });
  const uq = useQuery({ queryKey: ["gov", "ai-usage"], queryFn: async () => { const ts = await aiTeacherService.list({ status: "approved" }); return Promise.all(ts.map(async (t) => ({ t, u: await aiTeacherService.usage(t.id) }))); } });
  const inv = () => qc.invalidateQueries({ queryKey: ["gov"] });
  const [create, setCreate] = React.useState(false); const [reject, setReject] = React.useState<AITeacherRecord | null>(null); const [confirm, setConfirm] = React.useState<{ t: AITeacherRecord; kind: "suspend" | "retire" } | null>(null); const [dist, setDist] = React.useState<AITeacherRecord | null>(null);
  const act = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: () => inv(), onError: (e) => toast.error("Action failed", errMsg(e)) });
  const ok = (msg: string) => ({ onSuccess: () => { inv(); toast.success(msg); } });
  return (
    <div>
      <PageHeader title="AI Teachers & Agents" subtitle="State-approved AI Teachers and agents. AI Teachers are distinct from students' personal AI Tutor." actions={<Button onClick={() => setCreate(true)}><Plus size={18} />New state AI Teacher</Button>} />
      <DemoBanner />
      <div className="mb-4"><Segmented<Tab> label="AI sections" value={tab} onChange={setTab} options={[{ value: "teachers", label: "AI Teachers" }, { value: "agents", label: "Agents" }, { value: "usage", label: "Usage" }]} /></div>
      {tab === "teachers" && <Async q={tq}>{(list) => list.length === 0 ? <EmptyState title="No AI Teachers" body="Create a state AI Teacher and submit it for approval." /> : (
        <ul className="grid gap-3 lg:grid-cols-2">{list.map((t) => { const gov = t.ownerType === "government"; return (
          <li key={t.id}><Card className="h-full"><CardBody className="flex h-full flex-col gap-2">
            <div className="flex items-start gap-3"><Avatar name={t.name} color={t.avatarColor} ai size={44} /><div className="min-w-0 flex-1"><p className="font-bold">{t.name} <span className="text-xs font-normal text-text-2">{t.version}</span></p><p className="text-xs text-text-2">{t.subject} · {t.grade} · owner: {t.owner}</p></div><StatusBadge status={t.status} label={t.status.replace("-", " ")} /></div>
            <p className="text-sm text-text-2">{t.personality}</p>
            <p className="text-xs">{isDeployed(t) ? <Badge tone="success">Deployed in {t.assignments.filter((a) => a.status === "active").length} target(s)</Badge> : <Badge tone="neutral">Not deployed{t.status !== "approved" ? ": not approved" : ""}</Badge>}</p>
            {t.assignments.length > 0 && <p className="text-xs text-text-2">Assigned: {t.assignments.map((a) => a.targetLabel).join(", ")}</p>}
            {!gov && <p className="flex items-center gap-1 text-xs text-text-2"><Info size={12} />Owned by an institution or teacher; the state can view it but its owner governs it.</p>}
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              {gov && ["draft", "rejected"].includes(t.status) && <Button size="sm" onClick={() => act.mutate(() => aiTeacherService.submitForApproval(t.id), ok("Submitted for state approval"))}>Submit for approval</Button>}
              {gov && t.status === "awaiting-approval" && <><Button size="sm" variant="success" onClick={() => act.mutate(() => aiTeacherService.approve(t.id, "Secretary, School Education (demo)"), ok("AI Teacher approved"))}>Approve</Button><Button size="sm" variant="danger" onClick={() => setReject(t)}>Reject</Button></>}
              {t.status === "approved" && <Button size="sm" variant="soft" onClick={() => setDist(t)}>Distribute to institution</Button>}
              {t.status === "approved" && <Button size="sm" variant="outline" onClick={() => setConfirm({ t, kind: "suspend" })}>Suspend</Button>}
              {t.status === "suspended" && <Button size="sm" variant="outline" onClick={() => act.mutate(() => aiTeacherService.reinstate(t.id), ok("Reinstated"))}>Reinstate</Button>}
              {["approved", "suspended", "rejected", "draft"].includes(t.status) && <Button size="sm" variant="ghost" onClick={() => setConfirm({ t, kind: "retire" })}>Retire</Button>}
            </div>
          </CardBody></Card></li>); })}</ul>)}</Async>}

      {tab === "agents" && <Async q={aq}>{({ mine, others }) => (
        <ul className="grid gap-3 lg:grid-cols-2">{[...mine.map((a) => ({ id: a.id, name: a.name, purpose: a.purpose, autonomy: a.autonomy, status: a.status, scope: a.scope, note: a.approvalNote, last: a.lastRun, local: true })), ...others.map((a) => ({ id: a.id, name: a.name, purpose: a.description, autonomy: a.autonomy, status: a.status, scope: a.dataScope.join(", "), note: "", last: a.lastRunAt ?? "", local: false }))].map((a) => (
          <li key={a.id}><Card className="h-full"><CardBody className="flex h-full flex-col gap-2"><div className="flex items-start justify-between gap-2"><p className="font-bold">{a.name}</p><StatusBadge status={a.status} label={a.status.replace("-", " ")} /></div><p className="text-sm text-text-2">{a.purpose}</p><div className="flex flex-wrap gap-1.5"><Badge tone={a.autonomy === "autonomous" ? "warning" : "primary"}>Autonomy: {a.autonomy}</Badge><Badge tone="neutral">Scope: {a.scope}</Badge></div>{a.note && <p className="text-xs text-text-2">{a.note}</p>}{a.last && <p className="text-xs text-text-2">Last run {relTime(a.last)}</p>}
            {a.local && <div className="mt-auto flex flex-wrap gap-2 pt-2">
              {a.status === "awaiting-approval" && <Button size="sm" variant="success" onClick={() => act.mutate(() => govAiService.agentAction(a.id, "approve"), ok("Agent approved and published"))}>Approve</Button>}
              {a.status === "published" && <Button size="sm" variant="outline" onClick={() => act.mutate(() => govAiService.agentAction(a.id, "pause"), ok("Agent paused"))}>Pause</Button>}
              {a.status === "paused" && <Button size="sm" onClick={() => act.mutate(() => govAiService.agentAction(a.id, "resume"), ok("Agent resumed"))}>Resume</Button>}
              {a.status !== "retired" && <Button size="sm" variant="ghost" onClick={() => act.mutate(() => govAiService.agentAction(a.id, "retire"), ok("Agent retired"))}>Retire</Button>}</div>}
          </CardBody></Card></li>))}</ul>)}</Async>}

      {tab === "usage" && <Async q={uq} skeleton={<Skeleton className="h-48" />}>{(rows) => rows.length === 0 ? <EmptyState title="No approved AI Teachers" body="Usage appears once an AI Teacher is approved and deployed." /> : (
        <div className="space-y-4"><section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatTile label="Sessions" value={rows.reduce((a, r) => a + r.u.sessions, 0).toLocaleString("en-IN")} hint="approved AI Teachers" /><StatTile label="Students reached" value={rows.reduce((a, r) => a + r.u.students, 0).toLocaleString("en-IN")} /><StatTile label="Escalations to teachers" value={rows.reduce((a, r) => a + r.u.escalations, 0)} /><StatTile label="Avg rating" value={(rows.reduce((a, r) => a + r.u.avgRating, 0) / rows.length).toFixed(1)} /></section>
          <Panel title="By AI Teacher" src="Source: AI Teacher usage logs (demo data) · as of 19 Nov 2026"><ul className="divide-y divide-border">{rows.map(({ t, u }) => <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span className="font-semibold">{t.name} <span className="text-xs font-normal text-text-2">{t.subject}</span></span><span className="tnum text-text-2">{u.sessions.toLocaleString("en-IN")} sessions · {u.students.toLocaleString("en-IN")} students · top topic: {u.topTopics[0]?.label ?? "n/a"}</span></li>)}</ul></Panel></div>)}</Async>}

      <CreateTeacher open={create} onOpenChange={setCreate} onDone={inv} />
      <DecisionDialog open={!!reject} onOpenChange={(o) => !o && setReject(null)} decision="rejected" title={`Reject ${reject?.name}`} onSubmit={async (n) => { await aiTeacherService.reject(reject!.id, n); inv(); toast.success("AI Teacher rejected"); }} />
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} destructive title={confirm?.kind === "suspend" ? `Suspend ${confirm.t.name}?` : `Retire ${confirm?.t.name}?`} body={confirm?.kind === "suspend" ? "Its deployments pause immediately everywhere it is assigned." : "Retiring removes all assignments. This cannot be undone."} confirmLabel={confirm?.kind === "suspend" ? "Suspend" : "Retire"} onConfirm={() => confirm && act.mutate(() => confirm.kind === "suspend" ? aiTeacherService.suspend(confirm.t.id, "Suspended by state education department") : aiTeacherService.retire(confirm.t.id), ok(confirm.kind === "suspend" ? "Suspended" : "Retired"))} />
      <Distribute t={dist} onClose={() => setDist(null)} onDone={inv} />
    </div>
  );
}

function CreateTeacher({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [name, setName] = React.useState(""); const [subject, setSubject] = React.useState("Mathematics"); const [grade, setGrade] = React.useState("Grades 6–8"); const [src, setSrc] = React.useState(""); const [err, setErr] = React.useState("");
  const m = useMutation({ mutationFn: () => aiTeacherService.create({ name, subject, grade, languages: ["English"], personality: "Patient and curriculum-aligned", avatarColor: "#5146E5", sources: src.split(",").map((s) => s.trim()).filter(Boolean), tools: ["Answer questions", "Identify gaps"], owner: STATE.dept, ownerType: "government" }), onSuccess: () => { toast.success("Draft AI Teacher created", "Submit it for approval before it can be deployed."); onDone(); onOpenChange(false); setName(""); setSrc(""); }, onError: (e) => setErr(errMsg(e)) });
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New state AI Teacher" description="Created as a draft. It is never deployed until approved." footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button loading={m.isPending} onClick={() => { setErr(""); m.mutate(); }}>Create draft</Button></>}>
      <div className="space-y-3"><Field label="Name" required htmlFor="t-name" error={err}><Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Subject" htmlFor="t-sub"><Select id="t-sub" value={subject} onChange={(e) => setSubject(e.target.value)}><option>Mathematics</option><option>Science</option><option>English</option><option>Social Science</option></Select></Field>
        <Field label="Grades" htmlFor="t-gr"><Select id="t-gr" value={grade} onChange={(e) => setGrade(e.target.value)}><option>Grades 6–8</option><option>Grades 9–10</option><option>Grades 4–5</option></Select></Field>
        <Field label="Approved sources" htmlFor="t-src" hint="Comma separated, for example the state textbook title." ><Input id="t-src" value={src} onChange={(e) => setSrc(e.target.value)} /></Field><AIBadge label="AI persona draft" /></div>
    </Modal>
  );
}

function Distribute({ t, onClose, onDone }: { t: AITeacherRecord | null; onClose: () => void; onDone: () => void }) {
  const [inst, setInst] = React.useState(allInstitutions()[0].id); const [err, setErr] = React.useState("");
  const m = useMutation({ mutationFn: () => { const i = allInstitutions().find((x) => x.id === inst)!; return aiTeacherService.assign(t!.id, { targetType: "group", targetId: i.id, targetLabel: i.name, functions: ["Answer questions", "Teach"], availability: "school-hours", assignedBy: "State Education Department" }); }, onSuccess: () => { toast.success("Distributed", "The institution can now assign it to classes."); onDone(); onClose(); }, onError: (e) => setErr(errMsg(e)) });
  return (
    <Modal open={!!t} onOpenChange={(o) => !o && onClose()} title={`Distribute ${t?.name ?? ""}`} description="Only approved AI Teachers can be distributed." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={() => { setErr(""); m.mutate(); }}>Distribute</Button></>}>
      <Field label="Institution" htmlFor="d-inst" error={err}><Select id="d-inst" value={inst} onChange={(e) => setInst(e.target.value)}>{allInstitutions().map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</Select></Field>
    </Modal>
  );
}
