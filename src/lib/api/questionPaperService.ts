import type { Blueprint, Bloom, Difficulty, Paper, PaperCheck, PaperQuestion, Question } from "@/types/questions";
import { BLOOM, DIFFICULTY, isObjective } from "@/types/questions";
import { PAPERS_SEED, BLUEPRINT_SEED } from "../mock-data/questions";
import { teacherName } from "../mock-data/core";
import { simulate, ServiceError } from "./latency";
import { questionBankService } from "./questionBankService";
import { notificationService } from "./notificationService";
import { uid } from "../utils";
import { track } from "../analytics";

const papers: Paper[] = structuredClone(PAPERS_SEED);
const blueprints: Blueprint[] = structuredClone(BLUEPRINT_SEED);
const now = () => new Date().toISOString();

/* ---------- pure analysis helpers (used live by the builder UI and enforced on publish) ---------- */
export const sumMarks = (qs: PaperQuestion[]) => qs.reduce((a, q) => a + q.marks, 0);
export const bloomActual = (qs: PaperQuestion[]): Record<Bloom, number> => { const r = Object.fromEntries(BLOOM.map((b) => [b, 0])) as Record<Bloom, number>; qs.forEach((q) => (r[q.snapshot.bloom] += q.marks)); return r; };
export const difficultyActual = (qs: PaperQuestion[]): Record<Difficulty, number> => { const t = sumMarks(qs) || 1; const r = Object.fromEntries(DIFFICULTY.map((d) => [d, 0])) as Record<Difficulty, number>; qs.forEach((q) => (r[q.snapshot.difficulty] += (q.marks / t) * 100)); DIFFICULTY.forEach((d) => (r[d] = Math.round(r[d]))); return r; };

export function analysePaper(p: Pick<Paper, "totalMarks" | "questions" | "blueprint" | "objectiveIds" | "durationMin" | "title">): PaperCheck[] {
  const out: PaperCheck[] = []; const total = sumMarks(p.questions);
  out.push({ key: "total", ok: total === p.totalMarks, level: "error", text: total === p.totalMarks ? `Marks add up to ${p.totalMarks}.` : `Question marks total ${total}, but the paper is set to ${p.totalMarks} (${total > p.totalMarks ? "+" : ""}${total - p.totalMarks}).` });
  out.push({ key: "count", ok: p.questions.length > 0, level: "error", text: p.questions.length ? `${p.questions.length} questions selected.` : "No questions selected yet." });
  const act = bloomActual(p.questions);
  BLOOM.forEach((b) => { const t = p.blueprint.bloomMarks[b] ?? 0, d = act[b] - t; if (t || act[b]) out.push({ key: `bloom-${b}`, ok: Math.abs(d) <= 1, level: "warn", text: Math.abs(d) <= 1 ? `${b}: ${act[b]} of ${t} marks (met).` : `${b}: ${act[b]} marks vs blueprint ${t} (${d > 0 ? "+" : ""}${d}).` }); });
  const bt = Object.values(p.blueprint.bloomMarks).reduce((a, b) => a + b, 0);
  if (bt !== p.blueprint.totalMarks) out.push({ key: "bp-sum", ok: false, level: "warn", text: `Blueprint Bloom targets add up to ${bt}, not the blueprint total ${p.blueprint.totalMarks}.` });
  const da = difficultyActual(p.questions);
  DIFFICULTY.forEach((d) => { const diff = da[d] - p.blueprint.difficultyPct[d]; if (Math.abs(diff) > 15) out.push({ key: `diff-${d}`, ok: false, level: "warn", text: `${d} share is ${da[d]}% vs target ${p.blueprint.difficultyPct[d]}%.` }); });
  const covered = new Set(p.questions.flatMap((q) => q.snapshot.objectiveIds));
  const missing = p.objectiveIds.filter((o) => !covered.has(o));
  out.push({ key: "coverage", ok: missing.length === 0, level: "warn", text: missing.length ? `${missing.length} selected objective(s) have no question.` : "All selected objectives are covered." });
  const unapproved = p.questions.filter((q) => q.snapshot.status !== "approved");
  out.push({ key: "approved", ok: unapproved.length === 0, level: "error", text: unapproved.length ? `${unapproved.length} question(s) are not approved (draft/AI/in review) and cannot be published.` : "Every question is approved." });
  const noKey = p.questions.filter((q) => !q.snapshot.answer.trim() || (!isObjective(q.snapshot.type) && !q.snapshot.rubric?.length));
  out.push({ key: "key", ok: noKey.length === 0, level: "warn", text: noKey.length ? `${noKey.length} question(s) lack an answer key or rubric.` : "Answer key and rubrics present." });
  const mins = p.questions.reduce((a, q) => a + Math.max(1, q.marks * (isObjective(q.snapshot.type) ? 1 : 2.5)), 0);
  out.push({ key: "time", ok: mins <= p.durationMin * 1.1, level: "warn", text: mins <= p.durationMin * 1.1 ? `Estimated working time ${Math.round(mins)} min fits ${p.durationMin} min.` : `Estimated working time ${Math.round(mins)} min exceeds ${p.durationMin} min.` });
  return out;
}
export const blockingIssues = (p: Parameters<typeof analysePaper>[0]) => analysePaper(p).filter((c) => !c.ok && c.level === "error");

const shuffle = <T,>(a: T[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
export const toPaperQuestion = (q: Question, section?: string): PaperQuestion => ({ qid: q.id, section: section ?? (q.marks <= 2 ? "Section A" : q.marks <= 4 ? "Section B" : "Section C"), marks: q.marks, snapshot: structuredClone(q) });

export interface PaperFilters { role: string; teacherId: string }
export interface GenParams { subjectId: string; gradeId: string; objectiveIds: string[]; chapterIds: string[]; blueprint: Blueprint; totalMarks: number; role: string; teacherId: string; exclude?: string[] }

export const questionPaperService = {
  list: (f: PaperFilters) => simulate(() => papers.filter((p) => f.role === "institution" || p.ownerId === f.teacherId || (p.restrictedTo !== "owner" && p.status !== "draft")).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
  get: (id: string) => simulate(() => papers.find((p) => p.id === id) ?? null),
  /** For the exam creator: approved & published papers only. */
  listPublished: () => simulate(() => papers.filter((p) => p.status === "published").map((p) => ({ id: p.id, title: p.title, subjectId: p.subjectId, gradeId: p.gradeId, totalMarks: p.totalMarks, durationMin: p.durationMin, examType: p.examType, term: p.term, academicYearId: p.academicYearId, questionCount: p.questions.length, version: p.version, publishedAt: p.publishedAt }))),
  /** Student-facing view: never exposes answers, explanations or rubrics. Published only. */
  studentView: (id: string) => simulate(() => {
    const p = papers.find((x) => x.id === id && x.status === "published"); if (!p) return null;
    return { id: p.id, title: p.title, instructions: p.instructions, durationMin: p.durationMin, totalMarks: p.totalMarks, questions: p.questions.map((q) => ({ id: q.qid, section: q.section, marks: q.marks, type: q.snapshot.type, stem: q.snapshot.stem, options: q.snapshot.options })) };
  }),
  /** Create or update. Changing the question set appends a version. */
  save: (p: Paper, by: string, note = "Saved") => simulate(() => {
    const i = papers.findIndex((x) => x.id === p.id); const at = now();
    if (i < 0) { const n: Paper = { ...structuredClone(p), id: p.id || uid("qp"), version: 1, status: "draft", createdAt: at, updatedAt: at, versions: [{ v: 1, at, by: teacherName(by), note: "Created", questionIds: p.questions.map((q) => q.qid) }] }; papers.unshift(n); track("paper_created", { id: n.id, mode: n.mode }); questionBankService.recordUsage(n.questions.map((q) => q.qid), n.id, n.title); return n; }
    const cur = papers[i]; if (cur.status === "published") throw new ServiceError("Published papers are locked. Duplicate as draft to edit.", "validation");
    const changed = cur.questions.map((q) => q.qid).join() !== p.questions.map((q) => q.qid).join();
    const n: Paper = { ...structuredClone(p), version: changed ? cur.version + 1 : cur.version, versions: changed ? [{ v: cur.version + 1, at, by: teacherName(by), note, questionIds: p.questions.map((q) => q.qid) }, ...cur.versions] : cur.versions, updatedAt: at, status: cur.status === "approved" && changed ? "draft" : cur.status };
    papers[i] = n; questionBankService.recordUsage(n.questions.map((q) => q.qid), n.id, n.title); return n;
  }),
  /** Randomised selection from approved bank questions within blueprint Bloom/difficulty targets; snapshots are copied into the paper. */
  generateFromBank: async (g: GenParams) => {
    const pool0 = await questionBankService.listApproved(g.role, g.teacherId);
    return simulate(() => {
    let pool = pool0.filter((q) => q.subjectId === g.subjectId && q.gradeId === g.gradeId && !(g.exclude ?? []).includes(q.id));
    if (g.objectiveIds.length) pool = pool.filter((q) => q.objectiveIds.some((o) => g.objectiveIds.includes(o)));
    else if (g.chapterIds.length) pool = pool.filter((q) => g.chapterIds.includes(q.chapterId));
    pool = shuffle(pool); const picked: Question[] = []; let acc = 0;
    const want: Record<Difficulty, number> = { Easy: (g.blueprint.difficultyPct.Easy / 100) * g.totalMarks, Medium: (g.blueprint.difficultyPct.Medium / 100) * g.totalMarks, Hard: (g.blueprint.difficultyPct.Hard / 100) * g.totalMarks };
    const got: Record<Difficulty, number> = { Easy: 0, Medium: 0, Hard: 0 };
    for (const b of BLOOM) {
      const t = g.blueprint.bloomMarks[b] ?? 0; let have = 0;
      const cands = pool.filter((q) => q.bloom === b && !picked.includes(q)).sort((x, y) => (want[y.difficulty] - got[y.difficulty]) - (want[x.difficulty] - got[x.difficulty]));
      for (const q of cands) if (have + q.marks <= t && acc + q.marks <= g.totalMarks) { picked.push(q); have += q.marks; acc += q.marks; got[q.difficulty] += q.marks; }
    }
    for (const q of pool) if (!picked.includes(q) && acc + q.marks <= g.totalMarks) { picked.push(q); acc += q.marks; got[q.difficulty] += q.marks; }
    return { questions: picked.map((q) => toPaperQuestion(q)), poolSize: pool.length };
    });
  },
  /** AI-assisted: creates DRAFT AI questions (must be approved before publishing). */
  generateAI: async (g: GenParams & { count: number }) => {
    const per = Math.max(1, Math.round(g.totalMarks / g.count));
    const out: Question[] = [];
    const blooms = BLOOM.filter((b) => (g.blueprint.bloomMarks[b] ?? 0) > 0);
    for (const b of blooms) {
      const n = Math.max(1, Math.round(((g.blueprint.bloomMarks[b] ?? 0) / g.totalMarks) * g.count));
      out.push(...(await questionBankService.generate({ objectiveIds: g.objectiveIds, source: "Approved textbook (demo)", types: b === "Remember" ? ["mcq", "fill"] : b === "Create" || b === "Evaluate" ? ["long"] : ["short"], count: n, marks: per, difficulty: b === "Remember" ? "Easy" : b === "Create" || b === "Evaluate" ? "Hard" : "Medium", bloom: b, subjectId: g.subjectId, gradeId: g.gradeId }, g.teacherId)));
    }
    return out.map((q) => toPaperQuestion(q));
  },
  submitForApproval: (id: string) => simulate(() => { const p = papers.find((x) => x.id === id)!; const b = blockingIssues(p).filter((c) => c.key !== "approved"); if (b.length) throw new ServiceError(b[0].text, "validation"); p.status = "in-review"; p.updatedAt = now(); return p; }),
  review: (id: string, decision: "approved" | "rejected", note: string, role: string, by: string) => simulate(() => {
    if (role !== "institution") throw new ServiceError("Only institution reviewers can approve papers.", "permission");
    const p = papers.find((x) => x.id === id)!; p.reviewNote = note; p.status = decision === "approved" ? "approved" : "draft"; if (decision === "approved") p.approvedBy = by; p.updatedAt = now(); return p;
  }),
  /** Publishing requires approval and zero blocking issues. Makes the paper available to exam scheduling. */
  publish: (id: string) => simulate(() => {
    const p = papers.find((x) => x.id === id)!; if (p.status !== "approved") throw new ServiceError("A paper must be approved before it can be published.", "validation");
    const b = blockingIssues(p); if (b.length) throw new ServiceError(b[0].text, "validation");
    p.status = "published"; p.publishedAt = now(); p.updatedAt = p.publishedAt; track("paper_published", { id }); notificationService.push({ role: "teacher", category: "academic", title: "Question paper published", body: `${p.title} is ready for exam scheduling.`, href: "/teacher/papers" }); return p;
  }),
  archive: (id: string) => simulate(() => { const p = papers.find((x) => x.id === id)!; p.status = "archived"; p.updatedAt = now(); return p; }),
  duplicate: (id: string, ownerId: string) => simulate(() => { const p = papers.find((x) => x.id === id)!; const at = now(); const d: Paper = { ...structuredClone(p), id: uid("qp"), title: `${p.title} (copy)`, status: "draft", ownerId, ownerName: teacherName(ownerId), version: 1, versions: [{ v: 1, at, by: teacherName(ownerId), note: `Duplicated from ${p.title}`, questionIds: p.questions.map((q) => q.qid) }], createdAt: at, updatedAt: at, approvedBy: undefined, publishedAt: undefined, reviewNote: undefined }; papers.unshift(d); return d; }),
  remove: (id: string) => simulate(() => { const i = papers.findIndex((x) => x.id === id); if (i >= 0 && papers[i].status !== "published") papers.splice(i, 1); return true; }),
  /* Blueprint templates */
  listBlueprints: () => simulate(() => blueprints),
  saveBlueprint: (b: Blueprint) => simulate(() => { const i = blueprints.findIndex((x) => x.id === b.id); const n = { ...b, builtIn: false }; if (i >= 0 && !blueprints[i].builtIn) blueprints[i] = n; else blueprints.push({ ...n, id: i >= 0 ? uid("bp") : b.id || uid("bp") }); return n; }),
  deleteBlueprint: (id: string) => simulate(() => { const i = blueprints.findIndex((x) => x.id === id && !x.builtIn); if (i >= 0) blueprints.splice(i, 1); return true; }),
};
