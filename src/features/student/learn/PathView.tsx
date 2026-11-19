"use client";
import { motion } from "framer-motion";
import { Check, Lock, Play, Sparkle, FirstAidKit, Target, Flag } from "@phosphor-icons/react";
import { Badge, cn } from "@/components/ui";
import type { PathNode, PathTag } from "./path";

const ROW = 118;
const TAG: Record<PathTag, { label: string; tone: "primary" | "ai" | "success" | "highlight" | "info" | "neutral" }> = {
  "teacher-assigned": { label: "Teacher assigned", tone: "primary" }, "ai-recommended": { label: "AI recommended", tone: "ai" }, adaptive: { label: "Adaptive checkpoint", tone: "info" },
  remedial: { label: "Recovery branch", tone: "highlight" }, optional: { label: "Optional", tone: "neutral" }, baseline: { label: "Baseline", tone: "primary" },
};
const xAt = (i: number, branch: boolean) => 50 + Math.sin(i * 1.25) * 24 + (branch ? 6 : 0);

/** Visual winding path of nodes. Labels sit on the roomier side of each node. */
export function PathView({ nodes, onOpen }: { nodes: PathNode[]; onOpen: (n: PathNode) => void }) {
  const H = nodes.length * ROW + 40;
  const pts = nodes.map((n, i) => ({ x: xAt(i, n.kind === "remedial"), y: i * ROW + 56 }));
  const d = pts.map((p, i) => { if (i === 0) return `M ${p.x} ${p.y}`; const q = pts[i - 1]; const my = (q.y + p.y) / 2; return `C ${q.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y}`; }).join(" ");
  const doneIdx = nodes.reduce((a, n, i) => (n.status === "done" ? i : a), -1);
  const dDone = pts.slice(0, doneIdx + 1).map((p, i) => { if (i === 0) return `M ${p.x} ${p.y}`; const q = pts[i - 1]; const my = (q.y + p.y) / 2; return `C ${q.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y}`; }).join(" ");
  return (
    <ol className="relative list-none" style={{ height: H }} aria-label="Learning path">
      <svg aria-hidden className="absolute inset-0 size-full" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none">
        <path d={d} fill="none" stroke="var(--border)" strokeWidth={4} strokeLinecap="round" strokeDasharray="1 9" vectorEffect="non-scaling-stroke" />
        {doneIdx >= 0 && <path d={dDone} fill="none" stroke="var(--primary)" strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      </svg>
      {nodes.map((n, i) => {
        const p = pts[i]; const left = p.x <= 50; const cur = n.status === "current"; const done = n.status === "done"; const lock = n.status === "locked";
        const Ic = done ? Check : lock ? Lock : n.kind === "remedial" ? FirstAidKit : n.kind === "baseline" ? Target : n.kind === "extension" ? Sparkle : i === nodes.length - 1 ? Flag : Play;
        return (
          <li key={n.id} className="absolute inset-x-0" style={{ top: p.y - 28, height: ROW - 10 }}>
            <button type="button" onClick={() => onOpen(n)} aria-label={`${n.title}, ${n.status === "current" ? "up next" : n.status}`} aria-current={cur ? "step" : undefined}
              className={cn("absolute z-10 flex size-14 -translate-x-1/2 items-center justify-center rounded-full border-4 border-bg shadow-card transition-transform hover:scale-105",
                done && "bg-primary text-primary-fg", cur && "bg-gradient-to-br from-primary to-violet text-white ring-4 ring-primary/25", !done && !cur && !lock && "bg-surface text-primary", lock && "bg-surface-2 text-text-2", n.kind === "remedial" && !done && "!bg-highlight-soft text-warning")}
              style={{ left: `${p.x}%` }}>
              {cur && <motion.span aria-hidden className="absolute inset-0 rounded-full border-2 border-primary" animate={{ scale: [1, 1.5], opacity: [0.7, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />}
              <Ic size={22} weight="fill" />
            </button>
            <div className={cn("absolute top-0 max-w-[46%] space-y-1", left ? "text-left" : "text-right")} style={left ? { left: `calc(${p.x}% + 44px)` } : { right: `calc(${100 - p.x}% + 44px)` }}>
              <p className={cn("text-sm font-semibold leading-snug", lock && "text-text-2")}>{n.title}</p>
              <div className={cn("flex flex-wrap gap-1", !left && "justify-end")}>{cur && <Badge tone="primary">Up next</Badge>}{n.tags.slice(0, 2).map((t) => <Badge key={t} tone={TAG[t].tone}>{TAG[t].label}</Badge>)}</div>
              <p className="tnum text-xs text-text-2">{n.minutes} min{n.due ? ` · due ${new Date(n.due).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}` : ""}{lock ? " · unlocks after re-check" : ""}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
