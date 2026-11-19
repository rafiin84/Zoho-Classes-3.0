import type { ProgrammeDraft, ProgrammeRecord, ProgrammeStatus } from "@/types/government";
import { PROGRAMME_SEED, DISTRICTS } from "../mock-data/government";
import { CURRICULUM, AY } from "../mock-data/core";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { notificationService } from "./notificationService";
import { recordAudit } from "./govAudit";

/** State learning programmes. AI may propose; only an authorised official approves. Statewide launch needs explicit confirmation. */
const items: ProgrammeRecord[] = structuredClone(PROGRAMME_SEED);
const find = (id: string) => { const p = items.find((x) => x.id === id); if (!p) throw new ServiceError("Programme not found.", "unavailable"); return p; };
const log = (p: ProgrammeRecord, text: string) => { p.updatedAt = new Date().toISOString(); p.history.unshift({ at: p.updatedAt, text }); };

export const emptyDraft = (): ProgrammeDraft => ({
  name: "", phase: "Phase 1", objective: "", grades: [], subjects: [], objectiveIds: [], resourceIds: [],
  baseline: { enabled: true, mandatory: true, curriculum: CURRICULUM.name, year: AY.label, windowDays: 14, questionCount: 25 },
  districtIds: [], institutionNote: "All institutions in selected districts", interventions: [], aiTeacherIds: [], start: "2027-02-01", end: "2027-06-30", participationTarget: 70, improvementTarget: 8, budget: 0,
});

export function validateForSubmit(d: ProgrammeDraft): string[] {
  const e: string[] = [];
  if (d.name.trim().length < 4) e.push("Give the programme a name (4+ characters).");
  if (d.objective.trim().length < 20) e.push("Describe the objective in at least 20 characters.");
  if (!d.grades.length || !d.subjects.length) e.push("Select at least one grade and subject.");
  if (!d.objectiveIds.length) e.push("Select at least one curriculum learning objective.");
  if (!d.baseline.enabled) e.push("A baseline/diagnostic assessment is required so outcomes can be compared with the original baseline.");
  if (!d.districtIds.length) e.push("Select at least one district.");
  if (d.end <= d.start) e.push("End date must be after the start date.");
  if (d.budget < 0) e.push("Budget cannot be negative.");
  return e;
}

export const programmeService = {
  list: (f: { status?: ProgrammeStatus } = {}) => simulate(() => items.filter((p) => !f.status || p.status === f.status).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), { failKey: "programmes" }),
  get: (id: string) => simulate(() => items.find((p) => p.id === id) ?? null, { failKey: "programmes" }),
  /** Create or update a draft. Never submits. */
  saveDraft: (draft: ProgrammeDraft, id?: string, step = 1, origin: ProgrammeRecord["origin"] = "official") => simulate(() => {
    if (draft.name.trim().length < 2) throw new ServiceError("Give the draft a name before saving.", "validation");
    const now = new Date().toISOString();
    if (id) {
      const p = find(id);
      if (!["draft", "rejected"].includes(p.status)) throw new ServiceError("Only drafts can be edited. Pause or withdraw first.", "validation");
      Object.assign(p, draft, { statewide: draft.districtIds.length === DISTRICTS.length, step: Math.max(step, p.step), status: "draft" as const }); log(p, "Draft saved"); return p;
    }
    const p: ProgrammeRecord = {
      ...draft, id: uid("prg"), status: "draft", createdBy: "State official (demo)", createdAt: now, updatedAt: now, origin, statewide: draft.districtIds.length === DISTRICTS.length, step,
      delivery: { distributedPct: 0, participationPct: 0, completionPct: 0, baselineAvg: 0, followUpAvg: null, budgetUsed: 0 }, risks: [],
      history: [{ at: now, text: origin === "ai-proposal" ? "Draft created from a Government AI proposal (edit before submitting)" : "Draft created" }],
    };
    items.unshift(p); recordAudit({ action: "Created draft programme", entity: p.name, entityType: "programme", detail: origin === "ai-proposal" ? "From AI proposal; not yet reviewed." : "Manual draft." });    return p;
  }),
  submit: (id: string) => simulate(() => {
    const p = find(id); const errs = validateForSubmit(p);
    if (!["draft", "rejected"].includes(p.status)) throw new ServiceError("Only a draft can be submitted for approval.", "validation");
    if (errs.length) throw new ServiceError(errs[0], "validation");
    p.status = "awaiting-approval"; p.submittedAt = new Date().toISOString(); p.rejectionReason = undefined; p.step = 9; log(p, "Submitted for approval");
    recordAudit({ action: "Submitted programme for approval", entity: p.name, entityType: "programme", detail: `${p.districtIds.length} districts, ${p.grades.length} grades.` });
    return p;
  }),
  /** `confirmStatewide` must be true when a statewide programme is launched. */
  approve: (id: string, by: string, notes: string, confirmStatewide = false) => simulate(() => {
    const p = find(id);
    if (p.status !== "awaiting-approval") throw new ServiceError("This programme is not awaiting approval.", "validation");
    if (notes.trim().length < 5) throw new ServiceError("Add approver notes (5+ characters) so the decision is explainable.", "validation");
    if (p.statewide && !confirmStatewide) throw new ServiceError("Statewide launch needs explicit confirmation. Tick the confirmation box.", "permission");
    p.status = "active"; p.approvedBy = by; p.approverNotes = notes; p.delivery.baselineAvg = 55; log(p, `Approved by ${by}${p.statewide ? " and launched statewide" : ""}`);
    recordAudit({ actor: by, role: "Approver", action: p.statewide ? "Approved and launched statewide programme" : "Approved programme", entity: p.name, entityType: "programme", detail: notes });
    notificationService.push({ role: "institution", category: "governance", title: `New state programme: ${p.name}`, body: "Your institution is in scope. Baseline assessments will appear for students at next login.", href: "/institution/overview" });
    return p;
  }),
  reject: (id: string, by: string, reason: string) => simulate(() => {
    const p = find(id);
    if (p.status !== "awaiting-approval") throw new ServiceError("This programme is not awaiting approval.", "validation");
    if (reason.trim().length < 5) throw new ServiceError("A reason is required to reject.", "validation");
    p.status = "rejected"; p.approverNotes = reason; p.rejectionReason = reason; log(p, `Rejected by ${by}: ${reason}`);
    recordAudit({ actor: by, role: "Approver", action: "Rejected programme", entity: p.name, entityType: "programme", detail: reason, outcome: "rejected" });
    return p;
  }),
  pause: (id: string, reason: string) => simulate(() => {
    const p = find(id); if (p.status !== "active") throw new ServiceError("Only active programmes can be paused.", "validation");
    p.status = "paused"; log(p, `Paused: ${reason || "no reason given"}`); recordAudit({ action: "Paused programme", entity: p.name, entityType: "programme", detail: reason }); return p;
  }),
  resume: (id: string) => simulate(() => {
    const p = find(id); if (p.status !== "paused") throw new ServiceError("Only paused programmes can resume.", "validation");
    p.status = "active"; log(p, "Resumed"); recordAudit({ action: "Resumed programme", entity: p.name, entityType: "programme", detail: "" }); return p;
  }),
  complete: (id: string) => simulate(() => {
    const p = find(id); if (!["active", "paused"].includes(p.status)) throw new ServiceError("Only active or paused programmes can be completed.", "validation");
    p.status = "completed"; log(p, "Marked complete; outcomes archived against the original baseline"); recordAudit({ action: "Completed programme", entity: p.name, entityType: "programme", detail: "" }); return p;
  }),
};
