"use client";
import { create } from "zustand";
import { useQuery } from "@tanstack/react-query";
import { useActors } from "@/stores/app-store";
import { assignmentService, courseService, doubtService, eventService, feeService, feedService, learningProfileService, liveClassService, timetableService } from "@/lib/api";
import { STUDENTS } from "@/lib/mock-data/core";
import { DEMO_NOW } from "@/lib/format";
import type { Club, EventItem, LearningProfile, RemedialPath, Student } from "@/types";
import type { CourseWithState } from "@/lib/api";
import { studentKeys } from "../keys";

export interface Rec { id: string; kind: "remedial" | "course" | "practice" | "game" | "event" | "club" | "baseline" | "challenge" | "tour"; title: string; meta: string; why: string[]; cover: { from: string; to: string; icon: string }; href: string; badge?: string }

/** Session-scoped (non-persisted) recommendation feedback. Dismissed items do not reappear until a reload. */
interface RecState { dismissed: Record<string, string[]>; saved: Record<string, string[]>; act: (s: string, id: string, how: "dismiss" | "save" | "unsave") => void }
export const useRecState = create<RecState>((set) => ({
  dismissed: {}, saved: {},
  act: (s, id, how) => set((st) => how === "dismiss" ? { dismissed: { ...st.dismissed, [s]: [...(st.dismissed[s] ?? []), id] } } : how === "save" ? { saved: { ...st.saved, [s]: [...(st.saved[s] ?? []), id] } } : { saved: { ...st.saved, [s]: (st.saved[s] ?? []).filter((x) => x !== id) } }),
}));

/** Mock ranking: different students get different content from the same services. */
export function buildRecs(p: { student: Student; profile: LearningProfile | null; courses: CourseWithState[]; remedial: RemedialPath[]; events: EventItem[]; clubs: Club[] }): Rec[] {
  const { student, profile, courses, remedial, events, clubs } = p;
  const recs: Rec[] = []; const interests = student.interests.map((i) => i.toLowerCase());
  const activeRem = remedial.find((r) => r.status !== "completed");
  if (student.status === "pending-baseline") {
    recs.push({ id: "rec-baseline", kind: "baseline", title: "Your starter check-in", meta: "8 gentle questions · about 6 min · no marks", why: ["You’re new here, so we start with a quick check-in", "It only helps us tune your path — it never affects grades"], cover: { from: "#5146E5", to: "#B8B5FF", icon: "Target" }, href: "/student/micro?topic=baseline", badge: "Start here" });
    recs.push({ id: "rec-tour", kind: "tour", title: "Take the 1-minute tour", meta: "See where everything lives", why: ["New students usually start with a quick look around"], cover: { from: "#7044D8", to: "#F5C66A", icon: "Compass" }, href: "/student/onboarding?replay=1" });
  }
  if (activeRem) {
    const left = activeRem.steps.filter((s) => !s.done).length;
    recs.push({ id: `rec-${activeRem.id}`, kind: "remedial", title: activeRem.title, meta: `${left} short steps left · ~${activeRem.steps.filter((s) => !s.done).reduce((a, s) => a + s.minutes, 0)} min`, why: ["Your last fractions checkpoint showed a gap in common denominators", `Set up by ${activeRem.origin === "teacher" ? "your teacher" : "your AI Tutor"} so you can build it back step by step`], cover: { from: "#4338CA", to: "#9A93F5", icon: "MathOperations" }, href: "/student/learn#remedial", badge: "Your plan" });
    recs.push({ id: "rec-frac-mini", kind: "course", title: "Mini-lesson: finding a common denominator", meta: "Video · 8 min · Fractions", why: ["Matches your current recovery plan", "Short lessons keep it light"], cover: { from: "#5146E5", to: "#9A93F5", icon: "PlayCircle" }, href: "/student/player/crs-fractions?activity=act-fr-4" });
    recs.push({ id: "rec-game", kind: "game", title: "Fraction Frenzy", meta: "Play · tug-of-war with your class", why: ["Practising fractions as a game sticks better for many students"], cover: { from: "#7044D8", to: "#F5C66A", icon: "GameController" }, href: "/student/play" });
  }
  const gap = profile?.gaps.find((g) => !g.remedialPathId);
  if (gap) recs.push({ id: `rec-gap-${gap.id}`, kind: "practice", title: `Practise: ${gap.label}`, meta: "5-minute practice · adapts to you", why: [gap.derivedFrom, "A tiny bit of practice now keeps it from piling up"], cover: { from: "#1D6FB8", to: "#7044D8", icon: "Lightning" }, href: "/student/micro?review=1" });
  courses.filter((c) => !c.enrolled && c.status === "published" && c.gradeIds.includes(student.gradeId)).forEach((c) => {
    const match = interests.some((i) => (c.title + c.description).toLowerCase().includes(i.split(" ")[0]));
    if (c.labels.includes("ai-recommended") || match) recs.push({ id: `rec-${c.id}`, kind: "course", title: c.title, meta: `${c.priceType === "free" ? "Free" : `₹${c.price}`} · ${Math.round(c.durationMinutes / 60)}h · ${c.rating ? `${c.rating} rating` : "New"}`, why: [match ? `You listed ${student.interests.join(", ")} as interests` : "Students like you at Grade 8 are enjoying this", c.kind === "marketplace" ? "From the course marketplace — purchased separately from school fees" : "Offered by your school"], cover: c.cover, href: `/student/courses/${c.id}`, badge: c.priceType === "paid" ? "Paid" : "Free" });
  });
  if (student.status !== "pending-baseline" && !activeRem) {
    events.filter((e) => e.myRegistration === "not-registered" && e.status === "registration-open").slice(0, 1).forEach((e) => recs.push({ id: `rec-${e.id}`, kind: "event", title: e.title, meta: `${e.category} · ${e.scope}`, why: [interests.some((i) => e.category.toLowerCase().includes(i)) ? "Matches an interest on your profile" : "Open to your grade at your school"], cover: e.cover, href: `/student/events/${e.id}` }));
  }
  clubs.filter((c) => c.myStatus === "none").forEach((c) => { if (interests.some((i) => (c.category + c.description).toLowerCase().includes(i))) recs.push({ id: `rec-${c.id}`, kind: "club", title: c.name, meta: `${c.members} members · ${c.meeting}`, why: [`Because you like ${student.interests.filter((i) => (c.category + c.description).toLowerCase().includes(i.toLowerCase()))[0] ?? c.category}`], cover: c.cover, href: `/student/clubs/${c.id}` }); });
  return recs;
}

export function useHomeData() {
  const { studentId } = useActors();
  const student = STUDENTS.find((s) => s.id === studentId) ?? STUDENTS[0];
  const q = useQuery({
    queryKey: studentKeys.home(studentId),
    queryFn: async () => {
      const [profile, courses, remedial, events, clubs, feed, live, assignments, fee, doubts, daily, tt] = await Promise.all([
        learningProfileService.get(studentId), courseService.list(studentId), learningProfileService.remedialFor(studentId), eventService.list(), eventService.clubs(),
        feedService.list({ role: "student", id: studentId }, { size: 4 }), liveClassService.list(), assignmentService.forStudent(studentId), feeService.account(studentId),
        doubtService.forStudent(studentId), learningProfileService.dailyDone(studentId), timetableService.forClass(student.classId),
      ]);
      return { profile, courses, remedial, events, clubs, feed: feed.items, live, assignments, fee, doubts, daily, tt };
    },
  });
  return { ...q, student };
}
export const DEMO_HOUR = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(DEMO_NOW));
