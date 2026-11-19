import type { ProgrammeOutcome, CourseOutcome, ObeCourse, ObeAssessment, CourseMapping, MappingScale, AttainmentConfig } from "@/types/obe";
import { inDays } from "../format";

export const OBE_PROGRAMME = { id: "prg-btech-cse", name: "B.Tech Computer Science & Engineering", institution: "Meridian University", institutionId: "inst-meridian", academicYear: "2026–27" };
const PO = (n: number, title: string, description: string, descriptors: string[]): ProgrammeOutcome => ({ id: `po${n}`, code: `PO${n}`, kind: "PO", title, description, descriptors });
export const OBE_POS: ProgrammeOutcome[] = [
  PO(1, "Engineering knowledge", "Apply knowledge of mathematics, science and engineering fundamentals to solve complex engineering problems.", ["Applies mathematical models", "Uses core CS theory"]),
  PO(2, "Problem analysis", "Identify, formulate and analyse complex problems using first principles.", ["Frames problems", "Evaluates alternatives"]),
  PO(3, "Design & development of solutions", "Design solutions meeting specified needs with consideration for safety and societal factors.", ["Produces designs", "Justifies trade-offs"]),
  PO(4, "Investigation of problems", "Use research-based methods including experiments and interpretation of data.", ["Designs experiments", "Interprets results"]),
  PO(5, "Modern tool usage", "Select and apply appropriate techniques, resources and modern engineering tools.", ["Uses IDEs and profilers", "Uses version control"]),
  PO(9, "Individual and team work", "Function effectively as an individual and as a member or leader of diverse teams.", ["Collaborates", "Leads tasks"]),
  PO(10, "Communication", "Communicate effectively on complex engineering activities.", ["Writes clear reports", "Presents ideas"]),
  PO(12, "Life-long learning", "Recognise the need for and engage in independent, life-long learning.", ["Self-directed study", "Adapts to new tools"]),
  { id: "pso1", code: "PSO1", kind: "PSO", title: "Software systems competence", description: "Design and build reliable software systems using data structures, algorithms and databases.", descriptors: ["Builds scalable software"] },
  { id: "pso2", code: "PSO2", kind: "PSO", title: "Intelligent systems competence", description: "Apply machine learning and data techniques to build intelligent applications.", descriptors: ["Applies ML workflows"] },
];
export const OBE_COURSES: ObeCourse[] = [
  { id: "crs-ds", code: "CS301", title: "Data Structures & Algorithms", semester: 3, credits: 4, facultyId: "tch-leela", facultyName: "Dr. Leela Krishnan", cohort: 60 },
  { id: "crs-dbms", code: "CS305", title: "Database Management Systems", semester: 5, credits: 3, facultyId: "tch-sameer", facultyName: "Mr. Sameer Bhatt", cohort: 60 },
  { id: "crs-ml", code: "CS402", title: "Machine Learning", semester: 7, credits: 3, facultyId: "tch-leela", facultyName: "Dr. Leela Krishnan", cohort: 60 },
];
const COTEXT: Record<string, [string, string][]> = {
  "crs-ds": [["Analyse time and space complexity of algorithms", "Analyse"], ["Implement linear and tree data structures", "Apply"], ["Apply graph algorithms to practical problems", "Apply"], ["Compare algorithm design paradigms", "Evaluate"], ["Develop efficient solutions in a team project", "Create"]],
  "crs-dbms": [["Model data using ER and relational schemas", "Apply"], ["Write complex SQL queries", "Apply"], ["Normalise relations to remove anomalies", "Analyse"], ["Explain transactions and concurrency control", "Understand"], ["Design a database-backed application", "Create"]],
  "crs-ml": [["Explain supervised and unsupervised learning", "Understand"], ["Train and tune regression and classification models", "Apply"], ["Evaluate models with appropriate metrics", "Evaluate"], ["Analyse bias, variance and overfitting", "Analyse"], ["Build and present an end-to-end ML pipeline", "Create"]],
};
export const OBE_COS: CourseOutcome[] = OBE_COURSES.flatMap((c) => COTEXT[c.id].map(([text, bloom], i) => ({ id: `${c.id}-co${i + 1}`, courseId: c.id, code: `${c.code}.CO${i + 1}`, text, bloom })));
export const DEFAULT_SCALE: MappingScale = { max: 3, labels: ["No correlation", "Low", "Medium", "High"], note: "Each institution sets its own scale. This demo defaults to 0–3." };

const pattern: Record<string, number[][]> = { // rows = COs, cols = [po1,2,3,4,5,9,10,12,pso1,pso2]
  "crs-ds": [[3, 3, 0, 1, 0, 0, 0, 0, 2, 0], [2, 2, 2, 0, 2, 0, 0, 0, 3, 0], [2, 3, 2, 1, 1, 0, 0, 0, 3, 1], [1, 3, 2, 2, 0, 0, 1, 1, 2, 0], [1, 1, 3, 0, 2, 3, 2, 2, 2, 0]],
  "crs-dbms": [[2, 2, 3, 0, 0, 0, 0, 0, 3, 0], [2, 1, 1, 0, 3, 0, 0, 0, 3, 1], [2, 3, 1, 1, 0, 0, 0, 0, 2, 0], [3, 2, 0, 1, 0, 0, 1, 1, 2, 0], [1, 1, 3, 0, 3, 2, 2, 1, 3, 1]],
  "crs-ml": [[3, 1, 0, 0, 1, 0, 1, 1, 0, 3], [2, 2, 2, 1, 3, 0, 0, 0, 1, 3], [1, 3, 1, 3, 2, 0, 1, 0, 0, 3], [2, 3, 1, 2, 0, 0, 0, 1, 0, 2], [1, 1, 3, 2, 3, 3, 3, 2, 1, 3]],
};
export const OBE_MAPPINGS_SEED: CourseMapping[] = OBE_COURSES.map((c) => ({
  courseId: c.id, status: c.id === "crs-ml" ? "in-review" : "approved", version: c.id === "crs-ds" ? 2 : 1,
  cells: pattern[c.id].flatMap((row, i) => row.map((value, j) => ({ coId: `${c.id}-co${i + 1}`, poId: OBE_POS[j].id, value, rationale: value ? `CO${i + 1} contributes to ${OBE_POS[j].code} through ${value === 3 ? "direct, assessed" : value === 2 ? "partial" : "introductory"} activity.` : "" }))),
  history: [{ version: 1, at: inDays(-120), by: c.facultyName, note: "Initial mapping" }, ...(c.id === "crs-ds" ? [{ version: 2, at: inDays(-45), by: "OBE committee", note: "CO3 → PSO2 revised after curriculum review" }] : [])],
}));
export const OBE_ASSESSMENTS: ObeAssessment[] = OBE_COURSES.flatMap((c) => {
  const co = (n: number) => `${c.id}-co${n}`;
  return [
    { id: `${c.id}-ia1`, courseId: c.id, title: "Internal test 1", category: "internal" as const, maxMarks: 30, scoresAvailable: true, items: [{ label: "Q1–Q3", coId: co(1), marks: 15, kind: "question" as const }, { label: "Q4–Q5", coId: co(2), marks: 15, kind: "question" as const }] },
    { id: `${c.id}-ia2`, courseId: c.id, title: "Internal test 2", category: "internal" as const, maxMarks: 30, scoresAvailable: true, items: [{ label: "Q1–Q2", coId: co(3), marks: 15, kind: "question" as const }, { label: "Q3–Q4", coId: co(4), marks: 15, kind: "question" as const }] },
    { id: `${c.id}-asg`, courseId: c.id, title: "Assignment set", category: "assignment" as const, maxMarks: 20, scoresAvailable: true, items: [{ label: "Part A", coId: co(1), marks: 10, kind: "question" as const }, { label: "Part B", coId: co(3), marks: 10, kind: "rubric" as const }] },
    { id: `${c.id}-prac`, courseId: c.id, title: "Lab / mini project", category: "practical" as const, maxMarks: 25, scoresAvailable: c.id !== "crs-ml", items: [{ label: "Implementation rubric", coId: co(2), marks: 10, kind: "rubric" as const }, { label: "Team project rubric", coId: co(5), marks: 15, kind: "rubric" as const }] },
    { id: `${c.id}-end`, courseId: c.id, title: "End-semester exam", category: "external" as const, maxMarks: 100, scoresAvailable: c.id !== "crs-ml", items: [1, 2, 3, 4].map((n) => ({ label: `Section ${n}`, coId: co(n), marks: 25, kind: "question" as const })) },
  ];
});
export const DEFAULT_ATTAINMENT: AttainmentConfig = { method: "threshold", targetScorePct: 60, levels: { l3: 70, l2: 60, l1: 50 }, meanLevels: { l3: 70, l2: 60, l1: 50 }, weights: { internal: 0.2, external: 0.5, assignment: 0.15, practical: 0.15 }, targetLevel: 2 };
