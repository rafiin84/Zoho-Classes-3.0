"use client";
import * as React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PaperPlaneRight, Clock, Sparkle } from "@phosphor-icons/react";
import { PageHeader, Card, Button, Badge, AIBadge, DemoTag, Drawer, Input, Field, Select, toast, EmptyState, Skeleton, SectionHeader } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { workspaceService } from "@/lib/api/workspaceService";
import { governanceService } from "@/lib/api/governanceService";
import type { WorkspaceAnswer, Interpretation } from "@/types/institution";
import { fmtDateTime } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { useCtx, DemoNote, onErr, ACTOR, Panel } from "../kit";
import { BranchDrill } from "../components/BranchDrill";
import { InterventionDialog, type InterventionSeed } from "../components/InterventionDialog";

export default function WorkspaceScreen(_: ScreenProps) {
  const { ctx, instName } = useCtx();
  const qc = useQueryClient();
  const [text, setText] = React.useState("");
  const [history, setHistory] = React.useState<string[]>([]);
  const [answer, setAnswer] = React.useState<WorkspaceAnswer | null>(null);
  const [drill, setDrill] = React.useState<{ id: string; name: string } | null>(null);
  const [interv, setInterv] = React.useState<InterventionSeed | null>(null);
  const [cmd, setCmd] = React.useState(""); const [interp, setInterp] = React.useState<Interpretation | null>(null); const [editing, setEditing] = React.useState(false);
  const run = useMutation({ mutationFn: (q: string) => workspaceService.run(q, ctx), onSuccess: (a, q) => { setAnswer(a); setHistory((h) => [q, ...h.filter((x) => x !== q)].slice(0, 5)); }, onError: onErr });
  const ask = (q: string) => { if (!q.trim()) return toast.warning("Type a question or pick a suggestion."); setText(q); run.mutate(q.trim()); };
  const confirm = useMutation({
    mutationFn: (i: Interpretation) => i.approval.startsWith("Not required") ? Promise.resolve(null) : governanceService.createApproval({ kind: /Publish/.test(i.action) ? "marksheet" : /Export/.test(i.action) ? "data-export" : "agent-action", title: `Workspace command: ${i.action} — ${i.scope}`, summary: `${i.summary} Audience: ${i.audience}.`, requestedBy: ACTOR }),
    onSuccess: (r, i) => { qc.invalidateQueries({ queryKey: ["inst", "approvals"] }); toast.success(r ? "Request created — waiting in Governance approvals." : "Read-only command: running analysis."); if (!r) ask(cmd); setInterp(null); setCmd(""); }, onError: onErr,
  });
  const branchNames: Record<string, string> = { "br-north": "North Campus", "br-lakeside": "Lakeside Campus", "br-meridian-main": "Main Campus" };

  return (
    <div>
      <PageHeader title="Institution AI Workspace" subtitle={`Ask questions about ${instName}. Answers show their definitions, date range, source and caveats.`} actions={<><AIBadge label="AI-assisted" /><DemoTag /></>} />
      <DemoNote>Prototype: answers are produced from demo data by a rule-based simulation. No AI model ran, and nothing here changes records without approval.</DemoNote>
      <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(text); }} role="search">
        <Input aria-label="Ask the workspace" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about performance, completion, support, workload, AI usage…" />
        <Button type="submit" loading={run.isPending}><PaperPlaneRight size={16} /> Ask</Button>
      </form>
      <div className="mb-5 flex flex-wrap gap-2" aria-label="Sample questions">
        {workspaceService.samples().map((s) => <Button key={s.id} size="sm" variant="soft" onClick={() => ask(s.text)}>{s.text}</Button>)}
      </div>
      {history.length > 0 && <p className="mb-4 flex flex-wrap items-center gap-2 text-xs text-text-2"><Clock size={14} />Recent: {history.map((h) => <button key={h} className="underline" onClick={() => ask(h)}>{h}</button>)}</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2" aria-live="polite">
          {run.isPending && <div className="space-y-3" role="status" aria-label="Analysing"><Skeleton className="h-24" /><Skeleton className="h-52" /></div>}
          {!run.isPending && !answer && <EmptyState icon={<Sparkle size={28} weight="duotone" />} title="Ask your first question" body="Pick a suggested question above, or type your own. For example: “Identify low-performing branches” starts the intervention journey." />}
          {!run.isPending && answer && (
            <Card className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-heading">{answer.query}</h2><AIBadge /></div>
              <p className="text-sm leading-relaxed">{answer.summary}</p>
              {answer.chart.length > 0 && <BarChart horizontal ariaLabel={answer.query} unit={answer.unit} data={answer.chart.map((c) => ({ label: c.label, value: c.value, sub: c.sub }))} onSelect={answer.drill.some((d) => d.branchId) ? (d) => { const e = Object.entries(branchNames).find(([, n]) => d.label === n); if (e) setDrill({ id: e[0], name: e[1] }); } : undefined} />}
              {answer.chart.some((c) => c.sub) && <p className="text-xs text-text-2">{answer.chart.map((c) => `${c.label}: ${c.sub}`).join(" · ")}</p>}
              <dl className="grid gap-2 rounded-xl bg-surface-2 p-3 text-xs sm:grid-cols-3">
                <div><dt className="font-semibold">Date range</dt><dd className="text-text-2">{answer.range}</dd></div>
                <div><dt className="font-semibold">Source</dt><dd className="text-text-2">{answer.source}</dd></div>
                <div><dt className="font-semibold">Data as of</dt><dd className="text-text-2">{fmtDateTime(answer.sourceAt)}</dd></div>
              </dl>
              {answer.metrics.length > 0 && <details className="rounded-xl border border-border p-3 text-sm"><summary className="cursor-pointer font-semibold">Metric definitions</summary><ul className="mt-2 space-y-1.5">{answer.metrics.map((m) => <li key={m.name}><strong>{m.name}:</strong> <span className="text-text-2">{m.definition}</span></li>)}</ul></details>}
              {answer.caveats.length > 0 && <div className="rounded-xl bg-highlight-soft p-3 text-xs"><p className="mb-1 font-semibold text-warning">Read with care</p><ul className="list-disc space-y-1 pl-4">{answer.caveats.map((c) => <li key={c}>{c}</li>)}</ul></div>}
              <div className="rounded-xl bg-lilac p-3 text-sm"><p className="font-semibold text-primary">Recommended action</p><p className="mt-0.5">{answer.action}</p></div>
              <div className="flex flex-wrap gap-2">
                {answer.drill.filter((d) => d.branchId).map((d) => <Button key={d.label} size="sm" variant="outline" onClick={() => setDrill({ id: d.branchId!, name: branchNames[d.branchId!] })}>{d.label}</Button>)}
                {answer.drill.filter((d) => !d.branchId).map((d) => <Button key={d.label} size="sm" variant="outline" asChild><Link href={/Courses/.test(d.label) ? "/institution/courses" : /AI/.test(d.label) ? "/institution/ai" : "/institution/timetable"}>{d.label}</Link></Button>)}
                {answer.actionKind && <Button size="sm" onClick={() => { const top = answer.chart[0]; const id = Object.entries(branchNames).find(([, n]) => top && (top.label === n || (top.sub ?? "").includes(n)))?.[0] ?? (ctx.inst === "inst-meridian" ? "br-meridian-main" : "br-lakeside"); setInterv({ branchId: id, branchName: branchNames[id], title: `Intervention: ${answer.query}` }); }}>Review intervention</Button>}
              </div>
            </Card>)}
        </div>

        <aside className="space-y-4" aria-label="Command entry">
          <Panel title="Tell the workspace what to do">
            <form onSubmit={(e) => { e.preventDefault(); const i = workspaceService.interpret(cmd); if (!i) return toast.warning("Describe the action in a few words, e.g. “Remind Grade 8 parents about Term 2 fees”."); setInterp(i); setEditing(false); }} className="space-y-2">
              <Input aria-label="Command" value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="e.g. Remind Grade 8 parents about Term 2 fees" />
              <Button type="submit" variant="soft" className="w-full">Interpret</Button>
            </form>
            {interp && (
              <div className="mt-4 space-y-2 rounded-xl border border-border p-3 text-sm" role="region" aria-label="Interpretation">
                <p className="font-semibold">I understood this as</p>
                {editing ? (
                  <div className="space-y-2">
                    <Field label="Action" htmlFor="i-a"><Input id="i-a" value={interp.action} onChange={(e) => setInterp({ ...interp, action: e.target.value })} /></Field>
                    <Field label="Scope" htmlFor="i-s"><Select id="i-s" value={interp.scope} onChange={(e) => setInterp({ ...interp, scope: e.target.value })}>{["Whole institution", "North Campus", "Lakeside Campus", "Grade 8", "Grade 9"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
                    <Field label="Audience" htmlFor="i-u"><Input id="i-u" value={interp.audience} onChange={(e) => setInterp({ ...interp, audience: e.target.value })} /></Field>
                  </div>
                ) : <dl className="space-y-1 text-xs">{(["action", "scope", "audience", "approval"] as const).map((k) => <div key={k} className="flex gap-2"><dt className="w-16 shrink-0 font-semibold capitalize">{k}</dt><dd className="text-text-2">{interp[k]}</dd></div>)}</dl>}
                <p className="text-xs text-text-2">{interp.summary}</p>
                <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => { setInterp(null); toast.info("Command cancelled."); }}>Cancel</Button><Button size="sm" variant="outline" onClick={() => setEditing((e) => !e)}>{editing ? "Done editing" : "Edit"}</Button><Button size="sm" loading={confirm.isPending} onClick={() => confirm.mutate(interp)}>Confirm</Button></div>
              </div>)}
          </Panel>
          <Panel title="Honesty rules"><ul className="list-disc space-y-1 pl-4 text-xs text-text-2"><li>Every answer states its source, range and timestamp.</li><li>Incomplete data is called out, never filled in.</li><li>Patterns are not proof of cause.</li><li>Consequential actions need human approval.</li></ul></Panel>
        </aside>
      </div>

      <Drawer open={!!drill} onOpenChange={(v) => !v && setDrill(null)} title={drill ? `${drill.name} · drill-down` : ""} width="sm:max-w-xl">
        {drill && <BranchDrill branchId={drill.id} branchName={drill.name} onIntervene={(s) => { setInterv({ ...s, title: `Support plan for ${s.className ?? s.branchName}` }); }} />}
      </Drawer>
      <InterventionDialog seed={interv} onClose={() => setInterv(null)} />
    </div>
  );
}
