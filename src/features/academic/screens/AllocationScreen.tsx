"use client";
import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { UploadSimple, Sparkle, ArrowCounterClockwise, Lock } from "@phosphor-icons/react";
import { Button, Card, CardBody, PageHeader, Segmented, Select, Badge, StatTile, ErrorState, Skeleton, EmptyState, Modal, ConfirmDialog, Checkbox, DemoTag, toast } from "@/components/ui";
import type { ScreenProps } from "@/types/screens";
import type { TimetableEntry } from "@/types/academic";
import type { Conflict, Gap } from "@/types/timetable";
import { staffAllocationService as svc } from "@/lib/api/staffAllocationService";
import { timetableService } from "@/lib/api/timetableService";
import { TEACHERS, CLASSROOMS } from "@/lib/mock-data/core";
import { ROOMS } from "@/lib/mock-data/academic";
import { teacherUnavailableReason, slotKey } from "@/lib/timetable/engine";
import { WeekGrid, EntryChip, ReasonDialog, subjName, className, tShort, roomName, useInvalidateTT, DAYS, PERIODS } from "../timetable/common";
import { AssignDialog, type AssignInit } from "../timetable/AssignDialog";
import { ConflictPanel, GapList, WorkloadPanel, CoveragePanel, AuditList, PublishDialog } from "../timetable/AllocationPanels";
import { ReportsView } from "../timetable/ReportsView";

type Panel = "conflicts" | "unassigned" | "workload" | "coverage" | "history" | "reports";

export default function AllocationScreen({ role }: ScreenProps) {
  const admin = role === "institution";
  const by = "Timetable office";
  const inv = useInvalidateTT();
  const [mode, setMode] = React.useState<"class" | "teacher">("class");
  const [target, setTarget] = React.useState("cls-8b");
  const [panel, setPanel] = React.useState<Panel>("conflicts");
  const [assign, setAssign] = React.useState<AssignInit | null>(null);
  const [drop, setDrop] = React.useState<{ id: string; day: number; period: string; conflicts: Conflict[] } | null>(null);
  const [pub, setPub] = React.useState(false);
  const [sug, setSug] = React.useState(false);
  const [reset, setReset] = React.useState(false);

  const ws = useQuery({ queryKey: ["academic", "tt", "ws"], queryFn: svc.workspace, enabled: admin });
  const profiles = useQuery({ queryKey: ["academic", "tt", "profiles"], queryFn: svc.profiles, enabled: admin });
  const published = useQuery({ queryKey: ["academic", "tt", "pub"], queryFn: timetableService.all, enabled: admin });
  const cal = useQuery({ queryKey: ["academic", "tt", "calendar"], queryFn: timetableService.calendar, enabled: admin });
  const audit = useQuery({ queryKey: ["academic", "tt", "audit"], queryFn: svc.audit, enabled: admin });

  const move = useMutation({ mutationFn: (x: { id: string; day: number; period: string; reason?: string }) => svc.move(x.id, x.day, x.period, by, x.reason), onSuccess: (r) => { toast.success(r.overridden ? "Moved as a recorded override." : "Period moved in the draft."); inv(); }, onError: (e: Error) => toast.error(e.message) });

  if (!admin) return <div><PageHeader title="Staff allocation" subtitle="Allocation is managed by the timetable administrator." /><EmptyState icon={<Lock size={28} weight="duotone" />} title="Allocation workspace is for timetable administrators" body="You can see your own periods and workload under Timetable and My Workload, and propose changes from your timetable. The timetable office reviews and publishes them." /></div>;

  const data = ws.data;
  const entries = data?.entries ?? [];
  const conflicts = data?.conflicts ?? [];
  const cmap = new Map<string, Conflict[]>(); conflicts.forEach((c) => c.entryIds.forEach((id) => cmap.set(id, [...(cmap.get(id) ?? []), c])));
  const ctx = { profiles: profiles.data ?? [], requirements: [], teachers: TEACHERS, rooms: ROOMS, weekStart: cal.data?.weekStart ?? "2026-11-16" };
  const prof = (profiles.data ?? []).find((p) => p.teacherId === target);
  const slotMark = (d: number, p: string) => { if (mode !== "teacher") return null; const why = teacherUnavailableReason(ctx, target, d, p); const pref = prof?.slots.some((s) => s.kind === "preferred" && s.dayOfWeek === d && s.periodId === p); return why ? <p className="rounded bg-danger-soft px-1.5 py-0.5 text-[11px] font-medium text-danger">Unavailable: {why.replace(/^(is|has) /, "")}</p> : pref ? <p className="text-[11px] text-info">Preferred slot</p> : null; };
  const shown = entries.filter((e) => (mode === "class" ? e.classId === target : e.teacherId === target || e.substituteTeacherId === target));
  const occupied = new Set(shown.map((e) => slotKey(e.dayOfWeek, e.periodId)));
  const changed = (() => { const pm = new Map((published.data ?? []).map((e) => [e.id, JSON.stringify(e)])); const dm = new Map(entries.map((e) => [e.id, JSON.stringify(e)])); let n = 0; dm.forEach((v, k) => { if (pm.get(k) !== v) n++; }); pm.forEach((_, k) => { if (!dm.has(k)) n++; }); return n; })();
  const gaps = data?.gaps ?? [];
  const totalMissing = gaps.reduce((a, g) => a + g.missing, 0);

  const onDrop = async (day: number, period: string, dt: DataTransfer) => {
    const id = dt.getData("text/plain"); if (!id || !entries.some((e) => e.id === id)) return;
    try { const pv = await svc.previewMove(id, day, period); if (pv.requiresReason) setDrop({ id, day, period, conflicts: pv.newConflicts }); else move.mutate({ id, day, period }); } catch (e) { toast.error((e as Error).message); }
  };
  const lines = (e: TimetableEntry) => mode === "class" ? [tShort(e.substituteTeacherId ?? e.teacherId), roomName(e.roomId)] : [className(e.classId), roomName(e.roomId)];
  const gapInit = (g: Gap): AssignInit => ({ classId: g.classId, subjectId: g.subjectId, teacherId: TEACHERS.find((t) => t.subjectIds.includes(g.subjectId) && t.status === "active")?.id });
  const showConflict = (c: Conflict) => { const e = entries.find((x) => x.id === c.entryIds[0]); if (!e) return; if (mode === "class") setTarget(e.classId); else setTarget(e.teacherId); document.getElementById("alloc-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const targets = mode === "class" ? CLASSROOMS.map((c) => ({ id: c.id, label: c.name })) : TEACHERS.map((t) => ({ id: t.id, label: `${t.title} ${t.displayName}` }));
  const wl = data?.workload.find((w) => w.teacherId === target);

  return (
    <div>
      <PageHeader title="Timetable allocation" subtitle="Assign teachers, rooms and periods in a draft. Rules flag clashes deterministically; nothing reaches students or parents until you publish."
        eyebrow={<DemoTag label="Rule-based · no optimiser" />}
        actions={<><Button variant="outline" size="sm" onClick={() => setSug(true)}><Sparkle size={16} /> Suggest allocation</Button><Button variant="ghost" size="sm" onClick={() => setReset(true)} disabled={!data?.meta.hasDraftChanges}><ArrowCounterClockwise size={16} /> Discard draft changes</Button><Button size="sm" onClick={() => setPub(true)} disabled={!data}><UploadSimple size={16} /> Publish…</Button></>} />

      {ws.isError ? <ErrorState onRetry={() => ws.refetch()} /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Draft status" value={data ? (data.meta.hasDraftChanges ? "Ahead" : "In sync") : "…"} hint={data ? `Published v${data.meta.version} · ${changed} period${changed === 1 ? "" : "s"} changed` : undefined} />
            <StatTile label="Rule conflicts" value={data ? conflicts.filter((c) => c.kind !== "unfulfilled").length : "…"} hint="teacher, class, room, availability" />
            <StatTile label="Unassigned periods" value={data ? totalMissing : "…"} hint="required but missing a teacher" />
            <StatTile label="Over-limit teachers" value={data ? data.workload.filter((w) => w.pct > 100).length : "…"} hint="vs workload limit" />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Segmented<"class" | "teacher"> label="Grid by" value={mode} onChange={(m) => { setMode(m); setTarget(m === "class" ? "cls-8b" : "tch-daniel"); }} options={[{ value: "class", label: "By class" }, { value: "teacher", label: "By teacher" }]} />
            <div className="min-w-[200px]"><label className="sr-only" htmlFor="al-target">Select {mode}</label><Select id="al-target" value={target} onChange={(e) => setTarget(e.target.value)}>{targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</Select></div>
            {mode === "teacher" && wl && <Badge tone={wl.pct > 100 ? "danger" : "primary"}>{wl.periods}/{wl.limit} periods · {wl.pct}% of limit</Badge>}
          </div>

          <div id="alloc-grid" className="scroll-mt-4">
            {ws.isLoading ? <Skeleton className="h-96 w-full" /> : (
              <WeekGrid ariaLabel={`Allocation grid by ${mode}`} compact onDropCell={onDrop}
                showAssign={(d, p) => !occupied.has(slotKey(d, p))} onClickCell={(d, p) => setAssign(mode === "class" ? { classId: target, day: d, period: p } : { teacherId: target, day: d, period: p })}
                renderCell={(d, p) => <>
                  {shown.filter((e) => e.dayOfWeek === d && e.periodId === p).map((e) => (
                    <EntryChip key={e.id} entry={e} lines={lines(e)} conflicts={cmap.get(e.id)} draggable onDragStart={(ev) => { ev.dataTransfer.setData("text/plain", e.id); ev.dataTransfer.effectAllowed = "move"; }} onClick={() => setAssign({ entry: e })} />
                  ))}
                  {!occupied.has(slotKey(d, p)) && slotMark(d, p)}
                </>} />
            )}
            <p className="mt-2 text-xs text-text-2">Drag a period onto another slot to move it (occupied slots swap). Keyboard: Tab to a period, press Enter, then change Day and Period in the dialog. Conflicting moves ask for a reason that is saved in the audit history.</p>
          </div>

          <div>
            <Segmented<Panel> label="Allocation panels" value={panel} onChange={setPanel} options={[{ value: "conflicts", label: "Conflicts", count: conflicts.length }, { value: "unassigned", label: "Unassigned", count: totalMissing }, { value: "workload", label: "Workload" }, { value: "coverage", label: "Subject coverage" }, { value: "history", label: "Audit history" }, { value: "reports", label: "Reports" }]} />
            <div className="mt-4" aria-live="polite">
              {ws.isLoading ? <Skeleton className="h-40" /> : panel === "conflicts" ? <ConflictPanel conflicts={conflicts} by={by} onShow={showConflict} onAssignGap={(c) => setAssign(gapInit({ classId: c.classId!, subjectId: c.subjectId!, required: 0, assigned: 0, missing: 0 }))} />
                : panel === "unassigned" ? <GapList gaps={gaps} onAssign={(g) => setAssign(gapInit(g))} />
                : panel === "workload" ? <WorkloadPanel rows={data!.workload} onPick={(id) => { setMode("teacher"); setTarget(id); document.getElementById("alloc-grid")?.scrollIntoView({ behavior: "smooth" }); }} />
                : panel === "coverage" ? <CoveragePanel />
                : panel === "history" ? <AuditList items={audit.data ?? []} />
                : <ReportsView source="draft" />}
            </div>
          </div>
        </div>
      )}

      <AssignDialog init={assign} onClose={() => setAssign(null)} by={by} />
      <ReasonDialog open={!!drop} onOpenChange={(v) => !v && setDrop(null)} title="Move creates conflicts" description={drop ? `Moving to ${DAYS.find((d) => d.n === drop.day)?.label} ${PERIODS.find((p) => p.id === drop.period)?.label}. Record why this override is acceptable.` : undefined} conflicts={drop?.conflicts} onSubmit={(reason) => move.mutateAsync({ id: drop!.id, day: drop!.day, period: drop!.period, reason })} />
      <PublishDialog open={pub} onOpenChange={setPub} conflicts={conflicts} changed={changed} by={by} onDone={inv} />
      <SuggestDialog open={sug} onOpenChange={setSug} by={by} />
      <ConfirmDialog open={reset} onOpenChange={setReset} destructive title="Discard all draft changes?" body="The draft returns to the published timetable. This is recorded in the audit history." confirmLabel="Discard changes" onConfirm={() => svc.resetDraft(by).then(() => { toast.success("Draft reset to the published timetable."); inv(); })} />
    </div>
  );
}

function SuggestDialog({ open, onOpenChange, by }: { open: boolean; onOpenChange: (v: boolean) => void; by: string }) {
  const inv = useInvalidateTT(); const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const q = useQuery({ queryKey: ["academic", "tt", "autoalloc", open], queryFn: svc.suggestAllocation, enabled: open });
  React.useEffect(() => { if (q.data) setPicked(new Set(q.data.proposed.map((p) => p.id))); }, [q.data]);
  const m = useMutation({ mutationFn: () => svc.applyAllocation([...picked], by), onSuccess: (n) => { toast.success(`${n} suggested period${n === 1 ? "" : "s"} added to the draft. Review conflicts, then publish.`); inv(); onOpenChange(false); }, onError: (e: Error) => toast.error(e.message) });
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <Modal open={open} onOpenChange={onOpenChange} className="sm:max-w-2xl" title="Suggested allocation preview" description="Deterministic rules fill missing periods using qualified, free teachers within workload limits and free rooms. This is a preview, not an optimiser; nothing is applied until you confirm."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button><Button onClick={() => m.mutate()} loading={m.isPending} disabled={picked.size === 0}>Apply {picked.size} to draft</Button></>}>
      {q.isLoading ? <Skeleton className="h-40" /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !q.data?.proposed.length ? <EmptyState title="Nothing to suggest" body={q.data?.remaining.length ? "No conflict-free slots exist for the remaining periods. Assign them manually with an override reason." : "All required periods are already allocated."} /> : (
        <div className="space-y-3">
          <Checkbox checked={picked.size === q.data.proposed.length} onChange={(v) => setPicked(v ? new Set(q.data!.proposed.map((p) => p.id)) : new Set())} label={`Select all (${q.data.proposed.length})`} />
          <ul className="space-y-1.5">{q.data.proposed.map((p) => <li key={p.id} className="rounded-xl border border-border p-2.5"><Checkbox checked={picked.has(p.id)} onChange={() => toggle(p.id)} label={`${className(p.entry.classId)} · ${subjName(p.entry.subjectId)} · ${DAYS.find((d) => d.n === p.entry.dayOfWeek)?.short} ${PERIODS.find((x) => x.id === p.entry.periodId)?.label} · ${tShort(p.entry.teacherId)} · ${roomName(p.entry.roomId)}`} /><p className="mt-1 pl-7 text-xs text-text-2">{p.reason}</p></li>)}</ul>
          {q.data.remaining.length > 0 && <p className="rounded-xl bg-warning-soft p-3 text-xs text-warning">Still unfilled after suggestion: {q.data.remaining.map((g) => `${className(g.classId)} ${subjName(g.subjectId)} (${g.missing})`).join(", ")}.</p>}
        </div>
      )}
    </Modal>
  );
}
