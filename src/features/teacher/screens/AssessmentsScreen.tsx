"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Sparkle, Database, FileText, CheckCircle, Copy, Trash, Eye } from "@phosphor-icons/react";
import { PageHeader, Card, CardBody, Badge, StatusBadge, Segmented, Button, Modal, Drawer, Field, Input, Textarea, Select, Checkbox, ListToolbar, NoResults, EmptyState, ConfirmDialog, AIBadge, SkeletonCards, toast, Progress } from "@/components/ui";
import type { ScreenProps } from "@/types/screens";
import type { Rubric, TeacherExam } from "@/types/teacher";
import { assignmentService, courseService } from "@/lib/api";
import { teacherExamService } from "@/lib/api/teacherExamService";
import { nameOf } from "@/lib/api/teacherInsightService";
import { CLASSROOMS, OBJECTIVES, STUDENTS } from "@/lib/mock-data/core";
import { fmtDateTime, fmtDate, inDays } from "@/lib/format";
import { useTeacher, Q, tHref, KEYS, errMsg, AiNotice } from "../components/common";

type Tab = "assignments" | "rubrics" | "exams";
export default function AssessmentsScreen({ searchParams }: ScreenProps) {
  const [tab, setTab] = React.useState<Tab>("assignments");
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Assessments" subtitle="Assignments, rubrics, exams and results for your classes." />
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {[{ slug: "question-bank", label: "Question Bank", icon: Database, b: "Reusable questions by objective" }, { slug: "papers", label: "Paper Builder", icon: FileText, b: "Compose and publish question papers" }, { slug: "grading", label: "AI Grading", icon: CheckCircle, b: "Review AI-suggested marks" }].map((l) => (
          <Link key={l.slug} href={tHref(l.slug)} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 hover:border-primary"><span className="flex size-9 items-center justify-center rounded-xl bg-lilac text-primary"><l.icon size={18} /></span><span><span className="block text-sm font-semibold">{l.label}</span><span className="text-xs text-text-2">{l.b}</span></span></Link>
        ))}
      </div>
      <div className="mb-4"><Segmented label="Assessment sections" value={tab} onChange={setTab} options={[{ value: "assignments", label: "Assignments" }, { value: "rubrics", label: "Rubrics" }, { value: "exams", label: "Exams & results" }]} /></div>
      {tab === "assignments" && <Assignments autoNew={searchParams.new === "1"} />}
      {tab === "rubrics" && <Rubrics />}
      {tab === "exams" && <Exams />}
    </div>
  );
}

const schema = z.object({
  title: z.string().trim().min(3, "Title needs 3+ characters"), audience: z.enum(["class", "course", "individual"]), classIds: z.array(z.string()), courseId: z.string().min(1, "Choose a course"), studentId: z.string().optional(),
  instructions: z.string().trim().min(10, "Add instructions (10+ characters)"), availableFrom: z.string().min(1, "Choose when it opens"), dueAt: z.string().min(1, "Choose a due date"), totalMarks: z.coerce.number().int().min(1, "At least 1").max(200),
  submissionTypes: z.array(z.string()).min(1, "Select at least one submission type"), rubricId: z.string().optional(), objectives: z.array(z.string()),
}).superRefine((v, c) => {
  if (v.audience !== "individual" && !v.classIds.length) c.addIssue({ code: "custom", path: ["classIds"], message: "Select at least one class" });
  if (v.audience === "individual" && !v.studentId) c.addIssue({ code: "custom", path: ["studentId"], message: "Choose a student" });
  if (v.dueAt && v.availableFrom && v.dueAt <= v.availableFrom) c.addIssue({ code: "custom", path: ["dueAt"], message: "Due date must be after it opens" });
});
type FV = z.infer<typeof schema>;

function Assignments({ autoNew }: { autoNew: boolean }) {
  const t = useTeacher(); const qc = useQueryClient();
  const [q, setQ] = React.useState(""); const [open, setOpen] = React.useState(autoNew); const [view, setView] = React.useState<string | null>(null);
  const list = useQuery({ queryKey: [...KEYS.assignments, t.id], queryFn: async () => (await assignmentService.list()).filter((a) => a.teacherId === t.id) });
  const subs = useQuery({ queryKey: [...KEYS.assignments, "subs"], queryFn: () => assignmentService.allSubmissions() });
  const f = (list.data ?? []).filter((a) => a.title.toLowerCase().includes(q.toLowerCase()));
  return (<>
    <ListToolbar query={q} onQuery={setQ} placeholder="Search assignments" count={f.length} onClear={() => setQ("")}><Button onClick={() => setOpen(true)}><Plus size={16} />Create assignment</Button></ListToolbar>
    <Q q={list} isEmpty={(d) => !d.length} empty={<EmptyState title="No assignments yet" body="Create one from scratch or let AI draft it for your review." action={{ label: "Create assignment", onClick: () => setOpen(true) }} />}>
      {() => !f.length ? <NoResults query={q} onClear={() => setQ("")} /> : (
        <ul className="space-y-2">{f.map((a) => { const s = (subs.data ?? []).filter((x) => x.assignmentId === a.id); const toReview = s.filter((x) => x.status === "submitted").length; return (
          <li key={a.id}><Card><CardBody className="flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1"><p className="font-semibold">{a.title}</p><p className="text-xs text-text-2">{a.courseTitle} · {a.classIds.map((c) => CLASSROOMS.find((x) => x.id === c)?.name).join(", ")} · due {fmtDateTime(a.dueAt)} · {a.totalMarks} marks</p></div>
            {toReview > 0 && <Badge tone="warning">{toReview} to review</Badge>}<Badge>{s.length} submission{s.length === 1 ? "" : "s"}</Badge><Button size="sm" variant="soft" onClick={() => setView(a.id)}>Submissions</Button></CardBody></Card></li>); })}</ul>
      )}
    </Q>
    <CreateAssignment open={open} onOpenChange={setOpen} onDone={() => qc.invalidateQueries({ queryKey: [...KEYS.assignments] })} />
    <SubmissionsDrawer assignmentId={view} onClose={() => setView(null)} />
  </>);
}

function CreateAssignment({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const t = useTeacher(); const qc = useQueryClient();
  const courses = useQuery({ queryKey: [...KEYS.courses, t.id], queryFn: async () => (await courseService.list("stu-ananya")).filter((c) => c.creatorName === t.plain) });
  const rubrics = useQuery({ queryKey: ["t", "rubrics"], queryFn: () => teacherExamService.listRubrics() });
  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FV>({ resolver: zodResolver(schema) as any, defaultValues: { title: "", audience: "class", classIds: ["cls-8b"], courseId: "crs-fractions", instructions: "", availableFrom: inDays(0, 9).slice(0, 16), dueAt: inDays(7, 17).slice(0, 16), totalMarks: 20, submissionTypes: ["text", "file"], objectives: [] } });
  const audience = watch("audience");
  const [ai, setAi] = React.useState(false);
  const create = useMutation({ mutationFn: (v: FV) => { const course = courses.data?.find((c) => c.id === v.courseId); const stu = STUDENTS.find((s) => s.id === v.studentId);
    return assignmentService.create({ title: v.title, courseId: v.courseId, courseTitle: course?.title ?? "", subjectId: course?.subjectId ?? "sub-math", teacherId: t.id, teacherName: t.name, classIds: v.audience === "individual" ? [stu!.classId] : v.classIds, dueAt: new Date(v.dueAt).toISOString(), instructions: (v.audience === "individual" ? `[For ${stu!.displayName} only] ` : "") + v.instructions, submissionTypes: v.submissionTypes as any, resources: [], rubricId: v.rubricId || undefined, totalMarks: v.totalMarks, learningObjectiveIds: v.objectives }); },
    onSuccess: () => { toast.success("Assignment created — students can see it"); onDone(); qc.invalidateQueries({ queryKey: ["student"] }); reset(); onOpenChange(false); }, onError: (e) => toast.error(errMsg(e)) });
  const draft = () => { setValue("title", "Fractions in the kitchen", { shouldValidate: true }); setValue("instructions", "Choose a recipe and rewrite it for 3 different group sizes using fractions. Show every step and explain how you found each common denominator.", { shouldValidate: true }); setValue("objectives", ["lo-frac-add", "lo-frac-word"]); setAi(true); toast.info("AI draft inserted — review and edit before creating"); };
  const types = ["text", "file", "image", "audio", "link"];
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Create assignment" className="sm:max-w-2xl">
      <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3" noValidate>
        <div className="flex items-center justify-between"><Button type="button" variant="soft" size="sm" onClick={draft}><Sparkle size={16} />Draft with AI</Button>{ai && <AIBadge label="AI-assisted draft · review" />}</div>
        {ai && <AiNotice>Nothing is created until you press Create assignment.</AiNotice>}
        <Field label="Title" required error={errors.title?.message} htmlFor="a-title"><Input id="a-title" {...register("title")} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Assign to" htmlFor="a-aud"><Select id="a-aud" {...register("audience")}><option value="class">Selected classes</option><option value="course">Everyone in a course</option><option value="individual">Individual student</option></Select></Field>
          <Field label="Course" required error={errors.courseId?.message} htmlFor="a-course"><Select id="a-course" {...register("courseId")}>{courses.data?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select></Field>
        </div>
        {audience !== "individual" ? (
          <Controller control={control} name="classIds" render={({ field }) => <fieldset><legend className="mb-1 text-sm font-semibold">Classes</legend><div className="flex flex-wrap gap-3">{t.teacher.classIds.map((c) => <Checkbox key={c} label={CLASSROOMS.find((x) => x.id === c)!.name} checked={field.value.includes(c)} onChange={(v) => field.onChange(v ? [...field.value, c] : field.value.filter((x) => x !== c))} />)}</div>{errors.classIds && <p role="alert" className="mt-1 text-xs font-medium text-danger">Fix this: {errors.classIds.message}</p>}</fieldset>} />
        ) : <Field label="Student" required error={errors.studentId?.message} htmlFor="a-stu"><Select id="a-stu" {...register("studentId")}><option value="">Choose…</option>{STUDENTS.filter((s) => t.teacher.classIds.includes(s.classId)).map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}</Select></Field>}
        <Field label="Instructions" required error={errors.instructions?.message} htmlFor="a-ins"><Textarea id="a-ins" {...register("instructions")} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Opens" required error={errors.availableFrom?.message} htmlFor="a-open"><Input id="a-open" type="datetime-local" {...register("availableFrom")} /></Field>
          <Field label="Due" required error={errors.dueAt?.message} htmlFor="a-due"><Input id="a-due" type="datetime-local" {...register("dueAt")} /></Field>
          <Field label="Total marks" required error={errors.totalMarks?.message} htmlFor="a-marks"><Input id="a-marks" type="number" {...register("totalMarks")} /></Field>
        </div>
        <Controller control={control} name="submissionTypes" render={({ field }) => <fieldset><legend className="mb-1 text-sm font-semibold">Submission types</legend><div className="flex flex-wrap gap-3">{types.map((x) => <Checkbox key={x} label={x[0].toUpperCase() + x.slice(1)} checked={field.value.includes(x)} onChange={(v) => field.onChange(v ? [...field.value, x] : field.value.filter((y) => y !== x))} />)}</div>{errors.submissionTypes && <p role="alert" className="mt-1 text-xs font-medium text-danger">Fix this: {errors.submissionTypes.message}</p>}</fieldset>} />
        <Field label="Rubric" optional htmlFor="a-rub"><Select id="a-rub" {...register("rubricId")}><option value="">No rubric</option>{rubrics.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
        <Controller control={control} name="objectives" render={({ field }) => <fieldset><legend className="mb-1 text-sm font-semibold">Learning objectives</legend><div className="space-y-1">{OBJECTIVES.filter((o) => o.subjectId === "sub-math").map((o) => <Checkbox key={o.id} label={`${o.code} · ${o.title}`} checked={field.value.includes(o.id)} onChange={(v) => field.onChange(v ? [...field.value, o.id] : field.value.filter((x) => x !== o.id))} />)}</div></fieldset>} />
        <p className="rounded-xl bg-surface-2 p-3 text-xs text-text-2"><strong>Late policy (display only):</strong> late work is accepted for 2 days with a note to the teacher; marks are not automatically reduced.</p>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create assignment</Button></div>
      </form>
    </Modal>
  );
}

function SubmissionsDrawer({ assignmentId, onClose }: { assignmentId: string | null; onClose: () => void }) {
  const qc = useQueryClient(); const t = useTeacher();
  const subs = useQuery({ queryKey: [...KEYS.assignments, "subs", assignmentId], queryFn: () => assignmentService.submissionsFor(assignmentId!), enabled: !!assignmentId });
  const asg = useQuery({ queryKey: [...KEYS.assignments, t.id], queryFn: async () => (await assignmentService.list()).filter((a) => a.teacherId === t.id), enabled: !!assignmentId });
  const a = asg.data?.find((x) => x.id === assignmentId);
  const [marks, setMarks] = React.useState<Record<string, string>>({}); const [fb, setFb] = React.useState<Record<string, string>>({});
  const grade = useMutation({ mutationFn: ({ id, release }: { id: string; release: boolean }) => { const m = Number(marks[id]); if (marks[id] === undefined || Number.isNaN(m) || m < 0 || (a && m > a.totalMarks)) throw new Error(`Enter marks between 0 and ${a?.totalMarks ?? 100}`); return assignmentService.grade(id, m, fb[id] ?? "", release); },
    onSuccess: (_, v) => { toast.success(v.release ? "Marks released to the student" : "Saved, not released"); subs.refetch(); qc.invalidateQueries({ queryKey: [...KEYS.grading] }); qc.invalidateQueries({ queryKey: [...KEYS.assignments] }); qc.invalidateQueries({ queryKey: ["student"] }); }, onError: (e) => toast.error(errMsg(e)) });
  return (
    <Drawer open={!!assignmentId} onOpenChange={(v) => !v && onClose()} title={a ? `Submissions · ${a.title}` : "Submissions"} width="sm:max-w-xl">
      <Q q={subs} isEmpty={(d) => !d.length} empty={<EmptyState title="No submissions yet" body="Students' work will appear here as they submit." />}>
        {(d) => <ul className="space-y-3">{d.map((s) => (
          <li key={s.id} className="rounded-xl border border-border p-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{nameOf(s.studentId)}</span><StatusBadge status={s.status} /></div>
            <p className="text-xs text-text-2">{s.submittedAt ? `Submitted ${fmtDateTime(s.submittedAt)}` : "Not submitted"}{s.releaseStatus === "released" ? ` · released: ${s.marks}/${a?.totalMarks}` : s.marks !== undefined ? ` · saved ${s.marks}, unreleased` : ""}</p>
            {s.text && <p className="mt-1 rounded-lg bg-surface-2 p-2">{s.text}</p>}{s.attachments.map((x) => <Badge key={x.name} className="mr-1 mt-1">{x.name}</Badge>)}
            {["submitted", "returned"].includes(s.status) && (
              <div className="mt-2 space-y-2">{s.draftAiMarks !== undefined && <p className="flex items-center gap-1 text-xs"><AIBadge label="AI draft" /> suggested {s.draftAiMarks}/{a?.totalMarks} — not final</p>}
                <div className="flex gap-2"><label className="sr-only" htmlFor={`m-${s.id}`}>Marks</label><Input id={`m-${s.id}`} type="number" placeholder={`Marks / ${a?.totalMarks}`} className="!w-32" value={marks[s.id] ?? ""} onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))} /><label className="sr-only" htmlFor={`f-${s.id}`}>Feedback</label><Input id={`f-${s.id}`} placeholder="Feedback" value={fb[s.id] ?? s.feedback ?? ""} onChange={(e) => setFb((m) => ({ ...m, [s.id]: e.target.value }))} /></div>
                <div className="flex gap-2"><Button size="sm" variant="outline" loading={grade.isPending} onClick={() => grade.mutate({ id: s.id, release: false })}>Save (don't release)</Button><Button size="sm" loading={grade.isPending} onClick={() => grade.mutate({ id: s.id, release: true })}>Save & release</Button></div></div>
            )}
          </li>))}</ul>}
      </Q>
    </Drawer>
  );
}

/* ---------------- Rubrics ---------------- */
const LEVELS = ["Exceeds", "Meets", "Approaching", "Beginning"];
function Rubrics() {
  const qc = useQueryClient(); const q = useQuery({ queryKey: ["t", "rubrics"], queryFn: () => teacherExamService.listRubrics() });
  const [edit, setEdit] = React.useState<Rubric | "new" | null>(null); const [del, setDel] = React.useState<Rubric | null>(null); const [prev, setPrev] = React.useState<{ r: Rubric; as: "student" | "grader" } | null>(null);
  const inv = () => qc.invalidateQueries({ queryKey: ["t", "rubrics"] });
  const dup = useMutation({ mutationFn: (id: string) => teacherExamService.duplicateRubric(id), onSuccess: () => { toast.success("Rubric duplicated"); inv(); } });
  const rm = useMutation({ mutationFn: (id: string) => teacherExamService.deleteRubric(id), onSuccess: () => { toast.info("Rubric deleted"); inv(); } });
  return (<>
    <div className="mb-3 flex justify-end"><Button onClick={() => setEdit("new")}><Plus size={16} />New rubric</Button></div>
    <Q q={q} isEmpty={(d) => !d.length} empty={<EmptyState title="No rubrics" body="Build a rubric to grade consistently and give students clear expectations." action={{ label: "New rubric", onClick: () => setEdit("new") }} />}>
      {(d) => <ul className="space-y-2">{d.map((r) => <li key={r.id}><Card><CardBody className="flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1"><p className="font-semibold">{r.name}</p><p className="text-xs text-text-2">{r.criteria.length} criteria · {r.criteria.map((c) => `${c.name} ${c.weight}%`).join(", ")}</p></div>
        <Button size="sm" variant="ghost" onClick={() => setPrev({ r, as: "student" })}><Eye size={14} />Student view</Button><Button size="sm" variant="ghost" onClick={() => setPrev({ r, as: "grader" })}>Grader view</Button><Button size="sm" variant="outline" onClick={() => setEdit(r)}>Edit</Button><Button size="sm" variant="ghost" aria-label="Duplicate rubric" onClick={() => dup.mutate(r.id)}><Copy size={14} /></Button><Button size="sm" variant="ghost" aria-label="Delete rubric" onClick={() => setDel(r)}><Trash size={14} className="text-danger" /></Button></CardBody></Card></li>)}</ul>}
    </Q>
    {edit && <RubricEditor key={typeof edit === "string" ? "new" : edit.id} rubric={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={inv} />}
    <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)} destructive title="Delete rubric?" body={`“${del?.name}” will be removed from your library. Assignments already using it keep their reference.`} confirmLabel="Delete" onConfirm={() => del && rm.mutate(del.id)} />
    <Modal open={!!prev} onOpenChange={(v) => !v && setPrev(null)} title={prev ? `${prev.r.name} · ${prev.as === "student" ? "student view" : "grader view"}` : ""} className="sm:max-w-2xl">
      {prev && <div className="space-y-3">{prev.r.criteria.map((c) => <div key={c.id} className="rounded-xl border border-border p-3"><p className="text-sm font-semibold">{c.name} <span className="text-xs font-normal text-text-2">· {c.weight}%{prev.as === "grader" ? ` · ${c.bloom} · ${OBJECTIVES.find((o) => o.id === c.objectiveId)?.code ?? "no objective"}` : ""}</span></p><p className="text-xs text-text-2">{c.description}</p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-4">{c.levels.map((l) => <label key={l.label} className="rounded-lg bg-surface-2 p-2 text-xs">{prev.as === "grader" && <input type="radio" name={`g-${c.id}`} className="mr-1 accent-[var(--primary)]" />}<strong>{l.label}</strong>{prev.as === "grader" || true ? ` · ${l.points} pt` : ""}<span className="block text-text-2">{l.descriptor}</span></label>)}</div></div>)}</div>}
    </Modal>
  </>);
}

function RubricEditor({ rubric, onClose, onSaved }: { rubric: Rubric | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = React.useState(rubric?.name ?? ""); const [crit, setCrit] = React.useState<Rubric["criteria"]>(rubric?.criteria ?? [{ id: "c1", name: "", description: "", weight: 100, bloom: "Apply", levels: LEVELS.map((l, i) => ({ label: l, points: 3 - i, descriptor: "" })) }]);
  const total = crit.reduce((a, c) => a + (Number(c.weight) || 0), 0); const nameErr = name.trim().length < 3 ? "Name the rubric" : undefined;
  const save = useMutation({ mutationFn: () => teacherExamService.saveRubric({ id: rubric?.id, name: name.trim(), subjectId: rubric?.subjectId ?? "sub-math", criteria: crit }), onSuccess: () => { toast.success("Rubric saved"); onSaved(); onClose(); }, onError: (e) => toast.error(errMsg(e)) });
  const upd = (i: number, p: Partial<Rubric["criteria"][number]>) => setCrit((c) => c.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const invalid = !!nameErr || crit.some((c) => !c.name.trim());
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={rubric ? "Edit rubric" : "New rubric"} className="sm:max-w-3xl" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={invalid} loading={save.isPending} onClick={() => save.mutate()}>Save rubric</Button></>}>
      <div className="space-y-3"><Field label="Rubric name" required error={nameErr} htmlFor="r-name"><Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        {crit.map((c, i) => (
          <fieldset key={c.id + i} className="space-y-2 rounded-xl border border-border p-3"><legend className="px-1 text-xs font-bold">Criterion {i + 1}</legend>
            <div className="grid gap-2 sm:grid-cols-[1fr_6rem]"><Field label="Name" required error={!c.name.trim() ? "Required" : undefined}><Input aria-label={`Criterion ${i + 1} name`} value={c.name} onChange={(e) => upd(i, { name: e.target.value })} /></Field><Field label="Weight %" ><Input aria-label={`Criterion ${i + 1} weight`} type="number" min={0} max={100} value={c.weight} onChange={(e) => upd(i, { weight: Number(e.target.value) })} /></Field></div>
            <Input aria-label="Description" placeholder="What good looks like" value={c.description} onChange={(e) => upd(i, { description: e.target.value })} />
            <div className="grid gap-2 sm:grid-cols-2"><Select aria-label="Bloom level" value={c.bloom} onChange={(e) => upd(i, { bloom: e.target.value })}>{["Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create"].map((b) => <option key={b}>{b}</option>)}</Select><Select aria-label="Learning objective" value={c.objectiveId ?? ""} onChange={(e) => upd(i, { objectiveId: e.target.value || undefined })}><option value="">No objective</option>{OBJECTIVES.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.title}</option>)}</Select></div>
            <div className="grid gap-2 sm:grid-cols-4">{c.levels.map((l, li) => <div key={l.label} className="rounded-lg bg-surface-2 p-2"><p className="text-xs font-bold">{l.label}</p><Input aria-label={`${l.label} points`} type="number" min={0} className="mt-1 h-9" value={l.points} onChange={(e) => upd(i, { levels: c.levels.map((x, k) => (k === li ? { ...x, points: Number(e.target.value) } : x)) })} /><Input aria-label={`${l.label} descriptor`} placeholder="Descriptor" className="mt-1 h-9" value={l.descriptor} onChange={(e) => upd(i, { levels: c.levels.map((x, k) => (k === li ? { ...x, descriptor: e.target.value } : x)) })} /></div>)}</div>
            {crit.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => setCrit((x) => x.filter((_, j) => j !== i))}>Remove criterion</Button>}
          </fieldset>))}
        <div className="flex items-center justify-between"><Button type="button" size="sm" variant="outline" onClick={() => setCrit((c) => [...c, { id: `c${Date.now()}`, name: "", description: "", weight: 0, bloom: "Apply", levels: LEVELS.map((l, k) => ({ label: l, points: 3 - k, descriptor: "" })) }])}><Plus size={14} />Add criterion</Button><span role="status" className={total === 100 ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>Weights total {total}%{total === 100 ? "" : " (must be 100%)"}</span></div>
      </div>
    </Modal>
  );
}

/* ---------------- Exams ---------------- */
const examSchema = z.object({ title: z.string().trim().min(3, "Title needs 3+ characters"), classIds: z.array(z.string()).min(1, "Select a class"), paper: z.string().trim().min(3, "Name the paper"), startsAt: z.string().min(1, "Choose a start"), durationMin: z.coerce.number().int().min(10, "At least 10 minutes").max(240), maxMarks: z.coerce.number().int().min(1).max(200), accommodations: z.string().optional() });
type EV = z.infer<typeof examSchema>;
function Exams() {
  const t = useTeacher(); const qc = useQueryClient(); const q = useQuery({ queryKey: ["t", "exams"], queryFn: () => teacherExamService.listExams() });
  const [open, setOpen] = React.useState(false); const [res, setRes] = React.useState<TeacherExam | null>(null); const [cancel, setCancel] = React.useState<TeacherExam | null>(null);
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<EV>({ resolver: zodResolver(examSchema) as any, defaultValues: { title: "", classIds: ["cls-8b"], paper: "", startsAt: inDays(14, 9).slice(0, 16), durationMin: 60, maxMarks: 40, accommodations: "" } });
  const create = useMutation({ mutationFn: (v: EV) => teacherExamService.createExam({ title: v.title, classIds: v.classIds, paper: v.paper, startsAt: new Date(v.startsAt).toISOString(), durationMin: v.durationMin, maxMarks: v.maxMarks, accommodations: (v.accommodations ?? "").split("\n").map((x) => x.trim()).filter(Boolean) }), onSuccess: () => { toast.success("Exam scheduled and students notified"); qc.invalidateQueries({ queryKey: ["t", "exams"] }); reset(); setOpen(false); }, onError: (e) => toast.error(errMsg(e)) });
  const approve = useMutation({ mutationFn: (id: string) => teacherExamService.approveResults(id), onSuccess: () => { toast.success("Results approved"); qc.invalidateQueries({ queryKey: ["t", "exams"] }); setRes(null); } });
  const cx = useMutation({ mutationFn: (id: string) => teacherExamService.cancelExam(id), onSuccess: () => { toast.info("Exam cancelled"); qc.invalidateQueries({ queryKey: ["t", "exams"] }); } });
  return (<>
    <div className="mb-3 flex justify-end"><Button onClick={() => setOpen(true)}><Plus size={16} />Schedule exam</Button></div>
    <Q q={q} isEmpty={(d) => !d.length} empty={<EmptyState title="No exams scheduled" body="Schedule an exam and assign its paper." action={{ label: "Schedule exam", onClick: () => setOpen(true) }} />}>
      {(d) => <ul className="space-y-2">{d.map((e) => <li key={e.id}><Card><CardBody className="flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1"><p className="font-semibold">{e.title}</p><p className="text-xs text-text-2">{fmtDateTime(e.startsAt)} · {e.durationMin} min · {e.maxMarks} marks · {e.classIds.map((c) => CLASSROOMS.find((x) => x.id === c)?.name).join(", ")}<br />{e.paper}{e.accommodations.length ? ` · Accommodations: ${e.accommodations.join("; ")}` : ""}</p></div>
        <StatusBadge status={e.status} label={e.status.replace(/-/g, " ")} />{e.results && <Button size="sm" variant="soft" onClick={() => setRes(e)}>Review results</Button>}{e.status === "scheduled" && <Button size="sm" variant="ghost" onClick={() => setCancel(e)}>Cancel</Button>}</CardBody></Card></li>)}</ul>}
    </Q>
    <Modal open={open} onOpenChange={setOpen} title="Schedule exam" className="sm:max-w-xl"><form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3" noValidate>
      <Field label="Title" required error={errors.title?.message} htmlFor="e-title"><Input id="e-title" {...register("title")} /></Field>
      <Controller control={control} name="classIds" render={({ field }) => <fieldset><legend className="mb-1 text-sm font-semibold">Classes</legend><div className="flex flex-wrap gap-3">{t.teacher.classIds.map((c) => <Checkbox key={c} label={CLASSROOMS.find((x) => x.id === c)!.name} checked={field.value.includes(c)} onChange={(v) => field.onChange(v ? [...field.value, c] : field.value.filter((x) => x !== c))} />)}</div>{errors.classIds && <p role="alert" className="text-xs font-medium text-danger">Fix this: {errors.classIds.message}</p>}</fieldset>} />
      <Field label="Assigned paper" required error={errors.paper?.message} htmlFor="e-paper" hint="Build or pick papers in Paper Builder"><Input id="e-paper" {...register("paper")} placeholder="e.g. Fractions & Linear Equations (40 marks)" /></Field>
      <div className="grid gap-3 sm:grid-cols-3"><Field label="Starts" required error={errors.startsAt?.message} htmlFor="e-start"><Input id="e-start" type="datetime-local" {...register("startsAt")} /></Field><Field label="Duration (min)" required error={errors.durationMin?.message} htmlFor="e-dur"><Input id="e-dur" type="number" {...register("durationMin")} /></Field><Field label="Max marks" error={errors.maxMarks?.message} htmlFor="e-max"><Input id="e-max" type="number" {...register("maxMarks")} /></Field></div>
      <Field label="Accommodations" optional hint="One per line" htmlFor="e-acc"><Textarea id="e-acc" {...register("accommodations")} /></Field>
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Schedule</Button></div></form></Modal>
    <Modal open={!!res} onOpenChange={(v) => !v && setRes(null)} title={res ? `Results · ${res.title}` : ""} description={res?.resultNote} footer={res?.status === "results-in-review" ? <><Button variant="ghost" onClick={() => setRes(null)}>Close</Button><Button loading={approve.isPending} onClick={() => approve.mutate(res.id)}>Approve results</Button></> : <Button variant="ghost" onClick={() => setRes(null)}>Close</Button>}>
      {res?.results && <ul className="space-y-2">{res.results.map((r) => <li key={r.studentId} className="flex items-center gap-3 text-sm"><span className="w-32 truncate font-medium">{nameOf(r.studentId)}</span><Progress value={(r.marks / res.maxMarks) * 100} size="sm" label={`${nameOf(r.studentId)} score`} /><span className="tnum w-14 text-right">{r.marks}/{res.maxMarks}</span></li>)}</ul>}
    </Modal>
    <ConfirmDialog open={!!cancel} onOpenChange={(v) => !v && setCancel(null)} destructive title="Cancel this exam?" body={`“${cancel?.title}” will be removed from the schedule.`} confirmLabel="Cancel exam" onConfirm={() => cancel && cx.mutate(cancel.id)} />
  </>);
}
