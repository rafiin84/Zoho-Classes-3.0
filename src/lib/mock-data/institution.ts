import type { BranchMetrics, HierarchyNode, BranchRecord, DepartmentRecord, DirectoryPerson, Membership, ReportDef, ObjectiveGap } from "@/types/institution";
import { STUDENTS, TEACHERS, PARENTS, OBJECTIVES, SUBJECTS } from "./core";
import { ago } from "@/lib/format";

export const INSTITUTION_NAMES: Record<string, string> = { "inst-greenfield": "Greenfield International School", "inst-meridian": "Meridian University" };

export const METRICS_BASE: Record<string, BranchMetrics> = {
  "br-north": { branchId: "br-north", engagement: 78, engagementDelta: 2, attendance: 94, completion: 71, avgScore: 74, support: 118, aiUsage: 3420, interventions: 9 },
  "br-lakeside": { branchId: "br-lakeside", engagement: 71, engagementDelta: 1, attendance: 90, completion: 58, avgScore: 66, support: 142, aiUsage: 1980, interventions: 11 },
  "br-meridian-main": { branchId: "br-meridian-main", engagement: 72, engagementDelta: -1, attendance: 88, completion: 64, avgScore: 69, support: 410, aiUsage: 5200, interventions: 18 },
};
export const TREND_MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
export const TREND: Record<string, number[]> = {
  "br-north": [72, 74, 75, 76, 77, 78], "br-lakeside": [70, 71, 72, 72, 71, 71], "br-meridian-main": [70, 71, 71, 73, 72, 72],
};
export const TREND_DECLINING: Record<string, number[]> = { ...TREND, "br-lakeside": [74, 75, 76, 78, 74, 64] };

export const CLASS_ROWS = [
  { id: "cls-8b", branchId: "br-north", name: "Grade 8 · B", students: 41, score: 76, engagement: 82, attendance: 95, completion: 74, support: 7 },
  { id: "cls-8a", branchId: "br-north", name: "Grade 8 · A", students: 40, score: 73, engagement: 77, attendance: 93, completion: 70, support: 9 },
  { id: "cls-7a", branchId: "br-north", name: "Grade 7 · A", students: 38, score: 75, engagement: 79, attendance: 94, completion: 72, support: 6 },
  { id: "cls-5a", branchId: "br-north", name: "Grade 5 · A", students: 36, score: 78, engagement: 85, attendance: 96, completion: 77, support: 3 },
  { id: "cls-9c", branchId: "br-lakeside", name: "Grade 9 · C", students: 44, score: 63, engagement: 66, attendance: 89, completion: 54, support: 19 },
  { id: "cls-9a", branchId: "br-lakeside", name: "Grade 9 · A", students: 42, score: 67, engagement: 72, attendance: 91, completion: 60, support: 14 },
  { id: "cls-7c", branchId: "br-lakeside", name: "Grade 7 · C", students: 39, score: 68, engagement: 74, attendance: 92, completion: 62, support: 11 },
  { id: "cls-6b", branchId: "br-lakeside", name: "Grade 6 · B", students: 37, score: 69, engagement: 73, attendance: 90, completion: 59, support: 10 },
  { id: "cls-cs1", branchId: "br-meridian-main", name: "B.Sc. CS · Year 1", students: 120, score: 68, engagement: 71, attendance: 87, completion: 62, support: 41 },
  { id: "cls-me2", branchId: "br-meridian-main", name: "B.Tech Mechanical · Year 2", students: 110, score: 66, engagement: 70, attendance: 86, completion: 60, support: 52 },
  { id: "cls-ba3", branchId: "br-meridian-main", name: "B.A. Economics · Year 3", students: 90, score: 74, engagement: 76, attendance: 91, completion: 70, support: 18 },
];
export const SUBJECT_SCORES: Record<string, Record<string, number>> = {
  "br-north": { "sub-math": 74, "sub-sci": 78, "sub-eng": 76, "sub-soc": 72, "sub-hin": 71, "sub-cs": 79 },
  "br-lakeside": { "sub-math": 59, "sub-sci": 68, "sub-eng": 70, "sub-soc": 66, "sub-hin": 64, "sub-cs": 72 },
  "br-meridian-main": { "sub-math": 64, "sub-sci": 70, "sub-eng": 73, "sub-soc": 69, "sub-hin": 66, "sub-cs": 75 },
};
export const objectiveGaps = (branchId: string): ObjectiveGap[] => OBJECTIVES.map((o, i) => {
  const base = SUBJECT_SCORES[branchId]?.[o.subjectId] ?? 68;
  const mastery = Math.max(28, Math.min(92, base + ((i * 7) % 17) - 9 - (o.id === "lo-frac-add" && branchId === "br-lakeside" ? 12 : 0)));
  return { objectiveId: o.id, label: o.title, subject: SUBJECTS.find((s) => s.id === o.subjectId)?.name ?? "", mastery, students: Math.round((100 - mastery) * (branchId === "br-lakeside" ? 3.4 : 2.6)) };
}).sort((a, b) => a.mastery - b.mastery);
export const TEACHER_ACTIVITY = TEACHERS.map((t, i) => ({ id: t.id, name: `${t.title} ${t.displayName}`, department: t.departmentName, load: [24, 27, 22, 25, 20, 0][i], limit: t.workloadLimit, graded: [64, 48, 71, 39, 52, 0][i], aiAssist: [18, 9, 22, 6, 31, 0][i], branchId: t.branchIds[0] }));

export const HIERARCHY: Record<string, HierarchyNode> = {
  "inst-greenfield": { id: "inst-greenfield", kind: "institution", name: "Greenfield International School", students: 2040, children: [
    { id: "br-north", kind: "branch", name: "North Campus", students: 1180, lead: "Mr. Vikram Shah", children: [
      { id: "dep-math", kind: "department", name: "Mathematics", lead: "Mrs. Priya Nair", children: [
        { id: "g8", kind: "grade", name: "Grade 8", students: 81, children: [
          { id: "cls-8a", kind: "section", name: "8A", students: 40, children: [{ id: "lg-8a-rob", kind: "group", name: "Robotics club (learning group)", students: 14 }] },
          { id: "cls-8b", kind: "section", name: "8B", students: 41, children: [{ id: "lg-8b-rem", kind: "group", name: "Fractions remedial group", students: 8 }, { id: "lg-8b-ext", kind: "group", name: "Maths Olympiad stretch group", students: 10 }, { id: "lg-8b-rob", kind: "group", name: "Robotics club (learning group)", students: 12 }] },
        ] },
        { id: "g7", kind: "grade", name: "Grade 7", students: 38, children: [{ id: "cls-7a", kind: "section", name: "7A", students: 38 }] },
      ] },
      { id: "dep-sci", kind: "department", name: "Science", lead: "Mr. Daniel Okafor", children: [{ id: "g5", kind: "grade", name: "Grade 5", students: 36, children: [{ id: "cls-5a", kind: "section", name: "5A", students: 36 }] }] },
    ] },
    { id: "br-lakeside", kind: "branch", name: "Lakeside Campus", students: 860, lead: "Ms. Radhika Rao", children: [
      { id: "dep-lk-sci", kind: "department", name: "Science & Maths", lead: "Mr. Sameer Bhatt", children: [
        { id: "g9", kind: "grade", name: "Grade 9", students: 86, children: [{ id: "cls-9a", kind: "section", name: "9A", students: 42 }, { id: "cls-9c", kind: "section", name: "9C", students: 44, children: [{ id: "lg-9c-lab", kind: "group", name: "Science lab pairs", students: 16 }] }] },
      ] },
    ] },
  ] },
  "inst-meridian": { id: "inst-meridian", kind: "institution", name: "Meridian University", students: 5400, children: [
    { id: "br-meridian-main", kind: "branch", name: "Main Campus", students: 5400, lead: "Prof. Alan D'Souza", children: [
      { id: "dep-eng", kind: "department", name: "School of Engineering", lead: "Prof. Hema Raghavan", children: [
        { id: "prog-cs", kind: "grade", name: "B.Sc. Computer Science", students: 360, children: [{ id: "cls-cs1", kind: "section", name: "Year 1 · Section A", students: 120, children: [{ id: "lg-cs-lab", kind: "group", name: "Data structures lab batch 2", students: 30 }] }] },
        { id: "prog-me", kind: "grade", name: "B.Tech Mechanical", students: 330, children: [{ id: "cls-me2", kind: "section", name: "Year 2 · Section B", students: 110 }] },
      ] },
      { id: "dep-arts", kind: "department", name: "School of Arts & Economics", lead: "Prof. Meenal Kapoor", children: [{ id: "prog-eco", kind: "grade", name: "B.A. Economics", students: 270, children: [{ id: "cls-ba3", kind: "section", name: "Year 3", students: 90 }] }] },
    ] },
  ] },
};

export const BRANCH_SEED: BranchRecord[] = [
  { id: "br-north", institutionId: "inst-greenfield", name: "North Campus", city: "Kaveripuram", head: "Mr. Vikram Shah", students: 1180, teachers: 64, status: "active", inherit: { grading: true, calendar: true, feePolicy: true, aiPolicy: true }, code: "GF-N" },
  { id: "br-lakeside", institutionId: "inst-greenfield", name: "Lakeside Campus", city: "Kaveripuram", head: "Ms. Radhika Rao", students: 860, teachers: 49, status: "active", inherit: { grading: true, calendar: false, feePolicy: true, aiPolicy: true }, code: "GF-L" },
  { id: "br-meridian-main", institutionId: "inst-meridian", name: "Main Campus", city: "Nilgiri Town", head: "Prof. Alan D'Souza", students: 5400, teachers: 310, status: "active", inherit: { grading: true, calendar: true, feePolicy: true, aiPolicy: true }, code: "MU-M" },
];
export const DEPT_SEED: DepartmentRecord[] = [
  { id: "dep-math", institutionId: "inst-greenfield", branchId: "br-north", name: "Mathematics", head: "Mrs. Priya Nair", programmes: 3, status: "active" },
  { id: "dep-sci", institutionId: "inst-greenfield", branchId: "all", name: "Science", head: "Mr. Daniel Okafor", programmes: 4, status: "active" },
  { id: "dep-eng", institutionId: "inst-greenfield", branchId: "br-north", name: "Languages", head: "Ms. Farah Siddiqui", programmes: 3, status: "active" },
  { id: "dep-cs", institutionId: "inst-greenfield", branchId: "br-north", name: "Computing & Robotics", head: "Dr. Leela Krishnan", programmes: 2, status: "active" },
  { id: "dep-soc", institutionId: "inst-greenfield", branchId: "br-lakeside", name: "Humanities", head: "Mr. Arjun Menon", programmes: 2, status: "active" },
  { id: "dep-u-eng", institutionId: "inst-meridian", branchId: "br-meridian-main", name: "School of Engineering", head: "Prof. Hema Raghavan", programmes: 6, status: "active" },
  { id: "dep-u-arts", institutionId: "inst-meridian", branchId: "br-meridian-main", name: "School of Arts & Economics", head: "Prof. Meenal Kapoor", programmes: 5, status: "active" },
];

const FIRST = ["Aarav", "Diya", "Ishaan", "Kiara", "Rehan", "Navya", "Aditya", "Saanvi", "Yash", "Myra", "Harsh", "Anika", "Kavin", "Tanvi", "Neil", "Pooja", "Omar", "Riya", "Suhas", "Lavanya", "Farhan", "Mitali"];
const LAST = ["Sharma", "Reddy", "Nair", "Iyer", "Khan", "Das", "Pillai", "Menon", "Joseph", "Singh", "Rao", "Verma"];
const pick = <T,>(a: T[], i: number) => a[i % a.length];
const GF_CLASSES = [["br-north", "Grade 8 · B"], ["br-north", "Grade 8 · A"], ["br-north", "Grade 7 · A"], ["br-north", "Grade 5 · A"], ["br-lakeside", "Grade 9 · C"], ["br-lakeside", "Grade 9 · A"], ["br-lakeside", "Grade 7 · C"], ["br-lakeside", "Grade 6 · B"]];
const MU_CLASSES = ["B.Sc. CS · Year 1", "B.Tech Mechanical · Year 2", "B.A. Economics · Year 3"];
export const PEOPLE: DirectoryPerson[] = [
  ...STUDENTS.map((s): DirectoryPerson => ({ id: s.id, kind: "student", name: s.displayName, institutionId: "inst-greenfield", branchId: "br-north", unit: s.className ? `Grade ${s.gradeLabel.replace("Grade ", "")} · ${s.className.slice(-1)}` : s.gradeLabel, role: "Student", status: s.status === "alumni" ? "alumni" : "active", email: `${s.id.replace("stu-", "")}@students.greenfield.example`, joined: "2024-06-10", groups: s.membershipIds.length ? ["Class", "Club"] : [] })),
  ...Array.from({ length: 52 }, (_, i): DirectoryPerson => { const [b, c] = GF_CLASSES[i % GF_CLASSES.length]; const n = `${pick(FIRST, i)} ${pick(LAST, i * 3 + 1)}`; return { id: `stu-gen-${i}`, kind: "student", name: n, institutionId: "inst-greenfield", branchId: b, unit: c, role: "Student", status: i % 17 === 0 ? "alumni" : "active", email: `${n.toLowerCase().replace(" ", ".")}@students.greenfield.example`, joined: `202${3 + (i % 3)}-06-1${i % 9}`, groups: ["Class", ...(i % 3 === 0 ? ["Club"] : [])] }; }),
  ...Array.from({ length: 36 }, (_, i): DirectoryPerson => { const n = `${pick(FIRST, i + 5)} ${pick(LAST, i * 5 + 2)}`; return { id: `stu-mu-${i}`, kind: "student", name: n, institutionId: "inst-meridian", branchId: "br-meridian-main", unit: pick(MU_CLASSES, i), role: "Student", status: i % 12 === 0 ? "alumni" : "active", email: `${n.toLowerCase().replace(" ", ".")}@meridian.example`, joined: `202${2 + (i % 4)}-08-01`, groups: ["Class"] }; }),
  ...TEACHERS.map((t): DirectoryPerson => ({ id: t.id, kind: "teacher", name: `${t.title} ${t.displayName}`, institutionId: "inst-greenfield", branchId: t.branchIds[0], unit: t.departmentName, role: "Teacher", status: t.status === "on-leave" ? "on-leave" : "active", email: `${t.displayName.split(" ")[0].toLowerCase()}@greenfield.example`, joined: "2021-04-01", groups: t.classIds, extra: t.employeeCode })),
  ...Array.from({ length: 10 }, (_, i): DirectoryPerson => { const n = `Prof. ${pick(FIRST, i + 9)} ${pick(LAST, i + 4)}`; return { id: `tch-mu-${i}`, kind: "teacher", name: n, institutionId: "inst-meridian", branchId: "br-meridian-main", unit: i % 2 ? "School of Engineering" : "School of Arts & Economics", role: "Faculty", status: "active", email: `faculty${i}@meridian.example`, joined: "2019-07-01", groups: [] }; }),
  ...[["Rekha Pillai", "Finance officer", "Accounts"], ["Anita Desai", "Principal", "Administration"], ["Vikram Shah", "Branch head", "North Campus"], ["Radhika Rao", "Branch head", "Lakeside Campus"], ["Sunil Kumar", "Registrar", "Exam office"], ["Meghna Das", "Counsellor", "Student support"], ["Imran Ali", "IT administrator", "IT"], ["Lata Menon", "Librarian", "Library"]].map(([n, r, u], i): DirectoryPerson => ({ id: `stf-${i}`, kind: "staff", name: n, institutionId: "inst-greenfield", branchId: i === 3 ? "br-lakeside" : "br-north", unit: u, role: r, status: i === 6 ? "invited" : "active", email: `${n.split(" ")[0].toLowerCase()}@greenfield.example`, joined: "2020-01-15", groups: [] })),
  ...PARENTS.map((p): DirectoryPerson => ({ id: p.id, kind: "parent", name: p.displayName, institutionId: "inst-greenfield", branchId: "br-north", unit: `Guardian of ${p.childIds.length} students`, role: "Parent / guardian", status: p.verification === "verified" ? "verified" : "pending-verification", email: "rohan.rao@mail.example", joined: "2024-06-12", groups: [], extra: "stu-ananya, stu-vihaan" })),
  ...["Neha Joseph", "Anil Mehta", "Lakshmi Iyer", "Imran Khan", "Sunita Malhotra", "Arif Qureshi"].map((n, i): DirectoryPerson => ({ id: `par-gen-${i}`, kind: "parent", name: n, institutionId: "inst-greenfield", branchId: i % 2 ? "br-lakeside" : "br-north", unit: "Guardian of 1 student", role: "Parent / guardian", status: (["verified", "pending-verification", "limited", "verified", "pending-verification", "verified"] as const)[i], email: `${n.split(" ")[0].toLowerCase()}@mail.example`, joined: "2025-06-10", groups: [] })),
];

export const MEMBERSHIPS: Membership[] = [
  { id: "m-1", personId: "stu-ananya", personName: "Ananya Rao", groupId: "cls-8b", groupName: "Grade 8 · B (class)", kind: "class", start: "2026-06-10", state: "active" },
  { id: "m-2", personId: "stu-ananya", personName: "Ananya Rao", groupId: "lg-8b-rob", groupName: "Robotics club", kind: "club", start: "2026-07-01", state: "active" },
  { id: "m-3", personId: "stu-ananya", personName: "Ananya Rao", groupId: "lg-house", groupName: "Blue House", kind: "house", start: "2024-06-10", state: "active" },
  { id: "m-4", personId: "stu-ananya", personName: "Ananya Rao", groupId: "lg-8b-ext", groupName: "Maths Olympiad stretch group", kind: "learning-group", start: "2026-08-05", state: "active" },
  { id: "m-5", personId: "stu-ananya", personName: "Ananya Rao", groupId: "co-eco", groupName: "Ecosystems course cohort", kind: "course-cohort", start: "2026-09-01", state: "active" },
  { id: "m-6", personId: "stu-ananya", personName: "Ananya Rao", groupId: "co-story", groupName: "Storycraft course cohort", kind: "course-cohort", start: "2026-09-15", state: "active" },
  { id: "m-7", personId: "stu-ananya", personName: "Ananya Rao", groupId: "lg-debate", groupName: "Inter-house debate squad", kind: "learning-group", start: "2026-10-01", end: "2026-12-20", state: "active" },
  { id: "m-8", personId: "stu-ananya", personName: "Ananya Rao", groupId: "lg-sci-fair", groupName: "Science exhibition team", kind: "learning-group", start: "2026-10-15", end: "2026-12-01", state: "active" },
  { id: "m-9", personId: "stu-ananya", personName: "Ananya Rao", groupId: "lg-8-prev", groupName: "Grade 7 · A (class)", kind: "class", start: "2025-06-10", end: "2026-05-31", state: "ended" },
  { id: "m-10", personId: "stu-ananya", personName: "Ananya Rao", groupId: "lg-quiz-2027", groupName: "State quiz prep (from Jan 2027)", kind: "learning-group", start: "2027-01-05", state: "scheduled" },
  { id: "m-11", personId: "stu-kabir", personName: "Kabir Mehta", groupId: "cls-8b", groupName: "Grade 8 · B (class)", kind: "class", start: "2026-06-10", state: "active" },
  { id: "m-12", personId: "stu-kabir", personName: "Kabir Mehta", groupId: "lg-8b-rem", groupName: "Fractions remedial group", kind: "remedial", start: "2026-10-12", end: "2026-12-12", state: "active" },
];

const R = (id: string, group: string, title: string, desc: string, metrics: string[], chart: ReportDef["chart"], filters: string[] = ["Branch", "Grade", "Date range"], unit = "%"): ReportDef => ({ id, group, title, desc, filters, metrics, chart, drill: ["Branch", "Class", "Student cohort"], unit });
export const REPORT_DEFS: ReportDef[] = [
  R("rp-perf-branch", "Academic performance", "Branch performance comparison", "Average score and pass rate by branch for the selected term.", ["Average score", "Pass rate", "Top-quartile share"], "bar"),
  R("rp-perf-subject", "Academic performance", "Subject & grade performance", "Subject averages by grade with year-on-year change.", ["Average score", "Change vs last year"], "bar", ["Grade", "Subject", "Date range"]),
  R("rp-assess", "Assessment & grading", "Assessment & grading turnaround", "Time from submission to released grade, with AI-suggestion override rate.", ["Median turnaround (days)", "AI override rate", "Pending reviews"], "line", ["Branch", "Subject", "Date range"], " d"),
  R("rp-attend", "Attendance", "Attendance & absence patterns", "Daily attendance with chronic-absence flags.", ["Attendance rate", "Chronic absentees"], "line"),
  R("rp-course", "Course progress/completion", "Course completion by class", "Share of enrolled students completing courses.", ["Completion rate", "Average time to complete"], "bar", ["Branch", "Course", "Date range"]),
  R("rp-engage", "Student engagement", "Student engagement index", "Combined activity, streak and participation signal. A guide, not a grade.", ["Engagement index", "Weekly active students"], "line"),
  R("rp-workload", "Teacher workload/activity", "Teacher workload this term", "Periods per week against workload limits, plus grading load.", ["Periods per week", "Load vs limit", "Items graded"], "bar", ["Branch", "Department", "Date range"], ""),
  R("rp-fees", "Fees & collections", "Fee collections summary", "Collected vs assessed by branch, grade and head. Institutional fees only.", ["Collected", "Outstanding", "Overdue accounts"], "bar", ["Branch", "Grade", "Fee head", "Date range"], " ₹"),
  R("rp-tt", "Timetable & staff allocation", "Timetable & staff allocation", "Room usage, clashes and substitutions.", ["Room utilisation", "Open clashes", "Substitutions"], "table", ["Branch", "Week"], "%"),
  R("rp-obe", "CO-PO attainment", "CO-PO attainment", "Course-outcome to programme-outcome attainment against targets.", ["CO attainment", "PO attainment", "Gap to target"], "bar", ["Programme", "Course", "Academic year"]),
  R("rp-ai", "AI Teacher/agent usage", "AI Teacher & agent usage", "Sessions, satisfaction, escalations and agent runs. AI use is always human-governed.", ["Sessions", "Avg rating", "Escalations to teacher", "Agent runs"], "bar", ["Branch", "AI Teacher", "Date range"], ""),
  R("rp-events", "Events & extracurricular", "Events & extracurricular participation", "Registrations and attendance across events, clubs and competitions.", ["Registrations", "Participation rate"], "donut", ["Branch", "Event type", "Date range"], ""),
];
export const DEMO_AGO = ago;
