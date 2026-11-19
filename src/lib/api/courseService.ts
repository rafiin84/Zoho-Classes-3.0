import type { Course, CourseOrder, LearningActivity, CourseModule } from "@/types";
import { COURSES, MODULES, ACTIVITIES, ASSIGNMENTS } from "../mock-data/content";
import { COURSE_ORDERS } from "../mock-data/finance";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { track } from "../analytics";

const courses: Course[] = structuredClone(COURSES);
const modules: CourseModule[] = structuredClone(MODULES);
const activities: LearningActivity[] = structuredClone(ACTIVITIES);
const orders: CourseOrder[] = structuredClone(COURSE_ORDERS);
// progress[studentId][courseId] = completed activity ids
const progress: Record<string, Record<string, string[]>> = {
  "stu-ananya": { "crs-fractions": ["act-fr-1", "act-fr-2", "act-fr-3", "act-fr-4", "act-fr-5"], "crs-ecosystems": ["act-eco-1", "act-eco-2", "act-eco-3", "act-eco-4", "act-eco-5"], "crs-storycraft": [] },
  "stu-kabir": { "crs-fractions": ["act-fr-1", "act-fr-2", "act-fr-3", "act-fr-4"], "crs-ecosystems": ["act-eco-1"] },
  "stu-meera": {},
  "stu-vihaan": {},
};
const enrolled: Record<string, Set<string>> = {
  "stu-ananya": new Set(["crs-fractions", "crs-ecosystems", "crs-storycraft", "crs-ancient"]),
  "stu-kabir": new Set(["crs-fractions", "crs-ecosystems"]),
  "stu-meera": new Set(["crs-fractions"]),
  "stu-vihaan": new Set([]),
};

export type CourseWithState = Course & { enrolled: boolean; owned: boolean; progressPct: number; completedCount: number; totalActivities: number; nextActivityId?: string };
const withState = (c: Course, studentId: string): CourseWithState => {
  const acts = activities.filter((a) => a.courseId === c.id).sort((a, b) => modules.find((m) => m.id === a.moduleId)!.sequence - modules.find((m) => m.id === b.moduleId)!.sequence || a.sequence - b.sequence);
  const done = progress[studentId]?.[c.id] ?? [];
  const paidOwned = c.priceType === "paid" ? orders.some((o) => o.studentId === studentId && o.courseId === c.id && o.entitlementStatus === "active") : true;
  const isEnrolled = (enrolled[studentId]?.has(c.id) ?? false) && paidOwned;
  const total = acts.length || c.lessonCount;
  return { ...c, enrolled: isEnrolled, owned: paidOwned, completedCount: done.length, totalActivities: acts.length, progressPct: acts.length ? Math.round((done.length / acts.length) * 100) : 0, nextActivityId: acts.find((a) => !done.includes(a.id))?.id ?? undefined, ...(total ? {} : {}) };
};

export const courseService = {
  list: (studentId: string) => simulate(() => courses.map((c) => withState(c, studentId)), { failKey: "courses" }),
  get: (id: string, studentId: string) => simulate(() => { const c = courses.find((x) => x.id === id); if (!c) throw new ServiceError("Course not found", "unavailable"); return withState(c, studentId); }),
  /** Completed activity ids for a student in a course (used by the learning path and player). */
  completed: (studentId: string, courseId: string) => simulate(() => [...(progress[studentId]?.[courseId] ?? [])], { ms: 60 }),
  structure: (id: string) => simulate(() => ({ modules: modules.filter((m) => m.courseId === id).sort((a, b) => a.sequence - b.sequence), activities: activities.filter((a) => a.courseId === id).sort((a, b) => a.sequence - b.sequence) })),
  /** Teacher builder: replace the authored structure; the student player renders the same arrays. */
  saveStructure: (id: string, mods: CourseModule[], acts: LearningActivity[]) => simulate(() => {
    for (let i = modules.length - 1; i >= 0; i--) if (modules[i].courseId === id) modules.splice(i, 1);
    for (let i = activities.length - 1; i >= 0; i--) if (activities[i].courseId === id) activities.splice(i, 1);
    modules.push(...mods); activities.push(...acts);
    const c = courses.find((x) => x.id === id); if (c) { c.version += 1; c.moduleCount = mods.length; c.lessonCount = acts.length; }
    return true;
  }),
  setStatus: (id: string, status: Course["status"]) => simulate(() => { const c = courses.find((x) => x.id === id)!; c.status = status; return c; }),
  /** Teacher builder: edit course metadata (additive). */
  updateMeta: (id: string, patch: Partial<Pick<Course, "title" | "description" | "subjectId" | "gradeIds" | "language" | "outcomes">>) => simulate(() => { const c = courses.find((x) => x.id === id); if (!c) throw new ServiceError("Course not found", "unavailable"); Object.assign(c, patch); return c; }),
  create: (c: Partial<Course> & { title: string; subjectId: string }) => simulate(() => { const n: Course = { id: uid("crs"), description: "", gradeIds: ["g8"], creatorName: "Priya Nair", creatorKind: "teacher", institutionId: "inst-greenfield", priceType: "free", price: 0, currency: "INR", durationMinutes: 0, moduleCount: 0, lessonCount: 0, rating: 0, ratings: 0, language: "English", status: "draft", version: 1, cover: { from: "#5146E5", to: "#B8B5FF", icon: "BookBookmark" }, labels: [], outcomes: [], kind: "institution", ...c }; courses.unshift(n); return n; }),
  enrol: (studentId: string, courseId: string) => simulate(() => { const c = courses.find((x) => x.id === courseId)!; if (c.priceType === "paid" && !orders.some((o) => o.studentId === studentId && o.courseId === courseId && o.entitlementStatus === "active")) throw new ServiceError("This is a paid course — purchase it to enrol.", "permission"); (enrolled[studentId] ??= new Set()).add(courseId); track("course_started", { courseId }); return withState(c, studentId); }),
  completeActivity: (studentId: string, courseId: string, activityId: string) => simulate(() => {
    const p = ((progress[studentId] ??= {})[courseId] ??= []);
    if (!p.includes(activityId)) p.push(activityId);
    const c = withState(courses.find((x) => x.id === courseId)!, studentId);
    if (c.progressPct === 100) track("course_completed", { courseId });
    return c;
  }, { ms: 120 }),
  // --- paid course commerce (separate from institutional fees) ---
  orders: (studentId: string) => simulate(() => orders.filter((o) => o.studentId === studentId)),
  allOrders: () => simulate(() => orders),
  purchase: (studentId: string, courseId: string, outcome: "success" | "pending" | "failed" = "success") => simulate(() => {
    const c = courses.find((x) => x.id === courseId)!;
    const status = outcome === "success" ? "Successful" : outcome === "pending" ? "Pending" : "Failed";
    const o: CourseOrder = { id: uid("ord"), studentId, courseId, sellerName: c.creatorName.replace(" (creator)", ""), amount: c.price, currency: "INR", licenceType: `Individual · ${c.accessDays ?? 365} days`, status, entitlementStatus: status === "Successful" ? "active" : "none", receiptReference: `DEMO-ORD-${Math.floor(1000 + Math.random() * 9000)}`, at: new Date().toISOString() };
    orders.unshift(o);
    if (status === "Successful") { (enrolled[studentId] ??= new Set()).add(courseId); track("course_purchased", { courseId }); }
    track("payment_simulated", { domain: "course", status });
    return o;
  }, { ms: 700 }),
  refreshOrder: (orderId: string) => simulate(() => { const o = orders.find((x) => x.id === orderId)!; if (o.status === "Pending") { o.status = "Successful"; o.entitlementStatus = "active"; (enrolled[o.studentId] ??= new Set()).add(o.courseId); } return o; }),
  assignments: () => simulate(() => ASSIGNMENTS),
};
