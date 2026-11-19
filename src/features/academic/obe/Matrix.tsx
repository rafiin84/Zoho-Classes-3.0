"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardBody, Field, Input, Select, Modal, StatusBadge, Skeleton, ErrorState, toast, Segmented, ConfirmDialog } from "@/components/ui";
import { Heatmap } from "@/components/charts";
import { obeService } from "@/lib/api/obeService";

export default function Matrix({ courseIds, canEdit, by }: { courseIds: string[]; canEdit: boolean; by: string }) {
  const qc = useQueryClient();
  const o = useQuery({ queryKey: ["obe", "outcomes"], queryFn: obeService.outcomes });
  const m = useQuery({ queryKey: ["obe", "mappings"], queryFn: obeService.mappings });
  const [courseId, setCourseId] = React.useState(courseIds[0]);
  const [cell, setCell] = React.useState<{ r: number; c: number } | null>(null);
  const [val, setVal] = React.useState(0); const [why, setWhy] = React.useState(""); const [err, setErr] = React.useState("");
  const [scaleOpen, setScaleOpen] = React.useState(false); const [scaleMax, setScaleMax] = React.useState(3); const [confirmApprove, setConfirmApprove] = React.useState(false);
  const inv = () => qc.invalidateQueries({ queryKey: ["obe"] });
  const setC = useMutation({ mutationFn: () => obeService.setCell(courseId, cos[cell!.r].id, pos[cell!.c].id, val, why, by), onSuccess: () => { toast.success("Mapping updated (new draft version if it was approved)."); setCell(null); inv(); }, onError: (e: Error) => setErr(e.message) });
  const st = useMutation({ mutationFn: (s: "draft" | "in-review" | "approved") => obeService.setMappingStatus(courseId, s, by), onSuccess: (_d, s) => { toast.success(`Mapping ${s === "in-review" ? "submitted for review" : s}.`); inv(); } });
  const sc = useMutation({ mutationFn: () => obeService.setScale({ max: scaleMax, labels: o.data!.scale.labels, note: o.data!.scale.note }), onSuccess: () => { toast.success("Scale updated; existing values were clamped."); setScaleOpen(false); inv(); }, onError: (e: Error) => toast.error(e.message) });
  if (o.isLoading || m.isLoading) return <Skeleton className="h-64" />;
  if (o.isError || m.isError || !o.data || !m.data) return <ErrorState onRetry={() => { o.refetch(); m.refetch(); }} />;
  const ids = courseIds.length ? courseIds : [];
  const cid = ids.includes(courseId) ? courseId : ids[0];
  const course = o.data.courses.find((c) => c.id === cid);
  if (!course) return <p className="text-sm text-text-2">No courses in your scope.</p>;
  var cos = o.data.cos.filter((c) => c.courseId === cid); var pos = o.data.pos;
  const mp = m.data.find((x) => x.courseId === cid)!;
  const values = cos.map((co) => pos.map((p) => mp.cells.find((c) => c.coId === co.id && c.poId === p.id)?.value ?? 0));
  const totals = pos.map((_, j) => values.reduce((s, r) => s + r[j], 0));
  const uncovered = pos.filter((_, j) => totals[j] === 0).map((p) => p.code);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Course" value={cid} onChange={setCourseId} options={ids.map((i) => ({ value: i, label: o.data!.courses.find((c) => c.id === i)!.code }))} />
        <StatusBadge status={mp.status} label={`${mp.status} · v${mp.version}`} />
        <span className="text-xs text-text-2">Scale 0–{o.data.scale.max}: {o.data.scale.labels.map((l, i) => `${i} ${l}`).join(" · ")}</span>
        <div className="ml-auto flex gap-2">
          {canEdit && <Button size="sm" variant="outline" onClick={() => { setScaleMax(o.data!.scale.max); setScaleOpen(true); }}>Mapping scale</Button>}
          {canEdit && mp.status === "draft" && <Button size="sm" onClick={() => st.mutate("in-review")}>Submit for review</Button>}
          {canEdit && mp.status === "in-review" && <Button size="sm" variant="success" onClick={() => setConfirmApprove(true)}>Approve mapping</Button>}
        </div>
      </div>
      <Card><CardBody>
        <p className="mb-2 text-sm font-semibold">{course.code} · CO to PO/PSO matrix</p>
        <Heatmap ariaLabel={`CO to PO matrix for ${course.code}`} rows={cos.map((c) => c.code.split(".")[1])} cols={pos.map((p) => p.code)} values={values} max={o.data.scale.max}
          rowTitle={(i) => cos[i].text} colTitle={(i) => pos[i].description} onCell={canEdit ? (r, c) => { setCell({ r, c }); const cc = mp.cells.find((x) => x.coId === cos[r].id && x.poId === pos[c].id); setVal(cc?.value ?? 0); setWhy(cc?.rationale ?? ""); setErr(""); } : undefined} />
        <p className="mt-2 text-xs text-text-2">Column totals: {pos.map((p, j) => `${p.code} ${totals[j]}`).join(" · ")}</p>
        <p className={uncovered.length ? "mt-1 text-xs font-medium text-warning" : "mt-1 text-xs text-success"}>{uncovered.length ? `Not covered by this course: ${uncovered.join(", ")}` : "All POs and PSOs are covered."}</p>
        {!canEdit && <p className="mt-1 text-xs text-text-2">View only. Select a cell label to read its rationale on focus; editing is for the OBE committee.</p>}
      </CardBody></Card>
      <Card><CardBody>
        <p className="mb-2 text-sm font-semibold">Version history</p>
        <ul className="space-y-1 text-xs text-text-2">{mp.history.map((h, i) => <li key={i} className="tnum">v{h.version} · {new Date(h.at).toLocaleDateString("en-IN")} · {h.by} · {h.note}</li>)}</ul>
      </CardBody></Card>
      <Modal open={!!cell} onOpenChange={(x) => !x && setCell(null)} title={cell ? `${cos[cell.r].code} → ${pos[cell.c].code}` : ""} description={cell ? `${cos[cell.r].text} / ${pos[cell.c].title}` : undefined}
        footer={<><Button variant="ghost" onClick={() => setCell(null)}>Cancel</Button><Button loading={setC.isPending} onClick={() => setC.mutate()}>Save mapping</Button></>}>
        <div className="space-y-3">
          <Field label="Mapping strength" htmlFor="mv"><Select id="mv" value={val} onChange={(e) => setVal(Number(e.target.value))}>{o.data.scale.labels.map((l, i) => <option key={i} value={i}>{i} · {l}</option>)}</Select></Field>
          <Field label="Rationale" htmlFor="mr" error={err} hint="Required when strength is above 0."><Input id="mr" value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        </div>
      </Modal>
      <Modal open={scaleOpen} onOpenChange={setScaleOpen} title="Mapping scale" description="The scale is a setting. Values above the new maximum are clamped."
        footer={<><Button variant="ghost" onClick={() => setScaleOpen(false)}>Cancel</Button><Button loading={sc.isPending} onClick={() => sc.mutate()}>Apply scale</Button></>}>
        <Field label="Highest level (1–5)" htmlFor="sm"><Input id="sm" type="number" min={1} max={5} value={scaleMax} onChange={(e) => setScaleMax(Number(e.target.value))} /></Field>
      </Modal>
      <ConfirmDialog open={confirmApprove} onOpenChange={setConfirmApprove} title="Approve this mapping?" body="Approved mappings feed attainment calculations. Later edits create a new draft version." confirmLabel="Approve" onConfirm={() => st.mutate("approved")} />
    </div>
  );
}
