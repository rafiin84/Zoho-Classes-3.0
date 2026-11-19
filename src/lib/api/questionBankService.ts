import type { AIGenParams, Question, QuestionInput, QStatus, ShareTier } from "@/types/questions";
import { QUESTIONS_SEED } from "../mock-data/questions";
import { TEACHERS, teacherName, objectiveById } from "../mock-data/core";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { track } from "../analytics";

const items: Question[] = structuredClone(QUESTIONS_SEED);
const now = () => new Date().toISOString();
const dept = (id: string) => TEACHERS.find((t) => t.id === id)?.departmentId ?? "dep-x";
const tokens = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9/ ]/g, " ").split(/\s+/).filter((w) => w.length > 2));
export const similarity = (a: string, b: string) => { const A = tokens(a), B = tokens(b); if (!A.size || !B.size) return 0; let i = 0; A.forEach((w) => B.has(w) && i++); return i / (A.size + B.size - i); };

/** Visibility: teachers see own + department/institution/marketplace-shared approved items; institution sees all. */
const visible = (q: Question, role: string, teacherId: string) =>
  role === "institution" || q.authorId === teacherId || (q.share !== "private" && (q.share !== "department" || q.departmentId === dept(teacherId)) && q.status !== "draft" && q.status !== "rejected");

export const questionBankService = {
  list: (role: string, teacherId: string) => simulate(() => items.filter((q) => visible(q, role, teacherId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
  get: (id: string) => simulate(() => items.find((q) => q.id === id) ?? null),
  /** Approved, non-archived questions available to pick into papers. */
  listApproved: (role: string, teacherId: string) => simulate(() => items.filter((q) => q.status === "approved" && visible(q, role, teacherId))),
  create: (input: QuestionInput, authorId: string, role: string) => simulate(() => {
    const at = now();
    const q: Question = { ...input, id: uid("q"), authorId, authorName: role === "institution" ? "Institution reviewer" : teacherName(authorId), departmentId: dept(authorId), status: "draft", share: "private", aiGenerated: false, version: 1,
      versions: [{ v: 1, at, by: teacherName(authorId), note: "Created", stem: input.stem, marks: input.marks }], usage: [], createdAt: at, updatedAt: at };
    items.unshift(q); return q;
  }),
  /** Editing never overwrites history: a visible new version is appended and approved items return to review. */
  update: (id: string, input: QuestionInput, by: string, note: string) => simulate(() => {
    const q = items.find((x) => x.id === id); if (!q) throw new ServiceError("Question not found", "validation");
    Object.assign(q, input); q.version++; q.updatedAt = now(); if (q.status === "approved" || q.status === "rejected") q.status = "in-review";
    q.versions.unshift({ v: q.version, at: q.updatedAt, by: teacherName(by), note: note || "Edited", stem: input.stem, marks: input.marks }); return q;
  }),
  duplicate: (id: string, authorId: string) => simulate(() => {
    const q = items.find((x) => x.id === id)!; const at = now();
    const d: Question = { ...structuredClone(q), id: uid("q"), authorId, authorName: teacherName(authorId), departmentId: dept(authorId), status: "draft", share: "private", version: 1, usage: [], createdAt: at, updatedAt: at, reviewNote: undefined,
      versions: [{ v: 1, at, by: teacherName(authorId), note: `Duplicated from ${q.id}`, stem: q.stem, marks: q.marks }] };
    items.unshift(d); return d;
  }),
  submitForReview: (id: string) => simulate(() => { const q = items.find((x) => x.id === id)!; q.status = "in-review"; q.updatedAt = now(); return q; }),
  /** Institution reviewers only. */
  review: (id: string, decision: "approved" | "rejected", note: string, role: string) => simulate(() => {
    if (role !== "institution") throw new ServiceError("Only institution reviewers can approve questions.", "permission");
    const q = items.find((x) => x.id === id)!; q.status = decision; q.reviewNote = note; q.updatedAt = now(); return q;
  }),
  /** Teacher approval of AI drafts: moves from draft to review queue (never straight to approved). */
  approveAIDraft: (id: string) => simulate(() => { const q = items.find((x) => x.id === id)!; q.status = "in-review"; q.versions.unshift({ v: ++q.version, at: now(), by: "Teacher", note: "Teacher approved AI draft; sent to review", stem: q.stem, marks: q.marks }); q.updatedAt = now(); return q; }),
  setStatus: (id: string, status: QStatus) => simulate(() => { const q = items.find((x) => x.id === id)!; q.status = status; q.updatedAt = now(); return q; }),
  archive: (id: string) => simulate(() => { const q = items.find((x) => x.id === id)!; q.status = "archived"; q.updatedAt = now(); return q; }),
  remove: (id: string) => simulate(() => { const i = items.findIndex((x) => x.id === id); if (i >= 0) items.splice(i, 1); return true; }),
  setShare: (id: string, share: ShareTier, role: string) => simulate(() => {
    const q = items.find((x) => x.id === id)!;
    if ((share === "institution" || share === "marketplace") && q.status !== "approved" && role !== "institution") throw new ServiceError("Only approved questions can be shared beyond your department.", "validation");
    q.share = share; q.updatedAt = now(); return q;
  }),
  tag: (id: string, tags: string[], objectiveIds: string[]) => simulate(() => { const q = items.find((x) => x.id === id)!; q.tags = tags; q.objectiveIds = objectiveIds; q.updatedAt = now(); return q; }),
  /** Mock near-duplicate detection using token overlap (deterministic, demo only). */
  findSimilar: (stem: string, excludeId?: string) => simulate(() => items.filter((q) => q.id !== excludeId && q.status !== "archived").map((q) => ({ q, score: similarity(stem, q.stem) })).filter((r) => r.score >= 0.45).sort((a, b) => b.score - a.score).slice(0, 3)),
  /** Mock CSV import: creates drafts. */
  importMock: (authorId: string) => simulate(() => {
    const at = now(); const rows: [string, string, "fill" | "short"][] = [["Round 0.678 to two decimal places.", "0.68", "fill"], ["State the SI unit of force.", "newton", "fill"], ["Define a prime number.", "A number greater than 1 with exactly two factors.", "short"]];
    const made = rows.map(([stem, answer, type]): Question => ({ id: uid("q"), subjectId: "sub-math", gradeId: "g8", chapterId: "ch-m8-frac", objectiveIds: [], type, stem, answer, explanation: "Imported; explanation pending.", marks: 1, difficulty: "Easy", bloom: "Remember", language: "English", tags: ["imported"], authorId, authorName: teacherName(authorId), departmentId: dept(authorId), status: "draft", share: "private", source: "CSV import (mock)", aiGenerated: false, version: 1, versions: [{ v: 1, at, by: teacherName(authorId), note: "Imported", stem, marks: 1 }], usage: [], createdAt: at, updatedAt: at }));
    items.unshift(...made); return made;
  }, { ms: 700 }),
  recordUsage: (qids: string[], paperId: string, paperTitle: string) => { qids.forEach((id) => { const q = items.find((x) => x.id === id); if (q && !q.usage.some((u) => u.paperId === paperId)) q.usage.push({ paperId, paperTitle, at: now() }); }); },
  /** AI generation (DEMO): deterministic templated drafts grounded to the chosen source. Always DRAFT + aiGenerated. */
  generate: (p: AIGenParams, authorId: string) => simulate(() => {
    const at = now(); const objs = p.objectiveIds.map(objectiveById).filter(Boolean) as NonNullable<ReturnType<typeof objectiveById>>[];
    if (!objs.length) throw new ServiceError("Select at least one learning objective to ground the questions.", "validation");
    if (!p.types.length) throw new ServiceError("Select at least one question type.", "validation");
    const verbs: Record<string, string> = { Remember: "State", Understand: "Explain in your own words", Apply: "Use the idea to solve a new problem on", Analyse: "Compare and find the cause of differences in", Evaluate: "Judge the strength of an argument about", Create: "Design a new example or plan involving" };
    const made = Array.from({ length: p.count }, (_, i): Question => {
      const o = objs[i % objs.length]; const type = p.types[i % p.types.length]; const obj = ["mcq", "multi", "tf", "fill", "match"].includes(type);
      const stem = `${verbs[p.bloom]}: ${o.title.toLowerCase()} (variant ${i + 1}, ${o.chapter}).`;
      return { id: uid("q"), subjectId: o.subjectId, gradeId: o.gradeId, chapterId: o.chapterId, objectiveIds: [o.id], type, stem,
        options: type === "mcq" || type === "multi" ? ["Option A (plausible)", "Option B (correct)", "Option C (common misconception)", "Option D (unrelated)"] : undefined,
        answer: type === "mcq" ? "1" : type === "multi" ? "1" : type === "tf" ? "true" : "Model answer drafted from the source passage; teacher to verify.",
        explanation: `Rationale: aligned to ${o.code} and the source “${p.source}”. Teacher must verify before approval.`,
        rubric: obj ? undefined : [{ criterion: "Accuracy against source", marks: Math.ceil(p.marks / 2) }, { criterion: "Reasoning shown", marks: Math.max(1, p.marks - Math.ceil(p.marks / 2)) }],
        marks: p.marks, difficulty: p.difficulty, bloom: p.bloom, language: "English", tags: ["ai-draft", o.chapter.toLowerCase()], authorId, authorName: `${teacherName(authorId)} (AI-assisted)`, departmentId: dept(authorId),
        status: "draft", share: "private", source: `AI-generated (demo) · ${p.source} · ${o.code}`, aiGenerated: true,
        ambiguityFlags: i % 3 === 1 ? ["Stem may allow more than one reading; check wording"] : type === "essay" || type === "long" ? ["Open-ended: confirm rubric before use"] : undefined,
        version: 1, versions: [{ v: 1, at, by: "AI draft (demo)", note: "Generated", stem, marks: p.marks }], usage: [], createdAt: at, updatedAt: at };
    });
    items.unshift(...made); track("paper_created", { kind: "ai-questions", n: made.length }); return made;
  }, { ms: 1100 }),
  /** Regenerate keeps the id so references remain stable; version increments. */
  regenerate: (id: string) => simulate(() => { const q = items.find((x) => x.id === id)!; q.stem = q.stem.replace(/variant (\d+)/, (_, n) => `variant ${Number(n) + 3}`); q.version++; q.updatedAt = now(); q.versions.unshift({ v: q.version, at: q.updatedAt, by: "AI draft (demo)", note: "Regenerated", stem: q.stem, marks: q.marks }); return q; }, { ms: 800 }),
};
