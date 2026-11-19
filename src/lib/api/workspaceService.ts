import type { WorkspaceAnswer, Interpretation } from "@/types/institution";
import { simulate } from "./latency";
import { institutionService, metricsFor, type Ctx } from "./institutionService";
import { aiTeacherService } from "./aiTeacherService";
import { CLASS_ROWS, TEACHER_ACTIVITY } from "../mock-data/institution";
import { BRANCHES } from "../mock-data/core";
import { DEMO_NOW } from "../format";

export const SAMPLE_QUERIES = [
  { id: "compare", text: "Compare academic performance across branches this term" },
  { id: "completion", text: "Identify courses with low completion" },
  { id: "support", text: "Which classes have the most students needing support?" },
  { id: "workload", text: "Summarise teacher workload this week" },
  { id: "ai-usage", text: "Show AI Teacher usage and feedback" },
  { id: "lowperf", text: "Identify low-performing branches" },
];
const bn = (id: string) => BRANCHES.find((b) => b.id === id)?.name ?? id;
const RANGE = "1 Sep – 19 Nov 2026 (this term)";
const STAMP = DEMO_NOW.toISOString();
const COURSE_COMPLETION = [{ label: "Algebra Launchpad (marketplace)", value: 38 }, { label: "Python for Curious Beginners", value: 49 }, { label: "River Valley Civilisations", value: 57 }, { label: "Storycraft", value: 66 }, { label: "Ecosystems: Who Eats Whom?", value: 72 }, { label: "Fractions & Decimals", value: 78 }];

function classify(q: string): string | null {
  const s = q.toLowerCase();
  if (/low.?perform|struggling branch|weak(est)? branch|underperform/.test(s)) return "lowperf";
  if (/compar|across branch|performance/.test(s)) return "compare";
  if (/complet|course/.test(s)) return "completion";
  if (/support|struggl|need/.test(s)) return "support";
  if (/workload|teacher/.test(s)) return "workload";
  if (/ai teacher|usage|feedback|agent/.test(s)) return "ai-usage";
  return null;
}

export const workspaceService = {
  samples: () => SAMPLE_QUERIES,
  run: async (query: string, ctx: Ctx) => { const ts = await aiTeacherService.list(); return simulate((): WorkspaceAnswer => {
    const ms = metricsFor({ ...ctx, branch: "all" });
    const id = classify(query);
    const base = { id: id ?? "unknown", query, range: RANGE, sourceAt: STAMP };
    if (!id) return { ...base, summary: "I couldn't map that question to data this prototype holds. I won't guess. Try one of the sample questions or rephrase with a branch, class, subject or time period.", chart: [], unit: "", metrics: [], source: "No source matched", action: "Rephrase or pick a suggested question.", caveats: ["No matching dataset — no figures shown rather than invented ones."], drill: [] };
    if (id === "compare" || id === "lowperf") {
      const sorted = [...ms].sort((a, b) => a.avgScore - b.avgScore);
      const low = sorted[0], high = sorted[sorted.length - 1];
      const only = ms.length < 2;
      return { ...base, summary: only ? `${bn(low.branchId)} averages ${low.avgScore}% this term. This institution has one active branch, so there is nothing to compare across.` : id === "lowperf" ? `${bn(low.branchId)} is the lowest-performing branch: ${low.avgScore}% average score, ${low.engagement}% engagement (${low.engagementDelta >= 0 ? "+" : ""}${low.engagementDelta}% vs last month), ${low.completion}% course completion. ${bn(high.branchId)} leads at ${high.avgScore}%.` : `${bn(high.branchId)} leads at ${high.avgScore}% average; ${bn(low.branchId)} trails at ${low.avgScore}% (gap of ${high.avgScore - low.avgScore} points).`,
        chart: sorted.map((m) => ({ label: bn(m.branchId), value: m.avgScore, sub: `Engagement ${m.engagement}%` })), unit: "%",
        metrics: [{ name: "Average score", definition: "Mean of released assessment scores (0–100) this term, weighted by assessment marks." }, { name: "Engagement", definition: "Index of activity, streak and participation; not a measure of learning." }],
        source: "Assessment results + learning activity (demo data)", action: only ? "No cross-branch action available." : `Review ${bn(low.branchId)} classes and objective gaps, then raise an intervention for approval.`,
        caveats: ["Branches differ in grade mix and class size, so raw averages are not like-for-like.", "Correlation is not causation: lower scores alongside lower engagement do not show that one causes the other.", ...(ctx.declining ? ["Lakeside engagement fell 14% this month; assessment data covers only the last 3 assessments."] : [])],
        drill: ms.map((m) => ({ label: `Open ${bn(m.branchId)}`, branchId: m.branchId })), actionKind: "intervention" };
    }
    if (id === "completion") return { ...base, summary: `Lowest completion: ${COURSE_COMPLETION[0].label} (${COURSE_COMPLETION[0].value}%) and ${COURSE_COMPLETION[1].label} (${COURSE_COMPLETION[1].value}%). Marketplace-sourced and elective courses complete less often than core courses.`, chart: COURSE_COMPLETION, unit: "%", metrics: [{ name: "Completion", definition: "Students who finished every mandatory activity ÷ students enrolled for at least 14 days." }], source: "Course progress records (demo)", action: "Check pacing and mandatory-activity load of the two lowest courses with their teachers.", caveats: ["Students enrolled less than 14 days are excluded.", "Completion may be low because a course is optional, not because it is poor."], drill: [{ label: "Open Courses & Content" }] };
    if (id === "support") {
      const rows = CLASS_ROWS.filter((c) => (ctx.inst === "inst-meridian") === (c.branchId === "br-meridian-main")).sort((a, b) => b.support - a.support).slice(0, 6);
      return { ...base, summary: `${rows[0].name} (${bn(rows[0].branchId)}) has the most students needing support: ${rows[0].support} of ${rows[0].students}. The top ${rows.length} classes hold ${rows.reduce((s, r) => s + r.support, 0)} flagged students.`, chart: rows.map((r) => ({ label: r.name, value: r.support, sub: bn(r.branchId) })), unit: "", metrics: [{ name: "Needing support", definition: "Students below 50% mastery on two or more current objectives, or with two overdue assignments." }], source: "Mastery + submission data (demo)", action: "Raise a support plan for the top class and review the lowest objectives.", caveats: ["Flags are triggers for a teacher's judgement, not diagnoses.", "Class sizes differ; compare the share, not just the count."], drill: rows.slice(0, 3).map((r) => ({ label: `Open ${bn(r.branchId)}`, branchId: r.branchId })), actionKind: "intervention" };
    }
    if (id === "workload") {
      const rows = TEACHER_ACTIVITY.filter((t) => t.load > 0);
      return { ...base, summary: `${rows.filter((t) => t.load / t.limit >= 0.95).length} of ${rows.length} teachers are within 5% of their weekly limit. Highest: ${[...rows].sort((a, b) => b.load / b.limit - a.load / a.limit)[0].name}. One teacher is on leave and one Lakeside timetable has not synced, so Lakeside figures are incomplete.`, chart: rows.map((t) => ({ label: t.name, value: t.load, sub: `limit ${t.limit}` })), unit: " periods", metrics: [{ name: "Periods per week", definition: "Scheduled teaching periods in the published timetable for the current week." }], source: "Published timetable (North Campus complete; Lakeside partial)", action: "Review substitution cover for teachers near their limit.", caveats: ["Incomplete data: Lakeside timetable sync pending for 2 teachers.", "Workload excludes marking and preparation time."], drill: [{ label: "Open Timetable & Staff Allocation" }] };
    }
    const rows = ts.filter((t) => t.status === "approved" || t.status === "suspended");
    return { ...base, summary: `${rows.filter((t) => t.status === "approved").length} approved AI Teachers handled ${rows.reduce((s, t) => s + t.usage, 0).toLocaleString("en-IN")} sessions. Highest rated: ${[...rows].sort((a, b) => b.rating - a.rating)[0]?.name ?? "n/a"}. Usage is student-initiated and teacher-visible.`, chart: rows.map((t) => ({ label: `${t.name} (AI Teacher)`, value: t.usage, sub: `rating ${t.rating || "n/a"}` })), unit: " sessions", metrics: [{ name: "Sessions", definition: "Distinct student-AI Teacher conversations with at least 2 turns." }, { name: "Rating", definition: "Mean of 1–5 student feedback; small samples are noisy." }], source: "AI Teacher usage log + student feedback (demo)", action: "Review concerns on suspended AI Teachers before reinstating.", caveats: ["Ratings come from few students and may be biased towards those who respond.", "Suspended AI Teachers are shown for context but are not deployed."], drill: [{ label: "Open AI Teachers & Agents" }] };
  }, { ms: 700 }); },
  interpret: (text: string): Interpretation | null => {
    const s = text.toLowerCase().trim(); if (s.length < 6) return null;
    const scope = /lakeside/.test(s) ? "Lakeside Campus" : /north/.test(s) ? "North Campus" : /grade (\d+)/.exec(s) ? `Grade ${/grade (\d+)/.exec(s)![1]}` : "Whole institution";
    if (/remind|send|announce|notify|message/.test(s)) return { action: "Send communication", scope, audience: /parent|guardian/.test(s) ? "Parents / guardians" : /teacher|staff/.test(s) ? "Staff" : "Students", approval: "Required — communications to parents go to Governance approvals", summary: `Draft a message for ${scope} and queue it for approval.` };
    if (/suspend|pause|retire/.test(s)) return { action: "Suspend / pause (AI Teacher or agent)", scope, audience: "Teachers and students using it", approval: "Required — principal approval", summary: "Raise a suspension request; nothing is paused until approved." };
    if (/publish|marks|result/.test(s)) return { action: "Publish results", scope, audience: "Students and parents", approval: "Required — registrar + principal", summary: "Queue a publication request; marks stay private until approved." };
    if (/export|download/.test(s)) return { action: "Export data", scope, audience: "Requester only", approval: "Required — consent check", summary: "Raise an export request; consent is checked before release." };
    return { action: "Show data / run analysis", scope, audience: "You (read-only)", approval: "Not required — read only", summary: "Run the analysis and show results with definitions and caveats." };
  },
  instBranches: (inst: string) => institutionService.branches(inst),
};
