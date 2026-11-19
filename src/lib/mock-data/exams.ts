import type { Exam, ExamAttempt, Question } from "@/types/exams";
import { inDays } from "@/lib/format";

export const FRACTION_QS: Question[] = [
  { id: "q1", type: "mcq", prompt: "What is 1/4 + 2/3?", options: ["3/7", "11/12", "3/12", "2/12"], answer: 1, marks: 2, topic: "Adding unlike fractions", explanation: "The common denominator is 12: 3/12 + 8/12 = 11/12." },
  { id: "q2", type: "multi", prompt: "Select every fraction that is equivalent to 1/2.", options: ["2/4", "3/6", "4/9", "5/10"], answer: [0, 1, 3], marks: 3, topic: "Equivalent fractions", explanation: "Multiply top and bottom of 1/2 by 2, 3 or 5." },
  { id: "q3", type: "tf", prompt: "1/3 + 1/3 = 2/6.", answer: false, marks: 1, topic: "Adding like fractions", explanation: "When denominators match, only the numerators are added: 1/3 + 1/3 = 2/3." },
  { id: "q4", type: "fill", prompt: "To divide by a fraction, multiply by its ____.", answer: [["reciprocal", "inverse"]], marks: 1, topic: "Dividing fractions" },
  { id: "q5", type: "matching", prompt: "Match each fraction to its decimal value.", pairs: [{ left: "1/2", right: "0.5" }, { left: "1/4", right: "0.25" }, { left: "3/4", right: "0.75" }, { left: "1/5", right: "0.2" }], marks: 4, topic: "Fractions and decimals" },
  { id: "q6", type: "ordering", prompt: "Arrange these fractions from smallest to largest.", items: ["1/4", "1/3", "1/2", "3/4"], marks: 3, topic: "Comparing fractions" },
  { id: "q7", type: "numerical", prompt: "Write 3/8 as a decimal.", answer: 0.375, tolerance: 0.001, marks: 2, topic: "Fractions and decimals" },
  { id: "q8", type: "short", prompt: "Explain in one or two sentences why 1/4 + 2/3 is not 3/7.", maxWords: 50, keywords: ["denominator", "same", "size", "common"], marks: 3, topic: "Adding unlike fractions", sample: "The pieces are different sizes, so we must rewrite both fractions with a common denominator before adding the numerators." },
  { id: "q9", type: "long", prompt: "Describe the steps to add 2/3 and 3/4. Show a worked example and check that your answer is sensible.", maxWords: 150, marks: 5, topic: "Adding unlike fractions", rubric: [{ criterion: "Finds the common denominator", marks: 2 }, { criterion: "Adds correctly", marks: 2 }, { criterion: "Checks reasonableness", marks: 1 }] },
  { id: "q10", type: "file", prompt: "Upload a photo of your handwritten working for question 9.", accept: ["image", "pdf"], maxFiles: 2, marks: 2, topic: "Working shown" },
];
export const ECO_QS: Question[] = [
  { id: "e1", type: "mcq", prompt: "Which organism is a producer?", options: ["Grass", "Rabbit", "Fox", "Eagle"], answer: 0, marks: 1, topic: "Producers" },
  { id: "e2", type: "tf", prompt: "Decomposers return nutrients to the soil.", answer: true, marks: 1, topic: "Decomposers" },
  { id: "e3", type: "ordering", prompt: "Put this food chain in the order energy flows.", items: ["Grass", "Rabbit", "Fox", "Eagle"], marks: 3, topic: "Food chains" },
  { id: "e4", type: "matching", prompt: "Match each organism type to its role.", pairs: [{ left: "Producer", right: "Makes its own food" }, { left: "Herbivore", right: "Eats only plants" }, { left: "Carnivore", right: "Eats other animals" }, { left: "Decomposer", right: "Breaks down dead matter" }], marks: 4, topic: "Roles" },
  { id: "e5", type: "numerical", prompt: "Grass stores 10,000 kJ of energy. Using the 10% rule, how much energy reaches the rabbit?", unit: "kJ", answer: 1000, tolerance: 0, marks: 2, topic: "10% rule" },
  { id: "e6", type: "fill", prompt: "A network of linked food chains is called a food ____.", answer: [["web"]], marks: 1, topic: "Food webs" },
  { id: "e7", type: "multi", prompt: "Which of these are living parts of an ecosystem?", options: ["Fungi", "Sunlight", "Bacteria", "Soil"], answer: [0, 2], marks: 2, topic: "Ecosystems" },
  { id: "e8", type: "short", prompt: "What might happen to deer if wolves disappear from a forest?", maxWords: 40, keywords: ["increase", "overgraze", "plants"], marks: 3, topic: "Ecological balance", sample: "Deer numbers could rise and they might overgraze the plants." },
];
const T1_MATH: Question[] = FRACTION_QS.slice(0, 6).map((q, i) => ({ ...q, id: `m${i + 1}` }));
const base: { classIds: string[]; allowRetake: boolean; resultsReleased: boolean } = { classIds: ["cls-8b", "cls-5a"], allowRetake: false, resultsReleased: false };

export const EXAMS_SEED: Exam[] = [
  { ...base, id: "ex-math-mid", title: "Mathematics Mid-Term · Fractions & Decimals", subjectId: "sub-math", kind: "exam", teacherId: "tch-priya", teacherName: "Mrs. Priya Nair", opensAt: inDays(-1, 9), closesAt: inDays(2, 17), durationMinutes: 45, shuffle: false,
    instructions: ["Answer all questions. Marks are shown beside each question.", "Your answers autosave every few seconds on this device.", "You can flag a question and return to it before submitting.", "Once you submit, the attempt is locked."], totalMarks: FRACTION_QS.reduce((s, q) => s + q.marks, 0), questions: FRACTION_QS },
  { ...base, id: "ex-sci-quiz", title: "Ecosystems Checkpoint Quiz", subjectId: "sub-sci", kind: "unit-test", teacherId: "tch-daniel", teacherName: "Mr. Daniel Okafor", courseId: "crs-ecosystems", opensAt: inDays(-1, 9), closesAt: inDays(4, 17), durationMinutes: 20,
    instructions: ["Eight questions, 20 minutes.", "Keep this tab open; the timer keeps running.", "Calculators are not needed."], totalMarks: ECO_QS.reduce((s, q) => s + q.marks, 0), questions: ECO_QS },
  { ...base, id: "ex-t2-math", title: "Term 2 · Mathematics (Unit Test)", subjectId: "sub-math", kind: "exam", teacherId: "tch-priya", teacherName: "Mrs. Priya Nair", opensAt: inDays(13, 9), closesAt: inDays(13, 12), durationMinutes: 60,
    instructions: ["Closed book. Bring your geometry box.", "Start only when invigilator announces."], totalMarks: 30, questions: FRACTION_QS.slice(0, 6) },
  { ...base, id: "ex-t2-sci", title: "Term 2 · Science (Written)", subjectId: "sub-sci", kind: "exam", teacherId: "tch-daniel", teacherName: "Mr. Daniel Okafor", opensAt: inDays(14, 9), closesAt: inDays(14, 12), durationMinutes: 90, instructions: ["Section A and B are compulsory."], totalMarks: 50, questions: ECO_QS },
  { ...base, id: "ex-t1-math", title: "Term 1 · Mathematics", subjectId: "sub-math", kind: "exam", teacherId: "tch-priya", teacherName: "Mrs. Priya Nair", opensAt: inDays(-50, 9), closesAt: inDays(-50, 12), durationMinutes: 60, marksheetExamId: "t1", resultsReleased: false, classIds: ["cls-8b"], allowRetake: false,
    instructions: ["Closed book."], totalMarks: 80, questions: T1_MATH },
  { ...base, id: "ex-t1-sci", title: "Term 1 · Science", subjectId: "sub-sci", kind: "exam", teacherId: "tch-daniel", teacherName: "Mr. Daniel Okafor", opensAt: inDays(-48, 9), closesAt: inDays(-48, 12), durationMinutes: 60, marksheetExamId: "t1", instructions: ["Closed book."], totalMarks: 89, questions: ECO_QS },
  { ...base, id: "ex-ratio", title: "Ratio & Proportion Unit Test", subjectId: "sub-math", kind: "unit-test", teacherId: "tch-priya", teacherName: "Mrs. Priya Nair", opensAt: inDays(-6, 9), closesAt: inDays(-5, 17), durationMinutes: 30, instructions: ["Marks are released by your teacher after review."], totalMarks: 20, questions: FRACTION_QS.slice(0, 4) },
  { ...base, id: "ex-hist", title: "River Valley Civilisations Quiz", subjectId: "sub-soc", kind: "unit-test", teacherId: "tch-arjun", teacherName: "Mr. Arjun Menon", opensAt: inDays(-12, 9), closesAt: inDays(-9, 17), durationMinutes: 20, instructions: ["Missed the window? Speak to your teacher."], totalMarks: 15, questions: ECO_QS.slice(0, 3) },
  { ...base, id: "pr-fractions", title: "Fractions practice set (all question types)", subjectId: "sub-math", kind: "practice", teacherId: "tch-priya", teacherName: "Mrs. Priya Nair", courseId: "crs-fractions", opensAt: inDays(-30), closesAt: inDays(365), durationMinutes: 0, allowRetake: true, instructions: ["Practice only: untimed and it never counts towards your marks.", "You'll see answers and explanations right after you finish."], totalMarks: FRACTION_QS.reduce((s, q) => s + q.marks, 0), questions: FRACTION_QS, resultsReleased: true },
  { ...base, id: "pr-eco", title: "Ecosystems practice test", subjectId: "sub-sci", kind: "practice", teacherId: "tch-daniel", teacherName: "Mr. Daniel Okafor", courseId: "crs-ecosystems", opensAt: inDays(-30), closesAt: inDays(365), durationMinutes: 0, allowRetake: true, instructions: ["Practice only: untimed and ungraded."], totalMarks: ECO_QS.reduce((s, q) => s + q.marks, 0), questions: ECO_QS, resultsReleased: true },
];
const ans = (o: ExamAttempt["answers"]) => o;
export const ATTEMPTS_SEED: ExamAttempt[] = [
  { id: "at-mid-ananya", examId: "ex-math-mid", studentId: "stu-ananya", status: "in-progress", startedAt: inDays(0, 9, 55), answers: ans({ q1: 1, q2: [0, 1], q3: false }), flagged: ["q2"], remainingSeconds: 31 * 60, locked: false, attemptNo: 1 },
  { id: "at-t1m-ananya", examId: "ex-t1-math", studentId: "stu-ananya", status: "graded", startedAt: inDays(-50, 9), submittedAt: inDays(-50, 10), answers: {}, flagged: [], remainingSeconds: 0, score: 80, maxScore: 100, locked: true, attemptNo: 1 },
  { id: "at-t1s-ananya", examId: "ex-t1-sci", studentId: "stu-ananya", status: "graded", startedAt: inDays(-48, 9), submittedAt: inDays(-48, 10), answers: {}, flagged: [], remainingSeconds: 0, score: 89, maxScore: 100, locked: true, attemptNo: 1 },
  { id: "at-ratio-ananya", examId: "ex-ratio", studentId: "stu-ananya", status: "submitted", startedAt: inDays(-6, 10), submittedAt: inDays(-6, 10, 25), answers: {}, flagged: [], remainingSeconds: 300, locked: true, attemptNo: 1 },
  { id: "at-t1m-vihaan", examId: "ex-t1-math", studentId: "stu-vihaan", status: "graded", startedAt: inDays(-50, 9), submittedAt: inDays(-50, 10), answers: {}, flagged: [], remainingSeconds: 0, score: 84, maxScore: 100, locked: true, attemptNo: 1 },
];
