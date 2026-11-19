"use client";
import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lightbulb, Warning, CheckCircle } from "@phosphor-icons/react";
import { Button, Card, CardBody, Badge, Checkbox, Field, Modal, Progress, Skeleton, Textarea, toast, EmptyState, ErrorState } from "@/components/ui";
import type { Conflict, Suggestion, TeacherWorkload, Gap, AllocationAudit } from "@/types/timetable";
import { timetableService } from "@/lib/api/timetableService";
import { staffAllocationService as svc } from "@/lib/api/staffAllocationService";
import { relTime } from "@/lib/format";
import { useInvalidateTT, ReasonDialog, ConflictBadge, tShort, subjName, className } from "./common";
import { BarChart } from "@/components/charts";

export function SuggestionList({ entryId, by, onApplied }: { entryId: string; by: string; onApplied?: () => void }) {
  const inv = useInvalidateTT(); const [pending, setPending] = React.useState<Suggestion | null>(null);
  const q = useQuery({ queryKey: ["academic", "tt", "sugg", entryId], queryFn: () => svc.suggestionsFor(entryId) });
  const apply = useMutation({ mutationFn: (x: { s: Suggestion; reason?: string }) => svc.applySuggestion(x.s, by, x.reason), onSuccess: () => { toast.success("Suggestion applied to the draft."); inv(); onApplied?.(); }, onError: (e: Error, x) => { if (/reason is required/i.test(e.message)) setPending(x.s); else toast.error(e.message); } });
  if (q.isLoading) return <Skeleton className="h-16" />;
  if (!q.data?.length) return <p className="text-xs text-text-2">No conflict-free alternatives found. Edit the period manually and record an override reason.</p>;
  return (
    <>
      <ul className="space-y-1.5" aria-label="Resolution suggestions">{q.data.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-lilac p-2 text-xs"><span><span className="font-semibold">{s.label}</span><span className="block text-text-2">{s.detail}</span></span><Button size="sm" variant="soft" onClick={() => apply.mutate({ s })} loading={apply.isPending}>Apply</Button></li>))}</ul>
      <ReasonDialog open={!!pending} onOpenChange={(v) => !v && setPending(null)} title="Override reason required" description="This suggestion still creates a conflict. Record why it is acceptable." onSubmit={(reason) => apply.mutateAsync({ s: pending!, reason })} />
    </>
  );
}

export function ConflictPanel({ conflicts, by, onShow, onAssignGap }: { conflicts: Conflict[]; by: string; onShow: (c: Conflict) => void; onAssignGap: (c: Conflict) => void }) {
  const [open, setOpen] = React.useState<string | null>(null);
  const hard = conflicts.filter((c) => c.kind !== "unfulfilled"), soft = conflicts.filter((c) => c.kind === "unfulfilled");
  if (!conflicts.length) return <EmptyState icon={<CheckCircle size={28} weight="duotone" />} title="No conflicts in the draft" body="Teachers, classes and rooms are all free of clashes, and every required period is allocated. You can publish when ready." />;
  const Item = (c: Conflict) => (
    <li key={c.id} className="rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2"><ConflictBadge c={c} /><span className="text-xs text-text-2">{c.severity === "error" ? "Blocks a clean publish" : "Warning"}</span></div>
      <p className="mt-1 text-sm">{c.message}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {c.entryIds.length > 0 && <Button size="sm" variant="outline" onClick={() => onShow(c)}>Show in grid</Button>}
        {c.kind === "unfulfilled" && <Button size="sm" variant="soft" onClick={() => onAssignGap(c)}>Assign period</Button>}
        {c.entryIds.map((id) => <Button key={id} size="sm" variant="soft" onClick={() => setOpen(open === `${c.id}${id}` ? null : `${c.id}${id}`)} aria-expanded={open === `${c.id}${id}`}><Lightbulb size={14} /> Suggestions{c.entryIds.length > 1 ? ` (${className(id.split("-").slice(1, 3).join("-"))})` : ""}</Button>)}
      </div>
      {c.entryIds.map((id) => open === `${c.id}${id}` && <div key={id} className="mt-2"><SuggestionList entryId={id} by={by} /></div>)}
    </li>
  );
  return <div className="space-y-4">{hard.length > 0 && <section><h3 className="mb-2 text-sm font-semibold">Rule conflicts ({hard.length})</h3><ul className="space-y-2">{hard.map(Item)}</ul></section>}{soft.length > 0 && <section><h3 className="mb-2 text-sm font-semibold">Required periods not fulfilled ({soft.length})</h3><ul className="space-y-2">{soft.map(Item)}</ul></section>}</div>;
}

export function GapList({ gaps, onAssign }: { gaps: Gap[]; onAssign: (g: Gap) => void }) {
  if (!gaps.length) return <EmptyState title="No unassigned periods" body="Every required period has a teacher in the draft." />;
  return <ul className="divide-y divide-border rounded-xl border border-border bg-surface">{gaps.map((g) => <li key={g.classId + g.subjectId} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span><span className="font-semibold">{className(g.classId)} · {subjName(g.subjectId)}</span><span className="block text-xs text-text-2">{g.assigned} of {g.required} periods allocated</span></span><span className="flex items-center gap-2"><Badge tone="warning">{g.missing} missing</Badge><Button size="sm" variant="soft" onClick={() => onAssign(g)}>Assign</Button></span></li>)}</ul>;
}

export function WorkloadPanel({ rows, onPick }: { rows: TeacherWorkload[]; onPick: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <BarChart horizontal ariaLabel="Teacher workload as percent of weekly limit" unit="%" max={100} data={rows.map((r) => ({ label: tShort(r.teacherId), value: r.pct, color: r.flag === "over" ? "var(--danger)" : r.flag === "under" ? "var(--info)" : undefined }))} />
      <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm"><thead className="bg-surface-2 text-left text-xs text-text-2"><tr><th className="p-2">Teacher</th><th className="p-2 text-right">Periods / limit</th><th className="p-2">Mon–Fri</th><th className="p-2">Balance</th><th className="p-2"><span className="sr-only">Open</span></th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.teacherId} className="border-t border-border"><td className="p-2 font-medium">{tShort(r.teacherId)}</td><td className="tnum p-2 text-right">{r.periods} / {r.limit}</td><td className="tnum p-2 text-xs text-text-2">{r.byDay.join(" · ")}</td><td className="p-2"><Badge tone={r.flag === "over" ? "danger" : r.flag === "under" ? "info" : "success"}>{r.flag === "over" ? "Above average" : r.flag === "under" ? "Below average" : "Balanced"}</Badge></td><td className="p-2"><Button size="sm" variant="ghost" onClick={() => onPick(r.teacherId)}>View grid</Button></td></tr>)}</tbody></table></div>
      <p className="text-xs text-text-2">Balance compares each teacher to the staff average (±20 points). Over 100% of the weekly limit raises a conflict.</p>
    </div>
  );
}

export function CoveragePanel() {
  const q = useQuery({ queryKey: ["academic", "tt", "coverage"], queryFn: () => svc.reports("draft") });
  if (q.isLoading) return <Skeleton className="h-32" />; if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  return <ul className="space-y-3">{q.data.coverage.map((c) => <li key={c.classId}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{className(c.classId)}</span><span className="tnum text-text-2">{c.assigned}/{c.required} required periods · {c.fulfilledPct}%</span></div><Progress value={c.fulfilledPct} tone={c.fulfilledPct === 100 ? "success" : "warning"} label={`${className(c.classId)} subject coverage`} /></li>)}</ul>;
}

export function AuditList({ items }: { items: AllocationAudit[] }) {
  if (!items.length) return <EmptyState title="No changes recorded" body="Assignments, overrides, substitutions and publications appear here with who made them and why." />;
  return <ul className="divide-y divide-border rounded-xl border border-border bg-surface">{items.map((h) => <li key={h.id} className="p-3 text-sm"><div className="flex flex-wrap items-center gap-2"><Badge tone={h.action === "override" ? "danger" : h.action === "publish" ? "success" : "neutral"}>{h.action.replace(/-/g, " ")}</Badge><span className="text-xs text-text-2">{h.by} · {relTime(h.at)}</span></div><p className="mt-1">{h.detail}</p>{h.reason && <p className="text-xs text-text-2">Reason: {h.reason}</p>}{h.conflicts?.length ? <ul className="mt-1 list-disc pl-5 text-xs text-danger">{h.conflicts.map((c, i) => <li key={i}>{c}</li>)}</ul> : null}</li>)}</ul>;
}

const pubSchema = z.object({ note: z.string().max(200, "Keep the note under 200 characters."), ack: z.boolean() });
export function PublishDialog({ open, onOpenChange, conflicts, changed, by, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; conflicts: Conflict[]; changed: number; by: string; onDone: () => void }) {
  const f = useForm<z.infer<typeof pubSchema>>({ resolver: zodResolver(pubSchema), defaultValues: { note: "", ack: false } });
  React.useEffect(() => { if (open) f.reset({ note: "", ack: false }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = useMutation({ mutationFn: (v: z.infer<typeof pubSchema>) => timetableService.publishDraft({ acknowledge: v.ack, note: v.note, by }), onSuccess: (r) => { toast.success(`Timetable v${r.version} published. Students, parents and teachers were notified.`); onDone(); onOpenChange(false); }, onError: (e: Error) => toast.error(e.message) });
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Publish timetable" description={`${changed} period${changed === 1 ? "" : "s"} differ from the published timetable. Publishing makes the draft visible to students, parents and teachers.`}>
      <form onSubmit={f.handleSubmit((v) => { if (conflicts.length && !v.ack) { f.setError("ack", { message: "Acknowledge the unresolved conflicts to publish." }); return; } m.mutate(v); })} className="space-y-3" noValidate>
        {conflicts.length > 0 ? (
          <div className="rounded-xl bg-danger-soft p-3"><p className="flex items-center gap-1.5 text-sm font-semibold text-danger"><Warning size={16} weight="fill" /> {conflicts.length} unresolved conflict{conflicts.length > 1 ? "s" : ""}</p><ul className="mt-1 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-danger">{conflicts.map((c) => <li key={c.id}>{c.message}</li>)}</ul>
            <div className="mt-2"><Checkbox checked={f.watch("ack")} onChange={(v) => f.setValue("ack", v, { shouldValidate: true })} label="I acknowledge these conflicts and want to publish anyway" /></div>{f.formState.errors.ack && <p role="alert" className="mt-1 text-xs font-medium text-danger">{f.formState.errors.ack.message}</p>}</div>
        ) : <p className="flex items-center gap-1.5 rounded-xl bg-success-soft p-3 text-sm font-medium text-success"><CheckCircle size={16} weight="fill" /> No unresolved conflicts.</p>}
        <Field label="Publication note" htmlFor="pub-note" optional error={f.formState.errors.note?.message}><Textarea id="pub-note" {...f.register("note")} className="min-h-16" placeholder="Shown in notifications, e.g. Week 4 science lab reshuffle." /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" loading={m.isPending} disabled={changed === 0}>Publish</Button></div>
      </form>
    </Modal>
  );
}
