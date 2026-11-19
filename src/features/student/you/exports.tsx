"use client";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadSimple, Hourglass, WarningCircle, FileArrowDown } from "@phosphor-icons/react";
import { portfolioService } from "@/lib/api";
import { exportStatus } from "@/lib/api/portfolioService";
import { useActors } from "@/stores/app-store";
import { fmtDateTime } from "@/lib/format";
import { Badge, Button, Card, CardBody, EmptyState, Progress, Skeleton, toast } from "@/components/ui";
import type { ExportKind } from "@/types/portfolio";

export const NOT_TRANSCRIPT = "A portfolio or data export you generate is a student-generated record. It is NOT an institution-certified transcript and does not prove verified credentials.";

export function useExports() {
  const { studentId } = useActors();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["portfolio", studentId, "exports"], queryFn: () => portfolioService.exports(studentId), refetchInterval: 1500 });
  const request = useMutation({
    mutationFn: (p: { kind: ExportKind; label: string; scope: string[]; note?: string }) => portfolioService.requestExport(studentId, p),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["portfolio", studentId, "exports"] }); toast.info("Request received", `${r.label} is being prepared.`); },
    onError: (e) => toast.error("Couldn't start the export", (e as Error).message),
  });
  const expire = useMutation({ mutationFn: (id: string) => portfolioService.expireNow(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio", studentId, "exports"] }) });
  return { q, request, expire };
}

export function ExportList() {
  const { q, expire } = useExports();
  if (q.isPending) return <Skeleton className="h-24" />;
  if (!q.data?.length) return <EmptyState title="No exports yet" body="When you request an export it appears here with its status." />;
  return (
    <ul className="space-y-2" aria-live="polite">
      {q.data.map((r) => {
        const st = exportStatus(r);
        const total = +new Date(r.readyAt) - +new Date(r.createdAt);
        const pct = st === "pending" ? Math.min(95, ((Date.now() - +new Date(r.createdAt)) / total) * 100) : 100;
        return (
          <li key={r.id}><Card><CardBody className="space-y-2 !p-4">
            <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{r.label}</span><Badge tone={st === "ready" ? "success" : st === "pending" ? "warning" : "danger"} icon={st === "pending" ? <Hourglass size={12} /> : st === "expired" ? <WarningCircle size={12} /> : <FileArrowDown size={12} />}>{st === "pending" ? "Preparing" : st === "ready" ? "Ready" : "Expired"}</Badge></div>
            <p className="text-xs text-text-2">Requested {fmtDateTime(r.createdAt)} · includes {r.scope.join(", ")}{st === "ready" ? ` · link expires ${fmtDateTime(r.expiresAt)}` : ""}</p>
            {st === "pending" && <Progress value={pct} size="sm" label="Export progress" />}
            {st === "ready" && <div className="flex gap-2"><Button size="sm" onClick={() => toast.success("Download simulated", "No real file is generated in this demo.")}><DownloadSimple size={16} /> Download (demo)</Button><Button size="sm" variant="ghost" onClick={() => expire.mutate(r.id)}>Demo: expire now</Button></div>}
            {st === "expired" && <p className="text-sm text-text-2">This link expired for your safety. Request a new export any time.</p>}
          </CardBody></Card></li>
        );
      })}
    </ul>
  );
}
