"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, VideoCamera, CaretLeft, CaretRight, PlugsConnected, Info, CalendarX, ArrowsClockwise } from "@phosphor-icons/react";
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Field, Input, ListToolbar, Modal, PageHeader, Segmented, Select, SkeletonCards, StatTile, StatusBadge, toast, cn } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { useActors } from "@/stores/app-store";
import { liveClassService } from "@/lib/api/liveClassService";
import { timetableService } from "@/lib/api/timetableService";
import { PERIODS } from "@/types/academic";
import { TEACHERS, teacherName } from "@/lib/mock-data/core";
import { DEMO_NOW, TZ_LABEL, fmtDate, fmtTime } from "@/lib/format";
import type { Role, LiveClass, MeetingStatus } from "@/types";
import { ScheduleModal, KINDS, iso } from "./ScheduleForm";

const kindLabel = (k: string) => KINDS.find((x) => x.value === k)?.label ?? k;
const dayKey = (d: string | Date) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const addDays = (key: string, n: number) => { const d = new Date(`${key}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (key: string) => new Date(`${key}T00:00:00Z`).getUTCDay();
const mondayOf = (key: string) => addDays(key, -((dow(key) + 6) % 7));
const TODAY = dayKey(DEMO_NOW);
interface CalItem { key: string; day: string; start: string; end: string; title: string; sub: string; type: "live" | "period"; status: string; id?: string }

export default function LiveClassesView({ role }: { role: Role }) {
  const { teacherId } = useActors();
  const isInst = role === "institution";
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<"list" | "calendar" | "summaries" | "admin">("list");
  const [q, setQ] = React.useState(""); const [status, setStatus] = React.useState<"all" | MeetingStatus>("all"); const [kind, setKind] = React.useState("all"); const [host, setHost] = React.useState("all");
  const [sched, setSched] = React.useState(false);
  const [resched, setResched] = React.useState<LiveClass | null>(null);
  const [cancel, setCancel] = React.useState<LiveClass | null>(null);
  const [detail, setDetail] = React.useState<LiveClass | null>(null);

  const all = useQuery({ queryKey: ["live-admin", role, teacherId], queryFn: liveClassService.list });
  const mine = React.useMemo(() => (all.data ?? []).filter((c) => isInst || c.hostId === teacherId), [all.data, isInst, teacherId]);
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["live-admin"] }); qc.invalidateQueries({ queryKey: ["live-classes"] }); };
  const setSt = useMutation({ mutationFn: (v: { id: string; s: MeetingStatus }) => liveClassService.setStatus(v.id, v.s), onSuccess: () => { toast.success("Session cancelled and attendees notified"); invalidate(); }, onError: (e: Error) => toast.error(e.message) });

  const filtered = mine.filter((c) => (status === "all" || c.status === status) && (kind === "all" || c.kind === kind) && (host === "all" || c.hostId === host) && (!q.trim() || `${c.title} ${c.audienceLabel} ${c.hostName}`.toLowerCase().includes(q.toLowerCase())));
  const hasF = status !== "all" || kind !== "all" || host !== "all";
  const clear = () => { setQ(""); setStatus("all"); setKind("all"); setHost("all"); };
  const start = (c: LiveClass) => { toast.info("Opening class room"); router.push(`/teacher/live-classes/${c.id}/room`); };

  return (
    <div>
      <PageHeader title={isInst ? "Live classes administration" : "Live classes"} subtitle={isInst ? "Schedule, monitor and review live sessions across all teachers." : "Schedule and run your live sessions, office hours and meetings."}
        actions={<Button onClick={() => setSched(true)}><Plus size={16} />Schedule session</Button>} />
      <Segmented label="Live classes view" value={tab} onChange={setTab} className="mb-4" options={[{ value: "list", label: "Schedule", count: mine.filter((c) => c.status === "Scheduled" || c.status === "Live").length }, { value: "calendar", label: "Calendar" }, { value: "summaries", label: "Post-class summaries" }, ...(isInst ? [{ value: "admin" as const, label: "Usage & administration" }] : [])]} />
      {all.isLoading ? <SkeletonCards n={4} h="h-20" /> : all.isError ? <ErrorState onRetry={() => all.refetch()} /> : (
        <>
          {tab === "list" && (
            <>
              <ListToolbar query={q} onQuery={setQ} placeholder="Search sessions" count={filtered.length} onClear={clear} hasFilters={hasF}>
                <Select aria-label="Status" className="w-36" value={status} onChange={(e) => setStatus(e.target.value as "all")}><option value="all">All statuses</option>{["Scheduled", "Live", "Completed", "Cancelled"].map((s) => <option key={s}>{s}</option>)}</Select>
                <Select aria-label="Session type" className="w-44" value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">All types</option>{KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select>
                {isInst && <Select aria-label="Host" className="w-44" value={host} onChange={(e) => setHost(e.target.value)}><option value="all">All hosts</option>{TEACHERS.map((t) => <option key={t.id} value={t.id}>{teacherName(t.id)}</option>)}</Select>}
              </ListToolbar>
              {!mine.length ? <EmptyState icon={<VideoCamera size={28} weight="duotone" />} title="No sessions yet" body="Schedule a class, office hour or meeting. Invitees are notified automatically." action={{ label: "Schedule session", onClick: () => setSched(true) }} />
                : !filtered.length ? <EmptyState title="No sessions match" body="Adjust or clear the filters." action={{ label: "Clear filters", onClick: clear }} /> : (
                  <ul className="space-y-2">{filtered.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                      <div className="w-24 shrink-0 text-center"><p className="text-xs font-semibold text-text-2">{fmtDate(c.startAt, { weekday: "short", day: "numeric", month: "short" })}</p><p className="tnum text-lg font-bold">{fmtTime(c.startAt)}</p><p className="tnum text-xs text-text-2">{c.durationMinutes} min</p></div>
                      <div className="min-w-0 flex-1"><button onClick={() => setDetail(c)} className="text-left font-semibold hover:underline">{c.title}</button>
                        <p className="text-xs text-text-2">{kindLabel(c.kind)} · {c.audienceLabel}{isInst && ` · ${c.hostName}`}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5"><StatusBadge status={c.status} /><Badge>{c.waitingRoom ? "Waiting room" : "Open join"}</Badge><Badge tone={c.recordingPolicy === "off" ? "neutral" : "warning"}>{c.recordingPolicy === "off" ? "Not recorded" : "Recording with consent"}</Badge></div></div>
                      <div className="flex flex-wrap gap-2">
                        {(c.status === "Scheduled" || c.status === "Live") && <Button size="sm" onClick={() => start(c)}><VideoCamera size={15} />{c.status === "Live" ? "Rejoin" : "Start class"}</Button>}
                        {c.status === "Scheduled" && <><Button size="sm" variant="outline" onClick={() => setResched(c)}><ArrowsClockwise size={15} />Reschedule</Button><Button size="sm" variant="ghost" onClick={() => setCancel(c)}><CalendarX size={15} />Cancel</Button></>}
                        {c.status === "Completed" && <Button size="sm" variant="outline" onClick={() => setTab("summaries")}>Summary</Button>}
                      </div></li>))}</ul>)}
            </>
          )}
          {tab === "calendar" && <CalendarTab sessions={mine} teacherId={teacherId} isInst={isInst} onOpen={setDetail} />}
          {tab === "summaries" && <Summaries sessions={mine.filter((c) => c.status === "Completed")} isInst={isInst} />}
          {tab === "admin" && isInst && <Admin sessions={mine} />}
        </>
      )}
      <p className="mt-6 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-xs text-text-2"><PlugsConnected size={16} className="mt-0.5 shrink-0" />Conferencing is provider-agnostic. This prototype uses a simulated room; a real provider (video connector) would plug in behind <code>liveClassService</code> without changing these screens.</p>
      <ScheduleModal open={sched} onOpenChange={setSched} role={role} teacherId={teacherId} />
      {resched && <Reschedule c={resched} onClose={() => setResched(null)} onDone={invalidate} />}
      <ConfirmDialog open={!!cancel} onOpenChange={(v) => !v && setCancel(null)} title="Cancel this session?" body={cancel ? `“${cancel.title}” on ${fmtDate(cancel.startAt)} at ${fmtTime(cancel.startAt)} will be cancelled and invitees notified.` : ""} confirmLabel="Cancel session" destructive onConfirm={() => cancel && setSt.mutate({ id: cancel.id, s: "Cancelled" })} />
      <Modal open={!!detail} onOpenChange={(v) => !v && setDetail(null)} title={detail?.title ?? ""} description={detail ? `${kindLabel(detail.kind)} · ${detail.hostName}` : undefined}>
        {detail && <dl className="space-y-2 text-sm"><Row k="When" v={`${fmtDate(detail.startAt)}, ${fmtTime(detail.startAt)} · ${detail.durationMinutes} min · ${TZ_LABEL}`} /><Row k="Audience" v={detail.audienceLabel} /><Row k="Status" v={detail.status} /><Row k="Agenda" v={detail.agenda} /><Row k="Waiting room" v={detail.waitingRoom ? "On" : "Off"} /><Row k="Recording" v={detail.recordingPolicy === "off" ? "Off" : "On, with consent policy"} /><Row k="Invited" v={`${detail.participants.length} participants`} /></dl>}
      </Modal>
    </div>
  );
}
const Row = ({ k, v }: { k: string; v: string }) => <div className="grid grid-cols-[110px_1fr] gap-2"><dt className="text-text-2">{k}</dt><dd className="font-medium">{v}</dd></div>;

function Reschedule({ c, onClose, onDone }: { c: LiveClass; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = React.useState(dayKey(c.startAt)); const [time, setTime] = React.useState(new Date(c.startAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }));
  const [confirm, setConfirm] = React.useState(false); const [err, setErr] = React.useState("");
  const m = useMutation({ mutationFn: () => liveClassService.reschedule(c.id, iso(date, time)), onSuccess: () => { toast.success("Rescheduled. Invitees have been notified."); onDone(); onClose(); }, onError: (e: Error) => setErr(e.message) });
  const check = () => { if (!date || !time) return setErr("Pick a date and time."); if (new Date(iso(date, time)).getTime() <= DEMO_NOW.getTime()) return setErr("Choose a future time."); setErr(""); setConfirm(true); };
  return (
    <>
      <Modal open onOpenChange={(v) => !v && onClose()} title="Reschedule session" description={`${c.title} · times in ${TZ_LABEL}`} footer={<><Button variant="ghost" onClick={onClose}>Keep current time</Button><Button onClick={check}>Review change</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="New date" htmlFor="rd"><Input id="rd" type="date" min={TODAY} value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="New start time" htmlFor="rt"><Input id="rt" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field></div>
        {err && <p role="alert" className="mt-2 text-sm font-medium text-danger">{err}</p>}
      </Modal>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Confirm reschedule" body={`Move to ${fmtDate(iso(date, time))} at ${time}. Students and parents are notified.`} confirmLabel="Reschedule" onConfirm={() => m.mutate()} />
    </>
  );
}

function CalendarTab({ sessions, teacherId, isInst, onOpen }: { sessions: LiveClass[]; teacherId: string; isInst: boolean; onOpen: (c: LiveClass) => void }) {
  const [view, setView] = React.useState<"day" | "week" | "month">("week"); const [anchor, setAnchor] = React.useState(TODAY);
  const [src, setSrc] = React.useState(isInst ? "none" : teacherId);
  const tt = useQuery({ queryKey: ["live-admin", "periods"], queryFn: timetableService.all });
  const itemsFor = React.useCallback((day: string): CalItem[] => {
    const live: CalItem[] = sessions.filter((c) => dayKey(c.startAt) === day).map((c) => ({ key: c.id, day, start: new Date(c.startAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }), end: "", title: c.title, sub: `${kindLabel(c.kind)} · ${c.audienceLabel}`, type: "live", status: c.status, id: c.id }));
    const d = dow(day); const per: CalItem[] = src === "none" || d < 1 || d > 5 ? [] : (tt.data ?? []).filter((e) => e.dayOfWeek === d && e.status !== "cancelled" && (src === "all" || e.teacherId === src || e.substituteTeacherId === src)).map((e) => { const p = PERIODS.find((x) => x.id === e.periodId)!; return { key: e.id, day, start: p.start, end: p.end, title: p.label, sub: `${e.classId.replace("cls-", "").toUpperCase()} · ${e.subjectId.replace("sub-", "")}`, type: "period" as const, status: e.status }; });
    return [...live, ...per].sort((a, b) => a.start.localeCompare(b.start));
  }, [sessions, tt.data, src]);
  const step = view === "month" ? 30 : view === "week" ? 7 : 1;
  const days = view === "day" ? [anchor] : view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(mondayOf(anchor), i)) : (() => { const first = `${anchor.slice(0, 7)}-01`; const s = mondayOf(first); return Array.from({ length: 42 }, (_, i) => addDays(s, i)); })();
  const move = (n: number) => { if (view === "month") { const d = new Date(`${anchor}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); setAnchor(d.toISOString().slice(0, 10)); } else setAnchor(addDays(anchor, n * step)); };
  const Chip = ({ it }: { it: CalItem }) => {
    const s = sessions.find((c) => c.id === it.id);
    const cls = cn("block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px]", it.type === "live" ? "bg-primary text-primary-fg font-semibold" : "bg-surface-2 text-text-2");
    return s ? <button className={cls} onClick={() => onOpen(s)} title={`${it.start} ${it.title}`}>{it.start} {it.title}</button> : <span className={cls} title={`${it.start}-${it.end} ${it.title} ${it.sub}`}>{it.start} P: {it.sub}</span>;
  };
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="iconSm" aria-label="Previous" onClick={() => move(-1)}><CaretLeft size={16} /></Button>
        <Button variant="outline" size="sm" onClick={() => setAnchor(TODAY)}>Today</Button>
        <Button variant="outline" size="iconSm" aria-label="Next" onClick={() => move(1)}><CaretRight size={16} /></Button>
        <span className="text-sm font-semibold" aria-live="polite">{view === "month" ? fmtDate(anchor, { month: "long", year: "numeric" }) : view === "day" ? fmtDate(anchor, { weekday: "long", day: "numeric", month: "short", year: "numeric" }) : `Week of ${fmtDate(days[0], { day: "numeric", month: "short" })}`}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select aria-label="Show timetable periods for" className="w-48" value={src} onChange={(e) => setSrc(e.target.value)}><option value="none">Live sessions only</option>{isInst && <option value="all">All timetable periods</option>}{(isInst ? TEACHERS : TEACHERS.filter((t) => t.id === teacherId)).map((t) => <option key={t.id} value={t.id}>Periods: {teacherName(t.id)}</option>)}</Select>
          <Segmented label="Calendar range" value={view} onChange={setView} options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]} />
        </div>
      </div>
      <p className="mb-2 flex items-center gap-1.5 text-xs text-text-2"><Info size={13} />Solid chips are live sessions; grey chips (P:) are timetable periods.</p>
      {view === "day" ? (
        <ul className="space-y-1.5 rounded-2xl border border-border bg-surface p-3">{itemsFor(anchor).map((it) => <li key={it.key} className="flex gap-3 text-sm"><span className="tnum w-24 text-text-2">{it.start}{it.end && `–${it.end}`}</span><div className="flex-1"><Chip it={it} /><span className="text-xs text-text-2">{it.sub} · {it.status}</span></div></li>)}{!itemsFor(anchor).length && <li className="py-6 text-center text-sm text-text-2">Nothing scheduled this day.</li>}</ul>
      ) : (
        <div className="overflow-x-auto"><div className={cn("grid gap-px rounded-2xl border border-border bg-border text-xs", view === "week" ? "min-w-[760px] grid-cols-7" : "min-w-[640px] grid-cols-7")}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="bg-surface-2 p-1.5 text-center font-semibold text-text-2">{d}</div>)}
          {days.map((d) => { const its = itemsFor(d); const out = view === "month" && d.slice(0, 7) !== anchor.slice(0, 7); return (
            <div key={d} className={cn("min-h-24 space-y-1 bg-surface p-1.5", out && "opacity-50", d === TODAY && "ring-2 ring-inset ring-primary")}>
              <button onClick={() => { setAnchor(d); setView("day"); }} className="tnum font-semibold hover:underline" aria-label={`Open ${fmtDate(d)}`}>{Number(d.slice(8))}</button>
              {its.slice(0, view === "month" ? 3 : 12).map((it) => <Chip key={it.key} it={it} />)}{view === "month" && its.length > 3 && <p className="text-[10px] text-text-2">+{its.length - 3} more</p>}
            </div>); })}
        </div></div>
      )}
    </div>
  );
}

function Summaries({ sessions, isInst }: { sessions: LiveClass[]; isInst: boolean }) {
  if (!sessions.length) return <EmptyState title="No completed sessions yet" body="After a session ends, its attendance, duration and resources appear here." />;
  return (
    <ul className="grid gap-3 md:grid-cols-2">{sessions.map((c) => { const joined = c.participants.filter((p) => p.role === "student"); const avg = joined.length ? Math.round(joined.reduce((a, p) => a + (p.durationMin ?? 0), 0) / joined.length) : 0;
      return <li key={c.id} className="rounded-2xl border border-border bg-surface p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold">{c.title}</h3><p className="text-xs text-text-2">{fmtDate(c.startAt)} · {c.audienceLabel}{isInst && ` · ${c.hostName}`}</p></div><StatusBadge status="Completed" /></div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-surface-2 p-2"><dd className="tnum text-lg font-bold">{joined.length}</dd><dt className="text-[11px] text-text-2">Students attended</dt></div><div className="rounded-xl bg-surface-2 p-2"><dd className="tnum text-lg font-bold">{c.durationMinutes}</dd><dt className="text-[11px] text-text-2">Minutes planned</dt></div><div className="rounded-xl bg-surface-2 p-2"><dd className="tnum text-lg font-bold">{avg}</dd><dt className="text-[11px] text-text-2">Avg minutes present</dt></div></dl>
        <p className="mt-3 text-sm"><span className="font-semibold">Resources:</span> {c.resources.length ? c.resources.map((r) => r.name).join(", ") : "None attached"}</p>
        <p className="mt-1 text-sm text-text-2">{c.recordingLink ? "Recording available." : "Recording: none. This session was not recorded (placeholder)."}</p></li>; })}</ul>
  );
}

function Admin({ sessions }: { sessions: LiveClass[] }) {
  const total = sessions.length; const by = (s: MeetingStatus) => sessions.filter((c) => c.status === s).length;
  const perHost = TEACHERS.map((t) => ({ label: t.displayName.split(" ")[0], value: sessions.filter((c) => c.hostId === t.id).length }));
  const hours = Math.round(sessions.filter((c) => c.status === "Completed").reduce((a, c) => a + c.durationMinutes, 0) / 6) / 10;
  const byKind = KINDS.map((k) => ({ label: k.label.split(" ")[0], value: sessions.filter((c) => c.kind === k.value).length }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatTile label="Total sessions" value={total} /><StatTile label="Scheduled / live" value={by("Scheduled") + by("Live")} /><StatTile label="Completed teaching hours" value={hours} /><StatTile label="Cancelled" value={by("Cancelled")} hint="Cancellations are notified" /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4"><h3 className="mb-2 font-semibold">Sessions by host</h3><BarChart horizontal ariaLabel="Sessions by host" data={perHost} /></div>
        <div className="rounded-2xl border border-border bg-surface p-4"><h3 className="mb-2 font-semibold">Sessions by type</h3><BarChart horizontal ariaLabel="Sessions by type" data={byKind} /></div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4 text-sm"><h3 className="mb-1 font-semibold">Policy overview</h3><ul className="list-disc space-y-1 pl-5 text-text-2"><li>Recording is off by default; turning it on requires a visible consent confirmation.</li><li>{sessions.filter((c) => c.recordingPolicy !== "off").length} session(s) currently have recording enabled.</li><li>{sessions.filter((c) => !c.waitingRoom).length} session(s) allow open joining without a waiting room.</li></ul></div>
    </div>
  );
}
