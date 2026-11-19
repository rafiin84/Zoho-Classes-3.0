"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CaretDown, Info, TrendUp, TrendDown, Minus, Lightbulb } from "@phosphor-icons/react";
import { assignmentService, learningProfileService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { subjectById, SUBJECTS } from "@/lib/mock-data/core";
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, Icon, PageHeader, Progress, SectionHeader, Skeleton, AIBadge } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { fmtDate, relTime } from "@/lib/format";
import { communityKeys } from "../community/keys";

function Why({ text }: { text: string }) {
  const [o, setO] = React.useState(false);
  return (<div><button aria-expanded={o} onClick={() => setO((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Info size={13} /> How was this derived? <CaretDown size={11} className={o ? "rotate-180" : ""} /></button>{o && <p className="mt-1 rounded-xl bg-surface-2 p-2.5 text-xs text-text-2">{text} Based only on your own activity and teacher-released results; it can change as you practise. It's guidance, not a grade.</p>}</div>);
}

export default function LearningProfileScreen() {
  const { studentId } = useActors();
  const lp = useQuery({ queryKey: communityKeys.profile(studentId), queryFn: () => learningProfileService.get(studentId), retry: false });
  const rem = useQuery({ queryKey: ["remedial", studentId], queryFn: () => learningProfileService.remedialFor(studentId) });
  const asg = useQuery({ queryKey: ["assignments", "student", studentId], queryFn: () => assignmentService.forStudent(studentId) });
  if (lp.isPending) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-60" /></div>;
  if (lp.isError) return <ErrorState onRetry={() => lp.refetch()} />;
  const p = lp.data;
  if (!p || (p.objectives.length === 0 && p.history.length === 0)) return <div><PageHeader title="Learning profile" /><EmptyState title="Your profile is just getting started" body="Complete your baseline and a few activities. Insights appear once there's enough evidence to be fair." action={{ label: "Start learning", href: "/student/learn" }} /></div>;
  const subj = Object.entries(p.subjectMastery).map(([id, v]) => ({ label: subjectById(id).name.split(" ")[0], value: v }));
  const TrendIcon = ({ t }: { t: string }) => (t === "up" ? <TrendUp size={14} className="text-success" /> : t === "down" ? <TrendDown size={14} className="text-danger" /> : <Minus size={14} className="text-text-2" />);
  const next = [...p.gaps.map((g) => `Practise: ${g.label}`), ...(p.strengths.length ? [`Stretch yourself: try a challenge in ${p.strengths[0]}`] : [])];
  const graded = (asg.data ?? []).filter((a) => a.submission.status === "graded" || a.submission.status === "submitted");
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="Learning profile" subtitle="A private picture of what you know, where you're growing and what to try next." actions={<Button asChild variant="outline"><Link href="/student/you/portfolio">Open portfolio</Link></Button>} />
      <section aria-label="Mastery by subject"><SectionHeader title="Mastery by subject" />
        <Card><CardBody><BarChart ariaLabel="Mastery percentage by subject" data={subj} max={100} unit="%" /><div className="mt-3"><Why text="Subject mastery averages your recent checkpoint, quiz and practice results for that subject, weighted towards the latest." /></div></CardBody></Card></section>

      <section aria-label="Objectives"><SectionHeader title="Mastery by objective" />
        <div className="space-y-2">{p.objectives.map((o) => (
          <Card key={o.objectiveId}><CardBody className="space-y-2 !p-4"><div className="flex items-center gap-2"><Icon name={subjectById(o.subjectId).icon} size={18} className="text-primary" /><span className="flex-1 text-sm font-semibold">{o.label}</span><TrendIcon t={o.trend} /><span className="tnum text-sm font-bold">{o.mastery}%</span></div><Progress value={o.mastery} size="sm" label={o.label} /><p className="text-xs text-text-2">Evidence: {o.evidence}</p><Why text={`This objective's mastery comes from: ${o.evidence}.`} /></CardBody></Card>))}</div></section>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-label="Strengths"><SectionHeader title="Strengths" /><Card><CardBody><ul className="space-y-2">{p.strengths.map((s) => <li key={s} className="flex items-center gap-2 text-sm"><Badge tone="success">Strength</Badge>{s}</li>)}{p.strengths.length === 0 && <li className="text-sm text-text-2">Strengths show up after a few activities.</li>}</ul><div className="mt-2"><Why text="Strengths are competencies where your mastery stayed high across at least two different activity types." /></div></CardBody></Card></section>
        <section aria-label="Gaps"><SectionHeader title="Growth areas" /><Card><CardBody>{p.gaps.length === 0 ? <p className="text-sm text-text-2">No growth areas flagged right now. Keep going!</p> : <ul className="space-y-3">{p.gaps.map((g) => <li key={g.id}><p className="text-sm font-semibold">{g.label} <Badge tone={g.severity === "high" ? "warning" : "neutral"}>{g.severity === "high" ? "Needs attention" : "A little practice"}</Badge></p><Why text={g.derivedFrom} /></li>)}</ul>}</CardBody></Card></section>
      </div>

      <section aria-label="Next steps"><SectionHeader title="Recommended next steps" action={<AIBadge label="AI-suggested" />} />
        <Card tone="lilac"><CardBody><ul className="space-y-2">{next.map((n) => <li key={n} className="flex items-start gap-2 text-sm"><Lightbulb size={18} className="mt-0.5 text-primary" />{n}</li>)}{next.length === 0 && <li className="text-sm">Pick any course to continue.</li>}</ul><div className="mt-3 flex gap-2"><Button asChild size="sm"><Link href="/student/tutor">Ask my tutor</Link></Button><Button asChild size="sm" variant="outline"><Link href="/student/learn">Go to Learn</Link></Button></div><div className="mt-2"><Why text="Suggestions are generated from your growth areas and strengths. A teacher can override them, and nothing changes without your say-so." /></div></CardBody></Card></section>

      <section aria-label="History"><SectionHeader title="Assessment, course and game history" />
        <Card><CardBody><ul className="divide-y divide-border">{p.history.map((h) => <li key={h.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span><b>{h.title}</b><br /><span className="text-xs text-text-2">{h.kind} · {relTime(h.at)}</span></span><Badge>{h.result}</Badge></li>)}</ul></CardBody></Card></section>

      <section aria-label="Assignments"><SectionHeader title="Assignment performance" />
        {asg.isPending ? <Skeleton className="h-20" /> : graded.length === 0 ? <EmptyState title="No assignments marked yet" body="Released marks and teacher feedback will show here." /> : <Card><CardBody><ul className="divide-y divide-border">{graded.map(({ assignment: a, submission: s }) => <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span><b>{a.title}</b><br /><span className="text-xs text-text-2">{s.submittedAt ? `Submitted ${fmtDate(s.submittedAt)}` : ""}</span></span>{s.marks !== undefined ? <Badge tone="success">{s.marks}/{a.totalMarks}</Badge> : <Badge tone="warning">Awaiting teacher</Badge>}</li>)}</ul></CardBody></Card>}</section>

      <section aria-label="Teacher observations and interventions"><SectionHeader title="Teacher observations & interventions" />
        <Card><CardBody className="space-y-3 text-sm">
          <p><b>Observation (Mrs. Priya Nair):</b> {studentId === "stu-kabir" ? "Kabir engages well in discussion and is rebuilding confidence with fractions." : "Participates thoughtfully and helps peers. Keep exploring the extension tasks."}</p>
          {rem.data && rem.data.length > 0 ? rem.data.map((r) => <div key={r.id} className="rounded-xl bg-surface-2 p-3"><p className="font-semibold">{r.title} <Badge>{r.status}</Badge></p><p className="text-xs text-text-2">Proposed by {r.origin === "teacher" ? "your teacher" : "AI, approved by your teacher"} · {r.steps.filter((s) => s.done).length}/{r.steps.length} steps done</p></div>) : <p className="text-text-2">No interventions are needed right now.</p>}
        </CardBody></Card></section>
    </div>
  );
}
