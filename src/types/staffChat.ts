import type { ID, ISODate } from "./index";

/** INTERNAL staff communication only. Never reuse for student doubts or parent messaging. */
export type StaffConversationKind = "direct" | "department" | "team" | "announcement" | "group";
export type StaffPresence = "available" | "in-class" | "away" | "offline";
export interface StaffMember { id: ID; name: string; title: string; color: string; departmentName: string; presence: StaffPresence; role: "teacher" | "admin" }
export interface StaffChannel { description: string; category: string; /** who may post */ postPolicy: "all-members" | "admins-only"; official: false }
export interface MessageAttachment { id: ID; name: string; kind: "pdf" | "sheet" | "image" | "doc"; sizeKb: number }
export interface MessageReaction { emoji: string; userIds: ID[] }
export interface StaffMention { userId: ID; name: string }
export interface ShareCard { kind: "course" | "timetable" | "meeting" | "assessment" | "student-support"; title: string; subtitle: string; href: string }
export interface LinkPreview { url: string; title: string; site: string }
export interface StaffMessage {
  id: ID; conversationId: ID; authorId: ID; text: string; at: ISODate; parentId?: ID; attachments: MessageAttachment[]; reactions: MessageReaction[];
  mentions: StaffMention[]; card?: ShareCard; link?: LinkPreview; simulated?: boolean;
}
export interface StaffNotifPrefs { level: "all" | "mentions" | "none"; digest: boolean }
export interface StaffConversation {
  id: ID; kind: StaffConversationKind; name: string; memberIds: ID[]; channel?: StaffChannel; pinnedMessageIds: ID[]; lastAt: ISODate;
  /** per-viewer state is keyed by viewer id */
  state: Record<ID, { unread: number; markedUnread: boolean; muted: boolean; prefs: StaffNotifPrefs }>;
}
export interface ConversationView extends Omit<StaffConversation, "state"> {
  unread: number; markedUnread: boolean; muted: boolean; prefs: StaffNotifPrefs; lastMessage?: StaffMessage; canPost: boolean; title: string;
}
