"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Books, Exam, TreeStructure, Lightning, UsersThree, Play, Compass, CheckCircle } from "@phosphor-icons/react";
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, Icon, Modal, PageHeader, Progress, Segmented, Skeleton, SectionHeader, toast } from "@/components/ui";
import { assignmentService, courseService, learningProfileService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { OBJECTIVES, STUDENTS, SUBJECTS, subjectById } from "@/lib/mock-data/core";
import { MICRO_TOPICS } from "@/lib/mock-data/micro";
import { fmtDate } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { studentKeys } from "../keys";
import { useInvalidateLearning, useMyCourses, useProfile, useRemedial, useStudentRecord } from "../hooks";
import { buildPath, type PathNode } from "../learn/path";
import { PathView } from "../learn/PathView";

function usePathFor(studentId: string, courseId: string | undefined, enabled = true) {
  const q = useQuery({
    queryKey: ["learn-path", studentId, courseId], enabled: enabled && !!courseId,
    queryFn: async () => {
      const [st, completed, profile, remedial, asg, courses] = await Promise.all([courseService.structure(courseId!), courseService.completed(studentId, courseId!), learningProfileService.get(studentId), learningProfileService.remedialFor(studentId), assignmentService.forStudent(studentId), courseService.list(studentId)]);
      const course = courses.find((c) => c.id === courseId)!;
      const dues: Record<string, string> = {}; st.activities.filter((a) => a.type === "assignment").forEach((a) => { const m = asg.find((x) => x.assignment.courseId === courseId && a.title.toLowerCase().includes(x.assignment.title.toLowerCase())); if (m) dues[a.id] = m.assignment.dueAt; });
      const student = STUDENTS.find((s) => s.id === studentId)!;
      return { built: buildPath({ student, course, modules: st.modules, activities: st.activities, completed, profile, remedial, dues, enrolled: course.enrolled }), st, course };
    },
  });
  return q;
}

export default function LearnScreen(_p: ScreenProps) {
  const { studentId } = useActors(); const student = useStudentRecord(); const inv = useInvalidateLearning();
  const courses = useMyCourses(); const profile = useProfile(); const remedial = useRemedial();
  const [subjectId, setSubjectId] = useState<string | null>(null); const [open, setOpen] = useState<PathNode | null>(null); const [compare, setCompare] = useState(false);
  const pool = useMemo(() => (courses.data ?? []).filter((c) => c.status === "published" && c.gradeIds.includes(student.gradeId)), [courses.data, student.gradeId]);
  const subjects = useMemo(() => SUBJECTS.filter((s) => pool.some((c) => c.subjectId === s.id)), [pool]);
  const subj = subjectId ?? (pool.find((c) => c.enrolled && c.subjectId === "sub-math")?.subjectId ?? pool.find((c) => c.enrolled)?.subjectId ?? subjects[0]?.id ?? "sub-math");
  const course = pool.filter((c) => c.subjectId === subj).sort((a, b) => Number(b.enrolled) - Number(a.enrolled))[0];
  const pathQ = usePathFor(studentId, course?.id, !!course);
  const step = useMutation({ mutationFn: (p: { id: string; step: string }) => learningProfileService.completeRemedialStep(p.id, p.step), onSuccess: () => { inv(); pathQ.refetch(); toast.success("Step complete — nice and steady"); setOpen(null); } });
  const objectives = OBJECTIVES.filter((o) => o.subjectId === subj && o.gradeId === student.gradeId).map((o) => ({ ...o, mastery: profile.data?.objectives.find((x) => x.objectiveId === o.id)?.mastery }));
  const activeRem = remedial.data?.find((r) => r.status !== "completed");

  if (courses.isLoading) return <div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-24" /><Skeleton className="h-96" /></div>;
  if (courses.isError) return <ErrorState onRetry={() => courses.refetch()} />;
  const built = pathQ.data?.built; const total = pathQ.data?.st.activities.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Your learning journey" subtitle="A path that bends around you — what you know, what you’re working on, what’s next."
        actions={<Button variant="outline" onClick={() => setCompare(true)}><UsersThree size={18} />Compare paths (demo)</Button>} />
      {subjects.length === 0 ? <EmptyState title="No courses to build a path from yet" body="Once you’re enrolled in a course, your personal path appears here." action={{ label: "Browse courses", href: "/student/courses" }} /> : <>
        <Segmented label="Subject" value={subj} onChange={setSubjectId} options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
        {!course ? null : pathQ.isLoading ? <Skeleton className="h-96" /> : pathQ.isError || !built ? <ErrorState onRetry={() => pathQ.refetch()} /> : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              <Card className="overflow-hidden"><div className="flex items-center gap-4 p-4 text-white" style={{ background: `linear-gradient(135deg, ${course.cover.from}, ${course.cover.to})` }}>
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20"><Icon name={course.cover.icon} size={30} weight="duotone" /></span>
                <div className="min-w-0 flex-1"><p className="text-label text-white/80">{subjectById(subj).name}</p><h2 className="truncate text-xl font-bold">{course.title}</h2><p className="tnum text-sm text-white/85">{built.pct}% of path · about {built.remainingMinutes} min left</p></div></div>
                <CardBody className="space-y-3">
                  <Progress value={built.pct} label="Path progress" />
                  {!course.enrolled ? <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-text-2">{course.priceType === "paid" ? "This is a paid marketplace course." : "Not started yet."}</p><Button asChild size="sm"><Link href={`/student/courses/${course.id}`}>{course.priceType === "paid" ? "View & purchase" : "Enrol free"}</Link></Button></div> :
                    built.current ? <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-label text-text-2">Continue</p><p className="truncate font-semibold">{built.current.title}</p></div><Button onClick={() => setOpen(built.current!)}><Play size={16} weight="fill" />Continue<ArrowRight size={14} weight="bold" /></Button></div> :
                    <p className="flex items-center gap-2 text-sm font-semibold text-success"><CheckCircle size={18} weight="fill" />Path complete — beautiful work.</p>}
                </CardBody></Card>
              <Card><CardBody>
                <div className="mb-2 flex flex-wrap items-center gap-2"><h3 className="font-semibold">Why this path for you?</h3><Badge tone="ai">Personalised</Badge></div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-text-2">{built.why.map((w) => <li key={w}>{w}</li>)}</ul>
              </CardBody></Card>
              <div className="rounded-[1.5rem] bg-surface-2/60 px-3 py-4 sm:px-6"><PathView nodes={built.nodes} onOpen={setOpen} /></div>
            </div>

            <div className="space-y-4 lg:col-span-5">
              {activeRem && <Card id="remedial" tone="lilac"><CardBody className="space-y-3">
                <div><Badge tone="primary">Recovery branch</Badge><h3 className="mt-1 font-bold">{activeRem.title}</h3><p className="text-sm text-text-2">{activeRem.origin === "teacher" ? "Set up by your teacher" : "Suggested by your tutor"} · target {fmtDate(activeRem.targetDate, { day: "numeric", month: "short" })}</p></div>
                <Progress value={Math.round((activeRem.steps.filter((s) => s.done).length / activeRem.steps.length) * 100)} label="Recovery progress" />
                <ul className="space-y-1.5">{activeRem.steps.map((s) => <li key={s.id} className="flex items-center gap-2 rounded-xl bg-surface p-2.5 text-sm"><span className={s.done ? "text-success" : "text-text-2"}><CheckCircle size={20} weight={s.done ? "fill" : "regular"} /></span><span className="min-w-0 flex-1"><span className={s.done ? "line-through opacity-70" : "font-medium"}>{s.label}</span><span className="tnum block text-xs text-text-2">{s.kind} · {s.minutes} min</span></span>{!s.done && <Button size="sm" variant="soft" loading={step.isPending && step.variables?.step === s.id} onClick={() => step.mutate({ id: activeRem.id, step: s.id })}>Mark done</Button>}</li>)}</ul>
              </CardBody></Card>}
              <Card><CardBody className="space-y-3"><h3 className="font-semibold">Course timeline</h3>
                <ol className="space-y-2.5">{pathQ.data!.st.modules.map((m) => { const acts = pathQ.data!.st.activities.filter((a) => a.moduleId === m.id); const nodes = built.nodes.filter((n) => acts.some((a) => a.id === n.activityId)); const done = nodes.filter((n) => n.status === "done").length; const mins = acts.reduce((a, x) => a + x.estimatedMinutes, 0); const due = nodes.find((n) => n.due)?.due;
                  return <li key={m.id} className="flex items-center gap-3"><span className="tnum flex size-8 shrink-0 items-center justify-center rounded-full bg-lilac text-sm font-bold text-primary">{m.sequence}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{m.title}</p><p className="tnum text-xs text-text-2">{done}/{acts.length} done · ~{mins} min{due ? ` · due ${fmtDate(due, { day: "numeric", month: "short" })}` : ""}</p></div></li>; })}</ol>
                <p className="text-xs text-text-2">{total} activities · same sequence your teacher authored.</p></CardBody></Card>
              <Card><CardBody className="space-y-3"><h3 className="font-semibold">Learning objectives</h3>
                {objectives.length === 0 ? <p className="text-sm text-text-2">No objectives mapped for this subject yet.</p> : <ul className="space-y-3">{objectives.map((o) => <li key={o.id}><div className="flex items-baseline justify-between gap-2 text-sm"><span className="font-medium">{o.title}</span><span className="tnum text-xs text-text-2">{o.mastery === undefined ? "Not started" : `${o.mastery}%`}</span></div><Progress value={o.mastery ?? 0} size="sm" label={o.title} tone={o.mastery !== undefined && o.mastery < 50 ? "highlight" : "primary"} /></li>)}</ul>}
              </CardBody></Card>
            </div>
          </div>)}

        <section className="space-y-3"><SectionHeader title="Practice" subtitle="Pick a topic and get a quick adaptive quiz." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{MICRO_TOPICS.map((t) => <Link key={t.id} href={`/student/micro?practice=${t.id}`} className="group overflow-hidden rounded-[1.25rem] border border-border bg-surface shadow-soft hover:shadow-card"><div className="flex h-16 items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}><Icon name={t.icon} size={28} weight="duotone" /></div><div className="flex items-center justify-between p-3"><div><p className="font-semibold">{t.label}</p><p className="text-xs text-text-2">5 questions · ~5 min</p></div><Lightning size={18} weight="fill" className="text-primary" /></div></Link>)}</div></section>
        <section className="grid gap-3 sm:grid-cols-3">{[{ h: "/student/courses", i: Books, t: "Courses", d: "Discover and continue" }, { h: "/student/syllabus", i: TreeStructure, t: "Syllabus", d: "Chapters and objectives" }, { h: "/student/exams", i: Exam, t: "Exams", d: "Schedule and practice" }].map((e) => <Link key={e.h} href={e.h}><Card className="transition-shadow hover:shadow-card"><CardBody className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-lilac text-primary"><e.i size={22} weight="duotone" /></span><div className="flex-1"><p className="font-semibold">{e.t}</p><p className="text-xs text-text-2">{e.d}</p></div><ArrowRight size={16} className="text-text-2" /></CardBody></Card></Link>)}</section>
      </>}

      <Modal open={!!open} onOpenChange={(v) => !v && setOpen(null)} title={open?.title ?? ""} description={open ? `${open.minutes} min · ${open.status === "current" ? "up next" : open.status}` : undefined}
        footer={open && open.status !== "locked" ? (open.kind === "remedial" ? (open.status === "done" ? <Button variant="ghost" onClick={() => setOpen(null)}>Close</Button> : <Button loading={step.isPending} onClick={() => step.mutate({ id: open.remedialId!, step: open.stepId! })}>Mark step done</Button>) : <Button asChild><Link href={open.href ?? "/student/learn"}>{open.status === "done" ? "Review" : "Start"}</Link></Button>) : undefined}>
        {open && <div className="space-y-3 text-sm"><div className="flex flex-wrap gap-1.5">{open.tags.map((t) => <Badge key={t} tone="primary">{t.replace("-", " ")}</Badge>)}</div>{open.note && <p className="text-text-2">{open.note}</p>}{open.status === "locked" && <p className="rounded-xl bg-highlight-soft p-3 text-warning">This unlocks after your re-check. It’s there to make the next part feel easier, not as a penalty.</p>}{open.due && <p className="text-text-2">Due {fmtDate(open.due)}</p>}</div>}
      </Modal>
      <ComparePaths open={compare} onOpenChange={setCompare} courseId="crs-fractions" />
    </div>
  );
}

function ComparePaths({ open, onOpenChange, courseId }: { open: boolean; onOpenChange: (v: boolean) => void; courseId: string }) {
  const ids = ["stu-ananya", "stu-kabir", "stu-meera"];
  const a = usePathFor(ids[0], courseId, open); const k = usePathFor(ids[1], courseId, open); const m = usePathFor(ids[2], courseId, open);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Same course, three paths" description="Fractions & Decimals — next steps for each student, from the same teacher-authored structure." className="sm:max-w-3xl">
      <div className="grid gap-3 md:grid-cols-3">{[a, k, m].map((q, i) => { const st = STUDENTS.find((s) => s.id === ids[i])!; return (
        <Card key={st.id}><CardBody className="space-y-2"><p className="font-semibold">{st.displayName}</p>
          {q.isLoading || !q.data ? <Skeleton className="h-32" /> : <><p className="tnum text-xs text-text-2">{q.data.built.pct}% of path</p><ol className="space-y-1.5">{q.data.built.nodes.filter((n) => n.status !== "done").slice(0, 4).map((n) => <li key={n.id} className="rounded-xl bg-surface-2 p-2 text-xs"><span className="font-semibold">{n.title}</span><span className="block text-text-2">{n.kind === "remedial" ? "Recovery branch" : n.kind === "baseline" ? "Baseline" : n.kind === "extension" ? "Stretch" : n.status === "locked" ? "Locked until re-check" : n.type}</span></li>)}</ol><p className="text-xs text-text-2">{q.data.built.why[0]}</p></>}
        </CardBody></Card>); })}</div>
    </Modal>
  );
}
