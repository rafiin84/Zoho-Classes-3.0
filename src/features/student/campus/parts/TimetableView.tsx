"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { VideoCamera, ArrowsClockwise, Prohibit, MapPin, CalendarBlank, Trophy, Exam as ExamIcon, Confetti, Chalkboard } from "@phosphor-icons/react";
import { timetableService, liveClassService, eventService } from "@/lib/api";
import { examService } from "@/lib/api/examService";
import { HOLIDAYS, isoDay } from "@/lib/mock-data/attendance";
import { ROOMS } from "@/lib/mock-data/academic";
import { TEACHERS, teacherName, subjectById, SUBJECTS } from "@/lib/mock-data/core";
import { PERIODS, DAYS, type TimetableEntry } from "@/types/academic";
import { Badge, Card, CardBody, EmptyState, PageHeader, Segmented, Select, Skeleton, Button, Switch } from "@/components/ui";
import { cn } from "@/lib/utils";
import { fmtDate, fmtTime, TZ_LABEL } from "@/lib/format";
import type { LiveClass } from "@/types";
import { ck } from "../keys";
import { Boundary } from "../shared";

const MONDAY = "2026-11-16"; const TODAY_N = 4;
const dateOf = (n: number) => { const d = new Date(MONDAY + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n - 1); return isoDay(d); };
const istParts = (iso: string) => { const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso)); const g = (t: string) => f.find((x) => x.type === t)!.value; return { date: `${g("year")}-${g("month")}-${g("day")}`, hm: `${g("hour")}:${g("minute")}` }; };
const periodAt = (hm: string) => PERIODS.find((p) => p.kind === "teaching" && hm >= p.start && hm < p.end)?.id;

type Cell = { entry?: TimetableEntry; lives: LiveClass[] };
function useTimetable(classId: string, mode: "student" | "parent") {
  return useQuery({ queryKey: ck.timetable(classId + mode), queryFn: async () => { const [entries, live] = await Promise.all([timetableService.forClass(classId), liveClassService.list()]); return { entries, live: live.filter((c) => c.classIds.includes(classId) && c.kind !== "staff" && (mode === "parent" || c.kind !== "parent-teacher")) }; } });
}
function Slot({ c, base, compact }: { c: Cell; base: string; compact?: boolean }) {
  const e = c.entry; const subj = e ? subjectById(e.subjectId) : null; const room = ROOMS.find((r) => r.id === e?.roomId);
  return (
    <div className="space-y-1.5">
      {e && <div className={cn("rounded-xl border-l-4 bg-surface-2 p-2.5 text-xs", e.status === "cancelled" && "opacity-70")} style={{ borderLeftColor: subj!.color }}>
        <p className={cn("text-sm font-semibold", e.status === "cancelled" && "line-through")}>{subj!.name}</p>
        <p className="text-text-2">{e.status === "substituted" && e.substituteTeacherId ? <>{teacherName(e.substituteTeacherId)} <span className="line-through">{teacherName(e.teacherId)}</span></> : teacherName(e.teacherId)}</p>
        {!compact && room && <p className="mt-0.5 flex items-center gap-1 text-text-2"><MapPin size={12} />{room.name}</p>}
        <div className="mt-1 flex flex-wrap gap-1">{e.status === "cancelled" && <Badge tone="danger" icon={<Prohibit size={11} />}>Cancelled</Badge>}{e.status === "substituted" && <Badge tone="warning" icon={<ArrowsClockwise size={11} />}>Substitute</Badge>}{e.status === "live-online" && <Badge tone="info" icon={<VideoCamera size={11} />}>Online</Badge>}{e.status === "special" && <Badge tone="primary">Special</Badge>}</div>
        {e.note && !compact && <p className="mt-1 text-text-2">{e.note}</p>}
      </div>}
      {c.lives.map((l) => <Link key={l.id} href={`${base}/live-classes/${l.id}`} className={cn("block rounded-xl border border-info/40 bg-info-soft p-2.5 text-xs text-info hover:shadow-soft", l.status === "Cancelled" && "opacity-70")}><span className="flex items-center gap-1 font-semibold"><VideoCamera size={13} weight="fill" /><span className={l.status === "Cancelled" ? "line-through" : ""}>{l.title}</span></span><span>Live online · {fmtTime(l.startAt)} IST{l.status === "Cancelled" ? " · cancelled" : ""}</span></Link>)}
    </div>
  );
}

function CalendarList({ classId, studentId, base, mode }: { classId: string; studentId: string; base: string; mode: "student" | "parent" }) {
  const q = useQuery({ queryKey: [...ck.timetable(classId), "cal", studentId, mode], queryFn: async () => { const [live, exams, events] = await Promise.all([liveClassService.list(), examService.forStudent(studentId, classId), eventService.list()]); return { live: live.filter((c) => c.classIds.includes(classId) && c.kind !== "staff" && (mode === "parent" || c.kind !== "parent-teacher")), exams, events }; } });
  const [types, setTypes] = useState<string[]>(["live", "exam", "event", "holiday"]); const [range, setRange] = useState("30");
  const items = useMemo(() => {
    if (!q.data) return []; const out: { at: string; type: string; title: string; sub: string; href?: string; icon: React.ReactNode }[] = [];
    q.data.live.forEach((l) => out.push({ at: l.startAt, type: "live", title: l.title, sub: `${l.hostName} · ${l.status}`, href: `${base}/live-classes/${l.id}`, icon: <VideoCamera size={16} weight="fill" /> }));
    q.data.exams.filter((v) => v.exam.kind !== "practice").forEach((v) => out.push({ at: v.exam.opensAt, type: "exam", title: v.exam.title, sub: `${v.exam.durationMinutes} min · ${v.state}`, href: mode === "parent" ? "/parent/results" : `/student/exams/${v.exam.id}`, icon: <ExamIcon size={16} /> }));
    q.data.events.forEach((e) => out.push({ at: e.startAt, type: "event", title: e.title, sub: `${e.venue} · ${e.scope}`, href: mode === "parent" ? "/parent/feed" : `/student/events/${e.id}`, icon: <Trophy size={16} /> }));
    Object.entries(HOLIDAYS).forEach(([d, n]) => out.push({ at: `${d}T00:00:00+05:30`, type: "holiday", title: n, sub: "School holiday", icon: <Confetti size={16} /> }));
    const lo = new Date("2026-11-16T00:00:00+05:30").getTime(), hi = lo + (range === "7" ? 7 : 40) * 864e5;
    return out.filter((i) => types.includes(i.type) && new Date(i.at).getTime() >= lo && new Date(i.at).getTime() < hi).sort((a, b) => a.at.localeCompare(b.at));
  }, [q.data, types, range, base, mode]);
  const chips = [["live", "Live classes"], ["exam", "Exams"], ["event", "Competitions & events"], ["holiday", "Holidays"]];
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">{chips.map(([k, l]) => <button key={k} aria-pressed={types.includes(k)} onClick={() => setTypes((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]))} className={cn("h-9 rounded-full px-3.5 text-sm font-semibold", types.includes(k) ? "bg-primary text-primary-fg" : "bg-surface-2 text-text-2")}>{l}</button>)}<Select aria-label="Range" value={range} onChange={(e) => setRange(e.target.value)} className="ml-auto w-40"><option value="7">This week</option><option value="30">Next 30 days</option></Select></div>
      <Boundary q={q} skeleton={<Skeleton className="h-64" />}>{() => items.length === 0 ? <EmptyState icon={<CalendarBlank size={28} weight="duotone" />} title="Nothing in this range" body="Try another range or turn more item types on." /> :
        <ul className="space-y-2">{items.map((i, n) => { const inner = <><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lilac text-primary">{i.icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{i.title}</span><span className="block text-xs text-text-2">{fmtDate(i.at, { weekday: "short", day: "numeric", month: "short" })}{i.type !== "holiday" ? `, ${fmtTime(i.at)} IST` : ""} · {i.sub}</span></span><Badge>{i.type}</Badge></>; return <li key={n}>{i.href ? <Link href={i.href} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 hover:shadow-soft">{inner}</Link> : <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">{inner}</div>}</li>; })}</ul>}</Boundary>
    </div>
  );
}

export function TimetableView({ studentId, classId, className, mode }: { studentId: string; classId: string; className: string; mode: "student" | "parent" }) {
  const q = useTimetable(classId, mode); const base = `/${mode}`;
  const [view, setView] = useState<"day" | "week" | "calendar">("day"); const [day, setDay] = useState(TODAY_N); const [subject, setSubject] = useState("all"); const [changesOnly, setChangesOnly] = useState(false);
  const cells = useMemo(() => { const m = new Map<string, Cell>(); const get = (k: string) => m.get(k) ?? (m.set(k, { lives: [] }), m.get(k)!);
    q.data?.entries.forEach((e) => { if (subject !== "all" && e.subjectId !== subject) return; if (changesOnly && e.status === "regular") return; get(`${e.dayOfWeek}-${e.periodId}`).entry = e; });
    q.data?.live.forEach((l) => { const p = istParts(l.startAt); const n = DAYS.find((d) => dateOf(d.n) === p.date)?.n; const per = periodAt(p.hm); if (n && per) get(`${n}-${per}`).lives.push(l); });
    return m; }, [q.data, subject, changesOnly]);
  const periods = PERIODS;
  return (
    <div>
      <PageHeader title="Timetable" subtitle={`${className} · week of ${fmtDate(MONDAY, { day: "numeric", month: "short" })} – ${fmtDate(dateOf(5), { day: "numeric", month: "short", year: "numeric" })} · times in ${TZ_LABEL}`} />
      <div className="mb-4 flex flex-wrap items-center gap-2"><Segmented value={view} onChange={setView} label="Timetable view" options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "calendar", label: "Calendar" }]} />
        {view !== "calendar" && <><Select aria-label="Subject filter" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-44"><option value="all">All subjects</option>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select><label className="flex items-center gap-2 text-sm"><Switch checked={changesOnly} onChange={setChangesOnly} label="Show only changes and live sessions" />Changes only</label></>}</div>
      {view === "calendar" ? <CalendarList classId={classId} studentId={studentId} base={base} mode={mode} /> : (
        <Boundary q={q} skeleton={<Skeleton className="h-96" />} empty={<EmptyState title="No timetable published" body="Your school hasn't published a timetable for this class yet." />}>
          {() => view === "day" ? (
            <div><div className="mb-3 flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Day">{DAYS.map((d) => <button key={d.n} role="tab" aria-selected={day === d.n} onClick={() => setDay(d.n)} className={cn("min-w-20 rounded-2xl px-3 py-2 text-center text-sm", day === d.n ? "bg-primary text-primary-fg" : "bg-surface-2 text-text-2")}><span className="block font-semibold">{d.short}{d.n === TODAY_N ? " · today" : ""}</span><span className="tnum text-xs opacity-80">{fmtDate(dateOf(d.n), { day: "numeric", month: "short" })}</span></button>)}</div>
              <p className="mb-2 text-sm font-semibold">{fmtDate(dateOf(day), { weekday: "long", day: "numeric", month: "long", year: "numeric" })} {day === TODAY_N && <Badge tone="primary">Today</Badge>}</p>
              {HOLIDAYS[dateOf(day)] ? <EmptyState icon={<Confetti size={28} weight="duotone" />} title={HOLIDAYS[dateOf(day)]} body="No classes today." /> : (
                <ul className="space-y-2">{periods.map((p) => { const c = cells.get(`${day}-${p.id}`); if (p.kind === "teaching" && !c && (subject !== "all" || changesOnly)) return null; return <li key={p.id} className={cn("grid grid-cols-[84px_1fr] gap-3 rounded-2xl p-2", day === TODAY_N && p.kind === "teaching" && p.start <= "10:30" && "10:30" < p.end && "bg-lilac ring-2 ring-primary")}><div className="text-xs"><p className="font-semibold">{p.label}</p><p className="tnum text-text-2">{p.start}–{p.end}</p></div>{p.kind === "break" ? <p className="self-center text-sm text-text-2">{p.label}</p> : c ? <Slot c={c} base={base} /> : <p className="self-center text-sm text-text-2">Free period</p>}</li>; })}</ul>)}
            </div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[820px] border-separate border-spacing-1.5 text-left"><caption className="sr-only">Weekly timetable</caption><thead><tr><th className="w-24 text-xs text-text-2">Period</th>{DAYS.map((d) => <th key={d.n} scope="col" className={cn("rounded-xl px-2 py-2 text-sm", d.n === TODAY_N ? "bg-primary text-primary-fg" : "bg-surface-2")}>{d.short} <span className="tnum text-xs font-normal opacity-80">{fmtDate(dateOf(d.n), { day: "numeric", month: "short" })}</span>{d.n === TODAY_N ? " · today" : ""}</th>)}</tr></thead>
              <tbody>{periods.map((p) => <tr key={p.id}><th scope="row" className="align-top text-xs"><span className="block font-semibold">{p.label}</span><span className="tnum text-text-2">{p.start}–{p.end}</span></th>{p.kind === "break" ? <td colSpan={5} className="rounded-xl bg-surface-2 py-1.5 text-center text-xs text-text-2">{p.label}</td> : DAYS.map((d) => { const c = cells.get(`${d.n}-${p.id}`); return <td key={d.n} className={cn("align-top", d.n === TODAY_N && "bg-lilac/50 rounded-xl")}>{c ? <Slot c={c} base={base} compact /> : <span className="block py-3 text-center text-xs text-text-2">–</span>}</td>; })}</tr>)}</tbody></table></div>
          )}
        </Boundary>
      )}
      <p className="mt-4 flex items-center gap-1.5 text-xs text-text-2"><Chalkboard size={14} />Cancelled and substituted periods and live online sessions are shown as soon as the school publishes them.</p>
    </div>
  );
}
