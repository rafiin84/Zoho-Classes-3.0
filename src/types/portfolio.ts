// Student digital portfolio contracts. A portfolio is STUDENT-GENERATED; it is never an institution-certified transcript.
export type PortfolioVisibility = "private" | "guardian" | "teachers" | "institution" | "wider";
export type PortfolioSection = "profile" | "academic" | "courses" | "skills" | "sports" | "competitions" | "awards" | "projects" | "talent" | "clubs" | "milestones";
export type PortfolioApproval = "none" | "pending" | "published";

export interface PortfolioItem {
  id: string; section: PortfolioSection; title: string; subtitle?: string; date?: string; source: "events" | "clubs" | "talent" | "learning" | "badges" | "manual";
  visibility: PortfolioVisibility; approval: PortfolioApproval; href?: string; icon?: string; status?: string;
  /** `institutionRecord` is true only for items copied from a school record (e.g. results). Student-added items are never "verified". */
  institutionRecord: boolean;
}
export interface PortfolioData {
  studentId: string;
  profile: { name: string; gradeLabel: string; className: string; interests: string[]; color: string; status: string };
  academic: { subjectId: string; name: string; mastery: number }[];
  items: PortfolioItem[];
  updatedAt: string;
}
export interface StudentCertificate { id: string; title: string; issuer: string; date: string; kind: "participation" | "achievement" | "course" | "badge"; official: false; href?: string; detail: string }
export type ExportKind = "pdf" | "data" | "certificates" | "verified-request" | "full-data";
export interface ExportRequest { id: string; studentId: string; kind: ExportKind; label: string; scope: string[]; createdAt: string; readyAt: string; expiresAt: string; note?: string; }
export type ExportStatus = "pending" | "ready" | "expired";
