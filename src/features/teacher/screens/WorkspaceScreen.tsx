"use client";
import * as React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PaperPlaneRight, CheckCircle, PencilSimple, XCircle, Sparkle, Info, ArrowRight } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, Card, CardBody, Button, Badge, AIBadge, Field, Select, Input, Textarea, Modal, Icon, toast } from "@/components/ui";
import type { ScreenProps } from "@/types/screens";
import type { Interpretation, WorkspaceActionId, WorkspaceResult } from "@/types/teacher";
import { teacherWorkspaceService, WORKSPACE_ACTIONS, type WorkspaceAction } from "@/lib/api/teacherWorkspaceService";
import { useTeacher, AiNotice, errMsg, KEYS, tHref } from "../components/common";

type Turn =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "interpretation"; data: Interpretation; state: "open" | "confirmed" | "cancelled"; text: string }
  | { id: string; kind: "result"; result: WorkspaceResult }
  | { id: string; kind: "note"; text: string };
const nid = () => Math.random().toString(36).slice(2);
const linkFor: Partial<Record<WorkspaceActionId, { label: string; slug: string }>> = {
  lesson: { label: "View course", slug: "courses/crs-fractions" }, mcqs: { label: "View course", slug: "courses/crs-fractions" }, evaluate: { label: "Review in Assessments", slug: "assessments" },
  struggling: { label: "Open classes", slug: "classes/cls-8b" }, remedial: { label: "Open classes", slug: "classes/cls-8b" }, "ai-teacher": { label: "Open AI Teachers", slug: "ai-teachers" }, "weekly-test": { label: "Open Assessments", slug: "assessments" }, paper: { label: "Open Paper Builder", slug: "papers" },
};

export default function WorkspaceScreen({ searchParams }: ScreenProps) {
  const t = useTeacher(); const qc = useQueryClient();
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [input, setInput] = React.useState("");
  const [paramFor, setParamFor] = React.useState<WorkspaceAction | null>(null);
  const [params, setParams] = React.useState<Record<string, string>>({});
  const endRef = React.useRef<HTMLDivElement>(null);
  const add = (x: Turn) => setTurns((p) => [...p, x]);
  const patch = (id: string, f: (t: Turn) => Turn) => setTurns((p) => p.map((x) => (x.id === id ? f(x) : x)));

  const gen = useMutation({
    mutationFn: ({ id, p }: { id: WorkspaceActionId; p: Record<string, string> }) => teacherWorkspaceService.generate(id, p, t.id),
    onSuccess: (r) => add({ id: nid(), kind: "result", result: r }),
    onError: (e) => add({ id: nid(), kind: "note", text: errMsg(e) }),
  });
  const interp = useMutation({ mutationFn: (text: string) => teacherWorkspaceService.interpret(text, t.id), onSuccess: (data, text) => add({ id: nid(), kind: "interpretation", data, state: "open", text }), onError: (e) => toast.error(errMsg(e)) });

  const start = (a: WorkspaceAction, preset?: Record<string, string>) => {
    const d = Object.fromEntries(a.params.map((p) => [p.key, preset?.[p.key] ?? p.options?.[0]?.value ?? ""]));
    if (!a.params.length) { add({ id: nid(), kind: "user", text: a.label }); gen.mutate({ id: a.id, p: {} }); return; }
    setParams(d); setParamFor(a);
  };
  const autoRan = React.useRef(false);
  React.useEffect(() => { if (autoRan.current) return; const a = WORKSPACE_ACTIONS.find((x) => x.id === searchParams.action); if (a) { autoRan.current = true; start(a); }   }, []);
  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns.length, gen.isPending, interp.isPending]);

  const submitCommand = (e: React.FormEvent) => { e.preventDefault(); const v = input.trim(); if (!v) return; add({ id: nid(), kind: "user", text: v }); setInput(""); interp.mutate(v); };
  const approve = useMutation({
    mutationFn: (r: WorkspaceResult) => teacherWorkspaceService.approve(r, { id: t.id, name: t.name }),
    onSuccess: (r) => { setTurns((p) => p.map((x) => (x.kind === "result" && x.result.id === r.id ? { ...x, result: r } : x)));
      [KEYS.courses, KEYS.course, KEYS.feed, KEYS.grading, KEYS.attention, KEYS.aiTeachers, KEYS.assignments, KEYS.remedial, KEYS.classes, KEYS.roster, ["t", "att"]].forEach((k) => qc.invalidateQueries({ queryKey: [...k] })); qc.invalidateQueries({ queryKey: ["student"] }); toast.success(r.outcome ?? "Approved"); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const setResult = (r: WorkspaceResult) => setTurns((p) => p.map((x) => (x.kind === "result" && x.result.id === r.id ? { ...x, result: r } : x)));

  return (
    <div className="mx-auto flex max-w-4xl flex-col">
      <PageHeader title="AI Workspace" subtitle="Ask for help or pick an action. You always review, then approve, edit or reject." actions={<AIBadge label="Demo AI" />} />
      <section aria-label="Suggested actions" className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {WORKSPACE_ACTIONS.map((a) => (
          <button key={a.id} onClick={() => start(a)} disabled={gen.isPending} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3 text-left transition-colors hover:border-primary hover:bg-lilac/40 disabled:opacity-60">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lilac text-primary"><Icon name={a.icon} size={18} /></span>
            <span><span className="block text-sm font-semibold">{a.label}</span><span className="text-xs text-text-2">{a.description}</span></span>
          </button>
        ))}
      </section>

      <section aria-label="Conversation" aria-live="polite" className="space-y-3">
        {!turns.length && <Card tone="lilac"><CardBody className="text-sm text-text-2"><p><strong className="text-text">Try typing a command or a question.</strong> “Prepare tomorrow's lesson on fractions” becomes a proposed action. “How many doubts are open?” is simply answered.</p></CardBody></Card>}
        <AnimatePresence initial={false}>
          {turns.map((x) => (
            <motion.div key={x.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {x.kind === "user" && <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-fg">{x.text}</div>}
              {x.kind === "note" && <div role="alert" className="flex items-start gap-2 rounded-2xl bg-warning-soft px-4 py-3 text-sm"><Info size={18} className="mt-0.5 shrink-0 text-warning" />{x.text}</div>}
              {x.kind === "interpretation" && (
                <Card><CardBody className="space-y-3">
                  <div className="flex items-center gap-2"><Badge tone={x.data.kind === "answer" ? "info" : "warning"}>{x.data.kind === "answer" ? "Answer" : "Proposed action"}</Badge><span className="text-sm font-semibold">{x.data.headline}</span></div>
                  {x.data.kind === "answer" ? <p className="text-sm">{x.data.answer}</p> : (
                    <>
                      <dl className="grid gap-2 text-sm sm:grid-cols-2">
                        {[["Action", x.data.action], ["Scope", x.data.scope], ["Affected audience", x.data.audience], ["Approval required", x.data.approval]].map(([k, v]) => <div key={k} className="rounded-xl bg-surface-2 p-2.5"><dt className="text-xs font-semibold text-text-2">{k}</dt><dd className="font-medium">{v}</dd></div>)}
                      </dl>
                      {x.state === "open" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => { patch(x.id, (p) => ({ ...(p as any), state: "confirmed" })); const a = WORKSPACE_ACTIONS.find((w) => w.id === x.data.actionId)!; start(a); }}>Confirm</Button>
                          <Button size="sm" variant="outline" onClick={() => { const a = WORKSPACE_ACTIONS.find((w) => w.id === x.data.actionId)!; patch(x.id, (p) => ({ ...(p as any), state: "confirmed" })); start(a); }}>Edit details</Button>
                          <Button size="sm" variant="ghost" onClick={() => { patch(x.id, (p) => ({ ...(p as any), state: "cancelled" })); toast.info("Cancelled — nothing was changed"); }}>Cancel</Button>
                        </div>
                      ) : <Badge tone={x.state === "confirmed" ? "success" : "neutral"}>{x.state === "confirmed" ? "Confirmed — generating a preview below" : "Cancelled"}</Badge>}
                    </>
                  )}
                </CardBody></Card>
              )}
              {x.kind === "result" && <ResultCard r={x.result} onChange={setResult} onApprove={() => approve.mutate(x.result)} busy={approve.isPending} />}
            </motion.div>
          ))}
        </AnimatePresence>
        {(gen.isPending || interp.isPending) && <div role="status" className="flex items-center gap-2 text-sm text-text-2"><span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />{gen.isPending ? "Preparing a draft…" : "Interpreting…"}</div>}
        <div ref={endRef} />
      </section>

      <form onSubmit={submitCommand} className="sticky bottom-2 mt-4 flex gap-2 rounded-full border border-border bg-surface p-1.5 shadow-soft">
        <label htmlFor="ws-input" className="sr-only">Ask the AI Workspace</label>
        <input id="ws-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question or describe what you need…" className="h-11 min-w-0 flex-1 rounded-full bg-transparent px-4 text-sm outline-none" maxLength={300} />
        <Button type="submit" disabled={!input.trim() || interp.isPending} size="md"><PaperPlaneRight size={16} />Send</Button>
      </form>

      <Modal open={!!paramFor} onOpenChange={(v) => !v && setParamFor(null)} title={paramFor?.label ?? ""} description={paramFor?.description}
        footer={<><Button variant="ghost" onClick={() => setParamFor(null)}>Cancel</Button><Button onClick={() => { const a = paramFor!; add({ id: nid(), kind: "user", text: `${a.label}${a.params.length ? ` — ${a.params.map((p) => p.options?.find((o) => o.value === params[p.key])?.label ?? params[p.key]).join(", ")}` : ""}` }); gen.mutate({ id: a.id, p: params }); setParamFor(null); }}><Sparkle size={16} />Generate preview</Button></>}>
        <div className="space-y-3">{paramFor?.params.map((p) => <Field key={p.key} label={p.label} htmlFor={`p-${p.key}`}>{p.options ? <Select id={`p-${p.key}`} value={params[p.key]} onChange={(e) => setParams((s) => ({ ...s, [p.key]: e.target.value }))}>{p.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select> : <Input id={`p-${p.key}`} value={params[p.key] ?? ""} onChange={(e) => setParams((s) => ({ ...s, [p.key]: e.target.value }))} />}</Field>)}</div>
      </Modal>
    </div>
  );
}

function ResultCard({ r, onChange, onApprove, busy }: { r: WorkspaceResult; onChange: (r: WorkspaceResult) => void; onApprove: () => void; busy: boolean }) {
  const [editing, setEditing] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const decided = r.status !== "pending";
  const link = linkFor[r.actionId];
  return (
    <Card className={decided ? "opacity-95" : "border-primary/40"}>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2"><AIBadge /><Badge tone="highlight">Demo</Badge><Badge tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>{r.status === "pending" ? "Awaiting your decision" : r.status === "approved" ? "Approved" : "Rejected"}</Badge></div>
        <div><h3 className="text-heading">{r.title}</h3><p className="text-sm text-text-2">{r.summary}</p></div>
        <div className="space-y-3">
          {r.fields.map((f) => (
            <div key={f.key}>
              <p className="text-xs font-semibold text-text-2">{f.label}</p>
              {editing && !decided ? (f.multiline ? <Textarea aria-label={f.label} value={f.value} onChange={(e) => onChange({ ...r, fields: r.fields.map((x) => (x.key === f.key ? { ...x, value: e.target.value } : x)) })} /> : <Input aria-label={f.label} value={f.value} onChange={(e) => onChange({ ...r, fields: r.fields.map((x) => (x.key === f.key ? { ...x, value: e.target.value } : x)) })} />) : <p className="whitespace-pre-line text-sm">{f.value}</p>}
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-surface-2 p-3 text-xs"><p className="font-semibold">If you approve:</p><ul className="mt-1 list-disc space-y-0.5 pl-4 text-text-2">{r.consequences.map((c) => <li key={c}>{c}</li>)}</ul></div>
        {!decided && <AiNotice />}
        {r.status === "approved" && <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl bg-success-soft p-3 text-sm text-success"><CheckCircle size={18} weight="fill" />{r.outcome}{link && <Link className="font-semibold underline" href={tHref(link.slug)}>{link.label}<ArrowRight size={12} className="ml-1 inline" /></Link>}</div>}
        {r.status === "rejected" && <p role="status" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">Rejected. Nothing was published, graded or sent.</p>}
        {!decided && (
          <div className="flex flex-wrap gap-2">
            <Button variant="success" size="sm" onClick={onApprove} loading={busy}><CheckCircle size={16} />Approve{editing ? " edited version" : ""}</Button>
            <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)}><PencilSimple size={16} />{editing ? "Done editing" : "Edit"}</Button>
            <Button variant="outline" size="sm" onClick={() => setRejecting(true)}><XCircle size={16} />Reject</Button>
          </div>
        )}
        <Modal open={rejecting} onOpenChange={setRejecting} title="Reject this draft?" description="It will be discarded. Nothing is published, graded or sent." footer={<><Button variant="ghost" onClick={() => setRejecting(false)}>Keep reviewing</Button><Button variant="danger" onClick={() => { onChange({ ...r, status: "rejected" }); setRejecting(false); }}>Reject draft</Button></>}><span /></Modal>
      </CardBody>
    </Card>
  );
}
