import type { ActivityType, LearningActivity, CourseModule } from "@/types";
import { uid } from "@/lib/utils";

export interface BlockDef { kind: string; label: string; type: ActivityType; icon: string; minutes: number; group: "Learn" | "Practice" | "Assess" | "Engage" | "Checkpoint" | "Live"; hint: string }
export const BLOCKS: BlockDef[] = [
  { kind: "video", label: "Video", type: "video", icon: "PlayCircle", minutes: 6, group: "Learn", hint: "Hosted or recorded lesson video" },
  { kind: "audio", label: "Audio", type: "video", icon: "MusicNotes", minutes: 5, group: "Learn", hint: "Narration or podcast clip" },
  { kind: "lesson", label: "Lesson", type: "lesson", icon: "BookOpen", minutes: 8, group: "Learn", hint: "Text lesson with worked examples" },
  { kind: "rich-lesson", label: "Rich interactive lesson", type: "lesson", icon: "MagicWand", minutes: 12, group: "Learn", hint: "Lesson with embedded interactions" },
  { kind: "pdf", label: "PDF", type: "document", icon: "FileText", minutes: 5, group: "Learn", hint: "Downloadable reading" },
  { kind: "gallery", label: "Image gallery", type: "reading", icon: "Image", minutes: 3, group: "Learn", hint: "Annotated image set" },
  { kind: "mcq", label: "MCQ", type: "mcq", icon: "CheckCircle", minutes: 2, group: "Practice", hint: "One correct answer" },
  { kind: "multi-select", label: "Multi-select", type: "mcq", icon: "CheckSquare", minutes: 3, group: "Practice", hint: "Several correct answers" },
  { kind: "short-answer", label: "Short answer", type: "quiz", icon: "PencilSimple", minutes: 4, group: "Practice", hint: "One or two sentences" },
  { kind: "essay", label: "Essay", type: "assignment", icon: "NotePencil", minutes: 20, group: "Practice", hint: "Extended writing, rubric graded" },
  { kind: "matching", label: "Matching", type: "quiz", icon: "ShareNetwork", minutes: 4, group: "Practice", hint: "Match pairs" },
  { kind: "ordering", label: "Ordering", type: "quiz", icon: "TreeStructure", minutes: 3, group: "Practice", hint: "Put steps in order" },
  { kind: "fill-blank", label: "Fill in the blank", type: "quiz", icon: "PencilSimple", minutes: 3, group: "Practice", hint: "Complete the sentence" },
  { kind: "poll", label: "Poll", type: "poll", icon: "ChartBar", minutes: 1, group: "Engage", hint: "Quick class poll" },
  { kind: "discussion", label: "Discussion", type: "discussion", icon: "ChatsCircle", minutes: 6, group: "Engage", hint: "Threaded class discussion" },
  { kind: "game", label: "Game", type: "game", icon: "GameController", minutes: 5, group: "Engage", hint: "Playful practice" },
  { kind: "simulation", label: "Simulation", type: "simulation", icon: "Atom", minutes: 8, group: "Engage", hint: "Interactive model" },
  { kind: "assignment", label: "Assignment", type: "assignment", icon: "ClipboardText", minutes: 20, group: "Assess", hint: "Submitted work with due date" },
  { kind: "project", label: "Project", type: "assignment", icon: "Rocket", minutes: 45, group: "Assess", hint: "Multi-day project" },
  { kind: "practice-test", label: "Practice test", type: "quiz", icon: "Exam", minutes: 15, group: "Assess", hint: "Low-stakes test" },
  { kind: "formal-assessment", label: "Formal assessment", type: "assessment", icon: "Certificate", minutes: 30, group: "Assess", hint: "Graded, recorded in marks" },
  { kind: "teacher-checkpoint", label: "Teacher checkpoint", type: "teacher-checkpoint", icon: "Chalkboard", minutes: 3, group: "Checkpoint", hint: "Pause and reflect prompt" },
  { kind: "ai-checkpoint", label: "AI-adaptive checkpoint", type: "ai-checkpoint", icon: "Sparkle", minutes: 4, group: "Checkpoint", hint: "Adapts follow-ups to the student" },
  { kind: "live-class", label: "Live class", type: "live-class", icon: "VideoCamera", minutes: 40, group: "Live", hint: "Scheduled session" },
];
export const blockOf = (a: LearningActivity) => BLOCKS.find((b) => b.kind === (a.payload?.blockKind as string)) ?? BLOCKS.find((b) => b.type === a.type) ?? BLOCKS[2];
export const isCheckpoint = (a: LearningActivity) => a.type === "teacher-checkpoint" || a.type === "ai-checkpoint";
export const isGraded = (a: LearningActivity) => ["assignment", "assessment"].includes(a.type) || a.payload?.blockKind === "practice-test";

export interface OutlineModule { id: string; title: string; releaseDate?: string; activities: LearningActivity[] }
export type Outline = OutlineModule[];
export interface HiddenKey { hidden?: boolean }
export const isHidden = (a: LearningActivity) => !!a.payload?.hidden;

export function toOutline(courseId: string, mods: CourseModule[], acts: LearningActivity[]): Outline {
  return [...mods].sort((a, b) => a.sequence - b.sequence).map((m) => ({ id: m.id, title: m.title, activities: acts.filter((a) => a.moduleId === m.id).sort((a, b) => a.sequence - b.sequence) }));
}
/** Visible activities go to the shared course structure (what students see). Hidden ones are retained by the builder only. */
export function fromOutline(courseId: string, o: Outline): { mods: CourseModule[]; acts: LearningActivity[]; hidden: LearningActivity[] } {
  const mods: CourseModule[] = []; const acts: LearningActivity[] = []; const hidden: LearningActivity[] = [];
  o.forEach((m, mi) => {
    const vis: LearningActivity[] = [];
    m.activities.forEach((a, ai) => { const n = { ...a, courseId, moduleId: m.id, sequence: ai + 1 }; (isHidden(a) ? hidden : vis).push(n); if (!isHidden(a)) acts.push({ ...n, sequence: vis.length }); });
    mods.push({ id: m.id, courseId, title: m.title, sequence: mi + 1, activityIds: vis.map((a) => a.id) });
  });
  return { mods, acts, hidden };
}
export const newActivity = (b: BlockDef, courseId: string, moduleId: string): LearningActivity => ({
  id: uid("act"), courseId, moduleId, type: b.type, title: b.label === "MCQ" ? "New question" : `New ${b.label.toLowerCase()}`, sequence: 0, estimatedMinutes: b.minutes, mandatory: !["poll", "discussion", "game", "teacher-checkpoint"].includes(b.kind),
  learningObjectiveIds: [], checkpointMode: b.type === "teacher-checkpoint" || b.type === "ai-checkpoint" ? "inline" : undefined,
  payload: { blockKind: b.kind, ...(b.type === "mcq" ? { q: "", options: ["", "", "", ""], answer: 0, explain: "" } : {}) },
});

export interface Issue { level: "error" | "warn"; text: string; activityId?: string; moduleId?: string }
export function validate(meta: { title: string; description: string }, o: Outline): Issue[] {
  const out: Issue[] = [];
  if (meta.title.trim().length < 3) out.push({ level: "error", text: "Course title is required (3+ characters)." });
  if (meta.description.trim().length < 20) out.push({ level: "warn", text: "Add a description of at least 20 characters before publishing." });
  if (!o.length) out.push({ level: "warn", text: "Add at least one module before publishing." });
  o.forEach((m) => {
    if (!m.title.trim()) out.push({ level: "error", text: "A module has no title.", moduleId: m.id });
    if (!m.activities.length) out.push({ level: "warn", text: `Module “${m.title || "Untitled"}” is empty.`, moduleId: m.id });
    m.activities.forEach((a) => {
      if (!a.title.trim()) out.push({ level: "error", text: `An activity in “${m.title}” has no title.`, activityId: a.id });
      if (!(a.estimatedMinutes > 0)) out.push({ level: "error", text: `“${a.title}” needs an estimated duration above 0.`, activityId: a.id });
      if (a.type === "mcq" && a.payload && (!String(a.payload.q ?? "").trim() || (a.payload.options as string[]).some((x) => !x.trim()))) out.push({ level: "warn", text: `Question “${a.title}” has an empty question or option.`, activityId: a.id });
      if (isGraded(a) && !a.learningObjectiveIds.length) out.push({ level: "warn", text: `“${a.title}” is graded but not mapped to a learning objective.`, activityId: a.id });
    });
  });
  return out;
}
/** Builder-only state that survives navigation in this demo session. */
export const hiddenStore: Record<string, LearningActivity[]> = {};
export const extrasStore: Record<string, { start?: string; end?: string; releases: Record<string, string>; dues: Record<string, string>; journeys: RemedialTemplate[] }> = {};
export interface RemedialTemplate { id: string; gapObjectiveId: string; prerequisiteId?: string; lessonTitle: string; workedExample: string; practiceCount: number; reassessmentTitle: string; targetDate: string; message: string; savedAt: string; appliedTo: string[] }
export const getExtras = (courseId: string) => (extrasStore[courseId] ??= { releases: {}, dues: {}, journeys: [] });
