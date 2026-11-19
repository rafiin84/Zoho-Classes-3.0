"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardBody, Field, Input, Select, Skeleton, ErrorState, toast, SectionHeader } from "@/components/ui";
import { marksheetService } from "@/lib/api/marksheetService";
import type { GradingScheme } from "@/types/results";

export default function Scheme({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["results", "schemes"], queryFn: marksheetService.schemes });
  const [id, setId] = React.useState("gs-default"); const [s, setS] = React.useState<GradingScheme | null>(null);
  React.useEffect(() => { const f = q.data?.find((x) => x.id === id); if (f) setS(structuredClone(f)); }, [q.data, id]);
  const save = useMutation({ mutationFn: () => marksheetService.saveScheme(s!), onSuccess: () => { toast.success("Scheme saved. Unpublished batches using it were recalculated."); qc.invalidateQueries({ queryKey: ["results"] }); }, onError: (e: Error) => toast.error(e.message) });
  if (q.isLoading || !s) return <Skeleton className="h-64" />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const num = (k: keyof GradingScheme) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) });
  return (
    <Card><CardBody className="space-y-4">
      <SectionHeader title="Grading scheme" subtitle="No scheme is assumed. Choose one or edit boundaries, pass criteria, weightages and rounding." />
      <Field label="Scheme" htmlFor="sc"><Select id="sc" value={id} onChange={(e) => setId(e.target.value)}>{q.data.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Field label="Pass at (%)" htmlFor="pp"><Input id="pp" type="number" disabled={!canEdit} value={s.passPercent} onChange={num("passPercent")} /></Field>
        <Field label="Internal max" htmlFor="im"><Input id="im" type="number" disabled={!canEdit} value={s.internalMax} onChange={num("internalMax")} /></Field>
        <Field label="External max" htmlFor="em"><Input id="em" type="number" disabled={!canEdit} value={s.externalMax} onChange={num("externalMax")} /></Field>
        <Field label="Rounding" htmlFor="rd"><Select id="rd" disabled={!canEdit} value={s.rounding} onChange={(e) => setS({ ...s, rounding: e.target.value as GradingScheme["rounding"] })}><option value="nearest">Nearest whole mark</option><option value="up">Round up</option><option value="down">Round down</option><option value="none">One decimal</option></Select></Field>
        <Field label="GPA scale" htmlFor="gp"><Input id="gp" type="number" disabled={!canEdit} value={s.gpaScale} onChange={num("gpaScale")} /></Field>
      </div>
      <p className="text-xs text-text-2">Subject maximum = {s.internalMax + s.externalMax}. Weightage: internal {Math.round((s.internalMax / (s.internalMax + s.externalMax || 1)) * 100)}% and external {Math.round((s.externalMax / (s.internalMax + s.externalMax || 1)) * 100)}%. {s.cgpaNote}</p>
      <table className="w-full max-w-xl text-left text-sm"><thead className="text-xs text-text-2"><tr><th>Grade</th><th>Minimum %</th><th>Grade points</th><th /></tr></thead><tbody>{s.boundaries.map((b, i) => (
        <tr key={i} className="border-t border-border"><td className="py-1"><Input aria-label={`Grade label ${i + 1}`} className="h-9 w-28" disabled={!canEdit} value={b.grade} onChange={(e) => setS({ ...s, boundaries: s.boundaries.map((x, k) => (k === i ? { ...x, grade: e.target.value } : x)) })} /></td>
          <td><Input aria-label={`Minimum percent ${b.grade}`} className="h-9 w-24" type="number" disabled={!canEdit} value={b.min} onChange={(e) => setS({ ...s, boundaries: s.boundaries.map((x, k) => (k === i ? { ...x, min: Number(e.target.value) } : x)) })} /></td>
          <td><Input aria-label={`Points ${b.grade}`} className="h-9 w-24" type="number" disabled={!canEdit} value={b.points} onChange={(e) => setS({ ...s, boundaries: s.boundaries.map((x, k) => (k === i ? { ...x, points: Number(e.target.value) } : x)) })} /></td>
          <td>{canEdit && s.boundaries.length > 2 && <Button size="sm" variant="ghost" onClick={() => setS({ ...s, boundaries: s.boundaries.filter((_, k) => k !== i) })}>Remove</Button>}</td></tr>))}</tbody></table>
      {canEdit ? <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setS({ ...s, boundaries: [...s.boundaries, { grade: "New", min: 1, points: 0 }] })}>Add grade</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save scheme</Button></div> : <p className="text-xs text-text-2">Only the exam office can change schemes.</p>}
    </CardBody></Card>
  );
}
