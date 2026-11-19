"use client";
import * as React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, Button, Field, Input, Select, Textarea, toast, Badge } from "@/components/ui";
import { governanceService } from "@/lib/api/governanceService";
import { ACTOR, onErr, DemoNote } from "../kit";

export interface InterventionSeed { branchId: string; branchName: string; classId?: string; className?: string; gap?: string; title?: string }
const ACTIONS = ["Remedial group with teacher + AI Teacher support", "Targeted parent-teacher check-ins", "Schedule extra practice assignments", "Timetable review for the class", "Teacher peer-coaching session"];

/** Reviews an intervention then creates a real approval in Governance (journey J). */
export function InterventionDialog({ seed, onClose, onDone }: { seed: InterventionSeed | null; onClose: () => void; onDone?: () => void }) {
  const qc = useQueryClient();
  const [action, setAction] = React.useState(ACTIONS[0]); const [note, setNote] = React.useState(""); const [done, setDone] = React.useState(false);
  React.useEffect(() => { if (seed) { setAction(ACTIONS[0]); setNote(""); setDone(false); } }, [seed]);
  const m = useMutation({
    mutationFn: () => governanceService.createApproval({ kind: "intervention", title: seed?.title ?? `Intervention for ${seed?.branchName}`, summary: `${action}. Scope: ${seed?.className ?? seed?.branchName}${seed?.gap ? `. Lowest objective: ${seed.gap}` : ""}. ${note}`.trim(), requestedBy: ACTOR, meta: { branch: seed?.branchName ?? "", action } }),
    onSuccess: () => { setDone(true); qc.invalidateQueries({ queryKey: ["inst", "approvals"] }); qc.invalidateQueries({ queryKey: ["inst", "audit"] }); toast.success("Approval action created in Governance approvals."); onDone?.(); }, onError: onErr,
  });
  return (
    <Modal open={!!seed} onOpenChange={(v) => !v && onClose()} title="Review intervention" description="Nothing runs until a person approves it in Governance."
      footer={done ? <><Button variant="ghost" onClick={onClose}>Close</Button><Button asChild><Link href="/institution/governance">Open approvals queue</Link></Button></> : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={() => m.mutate()}>Create approval action</Button></>}>
      {done ? <p role="status" className="text-sm">Created. It now appears in <strong>Governance → Approvals</strong> as “intervention”, pending a decision.</p> : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2"><Badge tone="primary">{seed?.branchName}</Badge>{seed?.className && <Badge tone="info">{seed.className}</Badge>}{seed?.gap && <Badge tone="warning">Gap: {seed.gap}</Badge>}</div>
          <Field label="Proposed intervention" htmlFor="iv-action"><Select id="iv-action" value={action} onChange={(e) => setAction(e.target.value)}>{ACTIONS.map((a) => <option key={a}>{a}</option>)}</Select></Field>
          <Field label="Notes for approvers" optional htmlFor="iv-note"><Textarea id="iv-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. start after mid-term, 3 sessions a week" /></Field>
          <DemoNote tone="info">The data shows a gap, not its cause. Approvers should confirm context before acting.</DemoNote>
        </div>)}
    </Modal>
  );
}
