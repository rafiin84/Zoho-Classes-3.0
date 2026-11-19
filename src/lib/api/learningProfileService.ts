import type { LearningProfile, RemedialPath } from "@/types";
import { PROFILES, REMEDIAL } from "../mock-data/engagement";
import { simulate } from "./latency";
import { uid } from "../utils";
import { track } from "../analytics";

const profiles: LearningProfile[] = structuredClone(PROFILES);
const remedial: RemedialPath[] = structuredClone(REMEDIAL);
const dailyDone: Record<string, boolean> = {};

export const learningProfileService = {
  get: (studentId: string) => simulate(() => profiles.find((p) => p.studentId === studentId) ?? null),
  all: () => simulate(() => profiles),
  dailyDone: (studentId: string) => simulate(() => !!dailyDone[studentId]),
  /** Completing the daily challenge bumps streak, today's dot, points and minutes. */
  completeChallenge: (studentId: string, score: number, total: number, topic: string) => simulate(() => {
    const p = profiles.find((x) => x.studentId === studentId)!;
    if (!dailyDone[studentId]) {
      dailyDone[studentId] = true; p.streak.current += 1; p.streak.best = Math.max(p.streak.best, p.streak.current);
      const today = 3; p.streak.weekDays[today] = true; p.weeklyMinutes += 5;
    }
    p.points += score * 20; p.level = 1 + Math.floor(p.points / 450);
    p.history.unshift({ id: uid("h"), kind: "challenge", title: `Daily challenge · ${topic}`, at: new Date().toISOString(), result: `${score}/${total}` });
    track("challenge_completed", { score });
    return p;
  }),
  /** Streak recovery: restore a quiet day using one of the student's recoveries. Positive, non-punitive. */
  useRecovery: (studentId: string, dayIndex: number) => simulate(() => {
    const p = profiles.find((x) => x.studentId === studentId)!;
    if (p.streak.recoveriesLeft > 0 && !p.streak.weekDays[dayIndex]) { p.streak.weekDays[dayIndex] = true; p.streak.recoveriesLeft -= 1; p.streak.current += 1; p.streak.best = Math.max(p.streak.best, p.streak.current); }
    return p;
  }),
  recordGame: (studentId: string, title: string, result: string) => simulate(() => { const p = profiles.find((x) => x.studentId === studentId)!; p.history.unshift({ id: uid("h"), kind: "game", title, at: new Date().toISOString(), result }); p.points += 60; return p; }),
  recordTutor: (studentId: string, title: string, result: string) => simulate(() => { const p = profiles.find((x) => x.studentId === studentId); if (p) p.history.unshift({ id: uid("h"), kind: "tutor", title, at: new Date().toISOString(), result }); return true; }, { ms: 50 }),
  /** Update mastery from checkpoint / practice responses; add a gap if mastery falls below threshold. */
  recordMastery: (studentId: string, objectiveId: string, correct: boolean, label: string, subjectId = "sub-math") => simulate(() => {
    const p = profiles.find((x) => x.studentId === studentId)!;
    let o = p.objectives.find((x) => x.objectiveId === objectiveId);
    if (!o) { o = { objectiveId, label, subjectId, mastery: 50, trend: "flat", evidence: "" }; p.objectives.push(o); }
    o.mastery = Math.max(0, Math.min(100, o.mastery + (correct ? 6 : -8))); o.trend = correct ? "up" : "down"; o.evidence = `${correct ? "Correct" : "Missed"} response recorded just now`;
    if (o.mastery < 50 && !p.gaps.some((g) => g.objectiveId === objectiveId)) p.gaps.push({ id: uid("gap"), objectiveId, label, subjectId, severity: "medium", derivedFrom: "Recent responses fell below 50% mastery" });
    if (o.mastery >= 70) p.gaps = p.gaps.filter((g) => g.objectiveId !== objectiveId || g.remedialPathId);
    return p;
  }, { ms: 60 }),
  remedialFor: (studentId: string) => simulate(() => remedial.filter((r) => r.studentId === studentId)),
  allRemedial: () => simulate(() => remedial),
  proposeRemedial: (studentId: string, gapId: string, title: string, origin: "teacher" | "ai") => simulate(() => {
    const r: RemedialPath = { id: uid("rem"), studentId, gapId, title, origin, status: origin === "teacher" ? "approved" : "proposed", targetDate: new Date(Date.now() + 7 * 864e5).toISOString(), steps: [{ id: "a", label: "Mini-lesson refresher", kind: "video", minutes: 5, done: false }, { id: "b", label: "Guided practice", kind: "practice", minutes: 10, done: false }, { id: "c", label: "Re-check", kind: "assessment", minutes: 8, done: false }] };
    remedial.push(r); const p = profiles.find((x) => x.studentId === studentId); const g = p?.gaps.find((x) => x.id === gapId); if (g) g.remedialPathId = r.id; return r;
  }),
  approveRemedial: (id: string) => simulate(() => { const r = remedial.find((x) => x.id === id)!; r.status = "approved"; return r; }),
  completeRemedialStep: (id: string, stepId: string) => simulate(() => {
    const r = remedial.find((x) => x.id === id)!; const s = r.steps.find((x) => x.id === stepId); if (s) s.done = true; r.status = r.steps.every((x) => x.done) ? "completed" : "in-progress";
    if (r.status === "completed") { const p = profiles.find((x) => x.studentId === r.studentId)!; const g = p.gaps.find((x) => x.id === r.gapId); if (g) { const o = p.objectives.find((x) => x.objectiveId === g.objectiveId); if (o) { o.mastery = Math.max(o.mastery, 68); o.trend = "up"; o.evidence = "Remedial path completed; follow-up check passed"; } p.gaps = p.gaps.filter((x) => x.id !== g.id); } }
    return r;
  }),
};
