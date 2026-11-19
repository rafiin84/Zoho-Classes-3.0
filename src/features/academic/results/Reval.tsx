"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardBody, Field, Input, Modal, StatusBadge, Textarea, Skeleton, ErrorState, EmptyState, toast } from "@/components/ui";
import { marksheetService } from "@/lib/api/marksheetService";
import type { RevalRequest } from "@/types/results";
import { studentName } from "./common";

export default function Reval({ canDecide }: { canDecide: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["results", "reval"], queryFn: marksheetService.revaluations });
  const [r, setR] = React.useState<RevalRequest | null>(null); const [dec, setDec] = React.useState<"accept" | "reject">("accept"); const [note, setNote] = React.useState(""); const [ni, setNi] = React.useState(0); const [ne, setNe] = React.useState(0);
  const inv = () => qc.invalidateQueries({ queryKey: ["results"] });
  const start = useMutation({ mutationFn: (id: string) => marksheetService.decideReval(id, "start", ""), onSuccess: () => { toast.success("Request moved to in-review."); inv(); } });
  const done = useMutation({ mutationFn: async () => { if (dec === "accept") { await marksheetService.correct(r!.sheetId, r!.subjectId, ni, ne, `Revaluation ${r!.id}: ${note}`); } return marksheetService.decideReval(r!.id, dec, note, { internal: ni, external: ne }); }, onSuccess: () => { toast.success(dec === "accept" ? "Accepted. A corrected marksheet version awaits publication." : "Request rejected and recorded."); setR(null); setNote(""); inv(); }, onError: (e: Error) => toast.error(e.message) });
  if (q.isLoading) return <Skeleton className="h-48" />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data.length) return <EmptyState title="No revaluation requests" body="Students and parents can request a recheck from published marksheets; requests appear here." />;
  return (
    <div className="space-y-2">{q.data.map((x) => (
      <Card key={x.id}><CardBody className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-semibold">{studentName(x.studentId)} · {x.subjectName} <StatusBadge status={x.status} /></p><p className="text-xs text-text-2">{x.reason}</p><p className="tnum text-xs text-text-2">Original total {x.originalTotal}{x.newTotal !== undefined && ` · revised ${x.newTotal}`}{x.note && ` · ${x.note}`}</p></div>
        {canDecide && (x.status === "requested" || x.status === "in-review") && <div className="flex gap-2">{x.status === "requested" && <Button size="sm" variant="outline" onClick={() => start.mutate(x.id)}>Start review</Button>}<Button size="sm" onClick={() => { setR(x); setDec("accept"); setNi(0); setNe(x.originalTotal); setNote(""); }}>Decide</Button></div>}
      </CardBody></Card>))}
      <Modal open={!!r} onOpenChange={(o) => !o && setR(null)} title="Decide revaluation" description={r ? `${studentName(r.studentId)} · ${r.subjectName}` : undefined} footer={<><Button variant="ghost" onClick={() => setR(null)}>Cancel</Button><Button loading={done.isPending} onClick={() => done.mutate()}>{dec === "accept" ? "Accept and create correction" : "Reject request"}</Button></>}>
        <div className="space-y-3">
          <div className="flex gap-2"><Button size="sm" variant={dec === "accept" ? "primary" : "outline"} onClick={() => setDec("accept")}>Accept</Button><Button size="sm" variant={dec === "reject" ? "danger" : "outline"} onClick={() => setDec("reject")}>Reject</Button></div>
          {dec === "accept" && <div className="grid grid-cols-2 gap-3"><Field label="Revised internal" htmlFor="ri"><Input id="ri" type="number" value={ni} onChange={(e) => setNi(Number(e.target.value))} /></Field><Field label="Revised external" htmlFor="re"><Input id="re" type="number" value={ne} onChange={(e) => setNe(Number(e.target.value))} /></Field></div>}
          <Field label="Decision note" htmlFor="dn"><Textarea id="dn" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
      </Modal>
    </div>
  );
}
