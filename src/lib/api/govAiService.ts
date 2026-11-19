import type { CommandResult, Interpretation, ProgrammeDraft, StateAgent } from "@/types/government";
import { STATE_AGENT_SEED, DISTRICTS, SRC, RESOURCES } from "../mock-data/government";
import { OBJECTIVES, CURRICULUM, AY } from "../mock-data/core";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { recordAudit } from "./govAudit";
import { districtsWith } from "./governmentService";

export const EXAMPLE_QUERIES = [
  { id: "q-gaps", text: "Which districts have the largest mathematics learning gaps?" },
  { id: "q-engage", text: "Show schools where engagement has declined." },
  { id: "q-remedial", text: "Which remedial programmes are improving outcomes?" },
  { id: "q-compare", text: "Compare baseline and follow-up results by district." },
  { id: "q-prepare", text: "Prepare a state-wide mathematics improvement programme." },
];
const classify = (t: string): string => {
  const s = t.toLowerCase();
  if (/(prepare|create|launch|draft|plan).*(programme|program)/.test(s) || /state-?wide.*programme/.test(s)) return "q-prepare";
  if (/engag|declin/.test(s)) return "q-engage";
  if (/remedial|improving outcome|intervention/.test(s)) return "q-remedial";
  if (/compare|follow-?up|baseline/.test(s)) return "q-compare";
  return "q-gaps";
};

const proposal = (): ProgrammeDraft => ({
  name: "State-wide Mathematics Improvement Programme", phase: "Phase 1", objective: "Close the largest Grade 6–8 mathematics gaps (fractions, ratio, linear equations) identified from the baseline, starting with districts below 55% proficiency, using diagnosed remedial support.",
  grades: ["g6", "g7", "g8"], subjects: ["sub-math"], objectiveIds: OBJECTIVES.filter((o) => o.subjectId === "sub-math").map((o) => o.id),
  resourceIds: RESOURCES.filter((r) => r.subjectId === "sub-math" && r.approval === "approved" && r.objectiveId).slice(0, 8).map((r) => r.id),
  baseline: { enabled: true, mandatory: true, curriculum: CURRICULUM.name, year: AY.label, windowDays: 14, questionCount: 25 },
  districtIds: DISTRICTS.filter((d) => d.mathsBaseline < 56).map((d) => d.id), institutionNote: "All institutions in selected districts; district officers may exclude institutions with incomplete data",
  interventions: [{ id: "ai-iv-1", title: "Diagnosed remedial course on fractions", kind: "remedial-course", status: "planned", audience: "Students below 40% on M8.3.x" }, { id: "ai-iv-2", title: "Weekly practice sets with feedback", kind: "practice-set", status: "planned", audience: "All targeted students" }],
  aiTeacherIds: [], start: "2027-02-01", end: "2027-07-31", participationTarget: 70, improvementTarget: 8, budget: 18_000_000,
});

const agents: StateAgent[] = structuredClone(STATE_AGENT_SEED);
const findA = (id: string) => { const a = agents.find((x) => x.id === id); if (!a) throw new ServiceError("Agent not found.", "unavailable"); return a; };

export const govAiService = {
  /** Step 1: interpret. Nothing is executed. */
  interpret: (text: string) => simulate((): Interpretation => {
    if (text.trim().length < 6) throw new ServiceError("Ask a fuller question, for example 'Which districts have the largest maths gaps?'", "validation");
    const id = classify(text);
    if (id === "q-prepare") return { queryId: id, readOnly: false, action: "Draft a state-wide mathematics improvement programme (proposal only)", scope: "Districts below 55% maths baseline proficiency, Grades 6–8", audience: "State Academic Council", approval: "Creating a draft does not launch anything. Launch needs explicit approval by an authorised official." };
    return { queryId: id, readOnly: true, action: "Analyse existing aggregate data (read-only)", scope: "All 12 demo districts, aggregate level. No student-level records and no private conversations are accessed.", audience: "You (state official)", approval: "Not required: read-only analysis." };
  }),
  /** Step 2: run after the official confirms the interpretation. */
  run: (queryId: string, query: string, low = false) => simulate((): CommandResult => {
    const ds = districtsWith(low);
    const base = { id: uid("cmd"), query, generatedAt: new Date().toISOString() };
    const partial = ds.filter((d) => d.dataStatus === "partial").map((d) => d.name);
    switch (queryId) {
      case "q-engage": {
        const dec = ds.filter((d) => d.engagement < d.engagementPrev).sort((a, b) => (b.engagementPrev - b.engagement) - (a.engagementPrev - a.engagement));
        return { ...base, summary: `Engagement fell in ${dec.length} of 12 districts over 30 days. The largest drop is in ${dec[0].name} (${dec[0].engagementPrev}% to ${dec[0].engagement}%). School-level detail is available only for institutions that have shared it with the state.`, chart: { kind: "bar", title: "Engagement change, last 30 days (pts)", unit: " pts", data: dec.map((d) => ({ label: d.name, value: d.engagement - d.engagementPrev })) }, table: { columns: ["District", "Previous %", "Current %", "Change"], rows: dec.map((d) => [d.name, d.engagementPrev, d.engagement, d.engagement - d.engagementPrev]) }, definitions: [{ term: "Engagement", text: "Share of enrolled students active on at least 3 days in the last 30 days." }], actions: [{ label: "Open Eastern Marches district", href: "/government/districts/eastern-marches" }, { label: "View learning gaps", href: "/government/learning-gaps" }], caveats: ["Cause is not established. A decline may reflect term breaks, connectivity or exams.", "Correlation is not causation."], sources: SRC.engagement };
      }
      case "q-remedial": return { ...base, summary: "Two programmes have follow-up data. Mission Maths Mastery shows an average +7 point change among participants and the Science Literacy Drive +8. Participants and non-participants differ, so these changes are associations, not proven programme effects.", chart: { kind: "bar", title: "Average change vs original baseline (pts)", unit: " pts", data: [{ label: "Science Literacy Drive", value: 8 }, { label: "Mission Maths Mastery", value: 7 }, { label: "Fractions remedial course", value: 6.4 }, { label: "Weekly practice sets", value: 4.1 }] }, table: { columns: ["Intervention", "Participants (demo)", "Avg change (pts)"], rows: [["Fractions remedial course", "412,000", 6.4], ["Weekly practice sets", "1,980,000", 4.1], ["Euler AI Teacher support", "310,000", 3.2]] }, definitions: [{ term: "Avg change", text: "Mean follow-up minus ORIGINAL baseline, in percentage points, among participants with both scores." }], actions: [{ label: "Open Mission Maths Mastery", href: "/government/programmes/prg-mission-maths" }, { label: "See intervention effectiveness", href: "/government/assessments" }], caveats: ["Not causal: no matched comparison group.", `Incomplete data: ${partial.join(" and ")} have partial follow-up data and are excluded from rankings.`], sources: SRC.followUp };
      case "q-compare": return { ...base, summary: `Follow-up 1 is complete in ${ds.filter((d) => d.followUp === "complete").length} of 12 districts. Maths proficiency rose by 3 to 11 points against the original baseline. Nilgiri Hills shows the smallest change (+3) and has ${low ? "41%" : "63%"} baseline coverage, so its comparison is less reliable.`, chart: { kind: "bar", title: "Maths proficiency: baseline vs follow-up 1 (%)", unit: "%", data: ds.map((d) => ({ label: d.name, value: d.mathsFollowUp })), compare: ds.map((d) => ({ label: d.name, value: d.mathsBaseline })) }, table: { columns: ["District", "Baseline %", "Follow-up %", "Change (pts)"], rows: ds.map((d) => [d.name, d.mathsBaseline, d.mathsFollowUp, d.improvement]) }, definitions: [{ term: "Baseline", text: "First mandatory assessment. Never overwritten by follow-ups." }, { term: "Follow-up 1", text: "First periodic assessment in Nov 2026, measured against the baseline." }], actions: [{ label: "Open the full report", href: "/government/reports" }, { label: "Open Baseline & Assessments", href: "/government/assessments" }], caveats: [`Incomplete data: ${partial.join(", ")}.`, "Different students may have completed each assessment. Coverage differences can affect comparisons."], sources: SRC.followUp };
      case "q-prepare": return { ...base, summary: "A draft state-wide programme is proposed for districts below 56% maths baseline proficiency, Grades 6–8, with a mandatory baseline, a fractions remedial course and weekly practice. This is a proposal only. Nothing has been created or launched.", chart: { kind: "bar", title: "Targeted districts: maths baseline (%)", unit: "%", data: ds.filter((d) => d.mathsBaseline < 56).map((d) => ({ label: d.name, value: d.mathsBaseline })) }, table: { columns: ["Element", "Proposal"], rows: [["Objective", "Close the largest Grade 6–8 maths gaps"], ["Audience", `${ds.filter((d) => d.mathsBaseline < 56).length} districts, Grades 6–8`], ["Baseline", "Mandatory, 25 questions, 14-day window"], ["Interventions", "Fractions remedial course; weekly practice sets"], ["Indicative budget", "INR 1.8 crore (demo estimate)"], ["Targets", "70% participation; +8 pts improvement"]] }, definitions: [{ term: "Proposal", text: "AI-suggested draft. Authorised officials and academic experts edit and approve." }], actions: [{ label: "Create draft programme", kind: "proposal" }], caveats: ["Budget and targets are illustrative estimates, not forecasts.", "Launch requires explicit human approval; AI cannot launch programmes."], sources: SRC.baseline, proposal: proposal() };
      default: {
        const top = [...ds].sort((a, b) => a.mathsBaseline - b.mathsBaseline).slice(0, 6);
        return { ...base, summary: `The largest mathematics gaps (lowest baseline proficiency) are in ${top.slice(0, 3).map((d) => d.name).join(", ")}. The widest objective-level gap is fractions (M8.3.1 to M8.3.3).${low ? " Nilgiri Hills has only 41% baseline coverage, so its true gap may differ." : ""}`, chart: { kind: "bar", title: "Maths baseline proficiency, lowest 6 districts (%)", unit: "%", data: top.map((d) => ({ label: d.name, value: d.mathsBaseline })) }, table: { columns: ["District", "Maths baseline %", "Baseline coverage %", "Data"], rows: top.map((d) => [d.name, d.mathsBaseline, d.baselineCoverage, d.dataStatus === "partial" ? "Partial" : "Complete"]) }, definitions: [{ term: "Learning gap", text: "Gap = 100 minus mean mastery on assessed maths objectives; shown here as baseline proficiency." }, { term: "Baseline coverage", text: "Share of enrolled students who completed the baseline." }], actions: [{ label: "Open learning gaps", href: "/government/learning-gaps" }, { label: "Prepare a programme", href: "/government/command-centre?q=prepare" }], caveats: [`Incomplete data: ${partial.join(", ")} have partial data.`, "Gaps are associations. Do not infer causes such as school quality from this table."], sources: SRC.baseline };
      }
    }
  }, { ms: 700 }),

  agents: () => simulate(() => [...agents]),
  agentAction: (id: string, action: "publish" | "approve" | "pause" | "resume" | "retire") => simulate(() => {
    const a = findA(id);
    if (action === "publish") { if (a.autonomy === "autonomous") a.status = "awaiting-approval"; else a.status = "published"; }
    if (action === "approve") { if (a.status !== "awaiting-approval") throw new ServiceError("Not awaiting approval.", "validation"); a.status = "published"; }
    if (action === "pause") { if (a.status !== "published") throw new ServiceError("Only published agents can pause.", "validation"); a.status = "paused"; }
    if (action === "resume") { if (a.status !== "paused") throw new ServiceError("Only paused agents can resume.", "validation"); a.status = "published"; }
    if (action === "retire") a.status = "retired";
    recordAudit({ action: `State agent: ${action}`, entity: a.name, entityType: "agent", detail: `Autonomy: ${a.autonomy}` });
    return a;
  }),
};
