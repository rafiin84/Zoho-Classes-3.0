"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, CardBody, EmptyState, Field, Input, Modal, PageHeader, Select, StatTile, StatusBadge, Switch, toast, Segmented, Progress } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { LockKey, Plus } from "@phosphor-icons/react";
import type { ScreenProps } from "@/types/screens";
import type { AssessmentConfig } from "@/types/government";
import { governmentService } from "@/lib/api/governmentService";
import { GRADES, SUBJECTS, OBJECTIVES, ACADEMIC_YEARS, CURRICULUM, subjectById } from "@/lib/mock-data/core";
import { SRC } from "@/lib/mock-data/government";
import { Async, DemoBanner, Panel, Src, errMsg, useLowBaseline } from "../components/shared";

const schema = z.object({ name: z.string().min(3, "Name needs 3+ characters"), layer: z.enum(["baseline", "continuous", "progress"]), gradeId: z.string().min(1), subjectId: z.string().min(1), year: z.string().min(1), objectiveIds: z.array(z.string()).min(1, "Select at least one objective"), mandatory: z.boolean() });
type Form = z.infer<typeof schema>;
const LAYERS = [
  { id: "baseline" as const, n: 1, title: "Initial baseline", body: "Mandatory at each student's first login. Locked after completion; never overwritten." },
  { id: "continuous" as const, n: 2, title: "Continuous assessment", body: "State or class teacher assessments, course MCQs, games, microlearning and assignments." },
  { id: "progress" as const, n: 3, title: "Periodic progress", body: "Measured against the ORIGINAL baseline without overwriting it." },
];

export default function Assessments(_: ScreenProps) {
  const qc = useQueryClient(); const low = useLowBaseline();
  const aq = useQuery({ queryKey: ["gov", "assessments"], queryFn: () => governmentService.assessments() });
  const dq = useQuery({ queryKey: ["gov", "districts", low], queryFn: () => governmentService.districts(low) });
  const eq = useQuery({ queryKey: ["gov", "intervention-effect"], queryFn: () => governmentService.interventionEffect() });
  const [open, setOpen] = React.useState(false); const [layer, setLayer] = React.useState<"all" | AssessmentConfig["layer"]>("all");
  const f = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { name: "", layer: "baseline", gradeId: "g8", subjectId: "sub-math", year: ACADEMIC_YEARS[0].label, objectiveIds: [], mandatory: true } });
  const sub = f.watch("subjectId"), grade = f.watch("gradeId"), lay = f.watch("layer");
  const create = useMutation({ mutationFn: (v: Form) => governmentService.createAssessment(v), onSuccess: () => { qc.invalidateQueries({ queryKey: ["gov"] }); toast.success("Assessment configured", "Students will see it per its layer rules."); setOpen(false); f.reset(); }, onError: (e) => f.setError("name", { message: errMsg(e) }) });
  const objs = OBJECTIVES.filter((o) => o.subjectId === sub && o.gradeId === grade);

  return (
    <div>
      <PageHeader title="Baseline & Assessments" subtitle="Three layers of assessment, with every follow-up measured against the original baseline." actions={<Button onClick={() => setOpen(true)}><Plus size={18} />Configure assessment</Button>} />
      <DemoBanner />
      <section className="mb-5 grid gap-3 md:grid-cols-3" aria-label="Assessment layers">{LAYERS.map((l) => <Card key={l.id}><CardBody><Badge tone="primary">Layer {l.n}</Badge><h2 className="mt-2 text-heading">{l.title}</h2><p className="mt-1 text-sm text-text-2">{l.body}</p></CardBody></Card>)}</section>
      <div className="mb-4"><Segmented label="Layer filter" value={layer} onChange={setLayer} options={[{ value: "all", label: "All" }, ...LAYERS.map((l) => ({ value: l.id, label: l.title }))]} /></div>
      <Async q={aq}>{(list) => {
        const shown = list.filter((a) => layer === "all" || a.layer === layer);
        return shown.length === 0 ? <EmptyState title="No assessment configured" body="Configure the mandatory baseline by grade, subject, curriculum, year and objective." action={{ label: "Configure assessment", onClick: () => setOpen(true) }} /> : (
          <ul className="space-y-3">{shown.map((a) => (
            <li key={a.id}><Card><CardBody>
              <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="font-semibold">{a.name}</h3><p className="text-xs text-text-2">{GRADES.find((g) => g.id === a.gradeId)?.label} · {subjectById(a.subjectId).name} · {a.curriculum} · {a.year} · {a.objectiveIds.length} objectives</p></div>
                <div className="flex flex-wrap gap-1.5">{a.mandatory && <Badge tone="danger">Mandatory</Badge>}{a.locked && <Badge tone="neutral" icon={<LockKey size={12} />}>Locked baseline</Badge>}<StatusBadge status={a.state === "not-started" ? "pending" : a.state} label={a.state === "not-started" ? "Not started" : a.state === "in-progress" ? "In progress" : "Complete"} />{a.followUp !== "n/a" && <StatusBadge status={a.followUp === "complete" ? "completed" : "pending"} label={`Follow-up ${a.followUp}`} />}</div></div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">{([["Coverage", a.coverage], ["Completion", a.completion], ["Proficiency", a.proficiency], ["Mastery", a.mastery]] as [string, number][]).map(([k, v]) => <div key={k}><dt className="flex justify-between text-xs text-text-2"><span>{k}</span><span className="tnum">{v}%</span></dt><dd><Progress value={v} size="sm" label={k} /></dd></div>)}</dl>
            </CardBody></Card></li>))}</ul>);
      }}</Async>
      <Src text={SRC.baseline} />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel title="Baseline coverage by district" subtitle="District data complete or partial" src={SRC.baseline}>
          <Async q={dq}>{(ds) => <><BarChart horizontal max={100} unit="%" ariaLabel="Baseline coverage by district" data={[...ds].sort((a, b) => a.baselineCoverage - b.baselineCoverage).map((d) => ({ label: `${d.name}${d.dataStatus === "partial" ? " (partial data)" : ""}`, value: d.baselineCoverage, color: d.baselineCoverage < 60 ? "var(--danger)" : "var(--primary)" }))} /><p className="mt-2 text-xs text-text-2">Red bars are below the 60% reliability threshold.</p></>}</Async>
        </Panel>
        <Panel title="Intervention effectiveness" subtitle="Average change vs original baseline among participants" src={SRC.followUp}>
          <Async q={eq}>{(rows) => <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-text-2"><th className="py-1">Intervention</th><th>Status</th><th className="text-right">Change</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id} className="border-t border-border"><td className="py-2 pr-2">{r.title}<div className="text-xs text-text-2">{r.programme}</div></td><td><StatusBadge status={r.status === "delayed" ? "overdue" : r.status === "running" ? "active" : r.status === "done" ? "completed" : "scheduled"} label={r.status} /></td><td className="tnum text-right">{r.effect === null ? "n/a" : `+${r.effect} pts`}</td></tr>)}</tbody></table><p className="mt-2 text-xs text-text-2">Associations, not proven causal effects.</p></div>}</Async>
        </Panel>
      </div>

      <Modal open={open} onOpenChange={setOpen} title="Configure assessment" description="By grade, subject, curriculum, academic year and objective." footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button loading={create.isPending} onClick={f.handleSubmit((v) => create.mutate(v))}>Save configuration</Button></>}>
        <div className="space-y-3">
          <Field label="Name" required htmlFor="a-name" error={f.formState.errors.name?.message}><Input id="a-name" {...f.register("name")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Layer" htmlFor="a-layer"><Select id="a-layer" {...f.register("layer")}><option value="baseline">Initial baseline</option><option value="continuous">Continuous</option><option value="progress">Periodic progress</option></Select></Field>
            <Field label="Academic year" htmlFor="a-year"><Select id="a-year" {...f.register("year")}>{ACADEMIC_YEARS.map((y) => <option key={y.id}>{y.label}</option>)}</Select></Field>
            <Field label="Grade" htmlFor="a-grade"><Select id="a-grade" {...f.register("gradeId", { onChange: () => f.setValue("objectiveIds", []) })}>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</Select></Field>
            <Field label="Subject" htmlFor="a-sub"><Select id="a-sub" {...f.register("subjectId", { onChange: () => f.setValue("objectiveIds", []) })}>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          </div>
          <p className="text-xs text-text-2">Curriculum: {CURRICULUM.name} v{CURRICULUM.version}</p>
          <Field label="Learning objectives" required error={f.formState.errors.objectiveIds?.message}>
            {objs.length === 0 ? <p className="text-sm text-text-2">No seeded objectives for this grade and subject. Try Grade 8 Mathematics.</p> : <Controller control={f.control} name="objectiveIds" render={({ field }) => <div className="flex flex-wrap gap-2">{objs.map((o) => { const on = field.value.includes(o.id); return <button key={o.id} type="button" aria-pressed={on} className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${on ? "border-primary bg-lilac text-primary" : "border-border"}`} onClick={() => field.onChange(on ? field.value.filter((x) => x !== o.id) : [...field.value, o.id])}>{on && "✓ "}{o.code} {o.title}</button>; })}</div>} />}
          </Field>
          <div className="flex items-center justify-between rounded-xl bg-surface-2 p-3"><div><p className="text-sm font-semibold">Mandatory</p><p className="text-xs text-text-2">{lay === "baseline" ? "Baselines are always mandatory at first login." : "Students must complete this."}</p></div><Controller control={f.control} name="mandatory" render={({ field }) => <Switch label="Mandatory" checked={lay === "baseline" ? true : field.value} disabled={lay === "baseline"} onChange={field.onChange} />} /></div>
        </div>
      </Modal>
    </div>
  );
}
