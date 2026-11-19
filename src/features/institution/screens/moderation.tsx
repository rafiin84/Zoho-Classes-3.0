"use client";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Card, Button, Badge, EmptyState, toast, Segmented } from "@/components/ui";
import { feedService } from "@/lib/api/feedService";
import { governanceService } from "@/lib/api/governanceService";
import { relTime } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { useQ, Q, DemoNote, onErr, ReasonModal, ACTOR } from "../kit";

export default function ModerationScreen(_: ScreenProps) {
  const qc = useQueryClient(); const [tab, setTab] = React.useState<"pending" | "reported">("pending"); const [act, setAct] = React.useState<{ id: string; a: "reject" | "hide" | "request-edit"; title: string } | null>(null);
  const q = useQ(["moderation"], () => feedService.moderationQueue());
  const m = useMutation({ mutationFn: (v: { id: string; a: "approve" | "reject" | "request-edit" | "hide"; reason?: string }) => feedService.moderate(v.id, v.a, v.reason), onSuccess: (p, v) => { governanceService.record({ actor: ACTOR, actorRole: "Institution admin", action: `Feed post ${v.a}`, category: "Feed moderation", target: `Post by ${p.authorName}`, context: v.reason ?? "Moderation queue" }); toast.success(v.a === "approve" ? "Approved and published to the feed." : "Decision recorded; the author is notified."); setAct(null); qc.invalidateQueries({ queryKey: ["inst", "moderation"] }); qc.invalidateQueries({ queryKey: ["inst", "audit"] }); }, onError: onErr });
  return (
    <div>
      <PageHeader title="Feed moderation" subtitle="Student posts are reviewed before they reach a wider audience. Decisions are audited." />
      <Q q={q} rows={3}>{(d) => {
        const items = tab === "pending" ? d.pending.map((p) => ({ post: p, note: "" })) : d.reported.map((r) => ({ post: r.post, note: r.note ?? "" }));
        return <div><div className="mb-4"><Segmented label="Queue" value={tab} onChange={setTab} options={[{ value: "pending", label: "Awaiting review", count: d.pending.length }, { value: "reported", label: "Reported", count: d.reported.length }]} /></div>
          {!items.length ? <EmptyState title={tab === "pending" ? "Queue is clear" : "No reports"} body="New student posts and reports appear here for review." /> : <ul className="space-y-3">{items.map(({ post: p, note }) => <li key={p.id}><Card className="p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><div className="mb-1 flex flex-wrap gap-1.5"><Badge tone="primary">{p.authorRole}</Badge><Badge>{p.audienceLabel}</Badge>{p.category && <Badge>{p.category}</Badge>}</div><p className="font-semibold">{p.authorName} <span className="text-xs font-normal text-text-2">· {relTime(p.createdAt)}</span></p><p className="mt-1 text-sm">{p.text}</p>{note && <p className="mt-1 text-xs text-danger">Report: {note}</p>}</div>
            <div className="flex flex-wrap gap-2">{tab === "pending" && <Button size="sm" onClick={() => m.mutate({ id: p.id, a: "approve" })} loading={m.isPending && m.variables?.id === p.id}>Approve</Button>}<Button size="sm" variant="outline" onClick={() => setAct({ id: p.id, a: "request-edit", title: "Request an edit" })}>Request edit</Button><Button size="sm" variant="ghost" onClick={() => setAct({ id: p.id, a: tab === "pending" ? "reject" : "hide", title: tab === "pending" ? "Reject post" : "Hide post" })}>{tab === "pending" ? "Reject" : "Hide"}</Button></div></div></Card></li>)}</ul>}
          <DemoNote tone="info">Reports can be mistaken or malicious; read context before hiding.</DemoNote></div>; }}</Q>
      <ReasonModal open={!!act} onOpenChange={(v) => !v && setAct(null)} title={act?.title ?? ""} label="Reason shown to the author" busy={m.isPending} onSubmit={(reason) => act && m.mutate({ id: act.id, a: act.a, reason })} />
    </div>
  );
}
