"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Lightning, Play, Pause, RocketLaunch, Trash, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { PageHeader, Segmented, Card, CardBody, Badge, StatusBadge, Button, Modal, Drawer, Field, Input, Textarea, Select, Checkbox, Stepper, EmptyState, ListToolbar, NoResults, ConfirmDialog, SkeletonCards, toast, AIBadge } from "@/components/ui";
import type { ActionPreview, AgentRecord, AgentStatus, AutonomyLevel } from "@/types/teacher";
import { agentService, parseDescription, PROVIDERS, AUTONOMY_COPY, approvalReasons } from "@/lib/api/agentService";
import { fmtDateTime, relTime } from "@/lib/format";
import { useTeacher, Q, errMsg, KEYS, AiNotice } from "../components/common";

const STATUS_LABEL: Record<AgentStatus, string> = { draft: "Draft", testing: "Testing", "awaiting-approval": "Awaiting approval", published: "Published", paused: "Paused", failed: "Failed", retired: "Retired" };
const AUTONOMY_LABEL: Record<AutonomyLevel, string> = { suggest: "Suggest", assist: "Assist · approval required", autonomous: "Autonomous · low-risk only" };
const ALL_TOOLS = ["Draft lesson plan", "Generate MCQs", "Draft marks", "Draft feedback", "Flag students", "Propose remedial path", "Send reminder", "Compile report", "Post to class feed (after approval)", "Create assignment draft", "Draft content"];
const ALL_SCOPE = ["My classes", "Course structure", "Question bank", "Submissions", "Rubrics", "Learning profiles", "Assignments", "Class progress"];

export function AgentChips({ a }: { a: AgentRecord }) {
  return <div className="flex flex-wrap gap-1.5"><StatusBadge status={a.status} label={STATUS_LABEL[a.status]} /><Badge tone={a.autonomy === "autonomous" ? "warning" : "primary"} icon={<ShieldCheck size={12} />}>{AUTONOMY_LABEL[a.autonomy]}</Badge>{(a.effects.grades || a.effects.publishes || a.effects.touchesFees || a.effects.changesRecord) && <Badge tone="info">Always needs your review</Badge>}</div>;
}

export default function AgentsScreen() {
  const me = useTeacher(); const qc = useQueryClient();
  const [f, setF] = React.useState<"all" | AgentStatus>("all"); const [q, setQ] = React.useState(""); const [wiz, setWiz] = React.useState(false); const [sel, setSel] = React.useState<string | null>(null);
  const list = useQuery({ queryKey: [...KEYS.agents], queryFn: () => agentService.list({ ownerLevel: "teacher" }) });
  const inv = () => { qc.invalidateQueries({ queryKey: [...KEYS.agents] }); };
  const rows = (list.data ?? []).filter((a) => (f === "all" || a.status === f) && `${a.name} ${a.description}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Agents & Automations" subtitle="Describe a routine in plain language. Agents prepare work; you stay in control of anything that publishes, grades or notifies." actions={<Button onClick={() => setWiz(true)}><Plus size={16} />New agent</Button>} />
      <Card tone="lilac" className="mb-4"><CardBody className="text-sm"><strong>Bring your own AI.</strong> Pick a provider and add a key — Zoho does not supply an AI model. In this prototype nothing real is called and keys are masked demo labels.</CardBody></Card>
      <div className="mb-3"><Segmented label="Agent status" value={f} onChange={setF} options={[{ value: "all", label: "All" }, { value: "published", label: "Published" }, { value: "draft", label: "Draft" }, { value: "testing", label: "Testing" }, { value: "awaiting-approval", label: "Awaiting approval" }, { value: "paused", label: "Paused" }, { value: "failed", label: "Failed" }]} /></div>
      <ListToolbar query={q} onQuery={setQ} placeholder="Search agents" count={rows.length} hasFilters={f !== "all"} onClear={() => { setQ(""); setF("all"); }} />
      <Q q={list} skeleton={<SkeletonCards n={3} h="h-28" />} isEmpty={(d) => !d.length} empty={<EmptyState title="No agents yet" body="Create your first automation, for example weekly lesson plans." action={{ label: "New agent", onClick: () => setWiz(true) }} />}>
        {() => !rows.length ? <NoResults query={q} onClear={() => { setQ(""); setF("all"); }} /> : (
          <ul className="grid gap-3 sm:grid-cols-2">{rows.map((a) => <li key={a.id}><Card><CardBody className="space-y-2"><div className="flex items-start gap-2"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lilac text-primary"><Lightning size={18} /></span><div className="min-w-0"><h2 className="font-semibold">{a.name}</h2><p className="line-clamp-2 text-xs text-text-2">{a.description}</p></div></div><AgentChips a={a} /><p className="text-xs text-text-2">Trigger: {a.trigger.label}{a.lastRunAt ? ` · last run ${relTime(a.lastRunAt)}` : ""}</p><Button size="sm" variant="soft" onClick={() => setSel(a.id)}>Open</Button></CardBody></Card></li>)}</ul>
        )}
      </Q>
      {wiz && <AgentWizard owner={me} onClose={() => setWiz(false)} onDone={(id) => { inv(); setWiz(false); setSel(id); }} />}
      <AgentDetail id={sel} onClose={() => setSel(null)} onChanged={inv} />
    </div>
  );
}

function AgentWizard({ owner, onClose, onDone }: { owner: { id: string; plain: string }; onClose: () => void; onDone: (id: string) => void }) {
  const [step, setStep] = React.useState(0); const [nl, setNl] = React.useState("");
  const [d, setD] = React.useState<ReturnType<typeof parseDescription> | null>(null);
  const [provider, setProvider] = React.useState<(typeof PROVIDERS)[number]["id"]>("claude"); const [key, setKey] = React.useState("sk-••••••demo");
  const nlErr = nl.trim().length < 20 ? "Describe what the agent should do in at least 20 characters" : "";
  const parse = () => { setD(parseDescription(nl)); setStep(1); };
  const create = useMutation({ mutationFn: () => { const p = PROVIDERS.find((x) => x.id === provider)!; return agentService.create({ name: d!.name, description: d!.description ?? nl, nlDescription: nl, provider, model: p.model, keyLabel: key, dataScope: d!.dataScope!, tools: d!.tools!, autonomy: d!.autonomy!, trigger: d!.trigger!, effects: d!.effects!, ownerId: owner.id, ownerName: owner.plain, ownerLevel: "teacher" }); },
    onSuccess: (a) => { toast.success("Agent saved as a draft — test it before publishing"); onDone(a.id); }, onError: (e) => toast.error(errMsg(e)) });
  const set = (p: Partial<NonNullable<typeof d>>) => setD((x) => ({ ...x!, ...p }));
  const toggle = (k: "tools" | "dataScope", v: string, on: boolean) => set({ [k]: on ? [...(d![k] ?? []), v] : (d![k] ?? []).filter((y) => y !== v) } as any);
  const forced = d ? approvalReasons(d.effects!, "assist").filter((r) => /always/.test(r)) : [];
  const nameErr = d && d.name.trim().length < 3 ? "Name needs 3+ characters" : "";
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title="New agent" className="sm:max-w-2xl" footer={<>{step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}{step === 0 ? <Button disabled={!!nlErr} onClick={parse}><Sparkle size={16} />Configure from description</Button> : step === 1 ? <Button disabled={!!nameErr || !d!.tools?.length} onClick={() => setStep(2)}>Next</Button> : <Button loading={create.isPending} onClick={() => create.mutate()}>Save draft</Button>}</>}>
      <div className="space-y-4"><Stepper steps={["Describe", "Configure", "Provider & safety"]} current={step} />
        {step === 0 && <div className="space-y-2"><Field label="What should this agent do?" required error={nl && nlErr} hint="e.g. Every Sunday, draft next week's lesson plans for Grade 8B based on last week's gaps." htmlFor="ag-nl"><Textarea id="ag-nl" rows={5} value={nl} onChange={(e) => setNl(e.target.value)} /></Field><div className="flex flex-wrap gap-1.5">{["Every Friday compile a class report for Grade 8B", "After each chapter, generate a practice test", "Flag students who need attention every morning"].map((s) => <Button key={s} size="sm" variant="ghost" onClick={() => setNl(s + ".")}>{s}</Button>)}</div></div>}
        {step === 1 && d && <div className="space-y-3"><AiNotice>Mock parsing — fields were inferred from your words. Check each one.</AiNotice>{d.notes.map((n) => <p key={n} className="rounded-xl bg-warning-soft p-2 text-xs">{n}</p>)}
          <Field label="Name" required error={nameErr} htmlFor="ag-n"><Input id="ag-n" value={d.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <fieldset><legend className="mb-1 text-sm font-semibold">Tools & actions</legend><div className="grid gap-1.5 sm:grid-cols-2">{[...new Set([...ALL_TOOLS, ...(d.tools ?? [])])].map((x) => <Checkbox key={x} label={x} checked={!!d.tools?.includes(x)} onChange={(v) => toggle("tools", x, v)} />)}</div></fieldset>
          <fieldset><legend className="mb-1 text-sm font-semibold">Data it may read</legend><div className="grid gap-1.5 sm:grid-cols-2">{ALL_SCOPE.map((x) => <Checkbox key={x} label={x} checked={!!d.dataScope?.includes(x)} onChange={(v) => toggle("dataScope", x, v)} />)}</div></fieldset>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Trigger type" htmlFor="ag-tk"><Select id="ag-tk" value={d.trigger!.kind} onChange={(e) => set({ trigger: { ...d.trigger!, kind: e.target.value as any } })}><option value="schedule">Schedule</option><option value="event">Event</option><option value="manual">Manual</option></Select></Field><Field label="When" htmlFor="ag-tl"><Input id="ag-tl" value={d.trigger!.label} onChange={(e) => set({ trigger: { ...d.trigger!, label: e.target.value } })} /></Field></div></div>}
        {step === 2 && d && <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="AI provider (bring your own)" htmlFor="ag-p"><Select id="ag-p" value={provider} onChange={(e) => setProvider(e.target.value as any)}>{PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select></Field><Field label="Key label (masked demo)" htmlFor="ag-k" hint="Never enter a real key"><Input id="ag-k" value={key} onChange={(e) => setKey(e.target.value.replace(/[A-Za-z0-9]{12,}/g, "••••••"))} /></Field></div>
          <fieldset className="space-y-2"><legend className="mb-1 text-sm font-semibold">Autonomy level</legend>{(["suggest", "assist", "autonomous"] as AutonomyLevel[]).map((l) => { const blocked = l === "autonomous" && forced.length > 0; return <label key={l} className={`flex items-start gap-2 rounded-xl border p-2.5 text-sm ${d.autonomy === l ? "border-primary bg-lilac/50" : "border-border"} ${blocked ? "opacity-50" : ""}`}><input type="radio" name="aut" className="mt-1 accent-[var(--primary)]" disabled={blocked} checked={d.autonomy === l} onChange={() => set({ autonomy: l })} /><span><strong>{AUTONOMY_LABEL[l]}</strong><br /><span className="text-xs text-text-2">{AUTONOMY_COPY[l]}</span>{blocked && <span className="block text-xs text-danger">Unavailable: this agent {forced[0].toLowerCase().replace(" always require explicit teacher review", "").replace(" always require explicit review", "")} work that always needs review.</span>}</span></label>; })}</fieldset>
          {forced.length > 0 && <ul className="rounded-xl bg-info-soft p-2 text-xs">{forced.map((r) => <li key={r}>{r}</li>)}</ul>}</div>}
      </div>
    </Modal>
  );
}

function AgentDetail({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const a = useQuery({ queryKey: [...KEYS.agents, id], queryFn: () => agentService.get(id!), enabled: !!id });
  const hist = useQuery({ queryKey: [...KEYS.agents, id, "history"], queryFn: () => agentService.history(id!), enabled: !!id });
  const [preview, setPreview] = React.useState<ActionPreview | null>(null); const [decided, setDecided] = React.useState<string | null>(null); const [retire, setRetire] = React.useState(false);
  const refresh = () => { a.refetch(); hist.refetch(); onChanged(); };
  const run = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: refresh, onError: (e) => toast.error(errMsg(e)) });
  const test = useMutation({ mutationFn: () => agentService.test(id!), onSuccess: (p) => { setPreview(p); setDecided(null); refresh(); }, onError: (e) => toast.error(errMsg(e)) });
  const decide = useMutation({ mutationFn: (dec: "approve" | "reject") => agentService.decideRun(preview!.runId, dec), onSuccess: (_, dec) => { setDecided(dec); toast.success(dec === "approve" ? "Test approved (nothing was executed)" : "Rejected"); refresh(); } });
  const ag = a.data;
  React.useEffect(() => { setPreview(null); setDecided(null); }, [id]);
  return (
    <Drawer open={!!id} onOpenChange={(v) => !v && onClose()} title={ag?.name ?? "Agent"} width="sm:max-w-xl">
      {a.isLoading || !ag ? <SkeletonCards n={3} /> : (
        <div className="space-y-4">
          <AgentChips a={ag} />
          <p className="text-sm">{ag.description}</p>
          {ag.status === "failed" && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{ag.failureReason}</p>}
          {ag.status === "awaiting-approval" && <p role="status" className="rounded-xl bg-warning-soft p-3 text-sm">Waiting for an institution administrator to approve this agent before it goes live.</p>}
          <dl className="grid gap-2 text-sm sm:grid-cols-2">{[["Provider", `${PROVIDERS.find((p) => p.id === ag.provider)?.label} · ${ag.model}`], ["Key", ag.keyLabel], ["Trigger", ag.trigger.label], ["Data scope", ag.dataScope.join(", ")], ["Tools", ag.tools.join(", ")], ["Autonomy", AUTONOMY_COPY[ag.autonomy]]].map(([k, v]) => <div key={k} className="rounded-xl bg-surface-2 p-2.5"><dt className="text-xs font-semibold text-text-2">{k}</dt><dd>{v}</dd></div>)}</dl>
          <div className="flex flex-wrap gap-2">
            {ag.status !== "retired" && <Button size="sm" variant="outline" loading={test.isPending} onClick={() => test.mutate()}><Play size={14} />Test run</Button>}
            {["draft", "testing", "failed"].includes(ag.status) && <Button size="sm" onClick={() => run.mutate(async () => { const r = await agentService.publish(ag.id); toast.success(r.status === "awaiting-approval" ? "Sent for approval" : "Published"); })}><RocketLaunch size={14} />Publish</Button>}
            {ag.status === "published" && <Button size="sm" variant="outline" onClick={() => run.mutate(async () => { await agentService.pause(ag.id); toast.info("Paused"); })}><Pause size={14} />Pause</Button>}
            {ag.status === "paused" && <Button size="sm" variant="outline" onClick={() => run.mutate(async () => { await agentService.resume(ag.id); toast.success("Resumed"); })}><Play size={14} />Resume</Button>}
            {ag.status !== "retired" && <Button size="sm" variant="ghost" onClick={() => setRetire(true)}><Trash size={14} className="text-danger" />Retire</Button>}
          </div>
          {!ag.testedOnce && ["draft", "testing"].includes(ag.status) && <p className="text-xs text-text-2">Run a test first — publishing requires reviewing an action preview.</p>}
          {preview && (
            <section aria-label="Action preview" className="space-y-2 rounded-2xl border border-primary/40 p-3"><div className="flex items-center gap-2"><AIBadge label="Action preview · demo" /><Badge tone="highlight">Nothing was executed</Badge></div>
              <p className="text-sm font-semibold">{preview.intends}</p>
              <dl className="grid gap-2 text-xs sm:grid-cols-2">{[["Affected", `${preview.affected.students} students · ${preview.affected.classes.join(", ")}`], ["Data accessed", preview.dataAccessed.join(", ")], ["Content created", preview.contentCreated.join("; ")], ["Publishes", preview.effects.publishes ? "Yes (after approval)" : "No"], ["Grades", preview.effects.grades ? "Yes (draft only)" : "No"], ["Notifies", preview.effects.notifies ? "Yes" : "No"], ["Changes a record", preview.effects.changesRecord ? "Yes" : "No"], ["Fees", preview.effects.touchesFees ? "Yes" : "No"]].map(([k, v]) => <div key={k} className="rounded-lg bg-surface-2 p-2"><dt className="font-semibold text-text-2">{k}</dt><dd>{v}</dd></div>)}</dl>
              <p className="rounded-lg bg-lilac p-2 text-xs"><strong>Policy:</strong> {preview.autonomyPolicy}<br /><strong>{preview.requiresApproval ? "Approval required" : "Pre-authorised low-risk"}:</strong> {preview.approvalReasons.join("; ") || "within limits"}</p>
              {decided ? <p role="status" className="text-sm font-semibold">{decided === "approve" ? "You approved this preview." : "You rejected this preview."}</p> : <div className="flex gap-2"><Button size="sm" variant="success" loading={decide.isPending} onClick={() => decide.mutate("approve")}>Approve</Button><Button size="sm" variant="outline" onClick={() => { toast.info("Open the agent's configuration to edit tools and scope"); setPreview(null); }}>Edit</Button><Button size="sm" variant="outline" onClick={() => decide.mutate("reject")}>Reject</Button></div>}
            </section>
          )}
          <section><h3 className="mb-2 text-sm font-bold">Execution history</h3>
            {!hist.data?.length ? <p className="text-sm text-text-2">No runs yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-xs"><caption className="sr-only">Execution history</caption><thead className="text-text-2"><tr><th className="py-1 pr-2">When / trigger</th><th className="pr-2">Action & scope</th><th className="pr-2">Outcome</th><th className="pr-2">Approval</th><th>Audit ref</th></tr></thead><tbody className="divide-y divide-border">{hist.data.map((r) => <tr key={r.id} className="align-top"><td className="py-1.5 pr-2">{fmtDateTime(r.at)}<br /><span className="text-text-2">{r.trigger}</span></td><td className="pr-2">{r.action}<br /><span className="text-text-2">{r.scope}</span></td><td className="pr-2"><StatusBadge status={r.outcome} label={r.outcome.replace("-", " ")} />{r.error && <span className="block text-danger">{r.error}</span>}</td><td className="pr-2">{r.approvalRequired ? (r.approvalGranted === undefined ? "Required · pending" : r.approvalGranted ? "Granted" : "Declined") : "Not required"}</td><td className="font-mono">{r.auditRef}</td></tr>)}</tbody></table></div>}
          </section>
        </div>
      )}
      <ConfirmDialog open={retire} onOpenChange={setRetire} destructive title="Retire this agent?" body="It stops running permanently. History is kept for audit." confirmLabel="Retire" onConfirm={() => ag && run.mutate(async () => { await agentService.retire(ag.id); toast.info("Agent retired"); })} />
    </Drawer>
  );
}
