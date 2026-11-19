import type { EventItem, RegistrationStatus } from "@/types";
import { EVENTS, CLUBS } from "../mock-data/engagement";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { track } from "../analytics";
import { notificationService } from "./notificationService";
import type { Club } from "@/types";

const events: EventItem[] = structuredClone(EVENTS);
const clubs: Club[] = structuredClone(CLUBS);

export const eventService = {
  list: () => simulate(() => [...events].sort((a, b) => a.startAt.localeCompare(b.startAt)), { failKey: "events" }),
  get: (id: string) => simulate(() => events.find((e) => e.id === id) ?? null),
  register: (id: string, p: { teamName?: string; members?: string[]; consent?: boolean }) => simulate(() => {
    const e = events.find((x) => x.id === id)!;
    if (e.status === "registration-closed" || e.registered >= e.capacity) { e.myRegistration = "waitlisted"; return e; }
    if (e.registrationMode === "team" && (!p.teamName || (p.members?.length ?? 0) < 1)) throw new ServiceError("Add a team name and at least one teammate.", "validation");
    e.myRegistration = e.scope === "district" || e.scope === "state" || e.scope === "inter-school" ? (p.consent ? "registered" : "pending-consent") : "registered";
    if (e.myRegistration === "registered") { e.registered++; if (p.teamName) e.myTeam = { name: p.teamName, members: p.members ?? [] }; }
    notificationService.push({ role: "student", recipientId: "stu-ananya", category: "events", title: e.myRegistration === "registered" ? "Registration confirmed" : "Guardian consent needed", body: e.title, href: `/student/events/${id}` });
    track("event_registered", { id });
    return e;
  }),
  withdraw: (id: string) => simulate(() => { const e = events.find((x) => x.id === id)!; if (e.myRegistration === "registered") e.registered--; e.myRegistration = "not-registered"; e.myTeam = undefined; return e; }),
  setStatus: (id: string, status: EventItem["status"]) => simulate(() => { const e = events.find((x) => x.id === id)!; e.status = status; return e; }),
  create: (e: Partial<EventItem> & { title: string }) => simulate(() => { const n: EventItem = { id: uid("evt"), category: "General", organiser: "Greenfield", scope: "school", startAt: new Date().toISOString(), endAt: new Date().toISOString(), venue: "TBD", eligibility: "All", rules: [], registrationMode: "individual", capacity: 100, registered: 0, status: "draft", schedule: [], judges: [], rubric: [], announcements: [], cover: { from: "#5146E5", to: "#B8B5FF", icon: "Trophy" }, myRegistration: "not-registered", ...e }; events.unshift(n); return n; }),
  // clubs
  clubs: () => simulate(() => clubs),
  club: (id: string) => simulate(() => clubs.find((c) => c.id === id) ?? null),
  joinClub: (id: string) => simulate(() => { const c = clubs.find((x) => x.id === id)!; if (c.membershipPolicy === "open") { c.myStatus = "active"; c.members++; track("club_joined", { id }); } else c.myStatus = "pending"; return c; }),
  leaveClub: (id: string) => simulate(() => { const c = clubs.find((x) => x.id === id)!; if (c.myStatus === "active") c.members--; c.myStatus = "none"; return c; }),
  decideClubRequest: (id: string, ok: boolean) => simulate(() => { const c = clubs.find((x) => x.id === id)!; c.myStatus = ok ? "active" : "rejected"; return c; }),
  createClub: (c: Partial<Club> & { name: string }) => simulate(() => { const n: Club = { id: uid("club"), category: "General", description: "", purpose: "", mentor: "Priya Nair", leaders: [], membershipPolicy: "open", members: 1, meeting: "TBD", activities: [], cover: { from: "#5146E5", to: "#B8B5FF", icon: "UsersThree" }, myStatus: "none", achievements: [], posts: [], resources: [], ...c }; clubs.unshift(n); return n; }),
};
export type { RegistrationStatus };
