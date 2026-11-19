import type { LiveClass } from "@/types";
import { DEMO_NOW } from "@/lib/format";

export type LiveLabel = "Scheduled" | "Starting soon" | "Live" | "Completed" | "Cancelled";
/** Display status: Starting soon = scheduled and within 60 minutes of demo-now (Thu 19 Nov 2026, 10:30 IST). */
export function liveLabel(c: Pick<LiveClass, "status" | "startAt">): LiveLabel {
  if (c.status !== "Scheduled") return c.status;
  const mins = (new Date(c.startAt).getTime() - DEMO_NOW.getTime()) / 60000;
  return mins <= 60 && mins > -60 ? "Starting soon" : "Scheduled";
}
export const canJoin = (c: Pick<LiveClass, "status" | "startAt">) => { const l = liveLabel(c); return l === "Live" || l === "Starting soon"; };
export interface RoomActor { id: string; name: string; role: "teacher" | "student" | "parent" }
