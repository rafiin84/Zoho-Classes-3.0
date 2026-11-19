"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { cn, initials } from "@/lib/utils";
import { Button } from "./button";
import { Card } from "./card";
import { Warning, MagnifyingGlass, Tray } from "@phosphor-icons/react";

export function Progress({ value, className, tone = "primary", label, size = "md" }: { value: number; className?: string; tone?: "primary" | "success" | "warning" | "highlight" | "danger"; label?: string; size?: "sm" | "md" | "lg" }) {
  const v = Math.max(0, Math.min(100, value));
  const colour = { primary: "bg-primary", success: "bg-success", warning: "bg-warning", highlight: "bg-highlight", danger: "bg-danger" }[tone];
  return (
    <div role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progress"} className={cn("w-full overflow-hidden rounded-full bg-surface-2", size === "sm" ? "h-1.5" : size === "lg" ? "h-3.5" : "h-2.5", className)}>
      <motion.div className={cn("h-full rounded-full", colour)} initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
    </div>
  );
}

export function Avatar({ name, color = "#5146E5", size = 40, className, ai, src }: { name: string; color?: string; size?: number; className?: string; ai?: boolean; src?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white", ai && "rounded-2xl", className)}
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #7044d8))`, fontSize: size * 0.38 }} aria-label={name} role="img">
      {src ? <img src={src} alt="" className="size-full rounded-[inherit] object-cover" /> : initials(name)}
      {ai && <span className="absolute -bottom-1 -right-1 rounded-md bg-surface px-1 text-[9px] font-extrabold text-primary shadow-soft">AI</span>}
    </span>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cn("skeleton", className)} aria-hidden />;
export const SkeletonCards = ({ n = 3, h = "h-32" }: { n?: number; h?: string }) => (
  <div className="space-y-3" role="status" aria-label="Loading">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className={cn("w-full", h)} />)}</div>
);

export function EmptyState({ title, body, action, icon }: { title: string; body: string; action?: { label: string; onClick?: () => void; href?: string }; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-border bg-surface px-6 py-12 text-center">
      <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-lilac text-primary">{icon ?? <Tray size={28} weight="duotone" />}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-2">{body}</p>
      {action && (action.href ? <Button asChild className="mt-4" variant="soft"><a href={action.href}>{action.label}</a></Button> : <Button className="mt-4" variant="soft" onClick={action.onClick}>{action.label}</Button>)}
    </div>
  );
}
export function NoResults({ onClear, query }: { onClear: () => void; query?: string }) {
  return <EmptyState icon={<MagnifyingGlass size={28} weight="duotone" />} title="No results match" body={query ? `Nothing found for “${query}” with the current filters.` : "No items match the current filters."} action={{ label: "Clear all filters", onClick: onClear }} />;
}
export function ErrorState({ title = "Something didn't load", body = "This was a simulated network hiccup — your draft is safe. Try again.", onRetry }: { title?: string; body?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-[1.25rem] border border-danger/30 bg-danger-soft px-6 py-10 text-center">
      <Warning size={32} weight="duotone" className="text-danger" />
      <h3 className="mt-2 font-semibold text-danger">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-2">{body}</p>
      {onRetry && <Button className="mt-4" variant="outline" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow, back }: { title: string; subtitle?: string; actions?: React.ReactNode; eyebrow?: React.ReactNode; back?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back}
        {eyebrow && <div className="mb-1">{eyebrow}</div>}
        <h1 className="text-display">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-text-2 sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
export function SectionHeader({ title, action, subtitle }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div><h2 className="text-heading">{title}</h2>{subtitle && <p className="text-sm text-text-2">{subtitle}</p>}</div>
      {action}
    </div>
  );
}

export function StatTile({ label, value, delta, hint, icon, tone = "surface", className }: { label: string; value: React.ReactNode; delta?: { value: string; up?: boolean; good?: boolean }; hint?: string; icon?: React.ReactNode; tone?: "surface" | "lilac" | "plain"; className?: string }) {
  return (
    <Card tone={tone} className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-text-2">{label}</p>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <p className="tnum mt-1 text-2xl font-bold tracking-tight">{value}</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
        {delta && <span className={cn("font-semibold", delta.good === false ? "text-danger" : "text-success")}>{delta.up ? "▲" : "▼"} {delta.value}</span>}
        {hint && <span className="text-text-2">{hint}</span>}
      </div>
    </Card>
  );
}

/** Gradient cover — always renders (no remote image dependency). */
export function Cover({ from, to, icon, className, children, rounded = "rounded-2xl" }: { from: string; to: string; icon?: React.ReactNode; className?: string; children?: React.ReactNode; rounded?: string }) {
  return (
    <div className={cn("relative overflow-hidden", rounded, className)} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <div className="pointer-events-none absolute -right-6 -top-6 size-32 rounded-full bg-white/15 blur-sm" />
      <div className="pointer-events-none absolute -bottom-10 left-6 size-28 rounded-full bg-white/10" />
      {icon && <div className="absolute inset-0 flex items-center justify-center text-white/90">{icon}</div>}
      {children}
    </div>
  );
}

export function Rail({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("no-scrollbar snap-rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0", className)}>{children}</div>;
}

export function Segmented<T extends string>({ value, onChange, options, className, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; className?: string; label?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cn("no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface-2 p-1", className)}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cn("relative h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors", value === o.value ? "text-primary" : "text-text-2 hover:text-text")}>
          {value === o.value && <motion.span layoutId={`seg-${label ?? "x"}`} className="absolute inset-0 rounded-full bg-surface shadow-soft" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
          <span className="relative">{o.label}{o.count !== undefined && <span className="ml-1.5 text-xs opacity-70 tnum">{o.count}</span>}</span>
        </button>
      ))}
    </div>
  );
}

/** Standard list toolbar: search, optional filters/sort, result count. Fully controlled. */
export function ListToolbar({ query, onQuery, placeholder = "Search", count, children, onClear, hasFilters }: { query: string; onQuery: (v: string) => void; placeholder?: string; count?: number; children?: React.ReactNode; onClear?: () => void; hasFilters?: boolean }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <MagnifyingGlass size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-2" />
        <input aria-label={placeholder} value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder} className="h-11 w-full rounded-full border border-border bg-surface pl-10 pr-4 text-sm" />
      </div>
      {children}
      {(hasFilters || query) && onClear && <Button variant="ghost" size="sm" onClick={onClear}>Clear</Button>}
      {count !== undefined && <span className="tnum text-xs text-text-2" aria-live="polite">{count} result{count === 1 ? "" : "s"}</span>}
    </div>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="no-scrollbar flex gap-2 overflow-x-auto" aria-label="Progress steps">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined} className={cn("flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold", i === current ? "bg-primary text-primary-fg" : i < current ? "bg-success-soft text-success" : "bg-surface-2 text-text-2")}>
          <span className="tnum flex size-5 items-center justify-center rounded-full bg-black/10 text-[11px]">{i < current ? "✓" : i + 1}</span>{s}
        </li>
      ))}
    </ol>
  );
}
