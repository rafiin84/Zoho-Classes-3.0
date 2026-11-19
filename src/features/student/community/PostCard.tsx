"use client";
/**
 * PostCard — reusable feed card (student feed, talent corner, teacher class feed, parent feed).
 *
 * Props
 *  - post:     FeedPost (from feedService)
 *  - viewer:   { id, name, role, color }  — who is looking (controls author-only states, e.g. "Awaiting approval")
 *  - onChange: optional; called after any mutation (react / comment / save / report / withdraw) so the caller can refetch.
 *              PostCard also invalidates the ["feed"] query key itself.
 *  - onEdit:   optional; if given, the author sees "Edit" on pending / draft / rejected posts.
 *  - readOnly: optional; hides reactions/comment/report controls (e.g. parent view).
 *  - why:      optional; show "Why am I seeing this?"
 */
import * as React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { BookmarkSimple, ChatCircle, Flag, ShareNetwork, Info, ThumbsUp, Confetti, Heart, ArrowBendDownRight, Clock, PencilSimple, ArrowUUpLeft, ShieldCheck, Lock } from "@phosphor-icons/react";
import type { FeedPost } from "@/types";
import { feedService } from "@/lib/api";
import { relTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Avatar, Badge, Button, Card, Cover, Icon, Modal, Textarea, ConfirmDialog, toast, Field } from "@/components/ui";
import type { Viewer } from "./useViewer";

const REACTIONS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "like", label: "Like", icon: <ThumbsUp size={18} /> },
  { key: "cheer", label: "Cheer", icon: <Confetti size={18} /> },
  { key: "love", label: "Love", icon: <Heart size={18} /> },
];
const ROLE_LABEL: Record<string, string> = { student: "Student", teacher: "Teacher", institution: "School", club: "Club", government: "State education", "ai-teacher": "AI teacher", parent: "Parent" };

export function sharePermission(post: FeedPost): { ok: boolean; reason: string } {
  if (post.moderationStatus !== "published" && post.moderationStatus !== "approved") return { ok: false, reason: "Sharing opens once a post is approved." };
  if (post.audienceType === "private") return { ok: false, reason: "Private posts can't be shared." };
  if (post.audienceType === "class" || post.audienceType === "club") return { ok: false, reason: `Sharing is limited to ${post.audienceLabel}; use Save instead.` };
  return { ok: true, reason: "Copy a link to share inside your school." };
}

export function MediaViewer({ post, open, onOpenChange }: { post: FeedPost; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [failed, setFailed] = React.useState(false);
  if (!post.media) return null;
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={post.media.caption ?? "Media"} description={`${post.authorName} · ${post.contextLabel}`} className="sm:max-w-2xl">
      {failed ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl bg-surface-2 text-center"><Info size={28} className="text-text-2" /><p className="mt-2 text-sm font-semibold">This media couldn't load</p><Button className="mt-3" size="sm" variant="outline" onClick={() => setFailed(false)}>Try again</Button></div>
      ) : (
        <Cover from={post.media.from} to={post.media.to} className="aspect-[4/3] w-full" icon={<Icon name={post.media.icon} size={96} weight="duotone" />} />
      )}
      <p className="mt-3 text-sm">{post.text}</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-text-2">
        <span>{post.media.kind === "video" ? "Video preview (demo — no real playback)" : "Image preview (generated artwork)"}</span>
        <button className="underline" onClick={() => setFailed(true)}>Report a problem with this media</button>
      </div>
    </Modal>
  );
}

export function PostCard({ post, viewer, onChange, onEdit, readOnly, why }: { post: FeedPost; viewer: Viewer; onChange?: () => void; onEdit?: (p: FeedPost) => void; readOnly?: boolean; why?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [viewer_, setViewerOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<string | null>(null);
  const [showWhy, setShowWhy] = React.useState(false);
  const done = () => { qc.invalidateQueries({ queryKey: ["feed"] }); onChange?.(); };
  const err = (e: unknown) => toast.error("That didn't work", (e as Error).message);

  const isAuthor = post.authorId === viewer.id;
  const pending = post.moderationStatus === "submitted";
  const rejected = post.moderationStatus === "rejected";
  const draft = post.moderationStatus === "draft";
  const react = useMutation({ mutationFn: (r: string | null) => feedService.react(post.id, r), onSuccess: done, onError: err });
  const save = useMutation({ mutationFn: () => feedService.save(post.id), onSuccess: (p) => { toast.success(p.saved ? "Saved to your list" : "Removed from saved"); done(); }, onError: err });
  const comment = useMutation({ mutationFn: () => feedService.comment(post.id, viewer.name, text.trim(), replyTo ?? undefined), onSuccess: () => { setText(""); setReplyTo(null); done(); }, onError: err });
  const report = useMutation({ mutationFn: () => feedService.report(post.id, reason || "Reported by student"), onSuccess: () => { toast.success("Report sent", "A teacher will review it. Thanks for keeping the community kind."); setReportOpen(false); setReason(""); done(); }, onError: err });
  const withdraw = useMutation({ mutationFn: () => feedService.withdraw(post.id), onSuccess: () => { toast.info("Post withdrawn", "Nothing was published."); done(); }, onError: err });

  const share = sharePermission(post);
  const interactive = !readOnly && !pending && !rejected && !draft;
  const myKey = post.myReaction;

  return (
    <Card className="overflow-hidden">
      <article aria-label={`Post by ${post.authorName}`}>
        <div className="flex items-start gap-3 p-4 pb-2 sm:px-5">
          <Avatar name={post.authorName} color={post.authorColor} size={44} ai={post.authorRole === "ai-teacher"} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="truncate font-semibold">{post.authorName}</span>
              <Badge>{isAuthor ? "You" : ROLE_LABEL[post.authorRole] ?? post.authorRole}</Badge>
              {post.authorRole === "ai-teacher" && <Badge tone="ai">AI-generated</Badge>}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-text-2">
              <span>{post.contextLabel}</span><span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">{post.audienceType === "private" ? <Lock size={11} /> : null}{post.audienceLabel}</span><span aria-hidden>·</span>
              <time dateTime={post.createdAt}>{relTime(post.createdAt)}</time>
            </p>
          </div>
          {post.category && <Badge tone="primary">{post.category}</Badge>}
        </div>

        {(pending || rejected || draft) && isAuthor && (
          <div className={cn("mx-4 mb-2 rounded-xl border p-3 text-sm sm:mx-5", pending ? "border-warning/30 bg-warning-soft" : "border-danger/30 bg-danger-soft")} role="status">
            <p className="flex items-center gap-2 font-semibold">{pending ? <><Clock size={16} /> Awaiting approval</> : rejected ? <><Flag size={16} /> Not approved this time</> : <><PencilSimple size={16} /> Edit requested</>}</p>
            <p className="mt-1 text-text-2">
              {pending && `Only you can see this until a teacher approves it. Audience when approved: ${post.audienceLabel}.`}
              {rejected && (post.moderationReason ? `Reason: ${post.moderationReason}` : "A teacher didn't approve this post. You can edit and try again.")}
              {draft && (post.moderationReason ? `Teacher note: ${post.moderationReason}` : "A teacher asked for a small change before it can be published.")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {onEdit && !pending && <Button size="sm" variant="outline" onClick={() => onEdit(post)}><PencilSimple size={14} /> Edit and resubmit</Button>}
              {onEdit && pending && <Button size="sm" variant="outline" onClick={() => onEdit(post)}><PencilSimple size={14} /> Edit</Button>}
              <Button size="sm" variant="ghost" onClick={() => setWithdrawOpen(true)}><ArrowUUpLeft size={14} /> Withdraw</Button>
            </div>
          </div>
        )}

        <p className="whitespace-pre-line px-4 pb-3 text-[15px] leading-relaxed sm:px-5">{post.text}</p>

        {post.media && (
          <button onClick={() => setViewerOpen(true)} className="block w-full px-4 sm:px-5" aria-label={`Open ${post.media.kind}: ${post.media.caption ?? post.text.slice(0, 30)}`}>
            <Cover from={post.media.from} to={post.media.to} className="aspect-[16/8] w-full" rounded="rounded-2xl" icon={<Icon name={post.media.icon} size={64} weight="duotone" />}>
              {post.media.caption && <span className="absolute bottom-2 left-3 rounded-full bg-black/35 px-2.5 py-1 text-xs font-medium text-white">{post.media.caption}</span>}
              {post.media.kind === "video" && <span className="absolute right-3 top-3 rounded-full bg-black/35 px-2.5 py-1 text-xs font-medium text-white">Video</span>}
            </Cover>
          </button>
        )}

        {post.cta && (
          <div className="px-4 pt-3 sm:px-5">
            <Button asChild variant="soft" size="sm"><Link href={post.cta.href}>{post.cta.label} <ArrowBendDownRight size={14} /></Link></Button>
          </div>
        )}

        {interactive && (
          <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border px-3 py-2 sm:px-4">
            {REACTIONS.map((r) => {
              const n = post.reactions[r.key] ?? 0;
              const on = myKey === r.key;
              return (
                <button key={r.key} aria-pressed={on} aria-label={`${r.label}, ${n}`} disabled={react.isPending} onClick={() => react.mutate(on ? null : r.key)}
                  className={cn("inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors", on ? "bg-lilac text-primary" : "text-text-2 hover:bg-surface-2")}>
                  <motion.span animate={on ? { scale: [1, 1.35, 1] } : {}} transition={{ duration: 0.3 }}>{r.icon}</motion.span><span className="tnum">{n}</span>
                </button>
              );
            })}
            <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-text-2 hover:bg-surface-2">
              <ChatCircle size={18} /> <span className="tnum">{post.commentCount}</span><span className="sr-only">comments</span>
            </button>
            <div className="ml-auto flex items-center gap-1">
              <button aria-pressed={post.saved} aria-label={post.saved ? "Unsave" : "Save"} onClick={() => save.mutate()} className={cn("inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-2", post.saved ? "text-primary" : "text-text-2")}><BookmarkSimple size={19} weight={post.saved ? "fill" : "regular"} /></button>
              <button aria-label={share.ok ? "Share" : `Share unavailable: ${share.reason}`} aria-disabled={!share.ok} title={share.reason}
                onClick={() => share.ok ? toast.success("Link copied", "Only people in your school can open it.") : toast.info("Sharing isn't available", share.reason)}
                className={cn("inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-2", share.ok ? "text-text-2" : "text-text-2/40")}><ShareNetwork size={19} /></button>
              {!isAuthor && <button aria-label={post.reported ? "Reported" : "Report"} disabled={post.reported} onClick={() => setReportOpen(true)} className={cn("inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-2", post.reported ? "text-warning" : "text-text-2")}><Flag size={19} weight={post.reported ? "fill" : "regular"} /></button>}
            </div>
          </div>
        )}
        {interactive && !share.ok && <p className="px-5 pb-2 text-[11px] text-text-2"><Lock size={10} className="mr-1 inline" />{share.reason}</p>}

        <AnimatePresence initial={false}>
          {open && interactive && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border bg-surface-2/50">
              <div className="space-y-3 p-4 sm:px-5">
                {post.commentsDisabled ? (
                  <p className="flex items-center gap-2 text-sm text-text-2"><ShieldCheck size={16} /> Comments are turned off for this post by the school to keep announcements clear.</p>
                ) : (
                  <>
                    {post.comments.length === 0 && <p className="text-sm text-text-2">No comments yet. Say something kind to start the chat.</p>}
                    <ul className="space-y-3">
                      {post.comments.map((c) => (
                        <li key={c.id}>
                          <div className="flex gap-2.5"><Avatar name={c.authorName} size={28} color="#7044D8" />
                            <div className="min-w-0 flex-1"><p className="text-sm"><b>{c.authorName}</b> <span className="text-xs text-text-2">{relTime(c.at)}</span></p><p className="text-sm">{c.text}</p>
                              <button className="text-xs font-semibold text-primary" onClick={() => setReplyTo(c.id)}>Reply</button></div></div>
                          {c.replies?.map((r) => <div key={r.id} className="ml-9 mt-2 flex gap-2.5"><Avatar name={r.authorName} size={24} color="#1D6FB8" /><div><p className="text-sm"><b>{r.authorName}</b> <span className="text-xs text-text-2">{relTime(r.at)}</span></p><p className="text-sm">{r.text}</p></div></div>)}
                        </li>
                      ))}
                    </ul>
                    <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) comment.mutate(); }} className="space-y-2">
                      {replyTo && <p className="text-xs text-text-2">Replying to {post.comments.find((c) => c.id === replyTo)?.authorName} · <button type="button" className="underline" onClick={() => setReplyTo(null)}>cancel</button></p>}
                      <div className="flex gap-2">
                        <input aria-label="Write a comment" value={text} onChange={(e) => setText(e.target.value)} maxLength={280} placeholder="Add a kind comment" className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm" />
                        <Button type="submit" size="md" loading={comment.isPending} disabled={!text.trim()}>Post</Button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {why && (
          <div className="border-t border-border px-4 py-2 sm:px-5">
            <button className="flex items-center gap-1 text-xs font-semibold text-text-2 hover:text-text" aria-expanded={showWhy} onClick={() => setShowWhy((v) => !v)}><Info size={13} /> Why am I seeing this?</button>
            {showWhy && <p className="mt-1 text-xs text-text-2">Shown because it was shared with <b>{post.audienceLabel}</b>{post.postType === "club" ? " and you follow this club" : ""}. Feed order is newest first — no engagement-based ranking.</p>}
          </div>
        )}
      </article>

      <MediaViewer post={post} open={viewer_} onOpenChange={setViewerOpen} />
      <Modal open={reportOpen} onOpenChange={setReportOpen} title="Report this post" description="Tell us what's wrong. A teacher reviews every report; the author isn't told who reported."
        footer={<><Button variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button><Button variant="danger" loading={report.isPending} onClick={() => report.mutate()}>Send report</Button></>}>
        <Field label="What's the problem?" htmlFor={`rep-${post.id}`} optional>
          <Textarea id={`rep-${post.id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: unkind words, personal information, or something that doesn't belong here." />
        </Field>
      </Modal>
      <ConfirmDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} title="Withdraw this post?" body="It will be removed from the approval queue and never published. You can write a new one any time." confirmLabel="Withdraw" destructive onConfirm={() => withdraw.mutate()} />
    </Card>
  );
}

export default PostCard;
