import type { ActionPreview, AgentEffects, AgentRecord, AgentRun, AgentStatus, AutonomyLevel } from "@/types/teacher";
import { AGENT_SEED, RUN_SEED } from "../mock-data/agents";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";

/**
 * Agents & automations. BYOK only — no Zoho-owned AI provider; keys are masked demo labels. Nothing real is called.
 * Shared by Teacher, Institution and Government screens. Autonomy policy: Autonomous may only act on pre-authorised low-risk work;
 * grades, official publications, fees, student records and statewide programmes ALWAYS require explicit human review (see `approvalReasons`).
 */
const agents: AgentRecord[] = structuredClone(AGENT_SEED);
const runs: AgentRun[] = structuredClone(RUN_SEED);
const find = (id: string) => { const a = agents.find((x) => x.id === id); if (!a) throw new ServiceError("Agent not found", "unavailable"); return a; };
const audit = () => `AUD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const PROVIDERS = [
  { id: "openai", label: "OpenAI / ChatGPT", model: "ChatGPT (demo)" }, { id: "gemini", label: "Google Gemini", model: "Gemini (demo)" }, { id: "claude", label: "Anthropic Claude", model: "Claude (demo)" },
  { id: "deepseek", label: "DeepSeek", model: "DeepSeek (demo)" }, { id: "other", label: "Other (bring your own endpoint)", model: "Custom model (demo)" },
] as const;

/** Reasons a run needs human review regardless of autonomy. Exported so other roles show identical policy copy. */
export function approvalReasons(effects: AgentEffects, autonomy: AutonomyLevel): string[] {
  const r: string[] = [];
  if (effects.grades) r.push("Grades always require explicit teacher review");
  if (effects.publishes) r.push("Official publications always require explicit review");
  if (effects.touchesFees) r.push("Fee-related actions always require explicit review");
  if (effects.changesRecord) r.push("Student record changes always require explicit review");
  if (effects.statewide) r.push("Statewide programmes always require explicit review");
  if (autonomy === "suggest") r.push("Suggest level only proposes — a person performs the action");
  if (autonomy === "assist") r.push("Assist level prepares work and waits for approval");
  return r;
}
export const AUTONOMY_COPY: Record<AutonomyLevel, string> = {
  suggest: "Suggest — proposes ideas only; you do everything.",
  assist: "Assist — prepares the work and requires your approval before anything happens.",
  autonomous: "Autonomous — acts alone only for pre-authorised low-risk tasks within limits. Grades, official publications, fees, student records and statewide programmes still require explicit review.",
};

/** Mock natural-language parsing into configured fields. Deterministic keyword rules. */
export function parseDescription(nl: string): Partial<AgentRecord> & { name: string; notes: string[] } {
  const t = nl.toLowerCase(); const notes: string[] = [];
  const tools: string[] = []; const scope: string[] = []; const effects: AgentEffects = { publishes: false, grades: false, notifies: false, changesRecord: false, touchesFees: false, statewide: false };
  if (/lesson|plan/.test(t)) { tools.push("Draft lesson plan"); scope.push("Course structure"); effects.publishes = true; }
  if (/practice|test|quiz|mcq/.test(t)) { tools.push("Generate MCQs"); scope.push("Question bank"); effects.publishes = true; }
  if (/grade|mark|evaluat|submission/.test(t)) { tools.push("Draft marks", "Draft feedback"); scope.push("Submissions", "Rubrics"); effects.grades = true; }
  if (/struggl|attention|gap|at.?risk/.test(t)) { tools.push("Flag students", "Propose remedial path"); scope.push("Learning profiles"); effects.notifies = true; }
  if (/remind|notify|message|parent/.test(t)) { tools.push("Send reminder"); scope.push("Assignments"); effects.notifies = true; }
  if (/report|summary/.test(t)) { tools.push("Compile report"); scope.push("Class progress"); }
  if (/fee/.test(t)) { effects.touchesFees = true; scope.push("Fee status (read-only)"); notes.push("Fee actions always need explicit approval."); }
  if (!tools.length) { tools.push("Draft content"); notes.push("No specific task recognised — defaulted to drafting. Refine the description or edit tools below."); }
  let trigger: AgentRecord["trigger"] = { kind: "manual", label: "Run manually" };
  const day = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/.exec(t)?.[1];
  if (/every (week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|weekly/.test(t)) trigger = { kind: "schedule", label: `Every ${day ? day[0].toUpperCase() + day.slice(1) : "Monday"} 8:00 AM` };
  else if (/daily|every day|every morning/.test(t)) trigger = { kind: "schedule", label: "Every weekday 8:00 AM" };
  else if (/when|after|on (new|each)/.test(t)) trigger = { kind: "event", label: "When the described event occurs" };
  const name = nl.trim().split(/[.\n]/)[0].replace(/^(please |i want to |i need an? |create an? |make an? )/i, "").slice(0, 48).replace(/^./, (c) => c.toUpperCase()) || "Untitled agent";
  const autonomy: AutonomyLevel = /autonomous|automatic|without asking/.test(t) && !effects.grades && !effects.publishes && !effects.touchesFees ? "autonomous" : /suggest/.test(t) ? "suggest" : "assist";
  if (/autonomous|automatic|without asking/.test(t) && autonomy !== "autonomous") notes.push("Autonomy lowered to Assist because this task grades, publishes or touches fees.");
  return { name, description: nl.trim(), nlDescription: nl.trim(), tools, dataScope: scope.length ? scope : ["My classes"], effects, trigger, autonomy, notes };
}

export type AgentDraft = Pick<AgentRecord, "name" | "description" | "provider" | "model" | "keyLabel" | "dataScope" | "tools" | "autonomy" | "trigger" | "effects"> & Partial<Pick<AgentRecord, "nlDescription" | "ownerId" | "ownerName" | "ownerLevel">>;

export const agentService = {
  list: (filter: { status?: AgentStatus; ownerId?: string; ownerLevel?: AgentRecord["ownerLevel"] } = {}) =>
    simulate(() => agents.filter((a) => (!filter.status || a.status === filter.status) && (!filter.ownerId || a.ownerId === filter.ownerId) && (!filter.ownerLevel || a.ownerLevel === filter.ownerLevel)), { failKey: "agents" }),
  get: (id: string) => simulate(() => agents.find((a) => a.id === id) ?? null),
  create: (d: AgentDraft) => simulate(() => {
    if (d.name.trim().length < 3) throw new ServiceError("Name must be at least 3 characters.", "validation");
    if (!d.tools.length) throw new ServiceError("Select at least one tool or action.", "validation");
    const a: AgentRecord = { id: uid("agt"), status: "draft", ownerId: "tch-priya", ownerName: "Priya Nair", ownerLevel: "teacher", createdAt: new Date().toISOString(), testedOnce: false, ...d };
    agents.unshift(a); return a;
  }),
  update: (id: string, patch: Partial<AgentDraft>) => simulate(() => { const a = find(id); Object.assign(a, patch); a.testedOnce = false; if (["published", "awaiting-approval", "failed"].includes(a.status)) a.status = "draft"; return a; }),
  /** Dry run: returns an action preview and logs a test run. Nothing is executed. */
  test: (id: string): Promise<ActionPreview> => simulate(() => {
    const a = find(id); if (a.status === "retired") throw new ServiceError("Retired agents cannot be tested.", "validation");
    if (a.status === "failed" && /key/i.test(a.failureReason ?? "")) throw new ServiceError("The demo key label is marked expired. Edit the agent to update it.", "validation");
    const reasons = approvalReasons(a.effects, a.autonomy);
    const requiresApproval = a.autonomy !== "autonomous" || a.effects.grades || a.effects.publishes || a.effects.touchesFees || a.effects.changesRecord || a.effects.statewide;
    const runId = uid("run");
    const preview: ActionPreview = {
      runId, agentId: id, intends: `${a.name}: ${a.tools.join(", ").toLowerCase()} for ${a.dataScope.join(", ").toLowerCase()}.`,
      affected: { students: a.effects.grades ? 3 : 12, classes: ["Grade 8 · B"] }, dataAccessed: a.dataScope,
      contentCreated: [a.effects.grades ? "Draft marks and feedback (unreleased)" : a.effects.publishes ? "Draft content (unpublished)" : "Summary / flags"],
      effects: a.effects, autonomyPolicy: AUTONOMY_COPY[a.autonomy], requiresApproval, approvalReasons: reasons,
    };
    runs.unshift({ id: runId, agentId: id, at: new Date().toISOString(), trigger: "Manual test run", action: preview.intends, scope: "Grade 8 · B (sample)", outcome: "test", approvalRequired: requiresApproval, auditRef: audit(), test: true });
    a.testedOnce = true; if (a.status === "draft") a.status = "testing"; a.failureReason = a.status === "failed" ? undefined : a.failureReason;
    return preview;
  }),
  /** Teacher decision on a test/real run preview. */
  decideRun: (runId: string, decision: "approve" | "reject") => simulate(() => { const r = runs.find((x) => x.id === runId); if (!r) throw new ServiceError("Run not found", "unavailable"); r.outcome = decision === "approve" ? "approved" : "rejected"; r.approvalGranted = decision === "approve"; return r; }),
  publish: (id: string) => simulate(() => {
    const a = find(id); if (!a.testedOnce) throw new ServiceError("Run a test first and review the action preview before publishing.", "validation");
    if (a.autonomy === "autonomous" || a.effects.grades || a.effects.touchesFees || a.effects.statewide) { a.status = "awaiting-approval"; return a; }
    a.status = "published"; a.publishedAt = new Date().toISOString(); return a;
  }),
  approve: (id: string, by: string) => simulate(() => { const a = find(id); if (a.status !== "awaiting-approval") throw new ServiceError("This agent is not awaiting approval.", "validation"); a.status = "published"; a.approvedBy = by; a.publishedAt = new Date().toISOString(); return a; }),
  pause: (id: string) => simulate(() => { const a = find(id); a.status = "paused"; return a; }),
  resume: (id: string) => simulate(() => { const a = find(id); if (a.status !== "paused") throw new ServiceError("Only paused agents can resume.", "validation"); a.status = "published"; return a; }),
  retire: (id: string) => simulate(() => { const a = find(id); a.status = "retired"; return a; }),
  history: (id?: string) => simulate(() => runs.filter((r) => !id || r.agentId === id).sort((a, b) => b.at.localeCompare(a.at))),
};
