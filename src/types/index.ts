// Core frontend domain contracts (not a database schema). Domain-specific types live beside their feature
// in `src/types/<domain>.ts` and are re-exported where useful.

export type Role = "student" | "teacher" | "institution" | "government" | "parent";
export type ID = string;
export type ISODate = string;

export interface Person {
  id: ID;
  displayName: string;
  avatarColor: string; // token-ish hex for generated avatar
  role: Role | "staff";
}

export interface Institution {
  id: ID; name: string; type: "school" | "university"; tenantId: ID; parentGovernmentId?: ID;
  branchIds: ID[]; academicYearId: ID; timezone: string; defaultLanguage: string; status: "active" | "trial";
}
export interface Branch { id: ID; institutionId: ID; name: string; city: string; students: number; teachers: number }
export interface Classroom { id: ID; branchId: ID; gradeId: ID; name: string; section: string; teacherId: ID; studentIds: ID[] }
export interface Subject { id: ID; name: string; color: string; icon: string }

export interface Student {
  id: ID; displayName: string; avatarColor: string; gradeId: string; gradeLabel: string; classId: ID; className: string;
  institutionId: ID; branchId: ID; academicYearId: ID; preferredLanguage: string; status: "active" | "alumni" | "pending-baseline";
  membershipIds: ID[]; portfolioId: ID; learningProfileId: ID; interests: string[]; parentIds: ID[];
}
export interface Teacher {
  id: ID; displayName: string; avatarColor: string; employeeCode: string; institutionId: ID; branchIds: ID[]; departmentId: string;
  departmentName: string; subjectIds: string[]; classIds: ID[]; workloadLimit: number; status: "active" | "on-leave"; title: string;
}
export interface Parent { id: ID; displayName: string; avatarColor: string; childIds: ID[]; verification: "verified" | "pending" | "limited" | "revoked" }

export interface AIPersona { id: ID; name: string; kind: "ai-teacher" | "ai-tutor"; subject?: string; avatarColor: string }

export type CourseKind = "institution" | "marketplace";
export interface Course {
  id: ID; title: string; description: string; subjectId: string; gradeIds: string[]; creatorName: string; creatorKind: "teacher" | "ai-teacher" | "creator" | "institution";
  institutionId?: ID; priceType: "free" | "paid"; price: number; currency: "INR"; durationMinutes: number; moduleCount: number; lessonCount: number;
  rating: number; ratings: number; language: string; status: "draft" | "published" | "archived"; version: number; cover: { from: string; to: string; icon: string };
  labels: ("teacher-assigned" | "ai-recommended" | "trending" | "featured")[]; outcomes: string[]; kind: CourseKind; accessDays?: number;
}

export type ActivityType = "video" | "lesson" | "reading" | "mcq" | "quiz" | "game" | "assignment" | "discussion" | "document" | "teacher-checkpoint" | "ai-checkpoint" | "assessment" | "live-class" | "poll" | "simulation";
export interface LearningActivity {
  id: ID; courseId: ID; moduleId: ID; type: ActivityType; title: string; instructions?: string; sequence: number; estimatedMinutes: number;
  mandatory: boolean; checkpointMode?: "inline" | "overlay" | "popup" | "fullscreen"; learningObjectiveIds: string[]; payload?: Record<string, unknown>;
}
export interface CourseModule { id: ID; courseId: ID; title: string; sequence: number; activityIds: ID[] }

export type DoubtStatus = "open" | "answered" | "follow-up" | "resolved";
export interface DoubtMessage { id: ID; authorId: ID; authorRole: "student" | "teacher"; text: string; at: ISODate; kind: "text" | "voice" | "video" | "annotated"; attachments: { name: string; kind: "image" | "doc" | "audio" }[] }
export interface DoubtThread {
  id: ID; studentId: ID; teacherId: ID; courseId?: ID; lessonId?: string; questionId?: string; title: string; context?: string;
  messages: DoubtMessage[]; status: DoubtStatus; createdAt: ISODate; updatedAt: ISODate; subjectId: string; escalatedFromTutor?: boolean;
}

export type ModerationStatus = "draft" | "submitted" | "approved" | "published" | "rejected" | "hidden" | "removed";
export type AudienceType = "private" | "class" | "school" | "club" | "event" | "wider";
export type PostType = "announcement" | "class" | "event" | "resource" | "quiz" | "challenge" | "programme" | "achievement" | "talent" | "club" | "organisation";
export interface FeedPost {
  id: ID; authorId: ID; authorName: string; authorRole: Role | "ai-teacher" | "club" | "government"; authorColor: string; institutionId: ID;
  audienceType: AudienceType; audienceLabel: string; contextLabel: string; postType: PostType; text: string;
  media?: { kind: "image" | "video"; from: string; to: string; icon: string; caption?: string };
  linkedEntityType?: "event" | "course" | "assignment" | "quiz" | "challenge" | "club" | "result"; linkedEntityId?: ID; cta?: { label: string; href: string };
  moderationStatus: ModerationStatus; moderationReason?: string; reactionCount: number; reactions: Record<string, number>; myReaction?: string;
  commentCount: number; comments: { id: ID; authorName: string; text: string; at: ISODate; replies?: { id: ID; authorName: string; text: string; at: ISODate }[] }[];
  saved: boolean; reported: boolean; createdAt: ISODate; category?: string; commentsDisabled?: boolean;
}

export interface AppNotification {
  id: ID; role: Role; recipientId?: ID; childId?: ID; category: "academic" | "communication" | "events" | "learning" | "institution" | "finance" | "live" | "governance";
  title: string; body: string; at: ISODate; read: boolean; href?: string; private?: boolean;
}

export type EventStatus = "draft" | "published" | "registration-open" | "registration-closed" | "in-progress" | "judging" | "results-published" | "completed" | "cancelled";
export type RegistrationStatus = "not-registered" | "registered" | "waitlisted" | "pending-consent" | "withdrawn";
export interface EventItem {
  id: ID; title: string; category: string; organiser: string; scope: "class" | "school" | "inter-school" | "district" | "state"; startAt: ISODate; endAt: ISODate;
  venue: string; eligibility: string; rules: string[]; registrationMode: "individual" | "team" | "none"; capacity: number; registered: number; status: EventStatus;
  schedule: { time: string; label: string }[]; judges: { name: string; role: string }[]; rubric: { criterion: string; weight: number }[];
  announcements: { at: ISODate; text: string }[]; results?: { rank: number; name: string; team?: string; score: number }[]; cover: { from: string; to: string; icon: string };
  teamSize?: number; myRegistration: RegistrationStatus; myTeam?: { name: string; members: string[] };
}
export interface Club {
  id: ID; name: string; category: string; description: string; purpose: string; mentor: string; leaders: string[]; membershipPolicy: "open" | "request"; members: number;
  meeting: string; activities: { id: ID; title: string; at: ISODate }[]; cover: { from: string; to: string; icon: string }; myStatus: "none" | "pending" | "active" | "rejected";
  achievements: string[]; posts: ID[]; resources: string[];
}

export interface FeeHead { id: ID; label: "Tuition" | "Admission" | "Examination" | "Transport" | "Laboratory" | "Hostel" | "Activity" | string; amount: number; concession: number }
export interface FeeInstallment { id: ID; label: string; dueDate: ISODate; amount: number; paid: number; status: "paid" | "due" | "overdue" | "partially-paid" | "upcoming"; heads: { headId: ID; amount: number }[]; lateFee?: number }
export type TxnStatus = "Pending" | "Successful" | "Failed" | "Refunded" | "Partially Paid" | "Overdue";
export interface FeeTransaction { id: ID; feeAccountId: ID; installmentIds: ID[]; amount: number; currency: "INR"; methodLabel: string; status: TxnStatus; initiatedAt: ISODate; completedAt?: ISODate; receiptNumber?: string; demoReference: string }
export interface FeeAccount {
  id: ID; studentId: ID; institutionId: ID; academicYearId: ID; heads: FeeHead[]; installments: FeeInstallment[]; assessedTotal: number; concessionTotal: number;
  paidTotal: number; balance: number; currency: "INR"; transactions: FeeTransaction[]; status: "clear" | "due" | "overdue" | "partially-paid"; feesEnabled: boolean;
}
export interface CourseOrder {
  id: ID; studentId: ID; courseId: ID; sellerName: string; amount: number; currency: "INR"; licenceType: string; status: TxnStatus; entitlementStatus: "active" | "none" | "expired";
  receiptReference: string; at: ISODate; expiresAt?: ISODate;
}

export type MeetingStatus = "Scheduled" | "Live" | "Completed" | "Cancelled";
export interface LiveClass {
  id: ID; title: string; kind: "class" | "one-to-one" | "group" | "office-hours" | "parent-teacher" | "staff" | "webinar"; hostId: ID; hostName: string; courseId?: ID; classIds: ID[];
  audienceLabel: string; startAt: ISODate; durationMinutes: number; agenda: string; status: MeetingStatus; waitingRoom: boolean; recordingPolicy: "off" | "on-with-consent";
  participants: { id: ID; name: string; role: "teacher" | "student" | "parent"; state: "invited" | "waiting" | "joined" | "left" | "removed"; muted: boolean; handRaised: boolean; durationMin?: number }[];
  resources: { name: string }[]; recordingLink?: string; endedAt?: ISODate;
}

export interface Assignment {
  id: ID; title: string; courseId: ID; courseTitle: string; subjectId: string; teacherId: ID; teacherName: string; classIds: ID[]; dueAt: ISODate; instructions: string;
  submissionTypes: ("text" | "file" | "image" | "audio" | "link")[]; resources: string[]; rubricId?: ID; totalMarks: number; learningObjectiveIds: string[];
}
export interface AssignmentSubmission {
  id: ID; assignmentId: ID; studentId: ID; status: "todo" | "draft" | "submitted" | "returned" | "graded" | "overdue"; text?: string; attachments: { name: string; kind: string }[]; submittedAt?: ISODate;
  marks?: number; feedback?: string; releaseStatus: "unreleased" | "released"; draftAiMarks?: number; resubmissions: number;
}

export interface MasteryItem { objectiveId: string; label: string; subjectId: string; mastery: number; trend: "up" | "flat" | "down"; evidence: string }
export interface LearningGap { id: ID; objectiveId: string; label: string; subjectId: string; severity: "low" | "medium" | "high"; derivedFrom: string; remedialPathId?: ID }
export interface LearningProfile {
  id: ID; studentId: ID; updatedAt: ISODate; subjectMastery: Record<string, number>; objectives: MasteryItem[]; strengths: string[]; gaps: LearningGap[];
  streak: { current: number; best: number; weekDays: boolean[]; recoveriesLeft: number }; points: number; level: number; badges: { id: string; label: string; earnedAt: ISODate; icon: string }[];
  weeklyGoalMinutes: number; weeklyMinutes: number; history: { id: ID; kind: "challenge" | "game" | "course" | "tutor" | "assessment"; title: string; at: ISODate; result: string }[];
}
export interface RemedialPath { id: ID; studentId: ID; gapId: ID; title: string; steps: { id: ID; label: string; kind: string; minutes: number; done: boolean }[]; targetDate: ISODate; status: "proposed" | "approved" | "in-progress" | "completed"; origin: "teacher" | "ai" }

export type TeacherAudience = "staff-only";
