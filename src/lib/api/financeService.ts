import type { FeePlan, AdjustmentRequest, ReminderLog } from "@/types/institution";
import { feeService } from "./feeService";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { ago, inDays } from "../format";
import { recordAudit } from "./governanceService";
import { STUDENTS } from "../mock-data/core";

/** INSTITUTIONAL fees only. Paid-course sales live in courseService (never mixed here). */
const plans: FeePlan[] = [
  { id: "fp-1", name: "Grade 8 · Annual 2026–27", head: "Tuition", year: "2026–27", programme: "K-12", grade: "Grade 8", branch: "All branches", amount: 72000, currency: "INR", dueDate: inDays(6), installments: [{ label: "Term 1", due: inDays(-100), pct: 40 }, { label: "Term 2", due: inDays(6), pct: 30 }, { label: "Term 3", due: inDays(90), pct: 30 }], lateFee: "₹500 after 7 days; capped at ₹1,500", group: "All Grade 8 students", status: "active" },
  { id: "fp-2", name: "Transport · North routes", head: "Transport", year: "2026–27", programme: "K-12", grade: "All grades", branch: "North Campus", amount: 12000, currency: "INR", dueDate: inDays(6), installments: [{ label: "Half-yearly 1", due: inDays(-100), pct: 50 }, { label: "Half-yearly 2", due: inDays(60), pct: 50 }], lateFee: "₹200 after 10 days", group: "Transport users", status: "active" },
  { id: "fp-3", name: "Laboratory fee · Grades 8–10", head: "Laboratory", year: "2026–27", programme: "K-12", grade: "Grades 8–10", branch: "All branches", amount: 6000, currency: "INR", dueDate: inDays(30), installments: [{ label: "Annual", due: inDays(30), pct: 100 }], lateFee: "None", group: "Science students", status: "draft" },
];
const adjustments: AdjustmentRequest[] = [
  { id: "adj-1", kind: "refund", student: "Vihaan Rao", grade: "Grade 5", branchId: "br-north", amount: 3000, reason: "Transport route cancelled mid-term", status: "pending", at: ago(400), head: "Transport" },
  { id: "adj-2", kind: "adjustment", student: "Kabir Mehta", grade: "Grade 8", branchId: "br-north", amount: 500, reason: "Late fee waiver — bank delay documented", status: "pending", at: ago(900), head: "Late fee" },
  { id: "adj-3", kind: "concession", student: "Sana Qureshi", grade: "Grade 8", branchId: "br-north", amount: 4000, reason: "Sibling concession (2nd child)", status: "pending", at: ago(1300), head: "Tuition" },
  { id: "adj-4", kind: "scholarship", student: "Dev Malhotra", grade: "Grade 8", branchId: "br-north", amount: 20000, reason: "Merit scholarship — State Maths Quiz rank 3", status: "pending", at: ago(2000), head: "Tuition" },
  { id: "adj-5", kind: "concession", student: "Arnav Singh", grade: "Grade 9", branchId: "br-lakeside", amount: 6000, reason: "Staff-ward concession", status: "pending", at: ago(2500), head: "Tuition" },
  { id: "adj-6", kind: "refund", student: "Zoya Khan", grade: "Grade 9", branchId: "br-lakeside", amount: 1500, reason: "Duplicate payment of exam fee", status: "approved", at: ago(6000), head: "Examination", decidedNote: "Verified against receipt" },
];
const reminders: ReminderLog[] = [{ id: "rm-1", at: ago(4300), audience: "Overdue accounts · Term 1", count: 38, channel: "App + SMS (simulated)" }];
let enabled = true;
const gradeOf = (sid: string) => STUDENTS.find((s) => s.id === sid)?.gradeLabel ?? "Grade 8";

export const financeService = {
  enabled: () => simulate(() => enabled),
  setEnabled: (v: boolean) => simulate(() => { enabled = v; recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: v ? "Enabled fees module" : "Disabled fees module", category: "Tenant settings", target: "Fees & Finance", context: "Fees console" }); return v; }),
  plans: () => simulate(() => plans),
  savePlan: (p: Omit<FeePlan, "id" | "status" | "currency"> & { id?: string }) => simulate(() => {
    const pct = p.installments.reduce((s, i) => s + i.pct, 0); if (pct !== 100) throw new ServiceError(`Instalments add up to ${pct}%, not 100%.`, "validation");
    const n: FeePlan = { currency: "INR", status: "draft", ...p, id: p.id ?? uid("fp") }; const i = plans.findIndex((x) => x.id === n.id); if (i >= 0) plans[i] = { ...plans[i], ...n }; else plans.unshift(n);
    recordAudit({ actor: "Finance Officer Rekha Pillai", actorRole: "Finance staff", action: "Saved fee plan", category: "Fee adjustment/payment status", target: n.name, context: "Fee structures" }); return n;
  }),
  activatePlan: (id: string) => simulate(() => { const p = plans.find((x) => x.id === id)!; p.status = "active"; return p; }),
  adjustments: () => simulate(() => adjustments),
  decide: (id: string, ok: boolean, note: string) => simulate(() => {
    const a = adjustments.find((x) => x.id === id)!; if (a.status !== "pending") throw new ServiceError("Already decided.", "validation"); if (!ok && note.trim().length < 5) throw new ServiceError("Give a reason for rejecting.", "validation");
    a.status = ok ? "approved" : "rejected"; a.decidedNote = note;
    recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: `${ok ? "Approved" : "Rejected"} ${a.kind}`, category: "Fee adjustment/payment status", target: `${a.student} · ₹${a.amount.toLocaleString("en-IN")} · ${a.head}`, context: note || "Fees console" }); return a;
  }),
  reminders: () => simulate(() => reminders),
  sendReminders: (audience: string, count: number) => simulate(() => { if (count < 1) throw new ServiceError("No accounts match that audience.", "validation"); const r: ReminderLog = { id: uid("rm"), at: new Date().toISOString(), audience, count, channel: "App + SMS (simulated)" }; reminders.unshift(r); recordAudit({ actor: "Finance Officer Rekha Pillai", actorRole: "Finance staff", action: "Sent fee reminders (simulated)", category: "Fee adjustment/payment status", target: audience, context: `${count} accounts` }); return r; }, { ms: 700 }),
  /** Derived live from feeService so a parent's simulated payment shows here. */
  console: async () => {
    const [accounts, summary] = await Promise.all([feeService.allAccounts(), feeService.summary()]);
    return simulate(() => {
      const txns = accounts.flatMap((a) => a.transactions.map((t) => ({ ...t, studentId: a.studentId, grade: gradeOf(a.studentId), recon: t.status === "Successful" ? (t.id === "txn-0" ? "Reconciled" : "Reconciled") : t.status === "Pending" ? "Awaiting bank confirmation" : t.status === "Failed" ? "Not applicable (failed)" : "Partially matched" }))).sort((a, b) => b.initiatedAt.localeCompare(a.initiatedAt));
      const invoices = accounts.flatMap((a) => a.installments.map((i) => ({ ...i, studentId: a.studentId, grade: gradeOf(a.studentId), due: i.amount - i.paid + (i.lateFee ?? 0) })));
      const today = new Date("2026-11-19").getTime();
      const buckets = [{ label: "Not yet due", v: 0 }, { label: "1–30 days", v: 0 }, { label: "31–60 days", v: 0 }, { label: "60+ days", v: 0 }];
      invoices.filter((i) => i.due > 0).forEach((i) => { const d = Math.floor((today - new Date(i.dueDate).getTime()) / 864e5); buckets[d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : 3].v += i.due; });
      const byHead: Record<string, number> = {}; accounts.forEach((a) => { const r = a.paidTotal / Math.max(1, a.assessedTotal); a.heads.forEach((h) => { byHead[h.label] = (byHead[h.label] ?? 0) + Math.round(h.amount * r); }); });
      const byGrade: Record<string, number> = {}; accounts.forEach((a) => { const g = gradeOf(a.studentId); byGrade[g] = (byGrade[g] ?? 0) + a.paidTotal; });
      const byMonth: Record<string, number> = {}; txns.filter((t) => t.status === "Successful").forEach((t) => { const k = new Date(t.completedAt ?? t.initiatedAt).toLocaleString("en-IN", { month: "short", year: "2-digit" }); byMonth[k] = (byMonth[k] ?? 0) + t.amount; });
      return { summary, accounts, txns, invoices, buckets, byHead, byGrade, byMonth, byBranch: { "North Campus": summary.collected, "Lakeside Campus (sample)": 4_620_000 } };
    });
  },
};
