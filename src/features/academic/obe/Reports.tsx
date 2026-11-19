"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardBody, Badge, StatusBadge, SectionHeader, Skeleton, ErrorState, EmptyState, toast, Segmented, ConfirmDialog } from "@/components/ui";
import { BarChart, Heatmap } from "@/components/charts";
import { obeService, CALC_VERSION } from "@/lib/api/obeService";
import { LevelBadge, OBE_DISCLAIMER } from "./shared";

type View = "co" | "po" | "matrix" | "gap" | "assess" | "cohort";
export default function Reports({ courseIds, canApprove }: { courseIds: string[]; canApprove: boolean }) {
  const qc = useQueryClient();
  const rq = useQuery({ queryKey: ["obe", "runs"], queryFn: obeService.runs });
  const oq = useQuery({ queryKey: ["obe", "outcomes"], queryFn: obeService.outcomes });
  const [view, setView] = React.useState<View>("co"); const [pub, setPub] = React.useState(false);
  const st = useMutation({ mutationFn: (v: { id: string; s: "in-review" | "approved" | "published" }) => obeService.setRunStatus(v.id, v.s), onSuccess: (_d, v) => { toast.success(v.s === "published" ? "Run published to the programme report." : `Run ${v.s}.`); qc.invalidateQueries({ queryKey: ["obe"] }); }, onError: (e: Error) => toast.error(e.message) });
  const [fmt, setFmt] = React.useState("");
  if (rq.isLoading || oq.isLoading) return <Skeleton className="h-64" />;
  if (rq.isError || oq.isError || !rq.data || !oq.data) return <ErrorState onRetry={() => { rq.refetch(); oq.refetch(); }} />;
  const run = rq.data[0];
  if (!run) return <EmptyState title="No attainment run yet" body="Configure the method on the Attainment tab and choose Calculate mock attainment to generate a draft report." />;
  const { cos, courses, pos } = oq.data;
  const co = run.co.filter((c) => courseIds.includes(c.courseId));
  const po = run.po;
  return (
    <div className="space-y-4 print:text-black">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<View> label="Report" value={view} onChange={setView} options={[{ value: "co", label: "CO-wise" }, { value: "po", label: "PO/PSO-wise" }, { value: "matrix", label: "CO-PO matrix" }, { value: "assess", label: "Assessment contribution" }, { value: "cohort", label: "Cohort" }, { value: "gap", label: "Gaps & action plan" }]} />
        <StatusBadge status={run.status} />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>Print layout</Button>
          <Button size="sm" variant="outline" onClick={() => { setFmt("PDF"); toast.info("Simulated PDF export. No file is produced in the demo."); }}>Export PDF (simulated)</Button>
          <Button size="sm" variant="outline" onClick={() => { setFmt("XLSX"); toast.info("Simulated spreadsheet export. No file is produced in the demo."); }}>Export spreadsheet (simulated)</Button>
          {canApprove && run.status === "draft" && <Button size="sm" onClick={() => st.mutate({ id: run.id, s: "in-review" })}>Submit for review</Button>}
          {canApprove && run.status === "in-review" && <Button size="sm" variant="success" onClick={() => st.mutate({ id: run.id, s: "approved" })}>Approve</Button>}
          {canApprove && run.status === "approved" && <Button size="sm" onClick={() => setPub(true)}>Publish</Button>}
        </div>
      </div>
      <p className="rounded-lg bg-surface-2 p-2 text-xs text-text-2">Methodology: <b>{run.config.method === "threshold" ? `threshold (target ${run.config.targetScorePct}%, levels ${run.config.levels.l3}/${run.config.levels.l2}/${run.config.levels.l1}% of students)` : `mean score (levels ${run.config.meanLevels.l3}/${run.config.meanLevels.l2}/${run.config.meanLevels.l1}%)`}</b> · weights {Object.entries(run.config.weights).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(", ")} · target level {run.config.targetLevel} · AY {run.academicYear} · {run.semester} · {run.calcVersion} · calculated {new Date(run.at).toLocaleString("en-IN")}{fmt && ` · last export ${fmt} (simulated)`}</p>
      {view === "co" && <Card><CardBody><SectionHeader title="CO attainment vs target" />
        <BarChart horizontal ariaLabel="CO attainment level" max={3} data={co.map((c) => ({ label: c.code, value: c.level, color: c.level >= c.target ? "var(--success)" : "var(--danger)" }))} />
        <table className="mt-3 w-full text-left text-sm"><thead className="text-xs text-text-2"><tr><th>CO</th><th>Level</th><th>Per category (% attained / mean)</th><th>Missing</th></tr></thead><tbody>{co.map((c) => <tr key={c.coId} className="border-t border-border"><td className="py-1.5 font-medium">{c.code}</td><td><LevelBadge v={c.level} t={c.target} /></td><td className="text-xs text-text-2">{Object.entries(c.byCategory).map(([k, v]) => `${k}: ${v!.pctAttained}% / ${v!.mean}`).join(" · ")}</td><td>{c.missing.length ? <Badge tone="warning">{c.missing.join(", ")}</Badge> : "–"}</td></tr>)}</tbody></table></CardBody></Card>}
      {view === "po" && <Card><CardBody><SectionHeader title="PO and PSO attainment (derived from CO-PO mapping and weightages)" />
        <BarChart horizontal ariaLabel="PO attainment level" max={3} data={po.map((p) => ({ label: p.code, value: p.level, color: p.level >= p.target ? "var(--success)" : "var(--danger)" }))} />
        <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">Show contributing COs</summary>{po.map((p) => <p key={p.poId} className="mt-1 text-xs text-text-2"><b>{p.code}</b> = Σ(mapping × CO level) ÷ Σ mapping over {p.contributors.length} COs</p>)}</details></CardBody></Card>}
      {view === "matrix" && <Card><CardBody><SectionHeader title="CO-PO matrix with CO attainment" subtitle="Each cell shows the approved mapping strength." />
        <MatrixAll courseIds={courseIds} /></CardBody></Card>}
      {view === "assess" && <Card><CardBody><SectionHeader title="Assessment contribution" subtitle="Weight of each category and the average level it produced." />
        <BarChart horizontal ariaLabel="Assessment weights" unit="%" data={Object.entries(run.config.weights).map(([k, v]) => ({ label: k, value: Math.round(v * 100) }))} />
        <table className="mt-3 w-full text-left text-sm"><thead className="text-xs text-text-2"><tr><th>Category</th><th>Mean level</th><th>COs with evidence</th></tr></thead><tbody>{(["internal", "external", "assignment", "practical"] as const).map((k) => { const v = co.map((c) => c.byCategory[k]).filter(Boolean); return <tr key={k} className="border-t border-border"><td className="py-1.5 capitalize">{k}</td><td className="tnum">{v.length ? (v.reduce((s, x) => s + x!.value, 0) / v.length).toFixed(2) : "–"}</td><td className="tnum">{v.length}/{co.length}</td></tr>; })}</tbody></table></CardBody></Card>}
      {view === "cohort" && <Cohort cos={co.map((c) => ({ id: c.coId, code: c.code }))} />}
      {view === "gap" && <Card><CardBody><SectionHeader title="Gap analysis and action plan" />
        {run.actionPlan.length ? <ul className="space-y-2 text-sm">{run.actionPlan.map((a) => <li key={a.id} className="rounded-lg border border-border p-2"><b>{a.target}</b> · {a.action}<p className="text-xs text-text-2">Owner {a.owner} · due {a.due}</p></li>)}</ul> : <p className="text-sm text-text-2">Every CO with complete evidence met its target, so no actions were generated.</p>}</CardBody></Card>}
      <p className="text-xs text-text-2">{OBE_DISCLAIMER} {CALC_VERSION}.</p>
      <ConfirmDialog open={pub} onOpenChange={setPub} title="Publish this attainment report?" body="Published reports become the programme's reference run. Keep this fictional data away from official submissions." confirmLabel="Publish" onConfirm={() => st.mutate({ id: run.id, s: "published" })} />
    </div>
  );
}
function MatrixAll({ courseIds }: { courseIds: string[] }) {
  const o = useQuery({ queryKey: ["obe", "outcomes"], queryFn: obeService.outcomes });
  const m = useQuery({ queryKey: ["obe", "mappings"], queryFn: obeService.mappings });
  if (!o.data || !m.data) return <Skeleton className="h-40" />;
  const cos = o.data.cos.filter((c) => courseIds.includes(c.courseId)); const pos = o.data.pos;
  const vals = cos.map((co) => pos.map((p) => m.data!.find((x) => x.courseId === co.courseId)?.cells.find((c) => c.coId === co.id && c.poId === p.id)?.value ?? 0));
  return <Heatmap ariaLabel="All CO to PO mapping" rows={cos.map((c) => c.code)} cols={pos.map((p) => p.code)} values={vals} max={o.data.scale.max} rowTitle={(i) => cos[i].text} colTitle={(i) => pos[i].title} />;
}

function Cohort({ cos }: { cos: { id: string; code: string }[] }) {
  const [sel, setSel] = React.useState(cos[0]?.id ?? "");
  const dist = useQuery({ queryKey: ["obe", "dist", sel], queryFn: () => obeService.distribution(sel), enabled: !!sel });
  return <Card><CardBody><SectionHeader title="Student cohort distribution" subtitle="Aggregated, synthetic cohort. No individual identities." />
    <select aria-label="Course outcome" className="mb-3 h-10 rounded-xl border border-border bg-surface px-3 text-sm" value={sel} onChange={(e) => setSel(e.target.value)}>{cos.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}</select>
    {dist.data ? <BarChart ariaLabel="Students by score band" data={["<40%", "40–59%", "60–79%", "80%+"].map((l, i) => ({ label: l, value: dist.data![i] }))} /> : <Skeleton className="h-40" />}</CardBody></Card>;
}
