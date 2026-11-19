"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { VideoCamera, Clock, BellRinging, Users } from "@phosphor-icons/react";
import { liveClassService } from "@/lib/api";
import { Badge, Button, Card, CardBody, EmptyState, PageHeader, SectionHeader, Segmented, Skeleton, Switch, toast, Select, ListToolbar, NoResults } from "@/components/ui";
import { fmtDate, fmtTime, relTime } from "@/lib/format";
import type { LiveClass } from "@/types";
import { liveLabel, canJoin } from "@/features/live/status";
import { ck } from "../keys";
import { Boundary, BackLink } from "../shared";

const TONE = { Scheduled: "neutral", "Starting soon": "warning", Live: "success", Completed: "info", Cancelled: "danger" } as const;
const KIND: Record<string, string> = { class: "Class", "one-to-one": "One-to-one", group: "Group", "office-hours": "Office hours", "parent-teacher": "Parent–teacher", webinar: "Webinar", staff: "Staff" };
const visible = (c: LiveClass, classId: string, mode: "student" | "parent") => c.classIds.includes(classId) && c.kind !== "staff" && (mode === "parent" || c.kind !== "parent-teacher");
const when = (c: LiveClass) => `${fmtDate(c.startAt, { weekday: "short", day: "numeric", month: "short" })}, ${fmtTime(c.startAt)} IST`;

export function useLive(classId: string, mode: "student" | "parent") { return useQuery({ queryKey: [...ck.live, classId, mode], queryFn: async () => (await liveClassService.list()).filter((c) => visible(c, classId, mode)) }); }

function ReminderToggle({ c, studentId }: { c: LiveClass; studentId: string }) {
  const qc = useQueryClient(); const [on, setOn] = useState(() => liveClassService.hasReminder(c.id, studentId));
  return <div className="flex items-center gap-2 text-sm"><BellRinging size={16} className="text-primary" /><span>Remind me 10 min before</span><Switch checked={on} label={`Reminder for ${c.title}`} onChange={(v) => { liveClassService.remind(c.id, studentId, v); setOn(v); toast.info(v ? "Reminder set (IST)." : "Reminder removed."); qc.invalidateQueries({ queryKey: ck.live }); }} /></div>;
}

export function LiveClassesView({ studentId, classId, mode, name }: { studentId: string; classId: string; mode: "student" | "parent"; name: string }) {
  const q = useLive(classId, mode); const [tab, setTab] = useState<"upcoming" | "past">("upcoming"); const [query, setQuery] = useState(""); const [kind, setKind] = useState("all");
  const rows = q.data ?? [];
  const list = useMemo(() => rows.filter((c) => (tab === "past" ? c.status === "Completed" || c.status === "Cancelled" : c.status === "Scheduled" || c.status === "Live") && (kind === "all" || c.kind === kind) && c.title.toLowerCase().includes(query.toLowerCase())).sort((a, b) => (tab === "past" ? b.startAt.localeCompare(a.startAt) : a.startAt.localeCompare(b.startAt))), [rows, tab, kind, query]);
  const clear = () => { setQuery(""); setKind("all"); };
  return (
    <div>
      <PageHeader title="Live Classes" subtitle={`${mode === "parent" ? `${name}'s schedule` : "Your schedule"}. All times are India Standard Time (IST, UTC+5:30).`} />
      <div className="mb-4"><Segmented value={tab} onChange={setTab} label="Live class tabs" options={[{ value: "upcoming", label: "Upcoming" }, { value: "past", label: "Past & cancelled" }]} /></div>
      <ListToolbar query={query} onQuery={setQuery} placeholder="Search live classes" count={q.data ? list.length : undefined} onClear={clear} hasFilters={kind !== "all"}>
        <Select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value)} className="w-44"><option value="all">All types</option>{Object.entries(KIND).filter(([k]) => k !== "staff").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
      </ListToolbar>
      <Boundary q={q} skeleton={<div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>}>
        {() => list.length === 0 ? (rows.length && (query || kind !== "all") ? <NoResults onClear={clear} query={query} /> : <EmptyState icon={<VideoCamera size={28} weight="duotone" />} title={tab === "upcoming" ? "No live classes scheduled" : "Nothing in the past yet"} body="When a teacher schedules a live class for the class, it appears here and in the timetable." />) :
          <div className="space-y-3">{list.map((c) => { const l = liveLabel(c); return (
            <Card key={c.id} className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="mb-1.5 flex flex-wrap gap-2"><Badge tone={TONE[l]}>{l}</Badge><Badge>{KIND[c.kind] ?? c.kind}</Badge></div><Link href={`/${mode}/live-classes/${c.id}`} className="text-base font-semibold hover:text-primary hover:underline">{c.title}</Link><p className="mt-0.5 text-sm text-text-2">{c.hostName} · {c.audienceLabel}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-text-2"><Clock size={14} />{when(c)} · {c.durationMinutes} min · {relTime(c.startAt)}</p></div>
              <div className="flex flex-col items-end gap-2">{mode === "student" && canJoin(c) && <Button asChild><Link href={`/student/live-classes/${c.id}/room`}><VideoCamera size={18} weight="fill" />Join class</Link></Button>}<Button asChild variant="outline" size="sm"><Link href={`/${mode}/live-classes/${c.id}`}>Details</Link></Button></div></div>
              {mode === "student" && (c.status === "Scheduled") && <div className="mt-3 border-t border-border pt-3"><ReminderToggle c={c} studentId={studentId} /></div>}</Card>); })}</div>}
      </Boundary>
    </div>
  );
}

export function LiveClassDetailView({ id, studentId, classId, mode }: { id: string; studentId: string; classId: string; mode: "student" | "parent" }) {
  const q = useQuery({ queryKey: [...ck.live, "one", id], queryFn: () => liveClassService.get(id) });
  return (
    <div>
      <BackLink href={`/${mode}/live-classes`} label="All live classes" />
      <Boundary q={q} skeleton={<Skeleton className="h-64" />} empty={<EmptyState title="Live class not found" body="It may have been removed." action={{ label: "Back", href: `/${mode}/live-classes` }} />}>
        {(c) => { const l = liveLabel(c); const ok = visible(c, classId, mode); return !ok ? <EmptyState title="Not available for this account" body="This live class isn't scheduled for this class." action={{ label: "Back", href: `/${mode}/live-classes` }} /> : (
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4"><PageHeader title={c.title} subtitle={`${c.hostName} · ${c.audienceLabel}`} eyebrow={<div className="flex gap-2"><Badge tone={TONE[l]}>{l}</Badge><Badge>{KIND[c.kind]}</Badge></div>} />
              <Card><CardBody><SectionHeader title="Agenda" /><p className="text-[0.95rem] leading-relaxed">{c.agenda}</p></CardBody></Card>
              <Card><CardBody><SectionHeader title="Shared resources" />{c.resources.length === 0 ? <p className="text-sm text-text-2">Nothing shared yet. Resources appear here during or after class.</p> : <ul className="space-y-1.5">{c.resources.map((r) => <li key={r.name} className="rounded-xl bg-surface-2 px-3 py-2 text-sm">{r.name}</li>)}</ul>}</CardBody></Card>
              {c.status === "Completed" && <Card><CardBody><SectionHeader title="After class" /><p className="text-sm text-text-2">Recording: <strong>not recorded</strong>. Recording is off by default and needs consent.</p></CardBody></Card>}
            </div>
            <aside><Card><CardBody className="space-y-3 text-sm"><p className="flex items-center gap-2 font-semibold"><Clock size={18} className="text-primary" />{when(c)}</p><p className="text-text-2">{c.durationMinutes} minutes · {relTime(c.startAt)}</p><p className="flex items-center gap-2 text-text-2"><Users size={16} />{c.waitingRoom ? "Waiting room on" : "Open entry"} · recording {c.recordingPolicy === "off" ? "off" : "needs consent"}</p>
              {mode === "student" ? (<>{canJoin(c) ? <Button asChild className="w-full" size="lg"><Link href={`/student/live-classes/${c.id}/room`}><VideoCamera size={18} weight="fill" />Join class</Link></Button> : <p className="rounded-xl bg-surface-2 p-3 text-text-2">{c.status === "Cancelled" ? "This class was cancelled." : c.status === "Completed" ? "This class has ended." : "Joining opens 60 minutes before the start."}</p>}{c.status === "Scheduled" && <ReminderToggle c={c} studentId={studentId} />}</>) : <p className="rounded-xl bg-lilac p-3 text-primary">Students join from their own account. You&apos;ll see attendance in the Attendance screen after class.</p>}
            </CardBody></Card></aside>
          </div>); }}
      </Boundary>
    </div>
  );
}
