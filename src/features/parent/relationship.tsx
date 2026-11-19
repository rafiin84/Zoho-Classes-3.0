"use client";
import { create } from "zustand";
import { ShieldWarning, LockSimple, UserMinus, Hourglass, ShieldCheck } from "@phosphor-icons/react";
import { Badge, Card, CardBody, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

export type RelStatus = "verified" | "pending" | "limited" | "revoked";
interface RelState { status: RelStatus; noChild: boolean; set: (s: RelStatus) => void; setNoChild: (v: boolean) => void }
/** PROTOTYPE STATE ONLY: not real identity verification. Lets reviewers see how the parent experience behaves in each relationship state. */
export const useRelationship = create<RelState>((set) => ({ status: "verified", noChild: false, set: (status) => set({ status }), setNoChild: (noChild) => set({ noChild }) }));

const COPY: Record<RelStatus, { label: string; tone: "success" | "warning" | "info" | "danger"; body: string }> = {
  verified: { label: "Verified", tone: "success", body: "Full access to your child's school records." },
  pending: { label: "Pending verification", tone: "warning", body: "The school is confirming your relationship. You can see the schedule overview only." },
  limited: { label: "Access limited", tone: "info", body: "You can see attendance, timetable and learning progress. Fees, results and messaging are held back." },
  revoked: { label: "Access revoked", tone: "danger", body: "The school removed this link. No records are shown." },
};

export function RelationshipPanel() {
  const { status, noChild, set, setNoChild } = useRelationship(); const c = COPY[status];
  return (
    <Card tone="plain"><CardBody className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={18} className="text-primary" />Relationship status</h2><Badge tone="highlight">Prototype state · not real identity verification</Badge></div>
      <p className="text-sm"><Badge tone={c.tone}>{c.label}</Badge> <span className="ml-1 text-text-2">{c.body}</span></p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Demo: relationship status">{(Object.keys(COPY) as RelStatus[]).map((s) => <button key={s} aria-pressed={status === s} onClick={() => set(s)} className={cn("h-9 rounded-full px-3 text-xs font-semibold", status === s ? "bg-primary text-primary-fg" : "bg-surface text-text-2 hover:bg-lilac")}>{COPY[s].label}</button>)}<button aria-pressed={noChild} onClick={() => setNoChild(!noChild)} className={cn("h-9 rounded-full px-3 text-xs font-semibold", noChild ? "bg-primary text-primary-fg" : "bg-surface text-text-2 hover:bg-lilac")}>No child linked</button></div>
    </CardBody></Card>
  );
}

/** Wrap screens whose data needs a given trust level. `full` = fees, results, messages; `basic` = learning/attendance/etc. */
export function AccessGate({ need = "full", children }: { need?: "basic" | "full"; children: React.ReactNode }) {
  const { status, noChild } = useRelationship();
  if (noChild) return <EmptyState icon={<UserMinus size={28} weight="duotone" />} title="No child is linked to your account" body="Ask your child's school to link you, or use the invitation they sent. Once linked and verified, your child's records appear here." action={{ label: "Learn what you'll see", href: "/parent/onboarding" }} />;
  if (status === "revoked") return <EmptyState icon={<LockSimple size={28} weight="duotone" />} title="Access to this child's records was removed" body="The school ended this link. If this looks wrong, contact the school office; this prototype can't restore it." action={{ label: "Back to home", href: "/parent/home" }} />;
  if (status === "pending") return <EmptyState icon={<Hourglass size={28} weight="duotone" />} title="Waiting for the school to verify your relationship" body="Until it's confirmed, detailed records stay private. This usually takes a working day or two." action={{ label: "Back to home", href: "/parent/home" }} />;
  if (status === "limited" && need === "full") return <EmptyState icon={<ShieldWarning size={28} weight="duotone" />} title="This part isn't available with limited access" body="Fees, results and messaging need full verification. Attendance, timetable and learning progress are still available." action={{ label: "Back to home", href: "/parent/home" }} />;
  return <>{children}</>;
}
