"use client";
import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Field, Modal, Textarea, Badge, Skeleton, toast } from "@/components/ui";
import type { TimetableEntry } from "@/types/academic";
import { staffAllocationService as svc } from "@/lib/api/staffAllocationService";
import { timetableService } from "@/lib/api/timetableService";
import { useInvalidateTT, subjName, className, tShort, DAYS, PERIODS } from "./common";

const schema = z.object({ substituteId: z.string().min(1, "Choose a substitute."), reason: z.string().trim().min(5, "Add a short reason.") });
export function SubstituteDialog({ entry, open, onOpenChange, by }: { entry: TimetableEntry | null; open: boolean; onOpenChange: (v: boolean) => void; by: string }) {
  const inv = useInvalidateTT();
  const f = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { substituteId: "", reason: "" } });
  React.useEffect(() => { if (open) f.reset({ substituteId: "", reason: entry?.note?.startsWith("Substitute") ? "" : "Teacher on approved leave" }); }, [open, entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = useQuery({ queryKey: ["academic", "tt", "subs", entry?.id], queryFn: () => svc.substituteCandidates(entry!.id), enabled: open && !!entry });
  const m = useMutation({ mutationFn: (v: z.infer<typeof schema>) => timetableService.assignSubstitute(entry!.id, v.substituteId, by, v.reason), onSuccess: () => { toast.success("Substitute assigned. Students, parents and staff were notified."); inv(); onOpenChange(false); }, onError: (e: Error) => toast.error(e.message) });
  if (!entry) return null;
  const sel = f.watch("substituteId");
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Assign substitute" description={`${className(entry.classId)} ${subjName(entry.subjectId)} · ${DAYS.find((d) => d.n === entry.dayOfWeek)?.label} ${PERIODS.find((p) => p.id === entry.periodId)?.label}. Regular teacher: ${tShort(entry.teacherId)}.`}>
      <form onSubmit={f.handleSubmit((v) => m.mutate(v))} className="space-y-3">
        <Field label="Available staff" error={f.formState.errors.substituteId?.message} required>
          {q.isLoading ? <Skeleton className="h-24" /> : (
            <ul role="radiogroup" aria-label="Substitute candidates" className="max-h-64 space-y-1.5 overflow-y-auto">
              {q.data?.map((c) => {
                const ok = c.free, disabled = !c.free;
                return (
                  <li key={c.teacherId}>
                    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-sm ${sel === c.teacherId ? "border-primary bg-lilac" : "border-border"} ${disabled ? "opacity-50" : ""}`}>
                      <input type="radio" value={c.teacherId} disabled={disabled} {...f.register("substituteId")} className="accent-[var(--primary)]" />
                      <span className="flex-1"><span className="font-semibold">{c.name}</span><span className="block text-xs text-text-2">Load {c.load} periods</span></span>
                      {c.qualified ? <Badge tone="success">Qualified</Badge> : <Badge tone="warning">Different subject</Badge>}
                      {!ok && <Badge tone="danger">Not free</Badge>}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </Field>
        <Field label="Reason" htmlFor="sub-reason" error={f.formState.errors.reason?.message} required><Textarea id="sub-reason" {...f.register("reason")} className="min-h-16" /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" loading={m.isPending}>Assign substitute</Button></div>
      </form>
    </Modal>
  );
}
