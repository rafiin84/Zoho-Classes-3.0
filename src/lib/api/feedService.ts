import type { FeedPost, AudienceType, ModerationStatus, Role } from "@/types";
import { FEED } from "../mock-data/engagement";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { track } from "../analytics";
import { notificationService } from "./notificationService";

const posts: FeedPost[] = structuredClone(FEED);
export interface ModerationItem { id: string; postId: string; kind: "pending" | "report"; at: string; note?: string }
const reports: ModerationItem[] = [];
export type FeedFilter = "all" | "school" | "class" | "clubs" | "competitions" | "learning";

/** Visibility rule: pending/rejected posts are visible only to their author and moderators. */
const visibleTo = (p: FeedPost, viewer: { role: Role; id: string }) => {
  if (viewer.role === "teacher" || viewer.role === "institution") return p.moderationStatus !== "removed";
  if (p.moderationStatus === "published" || p.moderationStatus === "approved") return p.audienceType !== "private" || p.authorId === viewer.id;
  return p.authorId === viewer.id && p.moderationStatus !== "removed";
};
const matches = (p: FeedPost, f: FeedFilter) => f === "all" || (f === "school" && ["announcement", "organisation", "achievement", "programme"].includes(p.postType)) || (f === "class" && p.audienceType === "class") || (f === "clubs" && p.postType === "club") || (f === "competitions" && (p.postType === "event" || p.linkedEntityType === "event")) || (f === "learning" && ["resource", "quiz", "challenge"].includes(p.postType));

export const feedService = {
  list: (viewer: { role: Role; id: string }, o: { filter?: FeedFilter; q?: string; page?: number; size?: number; savedOnly?: boolean } = {}) => simulate(() => {
    const all = posts.filter((p) => visibleTo(p, viewer) && matches(p, o.filter ?? "all") && (!o.q || (p.text + p.authorName).toLowerCase().includes(o.q.toLowerCase())) && (!o.savedOnly || p.saved)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const size = o.size ?? 6, pg = o.page ?? 0;
    return { items: all.slice(pg * size, pg * size + size), total: all.length, nextPage: (pg + 1) * size < all.length ? pg + 1 : null };
  }, { failKey: "feed" }),
  react: (id: string, reaction: string | null) => simulate(() => { const p = posts.find((x) => x.id === id)!; if (p.myReaction) { p.reactions[p.myReaction] = Math.max(0, (p.reactions[p.myReaction] ?? 1) - 1); p.reactionCount--; } p.myReaction = reaction ?? undefined; if (reaction) { p.reactions[reaction] = (p.reactions[reaction] ?? 0) + 1; p.reactionCount++; } track("feed_interaction", { id, kind: "react" }); return p; }, { ms: 80 }),
  comment: (id: string, authorName: string, text: string, replyTo?: string) => simulate(() => { const p = posts.find((x) => x.id === id)!; if (p.commentsDisabled) throw new ServiceError("Comments are turned off for this post.", "permission"); const c = { id: uid("c"), authorName, text, at: new Date().toISOString() }; if (replyTo) { const parent = p.comments.find((x) => x.id === replyTo); (parent!.replies ??= []).push(c); } else p.comments.push(c); p.commentCount++; track("feed_interaction", { id, kind: "comment" }); return p; }, { ms: 100 }),
  save: (id: string) => simulate(() => { const p = posts.find((x) => x.id === id)!; p.saved = !p.saved; return p; }, { ms: 60 }),
  report: (id: string, note: string) => simulate(() => { const p = posts.find((x) => x.id === id)!; p.reported = true; reports.unshift({ id: uid("rep"), postId: id, kind: "report", at: new Date().toISOString(), note }); return p; }),
  /** Students never publish directly: posts go to moderation. */
  createPost: (p: { authorId: string; authorName: string; authorColor: string; text: string; audienceType: AudienceType; category?: string; postType?: FeedPost["postType"]; context?: string }) => simulate(() => {
    const labels: Record<AudienceType, string> = { private: "Private · portfolio only", class: "Grade 8B", school: "Whole school", club: "Club members", event: "Event participants", wider: "Approved wider community" };
    const n: FeedPost = { id: uid("post"), authorId: p.authorId, authorName: p.authorName, authorRole: "student", authorColor: p.authorColor, institutionId: "inst-greenfield", audienceType: p.audienceType, audienceLabel: labels[p.audienceType], contextLabel: p.context ?? "Talent Corner", postType: p.postType ?? "talent", category: p.category, text: p.text, media: { kind: "image", from: "#5146E5", to: "#B8B5FF", icon: "Image" }, moderationStatus: p.audienceType === "private" ? "published" : "submitted", reactionCount: 0, reactions: {}, commentCount: 0, comments: [], saved: false, reported: false, createdAt: new Date().toISOString() };
    posts.unshift(n);
    if (n.moderationStatus === "submitted") { reports.unshift({ id: uid("mod"), postId: n.id, kind: "pending", at: n.createdAt }); notificationService.push({ role: "teacher", category: "governance", title: "Post awaiting moderation", body: `${p.authorName} · ${p.category ?? "Talent Corner"}`, href: "/teacher/moderation" }); }
    return n;
  }),
  withdraw: (id: string) => simulate(() => { const i = posts.findIndex((x) => x.id === id); if (i >= 0) posts.splice(i, 1); return true; }),
  moderate: (id: string, action: "approve" | "reject" | "request-edit" | "hide", reason?: string) => simulate(() => {
    const p = posts.find((x) => x.id === id)!;
    const map: Record<string, ModerationStatus> = { approve: "published", reject: "rejected", "request-edit": "draft", hide: "hidden" };
    p.moderationStatus = map[action]; p.moderationReason = reason;
    const r = reports.findIndex((x) => x.postId === id && x.kind === "pending"); if (r >= 0 && action !== "hide") reports.splice(r, 1);
    notificationService.push({ role: "student", recipientId: p.authorId, category: "events", title: action === "approve" ? "Your post was approved" : action === "reject" ? "Your post wasn't approved" : "Your post needs a small edit", body: reason ?? p.text.slice(0, 60), href: "/student/talent" });
    return p;
  }),
  setCommentsDisabled: (id: string, v: boolean) => simulate(() => { const p = posts.find((x) => x.id === id)!; p.commentsDisabled = v; return p; }),
  moderationQueue: () => simulate(() => ({ pending: posts.filter((p) => p.moderationStatus === "submitted"), reported: reports.filter((r) => r.kind === "report").map((r) => ({ ...r, post: posts.find((p) => p.id === r.postId)! })) })),
  teacherPost: (p: { authorId: string; authorName: string; text: string; audienceLabel: string; audienceType: AudienceType; postType?: FeedPost["postType"] }) => simulate(() => { const n: FeedPost = { id: uid("post"), authorId: p.authorId, authorName: p.authorName, authorRole: "teacher", authorColor: "#7044D8", institutionId: "inst-greenfield", audienceType: p.audienceType, audienceLabel: p.audienceLabel, contextLabel: "Class feed", postType: p.postType ?? "class", text: p.text, moderationStatus: "published", reactionCount: 0, reactions: {}, commentCount: 0, comments: [], saved: false, reported: false, createdAt: new Date().toISOString() }; posts.unshift(n); return n; }),
};
