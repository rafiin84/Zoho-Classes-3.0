import { TEACHERS } from "./core";
import { ago } from "../format";
import type { StaffMember, StaffConversation, StaffMessage, StaffMessage as M } from "@/types/staffChat";

export const ADMIN_ID = "staff-admin";
const presences = ["available", "in-class", "away", "available", "offline", "in-class"] as const;
export const STAFF: StaffMember[] = [
  { id: ADMIN_ID, name: "Kavitha Raman", title: "Vice Principal (Academics)", color: "#5146E5", departmentName: "Administration", presence: "available", role: "admin" },
  ...TEACHERS.map((t, i): StaffMember => ({ id: t.id, name: `${t.title} ${t.displayName}`, title: `${t.departmentName} teacher`, color: t.avatarColor, departmentName: t.departmentName, presence: t.status === "on-leave" ? "offline" : presences[i % presences.length], role: "teacher" })),
];
export const staffById = (id: string) => STAFF.find((s) => s.id === id);
const all = STAFF.map((s) => s.id);
const st = (ids: string[], unread: Record<string, number> = {}) => Object.fromEntries(ids.map((id) => [id, { unread: unread[id] ?? 0, markedUnread: false, muted: false, prefs: { level: "all" as const, digest: false } }]));

export const CONVERSATIONS_SEED: StaffConversation[] = [
  { id: "sc-announce", kind: "announcement", name: "Staff announcements", memberIds: all, lastAt: ago(90), pinnedMessageIds: ["sm-a1"], channel: { description: "Institution-wide staff notices. Read-only for most staff; posting is limited to administrators. Not an official circular.", category: "Institution", postPolicy: "admins-only", official: false }, state: st(all, { "tch-priya": 1, "tch-daniel": 1 }) },
  { id: "sc-math", kind: "department", name: "Mathematics department", memberIds: ["tch-priya", "tch-sameer", ADMIN_ID], lastAt: ago(35), pinnedMessageIds: [], channel: { description: "Maths department planning, shared question banks and moderation.", category: "Department", postPolicy: "all-members", official: false }, state: st(["tch-priya", "tch-sameer", ADMIN_ID], { "tch-priya": 2 }) },
  { id: "sc-sci", kind: "department", name: "Science department", memberIds: ["tch-daniel", "tch-sameer", ADMIN_ID], lastAt: ago(150), pinnedMessageIds: [], channel: { description: "Lab bookings, practical schedules and Science paper moderation.", category: "Department", postPolicy: "all-members", official: false }, state: st(["tch-daniel", "tch-sameer", ADMIN_ID], { "tch-daniel": 1 }) },
  { id: "sc-g8", kind: "team", name: "Grade 8 teaching team", memberIds: ["tch-priya", "tch-daniel", "tch-farah", "tch-arjun", "tch-leela", ADMIN_ID], lastAt: ago(20), pinnedMessageIds: ["sm-g1"], channel: { description: "Grade 8 cross-subject team: assessment calendar, student support coordination.", category: "Grade team", postPolicy: "all-members", official: false }, state: st(["tch-priya", "tch-daniel", "tch-farah", "tch-arjun", "tch-leela", ADMIN_ID], { "tch-priya": 3, "tch-daniel": 3 }) },
  { id: "sc-committee", kind: "group", name: "Annual Day committee", memberIds: ["tch-priya", "tch-farah", "tch-leela", ADMIN_ID], lastAt: ago(600), pinnedMessageIds: [], channel: { description: "Planning group for Annual Day: venue, rehearsals, volunteers.", category: "Committee", postPolicy: "all-members", official: false }, state: st(["tch-priya", "tch-farah", "tch-leela", ADMIN_ID]) },
  { id: "sc-dm-priya-daniel", kind: "direct", name: "Direct", memberIds: ["tch-priya", "tch-daniel"], lastAt: ago(300), pinnedMessageIds: [], state: st(["tch-priya", "tch-daniel"], { "tch-priya": 1 }) },
  { id: "sc-dm-priya-admin", kind: "direct", name: "Direct", memberIds: ["tch-priya", ADMIN_ID], lastAt: ago(1500), pinnedMessageIds: [], state: st(["tch-priya", ADMIN_ID]) },
  { id: "sc-dm-daniel-admin", kind: "direct", name: "Direct", memberIds: ["tch-daniel", ADMIN_ID], lastAt: ago(240), pinnedMessageIds: [], state: st(["tch-daniel", ADMIN_ID], { [ADMIN_ID]: 1 }) },
];
const m = (id: string, conversationId: string, authorId: string, min: number, text: string, extra: Partial<M> = {}): StaffMessage => ({ id, conversationId, authorId, text, at: ago(min), attachments: [], reactions: [], mentions: [], ...extra });
export const MESSAGES_SEED: StaffMessage[] = [
  m("sm-a1", "sc-announce", ADMIN_ID, 2900, "Staff briefing moves to Friday 8:00 AM in the Seminar Hall. Term 2 internal marks entry closes on Monday.", { reactions: [{ emoji: "👍", userIds: ["tch-priya", "tch-farah"] }] }),
  m("sm-a2", "sc-announce", ADMIN_ID, 90, "Reminder: timetable change requests for next week are reviewed by Thursday 4 PM. Use the Timetable screen to propose changes.", { card: { kind: "timetable", title: "Timetable change requests", subtitle: "Proposals reviewed Thu 4 PM", href: "/institution/timetable" } }),
  m("sm-m1", "sc-math", "tch-sameer", 400, "Shared the Fractions chapter question bank with the department. Please review the Apply-level items.", { attachments: [{ id: "at-1", name: "Fractions-QB-review.xlsx", kind: "sheet", sizeKb: 84 }] }),
  m("sm-m2", "sc-math", "tch-priya", 35, "Thanks Sameer. I flagged two near-duplicates; will merge tomorrow.", { mentions: [{ userId: "tch-sameer", name: "Sameer Bhatt" }] }),
  m("sm-s1", "sc-sci", "tch-daniel", 150, "Science Lab is booked for 8B on Thursday P3. Can someone confirm the 9C practical slot?"),
  m("sm-g1", "sc-g8", ADMIN_ID, 1400, "Grade 8 Term 2 assessment calendar is final. Avoid scheduling two major tests on the same day.", { card: { kind: "assessment", title: "Grade 8 Term 2 assessments", subtitle: "Calendar v3", href: "/teacher/assessments" } }),
  m("sm-g2", "sc-g8", "tch-farah", 60, "Story assignment grades are ready for review. Two students might need a support conversation."),
  m("sm-g3", "sc-g8", "tch-arjun", 20, "Can we align on a shared deadline for the Ecosystems poster and the Social Science map work?", { mentions: [{ userId: "tch-daniel", name: "Daniel Okafor" }] }),
  m("sm-c1", "sc-committee", "tch-leela", 600, "Rehearsal slots drafted. Which Saturday works for the robotics demo?"),
  m("sm-d1", "sc-dm-priya-daniel", "tch-daniel", 300, "Priya, do you have the 8B fractions quiz results? Want to link them to the science word-problem unit."),
  m("sm-d2", "sc-dm-priya-admin", ADMIN_ID, 1500, "Please send the 8B moderation summary by Friday."),
  m("sm-d3", "sc-dm-daniel-admin", "tch-daniel", 240, "Tuesday Period 4 shows me in two rooms. Could we sort this in the allocation view?"),
];
