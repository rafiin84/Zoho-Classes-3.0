"use client";
import Link from "next/link";
import { Flame, Heart, Leaf, Path } from "@phosphor-icons/react";
import { Badge, Card, CardBody, EmptyState, PageHeader, SectionHeader, Skeleton, ErrorState, Progress, StatTile } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { subjectById } from "@/lib/mock-data/core";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { useChild } from "../useChild";
import { AccessGate } from "../relationship";
import { useChildProfile, useChildRemedial, useChildAssignments, useChildExams } from "../data";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function Body() {
  const { childId, first } = useChild(); const pq = useChildProfile(childId); const rq = useChildRemedial(childId); const aq = useChildAssignments(childId); const eq = useChildExams(childId);
  if (pq.isLoading) return <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;
  if (pq.isError) return <ErrorState onRetry={() => pq.refetch()} />;
  const p = pq.data; if (!p) return <EmptyState title="No learning data yet" body={`${first} hasn't started learning activities. Progress shows up here after their first lessons.`} />;
  const mastery = Object.entries(p.subjectMastery).map(([id, v]) => ({ label: subjectById(id).name, value: v, color: subjectById(id).color }));
  const practise = [...p.gaps]; const asg = aq.data ?? []; const exams = (eq.data ?? []).filter((v) => v.exam.kind !== "practice");
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3"><StatTile label="Learning streak" value={`${p.streak.current} days`} hint={`Best ever ${p.streak.best}`} icon={<Flame size={20} weight="fill" />} /><StatTile label="This week" value={`${p.weeklyMinutes} / ${p.weeklyGoalMinutes} min`} hint="learning goal" /><StatTile label="Level" value={p.level} hint={`${p.points.toLocaleString("en-IN")} points`} /></div>
      <Card><CardBody><SectionHeader title="Streak this week" /><ol className="flex gap-2" aria-label="Days practised this week">{DAYS.map((d, i) => <li key={d} className={cn("flex size-11 flex-col items-center justify-center rounded-xl text-xs font-semibold", p.streak.weekDays[i] ? "bg-success-soft text-success" : "bg-surface-2 text-text-2")} aria-label={`${d}: ${p.streak.weekDays[i] ? "practised" : "not yet"}`}>{d}{p.streak.weekDays[i] ? <span aria-hidden>✓</span> : <span aria-hidden>·</span>}</li>)}</ol></CardBody></Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardBody><SectionHeader title="Subject progress" subtitle="Based on lessons, quizzes and checkpoints" />{mastery.length ? <BarChart horizontal data={mastery} max={100} unit="%" ariaLabel={`${first}'s mastery by subject`} height={220} /> : <p className="text-sm text-text-2">No subject progress recorded yet.</p>}</CardBody></Card>
        <Card><CardBody><SectionHeader title="What's going well" />{p.strengths.length ? <ul className="space-y-2">{p.strengths.map((s) => <li key={s} className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm"><Heart size={18} weight="fill" className="text-success" />{s}</li>)}</ul> : <p className="text-sm text-text-2">Strengths appear as {first} completes more activities.</p>}</CardBody></Card>
      </div>
      <Card><CardBody><SectionHeader title="Topics to practise together" subtitle="Everyone has areas they're still growing in" />
        {practise.length === 0 ? <p className="rounded-xl bg-surface-2 p-4 text-sm text-text-2"><Leaf size={18} className="mr-1 inline text-success" />No topics need extra practice right now. Keep it up.</p> : <ul className="space-y-2">{practise.map((g) => <li key={g.id} className="rounded-xl bg-surface-2 p-3 text-sm"><p className="font-semibold">{g.label} <span className="font-normal text-text-2">· {subjectById(g.subjectId).name}</span></p><p className="text-text-2">{g.derivedFrom}. A little regular practice usually helps here.</p></li>)}</ul>}
        {(rq.data ?? []).map((r) => <div key={r.id} className="mt-3 rounded-2xl bg-lilac p-4"><p className="flex items-center gap-2 font-semibold text-primary"><Path size={18} />Recommended plan: {r.title}</p><p className="text-xs text-text-2">{r.origin === "teacher" ? "Set by the teacher" : "Suggested by the learning assistant (demo)"} · target {fmtDate(r.targetDate, { day: "numeric", month: "short" })}</p><Progress className="mt-2" value={(r.steps.filter((s) => s.done).length / r.steps.length) * 100} label="Plan progress" /><p className="mt-1 text-xs text-text-2">{r.steps.filter((s) => s.done).length} of {r.steps.length} steps done</p></div>)}</CardBody></Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardBody><SectionHeader title="Assignments" />{asg.length === 0 ? <p className="text-sm text-text-2">No assignments set.</p> : <ul className="space-y-1.5 text-sm">{asg.map((r) => <li key={r.assignment.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"><span>{r.assignment.title}</span><span className="flex items-center gap-2">{r.submission.releaseStatus === "released" && r.submission.marks !== undefined ? <span className="tnum font-semibold">{r.submission.marks}/{r.assignment.totalMarks}</span> : null}<Badge tone={r.submission.status === "overdue" ? "danger" : r.submission.status === "graded" ? "success" : "warning"}>{r.submission.status}</Badge></span></li>)}</ul>}</CardBody></Card>
        <Card><CardBody><SectionHeader title="Exams" action={<Link href="/parent/results" className="text-sm font-semibold text-primary">Results</Link>} />{exams.length === 0 ? <p className="text-sm text-text-2">No exams scheduled.</p> : <ul className="space-y-1.5 text-sm">{exams.map((v) => <li key={v.exam.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"><span>{v.exam.title}</span><Badge tone={v.state === "results" ? "success" : v.state === "submitted" ? "warning" : "info"}>{v.state === "submitted" ? "Marks not released" : v.state}</Badge></li>)}</ul>}</CardBody></Card>
      </div>
    </div>
  );
}
export default function ParentLearning() {
  const { childId, child } = useChild();
  return <div><PageHeader title={`${child.displayName.split(" ")[0]}'s learning`} subtitle="A supportive view of progress, with ideas for helping at home." /><AccessGate need="basic"><Body key={childId} /></AccessGate></div>;
}
