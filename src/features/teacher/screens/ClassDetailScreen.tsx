"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Fire, ArrowLeft, Path, Warning } from "@phosphor-icons/react";
import { PageHeader, Card, CardBody, Badge, Segmented, ListToolbar, NoResults, EmptyState, Progress, Avatar, Drawer, Button, Select, Field, ConfirmDialog, StatusBadge, SkeletonCards, toast, Skeleton } from "@/components/ui";
import { Heatmap } from "@/components/charts";
import type { ScreenProps } from "@/types/screens";
import { teacherInsightService, nameOf } from "@/lib/api/teacherInsightService";
import { learningProfileService, courseService, assignmentService, liveClassService, doubtService } from "@/lib/api";
import { CLASSROOMS, subjectById, OBJECTIVES } from "@/lib/mock-data/core";
import { fmtDate, fmtDateTime, DEMO_NOW } from "@/lib/format";
import { useTeacher, Q, tHref, KEYS, errMsg } from "../components/common";

type Tab = "roster" | "gaps" | "progress" | "timeline";
export default function ClassDetailScreen({ params, searchParams }: ScreenProps) {
  const classId = params.id; const t = useTeacher(); const qc = useQueryClient();
  const cls = CLASSROOMS.find((c) => c.id === classId);
  const [tab, setTab] = React.useState<Tab>("roster");
  const [q, setQ] = React.useState(""); const [sort, setSort] = React.useState<"name" | "mastery" | "attention">("attention");
  const [open, setOpen] = React.useState<string | null>(searchParams.student ?? null);
  const roster = useQuery({ queryKey: [...KEYS.roster, classId], queryFn: () => teacherInsightService.roster(classId), enabled: !!cls });
  if (!cls || !t.teacher.classIds.includes(classId)) return <div className="mx-auto max-w-xl"><EmptyState title="Class not found" body="This class isn't in your assignments." action={{ label: "Back to My Classes", href: tHref("classes") }} /></div>;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader back={<Link href={tHref("classes")} className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-primary"><ArrowLeft size={12} />My Classes</Link>} title={cls.name}
        subtitle={`${t.teacher.subjectIds.map((s) => subjectById(s).name).join(", ")} · ${roster.data?.length ?? "…"} students`} actions={<Button asChild variant="outline" size="sm"><Link href={tHref(`attendance?class=${classId}`)}>Take attendance</Link></Button>} />
      <div className="mb-4"><Segmented label="Class views" value={tab} onChange={setTab} options={[{ value: "roster", label: "Roster" }, { value: "gaps", label: "Learning gaps" }, { value: "progress", label: "Class progress" }, { value: "timeline", label: "Timeline" }]} /></div>
      <Q q={roster} isEmpty={(d) => !d.length} empty={<EmptyState title="No students on this roster" body="Students appear once enrolled." />} skeleton={<SkeletonCards n={4} h="h-14" />}>
        {(rows) => {
          if (tab === "roster") {
            const f = rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "mastery" ? a.mathMastery - b.mathMastery : b.attention.length - a.attention.length);
            return (<>
              <ListToolbar query={q} onQuery={setQ} placeholder="Search students" count={f.length} onClear={() => setQ("")}>
                <Select aria-label="Sort" className="!w-auto" value={sort} onChange={(e) => setSort(e.target.value as any)}><option value="attention">Needs attention first</option><option value="mastery">Lowest mastery first</option><option value="name">Name</option></Select>
              </ListToolbar>
              {!f.length ? <NoResults query={q} onClear={() => setQ("")} /> : (
                <Card className="overflow-hidden"><ul className="divide-y divide-border">
                  {f.map((r) => (
                    <li key={r.studentId}><button onClick={() => setOpen(r.studentId)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-surface-2">
                      <Avatar name={r.name} color={r.color} size={36} />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{r.name}</p><p className="truncate text-xs text-text-2">{r.attention[0] ?? (r.gaps.length ? `Gap: ${r.gaps[0].label}` : "On track")}</p></div>
                      <div className="hidden w-28 sm:block"><Progress value={r.mathMastery} size="sm" tone={r.mathMastery >= 70 ? "success" : r.mathMastery >= 55 ? "warning" : "danger"} label={`${r.name} maths mastery`} /></div>
                      <span className="tnum w-12 text-right text-sm font-bold">{r.mathMastery ? `${r.mathMastery}%` : "—"}</span>
                      <span className="tnum hidden w-14 items-center gap-0.5 text-xs text-text-2 sm:flex"><Fire size={14} className="text-highlight" weight="fill" />{r.streak}d</span>
                      {r.estimated && <Badge className="hidden sm:inline-flex">Estimated</Badge>}
                      {r.attention.length > 0 && <Badge tone="warning" icon={<Warning size={12} />}>Attention</Badge>}
                    </button></li>
                  ))}
                </ul></Card>
              )}
              <CourseMapping classId={classId} />
            </>);
          }
          if (tab === "gaps") {
            const withGaps = rows.filter((r) => r.gaps.length);
            if (!withGaps.length) return <EmptyState title="No learning gaps" body="No student in this class currently has an identified gap." />;
            const labels = [...new Set(withGaps.flatMap((r) => r.gaps.map((g) => g.label)))];
            return (<div className="space-y-3">
              <Card><CardBody><h2 className="mb-2 text-sm font-bold">Gap map (severity: 1 low, 2 medium, 3 high)</h2><Heatmap ariaLabel="Learning gaps by student" rows={withGaps.map((r) => r.name)} cols={labels.map((l) => l.slice(0, 18))} colTitle={(i) => labels[i]} values={withGaps.map((r) => labels.map((l) => { const g = r.gaps.find((x) => x.label === l); return g ? ({ low: 1, medium: 2, high: 3 } as const)[g.severity] : 0; }))} /></CardBody></Card>
              {withGaps.map((r) => <Card key={r.studentId}><CardBody className="flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1"><p className="font-semibold">{r.name}</p><p className="text-sm text-text-2">{r.gaps.map((g) => `${g.label} (${g.severity})`).join("; ")}</p></div>{r.remedial ? <StatusBadge status={r.remedial.status} label={`Remedial ${r.remedial.status}`} /> : <Badge>No remedial path</Badge>}<Button size="sm" variant="soft" onClick={() => setOpen(r.studentId)}>Open profile</Button></CardBody></Card>)}
            </div>);
          }
          if (tab === "progress") return <ClassProgress rows={rows} />;
          return <ClassTimeline classId={classId} teacherId={t.id} studentIds={rows.map((r) => r.studentId)} />;
        }}
      </Q>
      <StudentDrawer studentId={open} onClose={() => setOpen(null)} onChanged={() => { qc.invalidateQueries({ queryKey: [...KEYS.roster] }); qc.invalidateQueries({ queryKey: [...KEYS.attention] }); qc.invalidateQueries({ queryKey: [...KEYS.remedial] }); qc.invalidateQueries({ queryKey: [...KEYS.classes] }); }} />
    </div>
  );
}

function CourseMapping({ classId }: { classId: string }) {
  const { id } = useTeacher();
  const q = useQuery({ queryKey: [...KEYS.courses, "map", classId], queryFn: async () => (await courseService.list("stu-ananya")).filter((c) => (c.creatorKind === "teacher") && c.creatorName.includes("Priya") && c.gradeIds.includes(classId === "cls-7a" ? "g7" : "g8")) });
  return (
    <div className="mt-4"><h2 className="mb-2 text-sm font-bold">Subject & course mapping</h2>
      <Q q={q} skeleton={<Skeleton className="h-16" />} isEmpty={(d) => !d.length} empty={<EmptyState title="No courses mapped" body="Create a course for this class in Courses." action={{ label: "New course", href: tHref("courses/new") }} />}>
        {(d) => <ul className="grid gap-2 sm:grid-cols-2">{d.map((c) => <li key={c.id}><Link href={tHref(`courses/${c.id}`)} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm hover:border-primary"><span><span className="font-semibold">{c.title}</span><br /><span className="text-xs text-text-2">{subjectById(c.subjectId).name} · {c.moduleCount} modules · {c.status}</span></span><ArrowLeft size={14} className="rotate-180" /></Link></li>)}</ul>}
      </Q>
    </div>
  );
}

function ClassProgress({ rows }: { rows: { studentId: string; name: string }[] }) {
  const real = rows.filter((r) => !/^stu-\d/.test(r.studentId) && !/^stu-(8a|7a)-/.test(r.studentId));
  const q = useQuery({ queryKey: ["t", "class-progress", real.map((r) => r.studentId).join()], queryFn: async () => Promise.all(real.map(async (r) => ({ r, c: await courseService.get("crs-fractions", r.studentId) }))) });
  return (
    <Q q={q} isEmpty={(d) => !d.length} empty={<EmptyState title="No course progress yet" body="Progress appears when students start the mapped course." />}>
      {(d) => { const avg = Math.round(d.reduce((a, x) => a + x.c.progressPct, 0) / d.length); return (
        <Card><CardBody className="space-y-3"><div><p className="text-sm font-bold">Fractions & Decimals — class completion</p><p className="tnum text-2xl font-bold">{avg}%</p><Progress value={avg} label="Class completion" /></div>
          <ul className="space-y-2">{d.map(({ r, c }) => <li key={r.studentId} className="flex items-center gap-3 text-sm"><span className="w-32 truncate font-medium">{r.name}</span><Progress value={c.progressPct} size="sm" label={`${r.name} progress`} /><span className="tnum w-24 text-right text-xs text-text-2">{c.completedCount}/{c.totalActivities} activities</span></li>)}</ul>
          <p className="text-xs text-text-2">Same numbers students see in their Course Player. Classes without a mapped course are not shown.</p></CardBody></Card>); }}
    </Q>
  );
}

function ClassTimeline({ classId, teacherId, studentIds }: { classId: string; teacherId: string; studentIds: string[] }) {
  const q = useQuery({ queryKey: ["t", "timeline", classId], queryFn: async () => {
    const [asg, lives, doubts] = await Promise.all([assignmentService.list(), liveClassService.list(), doubtService.forTeacher(teacherId)]);
    const items = [
      ...asg.filter((a) => a.classIds.includes(classId)).map((a) => ({ at: a.dueAt, label: `Due: ${a.title}`, kind: "Assignment" })),
      ...lives.filter((l) => l.classIds.includes(classId)).map((l) => ({ at: l.startAt, label: l.title, kind: "Live class" })),
      ...doubts.filter((d) => studentIds.includes(d.studentId)).map((d) => ({ at: d.createdAt, label: `Doubt: ${d.title} (${nameOf(d.studentId)})`, kind: "Doubt" })),
    ];
    return items.sort((a, b) => b.at.localeCompare(a.at));
  } });
  return (
    <Q q={q} isEmpty={(d) => !d.length} empty={<EmptyState title="Timeline is empty" body="Assignments, live classes and doubts for this class will appear here." />}>
      {(d) => <Card><CardBody><ol className="space-y-3 border-l-2 border-border pl-4">{d.map((x, i) => <li key={i} className="relative"><span className="absolute -left-[22px] top-1.5 size-2.5 rounded-full bg-primary" /><p className="text-sm font-semibold">{x.label}</p><p className="text-xs text-text-2">{x.kind} · {fmtDateTime(x.at)}{new Date(x.at) > DEMO_NOW ? " · upcoming" : ""}</p></li>)}</ol></CardBody></Card>}
    </Q>
  );
}

function StudentDrawer({ studentId, onClose, onChanged }: { studentId: string | null; onClose: () => void; onChanged: () => void }) {
  const prof = useQuery({ queryKey: ["t", "profile", studentId], queryFn: () => learningProfileService.get(studentId!), enabled: !!studentId });
  const rem = useQuery({ queryKey: [...KEYS.remedial, studentId], queryFn: () => learningProfileService.remedialFor(studentId!), enabled: !!studentId });
  const [gapId, setGapId] = React.useState(""); const [confirm, setConfirm] = React.useState(false);
  const propose = useMutation({ mutationFn: () => { const g = prof.data!.gaps.find((x) => x.id === gapId)!; return learningProfileService.proposeRemedial(studentId!, g.id, `${g.label}, step by step`, "teacher"); },
    onSuccess: () => { toast.success("Remedial path created — the student can see it now"); rem.refetch(); prof.refetch(); onChanged(); }, onError: (e) => toast.error(errMsg(e)) });
  const name = studentId ? nameOf(studentId) : "";
  React.useEffect(() => { setGapId(""); }, [studentId]);
  const openGaps = prof.data?.gaps.filter((g) => !g.remedialPathId) ?? [];
  return (
    <Drawer open={!!studentId} onOpenChange={(v) => !v && onClose()} title={name}>
      {prof.isLoading ? <SkeletonCards n={3} h="h-20" /> : !prof.data ? <EmptyState title="No learning profile yet" body="This student has no profile data (new enrolment or demo roster). Profiles appear after the baseline assessment." /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-surface-2 p-2"><p className="tnum text-lg font-bold">{prof.data.streak.current}</p>day streak</div><div className="rounded-xl bg-surface-2 p-2"><p className="tnum text-lg font-bold">{prof.data.weeklyMinutes}/{prof.data.weeklyGoalMinutes}</p>min this week</div><div className="rounded-xl bg-surface-2 p-2"><p className="tnum text-lg font-bold">L{prof.data.level}</p>level</div></div>
          <section><h3 className="mb-2 text-sm font-bold">Mastery by objective</h3>{!prof.data.objectives.length ? <p className="text-sm text-text-2">No objective evidence yet.</p> : <ul className="space-y-2">{prof.data.objectives.map((o) => <li key={o.objectiveId}><div className="flex justify-between text-xs"><span className="font-medium">{o.label}</span><span className="tnum">{o.mastery}% {o.trend === "up" ? "▲" : o.trend === "down" ? "▼" : "–"}</span></div><Progress value={o.mastery} size="sm" label={o.label} tone={o.mastery >= 70 ? "success" : o.mastery >= 55 ? "warning" : "danger"} /><p className="text-xs text-text-2">{o.evidence}</p></li>)}</ul>}</section>
          <section><h3 className="mb-2 text-sm font-bold">Learning gaps</h3>{!prof.data.gaps.length ? <p className="text-sm text-text-2">No open gaps.</p> : <ul className="space-y-2">{prof.data.gaps.map((g) => <li key={g.id} className="rounded-xl bg-surface-2 p-2.5 text-sm"><p className="font-semibold">{g.label} <Badge tone={g.severity === "high" ? "danger" : g.severity === "medium" ? "warning" : "neutral"}>{g.severity}</Badge></p><p className="text-xs text-text-2">{g.derivedFrom}</p></li>)}</ul>}</section>
          <section><h3 className="mb-2 text-sm font-bold">Remedial paths</h3>
            {rem.data?.map((r) => <div key={r.id} className="mb-2 rounded-xl border border-border p-2.5 text-sm"><div className="flex items-center justify-between"><span className="font-semibold">{r.title}</span><StatusBadge status={r.status} /></div><p className="text-xs text-text-2">{r.steps.filter((s) => s.done).length}/{r.steps.length} steps done · target {fmtDate(r.targetDate)}</p></div>)}
            {openGaps.length > 0 ? <div className="space-y-2"><Field label="Propose a remedial path for" htmlFor="gap-sel"><Select id="gap-sel" value={gapId} onChange={(e) => setGapId(e.target.value)}><option value="">Choose a gap…</option>{openGaps.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</Select></Field><Button size="sm" disabled={!gapId} loading={propose.isPending} onClick={() => setConfirm(true)}><Path size={16} />Create remedial path</Button></div> : <p className="text-xs text-text-2">{prof.data.gaps.length ? "Every open gap already has a path." : "No gap to address."}</p>}
          </section>
        </div>
      )}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Create remedial path?" body={`${name} will see a supportive practice plan in their journey. You can follow completion here.`} confirmLabel="Create path" onConfirm={() => propose.mutate()} />
    </Drawer>
  );
}
