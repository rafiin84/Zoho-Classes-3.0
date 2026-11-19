import type { GradingItem, GradingFilters, ReviewPolicy, AuditEntry, RubricCriterion } from "@/types/grading";
import { GRADING_SEED, REVIEW_POLICY_SEED } from "../mock-data/grading";
import { simulate, ServiceError } from "./latency";
import { assignmentService } from "./assignmentService";
import { notificationService } from "./notificationService";
import { track } from "../analytics";
import { uid } from "../utils";

const items: GradingItem[] = structuredClone(GRADING_SEED);
let policy: ReviewPolicy = structuredClone(REVIEW_POLICY_SEED);

const find = (id: string) => { const i = items.find((x) => x.id === id); if (!i) throw new ServiceError("Submission not found.", "validation"); return i; };
const log = (i: GradingItem, kind: AuditEntry["kind"], actor: string, text: string, marks?: number) => { i.audit.push({ id: uid("au"), at: new Date().toISOString(), actor, kind, text, marks }); };
const sum = (c?: RubricCriterion[]) => (c ?? []).reduce((a, x) => a + x.score, 0);
/** Marks the AI/auto-score proposes for this item. Undefined while a handwritten submission's content is unreviewed. */
export const baseMarks = (i: GradingItem) => i.format === "mcq" ? i.autoMarks : i.suggestedMarks;
export const needsReview = (i: GradingItem, p: ReviewPolicy = policy) =>
  i.status === "ai-drafted" && (i.confidence < p.confidenceThreshold || i.flags.length > 0 || (i.format === "handwritten" && !i.evidence.contentReviewed));
const bulkBlocker = (i: GradingItem, p: ReviewPolicy): string | null => {
  if (i.status !== "ai-drafted") return "Already reviewed";
  if (i.confidence < p.confidenceThreshold) return `Confidence ${Math.round(i.confidence * 100)}% below policy ${Math.round(p.confidenceThreshold * 100)}%`;
  if (i.flags.length) return "Has review flags";
  if (i.format === "handwritten" && !i.evidence.contentReviewed) return "Handwriting not yet reviewed";
  if (i.format === "audio-video" || i.format === "project") return "Subjective format needs individual review";
  if (baseMarks(i) === undefined) return "No suggested marks";
  return null;
};
const validateMarks = (i: GradingItem, marks: number) => { if (!Number.isFinite(marks) || marks < 0 || marks > i.maxMarks) throw new ServiceError(`Marks must be between 0 and ${i.maxMarks}.`, "validation"); };
const applyEdit = (i: GradingItem, feedback: string, criteria?: RubricCriterion[]) => { i.finalFeedback = feedback; if (criteria && i.evidence.criteria) i.evidence.criteria = criteria; };

export interface ReviewInput { marks: number; feedback: string; criteria?: RubricCriterion[]; actor: string }
export const gradingService = {
  /** Teacher scope: pass teacherId. Institution: omit. */
  list: (f: GradingFilters = {}) => simulate(() => items.filter((i) => (!f.teacherId || i.teacherId === f.teacherId) && (!f.assessmentId || i.assessmentId === f.assessmentId) && (!f.classId || i.classId === f.classId)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))),
  get: (id: string) => simulate(() => find(id)),
  policy: () => simulate(() => policy),
  setPolicy: (p: Partial<Pick<ReviewPolicy, "confidenceThreshold" | "bulkApprovalEnabled" | "moderationSamplePct">>, actor: string) => simulate(() => {
    if (p.confidenceThreshold !== undefined && (p.confidenceThreshold < 0.5 || p.confidenceThreshold > 0.99)) throw new ServiceError("Threshold must be between 50% and 99%.", "validation");
    policy = { ...policy, ...p, updatedBy: actor }; return policy;
  }),
  bulkEligibility: (ids: string[]) => simulate(() => ids.map((id) => ({ id, blocker: bulkBlocker(find(id), policy) }))),
  /** Teacher corrects the extracted handwriting; marks are only suggested after this review. */
  confirmTranscription: (id: string, text: string, actor: string) => simulate(() => {
    const i = find(id); if (i.format !== "handwritten") throw new ServiceError("Only handwritten items have a transcription.", "validation");
    if (!text.trim()) throw new ServiceError("Transcription cannot be empty.", "validation");
    const changed = text.trim() !== (i.evidence.originalTranscription ?? "").trim();
    i.evidence.transcription = text; i.evidence.contentReviewed = true;
    if (changed && i.evidence.criteria) { const c = i.evidence.criteria[0]; if (c.score < c.max) { c.score += 1; c.comment = "Re-scored after the teacher corrected the extracted text."; } }
    i.suggestedMarks = sum(i.evidence.criteria); i.confidence = Math.min(0.92, i.confidence + 0.2);
    i.flags = i.flags.filter((f) => !/extraction|OCR/i.test(f));
    log(i, "teacher-edit", actor, changed ? "Corrected the extracted handwriting; marks suggested after content review." : "Confirmed the extracted handwriting as accurate; marks suggested after content review.", i.suggestedMarks);
    return i;
  }),
  reEvaluate: (id: string, actor: string) => simulate(() => {
    const i = find(id); if (i.status === "released") throw new ServiceError("Released marks cannot be re-evaluated; request a correction instead.", "validation");
    if (i.format === "handwritten" && !i.evidence.contentReviewed) throw new ServiceError("Review the extracted content first.", "validation");
    i.reEvalCount++; i.status = "ai-drafted"; i.rejectReason = undefined;
    if (i.format !== "mcq") { i.suggestedMarks = sum(i.evidence.criteria) || i.suggestedMarks; i.confidence = Math.min(0.95, i.confidence + 0.04); }
    log(i, "re-evaluate", actor, `Re-evaluated against the rubric (run ${i.reEvalCount}). Suggestion refreshed; teacher review still required.`, baseMarks(i));
    return i;
  }, { ms: 700 }),
  approve: (id: string, r: ReviewInput) => simulate(() => {
    const i = find(id); validateMarks(i, r.marks);
    if (i.status === "released") throw new ServiceError("Already released.", "validation");
    if (i.format === "handwritten" && !i.evidence.contentReviewed) throw new ServiceError("Review and confirm the extracted handwriting before approving.", "validation");
    const base = baseMarks(i);
    if (base !== undefined && r.marks !== base) throw new ServiceError("Marks differ from the suggestion. Use Override and record a reason.", "validation");
    i.finalMarks = r.marks; i.status = "approved"; applyEdit(i, r.feedback, r.criteria);
    log(i, "approve", r.actor, `Approved ${r.marks}/${i.maxMarks}${base === undefined ? "" : " (as suggested)"}. Not yet released to the student.`, r.marks);
    track("ai_grading_approved", { id, format: i.format }); track("ai_grading_reviewed", { id, outcome: "approved" });
    return i;
  }),
  override: (id: string, r: ReviewInput & { reason: string }) => simulate(() => {
    const i = find(id); validateMarks(i, r.marks);
    if (r.reason.trim().length < 10) throw new ServiceError("Give a reason of at least 10 characters.", "validation");
    if (i.status === "released") throw new ServiceError("Already released.", "validation");
    if (i.format === "handwritten" && !i.evidence.contentReviewed) throw new ServiceError("Review and confirm the extracted handwriting first.", "validation");
    const from = baseMarks(i);
    i.finalMarks = r.marks; i.status = "overridden"; i.overrideReason = r.reason.trim(); applyEdit(i, r.feedback, r.criteria);
    log(i, "override", r.actor, `Override ${from ?? "no suggestion"} → ${r.marks}. Reason: ${r.reason.trim()}`, r.marks);
    track("ai_grading_reviewed", { id, outcome: "overridden" });
    return i;
  }),
  reject: (id: string, reason: string, actor: string) => simulate(() => {
    const i = find(id); if (reason.trim().length < 5) throw new ServiceError("Give a short reason for rejecting the AI draft.", "validation");
    if (i.status === "released") throw new ServiceError("Already released.", "validation");
    i.status = "rejected"; i.rejectReason = reason.trim(); i.finalMarks = undefined;
    log(i, "reject", actor, `AI draft rejected: ${reason.trim()}. No marks recorded; grade manually or re-evaluate.`);
    track("ai_grading_reviewed", { id, outcome: "rejected" });
    return i;
  }),
  /** Bulk approval of eligible items per the review policy. Never releases. */
  bulkApprove: (ids: string[], actor: string) => simulate(() => {
    if (!policy.bulkApprovalEnabled) throw new ServiceError("Bulk approval is switched off by the review policy.", "permission");
    const approved: string[] = [], skipped: { id: string; reason: string }[] = [];
    ids.forEach((id) => { const i = find(id); const b = bulkBlocker(i, policy); if (b) { skipped.push({ id, reason: b }); return; } const m = baseMarks(i)!; i.finalMarks = m; i.status = "approved"; i.finalFeedback = i.suggestedFeedback; log(i, "bulk-approve", actor, `Bulk-approved at ${m}/${i.maxMarks} under policy (confidence ≥ ${Math.round(policy.confidenceThreshold * 100)}%, no flags). Not released.`, m); approved.push(id); });
    if (approved.length) { track("ai_grading_approved", { count: approved.length, bulk: true }); track("ai_grading_reviewed", { count: approved.length, outcome: "bulk-approved" }); }
    return { approved, skipped };
  }, { ms: 500 }),
  /** Final step: marks + feedback reach the student. Only approved/overridden items can be released. */
  release: async (ids: string[], actor: string) => {
    const eligible = ids.map((id) => find(id)).filter((i) => i.status === "approved" || i.status === "overridden");
    // assignment-linked items: push approved marks to the shared assignment service (this is what the Student Assignment Centre reads)
    for (const i of eligible) if (i.assignmentSubmissionId) await assignmentService.grade(i.assignmentSubmissionId, i.finalMarks!, i.finalFeedback ?? i.suggestedFeedback, true);
    return simulate(() => {
      const out: string[] = [], skipped: { id: string; reason: string }[] = [];
      for (const id of ids) {
        const i = find(id);
        if (i.status !== "approved" && i.status !== "overridden") { skipped.push({ id, reason: "Not approved yet" }); continue; }
        const marks = i.finalMarks!, fb = i.finalFeedback ?? i.suggestedFeedback;
        i.status = "released"; i.releasedAt = new Date().toISOString(); i.finalFeedback = fb;
        log(i, "release", actor, `Marks (${marks}/${i.maxMarks}) and feedback released to ${i.studentName}.`, marks);
        notificationService.push({ role: "student", recipientId: i.studentId, category: "academic", title: "Marks and feedback released", body: `${i.assessmentTitle}: ${marks}/${i.maxMarks}`, href: "/student/assignments" });
        out.push(id);
      }
      return { released: out, skipped };
    }, { ms: 300 });
  },
  moderate: (id: string, note: string, actor: string) => simulate(() => { const i = find(id); if (note.trim().length < 5) throw new ServiceError("Add a moderation note.", "validation"); i.moderated = true; i.moderationNote = note.trim(); log(i, "moderation", actor, `Moderation note: ${note.trim()}`); return i; }),
  /** Student-safe view: ONLY released marks and feedback, no AI data. */
  releasedFor: (studentId: string) => simulate(() => items.filter((i) => i.studentId === studentId && i.status === "released").map((i) => ({ id: i.id, assessmentTitle: i.assessmentTitle, marks: i.finalMarks!, maxMarks: i.maxMarks, feedback: i.finalFeedback ?? "", releasedAt: i.releasedAt! }))),
  stats: () => simulate(() => {
    const byFormat = new Map<string, { n: number; conf: number; overrides: number; flagged: number }>();
    items.forEach((i) => { const r = byFormat.get(i.format) ?? { n: 0, conf: 0, overrides: 0, flagged: 0 }; r.n++; r.conf += i.confidence; if (i.status === "overridden") r.overrides++; if (i.flags.length) r.flagged++; byFormat.set(i.format, r); });
    const decided = items.filter((i) => i.finalMarks !== undefined && baseMarks(i) !== undefined);
    return {
      total: items.length, awaiting: items.filter((i) => i.status === "ai-drafted").length, flagged: items.filter((i) => i.flags.length && i.status === "ai-drafted").length, released: items.filter((i) => i.status === "released").length,
      overrideRate: items.filter((i) => i.overrideReason).length / Math.max(1, items.filter((i) => ["approved", "overridden", "released"].includes(i.status)).length),
      meanAbsDelta: decided.length ? decided.reduce((a, i) => a + Math.abs(i.finalMarks! - baseMarks(i)!), 0) / decided.length : 0,
      lowConfidence: items.filter((i) => i.confidence < policy.confidenceThreshold).length, moderated: items.filter((i) => i.moderated).length,
      byFormat: [...byFormat.entries()].map(([format, r]) => ({ format, n: r.n, avgConfidence: r.conf / r.n, overrides: r.overrides, flagged: r.flagged })),
    };
  }),
};
