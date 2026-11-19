"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Robot, PaperPlaneRight, Flag, Pause, Play, Trash, ArrowsClockwise, Info } from "@phosphor-icons/react";
import { PageHeader, Segmented, Card, CardBody, Badge, StatusBadge, Avatar, Button, Modal, Drawer, Field, Input, Textarea, Select, Checkbox, Stepper, EmptyState, ListToolbar, NoResults, ConfirmDialog, SkeletonCards, toast, Progress } from "@/components/ui";
import { BarChart } from "@/components/charts";
import type { AITeacherRecord } from "@/types/teacher";
import { aiTeacherService, isDeployed } from "@/lib/api/aiTeacherService";
import { AI_TEACHER_TOOLS, AI_TEACHER_SOURCES } from "@/lib/mock-data/aiTeachers";
import { CLASSROOMS, TEACHERS, subjectById } from "@/lib/mock-data/core";
import { relTime, fmtDateTime } from "@/lib/format";
import { useTeacher, Q, errMsg, KEYS } from "../components/common";

const OWNER_LABEL = { government: "State-owned", institution: "School-owned", teacher: "Teacher-owned" } as const;
const STATUS_LABEL: Record<string, string> = { draft: "Draft", "awaiting-approval": "Awaiting approval", approved: "Approved", rejected: "Rejected", suspended: "Suspended", retired: "Retired" };

function IdentityBadges({ t }: { t: AITeacherRecord }) {
  return <div className="flex flex-wrap gap-1.5"><Badge tone="ai" icon={<Robot size={12} />}>AI Teacher · not a human</Badge><Badge>{OWNER_LABEL[t.ownerType]}</Badge><StatusBadge status={t.status} label={STATUS_LABEL[t.status]} /></div>;
}
export default function AITeachersScreen() {
  const me = useTeacher(); const qc = useQueryClient();
  const [tab, setTab] = React.useState<"ai" | "humans">("ai"); const [q, setQ] = React.useState(""); const [wizard, setWizard] = React.useState(false); const [sel, setSel] = React.useState<string | null>(null);
  const list = useQuery({ queryKey: [...KEYS.aiTeachers], queryFn: () => aiTeacherService.list() });
  const inv = () => qc.invalidateQueries({ queryKey: [...KEYS.aiTeachers] });
  const rows = (list.data ?? []).filter((t) => t.status !== "retired" && `${t.name} ${t.subject}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="AI Teachers" subtitle="Institution-approved AI teaching assistants for classes. Different from a student's personal AI Tutor." actions={<Button onClick={() => setWizard(true)}><Plus size={16} />Create AI Teacher</Button>} />
      <Card tone="lilac" className="mb-4"><CardBody className="flex items-start gap-2 text-sm"><Info size={18} className="mt-0.5 shrink-0 text-primary" /><p>An AI Teacher is a named, governed entity assigned to classes by you or your school. A student's <strong>AI Tutor</strong> is a private companion inside their own account. An AI Teacher cannot be used by students until your institution approves it. Demo only; no real model runs.</p></CardBody></Card>
      <div className="mb-3"><Segmented label="Teaching staff" value={tab} onChange={setTab} options={[{ value: "ai", label: "AI Teachers", count: rows.length }, { value: "humans", label: "Human teachers", count: TEACHERS.length }]} /></div>
      {tab === "humans" ? (
        <ul className="grid gap-2 sm:grid-cols-2">{TEACHERS.map((h) => <li key={h.id}><Card><CardBody className="flex items-center gap-3"><Avatar name={h.displayName} color={h.avatarColor} size={40} /><div className="min-w-0 flex-1"><p className="font-semibold">{h.title} {h.displayName}</p><p className="text-xs text-text-2">{h.departmentName} · {h.classIds.length} classes</p></div><Badge tone="success">Human teacher</Badge></CardBody></Card></li>)}</ul>
      ) : (<>
        <ListToolbar query={q} onQuery={setQ} placeholder="Search AI Teachers" count={rows.length} onClear={() => setQ("")} />
        <Q q={list} skeleton={<SkeletonCards n={3} h="h-28" />} isEmpty={(d) => !d.length} empty={<EmptyState title="No AI Teachers yet" body="Create one and submit it for approval." action={{ label: "Create AI Teacher", onClick: () => setWizard(true) }} />}>
          {() => !rows.length ? <NoResults query={q} onClear={() => setQ("")} /> : (
            <ul className="grid gap-3 sm:grid-cols-2">{rows.map((t) => (
              <li key={t.id}><Card><CardBody className="space-y-2.5"><div className="flex items-start gap-3"><Avatar name={t.name} color={t.avatarColor} size={44} ai /><div className="min-w-0 flex-1"><h2 className="font-semibold">{t.name} <span className="text-xs font-normal text-text-2">{t.version}</span></h2><p className="text-xs text-text-2">{t.subject} · {t.grade} · {t.languages.join(", ")}</p></div></div>
                <IdentityBadges t={t} />
                <p className="text-xs text-text-2">{t.status === "approved" ? (isDeployed(t) ? `Deployed to ${t.assignments.filter((a) => a.status === "active").map((a) => a.targetLabel).join(", ")}` : "Approved — not assigned to any class yet") : "Not deployed — students cannot use this AI Teacher."}</p>
                <Button size="sm" variant="soft" onClick={() => setSel(t.id)}>Open</Button></CardBody></Card></li>))}</ul>
          )}
        </Q>
      </>)}
      {wizard && <Wizard onClose={() => setWizard(false)} owner={me.plain} ownerId={me.id} onDone={(id) => { inv(); setWizard(false); setSel(id); }} />}
      <Detail id={sel} onClose={() => setSel(null)} meName={me.plain} meId={me.id} onChanged={inv} />
    </div>
  );
}

function Wizard({ onClose, owner, ownerId, onDone }: { onClose: () => void; owner: string; ownerId: string; onDone: (id: string) => void }) {
  const [step, setStep] = React.useState(0);
  const [d, setD] = React.useState({ name: "", color: "#7044D8", subject: "Mathematics", grade: "Grade 8", languages: ["English"], personality: "", sources: [] as string[], tools: ["Answer questions"] });
  const [chat, setChat] = React.useState<{ who: "you" | "ai"; text: string }[]>([]); const [msg, setMsg] = React.useState("");
  const errs = { name: d.name.trim().length < 2 ? "Give it a name (2+ characters)" : "", personality: d.personality.trim().length < 15 ? "Describe the personality in 15+ characters" : "", sources: d.sources.length ? "" : "Pick at least one approved source", tools: d.tools.length ? "" : "Pick at least one function" };
  const valid = [!errs.name, !errs.personality && d.languages.length > 0, !errs.sources && !errs.tools, true][step];
  const toggle = <K extends "languages" | "sources" | "tools">(k: K, v: string, on: boolean) => setD((x) => ({ ...x, [k]: on ? [...x[k], v] : x[k].filter((y) => y !== v) }));
  const create = useMutation({ mutationFn: async (submit: boolean) => { const r = await aiTeacherService.create({ name: d.name, subject: d.subject, grade: d.grade, languages: d.languages, personality: d.personality, avatarColor: d.color, sources: d.sources, tools: d.tools, owner, ownerType: "teacher", ownerId }); if (submit) await aiTeacherService.submitForApproval(r.id); return { r, submit }; },
    onSuccess: ({ r, submit }) => { toast.success(submit ? "Submitted for institution approval" : "Saved as draft"); onDone(r.id); }, onError: (e) => toast.error(errMsg(e)) });
  const send = () => { if (!msg.trim()) return; const m = msg.trim(); setChat((c) => [...c, { who: "you", text: m }, { who: "ai", text: `(${d.name || "AI Teacher"}, ${d.personality.split(",")[0] || "friendly"}) Good question. Let's start from what you already know about "${m.slice(0, 40)}" and build step by step. This is a scripted demo reply.` }]); setMsg(""); };
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title="Create AI Teacher" className="sm:max-w-2xl" footer={<>{step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}{step < 3 ? <Button disabled={!valid} onClick={() => setStep(step + 1)}>Next</Button> : <><Button variant="outline" loading={create.isPending} onClick={() => create.mutate(false)}>Save draft</Button><Button loading={create.isPending} onClick={() => create.mutate(true)}>Submit for approval</Button></>}</>}>
      <div className="space-y-4"><Stepper steps={["Identity", "Character", "Sources & tools", "Test & submit"]} current={step} />
        {step === 0 && <div className="space-y-3"><Field label="Name" required error={d.name && errs.name} htmlFor="ai-name"><Input id="ai-name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-3"><Field label="Subject" htmlFor="ai-sub"><Select id="ai-sub" value={d.subject} onChange={(e) => setD({ ...d, subject: e.target.value })}>{["Mathematics", "Science", "English", "Hindi", "Social Science"].map((s) => <option key={s}>{s}</option>)}</Select></Field><Field label="Grade" htmlFor="ai-gr"><Select id="ai-gr" value={d.grade} onChange={(e) => setD({ ...d, grade: e.target.value })}>{["Grade 7", "Grade 8", "Grades 6–8", "Grades 7–9"].map((s) => <option key={s}>{s}</option>)}</Select></Field><Field label="Avatar colour" htmlFor="ai-col"><Select id="ai-col" value={d.color} onChange={(e) => setD({ ...d, color: e.target.value })}>{[["#7044D8", "Violet"], ["#5146E5", "Indigo"], ["#1D6FB8", "Blue"], ["#12805C", "Green"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field></div>
          <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3"><Avatar name={d.name || "AI"} color={d.color} size={44} ai /><p className="text-xs text-text-2">AI Teachers always show an “AI” mark so students never mistake them for a human.</p></div></div>}
        {step === 1 && <div className="space-y-3"><fieldset><legend className="mb-1 text-sm font-semibold">Languages</legend><div className="flex gap-4">{["English", "Hindi", "Tamil"].map((l) => <Checkbox key={l} label={l} checked={d.languages.includes(l)} onChange={(v) => toggle("languages", l, v)} />)}</div></fieldset>
          <Field label="Personality & teaching style" required error={d.personality && errs.personality} htmlFor="ai-pers"><Textarea id="ai-pers" value={d.personality} onChange={(e) => setD({ ...d, personality: e.target.value })} placeholder="e.g. Patient, asks a guiding question first, uses visual models" /></Field></div>}
        {step === 2 && <div className="space-y-3"><fieldset><legend className="mb-1 text-sm font-semibold">Approved sources <span className="text-danger">*</span></legend><div className="space-y-1.5">{AI_TEACHER_SOURCES.map((s) => <Checkbox key={s} label={s} checked={d.sources.includes(s)} onChange={(v) => toggle("sources", s, v)} />)}</div>{errs.sources && <p role="alert" className="mt-1 text-xs font-medium text-danger">Fix this: {errs.sources}</p>}</fieldset>
          <fieldset><legend className="mb-1 text-sm font-semibold">Permitted functions</legend><div className="grid gap-1.5 sm:grid-cols-2">{AI_TEACHER_TOOLS.map((s) => <Checkbox key={s} label={s} checked={d.tools.includes(s)} onChange={(v) => toggle("tools", s, v)} />)}</div></fieldset></div>}
        {step === 3 && <div className="space-y-3"><div className="rounded-xl bg-lilac p-3 text-sm"><p className="font-semibold">{d.name} · {d.subject} · {d.grade}</p><p className="text-xs text-text-2">{d.personality}</p></div>
          <div className="space-y-2 rounded-xl border border-border p-3"><p className="text-xs font-bold">Test chat <Badge tone="highlight">Scripted demo</Badge></p><div className="max-h-40 space-y-1.5 overflow-y-auto" aria-live="polite">{chat.length === 0 && <p className="text-xs text-text-2">Ask a sample student question.</p>}{chat.map((c, i) => <p key={i} className={`rounded-lg p-2 text-sm ${c.who === "you" ? "ml-8 bg-surface-2" : "mr-8 bg-lilac"}`}>{c.text}</p>)}</div><div className="flex gap-2"><Input aria-label="Test message" value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), send())} placeholder="e.g. Why do I need a common denominator?" /><Button size="icon" aria-label="Send test message" onClick={send}><PaperPlaneRight size={16} /></Button></div></div>
          <p className="text-xs text-text-2">Submitting sends it to your institution for approval. Until approved it cannot be assigned or shown to students.</p></div>}
      </div>
    </Modal>
  );
}

function Detail({ id, onClose, meName, meId, onChanged }: { id: string | null; onClose: () => void; meName: string; meId: string; onChanged: () => void }) {
  const q = useQuery({ queryKey: [...KEYS.aiTeachers, id], queryFn: () => aiTeacherService.get(id!), enabled: !!id });
  const usage = useQuery({ queryKey: [...KEYS.aiTeachers, id, "usage"], queryFn: () => aiTeacherService.usage(id!), enabled: !!id && !!q.data && q.data.status !== "draft" });
  const t = q.data; const mine = t?.ownerType === "teacher" && t.ownerId === meId;
  const [assign, setAssign] = React.useState(false); const [concern, setConcern] = React.useState(false); const [confirm, setConfirm] = React.useState<null | { kind: "unassign" | "retire"; aid?: string }>(null);
  const run = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: () => { q.refetch(); onChanged(); }, onError: (e) => toast.error(errMsg(e)) });
  return (
    <Drawer open={!!id} onOpenChange={(v) => !v && onClose()} title={t?.name ?? "AI Teacher"} width="sm:max-w-lg">
      {q.isLoading || !t ? <SkeletonCards n={3} /> : (
        <div className="space-y-4">
          <div className="flex items-center gap-3"><Avatar name={t.name} color={t.avatarColor} size={52} ai /><div><IdentityBadges t={t} /><p className="mt-1 text-xs text-text-2">{t.subject} · {t.grade} · {t.version} · owner: {t.owner}</p></div></div>
          {t.status === "suspended" && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">Suspended: {t.suspendedReason} It is not available to students.</p>}
          {t.status === "rejected" && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">Not approved: {t.rejectionReason}</p>}
          {t.status === "awaiting-approval" && <p role="status" className="rounded-xl bg-warning-soft p-3 text-sm">Waiting for institution approval since {relTime(t.submittedAt!)}. It cannot be deployed yet.</p>}
          <section className="space-y-1 text-sm"><p><strong>Personality:</strong> {t.personality}</p><p><strong>Sources:</strong> {t.sources.join("; ")}</p><p><strong>Functions:</strong> {t.tools.join(", ")}</p><p><strong>Languages:</strong> {t.languages.join(", ")}</p></section>
          <div className="flex flex-wrap gap-2">
            {mine && ["draft", "rejected"].includes(t.status) && <Button size="sm" loading={run.isPending} onClick={() => run.mutate(async () => { await aiTeacherService.submitForApproval(t.id); toast.success("Submitted for institution approval"); })}>Submit for approval</Button>}
            {t.status === "approved" && <Button size="sm" onClick={() => setAssign(true)}>Assign to class or course</Button>}
            {t.updateAvailable && <Button size="sm" variant="outline" onClick={() => run.mutate(async () => { await aiTeacherService.updateVersion(t.id); toast.success("Updated to the latest version"); })}><ArrowsClockwise size={14} />Update to {t.updateAvailable}</Button>}
            {t.status === "approved" && !t.updateAvailable && mine && <Button size="sm" variant="outline" onClick={() => run.mutate(async () => { await aiTeacherService.updateVersion(t.id); toast.success("Version updated"); })}><ArrowsClockwise size={14} />Update version</Button>}
            <Button size="sm" variant="ghost" onClick={() => setConcern(true)}><Flag size={14} />Report concern</Button>
            {mine && t.status !== "retired" && <Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: "retire" })}><Trash size={14} className="text-danger" />Retire</Button>}
          </div>
          <section><h3 className="mb-2 text-sm font-bold">Assignments</h3>{!t.assignments.length ? <p className="text-sm text-text-2">{t.status === "approved" ? "Not assigned anywhere." : "Assignments become possible after approval."}</p> : <ul className="space-y-2">{t.assignments.map((a) => <li key={a.id} className="rounded-xl border border-border p-2.5 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{a.targetLabel} <span className="text-xs font-normal text-text-2">({a.targetType})</span></span><StatusBadge status={a.status} /></div><p className="text-xs text-text-2">{a.functions.join(", ")} · {a.availability.replace("-", " ")}</p><div className="mt-1 flex gap-2"><Button size="sm" variant="ghost" onClick={() => run.mutate(async () => { await aiTeacherService.pauseAssignment(t.id, a.id, a.status === "active"); toast.success(a.status === "active" ? "Paused" : "Resumed"); })}>{a.status === "active" ? <><Pause size={14} />Pause</> : <><Play size={14} />Resume</>}</Button><Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: "unassign", aid: a.id })}>Unassign</Button></div></li>)}</ul>}</section>
          {usage.data && <section><h3 className="mb-2 text-sm font-bold">Usage & student feedback</h3><div className="grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-surface-2 p-2"><p className="tnum text-lg font-bold">{usage.data.sessions.toLocaleString("en-IN")}</p>sessions</div><div className="rounded-xl bg-surface-2 p-2"><p className="tnum text-lg font-bold">{usage.data.students}</p>students</div><div className="rounded-xl bg-surface-2 p-2"><p className="tnum text-lg font-bold">{usage.data.avgRating || "—"}</p>avg rating</div></div>
            <div className="mt-2"><BarChart ariaLabel="Weekly sessions" height={110} data={["M", "T", "W", "T", "F", "S", "S"].map((l, i) => ({ label: l, value: usage.data!.weekly[i] }))} /></div>
            {t.feedback.map((f) => <p key={f.id} className="mt-1 rounded-lg bg-surface-2 p-2 text-xs"><strong>{f.rating}/5</strong> · {f.student}: “{f.comment}”</p>)}</section>}
          {t.concerns.length > 0 && <section><h3 className="mb-2 text-sm font-bold">Concerns</h3>{t.concerns.map((c) => <p key={c.id} className="mb-1 rounded-lg bg-warning-soft p-2 text-xs">{c.text} — {c.by}, {relTime(c.at)} ({c.status})</p>)}</section>}
          <section><h3 className="mb-2 text-sm font-bold">History</h3><ol className="space-y-1 text-xs text-text-2">{t.history.map((h, i) => <li key={i}>{fmtDateTime(h.at)} — {h.text}</li>)}</ol></section>
        </div>
      )}
      {t && <AssignModal open={assign} onOpenChange={setAssign} t={t} by={meName} onDone={() => { q.refetch(); onChanged(); }} />}
      {t && <ConcernModal open={concern} onOpenChange={setConcern} t={t} by={meName} onDone={() => { q.refetch(); onChanged(); }} />}
      <ConfirmDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)} destructive title={confirm?.kind === "retire" ? "Retire this AI Teacher?" : "Unassign?"} body={confirm?.kind === "retire" ? "It is removed from every class and can no longer be used." : "Students in that class lose access to this AI Teacher."} confirmLabel={confirm?.kind === "retire" ? "Retire" : "Unassign"} onConfirm={() => t && confirm && run.mutate(async () => { if (confirm.kind === "retire") { await aiTeacherService.retire(t.id); onClose(); } else await aiTeacherService.unassign(t.id, confirm.aid!); toast.info("Done"); })} />
    </Drawer>
  );
}
function AssignModal({ open, onOpenChange, t, by, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; t: AITeacherRecord; by: string; onDone: () => void }) {
  const [target, setTarget] = React.useState("cls-8b"); const [fns, setFns] = React.useState<string[]>(t.tools.slice(0, 1)); const [avail, setAvail] = React.useState<"always" | "school-hours" | "homework-window">("school-hours");
  const [confirm, setConfirm] = React.useState(false);
  const targets = [...CLASSROOMS.filter((c) => TEACHERS.find((x) => x.id === "tch-priya")!.classIds.includes(c.id)).map((c) => ({ id: c.id, label: c.name, type: "class" as const })), { id: "crs-fractions", label: "Course: Fractions & Decimals", type: "course" as const }, { id: "grp-remedial", label: "Group: Fractions support group", type: "group" as const }];
  const go = useMutation({ mutationFn: () => { const x = targets.find((y) => y.id === target)!; return aiTeacherService.assign(t.id, { targetType: x.type, targetId: x.id, targetLabel: x.label, functions: fns, availability: avail, assignedBy: by }); }, onSuccess: () => { toast.success("Assigned — students in that group can now use it"); onDone(); onOpenChange(false); }, onError: (e) => toast.error(errMsg(e)) });
  return (<>
    <Modal open={open} onOpenChange={onOpenChange} title={`Assign ${t.name}`} description="Choose where it appears and what it may do." footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!fns.length} onClick={() => setConfirm(true)}>Review & assign</Button></>}>
      <div className="space-y-3"><Field label="Assign to" htmlFor="as-t"><Select id="as-t" value={target} onChange={(e) => setTarget(e.target.value)}>{targets.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</Select></Field>
        <fieldset><legend className="mb-1 text-sm font-semibold">Permitted functions</legend>{t.tools.map((f) => <Checkbox key={f} label={f} checked={fns.includes(f)} onChange={(v) => setFns((x) => (v ? [...x, f] : x.filter((y) => y !== f)))} />)}{!fns.length && <p role="alert" className="text-xs font-medium text-danger">Fix this: select at least one function</p>}</fieldset>
        <Field label="Availability" htmlFor="as-av"><Select id="as-av" value={avail} onChange={(e) => setAvail(e.target.value as any)}><option value="school-hours">School hours</option><option value="homework-window">Homework window (4–8 PM)</option><option value="always">Always</option></Select></Field>
        <p className="rounded-xl bg-success-soft p-2 text-xs text-success">Approval status: {t.status === "approved" ? `Approved by ${t.approvedBy}` : "Not approved"}</p></div>
    </Modal>
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Confirm assignment" body={`${t.name} (AI Teacher) will be available to the selected students with: ${fns.join(", ")}.`} confirmLabel="Assign" onConfirm={() => go.mutate()} />
  </>);
}
function ConcernModal({ open, onOpenChange, t, by, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; t: AITeacherRecord; by: string; onDone: () => void }) {
  const [text, setText] = React.useState("");
  const go = useMutation({ mutationFn: () => aiTeacherService.reportConcern(t.id, text, by), onSuccess: () => { toast.success("Concern sent to the institution"); setText(""); onDone(); onOpenChange(false); }, onError: (e) => toast.error(errMsg(e)) });
  return <Modal open={open} onOpenChange={onOpenChange} title={`Report a concern about ${t.name}`} footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button loading={go.isPending} onClick={() => go.mutate()}>Send report</Button></>}><Field label="What happened?" required hint="At least 10 characters. Reviewed by your institution." htmlFor="cn"><Textarea id="cn" value={text} onChange={(e) => setText(e.target.value)} /></Field></Modal>;
}
