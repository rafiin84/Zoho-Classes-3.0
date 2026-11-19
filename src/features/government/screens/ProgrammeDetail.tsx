"use client";
import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, EmptyState, ErrorState, PageHeader, Progress, Segmented, StatTile, StatusBadge, Skeleton, Modal, Field, Textarea, toast, ConfirmDialog } from "@/components/ui";
import { BarChart, LineChart } from "@/components/charts";
import { Pause, Play, CheckCircle, XCircle, PencilSimple, Flag, Warning, Info } from "@phosphor-icons/react";
import type { ScreenProps } from "@/types/screens";
import type { ProgrammeRecord } from "@/types/government";
import { programmeService } from "@/lib/api/programmeService";
import { distributionService } from "@/lib/api/distributionService";
import { aiTeacherService, isDeployed } from "@/lib/api/aiTeacherService";
import { DISTRICTS, SRC } from "@/lib/mock-data/government";
import { GRADES, subjectById, objectiveById } from "@/lib/mock-data/core";
import { fmtDate, fmtMoney, relTime } from "@/lib/format";
import { Crumbs, DecisionDialog, G, Panel, Src, errMsg, DemoBanner } from "../components/shared";

type Tab = "delivery" | "outcomes" | "interventions" | "assignments" | "risks" | "history";

export default function ProgrammeDetail({ params }: ScreenProps) {
  const id = params.id; const qc = useQueryClient();
  const q = useQuery({ queryKey: ["gov", "programme", id], queryFn: () => programmeService.get(id) });
  const res = useQuery({ queryKey: ["gov", "resources", "wizard"], queryFn: () => distributionService.resources({}) });
  const ai = useQuery({ queryKey: ["gov", "ai-teachers-all"], queryFn: () => aiTeacherService.list() });
  const [tab, setTab] = React.useState<Tab>("delivery");
  const [dec, setDec] = React.useState<"approved" | "rejected" | null>(null);
  const [pauseOpen, setPauseOpen] = React.useState(false); const [reason, setReason] = React.useState(""); const [completeOpen, setCompleteOpen] = React.useState(false);
  const inv = () => { qc.invalidateQueries({ queryKey: ["gov"] }); };
  const act = useMutation({ mutationFn: (fn: () => Promise<ProgrammeRecord>) => fn(), onSuccess: () => inv(), onError: (e) => toast.error("Action failed", errMsg(e)) });

  if (q.isLoading) return <div className="space-y-3"><Skeleton className="h-10 w-72" /><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const p = q.data;
  if (!p) return <EmptyState title="Programme not found" body="It may have been removed. Return to the list." action={{ label: "All programmes", href: G("programmes") }} />;
  const d = p.delivery;
  const budgetPct = p.budget ? Math.round((d.budgetUsed / p.budget) * 100) : 0;
  const started = ["active", "paused", "completed"].includes(p.status);

  return (
    <div>
      <Crumbs items={[{ label: "Learning Programmes", href: G("programmes") }, { label: p.name }]} />
      <PageHeader title={p.name} eyebrow={<div className="flex flex-wrap gap-2"><StatusBadge status={p.status} label={p.status.replace("-", " ")} /><Badge tone="neutral">{p.phase}</Badge>{p.statewide && <Badge tone="warning">Statewide</Badge>}{p.origin === "ai-proposal" && <Badge tone="ai">AI proposal</Badge>}</div>} subtitle={p.objective}
        actions={<>
          {["draft", "rejected"].includes(p.status) && <Button asChild variant="outline"><Link href={`${G("programmes/new")}?edit=${p.id}`}><PencilSimple size={16} />Continue editing</Link></Button>}
          {p.status === "awaiting-approval" && <><Button variant="danger" onClick={() => setDec("rejected")}><XCircle size={16} />Reject</Button><Button variant="success" onClick={() => setDec("approved")}><CheckCircle size={16} />Approve</Button></>}
          {p.status === "active" && <><Button variant="outline" onClick={() => setPauseOpen(true)}><Pause size={16} />Pause</Button><Button variant="outline" onClick={() => setCompleteOpen(true)}><Flag size={16} />Mark complete</Button></>}
          {p.status === "paused" && <><Button onClick={() => act.mutate(() => programmeService.resume(p.id), { onSuccess: () => { inv(); toast.success("Programme resumed"); } })}><Play size={16} />Resume</Button><Button variant="outline" onClick={() => setCompleteOpen(true)}>Mark complete</Button></>}
        </>} />
      <DemoBanner />
      {p.status === "awaiting-approval" && <div role="status" className="mb-4 rounded-xl bg-warning-soft p-3 text-sm"><strong>Awaiting approval.</strong> Nothing has been distributed. {p.statewide ? "Statewide launch needs explicit human approval with notes." : "Approval needs approver notes."}</div>}
      {p.status === "rejected" && <div role="status" className="mb-4 rounded-xl bg-danger-soft p-3 text-sm"><strong>Rejected.</strong> {p.rejectionReason ?? p.approverNotes}. Edit and resubmit.</div>}
      {p.approverNotes && p.status !== "rejected" && <div className="mb-4 rounded-xl bg-surface-2 p-3 text-sm"><strong>Approver notes{p.approvedBy ? ` (${p.approvedBy})` : ""}:</strong> {p.approverNotes}</div>}

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Programme metrics">
        <StatTile label="Distributed" value={`${d.distributedPct}%`} hint="of scoped institutions" />
        <StatTile label="Participation" value={`${d.participationPct}%`} hint={`target ${p.participationTarget}%`} />
        <StatTile label="Completion" value={`${d.completionPct}%`} />
        <StatTile label="Baseline avg" value={d.baselineAvg ? `${d.baselineAvg}%` : "n/a"} hint="original, locked" />
        <StatTile label="Follow-up avg" value={d.followUpAvg ? `${d.followUpAvg}%` : "Pending"} hint={d.followUpAvg ? `+${d.followUpAvg - d.baselineAvg} pts` : "no follow-up yet"} />
      </section>
      <Src text={`${SRC.programmes}. Demo data.`} className="-mt-2 mb-4" />

      <div className="mb-4"><Segmented<Tab> label="Programme sections" value={tab} onChange={setTab} options={[{ value: "delivery", label: "Delivery" }, { value: "outcomes", label: "Outcomes" }, { value: "interventions", label: "Interventions", count: p.interventions.length }, { value: "assignments", label: "Resources & AI Teachers" }, { value: "risks", label: "Risks", count: p.risks.length }, { value: "history", label: "History" }]} /></div>

      {tab === "delivery" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Distribution and participation" src={SRC.programmes}>{!started ? <EmptyState title="Not started" body="Delivery tracking begins once the programme is approved and launched." /> : (
            <div className="space-y-3">{[["Distributed to institutions", d.distributedPct], ["Student participation", d.participationPct], ["Completion", d.completionPct]].map(([l, v]) => <div key={l as string}><div className="mb-1 flex justify-between text-sm"><span>{l}</span><span className="tnum font-semibold">{v}%</span></div><Progress value={v as number} label={l as string} /></div>)}</div>)}</Panel>
          <Panel title="Budget and resource utilisation" subtitle="Where data is available" src={`${SRC.programmes}. Budget figures are demo estimates.`}>{p.budget ? <div><p className="tnum text-2xl font-bold">{fmtMoney(d.budgetUsed)} <span className="text-sm font-normal text-text-2">of {fmtMoney(p.budget)}</span></p><Progress value={budgetPct} tone={budgetPct > 90 ? "danger" : "primary"} label="Budget used" className="mt-2" /><p className="mt-1 text-xs text-text-2">{budgetPct}% utilised. Resources assigned: {p.resourceIds.length}.</p></div> : <EmptyState title="No budget set" body="Budget was left empty for this programme." />}</Panel>
          <Panel title="Scope" className="lg:col-span-2"><dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs text-text-2">Grades</dt><dd>{p.grades.map((g) => GRADES.find((x) => x.id === g)?.label).join(", ")}</dd></div><div><dt className="text-xs text-text-2">Subjects</dt><dd>{p.subjects.map((s) => subjectById(s).name).join(", ")}</dd></div><div><dt className="text-xs text-text-2">Schedule</dt><dd>{fmtDate(p.start)} to {fmtDate(p.end)}</dd></div><div className="sm:col-span-3"><dt className="text-xs text-text-2">Districts ({p.districtIds.length})</dt><dd>{p.districtIds.map((x) => DISTRICTS.find((d) => d.id === x)?.name).join(", ")}</dd></div><div className="sm:col-span-3"><dt className="text-xs text-text-2">Learning objectives</dt><dd className="flex flex-wrap gap-1.5">{p.objectiveIds.map((o) => <Badge key={o} tone="primary">{objectiveById(o)?.code ?? o}</Badge>)}</dd></div></dl></Panel>
        </div>
      )}

      {tab === "outcomes" && (
        <Panel title="Baseline vs follow-up" subtitle="Follow-up results are compared with the ORIGINAL baseline. The baseline is never overwritten." src={SRC.followUp}>
          {!d.followUpAvg ? <EmptyState title="Follow-up pending" body="No follow-up assessment is complete yet. The original baseline stays locked and will be the comparison point." /> : (
            <div className="grid gap-5 lg:grid-cols-2"><LineChart ariaLabel="Programme baseline vs follow-up" labels={["Baseline", "Follow-up 1"]} min={d.baselineAvg - 8} max={d.followUpAvg + 8} unit="%" series={[{ name: "Original baseline (locked)", values: [d.baselineAvg, d.baselineAvg], dashed: true, color: "#9A93F5" }, { name: "Programme participants", values: [d.baselineAvg, d.followUpAvg] }]} />
              <div className="space-y-2 text-sm"><p className="tnum text-3xl font-bold text-success">+{d.followUpAvg - d.baselineAvg} pts</p><p>Target was +{p.improvementTarget} pts.</p><p className="rounded-xl bg-surface-2 p-3 text-xs text-text-2"><Info size={12} className="mr-1 inline" />This is an association among participants. Participants may differ from non-participants, so it is not proof the programme caused the change.</p></div></div>)}
        </Panel>
      )}

      {tab === "interventions" && (p.interventions.length === 0 ? <EmptyState title="No interventions planned" body="Interventions are added in step 6 of the creation workflow." /> : (
        <ul className="grid gap-3 md:grid-cols-2">{p.interventions.map((i) => <li key={i.id} className="rounded-2xl border border-border bg-surface p-4"><div className="flex items-start justify-between gap-2"><p className="font-semibold">{i.title}</p><StatusBadge status={i.status === "delayed" ? "overdue" : i.status === "running" ? "active" : i.status === "done" ? "completed" : "scheduled"} label={i.status} /></div><p className="mt-1 text-xs text-text-2">{i.kind.replace(/-/g, " ")} · {i.audience}</p></li>)}</ul>))}

      {tab === "assignments" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Resource assignments">{p.resourceIds.length === 0 ? <EmptyState title="No resources assigned" body="Add curriculum-mapped resources in step 3." /> : <ul className="space-y-1.5 text-sm">{p.resourceIds.map((r) => { const rr = res.data?.find((x) => x.id === r); return <li key={r} className="flex justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2"><span className="min-w-0 truncate">{rr?.title ?? r}</span><Badge tone="neutral">{rr?.type ?? "resource"}</Badge></li>; })}</ul>}</Panel>
          <Panel title="AI Teacher assignments" subtitle="State-approved AI Teachers only. Distinct from students' personal AI Tutor.">{p.aiTeacherIds.length === 0 ? <EmptyState title="No AI Teachers assigned" body="Assign approved AI Teachers in step 7, where authorised." /> : <ul className="space-y-1.5 text-sm">{p.aiTeacherIds.map((a) => { const t = ai.data?.find((x) => x.id === a); return <li key={a} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2"><span>{t?.name ?? a} <span className="text-xs text-text-2">{t?.subject}</span></span>{t && <StatusBadge status={isDeployed(t) ? "active" : t.status} label={isDeployed(t) ? "Deployed" : t.status.replace("-", " ")} />}</li>; })}</ul>}</Panel>
        </div>
      )}

      {tab === "risks" && (p.risks.length === 0 ? <EmptyState title="No risks or delays recorded" body="Risks appear here when delivery data shows delays or coverage gaps." /> : (
        <ul className="space-y-2">{p.risks.map((r) => <li key={r.id} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4"><Warning size={20} className={r.level === "high" ? "text-danger" : r.level === "medium" ? "text-warning" : "text-text-2"} weight="fill" /><div><Badge tone={r.level === "high" ? "danger" : r.level === "medium" ? "warning" : "neutral"}>{r.level} risk</Badge><p className="mt-1 text-sm">{r.text}</p></div></li>)}</ul>))}

      {tab === "history" && <Panel title="Audit history"><ol className="space-y-2 text-sm">{p.history.map((h, i) => <li key={i} className="flex gap-3"><span className="w-28 shrink-0 text-xs text-text-2">{relTime(h.at)}</span><span>{h.text}</span></li>)}</ol></Panel>}

      <DecisionDialog open={dec !== null} onOpenChange={(o) => !o && setDec(null)} decision={dec ?? "approved"} title={dec === "rejected" ? `Reject ${p.name}` : `Approve ${p.name}`} subtitle={p.statewide ? "This is a statewide launch." : undefined} requireConfirm={p.statewide} confirmLabel="I confirm explicit human approval for this statewide launch."
        onSubmit={async (notes, ok) => { if (dec === "rejected") await programmeService.reject(p.id, "Secretary, School Education (demo)", notes); else await programmeService.approve(p.id, "Secretary, School Education (demo)", notes, ok); inv(); toast.success(dec === "rejected" ? "Programme rejected" : "Programme approved and launched"); }} />
      <Modal open={pauseOpen} onOpenChange={setPauseOpen} title="Pause programme?" description="Distribution and reminders stop. Students keep access to what they already have." footer={<><Button variant="ghost" onClick={() => setPauseOpen(false)}>Cancel</Button><Button variant="danger" onClick={() => act.mutate(() => programmeService.pause(p.id, reason), { onSuccess: () => { inv(); setPauseOpen(false); setReason(""); toast.success("Programme paused"); } })}>Pause programme</Button></>}>
        <Field label="Reason" htmlFor="pause-r" optional><Textarea id="pause-r" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </Modal>
      <ConfirmDialog open={completeOpen} onOpenChange={setCompleteOpen} title="Mark programme complete?" body="Outcomes are archived against the original baseline. This cannot be undone." confirmLabel="Mark complete" onConfirm={() => act.mutate(() => programmeService.complete(p.id), { onSuccess: () => { inv(); toast.success("Programme completed"); } })} />
    </div>
  );
}
