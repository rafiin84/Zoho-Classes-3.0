import type { ProgrammeOutcome, CourseOutcome, CourseMapping, MappingScale, AttainmentConfig, AttainmentRun, AssessmentCategory, COAttainment, POAttainment, ObeAssessment } from "@/types/obe";
import { OBE_POS, OBE_COS, OBE_COURSES, OBE_MAPPINGS_SEED, OBE_ASSESSMENTS, DEFAULT_SCALE, DEFAULT_ATTAINMENT } from "../mock-data/obe";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";

export const CALC_VERSION = "obe-calc 1.2 (demo)";
const pos: ProgrammeOutcome[] = structuredClone(OBE_POS);
const cos: CourseOutcome[] = structuredClone(OBE_COS);
const maps: CourseMapping[] = structuredClone(OBE_MAPPINGS_SEED);
const assessments: ObeAssessment[] = structuredClone(OBE_ASSESSMENTS);
let scale: MappingScale = structuredClone(DEFAULT_SCALE);
let config: AttainmentConfig = structuredClone(DEFAULT_ATTAINMENT);
const runs: AttainmentRun[] = [];

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rnd = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
/** Deterministic synthetic cohort scores (percent) for one CO within one assessment — fictional. */
export function cohortScores(courseId: string, coId: string, assessmentId: string, n = 60): number[] {
  const base = 52 + (hash(coId + assessmentId) % 28); const r = rnd(hash(assessmentId + coId));
  return Array.from({ length: n }, () => Math.max(8, Math.min(100, Math.round(base + (r() + r() + r() - 1.5) * 34))));
}
const levelFor = (v: number, t: { l3: number; l2: number; l1: number }) => (v >= t.l3 ? 3 : v >= t.l2 ? 2 : v >= t.l1 ? 1 : 0);

function computeCO(co: CourseOutcome, cfg: AttainmentConfig): COAttainment {
  const byCategory: COAttainment["byCategory"] = {}; const missing: AssessmentCategory[] = [];
  (["internal", "external", "assignment", "practical"] as AssessmentCategory[]).forEach((cat) => {
    const as = assessments.filter((a) => a.courseId === co.courseId && a.category === cat && a.items.some((i) => i.coId === co.id));
    const usable = as.filter((a) => a.scoresAvailable);
    if (!usable.length) { if (cfg.weights[cat] > 0) missing.push(cat); return; }
    const all = usable.flatMap((a) => cohortScores(co.courseId, co.id, a.id));
    const mean = all.reduce((x, y) => x + y, 0) / all.length, pct = (all.filter((v) => v >= cfg.targetScorePct).length / all.length) * 100;
    byCategory[cat] = { value: cfg.method === "threshold" ? levelFor(pct, cfg.levels) : levelFor(mean, cfg.meanLevels), pctAttained: Math.round(pct), mean: Math.round(mean) };
  });
  let wsum = 0, acc = 0;
  (Object.keys(byCategory) as AssessmentCategory[]).forEach((c) => { wsum += cfg.weights[c]; acc += cfg.weights[c] * byCategory[c]!.value; });
  return { coId: co.id, code: co.code, courseId: co.courseId, level: wsum ? Math.round((acc / wsum) * 100) / 100 : 0, byCategory, missing, target: cfg.targetLevel };
}
function computeAll(cfg: AttainmentConfig): Pick<AttainmentRun, "co" | "po" | "coverage"> {
  const co = cos.map((c) => computeCO(c, cfg));
  const po: POAttainment[] = pos.map((p) => {
    const contributors: POAttainment["contributors"] = [];
    maps.forEach((m) => m.cells.filter((c) => c.poId === p.id && c.value > 0).forEach((c) => { const a = co.find((x) => x.coId === c.coId)!; contributors.push({ coCode: a.code, weight: c.value, level: a.level }); }));
    const w = contributors.reduce((s, c) => s + c.weight, 0);
    return { poId: p.id, code: p.code, level: w ? Math.round((contributors.reduce((s, c) => s + c.weight * c.level, 0) / w) * 100) / 100 : 0, target: cfg.targetLevel, contributors };
  });
  const coverage = OBE_COURSES.map((c) => { const miss = co.filter((x) => x.courseId === c.id && x.missing.length).map((x) => `${x.code}: no ${x.missing.join("/")} evidence`); return { courseId: c.id, code: c.code, complete: !miss.length, missing: miss }; });
  return { co, po, coverage };
}

export const obeService = {
  outcomes: () => simulate(() => ({ pos, cos, courses: OBE_COURSES, assessments, scale })),
  savePO: (p: ProgrammeOutcome) => simulate(() => { const i = pos.findIndex((x) => x.id === p.id); if (i >= 0) pos[i] = p; else pos.push({ ...p, id: uid("po") }); return p; }),
  saveCO: (c: Omit<CourseOutcome, "id"> & { id?: string }) => simulate(() => {
    if (!c.text.trim() || c.text.length < 10) throw new ServiceError("Course outcome text needs at least 10 characters.", "validation");
    if (c.id) { const i = cos.findIndex((x) => x.id === c.id); cos[i] = { ...cos[i], ...c } as CourseOutcome; return cos[i]; }
    const n = { ...c, id: uid("co") } as CourseOutcome; cos.push(n); return n;
  }),
  mappings: () => simulate(() => maps),
  setScale: (s: MappingScale) => simulate(() => { if (s.max < 1 || s.max > 5) throw new ServiceError("Scale maximum must be between 1 and 5.", "validation"); scale = { ...s, labels: Array.from({ length: s.max + 1 }, (_, i) => s.labels[i] ?? `Level ${i}`) }; maps.forEach((m) => m.cells.forEach((c) => { if (c.value > s.max) c.value = s.max; })); return scale; }),
  /** Editing an approved mapping creates a new draft version. */
  setCell: (courseId: string, coId: string, poId: string, value: number, rationale: string, by: string) => simulate(() => {
    const m = maps.find((x) => x.courseId === courseId)!;
    if (value < 0 || value > scale.max) throw new ServiceError(`Value must be 0–${scale.max}.`, "validation");
    if (value > 0 && rationale.trim().length < 5) throw new ServiceError("Add a short rationale for a non-zero mapping.", "validation");
    if (m.status === "approved") { m.version++; m.status = "draft"; m.history.push({ version: m.version, at: new Date().toISOString(), by, note: `Edit ${poId.toUpperCase()} / ${coId}` }); }
    const cell = m.cells.find((c) => c.coId === coId && c.poId === poId); if (cell) { cell.value = value; cell.rationale = rationale; } else m.cells.push({ coId, poId, value, rationale });
    return m;
  }),
  setMappingStatus: (courseId: string, status: "draft" | "in-review" | "approved", by: string) => simulate(() => { const m = maps.find((x) => x.courseId === courseId)!; m.status = status; m.history.push({ version: m.version, at: new Date().toISOString(), by, note: `Status → ${status}` }); return m; }),
  config: () => simulate(() => config),
  saveConfig: (c: AttainmentConfig) => simulate(() => {
    const w = Object.values(c.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(w - 1) > 0.001) throw new ServiceError(`Weightages must add up to 100% (currently ${Math.round(w * 100)}%).`, "validation");
    config = c; return config;
  }),
  preview: (cfg: AttainmentConfig) => simulate(() => computeAll(cfg).coverage),
  calculate: (by: string, semester: string) => simulate(() => {
    const r = computeAll(config);
    const gaps = r.co.filter((c) => c.level < c.target && !c.missing.length).slice(0, 4);
    const run: AttainmentRun = { id: uid("run"), at: new Date().toISOString(), by, calcVersion: CALC_VERSION, academicYear: "2026–27", semester, config: structuredClone(config), status: "draft", ...r,
      actionPlan: gaps.map((g) => ({ id: uid("ap"), target: g.code, action: `Remedial tutorials and a re-assessment item for ${g.code} (level ${g.level} vs target ${g.target}).`, owner: OBE_COURSES.find((c) => c.id === g.courseId)!.facultyName, due: "Next semester week 4" })) };
    runs.unshift(run); return run;
  }, { ms: 700 }),
  runs: () => simulate(() => runs),
  setRunStatus: (id: string, status: AttainmentRun["status"]) => simulate(() => { const r = runs.find((x) => x.id === id)!; if (status === "published" && r.status !== "approved") throw new ServiceError("Approve the run before publishing.", "validation"); if (status === "approved" && r.coverage.some((c) => !c.complete) && r.status !== "in-review") throw new ServiceError("Submit for review first.", "validation"); r.status = status; return r; }),
  distribution: (coId: string) => simulate(() => { const co = cos.find((c) => c.id === coId)!; const all = assessments.filter((a) => a.courseId === co.courseId && a.scoresAvailable && a.items.some((i) => i.coId === coId)).flatMap((a) => cohortScores(co.courseId, coId, a.id)); const b = [0, 0, 0, 0]; all.forEach((v) => b[v < 40 ? 0 : v < 60 ? 1 : v < 80 ? 2 : 3]++); return b; }),
  mapAssessmentItem: (assessmentId: string, idx: number, coId: string) => simulate(() => { const a = assessments.find((x) => x.id === assessmentId)!; a.items[idx].coId = coId; return a; }),
};
