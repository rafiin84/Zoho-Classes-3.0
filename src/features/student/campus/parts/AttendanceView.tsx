"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CaretLeft, CaretRight, ClockCountdown, CheckCircle, XCircle, Clock, FirstAidKit, Confetti } from "@phosphor-icons/react";
import { attendanceService } from "@/lib/api/attendanceService";
import { PERIODS } from "@/types/academic";
import { Button, Card, CardBody, PageHeader, SectionHeader, Segmented, StatTile, Skeleton, EmptyState, Badge } from "@/components/ui";
import { ProgressRing } from "@/components/charts";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import type { AttendanceDay, AttendanceStatus } from "@/types/attendance";
import { ck } from "../keys";
import { Boundary } from "../shared";

const META: Record<string, { label: string; short: string; cls: string; icon: React.ReactNode }> = {
  present: { label: "Present", short: "P", cls: "bg-success-soft text-success", icon: <CheckCircle size={14} weight="fill" /> },
  absent: { label: "Absent", short: "A", cls: "bg-danger-soft text-danger", icon: <XCircle size={14} weight="fill" /> },
  late: { label: "Late", short: "L", cls: "bg-warning-soft text-warning", icon: <Clock size={14} weight="fill" /> },
  excused: { label: "Excused", short: "E", cls: "bg-info-soft text-info", icon: <FirstAidKit size={14} weight="fill" /> },
};
const TODAY = "2026-11-19"; const FIRST_MONTH = "2026-08"; const LAST_MONTH = "2026-11";
const shift = (m: string, d: number) => { const [y, mo] = m.split("-").map(Number); const x = new Date(Date.UTC(y, mo - 1 + d, 1)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`; };
const monthLabel = (m: string) => new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(m + "-01T00:00:00Z"));
const periodLabel = (id: string) => PERIODS.find((p) => p.id === id)?.label ?? id;

function DayCell({ d, selected, onSelect }: { d: AttendanceDay; selected: boolean; onSelect: () => void }) {
  const day = Number(d.date.slice(8)); const m = META[d.status];
  const label = `${fmtDate(d.date, { weekday: "long", day: "numeric", month: "long" })}: ${m?.label ?? d.holidayName ?? (d.status === "weekend" ? "Weekend" : d.status === "not-taken" ? "Attendance not taken yet" : "No class yet")}`;
  const dim = d.status === "weekend" || d.status === "future";
  return (
    <button onClick={onSelect} aria-label={label} aria-pressed={selected} disabled={dim} className={cn("relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl text-sm transition-colors", m ? m.cls : d.status === "holiday" ? "bg-highlight-soft text-warning" : d.status === "not-taken" ? "border border-dashed border-primary bg-lilac text-primary" : "text-text-2/60", selected && "ring-2 ring-primary ring-offset-1 ring-offset-surface", d.date === TODAY && "font-bold underline decoration-2 underline-offset-4")}>
      <span className="tnum">{day}</span>
      <span className="text-[10px] font-bold leading-none" aria-hidden>{m ? m.short : d.status === "holiday" ? "H" : d.status === "not-taken" ? "…" : ""}</span>
    </button>
  );
}

export function AttendanceView({ studentId, name, mode }: { studentId: string; name: string; mode: "student" | "parent" }) {
  const [month, setMonth] = useState(LAST_MONTH); const [view, setView] = useState<"daily" | "period">("daily"); const [sel, setSel] = useState<string>(TODAY);
  const q = useQuery({ queryKey: ck.attendance(studentId, month), queryFn: () => attendanceService.forStudent(studentId, month) });
  const who = mode === "parent" ? `${name}'s` : "Your";
  return (
    <div>
      <PageHeader title="Attendance" subtitle={`${who} daily and period attendance, recorded by teachers. Updated as soon as a register is submitted.`} />
      <Boundary q={q} skeleton={<div className="space-y-3"><div className="grid gap-3 sm:grid-cols-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div><Skeleton className="h-96" /></div>}>
        {(d) => {
          const lead = (new Date(d.days[0].date + "T00:00:00Z").getUTCDay() + 6) % 7; const selDay = d.days.find((x) => x.date === sel);
          const todayShown = d.today; const s = d.summary; const t = d.term;
          return (
            <div className="space-y-5">
              {month === LAST_MONTH && (todayShown ? (
                <Card tone="lilac"><CardBody className="flex flex-wrap items-center gap-3"><Badge tone={todayShown.status === "absent" ? "danger" : todayShown.status === "late" ? "warning" : "success"}>{META[todayShown.status].label}</Badge><p className="text-sm font-medium">{name.split(" ")[0]} was marked <strong>{META[todayShown.status].label.toLowerCase()}</strong> today, {fmtDate(TODAY, { weekday: "long", day: "numeric", month: "long" })}.</p></CardBody></Card>
              ) : (
                <div className="flex items-start gap-4 rounded-[1.25rem] border border-dashed border-primary/40 bg-lilac p-5" role="status"><ClockCountdown size={32} weight="duotone" className="shrink-0 text-primary" /><div><h2 className="font-semibold">Attendance not taken yet</h2><p className="mt-1 max-w-xl text-sm text-text-2">Today&apos;s register for {fmtDate(TODAY, { weekday: "long", day: "numeric", month: "long" })} hasn&apos;t been submitted by the class teacher. That&apos;s normal in the morning; it will show up here the moment it&apos;s recorded. Nothing is wrong.</p></div></div>
              ))}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="flex items-center gap-4 p-4"><ProgressRing value={t.percent ?? 0} size={72} label={`Term attendance ${t.percent ?? 0} percent`}><span className="tnum text-sm font-bold">{t.percent === null ? "–" : `${Math.round(t.percent)}%`}</span></ProgressRing><div><p className="text-xs font-semibold text-text-2">This term</p><p className="text-xs text-text-2">{fmtDate(t.from, { day: "numeric", month: "short" })} – {fmtDate(t.to, { day: "numeric", month: "short", year: "numeric" })}</p><p className="tnum text-xs text-text-2">{t.recorded} school days recorded</p></div></Card>
                <StatTile label={`${monthLabel(month)}`} value={s.percent === null ? "No data" : `${s.percent}%`} hint={`${s.recorded} of ${s.workingDays} days recorded`} />
                <StatTile label="Present / Late" value={`${s.present} / ${s.late}`} hint="days this month" />
                <StatTile label="Absent / Excused" value={`${s.absent} / ${s.excused}`} hint="days this month" />
              </div>
              <Card><CardBody>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><Button size="iconSm" variant="outline" aria-label="Previous month" disabled={month <= FIRST_MONTH} onClick={() => setMonth(shift(month, -1))}><CaretLeft size={16} /></Button><h2 className="min-w-40 text-center text-heading" aria-live="polite">{monthLabel(month)}</h2><Button size="iconSm" variant="outline" aria-label="Next month" disabled={month >= LAST_MONTH} onClick={() => setMonth(shift(month, 1))}><CaretRight size={16} /></Button></div>
                  <Segmented value={view} onChange={setView} label="Attendance view" options={[{ value: "daily", label: "Daily" }, { value: "period", label: "Period-wise" }]} />
                </div>
                <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-text-2" aria-hidden>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => <div key={x}>{x}</div>)}</div>
                <div className="mt-1.5 grid grid-cols-7 gap-1.5" role="group" aria-label={`Calendar for ${monthLabel(month)}`}>{Array.from({ length: lead }).map((_, i) => <div key={i} />)}{d.days.map((x) => <DayCell key={x.date} d={x} selected={x.date === sel} onSelect={() => setSel(x.date)} />)}</div>
                <ul className="mt-4 flex flex-wrap gap-2 text-xs">{Object.entries(META).map(([k, m]) => <li key={k} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold", m.cls)}>{m.icon}{m.label}</li>)}<li className="inline-flex items-center gap-1 rounded-full bg-highlight-soft px-2.5 py-1 font-semibold text-warning">H Holiday</li><li className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary px-2.5 py-1 font-semibold text-primary">… Not taken yet</li></ul>
              </CardBody></Card>
              <Card><CardBody>
                <SectionHeader title={selDay ? fmtDate(selDay.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Pick a day"} />
                {!selDay || selDay.status === "weekend" || selDay.status === "future" ? <p className="text-sm text-text-2">Select a school day on the calendar to see its details.</p> :
                  selDay.status === "holiday" ? <EmptyState icon={<Confetti size={28} weight="duotone" />} title={selDay.holidayName ?? "Holiday"} body="No classes, so nothing was recorded." /> :
                  selDay.status === "not-taken" ? <EmptyState icon={<ClockCountdown size={28} weight="duotone" />} title="Attendance not taken yet" body="No register has been submitted for this day." /> : (
                    view === "daily" ? <div className="flex flex-wrap items-center gap-3"><Badge tone={selDay.status === "absent" ? "danger" : selDay.status === "late" ? "warning" : selDay.status === "excused" ? "info" : "success"} icon={META[selDay.status].icon}>{META[selDay.status].label}</Badge>{selDay.note && <span className="text-sm text-text-2">{selDay.note}</span>}<span className="text-sm text-text-2">Daily register</span></div> :
                    selDay.periods.length === 0 ? <p className="text-sm text-text-2">Period registers are kept for the last two weeks only. The daily register for this day says <strong>{META[selDay.status].label.toLowerCase()}</strong>.</p> :
                    <ul className="grid gap-2 sm:grid-cols-2">{selDay.periods.map((p) => <li key={p.period} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-sm"><span>{periodLabel(p.period)}</span><Badge tone={p.status === "absent" ? "danger" : p.status === "late" ? "warning" : p.status === "excused" ? "info" : "success"} icon={META[p.status as AttendanceStatus].icon}>{META[p.status].label}</Badge></li>)}</ul>)}
              </CardBody></Card>
            </div>
          );
        }}
      </Boundary>
    </div>
  );
}
