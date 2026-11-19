"use client";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Warning, Prohibit, ArrowsLeftRight, VideoCamera } from "@phosphor-icons/react";
import { Button, Field, Modal, Textarea, Badge, cn } from "@/components/ui";
import { PERIODS, DAYS } from "@/types/academic";
import type { TimetableEntry } from "@/types/academic";
import type { Conflict } from "@/types/timetable";
import { TEACHERS, SUBJECTS } from "@/lib/mock-data/core";
import { ROOMS } from "@/lib/mock-data/academic";
import { CLASSROOMS } from "@/lib/mock-data/core";
import type { LiveClass } from "@/types";

export const teacherById = (id?: string) => TEACHERS.find((t) => t.id === id);
export const tShort = (id?: string) => (id ? teacherById(id)?.displayName ?? id : "Unassigned");
export const subjName = (id: string) => SUBJECTS.find((s) => s.id === id)?.name ?? id;
export const subjColor = (id: string) => SUBJECTS.find((s) => s.id === id)?.color ?? "#5146E5";
export const className = (id: string) => CLASSROOMS.find((c) => c.id === id)?.name ?? id;
export const roomName = (id: string) => ROOMS.find((r) => r.id === id)?.name ?? id;

export const useInvalidateTT = () => { const qc = useQueryClient(); return () => { qc.invalidateQueries({ queryKey: ["academic", "tt"] }); qc.invalidateQueries({ queryKey: ["timetable"] }); }; };

/** IST date parts for a timestamp (no external libs). */
export function istParts(iso: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" }).formatToParts(new Date(iso));
  const g = (t: string) => f.find((x) => x.type === t)?.value ?? "";
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(g("weekday")) + 1;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, day: wd, hhmm: `${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}` };
}
export const periodAt = (hhmm: string) => PERIODS.find((p) => p.kind === "teaching" && hhmm >= p.start && hhmm < p.end)?.id ?? null;
export const addDays = (date: string, n: number) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const dateLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export type LiveSlot = { live: LiveClass; day: number; periodId: string | null; date: string };
export function liveSlots(list: LiveClass[], weekStart: string): LiveSlot[] {
  const end = addDays(weekStart, 4);
  return list.filter((l) => l.status !== "Cancelled").map((l) => { const p = istParts(l.startAt); return { live: l, day: p.day, periodId: periodAt(p.hhmm), date: p.date }; }).filter((s) => s.date >= weekStart && s.date <= end);
}

const statusStyle: Record<TimetableEntry["status"], string> = {
  regular: "", cancelled: "opacity-70 line-through decoration-danger", substituted: "ring-1 ring-warning/60", special: "ring-1 ring-info/60", "live-online": "ring-1 ring-primary/60",
};
export const statusText: Record<TimetableEntry["status"], string> = { regular: "", cancelled: "Cancelled", substituted: "Substitute", special: "Special session", "live-online": "Live online" };

export function EntryChip({ entry, lines, conflicts, draggable, onDragStart, onClick, selected, showSubject = true }: { entry: TimetableEntry; lines: string[]; conflicts?: Conflict[]; draggable?: boolean; onDragStart?: (e: React.DragEvent) => void; onClick?: () => void; selected?: boolean; showSubject?: boolean }) {
  const bad = conflicts?.some((c) => c.severity === "error");
  return (
    <button type="button" draggable={draggable} onDragStart={onDragStart} onClick={onClick} disabled={!onClick}
      aria-label={`${subjName(entry.subjectId)}, ${lines.join(", ")}${statusText[entry.status] ? `, ${statusText[entry.status]}` : ""}${conflicts?.length ? `, ${conflicts.length} conflict${conflicts.length > 1 ? "s" : ""}` : ""}`}
      className={cn("relative block w-full rounded-lg border-l-4 bg-surface-2 px-2 py-1.5 text-left text-xs leading-snug", onClick && "hover:bg-lilac focus-visible:outline-2", draggable && "cursor-grab active:cursor-grabbing", statusStyle[entry.status], bad && "outline outline-2 outline-danger", selected && "bg-lilac")}
      style={{ borderLeftColor: subjColor(entry.subjectId) }}>
      {showSubject && <span className="block truncate font-semibold">{subjName(entry.subjectId)}</span>}
      {lines.map((l, i) => <span key={i} className="block truncate text-text-2">{l}</span>)}
      {(statusText[entry.status] || conflicts?.length) ? <span className="mt-0.5 flex flex-wrap items-center gap-1">
        {statusText[entry.status] && <span className="inline-flex items-center gap-0.5 font-semibold text-warning">{entry.status === "cancelled" ? <Prohibit size={11} /> : <ArrowsLeftRight size={11} />}{statusText[entry.status]}</span>}
        {conflicts?.length ? <span className="inline-flex items-center gap-0.5 font-bold text-danger"><Warning size={11} weight="fill" />Conflict</span> : null}
      </span> : null}
    </button>
  );
}
export function LiveChip({ live, onClick }: { live: LiveClass; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block w-full rounded-lg border border-dashed border-primary/60 bg-lilac px-2 py-1.5 text-left text-xs leading-snug hover:bg-lavender/30">
      <span className="flex items-center gap-1 font-semibold text-primary"><VideoCamera size={12} weight="fill" /> Live online</span>
      <span className="block truncate">{live.title}</span>
    </button>
  );
}

/** Weekly grid: periods as rows, working days as columns. Breaks render as thin separator rows. */
export function WeekGrid({ renderCell, headers, ariaLabel, onDropCell, onClickCell, showAssign, compact, holidayDays }: {
  renderCell: (day: number, periodId: string) => React.ReactNode; headers?: Record<number, string>; ariaLabel: string;
  onDropCell?: (day: number, periodId: string, dt: DataTransfer) => void; onClickCell?: (day: number, periodId: string) => void; showAssign?: (day: number, periodId: string) => boolean; compact?: boolean; holidayDays?: Record<number, string>;
}) {
  const [over, setOver] = React.useState<string | null>(null);
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[720px] border-collapse text-sm" aria-label={ariaLabel}>
        <thead>
          <tr className="bg-surface-2 text-xs text-text-2">
            <th className="w-24 p-2 text-left font-semibold">Period</th>
            {DAYS.map((d) => <th key={d.n} scope="col" className="p-2 text-left font-semibold">{d.short}{headers?.[d.n] && <span className="ml-1 font-normal">{headers[d.n]}</span>}{holidayDays?.[d.n] && <Badge tone="highlight" className="ml-1">Holiday</Badge>}</th>)}
          </tr>
        </thead>
        <tbody>
          {PERIODS.map((p) => p.kind === "break" ? (
            <tr key={p.id}><td colSpan={6} className="bg-surface-2/60 px-2 py-0.5 text-[11px] text-text-2">{p.label} · {p.start}–{p.end}</td></tr>
          ) : (
            <tr key={p.id} className="border-t border-border align-top">
              <th scope="row" className="p-2 text-left text-xs font-semibold"><span className="block">{p.label}</span><span className="tnum font-normal text-text-2">{p.start}–{p.end}</span></th>
              {DAYS.map((d) => {
                const k = `${d.n}|${p.id}`; const hol = holidayDays?.[d.n];
                return (
                  <td key={k} className={cn("border-l border-border p-1", compact ? "min-w-[112px]" : "min-w-[132px]", over === k && "bg-lilac", hol && "bg-surface-2/70")}
                    onDragOver={onDropCell ? (e) => { e.preventDefault(); setOver(k); } : undefined} onDragLeave={onDropCell ? () => setOver((o) => (o === k ? null : o)) : undefined}
                    onDrop={onDropCell ? (e) => { e.preventDefault(); setOver(null); onDropCell(d.n, p.id, e.dataTransfer); } : undefined}>
                    <div className="min-h-[52px] space-y-1">
                      {renderCell(d.n, p.id)}
                      {onClickCell && (showAssign?.(d.n, p.id) ?? true) && <button type="button" onClick={() => onClickCell(d.n, p.id)} aria-label={`Assign ${d.label} ${p.label}`} className="w-full rounded-md border border-dashed border-border py-0.5 text-[11px] text-text-2 hover:border-primary hover:text-primary focus-visible:outline-2">+ Assign</button>}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const reasonSchema = z.object({ reason: z.string().trim().min(8, "Give a reason of at least 8 characters.").max(300) });
/** Dialog asking for a mandatory override / change reason. */
export function ReasonDialog({ open, onOpenChange, title, description, conflicts, confirmLabel = "Confirm override", onSubmit }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: string; conflicts?: Conflict[]; confirmLabel?: string; onSubmit: (reason: string) => Promise<unknown> | unknown }) {
  const f = useForm<{ reason: string }>({ resolver: zodResolver(reasonSchema), defaultValues: { reason: "" } });
  React.useEffect(() => { if (open) f.reset({ reason: "" }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <form onSubmit={f.handleSubmit(async (v) => { await onSubmit(v.reason); onOpenChange(false); })} className="space-y-3">
        {conflicts && conflicts.length > 0 && <ul className="space-y-1 rounded-xl bg-danger-soft p-3 text-xs text-danger" aria-label="Conflicts this change creates">{conflicts.map((c) => <li key={c.id} className="flex gap-1.5"><Warning size={14} weight="fill" className="mt-px shrink-0" />{c.message}</li>)}</ul>}
        <Field label="Reason (recorded in the audit history)" htmlFor="ovr-reason" error={f.formState.errors.reason?.message} required>
          <Textarea id="ovr-reason" {...f.register("reason")} aria-invalid={!!f.formState.errors.reason} placeholder="e.g. Lab slot is the only one free this week; Mr. Okafor agreed to travel between campuses." />
        </Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" variant="danger" loading={f.formState.isSubmitting}>{confirmLabel}</Button></div>
      </form>
    </Modal>
  );
}

export function ConflictBadge({ c }: { c: Conflict }) {
  const label: Record<Conflict["kind"], string> = { "teacher-double": "Teacher double-booked", "class-double": "Class double-booked", "room-double": "Room double-booked", "teacher-unavailable": "Teacher unavailable", qualification: "Qualification mismatch", workload: "Over workload limit", unfulfilled: "Periods unfulfilled" };
  return <Badge tone={c.severity === "error" ? "danger" : "warning"} icon={<Warning size={12} weight="fill" />}>{label[c.kind]}</Badge>;
}
export const csvDownload = (name: string, rows: string[][]) => {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
};
export { DAYS, PERIODS };
