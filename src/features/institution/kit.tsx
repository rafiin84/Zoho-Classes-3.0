"use client";
import * as React from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { CaretUp, CaretDown, Info } from "@phosphor-icons/react";
import { useApp, useActors } from "@/stores/app-store";
import { Button, Card, ErrorState, SkeletonCards, Textarea, Modal, Field, toast, cn, Badge } from "@/components/ui";
import type { Ctx } from "@/lib/api/institutionService";
import { recordAudit } from "@/lib/api/governanceService";

/** Institution context from the shell selectors (branch + academic year) and scenario flags. Include `key` in query keys. */
export function useCtx() {
  const inst = useApp((s) => s.institutionContext);
  const branch = useApp((s) => s.branchContext);
  const year = useApp((s) => s.academicYear);
  const { flags } = useActors();
  const declining = flags.includes("declining-branch");
  // Branch selection from another institution is meaningless: fall back to "all".
  const ctx: Ctx = { inst, branch, year, declining };
  const key = [inst, branch, year, declining] as const;
  const instName = inst === "inst-meridian" ? "Meridian University" : "Greenfield International School";
  return { ctx, key, instName, isUniversity: inst === "inst-meridian" };
}

export function Q<T>({ q, children, rows = 3, h = "h-28" }: { q: UseQueryResult<T>; children: (d: T) => React.ReactNode; rows?: number; h?: string }) {
  if (q.isLoading) return <SkeletonCards n={rows} h={h} />;
  if (q.isError || q.data === undefined) return <ErrorState onRetry={() => q.refetch()} />;
  return <>{children(q.data)}</>;
}
export function useQ<T>(key: unknown[], fn: () => Promise<T>) { return useQuery({ queryKey: ["inst", ...key], queryFn: fn }); }

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
export const onErr = (e: unknown) => toast.error(errMsg(e));

export function DemoNote({ children, tone = "demo" }: { children: React.ReactNode; tone?: "demo" | "info" }) {
  return (
    <div role="note" className={cn("mb-4 flex items-start gap-2 rounded-xl px-3 py-2 text-xs", tone === "demo" ? "bg-highlight-soft text-warning" : "bg-info-soft text-info")}>
      <Info size={16} weight="fill" className="mt-0.5 shrink-0" /><span>{children}</span>
    </div>
  );
}

export interface Col<T> { key: string; header: string; cell: (r: T) => React.ReactNode; sort?: (a: T, b: T) => number; className?: string; align?: "right" }
export function DataTable<T>({ rows, cols, rowKey, onRowClick, pageSize = 8, ariaLabel, empty, selectedKey }: { rows: T[]; cols: Col<T>[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; pageSize?: number; ariaLabel: string; empty?: React.ReactNode; selectedKey?: string }) {
  const [sort, setSort] = React.useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = React.useState(0);
  React.useEffect(() => setPage(0), [rows.length]);
  const sorted = React.useMemo(() => { const c = cols.find((x) => x.key === sort?.key); return c?.sort && sort ? [...rows].sort((a, b) => c.sort!(a, b) * sort.dir) : rows; }, [rows, sort, cols]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const view = sorted.slice(cur * pageSize, cur * pageSize + pageSize);
  if (!rows.length) return <>{empty}</>;
  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[560px] text-sm" aria-label={ariaLabel}>
          <thead className="bg-surface-2 text-left text-xs text-text-2">
            <tr>{cols.map((c) => (
              <th key={c.key} scope="col" className={cn("px-3 py-2.5 font-semibold", c.align === "right" && "text-right")} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                {c.sort ? <button type="button" className="inline-flex min-h-8 items-center gap-1 font-semibold hover:text-text" onClick={() => setSort((s) => (s?.key === c.key ? (s.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 }))}>{c.header}{sort?.key === c.key && (sort.dir === 1 ? <CaretUp size={12} /> : <CaretDown size={12} />)}</button> : c.header}
              </th>))}</tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={rowKey(r)} className={cn("border-t border-border", onRowClick && "cursor-pointer hover:bg-lilac/40", selectedKey === rowKey(r) && "bg-lilac/60")} onClick={() => onRowClick?.(r)}
                tabIndex={onRowClick ? 0 : undefined} onKeyDown={(e) => { if (onRowClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onRowClick(r); } }}>
                {cols.map((c) => <td key={c.key} className={cn("px-3 py-2.5 align-middle", c.align === "right" && "tnum text-right", c.className)}>{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-2 flex items-center justify-between text-xs text-text-2">
          <span className="tnum" aria-live="polite">Page {cur + 1} of {pages}</span>
          <div className="flex gap-1"><Button size="sm" variant="outline" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next</Button></div>
        </div>
      )}
    </div>
  );
}

/** Modal that requires a typed reason (reject / suspend / withdraw). */
export function ReasonModal({ open, onOpenChange, title, label = "Reason", confirmLabel = "Confirm", onSubmit, busy }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; label?: string; confirmLabel?: string; onSubmit: (reason: string) => void; busy?: boolean }) {
  const [r, setR] = React.useState(""); const [err, setErr] = React.useState("");
  React.useEffect(() => { if (open) { setR(""); setErr(""); } }, [open]);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="danger" loading={busy} onClick={() => { if (r.trim().length < 5) { setErr("Please give a reason of at least 5 characters."); return; } onSubmit(r.trim()); }}>{confirmLabel}</Button></>}>
      <Field label={label} error={err} htmlFor="reason-input" required><Textarea id="reason-input" value={r} onChange={(e) => setR(e.target.value)} aria-invalid={!!err} placeholder="Recorded in the audit trail" /></Field>
    </Modal>
  );
}

export function Meter({ label, value, tone = "primary", suffix = "%" }: { label: string; value: number; tone?: "primary" | "success" | "warning" | "danger"; suffix?: string }) {
  const c = { primary: "bg-primary", success: "bg-success", warning: "bg-warning", danger: "bg-danger" }[tone];
  return <div><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span className="tnum font-semibold">{value}{suffix}</span></div><div className="h-2 rounded-full bg-surface-2" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><div className={cn("h-2 rounded-full", c)} style={{ width: `${Math.min(100, value)}%` }} /></div></div>;
}

export const Panel = ({ title, children, action, className }: { title?: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) => (
  <Card className={cn("p-4", className)}>{(title || action) && <div className="mb-3 flex items-center justify-between gap-2">{title && <h3 className="text-sm font-bold">{title}</h3>}{action}</div>}{children}</Card>
);

export const sev = (v: number, good = 75, ok = 60): "success" | "warning" | "danger" => (v >= good ? "success" : v >= ok ? "warning" : "danger");
export const SevBadge = ({ v, suffix = "%" }: { v: number; suffix?: string }) => <Badge tone={sev(v)} className="tnum">{v}{suffix}</Badge>;

/** Simulated export: records an audit event and confirms; never creates a real data leak. */
export function simulateExport(label: string, context = "Reports") {
  recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: "Exported report (simulated)", category: "Data export", target: label, context });
  toast.success(`${label}: export prepared (demo — no file leaves this prototype).`);
}
export const ACTOR = "Principal Anita Desai";
