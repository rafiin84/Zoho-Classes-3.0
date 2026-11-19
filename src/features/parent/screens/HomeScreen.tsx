"use client";
import Link from "next/link";
import { CalendarCheck, Flame, BookOpenText, Wallet, Trophy, ChatCircleDots, Bell, Sparkle, Medal, CheckCircle, Info, CaretRight } from "@phosphor-icons/react";
import { Avatar, Badge, Card, CardBody, EmptyState, PageHeader, SectionHeader, StatTile, Skeleton, Progress, ErrorState } from "@/components/ui";
import { ProgressRing, BarChart } from "@/components/charts";
import { subjectById } from "@/lib/mock-data/core";
import { fmtDate, fmtMoney, relTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChild } from "../useChild";
import { RelationshipPanel, AccessGate, useRelationship } from "../relationship";
import { useChildProfile, useChildAttendance, useChildAssignments, useChildExams, useChildFees, useChildNotifications, useChildMarks, useEvents, useUnread, useChildDoubts } from "../data";

const Row = ({ href, icon, title, sub, tone }: { href: string; icon: React.ReactNode; title: string; sub: string; tone?: "warn" | "ok" }) => (
  <Link href={href} className={cn("flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-lilac", tone === "warn" ? "bg-warning-soft" : "bg-surface-2")}><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="block truncate text-xs text-text-2">{sub}</span></span><CaretRight size={16} className="text-text-2" /></Link>
);

function Overview() {
  const { childId, child, first, parent } = useChild(); const rel = useRelationship((s) => s.status); const full = rel === "verified";
  const prof = useChildProfile(childId); const att = useChildAttendance(childId); const asg = useChildAssignments(childId); const ex = useChildExams(childId); const fee = useChildFees(childId); const nt = useChildNotifications(childId); const marks = useChildMarks(childId); const evs = useEvents(); const unread = useUnread(childId); const doubts = useChildDoubts(childId);
  const loading = prof.isLoading || att.isLoading || asg.isLoading;
  if (prof.isError || att.isError) return <ErrorState onRetry={() => { prof.refetch(); att.refetch(); }} />;
  if (loading) return <div className="space-y-3"><Skeleton className="h-24" /><div className="grid gap-3 sm:grid-cols-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div><Skeleton className="h-64" /></div>;
  const p = prof.data; const a = att.data; const term = a?.term;
  const due = (asg.data ?? []).filter((r) => r.submission.status === "todo" || r.submission.status === "draft").sort((x, y) => x.assignment.dueAt.localeCompare(y.assignment.dueAt)).slice(0, 3);
  const exams = (ex.data ?? []).filter((v) => v.exam.kind !== "practice" && (v.state === "upcoming" || v.state === "available" || v.state === "in-progress")).slice(0, 2);
  const f = fee.data; const dueIns = f?.installments.find((i) => i.status === "due" || i.status === "overdue" || i.status === "partially-paid");
  const events = (evs.data ?? []).filter((e) => new Date(e.startAt) > new Date("2026-11-19") && e.status !== "cancelled").slice(0, 2);
  const alerts: { href: string; icon: React.ReactNode; title: string; sub: string; warn?: boolean }[] = [];
  if (full && dueIns) alerts.push({ href: "/parent/fees", icon: <Wallet size={20} />, title: `${dueIns.label} installment ${dueIns.status === "overdue" ? "is overdue" : `due ${relTime(dueIns.dueDate)}`}`, sub: `${fmtMoney(dueIns.amount - dueIns.paid + (dueIns.lateFee ?? 0))} · ${fmtDate(dueIns.dueDate, { day: "numeric", month: "short" })}`, warn: true });
  if (full && (unread.data ?? 0) > 0) alerts.push({ href: "/parent/messages", icon: <ChatCircleDots size={20} />, title: `${unread.data} new teacher repl${unread.data === 1 ? "y" : "ies"}`, sub: "Open messages to read" });
  if (full && marks.data) alerts.push(marks.data.published.length ? { href: "/parent/results", icon: <Medal size={20} />, title: "Results released", sub: marks.data.published[0].examLabel } : { href: "/parent/results", icon: <Medal size={20} />, title: "Results not released yet", sub: "The school will notify you when marks are published" });
  const mastery = p ? Object.entries(p.subjectMastery).map(([id, v]) => ({ label: subjectById(id).name, value: v, color: subjectById(id).color })) : [];
  const teacherReply = (doubts.data ?? []).find((d) => d.status === "answered");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 rounded-[1.25rem] bg-gradient-to-r from-lilac to-surface p-4 sm:p-5"><Avatar name={child.displayName} color={child.avatarColor} size={56} /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-text-2">Viewing</p><h2 className="text-heading">{child.displayName}</h2><p className="text-sm text-text-2">{child.gradeLabel} · Section {child.className.slice(-1)} · Greenfield International School</p></div>{p && p.streak.current > 0 && <Badge tone="highlight" icon={<Flame size={14} weight="fill" />}>{p.streak.current}-day learning streak</Badge>}</div>
      {rel !== "verified" && <p className="rounded-2xl bg-info-soft p-3 text-sm text-info" role="status">Access is <strong>{rel}</strong> (prototype state). Some sections below are hidden.</p>}
      <PageHeader title={`Good morning, ${parent.displayName.split(" ")[0]}`} subtitle={`Here's how ${first} is doing today, Thursday 19 November.`} />
      {alerts.length > 0 && <section aria-label="Alerts"><SectionHeader title="Needs your attention" /><div className="grid gap-2 md:grid-cols-2">{alerts.map((x) => <Row key={x.title} href={x.href} icon={x.icon} title={x.title} sub={x.sub} tone={x.warn ? "warn" : undefined} />)}</div></section>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-3 p-4"><ProgressRing value={term?.percent ?? 0} size={64} label={`Attendance ${term?.percent ?? 0} percent`}><span className="tnum text-xs font-bold">{term?.percent == null ? "–" : `${Math.round(term.percent)}%`}</span></ProgressRing><div><p className="text-xs font-semibold text-text-2">Attendance this term</p><p className="text-xs text-text-2">{a?.today ? `Today: ${a.today.status}` : "Today's register isn't taken yet"}</p></div></Card>
        <StatTile label="Learning streak" value={`${p?.streak.current ?? 0} days`} hint={`Best ${p?.streak.best ?? 0}`} icon={<Flame size={20} weight="fill" />} />
        <StatTile label="This week" value={`${p?.weeklyMinutes ?? 0} min`} hint={`Goal ${p?.weeklyGoalMinutes ?? 0} min`} icon={<BookOpenText size={20} />} />
        <StatTile label="Points & level" value={p?.points?.toLocaleString("en-IN") ?? 0} hint={`Level ${p?.level ?? 1}`} icon={<Sparkle size={20} />} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardBody><SectionHeader title="Progress by subject" action={<Link href="/parent/learning" className="text-sm font-semibold text-primary">Details</Link>} />{mastery.length === 0 ? <EmptyState title="No progress recorded yet" body={`${first} hasn't completed enough activities for a progress picture. Check back after a few lessons.`} /> : <BarChart horizontal data={mastery} max={100} unit="%" ariaLabel={`${first}'s mastery by subject`} height={200} />}</CardBody></Card>
        <Card><CardBody><SectionHeader title="Upcoming work" />{due.length + exams.length === 0 ? <p className="rounded-xl bg-surface-2 p-4 text-sm text-text-2"><CheckCircle size={18} className="mr-1 inline text-success" />Nothing due soon. {first} is up to date.</p> : <ul className="space-y-2">{due.map((r) => <li key={r.assignment.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-sm"><span><span className="font-semibold">{r.assignment.title}</span><span className="block text-xs text-text-2">{subjectById(r.assignment.subjectId).name} · due {fmtDate(r.assignment.dueAt, { weekday: "short", day: "numeric", month: "short" })}</span></span><Badge tone="warning">{relTime(r.assignment.dueAt)}</Badge></li>)}{exams.map((v) => <li key={v.exam.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-sm"><span><span className="font-semibold">{v.exam.title}</span><span className="block text-xs text-text-2">Exam · {fmtDate(v.exam.opensAt, { weekday: "short", day: "numeric", month: "short" })}</span></span><Badge tone="info">{v.state}</Badge></li>)}</ul>}</CardBody></Card>
        <Card><CardBody><SectionHeader title="Teacher updates" />{full ? <div className="space-y-2">{teacherReply && <Row href="/parent/messages" icon={<ChatCircleDots size={20} />} title={`Teacher answered a doubt: ${teacherReply.title}`} sub={relTime(teacherReply.updatedAt)} />}{(nt.data ?? []).filter((n) => n.category !== "finance").slice(0, 3).map((n) => <Row key={n.id} href={n.href ?? "/parent/notifications"} icon={<Bell size={20} />} title={n.title} sub={`${n.body} · ${relTime(n.at)}`} />)}{(nt.data ?? []).length === 0 && !teacherReply && <p className="text-sm text-text-2">No updates yet.</p>}</div> : <p className="text-sm text-text-2">Teacher updates need full access.</p>}</CardBody></Card>
        <Card><CardBody><SectionHeader title="Achievements" action={<Link href="/parent/achievements" className="text-sm font-semibold text-primary">All</Link>} />{p && p.badges.length > 0 ? <ul className="flex flex-wrap gap-2">{p.badges.map((b) => <li key={b.id}><Badge tone="primary" icon={<Trophy size={12} />}>{b.label}</Badge></li>)}</ul> : <p className="text-sm text-text-2">No badges earned yet. They appear here as {first} reaches milestones.</p>}{events.length > 0 && <div className="mt-4 border-t border-border pt-3"><p className="mb-2 text-xs font-semibold text-text-2">Coming up</p><ul className="space-y-1.5">{events.map((e) => <li key={e.id} className="text-sm"><span className="font-semibold">{e.title}</span> <span className="text-text-2">· {fmtDate(e.startAt, { day: "numeric", month: "short" })}</span></li>)}</ul></div>}</CardBody></Card>
      </div>
      {full && <Card tone={dueIns ? "lilac" : "plain"}><CardBody className="flex flex-wrap items-center justify-between gap-3">{!f || !f.feesEnabled ? <p className="text-sm text-text-2"><Info size={16} className="mr-1 inline" />School fees aren&apos;t collected online for {first}.</p> : f.balance <= 0 ? <p className="text-sm"><CheckCircle size={18} weight="fill" className="mr-1 inline text-success" />School fees for {first} are fully paid. Nothing due.</p> : <><div><p className="font-semibold">Fee notice: {dueIns?.label ?? "Upcoming installment"}</p><p className="text-sm text-text-2">Balance {fmtMoney(f.balance)}{dueIns ? ` · next due ${fmtDate(dueIns.dueDate, { day: "numeric", month: "short" })}` : ""}</p></div><Link href="/parent/fees" className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">View &amp; pay</Link></>}</CardBody></Card>}
      {att.data && !att.data.today && <p className="rounded-2xl bg-lilac p-3 text-sm text-primary" role="status">Attendance for today hasn&apos;t been taken yet. It will appear here once the teacher submits it.</p>}
    </div>
  );
}
export default function ParentHome() {
  const { childId } = useChild();
  return <div className="space-y-5"><AccessGate need="basic"><Overview key={childId} /></AccessGate><RelationshipPanel /></div>;
}
