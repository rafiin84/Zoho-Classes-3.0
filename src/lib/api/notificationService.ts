import type { AppNotification, Role } from "@/types";
import { NOTIFICATIONS } from "../mock-data/engagement";
import { simulate } from "./latency";
import { uid } from "../utils";

const items: AppNotification[] = structuredClone(NOTIFICATIONS);

export const notificationService = {
  /** Internal helper used by other services to emit cross-role notifications. */
  push: (n: Omit<AppNotification, "id" | "at" | "read">) => { items.unshift({ ...n, id: uid("n"), at: new Date().toISOString(), read: false }); },
  list: (role: Role, scope: { recipientId?: string; childId?: string }) => simulate(() => items.filter((n) => n.role === role && (role === "student" ? !n.recipientId || n.recipientId === scope.recipientId : role === "parent" ? n.childId === scope.childId : true)).sort((a, b) => b.at.localeCompare(a.at))),
  markRead: (id: string) => simulate(() => { const n = items.find((x) => x.id === id); if (n) n.read = true; return true; }, { ms: 60 }),
  markAllRead: (role: Role) => simulate(() => { items.filter((n) => n.role === role).forEach((n) => (n.read = true)); return true; }, { ms: 60 }),
};
