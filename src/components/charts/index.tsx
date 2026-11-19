"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const CHART_COLORS = ["#5146E5", "#B8B5FF", "#7044D8", "#F5C66A", "#1D6FB8", "#9A93F5"];

export function ProgressRing({ value, size = 72, stroke = 8, label, children, color = "var(--primary)" }: { value: number; size?: number; stroke?: number; label?: string; children?: React.ReactNode; color?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v)} percent`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - v / 100) }} transition={{ type: "spring", stiffness: 70, damping: 18 }} />
      </svg>
      <div className="tnum absolute inset-0 flex items-center justify-center text-sm font-bold">{children ?? `${Math.round(v)}%`}</div>
    </div>
  );
}

export interface BarDatum { label: string; value: number; color?: string; sub?: string }
export function BarChart({ data, max, horizontal, height = 180, unit = "", onSelect, ariaLabel, selected }: { data: BarDatum[]; max?: number; horizontal?: boolean; height?: number; unit?: string; onSelect?: (d: BarDatum) => void; ariaLabel: string; selected?: string }) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  if (horizontal)
    return (
      <div className="space-y-2.5" role="img" aria-label={`${ariaLabel}: ${data.map((d) => `${d.label} ${d.value}${unit}`).join(", ")}`}>
        {data.map((d, i) => (
          <button key={d.label} type="button" disabled={!onSelect} onClick={() => onSelect?.(d)} className={cn("block w-full text-left", selected === d.label && "rounded-lg bg-lilac/60")}>
            <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{d.label}</span><span className="tnum text-text-2">{d.value}{unit}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-2"><motion.div className="h-full rounded-full" style={{ background: d.color ?? CHART_COLORS[i % 2 === 0 ? 0 : 2] }} initial={{ width: 0 }} animate={{ width: `${(d.value / m) * 100}%` }} transition={{ type: "spring", stiffness: 90, damping: 20 }} /></div>
          </button>
        ))}
      </div>
    );
  return (
    <div role="img" aria-label={`${ariaLabel}: ${data.map((d) => `${d.label} ${d.value}${unit}`).join(", ")}`}>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => (
          <button key={d.label} type="button" disabled={!onSelect} onClick={() => onSelect?.(d)} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="tnum text-[11px] font-semibold text-text-2">{d.value}{unit}</span>
            <motion.div className={cn("w-full max-w-10 rounded-t-lg", selected === d.label && "ring-2 ring-primary")} style={{ background: d.color ?? CHART_COLORS[0] }} initial={{ height: 0 }} animate={{ height: `${Math.max(3, (d.value / m) * 78)}%` }} transition={{ type: "spring", stiffness: 100, damping: 18, delay: i * 0.03 }} />
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">{data.map((d) => <span key={d.label} className="min-w-0 flex-1 truncate text-center text-[11px] text-text-2">{d.label}</span>)}</div>
    </div>
  );
}

export function LineChart({ series, labels, height = 180, ariaLabel, unit = "", min, max }: { series: { name: string; values: number[]; color?: string; dashed?: boolean }[]; labels: string[]; height?: number; ariaLabel: string; unit?: string; min?: number; max?: number }) {
  const w = 480, h = height, pad = { l: 28, r: 8, t: 10, b: 22 };
  const all = series.flatMap((s) => s.values);
  const lo = min ?? Math.min(...all) * 0.9, hi = max ?? Math.max(...all) * 1.05;
  const x = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / Math.max(1, labels.length - 1);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (h - pad.t - pad.b);
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`${ariaLabel}. ${series.map((s) => `${s.name}: ${s.values.join(", ")}${unit}`).join("; ")}`}>
        {[0, 0.5, 1].map((t) => <line key={t} x1={pad.l} x2={w - pad.r} y1={pad.t + t * (h - pad.t - pad.b)} y2={pad.t + t * (h - pad.t - pad.b)} stroke="var(--border)" strokeDasharray="3 4" />)}
        {[0, 0.5, 1].map((t) => <text key={t} x={0} y={pad.t + t * (h - pad.t - pad.b) + 4} fontSize="10" fill="var(--text-2)" className="tnum">{Math.round(hi - t * (hi - lo))}</text>)}
        {series.map((s, si) => {
          const col = s.color ?? CHART_COLORS[si % CHART_COLORS.length];
          const d = s.values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
          return (
            <g key={s.name}>
              <motion.path d={d} fill="none" stroke={col} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dashed ? "6 5" : undefined} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9 }} />
              {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={3} fill="var(--surface)" stroke={col} strokeWidth={2} />)}
            </g>
          );
        })}
        {labels.map((l, i) => <text key={l + i} x={x(i)} y={h - 5} fontSize="10" textAnchor="middle" fill="var(--text-2)">{l}</text>)}
      </svg>
      <Legend items={series.map((s, i) => ({ label: s.name, color: s.color ?? CHART_COLORS[i % CHART_COLORS.length], dashed: s.dashed }))} />
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{items.map((i) => <li key={i.label} className="flex items-center gap-1.5 text-xs text-text-2"><span className="inline-block h-0.5 w-4 rounded" style={{ background: i.color, borderTop: i.dashed ? `2px dashed ${i.color}` : undefined, height: i.dashed ? 0 : 3 }} />{i.label}</li>)}</ul>;
}

export function Donut({ data, size = 140, centre, ariaLabel }: { data: { label: string; value: number; color?: string }[]; size?: number; centre?: React.ReactNode; ariaLabel: string }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1, r = size / 2 - 12, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${ariaLabel}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
        <svg width={size} height={size} className="-rotate-90">
          {data.map((d, i) => { const len = (d.value / total) * c; const el = <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color ?? CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={16} strokeDasharray={`${len - 2} ${c - len + 2}`} strokeDashoffset={-off} />; off += len; return el; })}
        </svg>
        <div className="tnum absolute inset-0 flex items-center justify-center text-center text-sm font-bold">{centre}</div>
      </div>
      <ul className="space-y-1">{data.map((d, i) => <li key={d.label} className="flex items-center gap-2 text-xs"><span className="size-2.5 rounded-sm" style={{ background: d.color ?? CHART_COLORS[i % CHART_COLORS.length] }} /><span className="text-text-2">{d.label}</span><span className="tnum font-semibold">{d.value}</span></li>)}</ul>
    </div>
  );
}

/** Colour-safe heatmap: numeric labels are always rendered inside cells. */
export function Heatmap({ rows, cols, values, max = 3, onCell, ariaLabel, rowTitle, colTitle }: { rows: string[]; cols: string[]; values: number[][]; max?: number; onCell?: (r: number, c: number) => void; ariaLabel: string; rowTitle?: (i: number) => string; colTitle?: (i: number) => string }) {
  return (
    <div className="overflow-x-auto" role="table" aria-label={ariaLabel}>
      <table className="border-separate border-spacing-1 text-xs">
        <thead><tr><th /> {cols.map((c, i) => <th key={c} title={colTitle?.(i)} className="px-1 font-semibold text-text-2">{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r}>
              <th title={rowTitle?.(ri)} className="pr-2 text-left font-semibold text-text-2">{r}</th>
              {cols.map((c, ci) => {
                const v = values[ri][ci], t = v / max;
                return (
                  <td key={c}>
                    <button type="button" onClick={() => onCell?.(ri, ci)} disabled={!onCell} aria-label={`${r} to ${c}: ${v}`} title={`${r} → ${c}: ${v}`}
                      className="tnum flex size-9 items-center justify-center rounded-lg font-bold" style={{ background: v === 0 ? "var(--surface-2)" : `color-mix(in srgb, var(--primary) ${Math.round(18 + t * 72)}%, var(--surface))`, color: t > 0.5 ? "#fff" : "var(--text)" }}>{v === 0 ? "–" : v}</button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Sparkline({ values, width = 80, height = 28, color = "var(--primary)" }: { values: number[]; width?: number; height?: number; color?: string }) {
  const lo = Math.min(...values), hi = Math.max(...values), x = (i: number) => (i * width) / Math.max(1, values.length - 1), y = (v: number) => height - 3 - ((v - lo) / (hi - lo || 1)) * (height - 6);
  return <svg width={width} height={height} role="img" aria-label={`Trend: ${values.join(", ")}`}><path d={values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" /></svg>;
}

export function StackedBar({ segments, ariaLabel }: { segments: { label: string; value: number; color: string }[]; ariaLabel: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${ariaLabel}: ${segments.map((s) => `${s.label} ${s.value}`).join(", ")}`}>
        {segments.map((s) => <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label}: ${s.value}`} />)}
      </div>
      <Legend items={segments.map((s) => ({ label: `${s.label} (${s.value})`, color: s.color }))} />
    </div>
  );
}
