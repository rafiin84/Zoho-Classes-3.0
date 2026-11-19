import { ago } from "@/lib/format";
import type { AgentRecord, AgentRun, AgentEffects } from "@/types/teacher";

const fx = (o: Partial<AgentEffects> = {}): AgentEffects => ({ publishes: false, grades: false, notifies: false, changesRecord: false, touchesFees: false, statewide: false, ...o });
const A = (id: string, name: string, description: string, over: Partial<AgentRecord>): AgentRecord => ({
  id, name, description, status: "published", provider: "claude", model: "Claude (demo)", keyLabel: "sk-••••••demo", dataScope: ["My classes"], tools: ["Draft content"], autonomy: "assist",
  trigger: { kind: "schedule", label: "Every Sunday 6:00 PM" }, ownerId: "tch-priya", ownerName: "Priya Nair", ownerLevel: "teacher", createdAt: ago(30000), publishedAt: ago(20000), lastRunAt: ago(1500), testedOnce: true, effects: fx(), ...over,
});
export const AGENT_SEED: AgentRecord[] = [
  A("agt-lesson-plans", "Weekly lesson plans", "Drafts next week's lesson plans for Grade 8 Maths from the course outline and last week's class gaps.", { autonomy: "assist", dataScope: ["Grade 8B course structure", "Class mastery summary"], tools: ["Draft lesson plan", "Post to class feed (after approval)"], effects: fx({ publishes: true }) }),
  A("agt-practice-tests", "Chapter practice tests", "Builds a 10-question practice test after each chapter closes, tagged to learning objectives.", { autonomy: "assist", provider: "openai", model: "ChatGPT (demo)", keyLabel: "sk-••••••a41f", trigger: { kind: "event", label: "When a chapter is marked complete" }, dataScope: ["Question bank", "Course objectives"], tools: ["Generate MCQs", "Create assignment draft"], effects: fx({ publishes: true }) }),
  A("agt-eval-assist", "Evaluation assistant", "Prepares draft marks and feedback when a submission arrives. Marks are never released without your review.", { autonomy: "assist", provider: "gemini", model: "Gemini (demo)", keyLabel: "AIza••••••9c2", trigger: { kind: "event", label: "On new assignment submission" }, dataScope: ["Submissions", "Rubrics"], tools: ["Draft marks", "Draft feedback"], effects: fx({ grades: true }) }),
  A("agt-attention", "Students needing attention", "Flags students with a high-severity learning gap or two missed activities in a week and suggests a remedial path.", { autonomy: "suggest", trigger: { kind: "schedule", label: "Every weekday 8:00 AM" }, dataScope: ["Learning profiles", "Activity completion"], tools: ["Flag students", "Propose remedial path"], effects: fx({ notifies: true }) }),
  A("agt-weekly-report", "Weekly class report", "Compiles progress, completion and engagement into a one-page report every Friday.", { autonomy: "autonomous", status: "published", trigger: { kind: "schedule", label: "Every Friday 4:30 PM" }, dataScope: ["Class progress"], tools: ["Compile report"], effects: fx({ notifies: true }), lastRunAt: ago(5800) }),
  A("agt-reminders", "Assignment reminders", "Sends a gentle reminder 24 hours before an assignment is due to students who have not started.", { autonomy: "autonomous", status: "paused", trigger: { kind: "event", label: "24 hours before due date" }, dataScope: ["Assignments", "Submission status"], tools: ["Send student reminder"], effects: fx({ notifies: true }), lastRunAt: ago(9000) }),
  A("agt-fee-nudge", "Fee reminder drafts (trial)", "Drafts fee reminder wording for the office. Fee communications always need explicit approval.", { autonomy: "assist", status: "failed", provider: "deepseek", model: "DeepSeek (demo)", keyLabel: "ds-••••••77", failureReason: "Demo key expired — update the key label and retest.", dataScope: ["Fee status (read-only)"], tools: ["Draft message"], effects: fx({ notifies: true, touchesFees: true }), lastRunAt: ago(2000) }),
];
const R = (id: string, agentId: string, m: number, trigger: string, action: string, scope: string, outcome: AgentRun["outcome"], approvalRequired: boolean, approvalGranted?: boolean, error?: string): AgentRun =>
  ({ id, agentId, at: ago(m), trigger, action, scope, outcome, approvalRequired, approvalGranted, error, auditRef: `AUD-${id.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-6)}` });
export const RUN_SEED: AgentRun[] = [
  R("run-1", "agt-lesson-plans", 1500, "Schedule · Sun 6:00 PM", "Drafted 4 lesson plans for next week", "Grade 8B · 4 lessons", "approved", true, true),
  R("run-2", "agt-lesson-plans", 11600, "Schedule · Sun 6:00 PM", "Drafted 4 lesson plans", "Grade 8B · 4 lessons", "rejected", true, false),
  R("run-3", "agt-eval-assist", 300, "Event · New submission", "Drafted marks for 'Short story' (3 submissions)", "Grade 8B · 3 students", "awaiting-approval", true),
  R("run-4", "agt-attention", 480, "Schedule · Weekday 8:00 AM", "Flagged 2 students; proposed 1 remedial path", "Grade 8B · 2 students", "completed", false),
  R("run-5", "agt-weekly-report", 5800, "Schedule · Fri 4:30 PM", "Compiled weekly class report", "Grade 8B", "completed", false),
  R("run-6", "agt-fee-nudge", 2000, "Manual test", "Draft fee reminder wording", "Office review", "failed", true, undefined, "Authentication failed for the demo key."),
  R("run-7", "agt-reminders", 9000, "Event · 24h before due", "Sent 5 reminders for 'Baking with fractions'", "Grade 8B · 5 students", "completed", false),
];
