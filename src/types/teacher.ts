// Teacher-workspace domain types: AI Teachers, Agents, Workspace results, class insights, exams, rubrics.
import type { ID, ISODate } from "./index";

/* ---------- AI Teachers (distinct from a student's personal AI Tutor) ---------- */
export type AITeacherStatus = "draft" | "awaiting-approval" | "approved" | "rejected" | "suspended" | "retired";
export type AITeacherOwnerType = "government" | "institution" | "teacher";
export interface AITeacherAssignment {
  id: ID; targetType: "class" | "course" | "group"; targetId: ID; targetLabel: string; functions: string[];
  availability: "always" | "school-hours" | "homework-window"; status: "active" | "paused"; assignedAt: ISODate; assignedBy: string;
}
export interface AITeacherRecord {
  id: ID; kind: "ai-teacher"; name: string; subject: string; grade: string; languages: string[]; personality: string; avatarColor: string;
  status: AITeacherStatus; owner: string; ownerType: AITeacherOwnerType; ownerId?: ID; version: string; usage: number; rating: number;
  sources: string[]; tools: string[]; assignments: AITeacherAssignment[]; createdAt: ISODate; submittedAt?: ISODate; approvedBy?: string; approvedAt?: ISODate;
  rejectionReason?: string; suspendedReason?: string; updateAvailable?: string;
  feedback: { id: ID; student: string; rating: number; comment: string; at: ISODate }[];
  concerns: { id: ID; text: string; by: string; at: ISODate; status: "open" | "reviewed" }[];
  history: { at: ISODate; text: string }[];
}
export interface AITeacherDraft {
  name: string; subject: string; grade: string; languages: string[]; personality: string; avatarColor: string; sources: string[]; tools: string[];
  owner: string; ownerType: AITeacherOwnerType; ownerId?: ID;
}
export interface AITeacherUsage { sessions: number; students: number; weekly: number[]; topTopics: { label: string; count: number }[]; avgRating: number; escalations: number }
export type AITeacherTarget = Pick<AITeacherAssignment, "targetType" | "targetId" | "targetLabel" | "functions" | "availability"> & { assignedBy: string };

/* ---------- Agents & automations ---------- */
export type AgentStatus = "draft" | "testing" | "awaiting-approval" | "published" | "paused" | "failed" | "retired";
export type AutonomyLevel = "suggest" | "assist" | "autonomous";
export type AgentProvider = "openai" | "gemini" | "claude" | "deepseek" | "other";
export interface AgentTrigger { kind: "schedule" | "event" | "manual"; label: string }
export interface AgentRecord {
  id: ID; name: string; description: string; nlDescription?: string; status: AgentStatus; provider: AgentProvider; model: string; keyLabel: string;
  dataScope: string[]; tools: string[]; autonomy: AutonomyLevel; trigger: AgentTrigger; ownerId: ID; ownerName: string; ownerLevel: "teacher" | "institution" | "government";
  createdAt: ISODate; publishedAt?: ISODate; lastRunAt?: ISODate; testedOnce: boolean; effects: AgentEffects; approvedBy?: string; failureReason?: string;
}
export interface AgentEffects { publishes: boolean; grades: boolean; notifies: boolean; changesRecord: boolean; touchesFees: boolean; statewide: boolean }
export interface ActionPreview {
  runId: ID; agentId: ID; intends: string; affected: { students: number; classes: string[] }; dataAccessed: string[]; contentCreated: string[];
  effects: AgentEffects; autonomyPolicy: string; requiresApproval: boolean; approvalReasons: string[];
}
export interface AgentRun {
  id: ID; agentId: ID; at: ISODate; trigger: string; action: string; scope: string; outcome: "completed" | "awaiting-approval" | "approved" | "rejected" | "failed" | "test";
  approvalRequired: boolean; approvalGranted?: boolean; error?: string; auditRef: string; test?: boolean;
}

/* ---------- AI Workspace ---------- */
export type WorkspaceActionId = "lesson" | "mcqs" | "paper" | "evaluate" | "struggling" | "remedial" | "parent-update" | "ai-teacher" | "weekly-test";
export interface WorkspaceField { key: string; label: string; value: string; multiline?: boolean }
export interface WorkspaceResult {
  id: ID; actionId: WorkspaceActionId; title: string; summary: string; generatedAt: ISODate; fields: WorkspaceField[];
  meta: Record<string, string | number | string[]>; status: "pending" | "approved" | "rejected"; outcome?: string; consequences: string[];
}
export interface Interpretation {
  kind: "answer" | "action"; headline: string; action?: string; scope?: string; audience?: string; approval?: string; actionId?: WorkspaceActionId; answer?: string;
}
export interface ReportAnswer {
  title: string; summary: string; metric: string; dateRange: string; filters: string[]; sourceAt: ISODate; chart: { label: string; value: number; sub?: string }[]; unit: string;
  drill: { label: string; detail: string; studentId?: string }[]; incomplete?: string; note: string;
}

/* ---------- Class insights ---------- */
export interface RosterRow {
  studentId: ID; name: string; color: string; classId: ID; mathMastery: number; mastery: Record<string, number>; streak: number; weeklyMinutes: number; weeklyGoal: number;
  gaps: { id: ID; label: string; severity: "low" | "medium" | "high" }[]; remedial?: { id: ID; status: string }; estimated: boolean; attention: string[];
}

/* ---------- Exams & rubrics (teacher-local) ---------- */
export interface RubricCriterion { id: ID; name: string; description: string; weight: number; objectiveId?: string; bloom: string; levels: { label: string; points: number; descriptor: string }[] }
export interface Rubric { id: ID; name: string; subjectId: string; criteria: RubricCriterion[]; createdAt: ISODate }
export interface TeacherExam {
  id: ID; title: string; classIds: ID[]; paper: string; startsAt: ISODate; durationMin: number; maxMarks: number; accommodations: string[];
  status: "draft" | "scheduled" | "completed" | "results-in-review" | "results-approved"; resultNote?: string;
  results?: { studentId: ID; marks: number }[];
}

/* ---------- Parent messages (local interface; used only if shared service absent) ---------- */
export interface ParentThreadLite {
  id: ID; parentName: string; studentId: ID; studentName: string; subject: string; status: "unread" | "read" | "replied";
  messages: { id: ID; from: "parent" | "teacher"; text: string; at: ISODate }[]; updatedAt: ISODate;
}
