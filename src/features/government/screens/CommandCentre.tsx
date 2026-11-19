"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, CardBody, Input, PageHeader, AIBadge, toast, Skeleton } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { PaperPlaneTilt, Sparkle, Warning } from "@phosphor-icons/react";
import type { ScreenProps } from "@/types/screens";
import type { CommandResult, Interpretation } from "@/types/government";
import { govAiService, EXAMPLE_QUERIES } from "@/lib/api/govAiService";
import { programmeService } from "@/lib/api/programmeService";
import { Src, errMsg, G, DemoBanner, useLowBaseline } from "../components/shared";

export function ResultView({ r }: { r: CommandResult }) {
  const router = useRouter(); const qc = useQueryClient();
  const create = useMutation({ mutationFn: () => programmeService.saveDraft(r.proposal!, undefined, 1, "ai-proposal"), onSuccess: (p) => { qc.invalidateQueries({ queryKey: ["gov"] }); toast.success("Draft programme created", "It is a draft only. Review it, then submit for approval."); router.push(G(`programmes/${p.id}`)); }, onError: (e) => toast.error("Could not create draft", errMsg(e)) });
  return (
    <Card><CardBody className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><AIBadge label="AI-generated summary (mock)" /><span className="text-xs text-text-2">No real model ran. Structured demo output.</span></div>
      <p className="text-sm">{r.summary}</p>
      {r.chart && <div><h3 className="mb-2 text-sm font-semibold">{r.chart.title}</h3><BarChart horizontal ariaLabel={r.chart.title} unit={r.chart.unit} data={r.chart.data.map((d) => ({ label: d.label, value: d.value }))} />{r.chart.compare && <p className="mt-1 text-xs text-text-2">Baseline values are in the table below.</p>}</div>}
      {r.table && <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-text-2">{r.table.columns.map((c) => <th key={c} className="py-1.5 pr-3">{c}</th>)}</tr></thead><tbody>{r.table.rows.map((row, i) => <tr key={i} className="border-t border-border">{row.map((c, j) => <td key={j} className="tnum py-1.5 pr-3">{c}</td>)}</tr>)}</tbody></table></div>}
      <div><h3 className="text-sm font-semibold">Metric definitions</h3><dl className="mt-1 space-y-1 text-sm">{r.definitions.map((d) => <div key={d.term}><dt className="inline font-semibold">{d.term}: </dt><dd className="inline text-text-2">{d.text}</dd></div>)}</dl></div>
      <div className="rounded-xl bg-warning-soft p-3 text-sm"><p className="flex items-center gap-1.5 font-semibold"><Warning size={14} />Read with care</p><ul className="mt-1 list-disc pl-5">{r.caveats.map((c) => <li key={c}>{c}</li>)}</ul></div>
      <div className="flex flex-wrap gap-2">{r.actions.map((a) => a.kind === "proposal" ? <Button key={a.label} loading={create.isPending} onClick={() => create.mutate()}>{a.label}</Button> : <Button key={a.label} asChild variant="soft"><Link href={a.href ?? "#"}>{a.label}</Link></Button>)}</div>
      <Src text={r.sources} />
    </CardBody></Card>
  );
}

/** Reusable ask box: interpret, then confirm, then run. */
export function AskBox({ initial = "", compact }: { initial?: string; compact?: boolean }) {
  const low = useLowBaseline();
  const [text, setText] = React.useState(initial); const [interp, setInterp] = React.useState<Interpretation | null>(null); const [result, setResult] = React.useState<CommandResult | null>(null); const [asked, setAsked] = React.useState("");
  const i = useMutation({ mutationFn: (t: string) => govAiService.interpret(t), onSuccess: (x, t) => { setInterp(x); setResult(null); setAsked(t); }, onError: (e) => toast.error("Cannot interpret", errMsg(e)) });
  const run = useMutation({ mutationFn: () => govAiService.run(interp!.queryId, asked, low), onSuccess: (r) => { setResult(r); setInterp(null); }, onError: (e) => toast.error("Run failed", errMsg(e)) });
  const ask = (t: string) => { setText(t); i.mutate(t); };
  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); i.mutate(text); }} className="flex flex-wrap gap-2">
        <label htmlFor="cmd" className="sr-only">Ask the Government AI</label>
        <Input id="cmd" className="min-w-[220px] flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about districts, gaps, programmes or outcomes" />
        <Button type="submit" loading={i.isPending}><PaperPlaneTilt size={16} />Ask</Button>
      </form>
      {!compact && <div className="flex flex-wrap gap-2" aria-label="Example queries">{EXAMPLE_QUERIES.map((q) => <Button key={q.id} size="sm" variant="outline" onClick={() => ask(q.text)}><Sparkle size={14} />{q.text}</Button>)}</div>}
      {interp && (
        <Card tone="lilac"><CardBody className="space-y-2">
          <h3 className="font-semibold">Confirm what I will do</h3>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">{([["Action", interp.action], ["Scope", interp.scope], ["Audience", interp.audience], ["Approval", interp.approval]] as [string, string][]).map(([k, v]) => <div key={k}><dt className="text-xs font-semibold text-text-2">{k}</dt><dd>{v}</dd></div>)}</dl>
          <div className="flex flex-wrap gap-2"><Button loading={run.isPending} onClick={() => run.mutate()}>Confirm</Button><Button variant="outline" onClick={() => { setInterp(null); toast.info("Edit your question and ask again"); document.getElementById("cmd")?.focus(); }}>Edit</Button><Button variant="ghost" onClick={() => { setInterp(null); setText(""); }}>Cancel</Button></div>
          <p className="text-xs text-text-2">High-impact actions are never executed from a prompt alone.</p>
        </CardBody></Card>
      )}
      {run.isPending && <div role="status" aria-live="polite"><Skeleton className="h-48 w-full" /></div>}
      {result && <ResultView r={result} />}
    </div>
  );
}

export default function CommandCentre({ searchParams }: ScreenProps) {
  return (
    <div>
      <PageHeader title="Government AI Command Centre" subtitle="Ask questions of aggregate state data. AI suggests; authorised officials approve." eyebrow={<Badge tone="ai">Mock AI, demo data</Badge>} />
      <DemoBanner />
      <AskBox initial={searchParams.q === "prepare" ? "Prepare a state-wide mathematics improvement programme." : ""} />
    </div>
  );
}
