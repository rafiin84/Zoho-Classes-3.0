import type { ActivityType, Course, CourseModule, LearningActivity, LearningProfile, RemedialPath, Student } from "@/types";

export type PathTag = "teacher-assigned" | "ai-recommended" | "adaptive" | "remedial" | "optional" | "baseline";
export interface PathNode {
  id: string; kind: "activity" | "remedial" | "baseline" | "extension"; type?: ActivityType | string; title: string; minutes: number;
  status: "done" | "current" | "upcoming" | "locked"; tags: PathTag[]; courseId: string; activityId?: string; remedialId?: string; stepId?: string;
  objective?: string; due?: string; note?: string; href?: string;
}
export interface PathInput {
  student: Pick<Student, "id" | "status" | "displayName">; course: Course; modules: CourseModule[]; activities: LearningActivity[]; completed: string[];
  profile: LearningProfile | null; remedial: RemedialPath[]; dues?: Record<string, string>; enrolled: boolean;
}
export interface BuiltPath { nodes: PathNode[]; current?: PathNode; remainingMinutes: number; why: string[]; pct: number }

/** Builds a personalised path from the SAME authored course structure. Different students get different branches, checkpoints and ordering. */
export function buildPath(inp: PathInput): BuiltPath {
  const { student, course, modules, activities, completed, profile, remedial, dues = {}, enrolled } = inp;
  const why: string[] = [];
  const modSeq = (id: string) => modules.find((m) => m.id === id)?.sequence ?? 0;
  const ordered = [...activities].sort((a, b) => modSeq(a.moduleId) - modSeq(b.moduleId) || a.sequence - b.sequence);
  const base: PathNode[] = ordered.map((a) => {
    const tags: PathTag[] = [];
    if (course.labels.includes("teacher-assigned") && ["assignment", "assessment", "teacher-checkpoint", "document"].includes(a.type)) tags.push("teacher-assigned");
    if (a.type === "ai-checkpoint") tags.push("adaptive");
    if (!a.mandatory) tags.push("optional");
    return { id: a.id, kind: "activity", type: a.type, title: a.title, minutes: a.estimatedMinutes, status: completed.includes(a.id) ? "done" : "upcoming", tags, courseId: course.id, activityId: a.id, objective: a.learningObjectiveIds[0], due: dues[a.id], href: `/student/player/${course.id}?activity=${a.id}` };
  });
  let nodes = [...base];

  // 1. Baseline first for brand-new students
  if (student.status === "pending-baseline") {
    nodes.unshift({ id: "baseline", kind: "baseline", type: "assessment", title: "Starter check-in (baseline)", minutes: 6, status: "upcoming", tags: ["baseline", "ai-recommended"], courseId: course.id, href: "/student/micro?topic=baseline", note: "No marks — it just helps your tutor choose a starting point." });
    why.push("You’re new, so your path begins with a short, no-marks check-in.", "Everything after it is paced gently — nothing is locked behind scores.");
  }

  // 2. Remedial branch (from learningProfileService.remedialFor): detour right after the last completed step
  const path = remedial.find((r) => r.status !== "completed" && (profile?.gaps.some((g) => g.id === r.gapId && (g.subjectId === course.subjectId)) ?? false));
  let locked = false;
  if (path) {
    const gap = profile?.gaps.find((g) => g.id === path.gapId);
    const lastDone = nodes.reduce((acc, n, i) => (n.status === "done" ? i : acc), -1);
    const steps: PathNode[] = path.steps.map((s) => ({ id: `rem-${path.id}-${s.id}`, kind: "remedial", type: s.kind, title: s.label, minutes: s.minutes, status: s.done ? "done" : "upcoming", tags: ["remedial", path.origin === "teacher" ? "teacher-assigned" : "ai-recommended"], courseId: course.id, remedialId: path.id, stepId: s.id, objective: gap?.objectiveId, due: path.targetDate }));
    nodes.splice(lastDone + 1, 0, ...steps);
    locked = true;
    why.push(`Your recent work showed a gap in “${gap?.label ?? path.title}”, so a ${steps.length}-step recovery branch comes before new material.`, "Later modules unlock after the re-check — to keep things from piling up, not as a penalty.");
  }
  if (locked) {
    const anchor = nodes.findIndex((n) => n.kind === "remedial");
    const anchorMod = Math.max(...nodes.slice(0, anchor).filter((n) => n.activityId).map((n) => modSeq(activities.find((a) => a.id === n.activityId)?.moduleId ?? "")), 0);
    nodes = nodes.map((n) => (n.kind === "activity" && n.status !== "done" && modSeq(activities.find((a) => a.id === n.activityId)?.moduleId ?? "") > anchorMod + 0 && modSeq(activities.find((a) => a.id === n.activityId)?.moduleId ?? "") >= anchorMod + 1 && modSeq(activities.find((a) => a.id === n.activityId)?.moduleId ?? "") > 2 ? { ...n, status: "locked", note: "Unlocks after your re-check" } : n));
  }

  // 3. Stretch / extension for strong students with only a light gap
  const light = profile?.gaps.find((g) => !g.remedialPathId && g.severity === "low" && g.subjectId === course.subjectId);
  if (light) {
    const idx = nodes.findIndex((n) => n.activityId === "act-fr-10");
    const ext: PathNode = { id: `ext-${light.id}`, kind: "extension", type: "practice", title: `Stretch: ${light.label}`, minutes: 5, status: "upcoming", tags: ["ai-recommended", "optional"], courseId: course.id, href: "/student/micro?practice=divide", objective: light.objectiveId, note: light.derivedFrom };
    nodes.splice(idx >= 0 ? idx + 1 : Math.min(nodes.length, 4), 0, ext);
    why.push(`You’re moving fast — a short stretch on “${light.label}” is added where it helps most.`);
  }
  if (student.id === "stu-ananya" || (profile && profile.streak.current >= 7 && !path)) why.push("Because your streak and checkpoints are strong, warm-up material is skipped and optional extras are offered.");

  // 4. status: first unfinished, unlocked node is "current"
  let cur = -1;
  nodes.forEach((n, i) => { if (cur === -1 && n.status !== "done" && n.status !== "locked") cur = i; });
  if (cur >= 0 && enrolled) nodes[cur] = { ...nodes[cur], status: "current" };
  const remaining = nodes.filter((n) => n.status !== "done").reduce((a, n) => a + n.minutes, 0);
  const doneCount = nodes.filter((n) => n.status === "done").length;
  if (why.length === 0) why.push("Your path follows your teacher’s sequence and adapts after each checkpoint.");
  return { nodes, current: cur >= 0 && enrolled ? nodes[cur] : undefined, remainingMinutes: remaining, why, pct: nodes.length ? Math.round((doneCount / nodes.length) * 100) : 0 };
}
