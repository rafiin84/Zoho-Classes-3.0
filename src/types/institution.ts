import type { ID, ISODate } from "./index";

/* ---------- Governance & audit ---------- */
export type AuditOutcome = "success" | "denied" | "failed" | "pending";
export interface AuditEvent {
  id: ID; at: ISODate; actor: string; actorRole: string; action: string; category: string; target: string; context: string; outcome: AuditOutcome;
  institutionId?: ID; detail?: string;
}
export type ApprovalKind = "ai-teacher" | "marksheet" | "agent-action" | "programme" | "intervention" | "content" | "data-export";
export interface ApprovalItem {
  id: ID; kind: ApprovalKind; title: string; summary: string; requestedBy: string; at: ISODate; status: "pending" | "approved" | "rejected";
  institutionId: ID; decidedBy?: string; decidedAt?: ISODate; reason?: string; href?: string; meta?: Record<string, string>;
}
export interface ConsentRecord { id: ID; subject: string; guardian: string; kind: string; state: "granted" | "pending" | "withdrawn" | "not-required"; updatedAt: ISODate; policyVersion: string }
export interface PolicyVersion { id: ID; name: string; version: string; effective: ISODate; status: "current" | "upcoming" | "superseded"; summary: string }
export interface SharingPolicy { id: ID; partner: string; scope: string; purpose: string; state: "active" | "requested" | "revoked"; consent: string; expires: ISODate }
export interface ExportRequest { id: ID; kind: string; requestedBy: string; at: ISODate; status: "pending" | "approved" | "rejected" | "ready"; scope: string }

/* ---------- Academic structure ---------- */
export type NodeKind = "institution" | "branch" | "department" | "grade" | "class" | "section" | "group";
export interface HierarchyNode { id: ID; kind: NodeKind; name: string; children?: HierarchyNode[]; students?: number; lead?: string; note?: string }
export interface Membership { id: ID; personId: ID; personName: string; groupId: ID; groupName: string; kind: "class" | "club" | "house" | "learning-group" | "course-cohort" | "remedial"; start: ISODate; end?: ISODate; state: "active" | "alumni" | "scheduled" | "ended" }
export interface BranchRecord { id: ID; institutionId: ID; name: string; city: string; head: string; students: number; teachers: number; status: "active" | "archived"; inherit: { grading: boolean; calendar: boolean; feePolicy: boolean; aiPolicy: boolean }; code: string }
export interface DepartmentRecord { id: ID; institutionId: ID; branchId: ID | "all"; name: string; head: string; programmes: number; status: "active" | "archived" }

/* ---------- People ---------- */
export type PersonKind = "student" | "teacher" | "staff" | "parent";
export interface DirectoryPerson {
  id: ID; kind: PersonKind; name: string; institutionId: ID; branchId: ID; unit: string; role: string; status: "active" | "alumni" | "on-leave" | "invited" | "pending-verification" | "verified" | "limited";
  email: string; joined: ISODate; groups: string[]; extra?: string;
}
export interface InstRole { id: string; label: string; permissions: Record<string, "full" | "view" | "none" | "scoped"> }

/* ---------- Analytics ---------- */
export interface BranchMetrics { branchId: ID; engagement: number; engagementDelta: number; attendance: number; completion: number; avgScore: number; support: number; aiUsage: number; interventions: number }
export interface ObjectiveGap { objectiveId: string; label: string; subject: string; mastery: number; students: number }

/* ---------- Finance ---------- */
export interface FeePlan {
  id: ID; name: string; head: string; year: string; programme: string; grade: string; branch: string; amount: number; currency: "INR"; dueDate: ISODate;
  installments: { label: string; due: ISODate; pct: number }[]; lateFee: string; group: string; status: "draft" | "active";
}
export interface AdjustmentRequest { id: ID; kind: "refund" | "adjustment" | "concession" | "scholarship"; student: string; grade: string; branchId: ID; amount: number; reason: string; status: "pending" | "approved" | "rejected"; at: ISODate; head: string; decidedNote?: string }
export interface ReminderLog { id: ID; at: ISODate; audience: string; count: number; channel: string }

/* ---------- Marketplace ---------- */
export type ListingKind = "AI Teacher" | "Course" | "Lesson" | "Assignment" | "Question paper" | "MCQ bank" | "Video" | "PDF" | "Presentation" | "Notes" | "E-book" | "Game" | "Simulation" | "Rubric";
export type LicenceType = "Free" | "One-time" | "Subscription" | "Institution licence" | "Government / bulk";
export interface MarketListing {
  id: ID; title: string; kind: ListingKind; creator: string; creatorId: ID; scope: "public" | "private"; subject: string; grade: string; language: string; price: number; licence: LicenceType;
  rating: number; reviews: number; version: string; status: "draft" | "in-review" | "approved" | "suspended" | "retired" | "withdrawn"; summary: string; sales: number; revenue: number; updatedAt: ISODate; aiGenerated?: boolean; objectives?: string[];
  reviewList: { who: string; stars: number; text: string }[];
}
export interface Entitlement { id: ID; listingId: ID; title: string; licence: LicenceType; seats: number; used: number; acquiredAt: ISODate; expiresAt?: ISODate; status: "active" | "expired" | "revoked"; ref: string; shared: string[] }
export interface Creator { id: ID; name: string; bio: string; listings: number; rating: number; verified: boolean }
export interface Submission { id: ID; kind: "ai-teacher" | "content"; title: string; status: "draft" | "in-review" | "approved" | "changes-requested" | "published" | "withdrawn"; version: string; submittedAt: ISODate; scope: "private" | "institution" | "public"; notes: string[] }

/* ---------- Integrations ---------- */
export interface Connector { id: ID; name: string; purpose: string; state: "Demo" | "Not connected" | "Connected (demo)"; scope: string; lastSync?: ISODate; icon: string; config: Record<string, string>; testLog: { at: ISODate; ok: boolean; msg: string }[] }

/* ---------- Communication ---------- */
export interface Circular { id: ID; title: string; body: string; audience: string; kind: "circular" | "announcement"; status: "draft" | "scheduled" | "published"; at: ISODate; scheduledFor?: ISODate; author: string; reads: number; branchId: ID | "all" }

/* ---------- Reports ---------- */
export interface ReportDef { id: ID; group: string; title: string; desc: string; filters: string[]; metrics: string[]; chart: "bar" | "line" | "table" | "donut"; drill: string[]; unit: string }
export interface ScheduledReport { id: ID; name: string; cadence: string; recipients: string; state: "active" | "paused"; next: ISODate }

/* ---------- Workspace ---------- */
export interface WorkspaceAnswer {
  id: string; query: string; summary: string; chart: { label: string; value: number; sub?: string }[]; unit: string; metrics: { name: string; definition: string }[];
  range: string; source: string; sourceAt: ISODate; action: string; caveats: string[]; drill: { label: string; branchId?: string }[]; actionKind?: "intervention";
}
export interface Interpretation { action: string; scope: string; audience: string; approval: string; summary: string }

/* ---------- AI providers ---------- */
export type ProviderId = "openai" | "gemini" | "claude" | "deepseek" | "custom";
export type OwnerLevel = "government" | "institution" | "teacher" | "student";
export type TaskKey = "tutoring" | "rag" | "question-generation" | "grading-suggestions" | "summarisation" | "analytics";
export type AutonomyCeiling = "suggest" | "assist" | "autonomous";
export interface ProviderConfig {
  id: ProviderId; name: string; models: string[]; defaultModel: string; enabled: boolean; keyMask: string; keyOwner: OwnerLevel; inherited: boolean; connection: "untested" | "ok" | "failed" | "unavailable"; lastTested?: ISODate;
  budget: number; spent: number; approvedByGovernment: boolean;
}
export interface TaskRoute { task: TaskKey; provider: ProviderId; model: string; preference: "cost" | "balanced" | "performance"; fallback: ProviderId | "none" }
export interface ProviderPolicy {
  ownerLevel: OwnerLevel; allowPersonalKeys: boolean; allowStudentKeys: boolean; studentMinAge: number; requireGuardianConsent: boolean; disabledActivities: string[];
  pauseAtBudget: boolean; alertThreshold: number; autonomyCeiling: AutonomyCeiling; monthlyBudget: number;
}
