"use client";
import * as React from "react";
import Link from "next/link";
import type { UseQueryResult } from "@tanstack/react-query";
import { CaretRight, LockKey, Info, ShieldCheck } from "@phosphor-icons/react";
import { Badge, Button, Card, CardBody, ErrorState, Skeleton, Modal, Field, Textarea, Checkbox, toast, cn } from "@/components/ui";
import { useActors } from "@/stores/app-store";
import { DEMO_NOTE } from "@/lib/mock-data/government";
import { ServiceError } from "@/lib/api/latency";

export const G = (p: string) => `/government/${p}`;
export const useLowBaseline = () => useActors().flags.includes("low-baseline");
export const errMsg = (e: unknown) => (e instanceof ServiceError || e instanceof Error ? e.message : "Something went wrong.");

/** Source + time label required on every metric. */
export function Src({ text, className }: { text: string; className?: string }) {
  return <p className={cn("mt-1 text-[11px] leading-snug text-text-2", className)}><Info size={11} className="mr-1 inline -translate-y-px" aria-hidden />{text}</p>;
}
export const DemoBanner = ({ extra }: { extra?: string }) => (
  <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-highlight-soft px-3 py-2 text-xs text-text-2" role="note">
    <Badge tone="highlight">Demo data</Badge><span>{DEMO_NOTE}. {extra ?? "Figures are illustrative, not real statistics."}</span>
  </div>
);

/** Generic loading / error wrapper for a query. */
export function Async<T>({ q, children, skeleton }: { q: UseQueryResult<T>; children: (d: T) => React.ReactNode; skeleton?: React.ReactNode }) {
  if (q.isLoading) return <>{skeleton ?? <div className="space-y-3" role="status" aria-label="Loading"><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div>}</>;
  if (q.isError || q.data === undefined) return <ErrorState onRetry={() => q.refetch()} />;
  return <>{children(q.data)}</>;
}

export function Crumbs({ items }: { items: { label: string; onClick?: () => void; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={c.label + i} className="flex items-center gap-1">
              {i > 0 && <CaretRight size={12} className="text-text-2" aria-hidden />}
              {last ? <span aria-current="page" className="font-semibold">{c.label}</span>
                : c.href ? <Link href={c.href} className="rounded px-1 text-primary hover:underline">{c.label}</Link>
                : <button type="button" onClick={c.onClick} className="rounded px-1 text-primary hover:underline">{c.label}</button>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Permission-aware student-level gate. Government never accesses private student conversations; student records need an institutional grant. */
export function StudentGate({ scope, onRequest }: { scope: string; onRequest?: () => void }) {
  return (
    <div role="status" className="rounded-2xl border border-border bg-surface-2 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning"><LockKey size={22} weight="duotone" /></span>
        <div className="min-w-0">
          <h3 className="font-semibold">Permission prevents student-level drill-down</h3>
          <p className="mt-1 text-sm text-text-2">Your role can see aggregate results for <strong>{scope}</strong>. Individual student records belong to the institution and need a scoped access grant from it. Private student conversations (tutor chats, doubts, parent messages) are never available to government roles. Drilling down does not transfer data ownership.</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-text-2"><li>Aggregate cohorts of 20+ students remain visible</li><li>Requests are recorded in the state audit trail and shown to the institution</li></ul>
          {onRequest && <Button className="mt-3" size="sm" variant="outline" onClick={onRequest}><ShieldCheck size={16} />Request scoped access from institution</Button>}
        </div>
      </div>
    </div>
  );
}

/** Decision dialog with required notes and optional explicit statewide confirmation. */
export function DecisionDialog({ open, onOpenChange, title, subtitle, decision, requireConfirm, confirmLabel, onSubmit, busy }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; subtitle?: string; decision: "approved" | "rejected"; requireConfirm?: boolean; confirmLabel?: string;
  onSubmit: (notes: string, confirmed: boolean) => Promise<unknown> | void; busy?: boolean;
}) {
  const [notes, setNotes] = React.useState(""); const [ok, setOk] = React.useState(false); const [err, setErr] = React.useState("");
  React.useEffect(() => { if (open) { setNotes(""); setOk(false); setErr(""); } }, [open]);
  const approve = decision === "approved";
  const submit = async () => {
    if (notes.trim().length < 5) return setErr(approve ? "Add approver notes (5+ characters)." : "Give a reason (5+ characters).");
    if (approve && requireConfirm && !ok) return setErr("Tick the confirmation to proceed.");
    setErr("");
    try { await onSubmit(notes.trim(), ok); onOpenChange(false); } catch (e) { setErr(errMsg(e)); }
  };
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={subtitle}
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant={approve ? "success" : "danger"} loading={busy} onClick={submit}>{approve ? "Approve" : "Reject"}</Button></>}>
      <div className="space-y-3">
        <Field label={approve ? "Approver notes" : "Reason for rejection"} required error={err} htmlFor="dec-notes"><Textarea id="dec-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={approve ? "Why this is approved, and any conditions" : "What needs to change"} aria-invalid={!!err} /></Field>
        {approve && requireConfirm && <div className="rounded-xl bg-warning-soft p-3"><Checkbox checked={ok} onChange={setOk} label={confirmLabel ?? "I confirm this explicit human approval for a statewide action."} /></div>}
        <p className="text-xs text-text-2">Decisions are recorded in the state audit trail. AI suggests; authorised officials decide.</p>
      </div>
    </Modal>
  );
}

export function Meter({ label, value, src, tone = "primary" }: { label: string; value: number; src?: string; tone?: "primary" | "success" | "warning" | "danger" }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{label}</span><span className="tnum text-text-2">{value}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}><div className={cn("h-full rounded-full", { primary: "bg-primary", success: "bg-success", warning: "bg-warning", danger: "bg-danger" }[tone])} style={{ width: `${value}%` }} /></div>
      {src && <Src text={src} />}
    </div>
  );
}
export const toneFor = (v: number, good = 75, ok = 55): "success" | "warning" | "danger" => (v >= good ? "success" : v >= ok ? "warning" : "danger");

export function Panel({ title, subtitle, src, actions, children, className }: { title: string; subtitle?: string; src?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardBody>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h2 className="text-heading">{title}</h2>{subtitle && <p className="text-sm text-text-2">{subtitle}</p>}</div>{actions}</div>
        {children}
        {src && <Src text={src} />}
      </CardBody>
    </Card>
  );
}

export const pct = (n: number) => `${Math.round(n)}%`;
export const copyToast = (msg: string) => toast.success(msg);
