"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, ChatCircleDots, ClipboardText, VideoCamera, FileText, Sparkle, ChatsCircle, NotePencil, Warning, CalendarBlank, ArrowRight, Student } from "@phosphor-icons/react";
import { PageHeader, StatTile, Card, Badge, StatusBadge, SectionHeader, Skeleton, EmptyState, ErrorState, Button, AIBadge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useActors } from "@/stores/app-store";
import { timetableService, doubtService, liveClassService, eventService } from "@/lib/api";
import { teacherInsightService, nameOf } from "@/lib/api/teacherInsightService";
import { PERIODS, DAYS } from "@/types/academic";
import { ROOMS } from "@/lib/mock-data/academic";
import { CLASSROOMS, subjectById } from "@/lib/mock-data/core";
import { DEMO_NOW, fmtDateTime, relTime, fmtDate } from "@/lib/format";
import { useTeacher, tHref, Panel, KEYS } from "../components/common";
import { attendanceAdapter } from "../attendanceAdapter";

const todayIso = DEMO_NOW.toISOString().slice(0, 10);
const nowMin = 10 * 60 + 30;
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

export default function OverviewScreen() {
  const { id, plain } = useTeacher();
  const { flags } = useActors();
  const highlight = flags.includes("pending-doubts");
  const tt = useQuery({ queryKey: ["t", "tt", id], queryFn: () => timetableService.forTeacher(id) });
  const doubts = useQuery({ queryKey: [...KEYS.doubts, id], queryFn: () => doubtService.forTeacher(id) });
  const queue = useQuery({ queryKey: [...KEYS.grading, id], queryFn: () => teacherInsightService.gradingQueue(id) });
  const attention = useQuery({ queryKey: [...KEYS.attention, id], queryFn: () => teacherInsightService.attention(id) });
  const lives = useQuery({ queryKey: ["t", "lives"], queryFn: () => liveClassService.list() });
  const events = useQuery({ queryKey: [...KEYS.events], queryFn: () => eventService.list() });
  const todayEntries = React.useMemo(() => (tt.data ?? []).filter((e) => e.dayOfWeek === DEMO_NOW.getDay() && e.status !== "cancelled").map((e) => ({ e, p: PERIODS.find((p) => p.id === e.periodId)! })).filter((x) => x.p).sort((a, b) => toMin(a.p.start) - toMin(b.p.start)), [tt.data]);
  const attStatus = useQuery({ queryKey: ["t", "att-status", id, todayEntries.map((x) => x.e.id).join()], enabled: tt.isSuccess, queryFn: async () => {
    const res: Record<string, boolean> = {}; for (const { e } of todayEntries) res[e.id] = !!(await attendanceAdapter.get(e.classId, todayIso, e.periodId)); return res; } });
  const pastPeriods = todayEntries.filter((x) => toMin(x.p.end) <= nowMin);
  const pendingAtt = pastPeriods.filter((x) => attStatus.data && !attStatus.data[x.e.id]);
  const openDoubts = (doubts.data ?? []).filter((d) => d.status === "open" || d.status === "follow-up");
  const liveFor = (classId: string) => (lives.data ?? []).find((l) => l.hostId === id && l.classIds.includes(classId) && l.startAt.slice(0, 10) === todayIso && l.status !== "Cancelled");
  const upcomingLive = (lives.data ?? []).filter((l) => l.hostId === id && new Date(l.startAt) > DEMO_NOW && l.status === "Scheduled").slice(0, 3);
  const upcomingEvents = (events.data ?? []).filter((e) => new Date(e.startAt) > DEMO_NOW && ["published", "registration-open"].includes(e.status)).slice(0, 2);
  const loading = tt.isLoading || doubts.isLoading || queue.isLoading || attention.isLoading;
  const failed = tt.isError || doubts.isError || queue.isError || attention.isError;
  const activity = [...(doubts.data ?? []).map((d) => ({ at: d.updatedAt, text: `${nameOf(d.studentId)} ${d.status === "open" ? "asked" : "updated"}: “${d.title}”`, href: tHref("doubts") })), ...(queue.data ?? []).map((q) => ({ at: q.submission.submittedAt ?? DEMO_NOW.toISOString(), text: `${q.studentName} submitted “${q.assignment.title}”`, href: tHref("assessments") }))].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  const quick = [
    { label: "Start live class", icon: VideoCamera, slug: "live-classes" }, { label: "Take attendance", icon: CheckSquare, slug: "attendance" }, { label: "Create assignment", icon: NotePencil, slug: "assessments?new=1" },
    { label: "Generate question paper", icon: FileText, slug: "papers" }, { label: "Respond to doubt", icon: ChatCircleDots, slug: "doubts" }, { label: "Prepare lesson", icon: Sparkle, slug: "workspace?action=lesson" }, { label: "Message staff", icon: ChatsCircle, slug: "staff-chat" },
  ];
  const nextRealLesson = todayEntries.find((x) => toMin(x.p.end) > nowMin);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={`Good morning, ${plain.split(" ")[0]}`} subtitle={`${DAYS.find((d) => d.n === DEMO_NOW.getDay())?.label}, ${fmtDate(DEMO_NOW, { day: "numeric", month: "long", year: "numeric" })} · here is what needs you today.`} />
      {highlight && <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-2.5 text-sm"><Warning size={18} className="text-warning" weight="fill" /><span><strong>{openDoubts.length} pending doubt{openDoubts.length === 1 ? "" : "s"}</strong> and <strong>{queue.data?.length ?? 0} submission{queue.data?.length === 1 ? "" : "s"}</strong> in your grading queue are waiting for you.</span></div>}
      {failed ? <ErrorState onRetry={() => { tt.refetch(); doubts.refetch(); queue.refetch(); attention.refetch(); }} /> : (
        <>
          <section aria-label="At a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />) : (
              <>
                <Link href={tHref("timetable")}><StatTile label="Periods today" value={todayEntries.length} hint={`${todayEntries.filter((x) => toMin(x.p.end) <= nowMin).length} done`} icon={<CalendarBlank size={18} />} /></Link>
                <Link href={tHref("attendance")}><StatTile label="Attendance pending" value={attStatus.isLoading ? "…" : pendingAtt.length} hint="past periods not submitted" icon={<CheckSquare size={18} />} className={pendingAtt.length ? "ring-2 ring-warning/40" : ""} /></Link>
                <Link href={tHref("assessments")}><StatTile label="Awaiting grading" value={queue.data?.length ?? 0} hint="submissions to review" icon={<ClipboardText size={18} />} className={cn(highlight && "ring-2 ring-primary/50")} /></Link>
                <Link href={tHref("doubts")}><StatTile label="Open doubts" value={openDoubts.length} hint={`${(doubts.data ?? []).length} total threads`} icon={<ChatCircleDots size={18} />} className={cn(highlight && "ring-2 ring-primary/50")} /></Link>
                <Link href={tHref("classes")}><StatTile label="Need attention" value={attention.data?.length ?? 0} hint="students, from learning profiles" icon={<Student size={18} />} /></Link>
              </>
            )}
          </section>

          <section aria-label="Quick actions" className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {quick.map((a) => <Button key={a.label} asChild variant="outline" size="sm" className="shrink-0"><Link href={tHref(a.slug)}><a.icon size={16} />{a.label}</Link></Button>)}
          </section>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Panel title="Today's periods" action={<Link className="text-xs font-semibold text-primary" href={tHref("timetable")}>Full timetable</Link>}>
                {tt.isLoading ? <Skeleton className="h-32" /> : !todayEntries.length ? <EmptyState title="No periods today" body="You have no scheduled teaching today. Use the time for lesson preparation." action={{ label: "Prepare a lesson", href: tHref("workspace?action=lesson") }} /> : (
                  <ul className="divide-y divide-border">
                    {todayEntries.map(({ e, p }) => {
                      const cls = CLASSROOMS.find((c) => c.id === e.classId); const live = liveFor(e.classId); const done = toMin(p.end) <= nowMin; const ongoing = toMin(p.start) <= nowMin && nowMin < toMin(p.end);
                      const marked = attStatus.data?.[e.id];
                      return (
                        <li key={e.id} className="flex flex-wrap items-center gap-3 py-2.5">
                          <span className="tnum w-24 text-xs font-semibold text-text-2">{p.start}–{p.end}</span>
                          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{subjectById(e.subjectId).name} · {cls?.name}</p><p className="text-xs text-text-2">{p.label} · {ROOMS.find((r) => r.id === e.roomId)?.name}{e.substituteTeacherId === id ? " · you are substituting" : ""}</p></div>
                          {ongoing && <Badge tone="primary">In progress</Badge>}
                          {live && <Button asChild size="sm" variant="soft"><Link href={tHref("live-classes")}><VideoCamera size={14} />Live class</Link></Button>}
                          {done && (marked ? <Badge tone="success">Attendance done</Badge> : <Button asChild size="sm" variant="outline"><Link href={tHref(`attendance?class=${e.classId}&period=${e.periodId}`)}>Take attendance</Link></Button>)}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>

              <Panel title="Students needing attention" action={<Link className="text-xs font-semibold text-primary" href={tHref("classes")}>My classes</Link>}>
                {attention.isLoading ? <Skeleton className="h-24" /> : !attention.data?.length ? <EmptyState title="Nobody flagged" body="No student currently shows a gap, overdue work or low activity." /> : (
                  <ul className="space-y-2">
                    {attention.data.map((a) => (
                      <li key={a.studentId} className="flex items-start gap-3 rounded-xl bg-surface-2 p-3">
                        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{a.name} <Badge tone={a.severity === "high" ? "danger" : "warning"} className="ml-1">{a.severity} priority</Badge></p><p className="text-xs text-text-2">{a.reasons.join(" · ")}</p></div>
                        <Button asChild size="sm" variant="ghost"><Link href={tHref(`classes/${a.classId}?student=${a.studentId}`)}>Open<ArrowRight size={14} /></Link></Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Open doubts" action={<Link className="text-xs font-semibold text-primary" href={tHref("doubts")}>Inbox</Link>}>
                {doubts.isLoading ? <Skeleton className="h-20" /> : !openDoubts.length ? <EmptyState title="Inbox clear" body="No open doubts. Students will appear here when they ask." /> : (
                  <ul className="divide-y divide-border">{openDoubts.map((d) => <li key={d.id} className="flex items-center gap-3 py-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{d.title}</p><p className="text-xs text-text-2">{nameOf(d.studentId)} · {relTime(d.updatedAt)}</p></div><StatusBadge status={d.status} /><Button asChild size="sm" variant="soft"><Link href={tHref(`doubts?open=${d.id}`)}>Reply</Link></Button></li>)}</ul>
                )}
              </Panel>
            </div>

            <div className="space-y-4">
              <Panel title="AI suggestions" action={<AIBadge label="AI · demo" />}>
                <ul className="space-y-2 text-sm">
                  {(attention.data ?? []).some((a) => a.gapLabel) && <li className="rounded-xl bg-lilac p-3">{(attention.data ?? []).filter((a) => a.gapLabel).length} student(s) have an open learning gap. <Link className="font-semibold text-primary" href={tHref("workspace?action=remedial")}>Draft a remedial path</Link> for your review.</li>}
                  {(queue.data?.length ?? 0) > 0 && <li className="rounded-xl bg-lilac p-3">{queue.data!.length} submission(s) can get a draft evaluation. <Link className="font-semibold text-primary" href={tHref("workspace?action=evaluate")}>Prepare drafts</Link> — marks stay unreleased until you approve.</li>}
                  {nextRealLesson ? <li className="rounded-xl bg-lilac p-3">Next: {subjectById(nextRealLesson.e.subjectId).name} at {nextRealLesson.p.start}. <Link className="font-semibold text-primary" href={tHref("workspace?action=lesson")}>Prepare the lesson</Link>.</li> : <li className="rounded-xl bg-lilac p-3">Teaching is done for today. <Link className="font-semibold text-primary" href={tHref("workspace?action=lesson")}>Prepare tomorrow's lesson</Link>.</li>}
                </ul>
                <p className="mt-2 text-xs text-text-2">Suggestions are drafts; nothing happens without your approval.</p>
              </Panel>
              <Panel title="Upcoming lessons & events">
                {lives.isLoading || events.isLoading ? <Skeleton className="h-24" /> : !upcomingLive.length && !upcomingEvents.length ? <EmptyState title="Nothing scheduled" body="Schedule a live class or create an event." action={{ label: "Live classes", href: tHref("live-classes") }} /> : (
                  <ul className="space-y-2 text-sm">
                    {upcomingLive.map((l) => <li key={l.id} className="flex gap-2"><VideoCamera size={16} className="mt-0.5 shrink-0 text-primary" /><span><span className="font-semibold">{l.title}</span><br /><span className="text-xs text-text-2">{fmtDateTime(l.startAt)} · {l.audienceLabel}</span></span></li>)}
                    {upcomingEvents.map((e) => <li key={e.id} className="flex gap-2"><CalendarBlank size={16} className="mt-0.5 shrink-0 text-primary" /><span><Link href={tHref("feed")} className="font-semibold">{e.title}</Link><br /><span className="text-xs text-text-2">{fmtDateTime(e.startAt)} · {e.registered} registered</span></span></li>)}
                  </ul>
                )}
              </Panel>
              <Panel title="Recent class activity">
                {!activity.length ? <EmptyState title="No activity yet" body="Submissions and doubts will appear here." /> : <ul className="space-y-2 text-sm">{activity.map((a, i) => <li key={i}><Link href={a.href} className="hover:text-primary">{a.text}</Link><span className="block text-xs text-text-2">{relTime(a.at)}</span></li>)}</ul>}
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
