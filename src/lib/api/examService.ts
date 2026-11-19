import type { Exam, ExamAttempt, ExamView, ExamState, AnswerValue, Question } from "@/types/exams";
import { EXAMS_SEED, ATTEMPTS_SEED } from "../mock-data/exams";
import { STUDENTS } from "../mock-data/core";
import { DEMO_NOW } from "../format";
import { scoreQuestion } from "../assessment/score";
import { simulate, ServiceError } from "./latency";
import { marksheetService } from "./marksheetService";
import { notificationService } from "./notificationService";
import { uid } from "../utils";

const exams: Exam[] = structuredClone(EXAMS_SEED);
const attempts: ExamAttempt[] = structuredClone(ATTEMPTS_SEED);

/** Strip answer keys before anything reaches a student screen. */
export const publicQuestion = (q: Question): Question => { const c: any = { ...q }; delete c.answer; delete c.explanation; delete c.sample; delete c.keywords; delete c.rubric; return c; };
const publicExam = (e: Exam): Exam => ({ ...e, questions: e.questions.map(publicQuestion) });
const now = () => DEMO_NOW.getTime();

async function released(e: Exam, studentId: string) {
  if (e.kind === "practice") return true;
  if (e.marksheetExamId) { const sheets = await marksheetService.all(); return sheets.some((m) => m.studentId === studentId && m.examId === e.marksheetExamId && m.publicationStatus === "published"); }
  return e.resultsReleased;
}
function stateOf(e: Exam, att: ExamAttempt | undefined, resultVisible: boolean): ExamState {
  if (e.cancelled) return "cancelled";
  if (e.kind === "practice") return att?.status === "in-progress" ? "in-progress" : "available";
  if (att?.status === "in-progress") return "in-progress";
  if (att && (att.status === "submitted" || att.status === "graded")) return resultVisible ? "results" : "submitted";
  if (now() < new Date(e.opensAt).getTime()) return "upcoming";
  if (now() > new Date(e.closesAt).getTime()) return "closed";
  return "available";
}
const latest = (studentId: string, examId: string) => attempts.filter((a) => a.studentId === studentId && a.examId === examId).sort((a, b) => b.attemptNo - a.attemptNo)[0];
async function view(e: Exam, studentId: string): Promise<ExamView> {
  const att = latest(studentId, e.id); const vis = await released(e, studentId);
  const a = att ? { ...att, score: vis ? att.score : undefined, maxScore: vis ? att.maxScore : undefined, perQuestion: vis ? att.perQuestion : undefined } : undefined;
  return { exam: { ...publicExam(e) }, attempt: a, attempts: attempts.filter((x) => x.studentId === studentId && x.examId === e.id).length, state: stateOf(e, att, vis), resultVisible: vis };
}

export const examService = {
  /** Students never receive unreleased marks or answer keys. */
  forStudent: async (studentId: string, classId?: string) => {
    const cid = classId ?? STUDENTS.find((s) => s.id === studentId)?.classId;
    const list = exams.filter((e) => !cid || e.classIds.includes(cid));
    const views = await Promise.all(list.map((e) => view(e, studentId)));
    return simulate(() => views);
  },
  get: async (examId: string, studentId: string) => { const e = exams.find((x) => x.id === examId); if (!e) throw new ServiceError("Exam not found.", "unavailable"); const v = await view(e, studentId); return simulate(() => v); },
  start: (examId: string, studentId: string) => simulate(() => {
    const e = exams.find((x) => x.id === examId); if (!e) throw new ServiceError("Exam not found.", "unavailable");
    const cur = latest(studentId, examId);
    if (cur?.status === "in-progress") return cur;
    if (e.kind !== "practice") {
      if (cur) throw new ServiceError("You've already submitted this attempt. It is locked.", "permission");
      if (now() < new Date(e.opensAt).getTime()) throw new ServiceError("This exam hasn't opened yet.", "permission");
      if (now() > new Date(e.closesAt).getTime()) throw new ServiceError("The exam window has closed.", "permission");
    }
    const a: ExamAttempt = { id: uid("at"), examId, studentId, status: "in-progress", startedAt: new Date().toISOString(), answers: {}, flagged: [], remainingSeconds: e.durationMinutes * 60, locked: false, attemptNo: (cur?.attemptNo ?? 0) + 1 };
    attempts.push(a); return a;
  }, { ms: 300 }),
  /** Local-autosave simulation: persists answers, flags and the time left. Ignored once locked. */
  saveProgress: (attemptId: string, answers: Record<string, AnswerValue>, flagged: string[], remainingSeconds: number) => simulate(() => { const a = attempts.find((x) => x.id === attemptId); if (!a || a.locked) return { savedAt: null }; a.answers = answers; a.flagged = flagged; a.remainingSeconds = remainingSeconds; a.autosavedAt = new Date().toISOString(); return { savedAt: a.autosavedAt }; }, { ms: 80 }),
  submit: (attemptId: string, answers: Record<string, AnswerValue>, flagged: string[], auto = false) => simulate(() => {
    const a = attempts.find((x) => x.id === attemptId); if (!a) throw new ServiceError("Attempt not found.", "unavailable");
    if (a.locked) throw new ServiceError("This attempt was already submitted.", "permission");
    const e = exams.find((x) => x.id === a.examId)!;
    a.answers = answers; a.flagged = flagged; a.submittedAt = new Date().toISOString(); a.locked = true; a.maxScore = e.totalMarks;
    const per: NonNullable<ExamAttempt["perQuestion"]> = {}; let got = 0, manual = false;
    e.questions.forEach((q) => { const s = scoreQuestion(q, answers[q.id]); per[q.id] = { correct: s.correct, got: s.got }; got += s.got; if (s.correct === "manual" && (q.type !== "file")) manual = true; });
    if (e.kind === "practice") { a.status = "graded"; a.score = Math.round(got * 10) / 10; a.perQuestion = per; }
    else { a.status = "submitted"; a.score = Math.round(got * 10) / 10; a.perQuestion = per; notificationService.push({ role: "teacher", category: "academic", title: auto ? "Exam auto-submitted at time-up" : "Exam submitted", body: `${STUDENTS.find((s) => s.id === a.studentId)?.displayName} · ${e.title}${manual ? " · written answers need marking" : ""}`, href: "/teacher/assessments" }); }
    return a;
  }, { ms: 500 }),
  /** Review with answer key: only for practice, or formal exams whose results have been released to this student. */
  review: async (attemptId: string) => {
    const a = attempts.find((x) => x.id === attemptId); if (!a) throw new ServiceError("Attempt not found.", "unavailable");
    const e = exams.find((x) => x.id === a.examId)!; const ok = await released(e, a.studentId);
    return simulate(() => { if (!ok) throw new ServiceError("Marks and answers aren't released yet.", "permission"); return { exam: e, attempt: a }; });
  },
  /** Demo-admin reset: unlocks the attempt so the student can sit the exam again. */
  resetAttempt: (examId: string, studentId: string) => simulate(() => { for (let i = attempts.length - 1; i >= 0; i--) if (attempts[i].examId === examId && attempts[i].studentId === studentId) attempts.splice(i, 1); return true; }, { ms: 200 }),
  // teacher / institution helpers
  all: () => simulate(() => exams),
  attemptsFor: (examId: string) => simulate(() => attempts.filter((a) => a.examId === examId)),
  allAttempts: () => simulate(() => attempts),
  releaseResults: (examId: string, v = true) => simulate(() => { const e = exams.find((x) => x.id === examId); if (e) e.resultsReleased = v; return e ?? null; }),
  create: (e: Omit<Exam, "id">) => simulate(() => { const n = { ...e, id: uid("ex") }; exams.unshift(n); return n; }),
};
