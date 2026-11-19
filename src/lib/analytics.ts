// Lightweight typed analytics placeholder — logs to an in-memory buffer only. Nothing is sent externally.
export type AnalyticsEvent =
  | "screen_view" | "course_started" | "course_completed" | "challenge_completed" | "tutor_opened" | "tutor_question_asked"
  | "doubt_submitted" | "doubt_resolved" | "feed_interaction" | "event_registered" | "club_joined" | "live_class_joined"
  | "live_class_ended" | "assignment_submitted" | "payment_simulated" | "course_purchased" | "book_question_asked"
  | "citation_opened" | "ai_grading_reviewed" | "ai_grading_approved" | "paper_created" | "paper_published" | "timetable_allocation_changed";

export interface LoggedEvent { name: AnalyticsEvent; props?: Record<string, unknown>; at: string }
const buffer: LoggedEvent[] = [];
export function track(name: AnalyticsEvent, props?: Record<string, unknown>) {
  buffer.push({ name, props, at: new Date().toISOString() });
  if (buffer.length > 200) buffer.shift();
  if (process.env.NODE_ENV === "development") console.debug("[analytics:mock]", name, props ?? "");
}
export const getAnalyticsBuffer = () => [...buffer];
