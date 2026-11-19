// Shared fictional seed: institution, people, subjects, curriculum. ALL FICTIONAL DEMO DATA.
import type { Institution, Branch, Classroom, Subject, Student, Teacher, Parent, AIPersona } from "@/types";

export const STATE = { id: "gov-karuvana", name: "Karuvana State", dept: "Karuvana State Education Department", students: 6_200_000, teachers: 350_000, institutions: 38_000 };
export const AY = { id: "ay-2026-27", label: "2026–27" };
export const ACADEMIC_YEARS = [{ id: "ay-2026-27", label: "2026–27" }, { id: "ay-2025-26", label: "2025–26" }];

export const INSTITUTIONS: Institution[] = [
  { id: "inst-greenfield", name: "Greenfield International School", type: "school", tenantId: "tnt-greenfield", parentGovernmentId: STATE.id, branchIds: ["br-north", "br-lakeside"], academicYearId: AY.id, timezone: "Asia/Kolkata", defaultLanguage: "English", status: "active" },
  { id: "inst-meridian", name: "Meridian University", type: "university", tenantId: "tnt-meridian", parentGovernmentId: STATE.id, branchIds: ["br-meridian-main"], academicYearId: AY.id, timezone: "Asia/Kolkata", defaultLanguage: "English", status: "active" },
];
export const BRANCHES: Branch[] = [
  { id: "br-north", institutionId: "inst-greenfield", name: "North Campus", city: "Kaveripuram", students: 1180, teachers: 64 },
  { id: "br-lakeside", institutionId: "inst-greenfield", name: "Lakeside Campus", city: "Kaveripuram", students: 860, teachers: 49 },
  { id: "br-meridian-main", institutionId: "inst-meridian", name: "Main Campus", city: "Nilgiri Town", students: 5400, teachers: 310 },
];

export const SUBJECTS: Subject[] = [
  { id: "sub-math", name: "Mathematics", color: "#5146E5", icon: "MathOperations" },
  { id: "sub-sci", name: "Science", color: "#1D6FB8", icon: "Atom" },
  { id: "sub-eng", name: "English", color: "#7044D8", icon: "BookOpen" },
  { id: "sub-soc", name: "Social Science", color: "#9A5B00", icon: "GlobeHemisphereWest" },
  { id: "sub-hin", name: "Hindi", color: "#C0262D", icon: "Translate" },
  { id: "sub-cs", name: "Computer Science", color: "#12805C", icon: "Code" },
];
export const subjectById = (id: string) => SUBJECTS.find((s) => s.id === id) ?? SUBJECTS[0];

export const CLASSROOMS: Classroom[] = [
  { id: "cls-8b", branchId: "br-north", gradeId: "g8", name: "Grade 8 · B", section: "B", teacherId: "tch-priya", studentIds: [] },
  { id: "cls-8a", branchId: "br-north", gradeId: "g8", name: "Grade 8 · A", section: "A", teacherId: "tch-farah", studentIds: [] },
  { id: "cls-7a", branchId: "br-north", gradeId: "g7", name: "Grade 7 · A", section: "A", teacherId: "tch-arjun", studentIds: [] },
  { id: "cls-9c", branchId: "br-lakeside", gradeId: "g9", name: "Grade 9 · C", section: "C", teacherId: "tch-daniel", studentIds: [] },
  { id: "cls-5a", branchId: "br-north", gradeId: "g5", name: "Grade 5 · A", section: "A", teacherId: "tch-leela", studentIds: [] },
];

const S = (id: string, displayName: string, color: string, extra: Partial<Student> = {}): Student => ({
  id, displayName, avatarColor: color, gradeId: "g8", gradeLabel: "Grade 8", classId: "cls-8b", className: "8B", institutionId: "inst-greenfield", branchId: "br-north",
  academicYearId: AY.id, preferredLanguage: "English", status: "active", membershipIds: [`mem-${id}-cls`, `mem-${id}-club`], portfolioId: `pf-${id}`, learningProfileId: `lp-${id}`,
  interests: ["Robotics", "Drawing"], parentIds: [], ...extra,
});
export const STUDENTS: Student[] = [
  S("stu-ananya", "Ananya Rao", "#5146E5", { interests: ["Robotics", "Science", "Basketball"], parentIds: ["par-rohan"] }),
  S("stu-kabir", "Kabir Mehta", "#7044D8", { interests: ["Cricket", "Gaming"] }),
  S("stu-meera", "Meera Iyer", "#1D6FB8", { status: "pending-baseline", interests: ["Reading", "Painting"] }),
  S("stu-vihaan", "Vihaan Rao", "#9A5B00", { gradeId: "g5", gradeLabel: "Grade 5", classId: "cls-5a", className: "5A", interests: ["Football", "Stories"], parentIds: ["par-rohan"] }),
  S("stu-zoya", "Zoya Khan", "#C0262D", { interests: ["Coding", "Music"] }),
  S("stu-dev", "Dev Malhotra", "#12805C", { interests: ["Maths", "Chess"] }),
  S("stu-isha", "Isha Nambiar", "#7044D8", { interests: ["Dance", "Poetry"] }),
  S("stu-rohit", "Rohit Das", "#5146E5", { interests: ["Basketball", "Coding"] }),
  S("stu-tara", "Tara Joseph", "#1D6FB8", { interests: ["Painting", "Science"] }),
  S("stu-arnav", "Arnav Singh", "#9A5B00", { interests: ["Football", "History"] }),
  S("stu-sana", "Sana Qureshi", "#12805C", { interests: ["Debate", "Reading"] }),
  S("stu-nikhil", "Nikhil Pillai", "#C0262D", { interests: ["Robotics", "Chess"] }),
];
CLASSROOMS.find((c) => c.id === "cls-8b")!.studentIds = STUDENTS.filter((s) => s.classId === "cls-8b").map((s) => s.id);
CLASSROOMS.find((c) => c.id === "cls-5a")!.studentIds = ["stu-vihaan"];

export const TEACHERS: Teacher[] = [
  { id: "tch-priya", displayName: "Priya Nair", title: "Mrs.", avatarColor: "#7044D8", employeeCode: "GF-T-014", institutionId: "inst-greenfield", branchIds: ["br-north"], departmentId: "dep-math", departmentName: "Mathematics", subjectIds: ["sub-math"], classIds: ["cls-8b", "cls-8a", "cls-7a"], workloadLimit: 28, status: "active" },
  { id: "tch-daniel", displayName: "Daniel Okafor", title: "Mr.", avatarColor: "#1D6FB8", employeeCode: "GF-T-021", institutionId: "inst-greenfield", branchIds: ["br-north", "br-lakeside"], departmentId: "dep-sci", departmentName: "Science", subjectIds: ["sub-sci"], classIds: ["cls-8b", "cls-9c"], workloadLimit: 28, status: "active" },
  { id: "tch-farah", displayName: "Farah Siddiqui", title: "Ms.", avatarColor: "#C0262D", employeeCode: "GF-T-009", institutionId: "inst-greenfield", branchIds: ["br-north"], departmentId: "dep-eng", departmentName: "Languages", subjectIds: ["sub-eng", "sub-hin"], classIds: ["cls-8a", "cls-8b"], workloadLimit: 26, status: "active" },
  { id: "tch-arjun", displayName: "Arjun Menon", title: "Mr.", avatarColor: "#9A5B00", employeeCode: "GF-T-031", institutionId: "inst-greenfield", branchIds: ["br-north"], departmentId: "dep-soc", departmentName: "Humanities", subjectIds: ["sub-soc"], classIds: ["cls-7a", "cls-8b"], workloadLimit: 26, status: "active" },
  { id: "tch-leela", displayName: "Leela Krishnan", title: "Dr.", avatarColor: "#12805C", employeeCode: "GF-T-004", institutionId: "inst-greenfield", branchIds: ["br-north"], departmentId: "dep-cs", departmentName: "Computing & Robotics", subjectIds: ["sub-cs"], classIds: ["cls-8b", "cls-5a"], workloadLimit: 24, status: "active" },
  { id: "tch-sameer", displayName: "Sameer Bhatt", title: "Mr.", avatarColor: "#5146E5", employeeCode: "GF-T-040", institutionId: "inst-greenfield", branchIds: ["br-lakeside"], departmentId: "dep-sci", departmentName: "Science", subjectIds: ["sub-sci", "sub-math"], classIds: ["cls-9c"], workloadLimit: 28, status: "on-leave" },
];
export const teacherName = (id: string) => { const t = TEACHERS.find((x) => x.id === id); return t ? `${t.title} ${t.displayName}` : id; };

export const PARENTS: Parent[] = [{ id: "par-rohan", displayName: "Rohan Rao", avatarColor: "#6D5BE0", childIds: ["stu-ananya", "stu-vihaan"], verification: "verified" }];

export const AI_TEACHERS: (AIPersona & { grade: string; languages: string[]; personality: string; status: "draft" | "awaiting-approval" | "approved" | "suspended"; owner: string; ownerType: "government" | "institution" | "teacher"; version: string; usage: number; rating: number; sources: string[]; tools: string[]; classes: string[] })[] = [
  { id: "ait-euler", name: "Euler", kind: "ai-teacher", subject: "Mathematics", avatarColor: "#5146E5", grade: "Grades 6–8", languages: ["English", "Hindi"], personality: "Patient, step-by-step, loves patterns", status: "approved", owner: "Karuvana State Education Dept.", ownerType: "government", version: "v2.1", usage: 18420, rating: 4.7, sources: ["Karuvana Maths Grade 8 (State Textbook)"], tools: ["Answer questions", "Generate MCQs", "Identify gaps"], classes: ["cls-8b", "cls-8a"] },
  { id: "ait-newton", name: "Newton", kind: "ai-teacher", subject: "Science", avatarColor: "#1D6FB8", grade: "Grades 7–9", languages: ["English"], personality: "Curious, experiment-first", status: "approved", owner: "Greenfield International School", ownerType: "institution", version: "v1.4", usage: 9120, rating: 4.6, sources: ["Science Explorer Grade 8"], tools: ["Answer questions", "Teach", "Create practice tests"], classes: ["cls-8b"] },
  { id: "ait-kavya", name: "Kavya", kind: "ai-teacher", subject: "Hindi", avatarColor: "#C0262D", grade: "Grades 6–8", languages: ["Hindi", "English"], personality: "Warm storyteller", status: "awaiting-approval", owner: "Farah Siddiqui", ownerType: "teacher", version: "v0.3", usage: 0, rating: 0, sources: ["Vasant Grade 8"], tools: ["Answer questions", "Give feedback"], classes: [] },
];

export const GRADES = [{ id: "g5", label: "Grade 5" }, { id: "g6", label: "Grade 6" }, { id: "g7", label: "Grade 7" }, { id: "g8", label: "Grade 8" }, { id: "g9", label: "Grade 9" }, { id: "g10", label: "Grade 10" }];

export interface LearningObjectiveSeed { id: string; code: string; title: string; subjectId: string; gradeId: string; chapter: string; chapterId: string; competency: string }
export const CURRICULUM = { id: "cur-karuvana-2026", name: "Karuvana State Curriculum", version: "2026.1" };
export const OBJECTIVES: LearningObjectiveSeed[] = [
  { id: "lo-frac-add", code: "M8.3.1", title: "Add and subtract unlike fractions", subjectId: "sub-math", gradeId: "g8", chapter: "Fractions & Decimals", chapterId: "ch-m8-frac", competency: "Number sense" },
  { id: "lo-frac-mul", code: "M8.3.2", title: "Multiply and divide fractions", subjectId: "sub-math", gradeId: "g8", chapter: "Fractions & Decimals", chapterId: "ch-m8-frac", competency: "Number sense" },
  { id: "lo-frac-word", code: "M8.3.3", title: "Solve word problems with fractions", subjectId: "sub-math", gradeId: "g8", chapter: "Fractions & Decimals", chapterId: "ch-m8-frac", competency: "Problem solving" },
  { id: "lo-alg-lin", code: "M8.4.1", title: "Solve linear equations in one variable", subjectId: "sub-math", gradeId: "g8", chapter: "Linear Equations", chapterId: "ch-m8-lin", competency: "Algebraic reasoning" },
  { id: "lo-ratio", code: "M8.5.1", title: "Apply ratios and proportion", subjectId: "sub-math", gradeId: "g8", chapter: "Ratio & Proportion", chapterId: "ch-m8-ratio", competency: "Quantitative reasoning" },
  { id: "lo-eco-chain", code: "S8.2.1", title: "Trace energy flow in food chains", subjectId: "sub-sci", gradeId: "g8", chapter: "Ecosystems", chapterId: "ch-s8-eco", competency: "Systems thinking" },
  { id: "lo-eco-bal", code: "S8.2.2", title: "Explain ecological balance", subjectId: "sub-sci", gradeId: "g8", chapter: "Ecosystems", chapterId: "ch-s8-eco", competency: "Systems thinking" },
  { id: "lo-cell", code: "S8.3.1", title: "Compare plant and animal cells", subjectId: "sub-sci", gradeId: "g8", chapter: "Cell Structure", chapterId: "ch-s8-cell", competency: "Scientific inquiry" },
  { id: "lo-story", code: "E8.1.1", title: "Plan a narrative with a clear arc", subjectId: "sub-eng", gradeId: "g8", chapter: "Storycraft", chapterId: "ch-e8-story", competency: "Writing" },
  { id: "lo-anc", code: "H8.1.1", title: "Describe early river-valley civilisations", subjectId: "sub-soc", gradeId: "g8", chapter: "Ancient Civilisations", chapterId: "ch-h8-anc", competency: "Historical reasoning" },
  { id: "lo-py-loop", code: "C8.1.1", title: "Use loops to automate repeated tasks", subjectId: "sub-cs", gradeId: "g8", chapter: "Python Basics", chapterId: "ch-c8-py", competency: "Computational thinking" },
];
export const objectiveById = (id: string) => OBJECTIVES.find((o) => o.id === id);
