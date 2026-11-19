import type { Circular } from "@/types/institution";
import { simulate, ServiceError } from "./latency";
import { feedService } from "./feedService";
import { recordAudit } from "./governanceService";
import { uid } from "../utils";
import { ago, inDays } from "../format";

const items: Circular[] = [
  { id: "cir-1", title: "Term 2 fee reminder", body: "Term 2 instalments fall due on 25 November. Pay from the Parent app (demo).", audience: "Parents · all grades", kind: "circular", status: "published", at: ago(2000), author: "Finance office", reads: 812, branchId: "all" },
  { id: "cir-2", title: "Winter break schedule", body: "School closes 24 December and reopens 4 January.", audience: "Whole school", kind: "circular", status: "published", at: ago(5000), author: "Principal's office", reads: 1604, branchId: "all" },
  { id: "cir-3", title: "Lakeside Campus: revised bus timings", body: "Routes 3 and 5 depart 10 minutes earlier from Monday.", audience: "Lakeside parents", kind: "announcement", status: "scheduled", at: ago(60), scheduledFor: inDays(2, 8), author: "Lakeside admin", reads: 0, branchId: "br-lakeside" },
  { id: "cir-4", title: "Parent–teacher meeting week", body: "Slots open on the Parent app.", audience: "Parents · Grades 5–9", kind: "circular", status: "draft", at: ago(30), author: "Principal's office", reads: 0, branchId: "all" },
];
export const AUDIENCES = ["Whole school", "Parents · all grades", "Parents · Grades 5–9", "Students · Grade 8", "Teachers & staff", "North Campus", "Lakeside Campus"];
export const circularService = {
  list: () => simulate(() => [...items].sort((a, b) => b.at.localeCompare(a.at))),
  create: (c: { title: string; body: string; audience: string; kind: Circular["kind"]; mode: "draft" | "publish" | "schedule"; scheduledFor?: string }) => simulate(() => {
    if (c.mode === "schedule" && (!c.scheduledFor || new Date(c.scheduledFor) <= new Date("2026-11-19T10:30:00+05:30"))) throw new ServiceError("Choose a future date and time to schedule.", "validation");
    const n: Circular = { id: uid("cir"), title: c.title, body: c.body, audience: c.audience, kind: c.kind, status: c.mode === "publish" ? "published" : c.mode === "schedule" ? "scheduled" : "draft", at: new Date().toISOString(), scheduledFor: c.scheduledFor, author: "Principal's office", reads: 0, branchId: "all" };
    items.unshift(n);
    recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: c.mode === "publish" ? "Published circular" : c.mode === "schedule" ? "Scheduled circular" : "Saved circular draft", category: "Content publication", target: c.title, context: c.audience });
    return n;
  }),
  publish: async (id: string) => { await simulate(true); return (async () => {
    const c = items.find((x) => x.id === id); if (!c) throw new ServiceError("Not found", "unavailable");
    c.status = "published"; c.at = new Date().toISOString(); c.scheduledFor = undefined;
    await feedService.teacherPost({ authorId: "inst-admin", authorName: "Principal's office", text: `${c.title}: ${c.body}`, audienceLabel: c.audience, audienceType: "school", postType: "announcement" });
    recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: "Published circular to school feed", category: "Content publication", target: c.title, context: c.audience });
    return c;
  })(); },
  remove: (id: string) => simulate(() => { const i = items.findIndex((x) => x.id === id); if (i >= 0) items.splice(i, 1); return true; }),
};
