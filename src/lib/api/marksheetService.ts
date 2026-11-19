import type { Marksheet, MarksheetSubjectResult } from "@/types/academic";
import type { GradingScheme, ResultBatch, RevalRequest, MarkIssue, SubjectPatch } from "@/types/results";
import { MARKSHEETS_SEED } from "../mock-data/academic";
import { STUDENTS, SUBJECTS } from "../mock-data/core";
import { simulate, ServiceError } from "./latency";
import { notificationService } from "./notificationService";
import { uid } from "../utils";
import { inDays } from "../format";

/** Students/parents ONLY ever receive published, non-superseded marksheets. Staff methods are named explicitly. */
export const DEFAULT_SCHEME: GradingScheme = { id: "gs-default", name: "10-point grade scheme (demo)", passPercent: 35, internalMax: 20, externalMax: 80, rounding: "nearest", gpaScale: 10,
  boundaries: [{ grade: "A+", min: 90, points: 10 }, { grade: "A", min: 75, points: 9 }, { grade: "B+", min: 60, points: 8 }, { grade: "B", min: 50, points: 7 }, { grade: "C", min: 35, points: 6 }, { grade: "F", min: 0, points: 0 }], cgpaNote: "CGPA = credit-weighted mean of semester GPA. Credit weights are set per programme (demo uses equal credits)." };
const schemes: GradingScheme[] = [structuredClone(DEFAULT_SCHEME), { ...structuredClone(DEFAULT_SCHEME), id: "gs-percent", name: "Percentage bands, pass 40 (demo)", passPercent: 40, rounding: "none", internalMax: 30, externalMax: 70, gpaScale: 4, boundaries: [{ grade: "Distinction", min: 75, points: 4 }, { grade: "First class", min: 60, points: 3 }, { grade: "Second class", min: 50, points: 2 }, { grade: "Pass", min: 40, points: 1 }, { grade: "Fail", min: 0, points: 0 }] }];

const roundBy = (n: number, m: GradingScheme["rounding"]) => (m === "up" ? Math.ceil(n) : m === "down" ? Math.floor(n) : m === "nearest" ? Math.round(n) : Math.round(n * 10) / 10);
const COUNTED = ["pass", "fail"];
export function recompute(sheet: Marksheet, scheme: GradingScheme): Marksheet {
  let obt = 0, mx = 0, pts = 0, n = 0, anyWithheld = false, anyFail = false, anyIncomplete = false;
  sheet.subjects.forEach((s) => {
    s.maxMarks = scheme.internalMax + scheme.externalMax;
    if (["absent", "exempt", "withheld", "incomplete"].includes(s.status)) { s.total = 0; s.grade = s.status === "exempt" ? "EX" : "—"; if (s.status === "withheld") anyWithheld = true; if (s.status === "absent") anyFail = true; if (s.status === "incomplete") anyIncomplete = true; return; }
    s.total = roundBy(s.internal + s.external, scheme.rounding);
    const pct = (s.total / s.maxMarks) * 100;
    const b = scheme.boundaries.find((x) => pct >= x.min) ?? scheme.boundaries[scheme.boundaries.length - 1];
    s.status = pct >= scheme.passPercent ? "pass" : "fail"; s.grade = s.status === "fail" ? scheme.boundaries[scheme.boundaries.length - 1].grade : b.grade;
    if (s.status === "fail") anyFail = true;
    obt += s.total; mx += s.maxMarks; pts += s.status === "fail" ? 0 : b.points; n++;
  });
  sheet.totalObtained = obt; sheet.totalMax = mx; sheet.percentage = mx ? Math.round((obt / mx) * 1000) / 10 : 0; sheet.gpa = n ? Math.round((pts / n) * 100) / 100 : undefined;
  sheet.result = anyWithheld || anyIncomplete ? "Withheld" : anyFail ? "Fail" : "Pass";
  return sheet;
}

const sheets: Marksheet[] = structuredClone(MARKSHEETS_SEED).filter((m) => !(m.examId === "t2" && m.studentId === "stu-ananya")).map((m) => ({ ...m, termId: "term-1" }));
// Term 2 draft marks for Grade 8 · B (staff-only until published)
const T2: Record<string, [number, number][]> = { "stu-ananya": [[18, 66], [19, 71], [17, 63], [16, 60], [19, 69]], "stu-kabir": [[12, 38], [15, 55], [14, 50], [13, 49], [16, 58]], "stu-meera": [[15, 52], [16, 58], [17, 61], [14, 49], [17, 63]], "stu-zoya": [[17, 60], [18, 66], [16, 57], [15, 55], [19, 70]], "stu-dev": [[19, 72], [16, 60], [15, 52], [14, 50], [18, 65]], "stu-isha": [[16, 55], [17, 61], [18, 69], [17, 62], [15, 53]] };
const subj5 = ["sub-math", "sub-sci", "sub-eng", "sub-soc", "sub-cs"];
Object.entries(T2).forEach(([sid, rows]) => {
  const st = STUDENTS.find((s) => s.id === sid)!;
  const subjects: MarksheetSubjectResult[] = rows.map(([i, e], k) => ({ subjectId: subj5[k], subjectName: SUBJECTS.find((x) => x.id === subj5[k])!.name, maxMarks: 100, internal: i, external: e, total: 0, grade: "", status: "pass" }));
  if (sid === "stu-dev") { subjects[3].status = "absent"; subjects[3].remarks = "Medical absence, re-exam pending"; }
  if (sid === "stu-isha") { subjects[4].status = "incomplete"; subjects[4].internal = 0; subjects[4].external = 0; subjects[4].remarks = "External marks not received from evaluator"; }
  sheets.push(recompute({ id: `ms-${sid}-t2`, studentId: sid, institutionId: "inst-greenfield", examId: "t2", examLabel: "Term 2 Examination", academicYearId: "ay-2026-27", classLabel: st.className === "8B" ? "Grade 8 · B" : st.className, subjects, totalObtained: 0, totalMax: 0, percentage: 0, result: "Pass", publicationStatus: "draft", reference: `DEMO-MS-${sid.slice(4, 8).toUpperCase()}-T2`, version: 1, revaluation: { status: "none" }, termId: "term-2" }, schemes[0]));
});
const batches: ResultBatch[] = [
  { id: "rb-t1", examId: "t1", examLabel: "Term 1 Examination", academicYearId: "ay-2026-27", termId: "term-1", classLabel: "Grade 8 · B", schemeId: "gs-default", status: "published", history: [{ at: inDays(-40), by: "Exam office", text: "Published" }] },
  { id: "rb-t2", examId: "t2", examLabel: "Term 2 Examination", academicYearId: "ay-2026-27", termId: "term-2", classLabel: "Grade 8 · B", schemeId: "gs-default", status: "draft", history: [{ at: inDays(-2), by: "Mrs. Priya Nair", text: "Marks entered for 6 students" }] },
];
const revals: RevalRequest[] = [
  { id: "rv-1", sheetId: "ms-stu-kabir-t1", studentId: "stu-kabir", subjectId: "sub-math", subjectName: "Mathematics", reason: "Question 7(b) method marks may have been missed.", status: "requested", at: inDays(-5), originalTotal: 47 },
  { id: "rv-2", sheetId: "ms-stu-ananya-t1", studentId: "stu-ananya", subjectId: "sub-soc", subjectName: "Social Science", reason: "Totalling check requested for the map-work section.", status: "in-review", at: inDays(-9), originalTotal: 76 },
];
const schemeOf = (b: ResultBatch) => schemes.find((s) => s.id === b.schemeId)!;
const batchOf = (examId: string) => batches.find((b) => b.examId === examId)!;
const live = () => sheets.filter((m) => m.publicationStatus === "published" && !m.supersededBy);
const sheetsOf = (b: ResultBatch) => sheets.filter((m) => m.examId === b.examId && !m.supersededBy && m.classLabel === b.classLabel);
const find = (id: string) => { const s = sheets.find((x) => x.id === id); if (!s) throw new ServiceError("Marksheet not found.", "validation"); return s; };
function notify(m: Marksheet, title: string, body: string) {
  notificationService.push({ role: "student", recipientId: m.studentId, category: "academic", title, body, href: "/student/results" });
  notificationService.push({ role: "parent", childId: m.studentId, category: "academic", title, body, href: "/parent/results" });
}
export function validateSheets(list: Marksheet[], scheme: GradingScheme): MarkIssue[] {
  const out: MarkIssue[] = [];
  list.forEach((m) => m.subjects.forEach((s) => {
    if (s.status === "incomplete") out.push({ sheetId: m.id, studentId: m.studentId, subjectId: s.subjectId, kind: "missing", message: `${s.subjectName}: marks missing` });
    if (s.internal < 0 || s.internal > scheme.internalMax) out.push({ sheetId: m.id, studentId: m.studentId, subjectId: s.subjectId, kind: "range", message: `${s.subjectName}: internal must be 0–${scheme.internalMax}` });
    if (s.external < 0 || s.external > scheme.externalMax) out.push({ sheetId: m.id, studentId: m.studentId, subjectId: s.subjectId, kind: "range", message: `${s.subjectName}: external must be 0–${scheme.externalMax}` });
  }));
  return out;
}

export const marksheetService = {
  // ---- student / parent facing (published only)
  forStudent: (studentId: string) => simulate(() => live().filter((m) => m.studentId === studentId)),
  forParent: (childId: string) => simulate(() => live().filter((m) => m.studentId === childId)),
  /** Published-only on purpose. Staff use `allStaff`. */
  all: () => simulate(() => live()),
  transcript: (studentId: string) => simulate(() => live().filter((m) => m.studentId === studentId).sort((a, b) => a.examId.localeCompare(b.examId))),
  requestRevaluation: (sheetId: string, subjectId: string, reason: string) => simulate(() => {
    const m = find(sheetId); if (m.publicationStatus !== "published") throw new ServiceError("Only published results can be rechecked.", "permission");
    if (reason.trim().length < 10) throw new ServiceError("Give a reason of at least 10 characters.", "validation");
    const s = m.subjects.find((x) => x.subjectId === subjectId)!;
    if (revals.some((r) => r.sheetId === sheetId && r.subjectId === subjectId && ["requested", "in-review"].includes(r.status))) throw new ServiceError("A request for this subject is already open.", "validation");
    const r: RevalRequest = { id: uid("rv"), sheetId, studentId: m.studentId, subjectId, subjectName: s.subjectName, reason, status: "requested", at: new Date().toISOString(), originalTotal: s.total }; revals.unshift(r); m.revaluation = { status: "requested", subjectId }; return r;
  }),
  // ---- staff / exam office
  allStaff: () => simulate(() => sheets.filter((m) => !m.supersededBy)),
  schemes: () => simulate(() => schemes),
  saveScheme: (s: GradingScheme) => simulate(() => {
    const bs = [...s.boundaries].sort((a, b) => b.min - a.min);
    if (!s.name.trim()) throw new ServiceError("Name the scheme.", "validation");
    if (s.passPercent < 0 || s.passPercent > 100) throw new ServiceError("Pass percentage must be 0–100.", "validation");
    if (s.internalMax < 0 || s.externalMax < 0 || s.internalMax + s.externalMax <= 0) throw new ServiceError("Component maximums must be positive.", "validation");
    if (new Set(bs.map((b) => b.min)).size !== bs.length) throw new ServiceError("Two grades share the same minimum.", "validation");
    if (bs[bs.length - 1].min !== 0) throw new ServiceError("The lowest grade must start at 0%.", "validation");
    const n = { ...s, boundaries: bs }; const i = schemes.findIndex((x) => x.id === s.id); if (i >= 0) schemes[i] = n; else schemes.push({ ...n, id: uid("gs") });
    batches.filter((b) => b.schemeId === s.id && b.status !== "published").forEach((b) => sheetsOf(b).forEach((m) => recompute(m, n)));
    return n;
  }),
  batches: () => simulate(() => batches),
  batchSheets: (batchId: string) => simulate(() => sheetsOf(batches.find((b) => b.id === batchId)!)),
  issues: (batchId: string) => simulate(() => { const b = batches.find((x) => x.id === batchId)!; return validateSheets(sheetsOf(b), schemeOf(b)); }),
  setBatchScheme: (batchId: string, schemeId: string) => simulate(() => { const b = batches.find((x) => x.id === batchId)!; if (b.status === "published") throw new ServiceError("Published results cannot change scheme; issue a correction.", "validation"); b.schemeId = schemeId; sheetsOf(b).forEach((m) => recompute(m, schemeOf(b))); return b; }),
  saveSubject: (sheetId: string, subjectId: string, patch: SubjectPatch, by = "Exam office") => simulate(() => {
    const m = find(sheetId); const b = batchOf(m.examId);
    if (m.publicationStatus === "published") throw new ServiceError("Published marks are read-only. Use a correction.", "permission");
    if (b.status === "in-review" || b.status === "approved") throw new ServiceError("Batch is locked for review. Ask the reviewer to return it.", "permission");
    const s = m.subjects.find((x) => x.subjectId === subjectId)!; const sc = schemeOf(b);
    if (patch.internal !== undefined) { if (Number.isNaN(patch.internal) || patch.internal < 0 || patch.internal > sc.internalMax) throw new ServiceError(`Internal marks must be 0–${sc.internalMax}.`, "validation"); s.internal = patch.internal; }
    if (patch.external !== undefined) { if (Number.isNaN(patch.external) || patch.external < 0 || patch.external > sc.externalMax) throw new ServiceError(`External marks must be 0–${sc.externalMax}.`, "validation"); s.external = patch.external; }
    if (patch.status) s.status = patch.status; else if (s.status === "incomplete" && (patch.internal !== undefined || patch.external !== undefined)) s.status = "pass";
    b.history.push({ at: new Date().toISOString(), by, text: `Edited ${s.subjectName} for ${m.studentId}` });
    return recompute(m, sc);
  }, { ms: 80 }),
  importMock: (batchId: string) => simulate(() => { const b = batches.find((x) => x.id === batchId)!; const sc = schemeOf(b); let n = 0; sheetsOf(b).forEach((m) => { m.subjects.forEach((s) => { if (s.status === "incomplete") { s.internal = Math.round(sc.internalMax * 0.7); s.external = Math.round(sc.externalMax * 0.68); s.status = "pass"; s.remarks = "Imported from evaluator sheet (mock)"; n++; } }); recompute(m, sc); }); b.history.push({ at: new Date().toISOString(), by: "Exam office", text: `Mock import filled ${n} missing entries` }); return n; }, { ms: 600 }),
  submitForApproval: (batchId: string, by = "Exam office") => simulate(() => {
    const b = batches.find((x) => x.id === batchId)!; if (b.status !== "draft") throw new ServiceError("Only draft batches can be submitted.", "validation");
    const iss = validateSheets(sheetsOf(b), schemeOf(b)); if (iss.length) throw new ServiceError(`Resolve ${iss.length} issue(s) first (missing or out-of-range marks).`, "validation");
    b.status = "in-review"; sheetsOf(b).forEach((m) => (m.publicationStatus = "in-review")); b.history.push({ at: new Date().toISOString(), by, text: "Submitted for approval" }); return b;
  }),
  review: (batchId: string, decision: "approve" | "return", note: string, by = "Exam controller") => simulate(() => {
    const b = batches.find((x) => x.id === batchId)!; if (b.status !== "in-review") throw new ServiceError("Batch is not awaiting review.", "validation");
    if (decision === "return" && note.trim().length < 5) throw new ServiceError("Add a note explaining what to fix.", "validation");
    b.status = decision === "approve" ? "approved" : "draft"; b.reviewNote = note; sheetsOf(b).forEach((m) => (m.publicationStatus = b.status)); b.history.push({ at: new Date().toISOString(), by, text: decision === "approve" ? "Approved for publication" : `Returned: ${note}` }); return b;
  }),
  publish: (batchId: string, by = "Exam controller") => simulate(() => {
    const b = batches.find((x) => x.id === batchId)!; if (b.status !== "approved") throw new ServiceError("Approve the batch before publishing.", "validation");
    const now = new Date().toISOString(); b.status = "published";
    sheetsOf(b).forEach((m) => { if (m.result === "Withheld") { m.publicationStatus = "withheld"; return; } m.publicationStatus = "published"; m.publishedAt = now; notify(m, `${b.examLabel} results published`, `Your ${b.examLabel} marksheet is now available.`); });
    b.history.push({ at: now, by, text: "Published; students and parents notified" }); return b;
  }),
  withhold: (sheetId: string, reason: string) => simulate(() => { const m = find(sheetId); if (reason.trim().length < 5) throw new ServiceError("A reason is required to withhold a result.", "validation"); m.publicationStatus = "withheld"; m.subjects.forEach((s) => { if (s.status === "pass" || s.status === "fail") s.status = "withheld"; }); m.correctionNote = reason; return m; }),
  /** Corrections to published results create a new version in review; the old version stays visible until the correction is published. */
  correct: (sheetId: string, subjectId: string, internal: number, external: number, note: string, by = "Exam office") => simulate(() => {
    const old = find(sheetId); if (old.publicationStatus !== "published") throw new ServiceError("Only published results need corrections; edit drafts directly.", "validation");
    if (note.trim().length < 5) throw new ServiceError("Describe the correction.", "validation");
    const b = batchOf(old.examId), sc = schemeOf(b);
    if (internal < 0 || internal > sc.internalMax || external < 0 || external > sc.externalMax) throw new ServiceError(`Marks out of range (internal 0–${sc.internalMax}, external 0–${sc.externalMax}).`, "validation");
    const nv = structuredClone(old) as Marksheet; nv.id = `${old.id.replace(/-v\d+$/, "")}-v${old.version + 1}`; nv.version = old.version + 1; nv.publicationStatus = "in-review"; nv.correctionNote = `Correction v${nv.version}: ${note}`; nv.publishedAt = undefined; nv.supersededBy = undefined; nv.revaluation = { status: "none" };
    const s = nv.subjects.find((x) => x.subjectId === subjectId)!; s.internal = internal; s.external = external; s.status = "pass"; recompute(nv, sc);
    sheets.push(nv); b.history.push({ at: new Date().toISOString(), by, text: `Correction v${nv.version} drafted for ${old.studentId}` }); return nv;
  }),
  publishCorrection: (newSheetId: string) => simulate(() => {
    const nv = find(newSheetId); if (nv.publicationStatus !== "in-review" || nv.version < 2) throw new ServiceError("Not a pending correction.", "validation");
    const old = sheets.find((x) => x.studentId === nv.studentId && x.examId === nv.examId && x.version === nv.version - 1)!; old.supersededBy = nv.id; nv.publicationStatus = "published"; nv.publishedAt = new Date().toISOString();
    notify(nv, "Corrected marksheet published", `${nv.examLabel}: version ${nv.version} replaces the earlier marksheet.`); return nv;
  }),
  pendingCorrections: () => simulate(() => sheets.filter((m) => m.version > 1 && m.publicationStatus === "in-review" && !m.supersededBy)),
  revaluations: () => simulate(() => revals),
  decideReval: (id: string, decision: "start" | "accept" | "reject", note: string, newTotals?: { internal: number; external: number }) => simulate(() => {
    const r = revals.find((x) => x.id === id)!; const m = find(r.sheetId);
    if (decision === "start") { r.status = "in-review"; m.revaluation = { status: "in-review", subjectId: r.subjectId }; return r; }
    if (note.trim().length < 5) throw new ServiceError("A decision note is required.", "validation");
    r.note = note;
    if (decision === "reject") { r.status = "rejected"; m.revaluation = { status: "completed", subjectId: r.subjectId }; return r; }
    if (!newTotals) throw new ServiceError("Enter the revised marks to accept.", "validation");
    r.status = "accepted"; m.revaluation = { status: "completed", subjectId: r.subjectId }; r.newTotal = newTotals.internal + newTotals.external; return r;
  }),
};
