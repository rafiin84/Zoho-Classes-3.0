"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CaretDown, CheckCircle, Exam, Lightning, PlayCircle, Sparkle, BookOpenText, FileText } from "@phosphor-icons/react";
import { Badge, Card, CardBody, EmptyState, ErrorState, ListToolbar, NoResults, PageHeader, Progress, Skeleton, cn } from "@/components/ui";
import { courseService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { ACADEMIC_YEARS, CURRICULUM, GRADES, OBJECTIVES, SUBJECTS } from "@/lib/mock-data/core";
import type { ScreenProps } from "@/types/screens";
import { useProfile, useStudentRecord } from "../hooks";

const sel = "h-11 rounded-full border border-border bg-surface px-4 text-sm";
const practiceFor = (id: string) => id === "lo-frac-add" ? "fractions" : id === "lo-frac-mul" ? "divide" : id === "lo-alg-lin" ? "linear" : id === "lo-eco-chain" ? "foodchain" : null;

export default function SyllabusScreen(_p: ScreenProps) {
  const { studentId } = useActors(); const student = useStudentRecord(); const profile = useProfile();
  const [ay, setAy] = useState(ACADEMIC_YEARS[0].id); const [grade, setGrade] = useState(student.gradeId); const [subject, setSubject] = useState("sub-math"); const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const content = useQuery({ queryKey: ["syllabus-content", studentId], queryFn: async () => { const cs = await courseService.list(studentId); const sts = await Promise.all(cs.map((c) => courseService.structure(c.id))); return cs.map((c, i) => ({ course: c, acts: sts[i].activities })); } });
  const objs = useMemo(() => OBJECTIVES.filter((o) => o.gradeId === grade && o.subjectId === subject && (!q || (o.title + o.chapter + o.code).toLowerCase().includes(q.toLowerCase()))), [grade, subject, q]);
  const chapters = useMemo(() => { const m = new Map<string, typeof objs>(); objs.forEach((o) => m.set(o.chapter, [...(m.get(o.chapter) ?? []), o])); return [...m.entries()]; }, [objs]);
  const mastery = (id: string) => profile.data?.objectives.find((o) => o.objectiveId === id)?.mastery;
  const clear = () => { setQ(""); };
  const allForSubj = OBJECTIVES.filter((o) => o.gradeId === grade && o.subjectId === subject);
  const doneCount = allForSubj.filter((o) => (mastery(o.id) ?? 0) >= 70).length;
  const readOnlyYear = ay !== ACADEMIC_YEARS[0].id;

  return (
    <div className="space-y-5">
      <PageHeader title="Syllabus" subtitle="Every chapter and learning objective, with the lessons, practice and checks that go with it."
        eyebrow={<Badge tone="primary">{CURRICULUM.name} · version {CURRICULUM.version}</Badge>} />
      <ListToolbar query={q} onQuery={setQ} placeholder="Search chapters or objectives" count={objs.length} onClear={clear}>
        <select aria-label="Academic year" className={sel} value={ay} onChange={(e) => setAy(e.target.value)}>{ACADEMIC_YEARS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
        <select aria-label="Grade" className={sel} value={grade} onChange={(e) => setGrade(e.target.value)}>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select>
        <select aria-label="Subject" className={sel} value={subject} onChange={(e) => setSubject(e.target.value)}>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </ListToolbar>
      {readOnlyYear && <p role="status" className="rounded-2xl bg-info-soft p-3 text-sm text-info">You’re viewing a previous academic year. Progress shown is for the current year.</p>}
      {allForSubj.length > 0 && <Card tone="lilac"><CardBody className="flex flex-wrap items-center gap-4"><div className="min-w-0 flex-1"><p className="font-semibold">{SUBJECTS.find((s) => s.id === subject)?.name} · {GRADES.find((g) => g.id === grade)?.label}</p><p className="tnum text-sm text-text-2">{doneCount} of {allForSubj.length} objectives comfortable (70%+ mastery)</p></div><div className="w-40"><Progress value={Math.round((doneCount / allForSubj.length) * 100)} label="Syllabus completion" /></div></CardBody></Card>}
      {content.isError ? <ErrorState onRetry={() => content.refetch()} /> : profile.isLoading || content.isLoading ? <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div> :
        allForSubj.length === 0 ? <EmptyState title="No syllabus for this selection yet" body="Pick another subject or grade — your school publishes the curriculum as it’s approved." /> :
        chapters.length === 0 ? <NoResults query={q} onClear={clear} /> :
        <div className="space-y-4">{chapters.map(([ch, list], ci) => { const comfy = list.filter((o) => (mastery(o.id) ?? 0) >= 70).length; return (
          <Card key={ch}><CardBody className="space-y-3"><div className="flex flex-wrap items-center gap-3"><span className="tnum flex size-9 items-center justify-center rounded-full bg-lilac font-bold text-primary">{ci + 1}</span><div className="min-w-0 flex-1"><h2 className="font-bold">{ch}</h2><p className="tnum text-xs text-text-2">{comfy}/{list.length} objectives comfortable</p></div>{comfy === list.length && <Badge tone="success" icon={<CheckCircle size={12} weight="fill" />}>Chapter complete</Badge>}</div>
            <ul className="space-y-2">{list.map((o) => { const m = mastery(o.id); const isOpen = open === o.id;
              const linked = (content.data ?? []).map((x) => ({ course: x.course, acts: x.acts.filter((a) => a.learningObjectiveIds.includes(o.id)) })).filter((x) => x.acts.length > 0);
              const resources = linked.flatMap((x) => x.acts.filter((a) => ["video", "lesson", "reading", "document"].includes(a.type)).map((a) => ({ a, c: x.course })));
              const checks = linked.flatMap((x) => x.acts.filter((a) => ["assessment", "quiz", "ai-checkpoint", "mcq", "assignment"].includes(a.type)).map((a) => ({ a, c: x.course }))); const p = practiceFor(o.id);
              return <li key={o.id} className="rounded-2xl border border-border"><button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : o.id)} className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2.5 text-left"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{o.title}</p><p className="text-xs text-text-2"><span className="font-mono">{o.code}</span> · {o.competency}</p></div><div className="w-24 shrink-0"><Progress value={m ?? 0} size="sm" label={`${o.title} mastery`} /><p className="tnum mt-0.5 text-right text-[11px] text-text-2">{m === undefined ? "Not started" : `${m}%`}</p></div><CaretDown size={16} className={cn("shrink-0 text-text-2 transition-transform", isOpen && "rotate-180")} /></button>
                {isOpen && <div className="grid gap-3 border-t border-border p-3.5 text-sm sm:grid-cols-3">
                  <div><p className="text-label mb-1.5 flex items-center gap-1 text-text-2"><BookOpenText size={13} />Learn</p>{resources.length === 0 ? <p className="text-text-2">No lessons linked yet.</p> : <ul className="space-y-1">{resources.map(({ a, c }) => <li key={a.id}><Link className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline" href={c.enrolled ? `/student/player/${c.id}?activity=${a.id}` : `/student/courses/${c.id}`}>{a.type === "video" ? <PlayCircle size={14} /> : <FileText size={14} />}{a.title}</Link></li>)}</ul>}</div>
                  <div><p className="text-label mb-1.5 flex items-center gap-1 text-text-2"><Lightning size={13} />Practise</p>{p ? <Link className="font-medium text-primary hover:underline" href={`/student/micro?practice=${p}`}>5-minute practice quiz</Link> : <p className="text-text-2">Ask your tutor for practice.</p>}<Link className="mt-1 flex items-center gap-1 font-medium text-primary hover:underline" href={`/student/tutor?mode=practice&q=${encodeURIComponent(`Explain ${o.title}`)}`}><Sparkle size={13} />Ask my tutor</Link></div>
                  <div><p className="text-label mb-1.5 flex items-center gap-1 text-text-2"><Exam size={13} />Check yourself</p>{checks.length === 0 ? <p className="text-text-2">No assessments linked yet.</p> : <ul className="space-y-1">{checks.map(({ a, c }) => <li key={a.id}><Link className="font-medium text-primary hover:underline" href={c.enrolled ? `/student/player/${c.id}?activity=${a.id}` : `/student/courses/${c.id}`}>{a.title}</Link></li>)}</ul>}</div>
                </div>}</li>; })}</ul></CardBody></Card>); })}</div>}
    </div>
  );
}
