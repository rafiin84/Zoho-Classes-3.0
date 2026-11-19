"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, PencilSimple, ChatCircleSlash, EyeSlash, Flag } from "@phosphor-icons/react";
import { PageHeader, Segmented, Card, CardBody, Badge, Button, Modal, Textarea, Field, EmptyState, SkeletonCards, Avatar, Cover, Icon, toast, ConfirmDialog } from "@/components/ui";
import type { FeedPost } from "@/types";
import { feedService } from "@/lib/api";
import { fmtDateTime, relTime } from "@/lib/format";
import { useTeacher, Q, errMsg, KEYS } from "../components/common";

interface Audit { at: string; who: string; action: string; post: string; reason?: string }
const audit: Audit[] = [];
type Action = "reject" | "request-edit";

export default function ModerationScreen() {
  const t = useTeacher(); const qc = useQueryClient();
  const [tab, setTab] = React.useState<"pending" | "reported" | "audit">("pending");
  const q = useQuery({ queryKey: [...KEYS.moderation], queryFn: () => feedService.moderationQueue() });
  const [dlg, setDlg] = React.useState<{ post: FeedPost; action: Action } | null>(null); const [reason, setReason] = React.useState(""); const [hide, setHide] = React.useState<FeedPost | null>(null);
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  const inv = () => { qc.invalidateQueries({ queryKey: [...KEYS.moderation] }); qc.invalidateQueries({ queryKey: ["student"] }); force(); };
  const log = (post: FeedPost, action: string, why?: string) => audit.unshift({ at: new Date().toISOString(), who: t.name, action, post: `${post.authorName}: ${post.text.slice(0, 50)}`, reason: why });
  const mod = useMutation({ mutationFn: ({ post, action, why }: { post: FeedPost; action: "approve" | "reject" | "request-edit" | "hide"; why?: string }) => feedService.moderate(post.id, action, why).then(() => { log(post, action, why); }),
    onSuccess: (_, v) => { toast.success(v.action === "approve" ? "Approved — now visible to the selected audience" : v.action === "reject" ? "Rejected; the student is told why" : v.action === "hide" ? "Post hidden" : "Edit requested"); setDlg(null); setReason(""); inv(); }, onError: (e) => toast.error(errMsg(e)) });
  const comments = useMutation({ mutationFn: ({ post, v }: { post: FeedPost; v: boolean }) => feedService.setCommentsDisabled(post.id, v).then(() => log(post, v ? "comments disabled" : "comments enabled")), onSuccess: () => { toast.success("Comment setting updated"); inv(); } });
  const reasonErr = reason.trim().length < 5 ? "Give a short, kind reason (5+ characters) the student will read" : "";
  const Post = ({ p, children }: { p: FeedPost; children: React.ReactNode }) => (
    <Card><CardBody className="space-y-3"><div className="flex items-center gap-2"><Avatar name={p.authorName} color={p.authorColor} size={34} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{p.authorName}</p><p className="text-xs text-text-2">{p.contextLabel} · submitted {relTime(p.createdAt)}</p></div><Badge tone="info">Audience: {p.audienceLabel}</Badge></div>
      <p className="whitespace-pre-line text-sm">{p.text}</p>{p.media && <Cover from={p.media.from} to={p.media.to} className="h-32" icon={<Icon name={p.media.icon} size={36} />} />}
      <p className="text-xs text-text-2">{p.commentCount} comments{p.commentsDisabled ? " · comments off" : ""} · {p.reactionCount} reactions</p>{children}</CardBody></Card>
  );
  return (
    <div className="mx-auto max-w-4xl"><PageHeader title="Moderation Queue" subtitle="Student posts wait here until you approve them. Reported content is reviewed separately." />
      <div className="mb-4"><Segmented label="Queues" value={tab} onChange={setTab} options={[{ value: "pending", label: "Pending posts", count: q.data?.pending.length }, { value: "reported", label: "Reported", count: q.data?.reported.length }, { value: "audit", label: "Audit history", count: audit.length }]} /></div>
      {tab === "audit" ? (!audit.length ? <EmptyState title="No actions yet" body="Every approve, reject and hide action is recorded here with who and when." /> : <Card><CardBody><ol className="space-y-2 text-sm">{audit.map((a, i) => <li key={i} className="border-b border-border pb-2 last:border-0"><strong>{a.action}</strong> · {a.who} · {fmtDateTime(a.at)}<br /><span className="text-xs text-text-2">{a.post}{a.reason ? ` — “${a.reason}”` : ""}</span></li>)}</ol></CardBody></Card>) : (
        <Q q={q} skeleton={<SkeletonCards n={2} h="h-40" />} isEmpty={(d) => !(tab === "pending" ? d.pending : d.reported).length} empty={<EmptyState title={tab === "pending" ? "Queue is clear" : "No reports"} body={tab === "pending" ? "No student posts are waiting for approval." : "Nothing has been reported by students."} icon={<CheckCircle size={28} />} />}>
          {(d) => tab === "pending" ? (
            <ul className="space-y-3">{d.pending.map((p) => <li key={p.id}><Post p={p}><div className="flex flex-wrap gap-2"><Button size="sm" variant="success" loading={mod.isPending} onClick={() => mod.mutate({ post: p, action: "approve" })}><CheckCircle size={16} />Approve</Button><Button size="sm" variant="outline" onClick={() => setDlg({ post: p, action: "request-edit" })}><PencilSimple size={16} />Request edit</Button><Button size="sm" variant="outline" onClick={() => setDlg({ post: p, action: "reject" })}><XCircle size={16} />Reject</Button></div></Post></li>)}</ul>
          ) : (
            <ul className="space-y-3">{d.reported.map((r) => r.post && <li key={r.id}><Post p={r.post}><p className="flex items-start gap-1.5 rounded-xl bg-warning-soft p-2 text-xs"><Flag size={14} className="mt-0.5 shrink-0" />Report: “{r.note || "No note"}” · {relTime(r.at)}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setHide(r.post)}><EyeSlash size={16} />Hide post</Button><Button size="sm" variant="outline" loading={comments.isPending} onClick={() => comments.mutate({ post: r.post, v: !r.post.commentsDisabled })}><ChatCircleSlash size={16} />{r.post.commentsDisabled ? "Enable comments" : "Disable comments"}</Button><Button size="sm" variant="ghost" onClick={() => { log(r.post, "report dismissed"); toast.info("Report dismissed — post stays visible"); }}>Keep visible</Button></div></Post></li>)}</ul>
          )}
        </Q>
      )}
      <Modal open={!!dlg} onOpenChange={(v) => { if (!v) { setDlg(null); setReason(""); } }} title={dlg?.action === "reject" ? "Reject post" : "Request an edit"} description="The student sees this message, so keep it supportive and specific."
        footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button variant={dlg?.action === "reject" ? "danger" : "primary"} disabled={!!reasonErr} loading={mod.isPending} onClick={() => dlg && mod.mutate({ post: dlg.post, action: dlg.action, why: reason.trim() })}>{dlg?.action === "reject" ? "Reject post" : "Send request"}</Button></>}>
        <Field label="Reason" required error={reason ? reasonErr : undefined} htmlFor="mod-reason"><Textarea id="mod-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Lovely work — please remove the classmate's full name before we share it." /></Field>
      </Modal>
      <ConfirmDialog open={!!hide} onOpenChange={(v) => !v && setHide(null)} destructive title="Hide this post?" body="It disappears from every feed. You can see it in the audit history." confirmLabel="Hide post" onConfirm={() => hide && mod.mutate({ post: hide, action: "hide", why: "Hidden after report" })} />
    </div>
  );
}
