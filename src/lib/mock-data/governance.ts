import type { AuditEvent, ApprovalItem, ConsentRecord, PolicyVersion, SharingPolicy, ExportRequest, AuditOutcome } from "@/types/institution";
import { ago } from "@/lib/format";

// [minutesAgo, actor, actorRole, action, category, target, context, outcome]
type T = [number, string, string, string, string, string, string, AuditOutcome];
const rows: T[] = [
  [12, "Principal Anita Desai", "Institution admin", "Approved AI Teacher", "AI Teacher publication", "AI Teacher · Newton v1.4", "Governance approvals queue", "success"],
  [35, "Priya Nair", "Teacher", "Overrode AI grading suggestion", "AI grading override", "Assignment · Baking with fractions · Kabir Mehta", "Grading review · 14/20 → 16/20", "success"],
  [58, "Registrar Office", "Institution admin", "Published marksheets", "Marks approval/publication", "Grade 8 · Mid-term 2026 (42 marksheets)", "Results publication", "success"],
  [90, "Finance Officer Rekha Pillai", "Finance staff", "Adjusted fee installment", "Fee adjustment/payment status", "Kabir Mehta · Term 1 · late fee waived ₹500", "Fees console", "success"],
  [140, "Daniel Okafor", "Teacher", "Timetable override (substitution)", "Timetable override", "Tuesday P4 · Grade 9C · Science", "Timetable conflict resolution", "success"],
  [190, "Principal Anita Desai", "Institution admin", "Changed role", "Role change", "Sameer Bhatt · Teacher → Teacher + Exam coordinator", "People & enrolments", "success"],
  [240, "Karuvana State Education Dept.", "Government", "Approved programme", "Government programme approval", "Foundational Numeracy Mission 2026–27", "Government programmes", "success"],
  [310, "Moderator Farah Siddiqui", "Teacher", "Moderated feed post", "Feed moderation", "Post · Talent Corner · Grade 8B", "Rejected — contains personal contact details", "success"],
  [360, "Registrar Office", "Institution admin", "Exported student list", "Data export", "Grade 8 roster · 62 records", "Export request EXP-1021", "success"],
  [420, "Agent: Weekly digest", "Agent", "Executed agent run", "Agent execution", "Parent digest · Grade 7", "Autonomy: Assist · approval before send", "success"],
  [500, "Parent Rohan Rao", "Parent", "Updated consent", "Consent update", "AI Teacher access · Ananya Rao", "Policy v2.1", "success"],
  [560, "Lakeside admin", "Branch admin", "Viewed student record", "Record access", "Student · Arnav Singh", "Branch scope · Lakeside Campus", "success"],
  [610, "Unknown (Lakeside admin)", "Branch admin", "Attempted export outside scope", "Data export", "North Campus staff list", "Branch scope violation", "denied"],
  [700, "Principal Anita Desai", "Institution admin", "Suspended AI Teacher", "AI Teacher publication", "AI Teacher · Sahay v0.9", "Feedback-tone concern raised", "success"],
  [780, "Leela Krishnan", "Teacher", "Submitted AI Teacher for approval", "AI Teacher publication", "AI Teacher · Kavya v0.3", "Teacher AI Teachers", "pending"],
  [860, "Finance Officer Rekha Pillai", "Finance staff", "Marked payment reconciled", "Fee adjustment/payment status", "TXN DEMO-TXN-47110", "Reconciliation", "success"],
  [940, "Registrar Office", "Institution admin", "Updated tenant setting", "Tenant settings", "Default language → English", "Governance · tenant settings", "success"],
  [1100, "Daniel Okafor", "Teacher", "Viewed student record", "Record access", "Student · Dev Malhotra", "Class 8B", "success"],
  [1300, "Agent: Fee reminder", "Agent", "Execution blocked", "Agent execution", "Fee reminders · Term 2", "Touches fees — approval required", "denied"],
  [1500, "Principal Anita Desai", "Institution admin", "Approved concession", "Fee adjustment/payment status", "Concession · Sana Qureshi · ₹4,000", "Fees console", "success"],
  [1700, "Teacher Arjun Menon", "Teacher", "Overrode AI grading suggestion", "AI grading override", "Quiz · River valleys · Tara Joseph", "Grading review", "success"],
  [1900, "Registrar Office", "Institution admin", "Created branch", "Role change", "Department · Computing & Robotics", "Branches & departments", "success"],
  [2100, "Principal Anita Desai", "Institution admin", "Published marksheets", "Marks approval/publication", "Grade 9 · Unit test 2", "Results publication", "failed"],
  [2400, "Parent Neha Joseph", "Parent", "Withdrew consent", "Consent update", "Photo sharing · Tara Joseph", "Policy v2.0", "success"],
  [2700, "Lakeside admin", "Branch admin", "Viewed student record", "Record access", "Student · Zoya Khan", "Branch scope · Lakeside Campus", "success"],
  [3000, "Agent: Attendance nudge", "Agent", "Executed agent run", "Agent execution", "Absentee notices · Grade 8", "Autonomy: Suggest", "success"],
  [3300, "Karuvana State Education Dept.", "Government", "Requested data-sharing review", "Data export", "District literacy snapshot", "State analytics", "pending"],
  [3600, "Principal Anita Desai", "Institution admin", "Retired AI Teacher", "AI Teacher publication", "AI Teacher · Draft Poet v0.2", "Governance", "success"],
  [4200, "Moderator Farah Siddiqui", "Teacher", "Hid feed post", "Feed moderation", "Post · Club update · Chess", "Reported by 2 students", "success"],
  [4800, "Registrar Office", "Institution admin", "Changed role", "Role change", "Meera Iyer (parent link) · Verification pending", "People & enrolments", "pending"],
  [5400, "Finance Officer Rekha Pillai", "Finance staff", "Approved refund", "Fee adjustment/payment status", "Refund · Vihaan Rao · ₹3,000", "Fees console", "success"],
  [6000, "Daniel Okafor", "Teacher", "Timetable override (swap)", "Timetable override", "Wed P2 · Grade 8B · Science ↔ Maths", "Timetable", "success"],
  [6800, "Principal Anita Desai", "Institution admin", "Exported audit log", "Data export", "Audit events · last 30 days", "Governance", "success"],
  [7500, "Parent Rohan Rao", "Parent", "Viewed child record", "Record access", "Ananya Rao · marksheet", "Parent portal", "success"],
];
export const AUDIT_SEED: AuditEvent[] = rows.map((r, i) => ({ id: `aud-${1000 + rows.length - i}`, at: ago(r[0]), actor: r[1], actorRole: r[2], action: r[3], category: r[4], target: r[5], context: r[6], outcome: r[7], institutionId: "inst-greenfield" }));

const ap = (id: string, kind: ApprovalItem["kind"], title: string, summary: string, by: string, m: number, extra: Partial<ApprovalItem> = {}): ApprovalItem => ({ id, kind, title, summary, requestedBy: by, at: ago(m), status: "pending", institutionId: "inst-greenfield", ...extra });
export const APPROVAL_SEED: ApprovalItem[] = [
  ap("apr-1", "marksheet", "Publish Grade 9 · Unit test 2 marksheets", "38 marksheets, 2 revaluation notes outstanding. Parents and students see results on publish.", "Registrar Office", 180),
  ap("apr-2", "agent-action", "Agent: Fee reminder — send Term 2 reminders", "Agent wants to message 126 parents about Term 2 dues. Touches fees, so human approval is required.", "Agent · Fee reminder", 300),
  ap("apr-3", "programme", "Join Foundational Numeracy Mission (state)", "Opt Greenfield into the statewide Grade 5–8 numeracy programme with shared baseline data.", "Karuvana State Education Dept.", 1400),
  ap("apr-4", "content", "Publish course: Python for Curious Beginners v2", "Updated course passed 7 of 8 quality checks; human review pending on accessibility.", "Dr. Leela Krishnan", 2000),
  ap("apr-5", "data-export", "Export Grade 8 roster to external LMS", "62 student records (name, class, email). Consent check passed for 58; 4 need guardian consent.", "Registrar Office", 2600),
];

export const CONSENT_SEED: ConsentRecord[] = [
  { id: "con-1", subject: "Ananya Rao", guardian: "Rohan Rao", kind: "AI Teacher access", state: "granted", updatedAt: ago(500), policyVersion: "2.1" },
  { id: "con-2", subject: "Vihaan Rao", guardian: "Rohan Rao", kind: "AI Teacher access", state: "granted", updatedAt: ago(500), policyVersion: "2.1" },
  { id: "con-3", subject: "Tara Joseph", guardian: "Neha Joseph", kind: "Photo sharing in feed", state: "withdrawn", updatedAt: ago(2400), policyVersion: "2.0" },
  { id: "con-4", subject: "Kabir Mehta", guardian: "Anil Mehta", kind: "Inter-school events", state: "pending", updatedAt: ago(4000), policyVersion: "2.1" },
  { id: "con-5", subject: "Meera Iyer", guardian: "Lakshmi Iyer", kind: "AI data access (learning profile)", state: "pending", updatedAt: ago(9000), policyVersion: "2.1" },
  { id: "con-6", subject: "Zoya Khan", guardian: "Imran Khan", kind: "Personal AI key (student)", state: "pending", updatedAt: ago(1500), policyVersion: "2.1" },
  { id: "con-7", subject: "Dev Malhotra", guardian: "Sunita Malhotra", kind: "Inter-school events", state: "granted", updatedAt: ago(7000), policyVersion: "2.0" },
  { id: "con-8", subject: "University students (18+)", guardian: "Self", kind: "AI data access (learning profile)", state: "not-required", updatedAt: ago(20000), policyVersion: "2.1" },
];
export const POLICY_SEED: PolicyVersion[] = [
  { id: "pol-1", name: "Student & guardian privacy notice", version: "2.1", effective: "2026-08-01", status: "current", summary: "Adds AI Teacher data-access wording and BYOK key handling." },
  { id: "pol-2", name: "Student & guardian privacy notice", version: "2.2 (draft)", effective: "2027-01-01", status: "upcoming", summary: "Clarifies retention for alumni records." },
  { id: "pol-3", name: "Student & guardian privacy notice", version: "2.0", effective: "2026-01-01", status: "superseded", summary: "First version covering AI features." },
  { id: "pol-4", name: "Acceptable use of AI (staff)", version: "1.3", effective: "2026-06-15", status: "current", summary: "Human review required for grading, publishing and fee actions." },
];
export const SHARING_SEED: SharingPolicy[] = [
  { id: "shr-1", partner: "Karuvana State Education Dept.", scope: "Aggregated performance & attendance (no names)", purpose: "State learning-gap analytics", state: "active", consent: "Institutional agreement #GOV-22", expires: "2027-03-31" },
  { id: "shr-2", partner: "Meridian University", scope: "Bridge-course content packages", purpose: "Content sharing for Grade 11 bridge programme", state: "requested", consent: "Awaiting both principals", expires: "2027-06-30" },
  { id: "shr-3", partner: "Nilgiri Public School", scope: "Inter-school competition rosters", purpose: "Event registration", state: "active", consent: "Guardian consent per student", expires: "2026-12-31" },
  { id: "shr-4", partner: "External LMS (demo)", scope: "Grade 8 roster export", purpose: "Pilot integration", state: "revoked", consent: "Revoked by registrar", expires: "2026-09-01" },
];
export const EXPORT_SEED: ExportRequest[] = [
  { id: "EXP-1021", kind: "Student roster (CSV)", requestedBy: "Registrar Office", at: ago(360), status: "ready", scope: "Grade 8 · 62 records" },
  { id: "EXP-1022", kind: "Fee ledger (CSV)", requestedBy: "Finance Officer Rekha Pillai", at: ago(120), status: "pending", scope: "Term 1 · all branches" },
  { id: "EXP-1023", kind: "Audit events (CSV)", requestedBy: "Principal Anita Desai", at: ago(6800), status: "ready", scope: "Last 30 days" },
];
export const DATA_CATEGORIES = [
  { name: "Identity & contact", examples: "Name, class, guardian contact", sensitivity: "Personal", retention: "Alumni + 7 years", lawful: "Enrolment contract" },
  { name: "Academic records", examples: "Marksheets, grades, attendance", sensitivity: "Personal", retention: "Permanent (alumni)", lawful: "Statutory record" },
  { name: "Learning activity", examples: "Course progress, mastery, doubts", sensitivity: "Personal", retention: "3 years after exit", lawful: "Educational purpose" },
  { name: "AI interaction logs", examples: "AI Teacher & tutor sessions", sensitivity: "Sensitive", retention: "12 months", lawful: "Guardian consent" },
  { name: "Finance", examples: "Fee ledger, receipts, concessions", sensitivity: "Financial", retention: "8 years", lawful: "Statutory record" },
  { name: "Media & community", examples: "Feed posts, event photos", sensitivity: "Personal", retention: "Until withdrawn", lawful: "Consent" },
];
export const RETENTION_RULES = [
  { id: "ret-1", record: "Active student records", rule: "Retained while enrolled", action: "None", next: "—" },
  { id: "ret-2", record: "Alumni records", rule: "Archive after 1 year; delete personal contact after 7 years", action: "Archive", next: "2027-07-01" },
  { id: "ret-3", record: "AI interaction logs", rule: "Delete after 12 months", action: "Delete", next: "2026-12-01" },
  { id: "ret-4", record: "Audit events", rule: "Retain 3 years (append-only)", action: "Archive", next: "2029-11-19" },
];
