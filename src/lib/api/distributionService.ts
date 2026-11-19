import type { DistributionPreview, DistributionRecord, DistributionSelection, ResourceRecord, ResourceType } from "@/types/government";
import { DISTRIBUTION_SEED, RESOURCES, DISTRICTS, ILLUSTRATIVE } from "../mock-data/government";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { recordAudit } from "./govAudit";

const resources: ResourceRecord[] = structuredClone(RESOURCES);
const history: DistributionRecord[] = structuredClone(DISTRIBUTION_SEED);

export interface ResourceFilter { q?: string; type?: ResourceType | ""; gradeId?: string; subjectId?: string; language?: string; approval?: string; mapping?: "unmapped" | "" }

export const distributionService = {
  resources: (f: ResourceFilter = {}) => simulate(() => resources.filter((r) =>
    (!f.q || `${r.title} ${r.chapter}`.toLowerCase().includes(f.q.toLowerCase())) && (!f.type || r.type === f.type) && (!f.gradeId || r.gradeId === f.gradeId) &&
    (!f.subjectId || r.subjectId === f.subjectId) && (!f.language || r.language === f.language) && (!f.approval || r.approval === f.approval) && (!f.mapping || r.objectiveId === null)), { failKey: "distribution" }),
  inventory: () => simulate(() => {
    const by = (k: (r: ResourceRecord) => string) => Object.entries(resources.reduce<Record<string, number>>((a, r) => { a[k(r)] = (a[k(r)] ?? 0) + 1; return a; }, {})).map(([label, value]) => ({ label, value }));
    return {
      illustrative: ILLUSTRATIVE, sampleSize: resources.length, byType: by((r) => r.type), byLanguage: by((r) => r.language), byGrade: by((r) => r.gradeId), bySubject: by((r) => r.subjectId),
      unmapped: resources.filter((r) => r.objectiveId === null).length, pending: resources.filter((r) => r.approval === "pending").length, replaced: resources.filter((r) => r.replacedBy).length,
      views: resources.reduce((a, r) => a + r.views, 0), completions: resources.reduce((a, r) => a + r.completions, 0),
    };
  }),
  preview: (sel: DistributionSelection) => simulate((): DistributionPreview => {
    const chosen = resources.filter((r) => sel.resourceIds.includes(r.id));
    const ds = DISTRICTS.filter((d) => sel.districtIds.includes(d.id));
    const warnings: string[] = [], blocked: string[] = [];
    const un = chosen.filter((r) => r.objectiveId === null).length; if (un) warnings.push(`${un} selected resource${un > 1 ? "s" : ""} missing objective mapping. Mapping is needed to track outcomes.`);
    const rep = chosen.filter((r) => r.replacedBy).length; if (rep) warnings.push(`${rep} selected resource${rep > 1 ? "s have" : " has"} a newer version available.`);
    chosen.filter((r) => r.approval !== "approved").forEach((r) => blocked.push(`"${r.title}" is ${r.approval} and cannot be distributed.`));
    const mismatch = sel.gradeIds.length ? chosen.filter((r) => !sel.gradeIds.includes(r.gradeId)).length : 0; if (mismatch) warnings.push(`${mismatch} resource${mismatch > 1 ? "s do" : " does"} not match the selected grades.`);
    const share = sel.gradeIds.length ? Math.min(1, sel.gradeIds.length / 6) : 1;
    return { resources: chosen.length, districts: ds.length, institutions: ds.reduce((a, d) => a + d.institutions, 0), students: Math.round(ds.reduce((a, d) => a + d.students, 0) * share), warnings, blocked, needsApproval: ds.length >= 6 };
  }),
  confirm: (sel: DistributionSelection) => simulate(() => {
    if (!sel.resourceIds.length) throw new ServiceError("Select at least one resource.", "validation");
    if (!sel.districtIds.length) throw new ServiceError("Select at least one district.", "validation");
    const chosen = resources.filter((r) => sel.resourceIds.includes(r.id));
    if (chosen.some((r) => r.approval !== "approved")) throw new ServiceError("Unapproved resources cannot be distributed. Remove them first.", "validation");
    const ds = DISTRICTS.filter((d) => sel.districtIds.includes(d.id));
    const share = sel.gradeIds.length ? Math.min(1, sel.gradeIds.length / 6) : 1;
    const needsApproval = ds.length >= 6;
    const rec: DistributionRecord = {
      id: uid("dist"), at: new Date().toISOString(), by: "State official (demo)", resources: chosen.length, resourceTitles: chosen.slice(0, 3).map((r) => r.title), districtIds: sel.districtIds,
      districtLabel: ds.length === DISTRICTS.length ? "All 12 districts" : ds.length > 3 ? `${ds.length} districts` : ds.map((d) => d.name).join(", "), gradeIds: sel.gradeIds, students: Math.round(ds.reduce((a, d) => a + d.students, 0) * share),
      status: needsApproval ? "awaiting-approval" : "scheduled", note: sel.note,
    };
    history.unshift(rec);
    recordAudit({ action: needsApproval ? "Created distribution (awaiting approval)" : "Scheduled distribution", entity: `${chosen.length} resources to ${rec.districtLabel}`, entityType: "distribution", detail: sel.note || "No note." });
    return rec;
  }),
  history: () => simulate(() => [...history].sort((a, b) => b.at.localeCompare(a.at)), { failKey: "distribution" }),
  awaiting: () => history.filter((d) => d.status === "awaiting-approval"),
  decide: (id: string, decision: "approved" | "rejected", by: string, reason?: string) => simulate(() => {
    const d = history.find((x) => x.id === id); if (!d) throw new ServiceError("Distribution not found.", "unavailable");
    if (d.status !== "awaiting-approval") throw new ServiceError("Already decided.", "validation");
    if (decision === "rejected" && !reason?.trim()) throw new ServiceError("A reason is required to reject.", "validation");
    d.status = decision === "approved" ? "scheduled" : "rejected"; d.decidedBy = by;
    recordAudit({ actor: by, role: "Approver", action: decision === "approved" ? "Approved distribution" : "Rejected distribution", entity: d.note || d.resourceTitles[0], entityType: "distribution", detail: reason ?? "", outcome: decision === "approved" ? "success" : "rejected" });
    return d;
  }),
};
