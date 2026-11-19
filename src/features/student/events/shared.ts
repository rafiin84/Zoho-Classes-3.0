import type { EventItem, EventStatus, RegistrationStatus } from "@/types";
import { create } from "zustand";

export const STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Draft", published: "Announced", "registration-open": "Registration open", "registration-closed": "Registration closed", "in-progress": "In progress",
  judging: "Judging", "results-published": "Results published", completed: "Completed", cancelled: "Cancelled",
};
export const REG_LABEL: Record<RegistrationStatus, string> = { "not-registered": "Not registered", registered: "Registered", waitlisted: "On the waitlist", "pending-consent": "Waiting for guardian consent", withdrawn: "Withdrawn" };
export const LEVELS = ["class", "school", "inter-school", "district", "state"] as const;
export const LEVEL_LABEL: Record<string, string> = { class: "Class", school: "School", "inter-school": "Inter-school", district: "District", state: "State" };
export type EventCat = "sports" | "arts" | "science" | "quiz";
export const CAT_LABEL: Record<EventCat, string> = { sports: "Sports", arts: "Arts", science: "Science", quiz: "Quiz" };
export const catOf = (e: EventItem): EventCat => { const c = e.category.toLowerCase(); return c.includes("quiz") ? "quiz" : c.startsWith("sports") ? "sports" : c.startsWith("arts") ? "arts" : "science"; };
export const needsConsent = (e: EventItem) => e.scope === "district" || e.scope === "state" || e.scope === "inter-school";

/** Simple eligibility check against the demo student's grade (Grade 8, class 8B). Returns plain-language results. */
export function checkEligibility(e: EventItem, grade = 8, className = "8B") {
  const t = e.eligibility;
  const checks: { label: string; ok: boolean; note: string }[] = [];
  const range = t.match(/Grades?\s+(\d+)\s*[–-]\s*(\d+)/);
  const single = t.match(/Grade\s+(\d+)([A-Z])?/);
  if (range) checks.push({ label: "Grade", ok: grade >= +range[1] && grade <= +range[2], note: `Open to Grades ${range[1]}–${range[2]}; you're in Grade ${grade}` });
  else if (/all grades/i.test(t)) checks.push({ label: "Grade", ok: true, note: "Open to all grades" });
  else if (single) checks.push({ label: "Grade", ok: grade === +single[1] && (!single[2] || className.endsWith(single[2])), note: `Open to Grade ${single[1]}${single[2] ?? ""}; you're in Grade ${className}` });
  checks.push({ label: "Format", ok: true, note: e.registrationMode === "team" ? `Team of ${e.teamSize ?? "several"} — you need teammates from your school` : e.registrationMode === "individual" ? "Individual entry" : "No registration needed" });
  if (needsConsent(e)) checks.push({ label: "Guardian consent", ok: true, note: "Required for events outside your school. We'll ask your guardian." });
  return checks;
}
export const canRegister = (e: EventItem) => e.status === "registration-open" || e.status === "registration-closed";

/** Local-only state: unsent team details while consent is pending, work submissions, calendar flags. */
interface EvState {
  pendingTeam: Record<string, { teamName?: string; members?: string[] }>;
  submissions: Record<string, { title: string; file: string; at: string }>;
  calendar: Record<string, boolean>;
  setPending: (id: string, v: { teamName?: string; members?: string[] } | null) => void;
  submit: (id: string, v: { title: string; file: string }) => void;
  toggleCal: (id: string) => void;
}
export const useEventLocal = create<EvState>((set) => ({
  pendingTeam: {}, submissions: {}, calendar: {},
  setPending: (id, v) => set((s) => { const n = { ...s.pendingTeam }; if (v) n[id] = v; else delete n[id]; return { pendingTeam: n }; }),
  submit: (id, v) => set((s) => ({ submissions: { ...s.submissions, [id]: { ...v, at: new Date().toISOString() } } })),
  toggleCal: (id) => set((s) => ({ calendar: { ...s.calendar, [id]: !s.calendar[id] } })),
}));
