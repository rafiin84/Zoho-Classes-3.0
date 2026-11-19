import type { AuditEvent, ApprovalItem, ConsentRecord, SharingPolicy, ExportRequest, InstRole } from "@/types/institution";
import { AUDIT_SEED, APPROVAL_SEED, CONSENT_SEED, POLICY_SEED, SHARING_SEED, EXPORT_SEED, DATA_CATEGORIES, RETENTION_RULES } from "../mock-data/governance";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { track } from "../analytics";
import { notificationService } from "./notificationService";

const audit: AuditEvent[] = structuredClone(AUDIT_SEED);
const approvals: ApprovalItem[] = structuredClone(APPROVAL_SEED);
const consents: ConsentRecord[] = structuredClone(CONSENT_SEED);
const sharing: SharingPolicy[] = structuredClone(SHARING_SEED);
const exportsReq: ExportRequest[] = structuredClone(EXPORT_SEED);
const tenant = { name: "Greenfield International School", language: "English", timezone: "Asia/Kolkata", gradingScale: "Percentage + letter grade", sessionTimeoutMin: 30, mfaForAdmins: true, feesEnabled: true };

/** Append an audit event from anywhere (synchronous, never throws). Other services/screens may import `recordAudit`. */
export function recordAudit(e: Omit<AuditEvent, "id" | "at" | "outcome"> & { at?: string; outcome?: AuditEvent["outcome"] }): AuditEvent {
  const ev: AuditEvent = { id: uid("aud"), at: e.at ?? new Date().toISOString(), outcome: e.outcome ?? "success", institutionId: "inst-greenfield", ...e };
  audit.unshift(ev);
  return ev;
}

export const ROLE_MATRIX_AREAS = ["Students & people", "Academic records", "Marks publication", "Fees & finance", "AI Teachers & agents", "Marketplace purchases", "Communication", "Audit & governance"];
export const ROLE_MATRIX: InstRole[] = [
  { id: "admin", label: "Institution admin", permissions: Object.fromEntries(ROLE_MATRIX_AREAS.map((a) => [a, "full"])) as InstRole["permissions"] },
  { id: "branch", label: "Branch admin", permissions: { "Students & people": "scoped", "Academic records": "scoped", "Marks publication": "view", "Fees & finance": "view", "AI Teachers & agents": "view", "Marketplace purchases": "none", Communication: "scoped", "Audit & governance": "view" } },
  { id: "finance", label: "Finance staff", permissions: { "Students & people": "view", "Academic records": "none", "Marks publication": "none", "Fees & finance": "full", "AI Teachers & agents": "none", "Marketplace purchases": "view", Communication: "none", "Audit & governance": "none" } },
  { id: "registrar", label: "Registrar / exam office", permissions: { "Students & people": "full", "Academic records": "full", "Marks publication": "full", "Fees & finance": "none", "AI Teachers & agents": "none", "Marketplace purchases": "none", Communication: "view", "Audit & governance": "view" } },
  { id: "teacher", label: "Teacher", permissions: { "Students & people": "scoped", "Academic records": "scoped", "Marks publication": "none", "Fees & finance": "none", "AI Teachers & agents": "scoped", "Marketplace purchases": "none", Communication: "scoped", "Audit & governance": "none" } },
];

export const governanceService = {
  record: recordAudit,
  audit: (f: { q?: string; category?: string; outcome?: string; actorRole?: string } = {}) => simulate(() => audit.filter((e) => (!f.category || e.category === f.category) && (!f.outcome || e.outcome === f.outcome) && (!f.actorRole || e.actorRole === f.actorRole) && (!f.q || `${e.actor} ${e.action} ${e.target} ${e.context}`.toLowerCase().includes(f.q.toLowerCase()))).sort((a, b) => b.at.localeCompare(a.at)), { failKey: "audit" }),
  /** Synchronous accessors for seeds */
  roles: () => ({ areas: ROLE_MATRIX_AREAS, roles: ROLE_MATRIX }),
  approvals: (status?: ApprovalItem["status"]) => simulate(() => approvals.filter((a) => !status || a.status === status).sort((a, b) => b.at.localeCompare(a.at)), { failKey: "approvals" }),
  pendingApprovalCount: () => approvals.filter((a) => a.status === "pending").length,
  createApproval: (a: Omit<ApprovalItem, "id" | "at" | "status" | "institutionId"> & { institutionId?: string }) => simulate(() => {
    const item: ApprovalItem = { id: uid("apr"), at: new Date().toISOString(), status: "pending", institutionId: "inst-greenfield", ...a };
    approvals.unshift(item);
    recordAudit({ actor: a.requestedBy, actorRole: "Institution admin", action: "Raised approval request", category: "Approvals", target: a.title, context: a.kind, outcome: "pending" });
    notificationService.push({ role: "institution", category: "governance", title: "New approval request", body: a.title, href: "/institution/governance" });
    track("approval_created" as any, { kind: a.kind });
    return item;
  }),
  decide: (id: string, decision: "approved" | "rejected", by: string, reason?: string) => simulate(() => {
    const a = approvals.find((x) => x.id === id); if (!a) throw new ServiceError("Approval not found", "unavailable");
    if (a.status !== "pending") throw new ServiceError("This request was already decided.", "validation");
    if (decision === "rejected" && !reason?.trim()) throw new ServiceError("A reason is required to reject.", "validation");
    a.status = decision; a.decidedBy = by; a.decidedAt = new Date().toISOString(); a.reason = reason;
    const cat: Record<string, string> = { "ai-teacher": "AI Teacher publication", marksheet: "Marks approval/publication", "agent-action": "Agent execution", programme: "Government programme approval", intervention: "Intervention", content: "Content publication", "data-export": "Data export" };
    recordAudit({ actor: by, actorRole: "Institution admin", action: decision === "approved" ? "Approved request" : "Rejected request", category: cat[a.kind] ?? "Approvals", target: a.title, context: reason ?? "Approvals queue" });
    return a;
  }),
  consents: () => simulate(() => consents),
  updateConsent: (id: string, state: ConsentRecord["state"], by: string) => simulate(() => {
    const c = consents.find((x) => x.id === id); if (!c) throw new ServiceError("Record not found", "unavailable");
    c.state = state; c.updatedAt = new Date().toISOString();
    recordAudit({ actor: by, actorRole: "Institution admin", action: `Recorded consent as ${state}`, category: "Consent update", target: `${c.kind} · ${c.subject}`, context: `Policy v${c.policyVersion} (recorded on behalf of guardian)` });
    return c;
  }),
  policies: () => simulate(() => POLICY_SEED),
  dataCategories: () => simulate(() => DATA_CATEGORIES),
  retention: () => simulate(() => RETENTION_RULES),
  sharing: () => simulate(() => sharing),
  setSharing: (id: string, state: SharingPolicy["state"]) => simulate(() => { const s = sharing.find((x) => x.id === id)!; s.state = state; recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: `Data-sharing ${state}`, category: "Data export", target: s.partner, context: s.scope }); return s; }),
  exports: () => simulate(() => exportsReq),
  requestExport: (kind: string, scope: string, by: string) => simulate(() => { if (!scope.trim()) throw new ServiceError("Describe the export scope.", "validation"); const r: ExportRequest = { id: `EXP-${1024 + exportsReq.length}`, kind, requestedBy: by, at: new Date().toISOString(), status: "pending", scope }; exportsReq.unshift(r); recordAudit({ actor: by, actorRole: "Institution admin", action: "Requested data export", category: "Data export", target: kind, context: scope, outcome: "pending" }); return r; }),
  decideExport: (id: string, ok: boolean) => simulate(() => { const r = exportsReq.find((x) => x.id === id)!; r.status = ok ? "ready" : "rejected"; recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: ok ? "Approved data export" : "Rejected data export", category: "Data export", target: r.kind, context: r.scope }); return r; }),
  tenant: () => simulate(() => tenant),
  updateTenant: (p: Partial<typeof tenant>) => simulate(() => { Object.assign(tenant, p); recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: "Updated tenant settings", category: "Tenant settings", target: Object.keys(p).join(", "), context: "Governance · tenant settings" }); return tenant; }),
};
export const AUDIT_CATEGORIES = ["Role change", "Record access", "Data export", "Consent update", "Agent execution", "AI grading override", "Marks approval/publication", "Fee adjustment/payment status", "Timetable override", "Government programme approval", "Feed moderation", "AI Teacher publication", "Tenant settings", "Approvals", "Intervention", "Content publication"];
