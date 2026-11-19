"use client";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Key, ArrowDown } from "@phosphor-icons/react";
import { PageHeader, Card, Button, Badge, Field, Input, Select, Switch, Checkbox, Modal, ConfirmDialog, SectionHeader, ErrorState, SkeletonCards, toast, DemoTag, Progress } from "@/components/ui";
import { aiProviderService, TASKS, ACTIVITIES, budgetState, PROVIDER_META } from "@/lib/api/aiProviderService";
import type { OwnerLevel, ProviderConfig, ProviderId, TaskRoute, AutonomyCeiling } from "@/types/institution";
import { useQuery } from "@tanstack/react-query";
import { fmtMoney, relTime } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";

const LEVEL_OF: Record<string, OwnerLevel> = { government: "government", institution: "institution", teacher: "teacher", student: "student", parent: "institution" };
const LEVEL_LABEL: Record<OwnerLevel, string> = { government: "State policy level", institution: "Institution (tenant) level", teacher: "Teacher level", student: "Student level" };
const CONN_TONE = { ok: "success", failed: "danger", unavailable: "warning", untested: "neutral" } as const;
const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong");

export default function ProviderConfigScreen(props: ScreenProps) {
  const level = LEVEL_OF[props.role] ?? "institution"; const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ai-providers", level], queryFn: () => aiProviderService.get(level) });
  const inv = () => { qc.invalidateQueries({ queryKey: ["ai-providers"] }); qc.invalidateQueries({ queryKey: ["inst", "audit"] }); };
  const [keyFor, setKeyFor] = React.useState<ProviderConfig | null>(null); const [raw, setRaw] = React.useState(""); const [rmKey, setRmKey] = React.useState<ProviderConfig | null>(null); const [age, setAge] = React.useState(14); const [consent, setConsent] = React.useState(false);
  const en = useMutation({ mutationFn: (v: { id: ProviderId; on: boolean }) => aiProviderService.setEnabled(level, v.id, v.on), onSuccess: (p) => { toast.success(`${p.name} ${p.enabled ? "enabled" : "disabled"}.`); inv(); }, onError: err });
  const appr = useMutation({ mutationFn: (v: { id: ProviderId; ok: boolean }) => aiProviderService.setApproved(v.id, v.ok), onSuccess: () => { toast.success("State approval updated."); inv(); }, onError: err });
  const mdl = useMutation({ mutationFn: (v: { id: ProviderId; m: string }) => aiProviderService.setDefaultModel(level, v.id, v.m), onSuccess: inv, onError: err });
  const add = useMutation({ mutationFn: () => aiProviderService.addKey(level, keyFor!.id, raw), onSuccess: () => { toast.success("Key format accepted. The key was discarded; only a masked demo value is shown."); setRaw(""); setKeyFor(null); inv(); }, onError: (e) => { setRaw(""); err(e); } });
  const rm = useMutation({ mutationFn: (id: ProviderId) => aiProviderService.removeKey(level, id), onSuccess: () => { toast.success("Key removed."); setRmKey(null); inv(); }, onError: err });
  const test = useMutation({ mutationFn: (v: { id: ProviderId; o: "success" | "failure" | "unavailable" }) => aiProviderService.test(level, v.id, v.o), onSuccess: (p) => { (p.connection === "ok" ? toast.success : toast.error)(p.connection === "ok" ? `${p.name}: simulated test passed (no real call made).` : `${p.name}: simulated test ${p.connection}.`); inv(); }, onError: err });
  const route = useMutation({ mutationFn: (v: { t: TaskRoute["task"]; p: Partial<TaskRoute> }) => aiProviderService.setRoute(level, v.t, v.p), onSuccess: inv, onError: err });
  const pol = useMutation({ mutationFn: (p: Parameters<typeof aiProviderService.setPolicy>[1]) => aiProviderService.setPolicy(level, p), onSuccess: () => { toast.success("Policy saved."); inv(); }, onError: err });
  const spend = useMutation({ mutationFn: (v: { id: ProviderId; a: number }) => aiProviderService.simulateSpend(level, v.id, v.a), onSuccess: inv, onError: err });
  const reset = useMutation({ mutationFn: () => aiProviderService.resetSpend(level), onSuccess: () => { toast.success("Demo usage reset."); inv(); } });
  const elig = useQuery({ queryKey: ["ai-elig", age, consent, q.dataUpdatedAt], queryFn: () => aiProviderService.studentEligibility(age, consent), enabled: level !== "student" || true });

  if (q.isLoading) return <SkeletonCards n={4} h="h-40" />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const d = q.data, p = d.policy, enabled = d.providers.filter((x) => x.enabled);
  const bs = budgetState(d.spent, p.monthlyBudget, p.alertThreshold); const pct = p.monthlyBudget ? Math.round((d.spent / p.monthlyBudget) * 100) : 0; const paused = bs === "exceeded" && p.pauseAtBudget;
  const isGov = level === "government";
  return (
    <div className="space-y-6">
      <PageHeader title={isGov ? "AI provider policy" : "AI providers (bring your own key)"} subtitle={`${LEVEL_LABEL[level]} · choose providers, route tasks and set budgets and limits.`} actions={<DemoTag label="Demo values · keys masked" />} />
      <div role="note" className="rounded-2xl border border-primary/20 bg-lilac p-4 text-sm"><b>Zoho Classes brings no proprietary AI model.</b> Every AI feature runs on a provider you configure with your own key. Keys shown here are masked demo placeholders; real keys are never stored by this prototype, and never in browser storage.</div>

      <section aria-label="Hierarchy"><SectionHeader title="Who controls what" />
        <ol className="grid gap-2 md:grid-cols-4">{(["government", "institution", "teacher", "student"] as OwnerLevel[]).map((l, i) => (
          <li key={l} className={`rounded-2xl border p-3 text-sm ${l === level ? "border-primary bg-lilac" : "border-border bg-surface"}`}><p className="flex items-center gap-1 font-bold">{i + 1}. {l === "government" ? "Government" : l[0].toUpperCase() + l.slice(1)}{l === level && <Badge tone="primary">You are here</Badge>}</p><p className="mt-1 text-xs text-text-2">{l === "government" ? "Approves providers, policies and budgets." : l === "institution" ? "Configures its own keys or inherits state ones." : l === "teacher" ? "Uses institution AI, or a personal key if permitted. Cost goes to the owner." : "Personal key only with age, guardian consent and institution policy."}</p></li>))}</ol>
        <p className="mt-2 flex items-center gap-1 text-xs text-text-2"><ArrowDown size={12} /> Lower levels can narrow, never widen, what the level above allows.</p></section>

      <section aria-label="Budget and usage"><SectionHeader title="Usage & budget" subtitle="Illustrative sample values for this month." action={<Button size="sm" variant="ghost" onClick={() => reset.mutate()}>Reset demo usage</Button>} />
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="tnum text-lg font-bold">{fmtMoney(d.spent)} <span className="text-sm font-normal text-text-2">of {fmtMoney(p.monthlyBudget)} ({pct}%)</span></p><Badge tone={bs === "healthy" ? "success" : bs === "near" ? "warning" : "danger"}>{bs === "healthy" ? "Healthy" : bs === "near" ? "Near limit" : "Budget exceeded"}</Badge></div>
          <Progress value={Math.min(100, pct)} tone={bs === "healthy" ? "success" : bs === "near" ? "warning" : "danger"} label="Budget used" size="lg" />
          {bs === "near" && <p role="alert" className="rounded-xl bg-warning-soft px-3 py-2 text-sm">Alert: usage passed the {p.alertThreshold}% threshold. Owners are notified (demo).</p>}
          {paused && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">AI features are paused because the budget was reached. Raise the budget or reset demo usage to resume.</p>}
          <ul className="grid gap-2 sm:grid-cols-2">{enabled.map((x) => <li key={x.id} className="rounded-xl bg-surface-2 p-3 text-sm"><div className="flex justify-between"><b>{x.name}</b><span className="tnum">{fmtMoney(x.spent)}</span></div><Progress value={x.budget ? (x.spent / x.budget) * 100 : 0} size="sm" label={`${x.name} spend`} className="my-1.5" /><Button size="sm" variant="ghost" onClick={() => spend.mutate({ id: x.id, a: Math.round(p.monthlyBudget * 0.1) })}>Simulate usage (+10% of budget)</Button></li>)}{!enabled.length && <li className="text-sm text-text-2">No provider enabled yet, so no usage.</li>}</ul>
        </Card></section>

      <section aria-label="Providers"><SectionHeader title="Providers" subtitle={d.upstream ? `Approved at ${d.upstream.level} level: ${d.upstream.approved.map((i) => PROVIDER_META[i].name).join(", ") || "none"}.` : "Approve providers for institutions in your state."} />
        <div className="grid gap-3 lg:grid-cols-2">{d.providers.map((x) => {
          const blocked = !isGov && !x.approvedByGovernment;
          return (
            <Card key={x.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{x.name}</h3><div className="flex gap-1.5"><Badge tone={CONN_TONE[x.connection]}>{x.connection === "ok" ? "Connected (demo)" : x.connection === "failed" ? "Test failed" : x.connection === "unavailable" ? "Unavailable" : "Not tested"}</Badge>{x.approvedByGovernment ? <Badge tone="success">State-approved</Badge> : <Badge tone="warning">Not state-approved</Badge>}</div></div>
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"><span>{blocked ? "Blocked by state policy" : "Enabled at this level"}</span><Switch checked={x.enabled} disabled={blocked && !x.enabled} onChange={(v) => en.mutate({ id: x.id, on: v })} label={`Enable ${x.name}`} /></div>
              {isGov && <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"><span>Approved for institutions</span><Switch checked={x.approvedByGovernment} onChange={(v) => appr.mutate({ id: x.id, ok: v })} label={`Approve ${x.name} statewide`} /></div>}
              <Field label="Default model" htmlFor={`m-${x.id}`}><Select id={`m-${x.id}`} value={x.defaultModel} disabled={!x.enabled} onChange={(e) => mdl.mutate({ id: x.id, m: e.target.value })}>{x.models.map((m) => <option key={m}>{m}</option>)}</Select></Field>
              <div className="flex flex-wrap items-center gap-2 text-sm"><Key size={16} /><code className="rounded bg-surface-2 px-2 py-0.5 text-xs">{x.keyMask || (x.inherited ? "Inherited from level above" : "No key")}</code><Badge>Owner: {x.keyOwner}</Badge></div>
              {x.lastTested && <p className="text-xs text-text-2">Last tested {relTime(x.lastTested)}</p>}
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={blocked} onClick={() => { setKeyFor(x); setRaw(""); }}>{x.keyMask ? "Replace key" : "Add key"}</Button>{x.keyMask && <Button size="sm" variant="ghost" onClick={() => setRmKey(x)}>Remove key</Button>}
                <Button size="sm" variant="outline" loading={test.isPending && test.variables?.id === x.id} onClick={() => test.mutate({ id: x.id, o: "success" })}>Test connection</Button><Button size="sm" variant="ghost" onClick={() => test.mutate({ id: x.id, o: "failure" })}>Simulate failure</Button><Button size="sm" variant="ghost" onClick={() => test.mutate({ id: x.id, o: "unavailable" })}>Simulate outage</Button></div>
            </Card>); })}</div></section>

      <section aria-label="Task routing"><SectionHeader title="Task routing" subtitle="Which provider handles each task, with a cost/performance preference and a fallback." />
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface"><table className="w-full min-w-[640px] text-sm" aria-label="Task routing"><thead className="bg-surface-2 text-left text-xs text-text-2"><tr><th className="p-3">Task</th><th className="p-3">Provider</th><th className="p-3">Preference</th><th className="p-3">Fallback</th><th className="p-3">Status</th></tr></thead>
          <tbody>{d.routes.map((r) => { const main = d.providers.find((x) => x.id === r.provider); const down = main && (!main.enabled || main.connection === "failed" || main.connection === "unavailable"); const fb = r.fallback !== "none" ? d.providers.find((x) => x.id === r.fallback) : null; return (
            <tr key={r.task} className="border-t border-border"><th scope="row" className="p-3 text-left font-medium">{TASKS.find((t) => t.key === r.task)?.label}</th>
              <td className="p-3"><Select aria-label={`Provider for ${r.task}`} className="h-9" value={r.provider} disabled={!enabled.length} onChange={(e) => route.mutate({ t: r.task, p: { provider: e.target.value as ProviderId } })}>{d.providers.map((x) => <option key={x.id} value={x.id} disabled={!x.enabled}>{x.name}{x.enabled ? "" : " (off)"}</option>)}</Select></td>
              <td className="p-3"><Select aria-label={`Preference for ${r.task}`} className="h-9" value={r.preference} onChange={(e) => route.mutate({ t: r.task, p: { preference: e.target.value as TaskRoute["preference"] } })}><option value="cost">Lowest cost</option><option value="balanced">Balanced</option><option value="performance">Best quality</option></Select></td>
              <td className="p-3"><Select aria-label={`Fallback for ${r.task}`} className="h-9" value={r.fallback} onChange={(e) => route.mutate({ t: r.task, p: { fallback: e.target.value as TaskRoute["fallback"] } })}><option value="none">None</option>{d.providers.filter((x) => x.enabled && x.id !== r.provider).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></td>
              <td className="p-3">{paused ? <Badge tone="danger">Paused (budget)</Badge> : !down ? <Badge tone="success">Using {main?.name.split(" ")[0]}</Badge> : fb?.enabled ? <Badge tone="warning">Fallback: {fb.name.split(" ")[0]}</Badge> : <Badge tone="danger">Unavailable — no fallback</Badge>}</td></tr>); })}</tbody></table></div></section>

      <section aria-label="Policies"><SectionHeader title="Policies & limits" />
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="space-y-3 p-4"><h3 className="font-bold">Budget & autonomy</h3>
            <Field label="Monthly budget (₹, demo)" htmlFor="pb" hint={d.upstream ? `Cannot exceed ${fmtMoney(d.upstream.policy.monthlyBudget)} set above.` : undefined}><Input id="pb" type="number" min={0} defaultValue={p.monthlyBudget} key={p.monthlyBudget} onBlur={(e) => Number(e.target.value) !== p.monthlyBudget && pol.mutate({ monthlyBudget: Number(e.target.value) })} /></Field>
            <Field label={`Alert threshold: ${p.alertThreshold}%`} htmlFor="pt"><input id="pt" type="range" min={50} max={95} step={5} value={p.alertThreshold} onChange={(e) => pol.mutate({ alertThreshold: Number(e.target.value) })} className="w-full accent-[var(--primary)]" /></Field>
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"><span>Pause AI when budget is reached</span><Switch checked={p.pauseAtBudget} onChange={(v) => pol.mutate({ pauseAtBudget: v })} label="Pause AI when budget reached" /></div>
            <Field label="Agent autonomy ceiling" htmlFor="pa" hint="Grades, publications, fees and student records always need human approval regardless of this ceiling."><Select id="pa" value={p.autonomyCeiling} onChange={(e) => pol.mutate({ autonomyCeiling: e.target.value as AutonomyCeiling })}><option value="suggest">Suggest — proposes only</option><option value="assist">Assist — prepares, a person approves</option><option value="autonomous">Autonomous — pre-authorised low-risk tasks only</option></Select></Field></Card>
          <Card className="space-y-3 p-4"><h3 className="font-bold">Personal & student keys</h3>
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"><span>Allow personal keys {level === "government" ? "for teachers" : ""}</span><Switch checked={p.allowPersonalKeys} onChange={(v) => pol.mutate({ allowPersonalKeys: v })} label="Allow personal keys" /></div>
            <p className="text-xs text-text-2">A personal key is private to its owner; usage and cost are attributed to that owner, not the institution.</p>
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"><span>Allow student personal keys</span><Switch checked={p.allowStudentKeys} onChange={(v) => pol.mutate({ allowStudentKeys: v })} label="Allow student personal keys" /></div>
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"><span>Require guardian consent</span><Switch checked={p.requireGuardianConsent} onChange={(v) => pol.mutate({ requireGuardianConsent: v })} label="Require guardian consent" /></div>
            <Field label="Minimum student age" htmlFor="pm"><Select id="pm" value={p.studentMinAge} onChange={(e) => pol.mutate({ studentMinAge: Number(e.target.value) })}>{[13, 14, 15, 16, 18].map((a) => <option key={a}>{a}</option>)}</Select></Field>
            <fieldset className="space-y-1.5"><legend className="text-sm font-semibold">Disable personal keys for these activities</legend>{ACTIVITIES.map((a) => <Checkbox key={a} label={a} checked={p.disabledActivities.includes(a)} onChange={(v) => pol.mutate({ disabledActivities: v ? [...p.disabledActivities, a] : p.disabledActivities.filter((x) => x !== a) })} />)}</fieldset></Card>
          <Card className="space-y-3 p-4 lg:col-span-2"><h3 className="font-bold">Student key eligibility check</h3><p className="text-xs text-text-2">All three must hold: student age, guardian consent, and institutional (and state) policy.</p>
            <div className="grid gap-3 sm:grid-cols-3"><Field label="Student age" htmlFor="ea"><Input id="ea" type="number" min={5} max={25} value={age} onChange={(e) => setAge(Number(e.target.value))} /></Field><div className="pt-7"><Checkbox label="Guardian has consented" checked={consent} onChange={setConsent} /></div><div className="pt-6" aria-live="polite">{elig.data && (elig.data.eligible ? <Badge tone="success">Eligible</Badge> : <Badge tone="danger">Not eligible</Badge>)}</div></div>
            {elig.data && !elig.data.eligible && <ul className="list-disc pl-5 text-sm text-text-2">{elig.data.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}</Card>
        </div></section>

      <Modal open={!!keyFor} onOpenChange={(v) => { if (!v) { setKeyFor(null); setRaw(""); } }} title={`${keyFor?.keyMask ? "Replace" : "Add"} key · ${keyFor?.name}`} description="Format check only. The value is discarded immediately and never stored."
        footer={<><Button variant="ghost" onClick={() => { setKeyFor(null); setRaw(""); }}>Cancel</Button><Button loading={add.isPending} disabled={!raw} onClick={() => add.mutate()}>Validate format</Button></>}>
        <Field label="Provider API key" htmlFor="k-in" hint="Do not paste a real production key into this prototype."><Input id="k-in" type="password" autoComplete="off" spellCheck={false} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Paste a placeholder, e.g. demo_key_abcdefghijklmnopqrstuvwx" /></Field>
      </Modal>
      <ConfirmDialog open={!!rmKey} onOpenChange={(v) => !v && setRmKey(null)} destructive title={`Remove key for ${rmKey?.name}?`} body="Tasks routed to this provider will use their fallback, or stop if none is set." confirmLabel="Remove key" onConfirm={() => rmKey && rm.mutate(rmKey.id)} />
    </div>
  );
}
