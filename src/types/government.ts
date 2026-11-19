// Government (state-level) domain types. ALL FICTIONAL DEMO DATA — Karuvana State.
import type { ID, ISODate } from "./index";

export type RegionName = "Hills & Plateau" | "Coastal Belt" | "Heartland" | "Delta & River";
export type DataStatus = "complete" | "partial";
export type FollowUpState = "pending" | "in-progress" | "complete";
export type MetricKey = "baselineCoverage" | "mathsProficiency" | "engagement" | "improvement";

export interface District {
  id: ID; name: string; region: RegionName; col: number; row: number;
  students: number; teachers: number; institutions: number;
  baselineCoverage: number; mathsBaseline: number; mathsFollowUp: number; engagement: number; engagementPrev: number;
  improvement: number; dataStatus: DataStatus; followUp: FollowUpState; completeness: number;
}
export interface GovInstitution {
  id: ID; districtId: ID; name: string; type: "school" | "university"; students: number; branches: { id: ID; name: string; students: number }[];
  baselineCoverage: number; mathsProficiency: number; engagement: number; improvement: number; dataStatus: DataStatus; programmes: number;
}
export interface ClassRow { id: ID; gradeId: string; gradeLabel: string; name: string; students: number; baselineCoverage: number; proficiency: number }
export interface ObjectiveRow { id: ID; code: string; title: string; subject: string; mastery: number; baselineMastery: number }
export interface GradeRow { gradeId: string; label: string; baselineCoverage: number; proficiency: number; improvement: number }

export interface Alert { id: ID; tone: "danger" | "warning" | "info"; title: string; body: string; source: string; href?: string }
export interface Recommendation { id: ID; title: string; body: string; basis: string; cta: { label: string; href: string } }

export interface OverviewData {
  districts: District[];
  headline: { students: number; teachers: number; institutions: number; baselineCoverage: number; participation: number; improvement: number; asOf: string };
  baselineBreakdown: { notStarted: number; inProgress: number; complete: number };
  subjectGrade: { grades: string[]; subjects: string[]; values: number[][] };
  consumption: { label: string; value: number }[];
  trend: { labels: string[]; baseline: number[]; followUp: number[] };
  alerts: Alert[]; recommendations: Recommendation[];
}

/* ---------- Programmes ---------- */
export type ProgrammeStatus = "draft" | "awaiting-approval" | "active" | "paused" | "completed" | "rejected";
export interface Intervention { id: ID; title: string; kind: "remedial-course" | "practice-set" | "ai-teacher-support" | "teacher-workshop" | "peer-group"; status: "planned" | "running" | "done" | "delayed"; audience: string }
export interface ProgrammeDraft {
  name: string; phase: string; objective: string; grades: string[]; subjects: string[];
  objectiveIds: string[]; resourceIds: string[];
  baseline: { enabled: boolean; mandatory: boolean; curriculum: string; year: string; windowDays: number; questionCount: number };
  districtIds: string[]; institutionNote: string; interventions: Intervention[]; aiTeacherIds: string[];
  start: string; end: string; participationTarget: number; improvementTarget: number; budget: number;
}
export interface ProgrammeRecord extends ProgrammeDraft {
  id: ID; status: ProgrammeStatus; createdBy: string; createdAt: ISODate; updatedAt: ISODate; origin: "official" | "ai-proposal";
  submittedAt?: ISODate; approvedBy?: string; approverNotes?: string; rejectionReason?: string; statewide: boolean; step: number;
  delivery: { distributedPct: number; participationPct: number; completionPct: number; baselineAvg: number; followUpAvg: number | null; budgetUsed: number };
  risks: { id: ID; level: "high" | "medium" | "low"; text: string }[];
  history: { at: ISODate; text: string }[];
}

/* ---------- Content & distribution ---------- */
export type ResourceType = "video" | "mcq" | "game" | "course" | "document" | "microlearning";
export interface ResourceRecord {
  id: ID; title: string; type: ResourceType; gradeId: string; subjectId: string; chapter: string; objectiveId: string | null; language: string;
  approval: "approved" | "pending" | "rejected"; source: string; version: string; replacedBy?: string; views: number; completions: number;
}
export interface DistributionSelection { resourceIds: string[]; districtIds: string[]; gradeIds: string[]; note: string }
export interface DistributionPreview { resources: number; districts: number; institutions: number; students: number; warnings: string[]; needsApproval: boolean; blocked: string[] }
export interface DistributionRecord {
  id: ID; at: ISODate; by: string; resources: number; resourceTitles: string[]; districtIds: string[]; districtLabel: string; gradeIds: string[]; students: number;
  status: "awaiting-approval" | "scheduled" | "delivered" | "rejected"; note: string; decidedBy?: string;
}

/* ---------- Assessments ---------- */
export interface AssessmentConfig {
  id: ID; name: string; layer: "baseline" | "continuous" | "progress"; gradeId: string; subjectId: string; curriculum: string; year: string; objectiveIds: string[];
  mandatory: boolean; state: "not-started" | "in-progress" | "complete"; followUp: "pending" | "complete" | "n/a";
  coverage: number; completion: number; proficiency: number; mastery: number; locked: boolean; createdAt: ISODate; createdBy: string;
}

/* ---------- Governance ---------- */
export interface AuditEntry { id: ID; at: ISODate; actor: string; role: string; action: string; entity: string; entityType: string; detail: string; outcome: "success" | "rejected" | "blocked" }
export interface ApprovalItem { id: ID; kind: "programme" | "ai-teacher" | "distribution"; title: string; submittedBy: string; at: ISODate; scope: string; summary: string; risk: "high" | "medium" | "low"; href?: string }

/* ---------- AI ---------- */
export interface CommandResult {
  id: ID; query: string; summary: string; chart?: { kind: "bar" | "line"; title: string; unit?: string; data: { label: string; value: number }[]; compare?: { label: string; value: number }[] };
  table?: { columns: string[]; rows: (string | number)[][] }; definitions: { term: string; text: string }[]; actions: { label: string; href?: string; kind?: "proposal" }[];
  caveats: string[]; sources: string; proposal?: ProgrammeDraft; generatedAt: ISODate;
}
export interface Interpretation { action: string; scope: string; audience: string; approval: string; readOnly: boolean; queryId: string }
export interface StateAgent {
  id: ID; name: string; purpose: string; autonomy: "suggest" | "assist" | "autonomous"; status: "draft" | "awaiting-approval" | "published" | "paused" | "retired";
  scope: string; lastRun: string; runs: number; approvalNote: string;
}

export interface KgObjective { id: string; code: string; title: string; subjectId: string; gradeId: string; chapter: string; competency: string; language: string }
export interface ObjectiveDetail {
  objective: KgObjective; resources: ResourceRecord[]; courses: { id: string; title: string; activityCount: number }[]; activities: { id: string; title: string; type: string; courseId: string }[];
  assessments: { id: string; title: string; kind: string; questions: number }[]; descriptors: { level: string; text: string }[]; remedial: { id: string; title: string; kind: string }[]; competency: string;
}
