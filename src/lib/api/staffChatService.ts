import type { StaffConversation, StaffMessage, ConversationView, StaffNotifPrefs, MessageAttachment, ShareCard, StaffMember, StaffPresence } from "@/types/staffChat";
import { CONVERSATIONS_SEED, MESSAGES_SEED, STAFF, staffById, ADMIN_ID } from "../mock-data/staffChat";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";

/** Internal staff messaging. Separate from doubtService (students) and parent messaging. Staff-only: no student/parent API exists here. */
const convs: StaffConversation[] = structuredClone(CONVERSATIONS_SEED);
const msgs: StaffMessage[] = structuredClone(MESSAGES_SEED);
const presence: Record<string, StaffPresence> = Object.fromEntries(STAFF.map((s) => [s.id, s.presence]));
export const staffViewerId = (role: "teacher" | "institution", teacherId: string) => (role === "institution" ? ADMIN_ID : teacherId);

const ensure = (c: StaffConversation, v: string) => (c.state[v] ??= { unread: 0, markedUnread: false, muted: false, prefs: { level: "all", digest: false } });
const canPost = (c: StaffConversation, v: string) => c.memberIds.includes(v) && (c.channel?.postPolicy !== "admins-only" || v === ADMIN_ID);
const titleFor = (c: StaffConversation, v: string) => (c.kind === "direct" ? staffById(c.memberIds.find((x) => x !== v) ?? v)?.name ?? "Colleague" : c.name);
const view = (c: StaffConversation, v: string): ConversationView => {
  const { state, ...rest } = c; const s = ensure(c, v);
  const last = msgs.filter((x) => x.conversationId === c.id && !x.parentId).at(-1);
  return { ...rest, unread: s.unread, markedUnread: s.markedUnread, muted: s.muted, prefs: s.prefs, lastMessage: last, canPost: canPost(c, v), title: titleFor(c, v) };
};
const replies = ["Got it, thanks. I will look at this after my next period.", "Makes sense. Can you share the details in the planning doc?", "Agreed. I can take that on this week.", "Good point. Let me check with the others and come back to you.", "Thanks for flagging. I have added it to my list."];

export const staffChatService = {
  staff: () => simulate<StaffMember[]>(() => STAFF.map((s) => ({ ...s, presence: presence[s.id] }))),
  setPresence: (id: string, p: StaffPresence) => simulate(() => { presence[id] = p; return true; }, { ms: 40 }),
  listConversations: (viewer: string) => simulate(() => convs.filter((c) => c.memberIds.includes(viewer)).map((c) => view(c, viewer)).sort((a, b) => b.lastAt.localeCompare(a.lastAt))),
  messages: (conversationId: string, viewer: string) => simulate(() => { const c = convs.find((x) => x.id === conversationId); if (!c || !c.memberIds.includes(viewer)) throw new ServiceError("You are not a member of this conversation.", "permission"); return msgs.filter((x) => x.conversationId === conversationId); }, { ms: 80 }),
  search: (viewer: string, q: string) => simulate(() => { const ids = convs.filter((c) => c.memberIds.includes(viewer)).map((c) => c.id); const k = q.trim().toLowerCase(); return k ? msgs.filter((m) => ids.includes(m.conversationId) && (m.text.toLowerCase().includes(k) || m.attachments.some((a) => a.name.toLowerCase().includes(k)))) : []; }, { ms: 80 }),
  markRead: (id: string, viewer: string) => simulate(() => { const s = ensure(convs.find((c) => c.id === id)!, viewer); s.unread = 0; s.markedUnread = false; return true; }, { ms: 20 }),
  markUnread: (id: string, viewer: string) => simulate(() => { ensure(convs.find((c) => c.id === id)!, viewer).markedUnread = true; return true; }, { ms: 40 }),
  setMuted: (id: string, viewer: string, muted: boolean) => simulate(() => { ensure(convs.find((c) => c.id === id)!, viewer).muted = muted; return true; }, { ms: 40 }),
  setPrefs: (id: string, viewer: string, prefs: StaffNotifPrefs) => simulate(() => { ensure(convs.find((c) => c.id === id)!, viewer).prefs = prefs; return true; }, { ms: 40 }),
  togglePin: (id: string, messageId: string) => simulate(() => { const c = convs.find((x) => x.id === id)!; c.pinnedMessageIds = c.pinnedMessageIds.includes(messageId) ? c.pinnedMessageIds.filter((x) => x !== messageId) : [...c.pinnedMessageIds, messageId]; return c.pinnedMessageIds; }, { ms: 40 }),
  react: (messageId: string, viewer: string, emoji: string) => simulate(() => { const m = msgs.find((x) => x.id === messageId)!; let r = m.reactions.find((x) => x.emoji === emoji); if (!r) { r = { emoji, userIds: [] }; m.reactions.push(r); } r.userIds = r.userIds.includes(viewer) ? r.userIds.filter((u) => u !== viewer) : [...r.userIds, viewer]; m.reactions = m.reactions.filter((x) => x.userIds.length); return true; }, { ms: 30 }),
  /** Posting permission is enforced here as well as in the UI. A simulated colleague replies a moment later (demo only). */
  send: (input: { conversationId: string; viewer: string; text: string; parentId?: string; attachments?: MessageAttachment[]; card?: ShareCard }) => simulate(() => {
    const c = convs.find((x) => x.id === input.conversationId); if (!c) throw new ServiceError("Conversation not found.", "validation");
    if (!canPost(c, input.viewer)) throw new ServiceError("Only administrators can post in this channel.", "permission");
    const text = input.text.trim(); if (!text && !input.attachments?.length && !input.card) throw new ServiceError("Write a message first.", "validation");
    const mentions = STAFF.filter((s) => text.includes(`@${s.name.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s/, "").split(" ")[0]}`) && s.id !== input.viewer).map((s) => ({ userId: s.id, name: s.name }));
    const url = text.match(/https?:\/\/[^\s]+/)?.[0];
    const m: StaffMessage = { id: uid("sm"), conversationId: c.id, authorId: input.viewer, text, at: new Date().toISOString(), parentId: input.parentId, attachments: input.attachments ?? [], reactions: [], mentions, card: input.card, link: url ? { url, title: "Shared link", site: url.replace(/^https?:\/\//, "").split("/")[0] } : undefined };
    msgs.push(m); c.lastAt = m.at; ensure(c, input.viewer);
    c.memberIds.filter((x) => x !== input.viewer).forEach((x) => { ensure(c, x).unread++; });
    const peers = c.memberIds.filter((x) => x !== input.viewer && presence[x] !== "offline");
    if (c.kind !== "announcement" && peers.length) {
      const who = peers[0];
      setTimeout(() => { const r: StaffMessage = { id: uid("sm"), conversationId: c.id, authorId: who, text: replies[Math.floor(Math.random() * replies.length)], at: new Date().toISOString(), parentId: input.parentId, attachments: [], reactions: [], mentions: [{ userId: input.viewer, name: staffById(input.viewer)?.name ?? "" }], simulated: true }; msgs.push(r); c.lastAt = r.at; ensure(c, input.viewer).unread++; ensure(c, who).unread = 0; }, 2200);
    }
    return m;
  }, { ms: 120 }),
  createDirect: (viewer: string, otherId: string) => simulate(() => { let c = convs.find((x) => x.kind === "direct" && x.memberIds.includes(viewer) && x.memberIds.includes(otherId)); if (!c) { c = { id: uid("sc"), kind: "direct", name: "Direct", memberIds: [viewer, otherId], lastAt: new Date().toISOString(), pinnedMessageIds: [], state: {} }; convs.push(c); } return c.id; }, { ms: 80 }),
  createGroup: (viewer: string, name: string, description: string, memberIds: string[]) => simulate(() => {
    if (name.trim().length < 3) throw new ServiceError("Give the group a name of at least 3 characters.", "validation");
    const c: StaffConversation = { id: uid("sc"), kind: "group", name: name.trim(), memberIds: Array.from(new Set([viewer, ...memberIds])), lastAt: new Date().toISOString(), pinnedMessageIds: [], channel: { description: description.trim() || "Project or committee group.", category: "Committee", postPolicy: "all-members", official: false }, state: {} };
    convs.push(c); return c.id;
  }, { ms: 120 }),
};
