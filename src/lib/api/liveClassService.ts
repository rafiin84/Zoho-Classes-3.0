import type { LiveClass, MeetingStatus } from "@/types";
import { LIVE_CLASSES } from "../mock-data/engagement";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { track } from "../analytics";
import { notificationService } from "./notificationService";
import { attendanceService } from "./attendanceService";

const classes: LiveClass[] = structuredClone(LIVE_CLASSES);
/** Provider-agnostic seam: a future conferencing connector replaces this module. No WebRTC is used in Phase 1. */
const baseService = {
  list: () => simulate(() => [...classes].sort((a, b) => a.startAt.localeCompare(b.startAt))),
  get: (id: string) => simulate(() => classes.find((c) => c.id === id) ?? null),
  schedule: (c: Pick<LiveClass, "title" | "kind" | "hostId" | "hostName" | "classIds" | "audienceLabel" | "startAt" | "durationMinutes" | "agenda" | "waitingRoom"> & Partial<LiveClass>) => simulate(() => {
    const dup = classes.find((x) => x.hostId === c.hostId && x.startAt === c.startAt && x.status !== "Cancelled");
    if (dup) throw new ServiceError(`You already have “${dup.title}” at that time.`, "validation");
    const n: LiveClass = { id: uid("lc"), status: "Scheduled", recordingPolicy: "off", participants: [], resources: [], ...c };
    classes.push(n);
    notificationService.push({ role: "student", category: "live", title: "New live class scheduled", body: `${n.title}`, href: "/student/live-classes" });
    return n;
  }),
  setStatus: (id: string, status: MeetingStatus) => simulate(() => { const c = classes.find((x) => x.id === id)!; c.status = status; if (status === "Completed") { c.endedAt = new Date().toISOString(); track("live_class_ended", { id }); } if (status === "Cancelled") notificationService.push({ role: "student", category: "live", title: "Live class cancelled", body: c.title, href: "/student/live-classes" }); return c; }),
  reschedule: (id: string, startAt: string) => simulate(() => { const c = classes.find((x) => x.id === id)!; c.startAt = startAt; notificationService.push({ role: "student", category: "live", title: "Live class rescheduled", body: c.title, href: "/student/live-classes" }); return c; }),
  join: (id: string, who: { id: string; name: string; role: "teacher" | "student" | "parent" }) => simulate(() => { const c = classes.find((x) => x.id === id)!; const p = c.participants.find((x) => x.id === who.id); if (p) { p.state = c.waitingRoom && who.role !== "teacher" ? "waiting" : "joined"; } else c.participants.push({ ...who, state: c.waitingRoom && who.role !== "teacher" ? "waiting" : "joined", muted: true, handRaised: false }); if (who.role === "teacher") c.status = "Live"; track("live_class_joined", { id }); return c; }),
  hostAction: (id: string, participantId: string, action: "admit" | "remove" | "mute" | "unmute") => simulate(() => { const c = classes.find((x) => x.id === id)!; const p = c.participants.find((x) => x.id === participantId); if (p) { if (action === "admit") p.state = "joined"; if (action === "remove") p.state = "removed"; if (action === "mute") p.muted = true; if (action === "unmute") p.muted = false; } return c; }, { ms: 60 }),
  raiseHand: (id: string, participantId: string, v: boolean) => simulate(() => { const c = classes.find((x) => x.id === id)!; const p = c.participants.find((x) => x.id === participantId); if (p) p.handRaised = v; return c; }, { ms: 40 }),
};

/** Room-level state for the simulated meeting room (lock, screen share). Participant state lives on the LiveClass itself. */
const roomState: Record<string, { locked: boolean; screenSharerId?: string; studentsMaySpeak: boolean; studentsMayShare: boolean }> = {};
const rs = (id: string) => (roomState[id] ??= { locked: false, studentsMaySpeak: true, studentsMayShare: false });
const joinedAt: Record<string, number> = {};
const roomApi = {
  roomState: (id: string) => simulate(() => rs(id), { ms: 30 }),
  setRoom: (id: string, patch: Partial<{ locked: boolean; screenSharerId?: string; studentsMaySpeak: boolean; studentsMayShare: boolean }>) => simulate(() => Object.assign(rs(id), patch), { ms: 40 }),
  /** Participant leaves (or is recorded as leaving); duration is stored for the attendance snapshot. */
  leave: (id: string, whoId: string) => simulate(() => { const c = classes.find((x) => x.id === id)!; const p = c.participants.find((x) => x.id === whoId); if (p && p.state !== "removed") { const mins = Math.max(1, Math.round((Date.now() - (joinedAt[`${id}:${whoId}`] ?? Date.now() - 60000)) / 60000)); p.state = "left"; p.durationMin = (p.durationMin ?? 0) + mins; p.handRaised = false; } return c; }, { ms: 40 }),
  markJoinTime: (id: string, whoId: string, at = Date.now()) => { joinedAt[`${id}:${whoId}`] = at; },
  /** Host ends the class for everyone: marks Completed, closes participants and writes the attendance snapshot teachers see. */
  endForAll: (id: string, simulatedMinutes?: number) => simulate(() => {
    const c = classes.find((x) => x.id === id)!; const mins = simulatedMinutes ?? Math.max(5, Math.round(c.durationMinutes * 0.9));
    c.participants.forEach((p) => { if (p.state === "joined") { p.state = "left"; p.durationMin = p.durationMin ?? Math.max(1, mins - Math.floor(Math.random() * 6)); } });
    c.status = "Completed"; c.endedAt = new Date().toISOString(); delete roomState[id];
    attendanceService.recordLive(id, c.classIds, c.participants.filter((p) => p.role === "student" && (p.durationMin ?? 0) > 0).map((p) => ({ id: p.id, minutes: p.durationMin ?? 0 })), c.hostId);
    track("live_class_ended", { id }); return c;
  }, { ms: 300 }),
  setRecordingNote: (_id: string) => simulate(() => true, { ms: 20 }),
  addResource: (id: string, name: string) => simulate(() => { const c = classes.find((x) => x.id === id)!; c.resources.push({ name }); return c; }, { ms: 60 }),
  remind: (id: string, studentId: string, on: boolean) => { const k = `${studentId}:${id}`; if (on) reminders.add(k); else reminders.delete(k); return on; },
  hasReminder: (id: string, studentId: string) => reminders.has(`${studentId}:${id}`),
};
const reminders = new Set<string>(["stu-ananya:lc-frac"]);

export const liveClassService = { ...baseService, ...roomApi };
