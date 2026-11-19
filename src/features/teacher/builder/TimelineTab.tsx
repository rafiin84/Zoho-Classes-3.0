"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Flag, CalendarCheck, Target } from "@phosphor-icons/react";
import { Card, CardBody, Field, Input, Badge, Progress, EmptyState, Skeleton } from "@/components/ui";
import { courseService } from "@/lib/api";
import { rosterStudents, nameOf } from "@/lib/api/teacherInsightService";
import { DEMO_NOW, fmtDate } from "@/lib/format";
import { getExtras, isHidden, isGraded, isCheckpoint, type Outline } from "./model";

const DAY = 864e5;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function TimelineTab({ courseId, outline, onDirty }: { courseId: string; outline: Outline; onDirty: () => void }) {
  const ex = getExtras(courseId);
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  if (!ex.start) ex.start = iso(new Date(DEMO_NOW.getTime() - 14 * DAY));
  if (!ex.end) ex.end = iso(new Date(DEMO_NOW.getTime() + 28 * DAY));
  const set = (fn: () => void) => { fn(); onDirty(); force(); };
  const start = new Date(ex.start), end = new Date(ex.end);
  const invalid = end <= start;
  const weeks = invalid ? 0 : Math.min(26, Math.ceil((end.getTime() - start.getTime()) / (7 * DAY)));
  const visibleMods = outline;
  const weekOf = (d: Date) => Math.max(0, Math.min(weeks - 1, Math.floor((d.getTime() - start.getTime()) / (7 * DAY))));
  const modWeek = (mi: number) => { const r = ex.releases[outline[mi].id]; return r ? weekOf(new Date(r)) : Math.min(weeks - 1, Math.floor((mi / Math.max(1, outline.length)) * weeks)); };
  const gradedItems = outline.flatMap((m) => m.activities.filter((a) => isGraded(a) && !isHidden(a)).map((a) => ({ a, m })));
  const students = rosterStudents("cls-8b").filter((s) => !s.synthetic);
  const progress = useQuery({ queryKey: ["t", "tl-progress", courseId, students.map((s) => s.id).join()], queryFn: () => Promise.all(students.map(async (s) => ({ s, c: await courseService.get(courseId, s.id) }))), enabled: !invalid });
  const elapsed = invalid ? 0 : Math.max(0, Math.min(1, (DEMO_NOW.getTime() - start.getTime()) / (end.getTime() - start.getTime())));

  return (
    <div className="space-y-4">
      <Card><CardBody className="grid gap-3 sm:grid-cols-2">
        <Field label="Course start" required htmlFor="tl-start"><Input id="tl-start" type="date" value={ex.start} onChange={(e) => set(() => (ex.start = e.target.value))} /></Field>
        <Field label="Course end" required htmlFor="tl-end" error={invalid ? "End date must be after the start date" : undefined}><Input id="tl-end" type="date" aria-invalid={invalid} value={ex.end} onChange={(e) => set(() => (ex.end = e.target.value))} /></Field>
      </CardBody></Card>
      {invalid ? <EmptyState title="Fix the dates to see the timeline" body="Choose an end date after the start date." /> : !outline.length ? <EmptyState title="No modules to schedule" body="Add modules in the Outline tab first." /> : (
        <>
          <Card><CardBody><h2 className="mb-1 text-sm font-bold">Release dates by module</h2><p className="mb-3 text-xs text-text-2">Optional. Without a date, modules are spread evenly across the weeks.</p>
            <ul className="space-y-2">{outline.map((m, mi) => <li key={m.id} className="flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{m.title}</span><label className="sr-only" htmlFor={`rel-${m.id}`}>Release date for {m.title}</label><Input id={`rel-${m.id}`} type="date" className="!w-44" value={ex.releases[m.id] ?? ""} min={ex.start} max={ex.end} onChange={(e) => set(() => { if (e.target.value) ex.releases[m.id] = e.target.value; else delete ex.releases[m.id]; })} /><Badge>Week {modWeek(mi) + 1}</Badge></li>)}</ul></CardBody></Card>
          {gradedItems.length > 0 && <Card><CardBody><h2 className="mb-3 text-sm font-bold">Due dates for assessed work</h2><ul className="space-y-2">{gradedItems.map(({ a }) => <li key={a.id} className="flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{a.title}</span><label className="sr-only" htmlFor={`due-${a.id}`}>Due date for {a.title}</label><Input id={`due-${a.id}`} type="date" className="!w-44" value={ex.dues[a.id] ?? ""} min={ex.start} max={ex.end} onChange={(e) => set(() => { if (e.target.value) ex.dues[a.id] = e.target.value; else delete ex.dues[a.id]; })} />{ex.dues[a.id] && new Date(ex.dues[a.id]) < DEMO_NOW && <Badge tone="danger">Past due</Badge>}</li>)}</ul></CardBody></Card>}
          <Card><CardBody>
            <h2 className="mb-3 text-sm font-bold">Weekly milestones</h2>
            <ol className="space-y-2">
              {Array.from({ length: weeks }).map((_, w) => {
                const ws = new Date(start.getTime() + w * 7 * DAY); const we = new Date(ws.getTime() + 6 * DAY); const current = DEMO_NOW >= ws && DEMO_NOW <= new Date(we.getTime() + DAY);
                const mods = visibleMods.filter((_, mi) => modWeek(mi) === w); const dues = gradedItems.filter(({ a }) => ex.dues[a.id] && weekOf(new Date(ex.dues[a.id])) === w);
                const cps = mods.flatMap((m) => m.activities.filter((a) => isCheckpoint(a) && !isHidden(a)));
                return <li key={w} className={`rounded-xl border p-3 text-sm ${current ? "border-primary bg-lilac/40" : "border-border"}`}>
                  <div className="flex flex-wrap items-center gap-2"><span className="font-bold">Week {w + 1}</span><span className="text-xs text-text-2">{fmtDate(ws, { day: "numeric", month: "short" })} – {fmtDate(we, { day: "numeric", month: "short" })}</span>{current && <Badge tone="primary">This week</Badge>}{w === weeks - 1 && <Badge tone="highlight" icon={<Flag size={12} />}>Course ends</Badge>}</div>
                  <ul className="mt-1 space-y-0.5 text-xs text-text-2">{mods.map((m) => <li key={m.id} className="flex items-center gap-1.5"><CalendarCheck size={12} />Release: {m.title}</li>)}{dues.map(({ a }) => <li key={a.id} className="flex items-center gap-1.5"><Target size={12} />Due {fmtDate(ex.dues[a.id], { day: "numeric", month: "short" })}: {a.title}</li>)}{cps.map((a) => <li key={a.id} className="flex items-center gap-1.5"><Flag size={12} />Checkpoint: {a.title}</li>)}{!mods.length && !dues.length && <li>No releases or due dates this week.</li>}</ul>
                </li>;
              })}
            </ol>
          </CardBody></Card>
          <Card><CardBody>
            <h2 className="mb-1 text-sm font-bold">Student progress vs schedule</h2><p className="mb-3 text-xs text-text-2">{Math.round(elapsed * 100)}% of the course period has elapsed. At risk = more than 20 points behind the expected pace.</p>
            {progress.isLoading ? <Skeleton className="h-24" /> : progress.isError ? <p role="alert" className="text-sm text-danger">Couldn't load student progress.</p> : (
              <ul className="space-y-2">{progress.data?.map(({ s, c }) => { const exp = Math.round(elapsed * 100); const late = DEMO_NOW > end && c.progressPct < 100; const risk = !late && c.progressPct < exp - 20; return <li key={s.id} className="flex flex-wrap items-center gap-3 text-sm"><span className="w-36 truncate font-medium">{nameOf(s.id)}</span><div className="min-w-24 flex-1"><Progress value={c.progressPct} size="sm" tone={late ? "danger" : risk ? "warning" : "success"} label={`${nameOf(s.id)} progress`} /></div><span className="tnum w-24 text-right text-xs text-text-2">{c.progressPct}% (expected {exp}%)</span><Badge tone={late ? "danger" : risk ? "warning" : "success"}>{late ? "Overdue" : risk ? "At risk" : c.progressPct === 0 && exp > 0 ? "Not started" : "On track"}</Badge></li>; })}</ul>
            )}
          </CardBody></Card>
        </>
      )}
    </div>
  );
}
