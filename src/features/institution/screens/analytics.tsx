"use client";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Button, Badge, StatusBadge, Drawer, Modal, Field, Input, Select, Input as I2, toast, AIBadge, Segmented, DemoTag } from "@/components/ui";
import { BarChart, LineChart, Heatmap } from "@/components/charts";
import { institutionService } from "@/lib/api/institutionService";
import { workspaceService } from "@/lib/api/workspaceService";
import { objectiveGaps, SUBJECT_SCORES } from "@/lib/mock-data/institution";
import { SUBJECTS } from "@/lib/mock-data/core";
import type { ScreenProps } from "@/types/screens";
import { useCtx, useQ, Q, DataTable, DemoNote, onErr, Panel, SevBadge, simulateExport } from "../kit";
import { BranchDrill } from "../components/BranchDrill";

export default function AnalyticsScreen(_: ScreenProps) {
  const { ctx, key, instName } = useCtx(); const qc = useQueryClient();
  const a = useQ(["analytics", ...key], () => institutionService.analytics(ctx)); const ta = useQ(["teacher-act", ...key], () => institutionService.teacherActivity(ctx));
  const sch = useQ(["scheduled"], () => institutionService.scheduled());
  const [drill, setDrill] = React.useState<{ id: string; name: string } | null>(null); const [metric, setMetric] = React.useState<"avgScore" | "engagement" | "completion" | "attendance">("avgScore");
  const [subjBranch, setSubjBranch] = React.useState(""); const [nl, setNl] = React.useState(""); const [sched, setSched] = React.useState(false); const [sf, setSf] = React.useState({ name: "", cadence: "Weekly · Monday 8:00", recipients: "" });
  const nlq = useMutation({ mutationFn: (q: string) => workspaceService.run(q, ctx), onError: onErr });
  const add = useMutation({ mutationFn: () => institutionService.addScheduled(sf), onSuccess: () => { toast.success("Scheduled report created (demo — nothing is sent)."); setSched(false); setSf({ name: "", cadence: "Weekly · Monday 8:00", recipients: "" }); qc.invalidateQueries({ queryKey: ["inst", "scheduled"] }); }, onError: onErr });
  const tog = useMutation({ mutationFn: (id: string) => institutionService.toggleScheduled(id), onSuccess: (s) => { toast.success(s.state === "paused" ? "Paused." : "Resumed."); qc.invalidateQueries({ queryKey: ["inst", "scheduled"] }); }, onError: onErr });
  const L: Record<typeof metric, string> = { avgScore: "Average score", engagement: "Engagement", completion: "Course completion", attendance: "Attendance" };
  return (
    <div>
      <PageHeader title="Analytics" subtitle={`${instName} · comparisons, mastery, engagement and intervention effectiveness. Select anything to drill down.`} actions={<><DemoTag /><Button variant="outline" onClick={() => simulateExport("Analytics summary", "Analytics")}>Export (demo)</Button></>} />
      <Q q={a} rows={4} h="h-48">{(d) => {
        const bid = subjBranch || d.metrics[0]?.branchId; const names = d.names;
        const objs = objectiveGaps(bid).slice(0, 6); const cols = d.metrics.map((m) => m.branchId);
        return (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Branch / cohort comparison" action={<Segmented label="Metric" value={metric} onChange={setMetric} options={[{ value: "avgScore", label: "Score" }, { value: "engagement", label: "Engage" }, { value: "completion", label: "Complete" }, { value: "attendance", label: "Attend" }]} />}>
                {d.metrics.length < 2 && <DemoNote tone="info">One branch in this view; comparison is across time below.</DemoNote>}
                <BarChart horizontal ariaLabel={L[metric]} unit="%" max={100} data={d.metrics.map((m) => ({ label: names[m.branchId], value: m[metric] }))} onSelect={(x) => { const m = d.metrics.find((y) => names[y.branchId] === x.label)!; setDrill({ id: m.branchId, name: x.label }); }} />
                <p className="mt-2 text-xs text-text-2">Select a bar to open that branch: classes, subjects, objective gaps.</p></Panel>
              <Panel title="Engagement over time"><LineChart ariaLabel="Engagement trend" labels={d.months} unit="%" min={50} max={90} series={d.metrics.map((m) => ({ name: names[m.branchId], values: d.trend[m.branchId] ?? [] }))} /></Panel>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Subject & grade performance" action={<Select aria-label="Branch" className="h-9 w-auto text-xs" value={bid} onChange={(e) => setSubjBranch(e.target.value)}>{d.metrics.map((m) => <option key={m.branchId} value={m.branchId}>{names[m.branchId]}</option>)}</Select>}>
                <BarChart ariaLabel="Subject scores" unit="%" max={100} height={170} data={SUBJECTS.map((s) => ({ label: s.name.split(" ")[0], value: SUBJECT_SCORES[bid]?.[s.id] ?? 65 }))} /></Panel>
              <Panel title="Learning-objective mastery (lowest six)"><Heatmap ariaLabel="Objective mastery by branch" rows={objs.map((o) => o.label.slice(0, 22))} cols={cols.map((c) => names[c].split(" ")[0])} max={100} rowTitle={(i) => objs[i].label} values={objs.map((o) => cols.map((c) => objectiveGaps(c).find((g) => g.objectiveId === o.objectiveId)?.mastery ?? 0))} onCell={(r, c) => setDrill({ id: cols[c], name: names[cols[c]] })} /><p className="mt-2 text-xs text-text-2">Cells show estimated mastery %. Select a cell to open the branch.</p></Panel>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Teacher activity"><Q q={ta} rows={2}>{(rows) => !rows.length ? <p className="text-sm text-text-2">No teacher activity for this institution or branch.</p> : <DataTable ariaLabel="Teacher activity" rows={rows} rowKey={(r) => r.id} pageSize={6} cols={[{ key: "n", header: "Teacher", cell: (r) => <b>{r.name}</b>, sort: (x, y) => x.name.localeCompare(y.name) }, { key: "l", header: "Load", cell: (r) => <span className="tnum">{r.load}/{r.limit}</span>, sort: (x, y) => x.load - y.load }, { key: "g", header: "Graded", cell: (r) => r.graded, align: "right", sort: (x, y) => x.graded - y.graded }, { key: "ai", header: "AI-assisted", cell: (r) => r.aiAssist, align: "right" }]} />}</Q></Panel>
              <Panel title="Intervention effectiveness"><ul className="space-y-3">{d.interventionEffect.map((i) => <li key={i.label} className="text-sm"><div className="flex justify-between gap-2"><b>{i.label}</b><Badge tone="success">+{i.after - i.before} pts</Badge></div><p className="text-xs text-text-2">{i.before}% → {i.after}% · n={i.n}</p></li>)}</ul><DemoNote tone="info">Before/after on small groups without a comparison group: encouraging, not proof the intervention caused the change.</DemoNote></Panel>
            </div>
            <Panel title="Ask for a report in plain language" action={<AIBadge />}>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (nl.trim().length < 6) return toast.warning("Describe the report you want."); nlq.mutate(nl); }}><I2 aria-label="Report request" value={nl} onChange={(e) => setNl(e.target.value)} placeholder="e.g. Compare performance across branches this term" /><Button type="submit" loading={nlq.isPending}>Generate</Button></form>
              {nlq.data && <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm" aria-live="polite"><p>{nlq.data.summary}</p><p className="mt-1 text-xs text-text-2">Source: {nlq.data.source} · {nlq.data.range}</p>{nlq.data.caveats[0] && <p className="mt-1 text-xs text-warning">{nlq.data.caveats[0]}</p>}<Button size="sm" variant="outline" className="mt-2" onClick={() => simulateExport(nlq.data!.query, "Analytics")}>Export (demo)</Button></div>}
            </Panel>
            <Panel title="Scheduled reports" action={<Button size="sm" onClick={() => setSched(true)}>New schedule</Button>}>
              <Q q={sch} rows={1}>{(rows) => !rows.length ? <p className="text-sm text-text-2">No scheduled reports.</p> : <ul className="space-y-2">{rows.map((s) => <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm"><span><b>{s.name}</b><span className="block text-xs text-text-2">{s.cadence} · to {s.recipients} · next {s.next}</span></span><span className="flex items-center gap-2"><StatusBadge status={s.state === "active" ? "active" : "pending"} label={s.state} /><Button size="sm" variant="outline" onClick={() => tog.mutate(s.id)}>{s.state === "active" ? "Pause" : "Resume"}</Button></span></li>)}</ul>}</Q></Panel>
          </div>); }}</Q>
      <Drawer open={!!drill} onOpenChange={(v) => !v && setDrill(null)} title={drill ? `${drill.name} · drill-down` : ""} width="sm:max-w-xl">{drill && <BranchDrill branchId={drill.id} branchName={drill.name} />}</Drawer>
      <Modal open={sched} onOpenChange={setSched} title="Schedule a report (demo)" footer={<><Button variant="ghost" onClick={() => setSched(false)}>Cancel</Button><Button loading={add.isPending} onClick={() => add.mutate()}>Create</Button></>}>
        <div className="space-y-3"><Field label="Report name" htmlFor="sr-n" required><Input id="sr-n" value={sf.name} onChange={(e) => setSf({ ...sf, name: e.target.value })} /></Field><Field label="Cadence" htmlFor="sr-c"><Select id="sr-c" value={sf.cadence} onChange={(e) => setSf({ ...sf, cadence: e.target.value })}>{["Weekly · Monday 8:00", "Monthly · 1st", "Termly"].map((c) => <option key={c}>{c}</option>)}</Select></Field><Field label="Recipients" htmlFor="sr-r"><Input id="sr-r" value={sf.recipients} onChange={(e) => setSf({ ...sf, recipients: e.target.value })} placeholder="Principal, branch heads" /></Field></div></Modal>
    </div>
  );
}
