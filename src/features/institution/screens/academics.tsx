"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CaretRight, CaretDown, Plus, TreeStructure } from "@phosphor-icons/react";
import { PageHeader, Segmented, Button, Card, Badge, StatusBadge, Modal, Field, Input, Select, Stepper, ConfirmDialog, toast, ListToolbar, EmptyState, Checkbox, Progress } from "@/components/ui";
import { institutionService } from "@/lib/api/institutionService";
import { courseService } from "@/lib/api/courseService";
import { assignmentService } from "@/lib/api/assignmentService";
import { CURRICULUM, OBJECTIVES, SUBJECTS, subjectById } from "@/lib/mock-data/core";
import { PEOPLE } from "@/lib/mock-data/institution";
import type { HierarchyNode } from "@/types/institution";
import { fmtDate } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { useCtx, useQ, Q, DataTable, DemoNote, onErr, Panel, SevBadge } from "../kit";

type Tab = "hierarchy" | "classes" | "courses" | "memberships" | "transition" | "ops";
const KIND_LABEL: Record<string, string> = { institution: "Institution", branch: "Branch", department: "Department / programme", grade: "Grade / programme year", class: "Class", section: "Section", group: "Learning group" };

export default function AcademicsScreen(_: ScreenProps) {
  const { instName } = useCtx(); const [tab, setTab] = React.useState<Tab>("hierarchy");
  return (
    <div>
      <PageHeader title="Academic Operations" subtitle={`${instName} · structure, courses, memberships and year transitions.`} />
      <div className="mb-5 overflow-x-auto"><Segmented label="Academic sections" value={tab} onChange={setTab} options={[{ value: "hierarchy", label: "Hierarchy" }, { value: "classes", label: "Classes & sections" }, { value: "courses", label: "Courses & syllabus" }, { value: "memberships", label: "Memberships" }, { value: "transition", label: "Year transition" }, { value: "ops", label: "Course & assessment ops" }]} /></div>
      {tab === "hierarchy" && <Hierarchy />}{tab === "classes" && <Classes />}{tab === "courses" && <CoursesSyllabus />}{tab === "memberships" && <Memberships />}{tab === "transition" && <Transition />}{tab === "ops" && <Ops />}
    </div>
  );
}

function Node({ n, depth, sel, onSel, filter }: { n: HierarchyNode; depth: number; sel?: string; onSel: (n: HierarchyNode) => void; filter: string }) {
  const [open, setOpen] = React.useState(depth < 2);
  const kids = n.children ?? [];
  const match = (x: HierarchyNode): boolean => x.name.toLowerCase().includes(filter.toLowerCase()) || (x.children ?? []).some(match);
  if (filter && !match(n)) return null;
  const expanded = open || !!filter;
  return (
    <li role="treeitem" aria-expanded={kids.length ? expanded : undefined} aria-selected={sel === n.id}>
      <div className={`flex items-center gap-1 rounded-lg px-1 py-1 ${sel === n.id ? "bg-lilac" : "hover:bg-surface-2"}`} style={{ paddingLeft: depth * 16 + 4 }}>
        {kids.length ? <button type="button" aria-label={expanded ? `Collapse ${n.name}` : `Expand ${n.name}`} className="flex size-7 items-center justify-center rounded" onClick={() => setOpen(!open)}>{expanded ? <CaretDown size={14} /> : <CaretRight size={14} />}</button> : <span className="size-7" />}
        <button type="button" className="flex min-h-8 flex-1 items-center gap-2 text-left text-sm" onClick={() => onSel(n)}><span className="font-medium">{n.name}</span><Badge tone={n.kind === "group" ? "primary" : "neutral"}>{KIND_LABEL[n.kind]}</Badge>{n.students !== undefined && <span className="tnum text-xs text-text-2">{n.students}</span>}</button>
      </div>
      {kids.length > 0 && expanded && <ul role="group">{kids.map((c) => <Node key={c.id} n={c} depth={depth + 1} sel={sel} onSel={onSel} filter={filter} />)}</ul>}
    </li>
  );
}

function Hierarchy() {
  const { ctx } = useCtx(); const qc = useQueryClient();
  const h = useQ(["hierarchy", ctx.inst], () => institutionService.hierarchy(ctx.inst));
  const [sel, setSel] = React.useState<HierarchyNode | null>(null); const [filter, setFilter] = React.useState(""); const [add, setAdd] = React.useState(false); const [name, setName] = React.useState("");
  const m = useMutation({ mutationFn: () => institutionService.addGroup(ctx.inst, sel!.id, name), onSuccess: () => { toast.success("Learning group added."); setAdd(false); setName(""); qc.invalidateQueries({ queryKey: ["inst", "hierarchy"] }); }, onError: onErr });
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2"><ListToolbar query={filter} onQuery={setFilter} placeholder="Find a node" onClear={() => setFilter("")} />
        <Q q={h} rows={4} h="h-10">{(root) => <Card className="p-3"><ul role="tree" aria-label="Academic hierarchy"><Node n={root} depth={0} sel={sel?.id} onSel={setSel} filter={filter} /></ul></Card>}</Q></div>
      <div className="space-y-3">
        <Panel title="Selected node">{sel ? <div className="space-y-2 text-sm"><p className="font-bold">{sel.name}</p><Badge>{KIND_LABEL[sel.kind]}</Badge>{sel.lead && <p className="text-text-2">Lead: {sel.lead}</p>}{sel.students !== undefined && <p className="tnum">{sel.students} students</p>}<Button size="sm" onClick={() => setAdd(true)}><Plus size={14} /> Add learning group here</Button></div> : <p className="text-sm text-text-2">Select a node to see details or add a learning group beneath it.</p>}</Panel>
        <Panel title="Flexible by design"><p className="text-sm text-text-2">Institution → Branch → Department / programme → Grade / class / section → Learning groups. A student can belong to any number of groups at once — there is no five-group limit. See the Memberships tab for a student in nine.</p></Panel>
      </div>
      <Modal open={add} onOpenChange={setAdd} title={`Add learning group under ${sel?.name ?? ""}`} footer={<><Button variant="ghost" onClick={() => setAdd(false)}>Cancel</Button><Button loading={m.isPending} onClick={() => m.mutate()}>Add group</Button></>}>
        <Field label="Group name" htmlFor="g-n" required hint="e.g. Chess ladder, Peer-tutoring circle"><Input id="g-n" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      </Modal>
    </div>
  );
}

function Classes() {
  const { ctx, key } = useCtx(); const [q, setQ] = React.useState("");
  const c = useQ(["classes", ...key], () => institutionService.classes(ctx));
  return <Q q={c}>{(rows) => { const f = rows.filter((r) => !q || `${r.name} ${r.branchName}`.toLowerCase().includes(q.toLowerCase()));
    return <div><ListToolbar query={q} onQuery={setQ} placeholder="Search classes" count={f.length} onClear={() => setQ("")} />
      {!f.length ? <EmptyState title="No classes in this view" body="Change the branch selector in the top bar or clear the search." /> : <DataTable ariaLabel="Classes and sections" rows={f} rowKey={(r) => r.id} cols={[
        { key: "n", header: "Class / section", cell: (r) => <b>{r.name}</b>, sort: (a, b) => a.name.localeCompare(b.name) }, { key: "b", header: "Branch", cell: (r) => r.branchName },
        { key: "s", header: "Students", cell: (r) => r.students, align: "right", sort: (a, b) => a.students - b.students }, { key: "sc", header: "Avg score", cell: (r) => <SevBadge v={r.score} />, sort: (a, b) => a.score - b.score },
        { key: "at", header: "Attendance", cell: (r) => <SevBadge v={r.attendance} /> }, { key: "su", header: "Need support", cell: (r) => r.support, align: "right", sort: (a, b) => a.support - b.support }]} />}</div>; }}</Q>;
}

function CoursesSyllabus() {
  const courses = useQ(["courses-academics"], () => courseService.list("stu-ananya"));
  const [subj, setSubj] = React.useState("");
  return (
    <div className="space-y-5">
      <Panel title="Syllabus"><p className="mb-3 text-sm">Curriculum: <b>{CURRICULUM.name}</b> · version <Badge tone="primary">{CURRICULUM.version}</Badge> · id {CURRICULUM.id}</p>
        <Select aria-label="Subject filter" className="mb-3 w-auto" value={subj} onChange={(e) => setSubj(e.target.value)}><option value="">All subjects</option>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <DataTable ariaLabel="Learning objectives" rows={OBJECTIVES.filter((o) => !subj || o.subjectId === subj)} rowKey={(o) => o.id} pageSize={6} cols={[{ key: "c", header: "Code", cell: (o) => <code className="text-xs">{o.code}</code>, sort: (a, b) => a.code.localeCompare(b.code) }, { key: "t", header: "Objective", cell: (o) => o.title }, { key: "s", header: "Subject", cell: (o) => subjectById(o.subjectId).name }, { key: "ch", header: "Chapter", cell: (o) => o.chapter }]} /></Panel>
      <Panel title="Courses aligned to the syllabus"><Q q={courses}>{(rows) => <DataTable ariaLabel="Courses" rows={rows.filter((c) => c.institutionId === "inst-greenfield" || !c.institutionId)} rowKey={(c) => c.id} pageSize={6} cols={[{ key: "t", header: "Course", cell: (c) => <b>{c.title}</b>, sort: (a, b) => a.title.localeCompare(b.title) }, { key: "s", header: "Subject", cell: (c) => subjectById(c.subjectId).name }, { key: "st", header: "Status", cell: (c) => <StatusBadge status={c.status} /> }, { key: "v", header: "Curriculum", cell: () => <Badge>{CURRICULUM.version}</Badge> }, { key: "m", header: "Modules / lessons", cell: (c) => `${c.moduleCount} / ${c.lessonCount}` }]} />}</Q></Panel>
    </div>
  );
}

const mSchema = z.object({ groupName: z.string().min(3, "Name the group (3+ characters)"), kind: z.string(), start: z.string().min(1, "Choose a start date"), end: z.string().optional() }).refine((d) => !d.end || d.end >= d.start, { path: ["end"], message: "End date must be on or after the start" });
function Memberships() {
  const qc = useQueryClient(); const [pid, setPid] = React.useState("stu-ananya"); const [add, setAdd] = React.useState(false);
  const students = PEOPLE.filter((p) => p.kind === "student" && p.institutionId === "inst-greenfield").slice(0, 12);
  const ms = useQ(["memberships", pid], () => institutionService.memberships(pid));
  const f = useForm<z.input<typeof mSchema>>({ resolver: zodResolver(mSchema) as never, defaultValues: { groupName: "", kind: "learning-group", start: "2026-11-19", end: "" } });
  const person = students.find((s) => s.id === pid)!;
  const m = useMutation({ mutationFn: (d: z.input<typeof mSchema>) => institutionService.addMembership({ personId: pid, personName: person.name, groupId: `lg-${d.groupName.toLowerCase().replace(/\W+/g, "-")}`, groupName: d.groupName, kind: d.kind as never, start: d.start, end: d.end || undefined }), onSuccess: () => { toast.success("Membership added with effective dates."); setAdd(false); f.reset(); qc.invalidateQueries({ queryKey: ["inst", "memberships"] }); }, onError: onErr });
  const end = useMutation({ mutationFn: (id: string) => institutionService.endMembership(id, "2026-11-19"), onSuccess: () => { toast.success("Membership ended today."); qc.invalidateQueries({ queryKey: ["inst", "memberships"] }); }, onError: onErr });
  const e = f.formState.errors;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><Field label="Student" htmlFor="m-p" className="w-60"><Select id="m-p" value={pid} onChange={(ev) => setPid(ev.target.value)}>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field><Button className="mt-6" onClick={() => setAdd(true)}><Plus size={14} /> Add membership</Button></div>
      <Q q={ms}>{(rows) => { const live = rows.filter((r) => r.state === "active" || r.state === "scheduled").length;
        return <><DemoNote tone="info">{person.name} is in <b>{live}</b> active or scheduled groups. Memberships are time-bound: past ones stay in the timeline; alumni status applies after the final class ends.</DemoNote>
          {!rows.length ? <EmptyState title="No memberships yet" body="Add a class, club or learning group with effective dates." action={{ label: "Add membership", onClick: () => setAdd(true) }} /> :
            <ol className="space-y-2" aria-label="Membership timeline">{[...rows].sort((a, b) => b.start.localeCompare(a.start)).map((r) => (
              <li key={r.id}><Card className="flex flex-wrap items-center justify-between gap-2 p-3"><div><p className="font-semibold">{r.groupName}</p><p className="text-xs text-text-2">{r.kind.replace("-", " ")} · {fmtDate(r.start)} → {r.end ? fmtDate(r.end) : "open-ended"}</p></div><div className="flex items-center gap-2"><StatusBadge status={r.state === "active" ? "active" : r.state === "scheduled" ? "scheduled" : "ended"} label={r.state} />{(r.state === "active") && <Button size="sm" variant="ghost" onClick={() => end.mutate(r.id)}>End today</Button>}</div></Card></li>))}</ol>}</>; }}</Q>
      <Modal open={add} onOpenChange={setAdd} title={`Add membership · ${person?.name}`} footer={<><Button variant="ghost" onClick={() => setAdd(false)}>Cancel</Button><Button loading={m.isPending} onClick={f.handleSubmit((d) => m.mutate(d))}>Add</Button></>}>
        <form className="space-y-3" onSubmit={f.handleSubmit((d) => m.mutate(d))}>
          <Field label="Group" error={e.groupName?.message} required htmlFor="mm-g"><Input id="mm-g" aria-invalid={!!e.groupName} {...f.register("groupName")} /></Field>
          <Field label="Type" htmlFor="mm-k"><Select id="mm-k" {...f.register("kind")}>{["class", "club", "house", "learning-group", "course-cohort", "remedial"].map((k) => <option key={k}>{k}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Effective from" error={e.start?.message} htmlFor="mm-s"><Input id="mm-s" type="date" {...f.register("start")} /></Field><Field label="Until (optional)" error={e.end?.message} htmlFor="mm-e"><Input id="mm-e" type="date" {...f.register("end")} /></Field></div><button type="submit" className="sr-only">Add</button>
        </form>
      </Modal>
    </div>
  );
}

function Transition() {
  const { ctx } = useCtx(); const qc = useQueryClient(); const [step, setStep] = React.useState(0); const [ack, setAck] = React.useState(false); const [conf, setConf] = React.useState(false);
  const p = useQ(["transition", ctx.inst], () => institutionService.transitionPreview(ctx.inst));
  const run = useMutation({ mutationFn: () => institutionService.runTransition(), onSuccess: () => { toast.success("Transition complete (demo). Alumni records are retained per policy."); qc.invalidateQueries({ queryKey: ["inst", "transition"] }); setStep(3); }, onError: onErr });
  return (
    <Q q={p}>{(d) => (
      <div className="space-y-4"><Stepper steps={["Review classes", "Promote / archive / alumni", "Retention note", "Confirm"]} current={d.done ? 3 : step} />
        {d.done ? <Card className="p-5"><p role="status" className="font-semibold text-success">Transition to 2027–28 completed (demo).</p><p className="mt-1 text-sm text-text-2">Classes were promoted, a class archived, and graduates moved to alumni. This demo does not alter other screens.</p></Card> : <>
          {step === 0 && <DataTable ariaLabel="Classes in transition" rows={d.rows} rowKey={(r) => r.id} cols={[{ key: "f", header: "From", cell: (r) => <b>{r.from}</b> }, { key: "t", header: "To", cell: (r) => r.to }, { key: "s", header: "Students", cell: (r) => r.students, align: "right" }]} />}
          {step === 1 && <DataTable ariaLabel="Transition preview" rows={d.rows} rowKey={(r) => r.id} cols={[{ key: "f", header: "Class", cell: (r) => <b>{r.from}</b> }, { key: "p", header: "Promote", cell: (r) => <Badge tone="success">{r.promote}</Badge> }, { key: "r", header: "Repeat year", cell: (r) => <Badge tone="warning">{r.repeat}</Badge> }, { key: "a", header: "Become alumni", cell: (r) => <Badge tone="info">{r.alumni}</Badge> }, { key: "ar", header: "Source class", cell: () => "Archived (read-only)" }]} />}
          {step === 2 && <Panel title="Retention note"><ul className="list-disc space-y-1 pl-5 text-sm"><li>Archived classes keep marks, attendance and audit history read-only.</li><li>Alumni keep access to certificates and transcripts; learning data is retained 3 years, then reviewed.</li><li>Personal contact details are deleted after 7 years per the retention policy.</li></ul><div className="mt-3"><Checkbox checked={ack} onChange={setAck} label="I have reviewed the retention policy." /></div></Panel>}
          {step === 3 && null}
          <div className="flex justify-between"><Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>{step < 2 ? <Button onClick={() => setStep(step + 1)}>Continue</Button> : <Button disabled={!ack} onClick={() => setConf(true)}>Run transition</Button>}</div></>}
        <ConfirmDialog open={conf} onOpenChange={setConf} destructive title="Run the academic-year transition?" body="Classes will be promoted or archived and graduates moved to alumni. In this prototype the change is simulated and audited." confirmLabel="Run transition" onConfirm={() => run.mutate()} />
      </div>)}</Q>
  );
}

function Ops() {
  const c = useQ(["courses-ops"], () => courseService.list("stu-ananya")); const a = useQ(["assignments-ops"], () => courseService.assignments());
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Courses by status"><Q q={c} rows={1}>{(rows) => { const g = ["published", "draft", "archived"].map((s) => ({ s, n: rows.filter((x) => x.status === s).length })); return <ul className="space-y-3">{g.map((x) => <li key={x.s}><div className="mb-1 flex justify-between text-sm"><StatusBadge status={x.s} /><span className="tnum font-semibold">{x.n}</span></div><Progress value={(x.n / Math.max(1, rows.length)) * 100} label={x.s} size="sm" /></li>)}</ul>; }}</Q></Panel>
      <Panel title="Assessments & assignments"><Q q={a} rows={1}>{(rows) => <DataTable ariaLabel="Assignments" rows={rows} rowKey={(x) => x.id} pageSize={5} cols={[{ key: "t", header: "Assignment", cell: (x) => <b>{x.title}</b> }, { key: "te", header: "Teacher", cell: (x) => x.teacherName }, { key: "d", header: "Due", cell: (x) => fmtDate(x.dueAt), sort: (p, q) => p.dueAt.localeCompare(q.dueAt) }, { key: "m", header: "Marks", cell: (x) => x.totalMarks, align: "right" }]} />}</Q><p className="mt-2 text-xs text-text-2">Grading and moderation live under AI Grading & Moderation; results under Results & Marksheets.</p></Panel>
    </div>
  );
}
