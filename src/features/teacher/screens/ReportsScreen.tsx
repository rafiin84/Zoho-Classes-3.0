"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MagnifyingGlass, DownloadSimple, Info } from "@phosphor-icons/react";
import { PageHeader, Segmented, Card, CardBody, Badge, Button, Select, Field, Input, EmptyState, SkeletonCards, Progress, StatTile, Modal, StatusBadge, AIBadge, toast, Skeleton } from "@/components/ui";
import { BarChart, Heatmap, Donut } from "@/components/charts";
import type { ReportAnswer } from "@/types/teacher";
import { teacherInsightService } from "@/lib/api/teacherInsightService";
import { teacherWorkspaceService } from "@/lib/api/teacherWorkspaceService";
import { learningProfileService, assignmentService } from "@/lib/api";
import { CLASSROOMS, OBJECTIVES } from "@/lib/mock-data/core";
import { fmtDateTime } from "@/lib/format";
import { useTeacher, Q, errMsg, tHref, KEYS } from "../components/common";

type Tab = "performance" | "mastery" | "risk" | "assignments" | "engagement" | "interventions";
export default function ReportsScreen() {
  const t = useTeacher(); const [tab, setTab] = React.useState<Tab>("performance"); const [classId, setClassId] = React.useState("cls-8b"); const [range, setRange] = React.useState("30"); const [exp, setExp] = React.useState(false);
  const roster = useQuery({ queryKey: [...KEYS.roster, classId], queryFn: () => teacherInsightService.roster(classId) });
  const att = useQuery({ queryKey: [...KEYS.attention, t.id], queryFn: () => teacherInsightService.attention(t.id) });
  const profiles = useQuery({ queryKey: ["t", "profiles-all"], queryFn: () => learningProfileService.all() });
  const rem = useQuery({ queryKey: [...KEYS.remedial, "all"], queryFn: () => learningProfileService.allRemedial() });
  const asg = useQuery({ queryKey: [...KEYS.assignments, "rep", t.id], queryFn: async () => { const [a, s] = await Promise.all([assignmentService.list(), assignmentService.allSubmissions()]); return { a: a.filter((x) => x.teacherId === t.id), s }; } });
  const classes = t.teacher.classIds.map((id) => CLASSROOMS.find((c) => c.id === id)!);
  return (
    <div className="mx-auto max-w-5xl"><PageHeader title="Reports" subtitle="Evidence about learning in your classes. Patterns are prompts for action, not verdicts." actions={<Button variant="outline" size="sm" onClick={() => setExp(true)}><DownloadSimple size={16} />Export</Button>} />
      <NLQuery teacherId={t.id} />
      <div className="my-4 flex flex-wrap items-center gap-3"><Field label="Class" htmlFor="rp-c" className="min-w-40"><Select id="rp-c" value={classId} onChange={(e) => setClassId(e.target.value)}>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field><Field label="Date range" htmlFor="rp-r" className="min-w-40"><Select id="rp-r" value={range} onChange={(e) => setRange(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">This term</option></Select></Field><p className="mt-5 text-xs text-text-2">Source: learning profiles · updated {fmtDateTime("2026-11-19T10:10:00+05:30")}</p></div>
      <div className="mb-4"><Segmented label="Report type" value={tab} onChange={setTab} options={[{ value: "performance", label: "Class performance" }, { value: "mastery", label: "Objective mastery" }, { value: "risk", label: "At-risk students" }, { value: "assignments", label: "Assignment completion" }, { value: "engagement", label: "Engagement" }, { value: "interventions", label: "Interventions" }]} /></div>
      {tab === "risk" ? <Q q={att} isEmpty={(d) => !d.length} empty={<EmptyState title="No at-risk students" body="Nobody currently shows a gap, overdue work or low activity." />}>{(d) => <Card><CardBody><ul className="divide-y divide-border">{d.map((a) => <li key={a.studentId} className="flex flex-wrap items-center gap-3 py-2.5"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{a.name}</p><p className="text-xs text-text-2">{a.reasons.join(" · ")}</p></div><Badge tone={a.severity === "high" ? "danger" : "warning"}>{a.severity}</Badge><Button asChild size="sm" variant="soft"><Link href={tHref(`classes/${a.classId}?student=${a.studentId}`)}>Open</Link></Button></li>)}</ul><p className="mt-3 text-xs text-text-2">Flags come from learning gaps, overdue work and weekly activity. A flag means “check in”, not “struggling for certain”.</p></CardBody></Card>}</Q>
      : tab === "assignments" ? <Q q={asg} isEmpty={(d) => !d.a.length} empty={<EmptyState title="No assignments" body="Create an assignment to see completion." action={{ label: "Create assignment", href: tHref("assessments?new=1") }} />}>{(d) => <Card><CardBody className="space-y-3"><BarChart ariaLabel="Assignment completion by assignment" unit="%" max={100} data={d.a.map((a) => { const n = roster.data?.length || 1; const done = d.s.filter((x) => x.assignmentId === a.id && ["submitted", "graded", "returned"].includes(x.status)).length; return { label: a.title.slice(0, 16), value: Math.round((done / n) * 100), sub: `${done}/${n}` }; })} /><p className="text-xs text-text-2">Completion = submitted, returned or graded ÷ students on the roster ({roster.data?.length ?? "…"}). Late and overdue work counts as not complete.</p></CardBody></Card>}</Q>
      : tab === "interventions" ? <Q q={rem} isEmpty={(d) => !d.length} empty={<EmptyState title="No interventions yet" body="Remedial paths you or AI create appear here with their progress." />}>{(d) => <Card><CardBody><ul className="space-y-3">{d.map((r) => { const n = r.steps.filter((s) => s.done).length; return <li key={r.id}><div className="flex items-center justify-between text-sm"><span className="font-semibold">{r.title}</span><StatusBadge status={r.status} /></div><Progress value={(n / r.steps.length) * 100} size="sm" label={r.title} className="my-1" /><p className="text-xs text-text-2">{n}/{r.steps.length} steps · {r.origin === "ai" ? "AI-proposed, teacher-approved" : "Teacher-created"}</p></li>; })}</ul></CardBody></Card>}</Q>
      : <Q q={roster} skeleton={<SkeletonCards n={2} h="h-48" />} isEmpty={(d) => !d.length} empty={<EmptyState title="No data for this class" body="This class has no roster in the prototype. Try Grade 8 · B." />}>{(rows) => tab === "performance" ? (
          <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-3"><StatTile label="Average Maths mastery" value={`${Math.round(rows.reduce((a, r) => a + r.mathMastery, 0) / rows.length)}%`} /><StatTile label="Below 60%" value={rows.filter((r) => r.mathMastery < 60).length} hint={`of ${rows.length} students`} /><StatTile label="With an open gap" value={rows.filter((r) => r.gaps.length).length} /></div>
            <Card><CardBody><BarChart ariaLabel="Maths mastery by student" unit="%" max={100} data={[...rows].sort((a, b) => a.mathMastery - b.mathMastery).map((r) => ({ label: r.name.split(" ")[0], value: r.mathMastery, sub: r.estimated ? "estimated" : undefined }))} />{rows.some((r) => r.estimated) && <p className="mt-2 text-xs text-text-2">Students marked estimated have no full profile yet; their values are indicative.</p>}</CardBody></Card></div>
        ) : tab === "mastery" ? (
          <Card><CardBody><MasteryHeat rows={rows} profiles={profiles.data ?? []} loading={profiles.isLoading} /></CardBody></Card>
        ) : (
          <Card><CardBody className="space-y-3"><div className="flex flex-wrap items-center gap-4"><Donut ariaLabel="Students meeting weekly goal" centre={<span className="tnum text-lg font-bold">{rows.filter((r) => r.weeklyMinutes >= r.weeklyGoal).length}/{rows.length}</span>} data={[{ label: "Met goal", value: rows.filter((r) => r.weeklyMinutes >= r.weeklyGoal).length }, { label: "Below goal", value: rows.filter((r) => r.weeklyMinutes < r.weeklyGoal).length }]} /><p className="text-sm">Students who met their weekly learning goal this week (partial week, 16–19 Nov).</p></div>
            <BarChart ariaLabel="Weekly minutes against goal" unit="%" data={rows.map((r) => ({ label: r.name.split(" ")[0], value: Math.round((r.weeklyMinutes / r.weeklyGoal) * 100), sub: `${r.weeklyMinutes}/${r.weeklyGoal} min` }))} /><p className="text-xs text-text-2">Only time inside the platform is counted. Offline practice and reading are not visible here.</p></CardBody></Card>
        )}</Q>}
      <Modal open={exp} onOpenChange={setExp} title="Export report" description="Simulated export: no file is created in this prototype." footer={<><Button variant="ghost" onClick={() => setExp(false)}>Cancel</Button><Button onClick={() => { toast.success("Export queued (simulated). A real file would arrive by email."); setExp(false); }}>Export</Button></>}><div className="space-y-3"><Field label="Format" htmlFor="ex-f"><Select id="ex-f"><option>PDF summary</option><option>CSV (student rows)</option></Select></Field><p className="text-xs text-text-2">Includes the current class, date range and tab. Student names are included; share only within school.</p></div></Modal>
    </div>
  );
}

function MasteryHeat({ rows, profiles, loading }: { rows: { studentId: string; name: string }[]; profiles: { studentId: string; objectives: { objectiveId: string; mastery: number }[] }[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-40" />;
  const objs = OBJECTIVES.filter((o) => o.subjectId === "sub-math").slice(0, 4);
  const level = (m?: number) => (m === undefined ? 0 : m >= 80 ? 4 : m >= 65 ? 3 : m >= 50 ? 2 : 1);
  const shown = rows.filter((r) => profiles.find((p) => p.studentId === r.studentId)?.objectives.length);
  if (!shown.length) return <EmptyState title="No objective evidence yet" body="Mastery appears once students complete checkpoints or quizzes." />;
  return (<div className="space-y-2"><Heatmap ariaLabel="Learning-objective mastery by student" max={4} rows={shown.map((r) => r.name)} cols={objs.map((o) => o.code)} colTitle={(i) => objs[i].title} values={shown.map((r) => objs.map((o) => level(profiles.find((p) => p.studentId === r.studentId)?.objectives.find((x) => x.objectiveId === o.id)?.mastery)))} />
    <p className="text-xs text-text-2">Scale: 0 no evidence · 1 under 50% · 2 50–64% · 3 65–79% · 4 80%+. Only students with profile evidence are shown ({shown.length} of {rows.length}).</p></div>);
}

function NLQuery({ teacherId }: { teacherId: string }) {
  const [text, setText] = React.useState(""); const [res, setRes] = React.useState<ReportAnswer | null>(null); const [drill, setDrill] = React.useState<string | null>(null);
  const run = useMutation({ mutationFn: (q: string) => { if (q.trim().length < 6) throw new Error("Ask a fuller question, e.g. “Which students are below 60% in maths?”"); return teacherWorkspaceService.reportQuery(q, teacherId); }, onSuccess: (r) => { setRes(r); setDrill(null); }, onError: (e) => toast.error(errMsg(e)) });
  return (
    <Card><CardBody className="space-y-3"><div className="flex items-center gap-2"><MagnifyingGlass size={18} className="text-primary" /><h2 className="text-sm font-bold">Ask a question about your class</h2><AIBadge label="AI · demo" /></div>
      <form onSubmit={(e) => { e.preventDefault(); run.mutate(text); }} className="flex flex-wrap gap-2"><label htmlFor="nlq" className="sr-only">Report question</label><Input id="nlq" className="min-w-52 flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. How is maths mastery in 8B? · assignment completion · engagement this week" /><Button type="submit" loading={run.isPending}>Run query</Button></form>
      <div className="flex flex-wrap gap-1.5">{["Which students are below 60% in maths?", "Show assignment completion", "How engaged is the class this week?"].map((s) => <Button key={s} size="sm" variant="ghost" onClick={() => { setText(s); run.mutate(s); }}>{s}</Button>)}</div>
      {run.isPending && <Skeleton className="h-32" />}
      {res && !run.isPending && (
        <div className="space-y-3 border-t border-border pt-3" aria-live="polite"><div><h3 className="text-heading">{res.title}</h3><p className="text-sm">{res.summary}</p></div>
          <BarChart ariaLabel={res.title} unit={res.unit} max={100} data={res.chart.map((c) => ({ ...c }))} onSelect={(d) => setDrill(d.label)} selected={drill ?? undefined} />
          {drill && <div className="rounded-xl bg-lilac p-3 text-sm"><strong>Drill-down: {drill}</strong> — {res.drill.find((d) => d.label === drill)?.detail}</div>}
          <details className="rounded-xl border border-border p-3 text-xs"><summary className="cursor-pointer font-semibold">Metric definition, filters and source</summary><dl className="mt-2 space-y-1 text-text-2"><div><dt className="inline font-semibold text-text">Metric: </dt><dd className="inline">{res.metric}</dd></div><div><dt className="inline font-semibold text-text">Date range: </dt><dd className="inline">{res.dateRange}</dd></div><div><dt className="inline font-semibold text-text">Filters: </dt><dd className="inline">{res.filters.join(" · ")}</dd></div><div><dt className="inline font-semibold text-text">Source updated: </dt><dd className="inline">{fmtDateTime(res.sourceAt)}</dd></div></dl></details>
          {res.incomplete && <p className="flex items-start gap-2 rounded-xl bg-warning-soft p-2.5 text-xs"><Info size={14} className="mt-0.5 shrink-0" /><span><strong>Incomplete data:</strong> {res.incomplete}</span></p>}
          <p className="text-xs text-text-2">{res.note}</p></div>
      )}
    </CardBody></Card>
  );
}
