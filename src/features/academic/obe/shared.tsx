"use client";
import { Badge } from "@/components/ui";

export const OBE_DISCLAIMER = "Fictional demo data for Meridian University. Never present as official accreditation or NBA/NAAC data.";
export function DemoBanner() {
  return <div role="note" className="mb-4 rounded-xl border border-highlight/50 bg-highlight-soft px-3.5 py-2 text-xs font-medium text-warning">{OBE_DISCLAIMER}</div>;
}
export const levelTone = (v: number, t: number) => (v >= t ? "success" : v >= t - 0.5 ? "warning" : "danger") as "success" | "warning" | "danger";
export const LevelBadge = ({ v, t }: { v: number; t: number }) => <Badge tone={levelTone(v, t)}>{v.toFixed(2)} {v >= t ? "Met" : v >= t - 0.5 ? "Near" : "Gap"}</Badge>;
