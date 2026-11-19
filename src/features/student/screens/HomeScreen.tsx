"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, BookmarkSimple, CalendarBlank, CheckCircle, Clock, Compass, Lightning, Medal, NotePencil, Receipt, Rocket, Sparkle, VideoCamera, Target, Play } from "@phosphor-icons/react";
import { Badge, Button, Card, CardBody, ErrorState, Icon, Skeleton, Avatar, cn } from "@/components/ui";
import { ProgressRing } from "@/components/charts";
import { courseService } from "@/lib/api";
import { useActors, useApp } from "@/stores/app-store";
import { DEMO_NOW, fmtDate, fmtTime, fmtMoney, relTime } from "@/lib/format";
import { PERIODS } from "@/types/academic";
import { subjectById } from "@/lib/mock-data/core";
import type { ScreenProps } from "@/types/screens";
import { studentKeys } from "../keys";
import { useNotificationsFeed } from "../hooks";
import { StudentHeader } from "../components/StudentHeader";
import { TutorHeroCard } from "../components/TutorHeroCard";
import { ContentCard } from "../components/ContentCard";
import { RailSection } from "../components/RailSection";
import { StreakFlame, WeekDots } from "../components/StreakWidget";
import { RecCard } from "../home/RecCard";
const NO_IDS: string[] = [];
import { buildRecs, useHomeData, useRecState, DEMO_HOUR } from "../home/data";

const greeting = DEMO_HOUR < 12 ? "Good morning" : DEMO_HOUR < 17 ? "Good afternoon" : "Good evening";

function HomeSkeleton() {
  return <div className="space-y-6" role="status" aria-label="Loading your Home"><div className="flex items-center gap-3"><Skeleton className="size-[52px] rounded-full" /><div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-40" /></div></div><Skeleton className="h-64 rounded-[1.75rem]" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-44" /><Skeleton className="h-44" /><Skeleton className="h-44" /></div><div className="flex gap-3 overflow-hidden"><Skeleton className="h-52 w-60 shrink-0" /><Skeleton className="h-52 w-60 shrink-0" /><Skeleton className="h-52 w-60 shrink-0" /></div></div>;
}

export default function HomeScreen(_p: ScreenProps) {
  const { studentId } = useActors();
  const onboarded = useApp((s) => s.onboarded.student);
  const { data, isLoading, isError, refetch, student } = useHomeData();
  const notifs = useNotificationsFeed();
  const unread = notifs.data?.filter((n) => !n.read).length ?? 0;
  const dismissed = useRecState((s) => s.dismissed[studentId] ?? NO_IDS);
  const isNew = student.status === "pending-baseline";

  const recs = useMemo(() => data ? buildRecs({ student, profile: data.profile, courses: data.courses, remedial: data.remedial, events: data.events, clubs: data.clubs }).filter((r) => !dismissed.includes(r.id)) : [], [data, student, dismissed]);
  const enrolled = useMemo(() => (data?.courses ?? []).filter((c) => c.enrolled), [data]);
  const resume = useMemo(() => [...enrolled].filter((c) => c.progressPct < 100).sort((a, b) => b.progressPct - a.progressPct)[0] ?? enrolled[0], [enrolled]);
  const structure = useQuery({ queryKey: studentKeys.structure(resume?.id ?? "none"), queryFn: () => courseService.structure(resume!.id), enabled: !!resume });
  const nextAct = structure.data?.activities.find((a) => a.id === resume?.nextActivityId);

  if (isLoading) return <HomeSkeleton />;
  if (isError || !data) return <div className="space-y-5"><StudentHeader student={student} unread={0} greeting={greeting} /><ErrorState title="Home didn’t load" onRetry={() => refetch()} /></div>;

  const { profile, remedial, events, clubs, feed, live, assignments, fee, daily, tt } = data;
  const streak = profile?.streak; const goal = profile?.weeklyGoalMinutes ?? 120; const mins = profile?.weeklyMinutes ?? 0;
  const activeRem = remedial.find((r) => r.status !== "completed");

  // contextual strip — ranked: urgent school info first
  const soon = live.find((l) => l.status !== "Cancelled" && l.status !== "Completed" && l.classIds.includes(student.classId) && l.kind !== "parent-teacher" && new Date(l.startAt).getTime() - DEMO_NOW.getTime() < 3 * 3600e3 && new Date(l.startAt).getTime() > DEMO_NOW.getTime() - 3600e3);
  const dueAsg = assignments.filter((a) => a.submission.status !== "submitted" && a.submission.status !== "graded" && a.submission.status !== "returned").sort((a, b) => a.assignment.dueAt.localeCompare(b.assignment.dueAt))[0];
  const dueInst = fee?.feesEnabled ? fee.installments.find((i) => i.status === "due" || i.status === "overdue" || i.status === "partially-paid") : undefined;
  const dow = ((DEMO_NOW.getDay() + 6) % 7) + 1; const nowMin = 10 * 60 + 30;
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const nextPeriod = tt.filter((e) => e.dayOfWeek === dow).map((e) => ({ e, p: PERIODS.find((p) => p.id === e.periodId)! })).filter((x) => x.p && toMin(x.p.end) > nowMin).sort((a, b) => toMin(a.p.start) - toMin(b.p.start))[0];
  const strip: { key: string; node: React.ReactNode }[] = [];
  if (soon) strip.push({ key: "live", node: <Link href="/student/live-classes" className="group flex h-full min-w-[260px] items-center gap-3 rounded-[1.25rem] bg-gradient-to-br from-primary to-violet p-4 text-white shadow-card"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20"><VideoCamera size={22} weight="fill" /></span><span className="min-w-0"><span className="text-label block text-white/75">Live class · {relTime(soon.startAt)}</span><span className="block truncate font-bold">{soon.title}</span><span className="text-xs text-white/80">{fmtTime(soon.startAt)} · {soon.hostName}</span></span><ArrowRight size={18} className="ml-auto shrink-0 transition-transform group-hover:translate-x-1" /></Link> });
  if (dueAsg) { const overdue = dueAsg.submission.status === "overdue"; strip.push({ key: "asg", node: <Link href={`/student/assignments/${dueAsg.assignment.id}`} className="group flex h-full min-w-[260px] items-center gap-3 rounded-[1.25rem] border border-border bg-surface p-4 shadow-soft"><span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", overdue ? "bg-highlight-soft text-warning" : "bg-lilac text-primary")}><NotePencil size={22} weight="fill" /></span><span className="min-w-0"><span className="text-label block text-text-2">{overdue ? "Still open · no rush to start" : `Due ${relTime(dueAsg.assignment.dueAt)}`}</span><span className="block truncate font-semibold">{dueAsg.assignment.title}</span><span className="text-xs text-text-2">{overdue ? "Want help getting started? Your tutor can guide you." : `${dueAsg.assignment.totalMarks} marks · ${subjectById(dueAsg.assignment.subjectId).name}`}</span></span><ArrowRight size={18} className="ml-auto shrink-0 text-text-2" /></Link> }); }
  if (dueInst) strip.push({ key: "fee", node: <Link href="/student/fees" className="flex h-full min-w-[220px] items-center gap-3 rounded-[1.25rem] bg-highlight-soft p-4"><Receipt size={22} weight="fill" className="shrink-0 text-warning" /><span className="min-w-0"><span className="text-label block text-warning">School fees</span><span className="block text-sm font-semibold">{dueInst.label} · {fmtMoney(dueInst.amount - dueInst.paid)} · {fmtDate(dueInst.dueDate, { day: "numeric", month: "short" })}</span></span></Link> });
  if (nextPeriod) strip.push({ key: "tt", node: <Link href="/student/timetable" className="flex h-full min-w-[200px] items-center gap-3 rounded-[1.25rem] border border-border bg-surface p-4"><CalendarBlank size={22} weight="fill" className="shrink-0 text-primary" /><span className="min-w-0"><span className="text-label block text-text-2">Up next · {nextPeriod.p.start}</span><span className="block truncate text-sm font-semibold">{subjectById(nextPeriod.e.subjectId).name}</span><span className="text-xs text-text-2">{nextPeriod.p.label}</span></span></Link> });

  const upcomingEvents = events.filter((e) => new Date(e.endAt) > DEMO_NOW && !["cancelled", "draft", "completed", "results-published"].includes(e.status)).slice(0, 8);
  const trending = data.courses.filter((c) => c.status === "published" && (c.labels.includes("trending") || c.labels.includes("featured")));
  const sortedClubs = [...clubs].filter((c) => c.myStatus === "none").sort((a, b) => Number(student.interests.some((i) => (b.category + b.description).toLowerCase().includes(i.toLowerCase()))) - Number(student.interests.some((i) => (a.category + a.description).toLowerCase().includes(i.toLowerCase()))));

  return (
    <div className="space-y-7 pb-4">
      <StudentHeader student={student} unread={unread} greeting={greeting} />
      <TutorHeroCard hint={isNew ? "Say hi — you can ask me anything while you settle in." : activeRem ? "I can walk through fractions with you whenever you like." : undefined} />

      {!onboarded && <Card tone="lilac"><CardBody className="flex flex-wrap items-center gap-3"><Rocket size={26} weight="duotone" className="text-primary" /><div className="min-w-0 flex-1"><p className="font-semibold">Finish setting up your space</p><p className="text-sm text-text-2">A 1-minute tour to personalise your tutor and daily learning.</p></div><Button asChild size="sm"><Link href="/student/onboarding">Take the tour</Link></Button></CardBody></Card>}

      {strip.length > 0 && <section aria-label="Happening around school"><div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">{strip.map((s) => <motion.div key={s.key} whileHover={{ y: -2 }} className="shrink-0">{s.node}</motion.div>)}</div></section>}

      {/* Daily learning zone */}
      <section aria-labelledby="daily-h" className="grid gap-4 lg:grid-cols-12">
        <h2 id="daily-h" className="sr-only">Your daily learning</h2>
        <Card className="overflow-hidden lg:col-span-5"><CardBody className="flex h-full flex-col gap-4">
          {isNew ? (
            <><div className="flex items-start gap-3"><span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-lilac text-primary"><Target size={28} weight="duotone" /></span><div><Badge tone="primary">Baseline pending</Badge><h3 className="mt-1 text-lg font-bold leading-tight">Start with a gentle check-in</h3><p className="text-sm text-text-2">8 friendly questions so your tutor knows where to begin. No marks, no pressure — skip anything you like.</p></div></div>
              <Button asChild className="mt-auto"><Link href="/student/micro?topic=baseline"><Play size={16} weight="fill" />Begin check-in</Link></Button></>
          ) : (
            <><div className="flex items-center gap-3"><StreakFlame streak={streak?.current ?? 0} glow={!daily} /><div className="min-w-0"><h3 className="text-lg font-bold leading-tight">{daily ? "Today’s challenge is done" : "5-minute challenge"}</h3><p className="text-sm text-text-2">{daily ? `Streak at ${streak?.current} days — see you tomorrow.` : (streak?.current ?? 0) > 0 ? `${streak?.current}-day streak going — a quick one keeps it glowing.` : "Your streak starts with your first challenge."}</p></div></div>
              <WeekDots weekDays={streak?.weekDays ?? []} />
              <Button asChild className="mt-auto" variant={daily ? "soft" : "primary"}><Link href="/student/micro">{daily ? <><CheckCircle size={16} weight="fill" />Practise again for fun</> : <><Lightning size={16} weight="fill" />Start challenge</>}</Link></Button></>
          )}
        </CardBody></Card>

        <Card className="lg:col-span-3"><CardBody className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <ProgressRing value={Math.min(100, Math.round((mins / goal) * 100))} size={104} stroke={10} label={`Weekly goal ${mins} of ${goal} minutes`}><span className="tnum text-xl font-bold">{mins}</span><span className="text-[10px] text-text-2">min</span></ProgressRing>
          <div><h3 className="font-semibold">Weekly goal</h3><p className="tnum text-sm text-text-2">{mins >= goal ? "Goal reached — wonderful!" : isNew ? `${goal} minutes a week is the starting goal` : `${goal - mins} min to go this week`}</p></div>
        </CardBody></Card>

        <Card className="overflow-hidden lg:col-span-4" aria-label="Continue learning">
          {resume ? (
            <Link href={`/student/player/${resume.id}${resume.nextActivityId ? `?activity=${resume.nextActivityId}` : ""}`} className="flex h-full flex-col">
              <div className="relative h-24" style={{ background: `linear-gradient(135deg, ${resume.cover.from}, ${resume.cover.to})` }}><span className="absolute inset-0 flex items-center justify-center text-white/90"><Icon name={resume.cover.icon} size={44} weight="duotone" /></span><Badge className="absolute left-3 top-3 bg-surface/90">Continue learning</Badge></div>
              <div className="flex flex-1 flex-col gap-2 p-4"><h3 className="line-clamp-1 font-bold">{resume.title}</h3><p className="line-clamp-1 text-sm text-text-2">{resume.progressPct === 0 ? "Up first: " : "Resume: "}{nextAct?.title ?? "Pick up where you left off"}</p><div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary" style={{ width: `${resume.progressPct}%` }} /></div><div className="mt-auto flex items-center justify-between text-sm"><span className="tnum text-text-2">{resume.completedCount}/{resume.totalActivities} done</span><span className="inline-flex items-center gap-1 font-semibold text-primary">{resume.progressPct === 0 ? "Start" : "Continue"}<ArrowRight size={14} weight="bold" /></span></div></div>
            </Link>
          ) : (
            <CardBody className="flex h-full flex-col items-center justify-center gap-3 text-center"><Compass size={34} weight="duotone" className="text-primary" /><div><h3 className="font-bold">No courses yet</h3><p className="text-sm text-text-2">Explore what your school offers, or pick something new that sparks your interest.</p></div><Button asChild size="sm"><Link href="/student/courses">Browse courses</Link></Button></CardBody>
          )}
        </Card>
      </section>

      {activeRem && (
        <Card tone="lilac"><CardBody className="flex flex-wrap items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-primary"><Sparkle size={24} weight="fill" /></span>
          <div className="min-w-0 flex-1"><Badge tone="primary">Your plan · from your teacher</Badge><h3 className="mt-1 font-bold">{activeRem.title}</h3><p className="tnum text-sm text-text-2">{activeRem.steps.filter((s) => s.done).length} of {activeRem.steps.length} steps done — small steps, real progress. Aim to finish by {fmtDate(activeRem.targetDate, { day: "numeric", month: "short" })}.</p></div>
          <Button asChild><Link href="/student/learn#remedial">Continue plan</Link></Button>
        </CardBody></Card>
      )}

      <RailSection id="rec" title="Recommended for you" subtitle={isNew ? "Good first steps while we get to know you" : "Picked from your work, interests and goals"} empty={{ title: "You’re all caught up", body: "No new suggestions right now. Explore courses or ask your tutor for ideas.", action: { label: "Browse courses", href: "/student/courses" } }}>
        {recs.map((r) => <RecCard key={r.id} rec={r} studentId={studentId} />)}
      </RailSection>

      <RailSection id="courses" title="Continue your courses" action={{ label: "All courses", href: "/student/courses" }} empty={{ title: "No courses started yet", body: "Your school courses will show up here once you’re enrolled. Browse the catalogue to begin.", action: { label: "Browse courses", href: "/student/courses" } }}>
        {enrolled.map((c) => <ContentCard key={c.id} href={`/student/player/${c.id}${c.nextActivityId ? `?activity=${c.nextActivityId}` : ""}`} cover={c.cover} eyebrow={subjectById(c.subjectId).name} title={c.title} progress={c.progressPct} progressLabel={`${c.title} progress`} badge={c.labels.includes("teacher-assigned") ? { label: "Teacher assigned", tone: "primary" } : undefined} />)}
      </RailSection>

      <RailSection id="trending" title="Trending learning" subtitle="What students across your school are exploring" action={{ label: "See catalogue", href: "/student/courses" }}>
        {trending.map((c) => <ContentCard key={c.id} href={`/student/courses/${c.id}`} cover={c.cover} eyebrow={c.kind === "marketplace" ? "Marketplace" : "Your school"} title={c.title} meta={`${c.priceType === "free" ? "Free" : fmtMoney(c.price)} · ${c.rating} ★ (${c.ratings})`} badge={c.labels.includes("trending") ? { label: "Trending", tone: "highlight" } : { label: "Featured", tone: "primary" }} />)}
      </RailSection>

      <RailSection id="events" title="Upcoming competitions & events" action={{ label: "All events", href: "/student/events" }} empty={{ title: "Nothing coming up yet", body: "New competitions and events will appear here as your school announces them.", action: { label: "See past events", href: "/student/events" } }}>
        {upcomingEvents.map((e) => <ContentCard key={e.id} href={`/student/events/${e.id}`} cover={e.cover} eyebrow={e.category} title={e.title} meta={`${fmtDate(e.startAt, { weekday: "short", day: "numeric", month: "short" })} · ${e.myRegistration === "registered" ? "You’re registered" : e.status.replace(/-/g, " ")}`} badge={e.myRegistration === "registered" ? { label: "Registered", tone: "success" } : undefined} />)}
      </RailSection>

      <section className="space-y-2" aria-labelledby="school-h">
        <div className="flex items-end justify-between"><h2 id="school-h" className="text-heading">School & class highlights</h2><Link href="/student/feed" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Open feed<ArrowRight size={14} weight="bold" /></Link></div>
        {feed.length === 0 ? <Card><CardBody className="text-sm text-text-2">No posts yet — when teachers and clubs share updates they’ll appear here.</CardBody></Card> :
          <div className="grid gap-3 md:grid-cols-2">{feed.slice(0, 4).map((p) => (
            <Link key={p.id} href="/student/feed" className="block"><Card className="h-full transition-shadow hover:shadow-card"><CardBody className="flex gap-3"><Avatar name={p.authorName} color={p.authorColor} size={40} /><div className="min-w-0"><p className="text-sm font-semibold">{p.authorName}<span className="ml-2 text-xs font-normal text-text-2">{p.audienceLabel} · {relTime(p.createdAt)}</span></p><p className="mt-0.5 line-clamp-2 text-sm text-text-2">{p.text}</p></div></CardBody></Card></Link>))}</div>}
      </section>

      <RailSection id="clubs" title="Clubs you may like" action={{ label: "All clubs", href: "/student/clubs" }} empty={{ title: "You’re in all the clubs we have", body: "New clubs show up here when they open.", action: { label: "See your clubs", href: "/student/clubs" } }}>
        {sortedClubs.map((c) => <ContentCard key={c.id} href={`/student/clubs/${c.id}`} cover={c.cover} eyebrow={c.category} title={c.name} meta={`${c.members} members · ${c.membershipPolicy === "open" ? "Open to join" : "Request to join"}`} />)}
      </RailSection>

      <section className="space-y-2" aria-labelledby="ach-h">
        <div className="flex items-end justify-between"><h2 id="ach-h" className="text-heading">Recent achievements</h2><Link href="/student/you" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Your profile<ArrowRight size={14} weight="bold" /></Link></div>
        {(profile?.badges.length ?? 0) === 0 ? <Card tone="lilac"><CardBody className="flex items-center gap-3"><Medal size={28} weight="duotone" className="text-primary" /><p className="text-sm"><span className="font-semibold">Your first badge is waiting.</span> <span className="text-text-2">Finish a 5-minute challenge or try a game to earn it.</span></p></CardBody></Card> :
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Card tone="dark" className="w-48 shrink-0 bg-gradient-to-br from-[#1d1b4b] to-[#3a2d8f]"><CardBody><p className="text-label text-white/70">Level</p><p className="tnum text-4xl font-extrabold">{profile?.level}</p><p className="tnum text-sm text-white/80">{profile?.points.toLocaleString("en-IN")} points</p></CardBody></Card>
            {profile?.badges.map((b) => <Card key={b.id} className="w-40 shrink-0"><CardBody className="flex flex-col items-center gap-2 text-center"><span className="flex size-14 items-center justify-center rounded-2xl bg-highlight-soft text-warning"><Icon name={b.icon} size={28} weight="fill" /></span><p className="text-sm font-semibold leading-tight">{b.label}</p><p className="text-xs text-text-2">{relTime(b.earnedAt)}</p></CardBody></Card>)}
          </div>}
      </section>
    </div>
  );
}
