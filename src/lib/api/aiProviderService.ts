import type { ProviderConfig, ProviderId, TaskRoute, TaskKey, ProviderPolicy, OwnerLevel, AutonomyCeiling } from "@/types/institution";
import { simulate, ServiceError } from "./latency";
import { ago } from "../format";
import { recordAudit } from "./governanceService";

/**
 * BYOK provider configuration across the hierarchy: Government → Institution → Teacher / Student.
 * Zoho Classes ships NO proprietary model. Raw keys are never stored: `addKey` validates format then discards the value.
 */
export const PROVIDER_META: Record<ProviderId, { name: string; models: string[] }> = {
  openai: { name: "OpenAI / ChatGPT", models: ["GPT flagship (demo)", "GPT fast (demo)"] },
  gemini: { name: "Google Gemini", models: ["Gemini pro (demo)", "Gemini flash (demo)"] },
  claude: { name: "Anthropic Claude", models: ["Claude large (demo)", "Claude small (demo)"] },
  deepseek: { name: "DeepSeek", models: ["DeepSeek chat (demo)", "DeepSeek reasoner (demo)"] },
  custom: { name: "Other / custom endpoint", models: ["Custom model (demo)"] },
};
export const TASKS: { key: TaskKey; label: string }[] = [{ key: "tutoring", label: "Tutoring" }, { key: "rag", label: "Retrieval over books (RAG)" }, { key: "question-generation", label: "Question generation" }, { key: "grading-suggestions", label: "Grading suggestions" }, { key: "summarisation", label: "Summarisation" }, { key: "analytics", label: "Analytics" }];
export const ACTIVITIES = ["Tutoring", "Assessments & exams", "Grading suggestions", "Homework help"];
const MASK = "Demo key ••••••••";
const ids = Object.keys(PROVIDER_META) as ProviderId[];

interface Level { providers: ProviderConfig[]; routes: TaskRoute[]; policy: ProviderPolicy }
const mk = (level: OwnerLevel, enabled: ProviderId[], budget: number, spent: Record<string, number>, keyed: ProviderId[], approved: ProviderId[], policy: Partial<ProviderPolicy>): Level => ({
  providers: ids.map((id) => ({ id, name: PROVIDER_META[id].name, models: PROVIDER_META[id].models, defaultModel: PROVIDER_META[id].models[0], enabled: enabled.includes(id), keyMask: keyed.includes(id) ? MASK : "", keyOwner: level, inherited: level !== "government" && !keyed.includes(id) && enabled.includes(id), connection: keyed.includes(id) ? "ok" : "untested", lastTested: keyed.includes(id) ? ago(2000) : undefined, budget: Math.round(budget / Math.max(1, enabled.length)), spent: spent[id] ?? 0, approvedByGovernment: approved.includes(id) })),
  routes: TASKS.map((t, i) => ({ task: t.key, provider: enabled[i % Math.max(1, enabled.length)] ?? "openai", model: PROVIDER_META[enabled[i % Math.max(1, enabled.length)] ?? "openai"].models[0], preference: (["balanced", "cost", "cost", "performance", "cost", "balanced"] as const)[i], fallback: enabled.length > 1 ? enabled[(i + 1) % enabled.length] : "none" })),
  policy: { ownerLevel: level, allowPersonalKeys: level !== "student", allowStudentKeys: false, studentMinAge: 13, requireGuardianConsent: true, disabledActivities: ["Assessments & exams"], pauseAtBudget: true, alertThreshold: 80, autonomyCeiling: "assist", monthlyBudget: budget, ...policy },
});
const GOV_APPROVED: ProviderId[] = ["openai", "gemini", "claude"];
const state: Record<OwnerLevel, Level> = {
  government: mk("government", ["openai", "gemini", "claude"], 500000, { openai: 142000, gemini: 118000, claude: 96000 }, ["openai", "gemini", "claude"], GOV_APPROVED, { allowStudentKeys: true, autonomyCeiling: "assist" }),
  institution: mk("institution", ["claude", "gemini"], 120000, { claude: 61000, gemini: 28000 }, ["claude"], GOV_APPROVED, { allowStudentKeys: false }),
  teacher: mk("teacher", ["claude"], 2000, { claude: 640 }, [], GOV_APPROVED, { autonomyCeiling: "suggest" }),
  student: mk("student", [], 500, {}, [], GOV_APPROVED, { allowPersonalKeys: true }),
};
const ceilingRank: Record<AutonomyCeiling, number> = { suggest: 0, assist: 1, autonomous: 2 };
const up = (l: OwnerLevel): OwnerLevel | null => (l === "government" ? null : l === "institution" ? "government" : "institution");
const actor = (l: OwnerLevel) => ({ actor: l === "government" ? "Karuvana State Education Dept." : "Principal Anita Desai", actorRole: l === "government" ? "Government" : "Institution admin" });
const audit = (l: OwnerLevel, action: string, target: string) => recordAudit({ ...actor(l), action, category: "Tenant settings", target, context: `AI providers · ${l} level (keys masked)` });
export const budgetState = (spent: number, budget: number, threshold: number): "healthy" | "near" | "exceeded" => (budget > 0 && spent >= budget ? "exceeded" : budget > 0 && (spent / budget) * 100 >= threshold ? "near" : "healthy");

export const aiProviderService = {
  get: (level: OwnerLevel) => simulate(() => {
    const s = state[level], u = up(level);
    const spent = s.providers.reduce((a, p) => a + p.spent, 0);
    return { ...s, spent, upstream: u ? { level: u, policy: state[u].policy, approved: state[u].providers.filter((p) => p.enabled && p.approvedByGovernment).map((p) => p.id) } : null, state: budgetState(spent, s.policy.monthlyBudget, s.policy.alertThreshold) };
  }, { failKey: "aiProviders" }),
  setEnabled: (level: OwnerLevel, id: ProviderId, on: boolean) => simulate(() => {
    const p = state[level].providers.find((x) => x.id === id)!;
    if (on && level !== "government" && !p.approvedByGovernment) throw new ServiceError(`${p.name} is not approved by the state policy, so it cannot be enabled here.`, "permission");
    if (on && level === "student" && !state.student.policy.allowPersonalKeys) throw new ServiceError("Personal keys are not allowed for students here.", "permission");
    p.enabled = on; if (!on) p.keyMask = p.keyMask; audit(level, on ? "Enabled AI provider" : "Disabled AI provider", p.name); return p;
  }),
  setApproved: (id: ProviderId, ok: boolean) => simulate(() => { state.government.providers.find((p) => p.id === id)!.approvedByGovernment = ok; Object.values(state).forEach((l) => l.providers.forEach((p) => { if (p.id === id) { p.approvedByGovernment = ok; if (!ok && l !== state.government) p.enabled = false; } })); audit("government", ok ? "Approved AI provider statewide" : "Withdrew provider approval", PROVIDER_META[id].name); return true; }),
  setDefaultModel: (level: OwnerLevel, id: ProviderId, model: string) => simulate(() => { const p = state[level].providers.find((x) => x.id === id)!; if (!p.models.includes(model)) throw new ServiceError("Unknown model.", "validation"); p.defaultModel = model; return p; }),
  /** Validates format only; the key itself is discarded immediately and never persisted anywhere. */
  addKey: (level: OwnerLevel, id: ProviderId, rawKey: string) => simulate(() => {
    const ok = /^[A-Za-z0-9_\-]{24,}$/.test(rawKey.trim());
    if (!ok) throw new ServiceError("That doesn't look like a valid key format (24+ letters, numbers, - or _). It was not saved.", "validation");
    const p = state[level].providers.find((x) => x.id === id)!; p.keyMask = MASK; p.keyOwner = level; p.inherited = false; p.connection = "untested"; p.enabled = level === "government" || p.approvedByGovernment ? true : p.enabled;
    audit(level, "Added provider key (masked demo)", p.name); return p;
  }),
  removeKey: (level: OwnerLevel, id: ProviderId) => simulate(() => { const p = state[level].providers.find((x) => x.id === id)!; p.keyMask = ""; p.connection = "untested"; if (level !== "government") p.inherited = state[up(level)!].providers.find((x) => x.id === id)?.enabled ?? false; audit(level, "Removed provider key", p.name); return p; }),
  test: (level: OwnerLevel, id: ProviderId, outcome: "success" | "failure" | "unavailable") => simulate(() => {
    const p = state[level].providers.find((x) => x.id === id)!; if (!p.keyMask && !p.inherited) throw new ServiceError("Add a key (or inherit one) before testing.", "validation");
    p.connection = outcome === "success" ? "ok" : outcome === "failure" ? "failed" : "unavailable"; p.lastTested = new Date().toISOString(); return p;
  }, { ms: 800 }),
  setRoute: (level: OwnerLevel, task: TaskKey, patch: Partial<TaskRoute>) => simulate(() => {
    const r = state[level].routes.find((x) => x.task === task)!; const next = { ...r, ...patch };
    if (patch.provider) { const pv = state[level].providers.find((p) => p.id === patch.provider)!; if (!pv.enabled) throw new ServiceError(`${pv.name} is not enabled at this level.`, "validation"); next.model = pv.defaultModel; if (next.fallback === next.provider) next.fallback = "none"; }
    if (next.fallback !== "none" && next.fallback === next.provider) throw new ServiceError("Fallback must differ from the main provider.", "validation");
    Object.assign(r, next); return r;
  }),
  setPolicy: (level: OwnerLevel, patch: Partial<ProviderPolicy>) => simulate(() => {
    const pol = state[level].policy, u = up(level);
    if (patch.autonomyCeiling && u && ceilingRank[patch.autonomyCeiling] > ceilingRank[state[u].policy.autonomyCeiling]) throw new ServiceError(`Autonomy cannot exceed the ${u} ceiling (${state[u].policy.autonomyCeiling}).`, "permission");
    if (patch.allowStudentKeys && u && !state[u].policy.allowStudentKeys && level !== "government") throw new ServiceError("Student keys are not permitted by the level above.", "permission");
    if (patch.allowStudentKeys && !(patch.requireGuardianConsent ?? pol.requireGuardianConsent)) throw new ServiceError("Student keys require guardian consent.", "validation");
    if (patch.requireGuardianConsent === false && pol.allowStudentKeys) throw new ServiceError("Turn off student keys before relaxing guardian consent.", "validation");
    if (patch.monthlyBudget !== undefined && (patch.monthlyBudget < 0 || (u && patch.monthlyBudget > state[u].policy.monthlyBudget))) throw new ServiceError("Budget must be positive and within the level above.", "validation");
    if (patch.studentMinAge !== undefined && (patch.studentMinAge < 13 || patch.studentMinAge > 18)) throw new ServiceError("Minimum age must be between 13 and 18.", "validation");
    Object.assign(pol, patch); audit(level, "Updated AI provider policy", Object.keys(patch).join(", ")); return pol;
  }),
  simulateSpend: (level: OwnerLevel, id: ProviderId, amount: number) => simulate(() => { const s = state[level]; const p = s.providers.find((x) => x.id === id)!; if (s.policy.pauseAtBudget && budgetState(s.providers.reduce((a, x) => a + x.spent, 0), s.policy.monthlyBudget, 100) === "exceeded") throw new ServiceError("AI is paused: the budget has been reached.", "unavailable"); p.spent += amount; return p; }, { ms: 200 }),
  resetSpend: (level: OwnerLevel) => simulate(() => { state[level].providers.forEach((p) => (p.spent = 0)); return true; }),
  /** Student personal keys need age, guardian consent AND institutional policy. */
  studentEligibility: (age: number, guardianConsent: boolean) => simulate(() => {
    const pol = state.institution.policy, reasons: string[] = [];
    if (!state.government.policy.allowStudentKeys) reasons.push("State policy does not allow student keys.");
    if (!pol.allowStudentKeys) reasons.push("Institution policy has student keys turned off.");
    if (age < pol.studentMinAge) reasons.push(`Student is under the minimum age (${pol.studentMinAge}).`);
    if (pol.requireGuardianConsent && !guardianConsent) reasons.push("Guardian consent is missing.");
    return { eligible: reasons.length === 0, reasons };
  }),
};
