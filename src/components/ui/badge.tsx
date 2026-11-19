import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-surface-2 text-text-2",
  primary: "bg-lilac text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  highlight: "bg-highlight-soft text-warning",
  ai: "bg-gradient-to-r from-primary to-violet text-white",
};
export type Tone = keyof typeof tones;
/** Status chips always include text (never colour alone); pass `icon` for an extra non-colour cue. */
export function Badge({ tone = "neutral", icon, className, children, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; icon?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone], className)} {...p}>
      {icon}
      {children}
    </span>
  );
}
/** Maps common status strings to a tone. */
export function statusTone(s: string): Tone {
  const k = s.toLowerCase();
  if (/(resolved|approved|published|active|successful|paid|ready|indexed|live|released|completed|verified|connected|healthy|graded|present|answered)/.test(k)) return "success";
  if (/(pending|awaiting|processing|due|scheduled|submitted|follow|review|draft|testing|upcoming|waitlist|partial|near|late)/.test(k)) return "warning";
  if (/(failed|rejected|overdue|error|cancelled|exceeded|absent|suspended|revoked|removed|conflict)/.test(k)) return "danger";
  return "neutral";
}
export const StatusBadge = ({ status, label }: { status: string; label?: string }) => <Badge tone={statusTone(status)}>{label ?? status}</Badge>;
export const AIBadge = ({ label = "AI-generated" }: { label?: string }) => <Badge tone="ai">{label}</Badge>;
export const DemoTag = ({ label = "Demo data" }: { label?: string }) => <Badge tone="highlight">{label}</Badge>;
