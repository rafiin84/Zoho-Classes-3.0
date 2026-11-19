"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CaretLeft, CaretRight, Printer, Warning, Export, ArrowsClockwise } from "@phosphor-icons/react";
import { Button, Card, CardBody, PageHeader, Segmented, Select, Badge, StatTile, ErrorState, SkeletonCards, Skeleton, EmptyState, Drawer, Modal, StatusBadge, DemoTag, toast } from "@/components/ui";
import type { ScreenProps } from "@/types/screens";
import type { TimetableEntry } from "@/types/academic";
import { timetableService } from "@/lib/api/timetableService";
import { staffAllocationService } from "@/lib/api/staffAllocationService";
import { liveClassService } from "@/lib/api/liveClassService";
import { useActors } from "@/stores/app-store";
import { TEACHERS, CLASSROOMS, SUBJECTS, teacherName } from "@/lib/mock-data/core";
import { ROOMS } from "@/lib/mock-data/academic";
import { DEMO_NOW, fmtTime, relTime } from "@/lib/format";
import { WeekGrid, EntryChip, LiveChip, liveSlots, addDays, dateLabel, subjName, className, tShort, roomName, ConflictBadge, csvDownload, useInvalidateTT, statusText, DAYS, PERIODS } from "../timetable/common";
import { ProposeDialog, ChangeFlow } from "../timetable/ChangeFlow";
import { CalendarView } from "../timetable/CalendarView";
import { ReportsView } from "../timetable/ReportsView";
import { SubstituteDialog } from "../timetable/SubstituteDialog";

type Dim = "teacher" | "class" | "subject" | "room";
type Tab = "timetable" | "calendar" | "changes" | "reports";

export default function TimetableScreen({ role }: ScreenProps) {
  const admin = role === "institution";
  const { teacherId, flags } = useActors();
  const [tab, setTab] = React.useState<Tab>("timetable");
  const [dim, setDim] = React.useState<Dim>(admin ? "class" : "teacher");
  const [target, setTarget] = React.useState<string>(admin ? "cls-8b" : teacherId);
  const [view, setView] = React.useState<"week" | "day">("week");
  const [day, setDay] = React.useState(4);
  const [weekOff, setWeekOff] = React.useState(0);
  const [source, setSource] = React.useState<"published" | "draft">("published");
  const [sel, setSel] = React.useState<TimetableEntry | null>(null);
  const [propose, setPropose] = React.useState<string | null | undefined>(undefined);
  const [sub, setSub] = React.useState<TimetableEntry | null>(null);
  const [exp, setExp] = React.useState(false);
  const by = admin ? "Timetable office" : teacherName(teacherId);
  React.useEffect(() => { if (!admin) { setDim("teacher"); setTarget(teacherId); } }, [teacherId, admin]);

  const ents = useQuery({ queryKey: ["academic", "tt", "entries", source], queryFn: () => (source === "draft" && admin ? timetableService.allDraftAware() : timetableService.all()) });
  const cal = useQuery({ queryKey: ["academic", "tt", "calendar"], queryFn: timetableService.calendar });
  const live = useQuery({ queryKey: ["academic", "tt", "live"], queryFn: liveClassService.list });
  const confl = useQuery({ queryKey: ["academic", "tt", "conflicts", source], queryFn: async () => (source === "draft" && admin ? (await staffAllocationService.workspace()).conflicts : timetableService.publishedConflicts()) });
  const meta = useQuery({ queryKey: ["academic", "tt", "meta"], queryFn: timetableService.meta, enabled: admin });
  const inv = useInvalidateTT();

  const targets = dim === "teacher" ? TEACHERS.map((t) => ({ id: t.id, label: `${t.title} ${t.displayName}` })) : dim === "class" ? CLASSROOMS.map((c) => ({ id: c.id, label: c.name })) : dim === "subject" ? SUBJECTS.map((s) => ({ id: s.id, label: s.name })) : ROOMS.map((r) => ({ id: r.id, label: r.name }));
  const changeDim = (d: Dim) => { setDim(d); setTarget(d === "teacher" ? teacherId : d === "class" ? "cls-8b" : d === "subject" ? "sub-math" : "rm-sci"); };

  const weekStart = cal.data?.weekStart ?? "2026-11-16";
  const monday = addDays(weekStart, weekOff * 7);
  const headers = Object.fromEntries(DAYS.map((d) => [d.n, dateLabel(addDays(monday, d.n - 1))]));
  const holidayDays: Record<number, string> = {}; cal.data?.holidays.forEach((h) => { const i = DAYS.find((d) => addDays(monday, d.n - 1) === h.date); if (i) holidayDays[i.n] = h.label; });

  const mine = (ents.data ?? []).filter((e) => (dim === "teacher" ? e.teacherId === target || e.substituteTeacherId === target : dim === "class" ? e.classId === target : dim === "subject" ? e.subjectId === target : e.roomId === target));
  const cmap = React.useMemo(() => { const m = new Map<string, NonNullable<typeof confl.data>>(); (confl.data ?? []).forEach((c) => c.entryIds.forEach((id) => m.set(id, [...(m.get(id) ?? []), c]))); return m; }, [confl.data]);
  const slots = liveSlots(live.data ?? [], monday).filter((s) => (dim === "teacher" ? s.live.hostId === target : dim === "class" ? s.live.classIds.includes(target) : false));
  const outside = slots.filter((s) => !s.periodId);
  const lines = (e: TimetableEntry) => dim === "teacher" ? [className(e.classId), roomName(e.roomId)] : dim === "class" ? [tShort(e.substituteTeacherId ?? e.teacherId), roomName(e.roomId)] : dim === "subject" ? [className(e.classId), tShort(e.teacherId)] : [className(e.classId), tShort(e.teacherId)];
  const cell = (d: number, p: string) => {
    if (holidayDays[d]) return <p className="p-1 text-[11px] text-text-2">{holidayDays[d]}</p>;
    return <>
      {mine.filter((e) => e.dayOfWeek === d && e.periodId === p).map((e) => <EntryChip key={e.id} entry={e} lines={lines(e)} conflicts={cmap.get(e.id)} onClick={() => setSel(e)} selected={sel?.id === e.id} showSubject={dim !== "subject"} />)}
      {slots.filter((s) => s.day === d && s.periodId === p).map((s) => <LiveChip key={s.live.id} live={s.live} onClick={() => toast.info(`${s.live.title} · ${fmtTime(s.live.startAt)} IST. Open Live Classes to manage or start it.`)} />)}
    </>;
  };
  const myConflicts = !admin ? (confl.data ?? []).filter((c) => c.kind !== "unfulfilled" && c.teacherId === teacherId) : [];
  const perWeek = mine.filter((e) => e.status !== "cancelled").length;

  const exportRows = () => mine.slice().sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.periodId.localeCompare(b.periodId)).map((e) => [DAYS.find((d) => d.n === e.dayOfWeek)!.label, PERIODS.find((p) => p.id === e.periodId)!.label, className(e.classId), subjName(e.subjectId), tShort(e.substituteTeacherId ?? e.teacherId), roomName(e.roomId), statusText[e.status] || "Regular"]);

  return (
    <div>
      <PageHeader title={admin ? "Timetable" : "My timetable"} subtitle={admin ? "Class, teacher, subject and room views, academic calendar, change requests and reports. Students and parents only see the published timetable." : "Your assigned periods, live sessions and any clashes. Propose a change and the timetable office will review it."}
        eyebrow={<DemoTag label="Demo timetable" />}
        actions={<><Button variant="outline" size="sm" onClick={() => setExp(true)}><Printer size={16} /> Export / print</Button>{admin && meta.data && <Badge tone={meta.data.hasDraftChanges ? "warning" : "success"}>{meta.data.hasDraftChanges ? "Draft ahead of published" : `Published v${meta.data.version}`}</Badge>}</>} />
      <div className="mb-4"><Segmented<Tab> label="Timetable sections" value={tab} onChange={setTab} options={[{ value: "timetable", label: "Timetable" }, { value: "calendar", label: "Academic calendar" }, { value: "changes", label: "Change requests" }, ...(admin ? [{ value: "reports" as Tab, label: "Reports" }] : [])]} /></div>

      {tab === "calendar" && <CalendarView />}
      {tab === "changes" && <ChangeFlow role={admin ? "institution" : "teacher"} teacherId={teacherId} by={by} />}
      {tab === "reports" && admin && <ReportsView source={source === "draft" ? "draft" : "published"} />}

      {tab === "timetable" && (
        <div className="space-y-4">
          {myConflicts.length > 0 && (
            <div role="alert" className="rounded-2xl border border-danger/40 bg-danger-soft p-4">
              <p className="flex items-center gap-2 font-semibold text-danger"><Warning size={18} weight="fill" /> {flags.includes("timetable-conflict") ? "You are double-booked" : "Timetable conflict"}</p>
              <ul className="mt-1 space-y-1 text-sm">{myConflicts.map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2"><span>{c.message}</span><Button size="sm" variant="outline" onClick={() => setPropose(c.entryIds[0])}>Propose a fix</Button></li>)}</ul>
              <p className="mt-2 text-xs text-text-2">Only the timetable office can resolve this. Your proposal shows affected classes and conflicts, and is approved before anything changes.</p>
            </div>
          )}
          {admin && meta.data?.hasDraftChanges && <div className="flex flex-wrap items-center gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning"><ArrowsClockwise size={16} /> The draft has unpublished allocation changes ({meta.data.draftConflictCount} open conflicts). Review them in the Allocation workspace, then publish.</div>}
          <div className="flex flex-wrap items-end gap-3">
            {admin ? <Segmented<Dim> label="View by" value={dim} onChange={changeDim} options={[{ value: "class", label: "Class" }, { value: "teacher", label: "Teacher" }, { value: "subject", label: "Subject" }, { value: "room", label: "Room / lab" }]} /> : <Segmented<Dim> label="View by" value={dim} onChange={changeDim} options={[{ value: "teacher", label: "My periods" }, { value: "class", label: "A class" }, { value: "subject", label: "A subject" }, { value: "room", label: "A room" }]} />}
            <div className="min-w-[180px]"><label className="sr-only" htmlFor="tt-target">Select {dim}</label><Select id="tt-target" value={target} onChange={(e) => setTarget(e.target.value)} disabled={!admin && dim === "teacher"}>{targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</Select></div>
            <Segmented<"week" | "day"> label="Range" value={view} onChange={setView} options={[{ value: "week", label: "Week" }, { value: "day", label: "Day" }]} />
            {admin && <Segmented<"published" | "draft"> label="Source" value={source} onChange={setSource} options={[{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }]} />}
            <div className="flex items-center gap-1"><Button size="iconSm" variant="outline" aria-label="Previous week" onClick={() => setWeekOff((w) => w - 1)}><CaretLeft /></Button><span className="tnum min-w-[120px] text-center text-sm font-semibold" aria-live="polite">{dateLabel(monday)} – {dateLabel(addDays(monday, 4))}</span><Button size="iconSm" variant="outline" aria-label="Next week" onClick={() => setWeekOff((w) => w + 1)}><CaretRight /></Button>{weekOff !== 0 && <Button size="sm" variant="ghost" onClick={() => setWeekOff(0)}>This week</Button>}</div>
          </div>
          {view === "day" && <Segmented<string> label="Day" value={String(day)} onChange={(v) => setDay(Number(v))} options={DAYS.map((d) => ({ value: String(d.n), label: `${d.short} ${dateLabel(addDays(monday, d.n - 1))}` }))} />}

          {ents.isLoading ? <Skeleton className="h-96 w-full" /> : ents.isError ? <ErrorState onRetry={() => ents.refetch()} /> : mine.length === 0 && slots.length === 0 ? (
            <EmptyState title="No periods in this view" body={dim === "teacher" ? "This teacher has no assigned periods in the selected timetable. Assign periods from the Allocation workspace." : "Nothing is scheduled for this selection. Try another class, teacher, subject or room."} />
          ) : view === "week" ? (
            <WeekGrid ariaLabel={`Weekly timetable by ${dim}`} headers={headers} holidayDays={holidayDays} renderCell={cell} />
          ) : (
            <Card><CardBody><ul className="divide-y divide-border">{PERIODS.map((p) => {
              const es = mine.filter((e) => e.dayOfWeek === day && e.periodId === p.id), ls = slots.filter((s) => s.day === day && s.periodId === p.id);
              if (p.kind === "break") return <li key={p.id} className="py-1.5 text-xs text-text-2">{p.label} · {p.start}–{p.end}</li>;
              return <li key={p.id} className="grid gap-2 py-2 sm:grid-cols-[110px_1fr]"><div className="text-xs"><p className="font-semibold">{p.label}</p><p className="tnum text-text-2">{p.start}–{p.end}</p></div><div className="space-y-1">{holidayDays[day] ? <p className="text-sm text-text-2">{holidayDays[day]}</p> : es.length + ls.length === 0 ? <p className="text-sm text-text-2">Free period</p> : <>{es.map((e) => <EntryChip key={e.id} entry={e} lines={lines(e)} conflicts={cmap.get(e.id)} onClick={() => setSel(e)} />)}{ls.map((s) => <LiveChip key={s.live.id} live={s.live} />)}</>}</div></li>;
            })}</ul></CardBody></Card>
          )}

          {outside.length > 0 && <Card><CardBody><h3 className="mb-2 text-sm font-semibold">Online sessions outside regular periods</h3><ul className="space-y-1 text-sm">{outside.map((s) => <li key={s.live.id} className="flex flex-wrap items-center gap-2"><Badge tone="primary">Live online</Badge>{s.live.title} · {DAYS.find((d) => d.n === s.day)?.short} {fmtTime(s.live.startAt)} IST · {s.live.durationMinutes} min</li>)}</ul></CardBody></Card>}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Periods this week" value={perWeek} hint={dim === "teacher" ? "assigned to this teacher" : "in this view"} />
            <StatTile label="Live sessions" value={slots.length} hint="merged from Live Classes" />
            <StatTile label="Substituted / cancelled" value={mine.filter((e) => e.status === "substituted" || e.status === "cancelled").length} />
            <StatTile label="Open conflicts" value={mine.filter((e) => cmap.has(e.id)).length} />
          </div>
          <p className="text-xs text-text-2">{source === "draft" && admin ? "Showing the DRAFT timetable. It is not visible to students or parents until published." : "Showing the published timetable, the same data students and parents see."} Online sessions come from the Live Classes service.</p>
        </div>
      )}

      <Drawer open={!!sel} onOpenChange={(v) => !v && setSel(null)} title="Period details">
        {sel && <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-1.5"><StatusBadge status={statusText[sel.status] || "Regular"} />{(cmap.get(sel.id) ?? []).map((c) => <ConflictBadge key={c.id} c={c} />)}</div>
          <dl className="grid grid-cols-[110px_1fr] gap-y-1.5"><dt className="text-text-2">Subject</dt><dd className="font-semibold">{subjName(sel.subjectId)}</dd><dt className="text-text-2">Class</dt><dd>{className(sel.classId)}</dd><dt className="text-text-2">Teacher</dt><dd>{tShort(sel.teacherId)}</dd>{sel.substituteTeacherId && <><dt className="text-text-2">Substitute</dt><dd>{tShort(sel.substituteTeacherId)}</dd></>}<dt className="text-text-2">When</dt><dd>{DAYS.find((d) => d.n === sel.dayOfWeek)?.label}, {PERIODS.find((p) => p.id === sel.periodId)?.label} ({PERIODS.find((p) => p.id === sel.periodId)?.start})</dd><dt className="text-text-2">Room</dt><dd>{roomName(sel.roomId)}</dd>{sel.note && <><dt className="text-text-2">Note</dt><dd>{sel.note}</dd></>}</dl>
          {(cmap.get(sel.id) ?? []).length > 0 && <ul className="space-y-1 rounded-xl bg-danger-soft p-3 text-xs text-danger">{(cmap.get(sel.id) ?? []).map((c) => <li key={c.id}>{c.message}</li>)}</ul>}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={() => { setPropose(sel.id); setSel(null); }}>Propose a change</Button>
            {admin && sel.status !== "cancelled" && <Button size="sm" variant="outline" onClick={() => { setSub(sel); setSel(null); }}>Assign substitute</Button>}
          </div>
          <p className="text-xs text-text-2">Changes go through approval, then update every timetable and notify affected classes and staff. The old schedule is kept in version history.</p>
        </div>}
      </Drawer>

      <ProposeDialog open={propose !== undefined} onOpenChange={(v) => !v && setPropose(undefined)} role={admin ? "institution" : "teacher"} teacherId={teacherId} by={by} initialEntryId={propose ?? undefined} />
      <SubstituteDialog entry={sub} open={!!sub} onOpenChange={(v) => !v && setSub(null)} by={by} />

      <Modal open={exp} onOpenChange={setExp} className="sm:max-w-2xl" title="Export and print preview" description={`${targets.find((t) => t.id === target)?.label} · ${source === "draft" && admin ? "DRAFT" : "Published"} · demo data`}
        footer={<><Button variant="outline" onClick={() => { csvDownload("timetable.csv", [["Day", "Period", "Class", "Subject", "Teacher", "Room", "Status"], ...exportRows()]); toast.success("Spreadsheet export downloaded."); }}><Export size={16} /> Download CSV</Button><Button onClick={() => { window.print(); }}><Printer size={16} /> Print</Button></>}>
        <div className="max-h-[50vh] overflow-auto rounded-xl border border-border"><table className="w-full text-xs"><thead className="bg-surface-2 text-left"><tr>{["Day", "Period", "Class", "Subject", "Teacher", "Room", "Status"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{exportRows().map((r, i) => <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className="p-2">{c}</td>)}</tr>)}</tbody></table></div>
        <p className="mt-2 text-xs text-text-2">Prepared {relTime(DEMO_NOW)} · DEMO · unofficial. PDF export is simulated by the browser print dialog.</p>
      </Modal>
    </div>
  );
}
