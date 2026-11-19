"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardBody, Field, Input, Textarea, Select, Switch, Stepper, Badge, AIBadge, Skeleton, EmptyState, toast, cn, ConfirmDialog } from "@/components/ui";
import { FloppyDisk, ArrowLeft, ArrowRight, PaperPlaneTilt, Plus, X, Warning, CheckCircle } from "@phosphor-icons/react";
import type { ProgrammeDraft, Intervention } from "@/types/government";
import { programmeService, emptyDraft, validateForSubmit } from "@/lib/api/programmeService";
import { distributionService } from "@/lib/api/distributionService";
import { governmentService } from "@/lib/api/governmentService";
import { aiTeacherService, isDeployed } from "@/lib/api/aiTeacherService";
import { GRADES, SUBJECTS, OBJECTIVES, CURRICULUM, ACADEMIC_YEARS, subjectById } from "@/lib/mock-data/core";
import { fmtMoney, fmtDate } from "@/lib/format";
import { errMsg, G, Src } from "./shared";
import { SRC } from "@/lib/mock-data/government";

export const STEPS = ["Objective", "Learning objectives", "Resources", "Baseline", "Districts", "Interventions", "AI Teachers", "Schedule & targets", "Review & submit", "Track outcomes"];

const schema = z.object({
  name: z.string().min(4, "Name needs 4+ characters"), phase: z.string().min(1, "Choose a phase"),
  objective: z.string().min(20, "Describe the objective in 20+ characters"), grades: z.array(z.string()).min(1, "Select at least one grade"), subjects: z.array(z.string()).min(1, "Select at least one subject"),
  objectiveIds: z.array(z.string()).min(1, "Select at least one learning objective"), resourceIds: z.array(z.string()),
  baseline: z.object({ enabled: z.boolean(), mandatory: z.boolean(), curriculum: z.string().min(1), year: z.string().min(1), windowDays: z.number().min(3, "At least 3 days").max(60, "At most 60 days"), questionCount: z.number().min(10, "At least 10 questions").max(60, "At most 60 questions") }),
  districtIds: z.array(z.string()).min(1, "Select at least one district"), institutionNote: z.string(),
  interventions: z.array(z.any()), aiTeacherIds: z.array(z.string()),
  start: z.string().min(1, "Set a start date"), end: z.string().min(1, "Set an end date"),
  participationTarget: z.number().min(10, "10–100").max(100, "10–100"), improvementTarget: z.number().min(1, "1–40 points").max(40, "1–40 points"), budget: z.number().min(0, "Cannot be negative"),
}).refine((v) => v.end > v.start, { path: ["end"], message: "End must be after start" }).refine((v) => v.baseline.enabled, { path: ["baseline", "enabled"], message: "A baseline is required to compare outcomes against" });

const STEP_FIELDS: (string[])[] = [["name", "phase", "objective", "grades", "subjects"], ["objectiveIds"], ["resourceIds"], ["baseline"], ["districtIds"], ["interventions"], ["aiTeacherIds"], ["start", "end", "participationTarget", "improvementTarget", "budget"], [], []];

function Chips<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string; hint?: string; disabled?: boolean }[]; value: T[]; onChange: (v: T[]) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => { const on = value.includes(o.id); return (
        <button key={o.id} type="button" disabled={o.disabled} aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])} title={o.hint}
          className={cn("min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors disabled:opacity-50", on ? "border-primary bg-lilac text-primary" : "border-border bg-surface text-text-2 hover:bg-surface-2")}>{on && "✓ "}{o.label}</button>); })}
    </div>
  );
}

export function ProgrammeWizard({ editId, prefillObjectives }: { editId?: string; prefillObjectives?: string[] }) {
  const router = useRouter(); const qc = useQueryClient();
  const [step, setStep] = React.useState(0);
  const [draftId, setDraftId] = React.useState<string | undefined>(editId);
  const [submitted, setSubmitted] = React.useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = React.useState(false);
  const [subErrors, setSubErrors] = React.useState<string[]>([]);
  const form = useForm<ProgrammeDraft>({ resolver: zodResolver(schema) as never, defaultValues: emptyDraft(), mode: "onTouched" });
  const { register, control, watch, setValue, trigger, getValues, reset, formState: { errors, isDirty } } = form;
  const v = watch();

  const existing = useQuery({ queryKey: ["gov", "programme", editId], queryFn: () => programmeService.get(editId!), enabled: !!editId });
  React.useEffect(() => { if (existing.data) { reset(existing.data); setStep(Math.min(existing.data.step, 8)); } }, [existing.data, reset]);
  React.useEffect(() => {
    if (prefillObjectives?.length && !editId) {
      const objs = OBJECTIVES.filter((o) => prefillObjectives.includes(o.id));
      if (objs.length) { setValue("objectiveIds", objs.map((o) => o.id)); setValue("subjects", [...new Set(objs.map((o) => o.subjectId))]); setValue("grades", [...new Set(objs.map((o) => o.gradeId))]); setValue("name", "Remedial programme for identified learning gaps"); setValue("objective", `Close learning gaps identified from baseline results on: ${objs.map((o) => o.code).join(", ")}.`); }
    }
  }, [prefillObjectives, editId, setValue]);
  React.useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (isDirty && !submitted) e.preventDefault(); }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [isDirty, submitted]);

  const resources = useQuery({ queryKey: ["gov", "resources", "wizard"], queryFn: () => distributionService.resources({}) });
  const aiTeachers = useQuery({ queryKey: ["gov", "ai-teachers-all"], queryFn: () => aiTeacherService.list() });
  const districts = useQuery({ queryKey: ["gov", "districts", false], queryFn: () => governmentService.districts(false) });

  const save = useMutation({
    mutationFn: (opts: { step: number; quiet?: boolean }) => programmeService.saveDraft(getValues(), draftId, opts.step + 1),
    onSuccess: (p, o) => { setDraftId(p.id); qc.invalidateQueries({ queryKey: ["gov", "programmes"] }); if (!o.quiet) toast.success("Draft saved", "You can resume it from Learning Programmes."); reset(getValues()); },
    onError: (e) => toast.error("Could not save draft", errMsg(e)),
  });
  const submit = useMutation({
    mutationFn: async () => { const p = await programmeService.saveDraft(getValues(), draftId, 9); setDraftId(p.id); return programmeService.submit(p.id); },
    onSuccess: (p) => { qc.invalidateQueries({ queryKey: ["gov"] }); setSubmitted(p.id); toast.success("Submitted for approval", "An authorised official must approve before anything launches."); },
    onError: (e) => toast.error("Could not submit", errMsg(e)),
  });

  const next = async () => {
    const ok = await trigger(STEP_FIELDS[step] as never[]);
    if (!ok) { toast.warning("Fix the highlighted fields", "Each step is validated before you continue."); return; }
    if (getValues("name").trim().length >= 2) save.mutate({ step, quiet: true });
    setStep((s) => Math.min(s + 1, 8));
  };
  const prepareSubmit = () => { const errs = validateForSubmit(getValues()); setSubErrors(errs); if (errs.length) { toast.error("Not ready to submit", errs[0]); return; } setConfirmSubmit(true); };

  if (editId && existing.isLoading) return <Skeleton className="h-96 w-full" />;
  if (submitted) return (
    <Card><CardBody className="text-center">
      <CheckCircle size={44} weight="duotone" className="mx-auto text-success" />
      <h2 className="mt-2 text-heading">Submitted for approval</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-text-2">{v.name} is now awaiting approval by an authorised official. {v.districtIds.length === 12 ? "Because it is statewide, explicit human confirmation is required before launch." : "Nothing launches until it is approved."}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2"><Button onClick={() => router.push(G(`programmes/${submitted}`))}>Open programme (step 10: track)</Button><Button variant="outline" onClick={() => router.push(G("governance"))}>Go to approvals queue</Button></div>
    </CardBody></Card>
  );

  const objsAvail = OBJECTIVES.filter((o) => (!v.subjects.length || v.subjects.includes(o.subjectId)) && (!v.grades.length || v.grades.includes(o.gradeId)));
  const resAvail = (resources.data ?? []).filter((r) => (v.objectiveIds.length ? r.objectiveId && v.objectiveIds.includes(r.objectiveId) : true) && r.approval === "approved");
  const estStudents = (districts.data ?? []).filter((d) => v.districtIds.includes(d.id)).reduce((a, d) => a + d.students, 0);
  const err = (k: string) => (errors as Record<string, { message?: string }>)[k]?.message;

  return (
    <div>
      <div className="mb-4 overflow-x-auto"><Stepper steps={STEPS} current={step} /></div>
      <Card><CardBody className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-heading">Step {step + 1} of 10: {STEPS[step]}</h2>{draftId && <Badge tone="neutral">Draft saved</Badge>}</div>

        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Programme name" required error={err("name")} htmlFor="p-name" className="sm:col-span-2"><Input id="p-name" {...register("name")} placeholder="e.g. State-wide Mathematics Improvement" aria-invalid={!!err("name")} /></Field>
            <Field label="Phase" required error={err("phase")} htmlFor="p-phase"><Select id="p-phase" {...register("phase")}><option>Phase 1</option><option>Phase 2</option><option>Phase 3</option><option>Pilot</option></Select></Field>
            <div />
            <Field label="Objective" required error={err("objective")} htmlFor="p-obj" hint="What should change for students, and by how much?" className="sm:col-span-2"><Textarea id="p-obj" {...register("objective")} aria-invalid={!!err("objective")} /></Field>
            <Field label="Target grades" required error={err("grades")} className="sm:col-span-2"><Controller control={control} name="grades" render={({ field }) => <Chips label="Target grades" options={GRADES.map((g) => ({ id: g.id, label: g.label }))} value={field.value} onChange={field.onChange} />} /></Field>
            <Field label="Subjects" required error={err("subjects")} className="sm:col-span-2"><Controller control={control} name="subjects" render={({ field }) => <Chips label="Subjects" options={SUBJECTS.map((s) => ({ id: s.id, label: s.name }))} value={field.value} onChange={field.onChange} />} /></Field>
          </div>
        )}

        {step === 1 && (
          <Field label={`Curriculum learning objectives (${CURRICULUM.name} v${CURRICULUM.version})`} required error={err("objectiveIds")} hint="From the state curriculum. Showing objectives for the selected grades and subjects.">
            {objsAvail.length === 0 ? <EmptyState title="No objectives match your grades and subjects" body="Go back and widen grades or subjects." action={{ label: "Back to step 1", onClick: () => setStep(0) }} /> :
              <Controller control={control} name="objectiveIds" render={({ field }) => <Chips label="Learning objectives" options={objsAvail.map((o) => ({ id: o.id, label: `${o.code} ${o.title}`, hint: subjectById(o.subjectId).name }))} value={field.value} onChange={field.onChange} />} />}
          </Field>
        )}

        {step === 2 && (
          <Field label="Curriculum-mapped resources" hint="Only approved resources mapped to your objectives are listed. Unapproved items cannot be distributed.">
            {resources.isLoading ? <Skeleton className="h-32" /> : resAvail.length === 0 ? <EmptyState title="No approved resources mapped to these objectives" body="Select different objectives, or add mapped resources in Content Distribution. You can continue without resources and add them later." /> :
              <Controller control={control} name="resourceIds" render={({ field }) => <Chips label="Resources" options={resAvail.map((r) => ({ id: r.id, label: r.title, hint: `${r.type} · ${r.language}` }))} value={field.value} onChange={field.onChange} />} />}
            <p className="mt-2 text-xs text-text-2">{v.resourceIds.length} selected of {resAvail.length} available.</p>
          </Field>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-lilac/50 p-3"><div><p className="font-semibold">Baseline / diagnostic assessment</p><p className="text-xs text-text-2">Shown at each student's first login. Required so follow-up results compare with the original baseline.</p></div><Controller control={control} name="baseline.enabled" render={({ field }) => <Switch label="Baseline enabled" checked={field.value} onChange={field.onChange} />} /></div>
            {err("baseline") && <p role="alert" className="text-sm text-danger">{(errors.baseline as { enabled?: { message?: string } })?.enabled?.message}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mandatory at first login" htmlFor="b-man"><div className="pt-1"><Controller control={control} name="baseline.mandatory" render={({ field }) => <Switch id="b-man" label="Mandatory" checked={field.value} onChange={field.onChange} />} /></div></Field>
              <Field label="Academic year" htmlFor="b-year"><Select id="b-year" {...register("baseline.year")}>{ACADEMIC_YEARS.map((y) => <option key={y.id}>{y.label}</option>)}</Select></Field>
              <Field label="Curriculum" htmlFor="b-cur"><Select id="b-cur" {...register("baseline.curriculum")}><option>{CURRICULUM.name}</option></Select></Field>
              <Field label="Completion window (days)" htmlFor="b-win" error={(errors.baseline as { windowDays?: { message?: string } })?.windowDays?.message}><Input id="b-win" type="number" {...register("baseline.windowDays", { valueAsNumber: true })} /></Field>
              <Field label="Questions per student" htmlFor="b-q" error={(errors.baseline as { questionCount?: { message?: string } })?.questionCount?.message}><Input id="b-q" type="number" {...register("baseline.questionCount", { valueAsNumber: true })} /></Field>
            </div>
            <p className="text-xs text-text-2">Configured by grade ({v.grades.length || 0}), subject ({v.subjects.length || 0}), curriculum, academic year and {v.objectiveIds.length} objective(s). Baselines are locked once students complete them.</p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Field label="Districts in scope" required error={err("districtIds")}>
              <Controller control={control} name="districtIds" render={({ field }) => (
                <div className="space-y-2"><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => field.onChange((districts.data ?? []).map((d) => d.id))}>Select all 12 (statewide)</Button><Button type="button" size="sm" variant="ghost" onClick={() => field.onChange([])}>Clear</Button></div>
                  <Chips label="Districts" options={(districts.data ?? []).map((d) => ({ id: d.id, label: d.name, hint: `${d.region}, baseline coverage ${d.baselineCoverage}%` }))} value={field.value} onChange={field.onChange} /></div>)} />
            </Field>
            <Field label="Institutions / classes note" htmlFor="p-inst" hint="Narrow to institutions, branches or class groups if needed."><Input id="p-inst" {...register("institutionNote")} /></Field>
            <p className="tnum text-sm text-text-2">About {estStudents.toLocaleString("en-IN")} students in scope (demo scale). {v.districtIds.length === 12 && <Badge tone="warning">Statewide: explicit human approval required</Badge>}</p>
            <Src text={SRC.scale} />
          </div>
        )}

        {step === 5 && <InterventionStep value={v.interventions} onChange={(x) => setValue("interventions", x, { shouldDirty: true })} />}

        {step === 6 && (
          <Field label="Assign state-approved AI Teachers (where authorised)" hint="AI Teachers are distinct from students' personal AI Tutor. Only approved AI Teachers can be assigned; unapproved ones are never shown as deployed.">
            {aiTeachers.isLoading ? <Skeleton className="h-24" /> : (
              <Controller control={control} name="aiTeacherIds" render={({ field }) => (
                <ul className="space-y-2">{(aiTeachers.data ?? []).filter((t) => t.status !== "retired").map((t) => { const ok = t.status === "approved"; const on = field.value.includes(t.id); return (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"><div className="min-w-0 flex-1"><p className="font-semibold">{t.name} <span className="text-xs font-normal text-text-2">{t.subject} · {t.grade}</span></p><p className="text-xs text-text-2">{t.owner} · {isDeployed(t) ? "Deployed in classes" : ok ? "Approved, not yet deployed" : `Not approved (${t.status}), cannot be assigned`}</p></div>
                    <Badge tone={ok ? "success" : "warning"}>{ok ? "Approved" : t.status.replace("-", " ")}</Badge><Button type="button" size="sm" variant={on ? "soft" : "outline"} disabled={!ok} onClick={() => field.onChange(on ? field.value.filter((x: string) => x !== t.id) : [...field.value, t.id])}>{on ? "Assigned ✓" : "Assign"}</Button></li>); })}</ul>)} />)}
            <p className="mt-2 text-xs text-text-2">Optional. You can continue without an AI Teacher.</p>
          </Field>
        )}

        {step === 7 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" required htmlFor="s-start" error={err("start")}><Input id="s-start" type="date" {...register("start")} /></Field>
            <Field label="End date" required htmlFor="s-end" error={err("end")}><Input id="s-end" type="date" {...register("end")} /></Field>
            <Field label="Participation target (%)" htmlFor="s-part" error={err("participationTarget")}><Input id="s-part" type="number" {...register("participationTarget", { valueAsNumber: true })} /></Field>
            <Field label="Improvement target (points vs baseline)" htmlFor="s-imp" error={err("improvementTarget")}><Input id="s-imp" type="number" {...register("improvementTarget", { valueAsNumber: true })} /></Field>
            <Field label="Budget (INR, demo estimate)" htmlFor="s-bud" error={err("budget")} hint="Optional. Illustrative planning figure."><Input id="s-bud" type="number" {...register("budget", { valueAsNumber: true })} /></Field>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {([["Name", `${v.name} (${v.phase})`], ["Objective", v.objective], ["Grades & subjects", `${v.grades.map((g) => GRADES.find((x) => x.id === g)?.label).join(", ")} · ${v.subjects.map((s) => subjectById(s).name).join(", ")}`], ["Learning objectives", `${v.objectiveIds.length} selected`], ["Resources", `${v.resourceIds.length} selected`], ["Baseline", v.baseline.enabled ? `${v.baseline.mandatory ? "Mandatory" : "Optional"} · ${v.baseline.questionCount} questions · ${v.baseline.windowDays}-day window · ${v.baseline.year}` : "Disabled"], ["Scope", `${v.districtIds.length} districts, about ${estStudents.toLocaleString("en-IN")} students (demo)`], ["Interventions", `${v.interventions.length} planned`], ["AI Teachers", v.aiTeacherIds.length ? `${v.aiTeacherIds.length} assigned` : "None"], ["Schedule", `${v.start ? fmtDate(v.start) : "-"} to ${v.end ? fmtDate(v.end) : "-"}`], ["Targets", `${v.participationTarget}% participation · +${v.improvementTarget} pts`], ["Budget", v.budget ? fmtMoney(v.budget) : "Not set"]] as [string, string][]).map(([k, val]) => <div key={k} className="rounded-xl bg-surface-2 p-3"><p className="text-xs font-semibold text-text-2">{k}</p><p className="text-sm">{val}</p></div>)}
            </div>
            {subErrors.length > 0 && <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm"><p className="flex items-center gap-1.5 font-semibold text-danger"><Warning size={16} />Fix before submitting</p><ul className="mt-1 list-disc pl-5">{subErrors.map((e) => <li key={e}>{e}</li>)}</ul></div>}
            <div className="rounded-xl bg-lilac/50 p-3 text-sm"><p className="flex items-center gap-2 font-semibold"><AIBadge label="AI suggests" />Authorised officials and academic experts approve.</p><p className="mt-1 text-text-2">Submitting sends this programme to the approvals queue. {v.districtIds.length === 12 ? "Statewide launch requires explicit human approval with notes." : "Approval requires approver notes."} Nothing launches automatically.</p></div>
          </div>
        )}

        {step === 9 && <p className="text-sm text-text-2">After approval, track delivery and outcomes on the programme page.</p>}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={() => (step === 0 ? router.push(G("programmes")) : setStep(step - 1))}><ArrowLeft size={16} />{step === 0 ? "Cancel" : "Back"}</Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" loading={save.isPending} onClick={() => save.mutate({ step })}><FloppyDisk size={16} />Save draft</Button>
            {step < 8 ? <Button type="button" onClick={next}>Next<ArrowRight size={16} /></Button> : <Button type="button" loading={submit.isPending} onClick={prepareSubmit}><PaperPlaneTilt size={16} />Submit for approval</Button>}
          </div>
        </div>
      </CardBody></Card>
      <ConfirmDialog open={confirmSubmit} onOpenChange={setConfirmSubmit} title="Submit for approval?" body={`${v.name} will be sent to the approvals queue. It will not launch until an authorised official approves it.`} confirmLabel="Submit" onConfirm={() => submit.mutate()} />
    </div>
  );
}

function InterventionStep({ value, onChange }: { value: Intervention[]; onChange: (v: Intervention[]) => void }) {
  const [title, setTitle] = React.useState(""); const [kind, setKind] = React.useState<Intervention["kind"]>("remedial-course"); const [aud, setAud] = React.useState(""); const [err, setErr] = React.useState("");
  const add = () => {
    if (title.trim().length < 4) return setErr("Describe the intervention (4+ characters).");
    if (aud.trim().length < 3) return setErr("Say who it is for.");
    onChange([...value, { id: `iv-${Date.now().toString(36)}`, title: title.trim(), kind, status: "planned", audience: aud.trim() }]); setTitle(""); setAud(""); setErr("");
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-2">Plan remedial courses and interventions for the gaps this programme targets.</p>
      <div className="grid gap-3 rounded-xl bg-surface-2 p-3 sm:grid-cols-6">
        <Field label="Intervention" htmlFor="iv-t" className="sm:col-span-3"><Input id="iv-t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fractions remedial course" /></Field>
        <Field label="Type" htmlFor="iv-k" className="sm:col-span-3"><Select id="iv-k" value={kind} onChange={(e) => setKind(e.target.value as Intervention["kind"])}><option value="remedial-course">Remedial course</option><option value="practice-set">Practice sets</option><option value="ai-teacher-support">AI Teacher support</option><option value="teacher-workshop">Teacher workshop</option><option value="peer-group">Peer learning group</option></Select></Field>
        <Field label="Audience" htmlFor="iv-a" error={err} className="sm:col-span-4"><Input id="iv-a" value={aud} onChange={(e) => setAud(e.target.value)} placeholder="e.g. Grade 8 students below 40% on M8.3.x" /></Field>
        <div className="flex items-end sm:col-span-2"><Button type="button" className="w-full" variant="soft" onClick={add}><Plus size={16} />Add</Button></div>
      </div>
      {value.length === 0 ? <EmptyState title="No interventions yet" body="Add at least one remedial course or practice set, or continue and add interventions after approval." /> : (
        <ul className="space-y-2">{value.map((i) => <li key={i.id} className="flex items-center gap-3 rounded-xl border border-border p-3"><div className="min-w-0 flex-1"><p className="font-semibold">{i.title}</p><p className="text-xs text-text-2">{i.kind.replace(/-/g, " ")} · {i.audience}</p></div><Button type="button" size="iconSm" variant="ghost" aria-label={`Remove ${i.title}`} onClick={() => onChange(value.filter((x) => x.id !== i.id))}><X size={16} /></Button></li>)}</ul>)}
    </div>
  );
}
