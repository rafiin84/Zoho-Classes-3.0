import type { FeeAccount, FeeTransaction, TxnStatus } from "@/types";
import { FEE_ACCOUNTS } from "../mock-data/finance";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { track } from "../analytics";
import { notificationService } from "./notificationService";

const accounts: FeeAccount[] = structuredClone(FEE_ACCOUNTS);
const recompute = (a: FeeAccount) => {
  a.paidTotal = a.installments.reduce((s, i) => s + i.paid, 0);
  a.balance = a.assessedTotal - a.concessionTotal - a.paidTotal;
  a.status = a.balance <= 0 ? "clear" : a.installments.some((i) => i.status === "overdue") ? "overdue" : a.paidTotal > 0 && a.installments.some((i) => i.status === "partially-paid") ? "partially-paid" : "due";
};
export const feeService = {
  /** Institutional fee accounts only. Paid-course purchases live in courseService (kept separate by design). */
  account: (studentId: string) => simulate(() => accounts.find((a) => a.studentId === studentId) ?? null),
  allAccounts: () => simulate(() => accounts),
  /** Simulated payment: outcome chosen by the demo user. No real gateway, card or bank data is involved. */
  pay: (studentId: string, installmentIds: string[], method: string, outcome: "success" | "pending" | "failed" = "success") => simulate(() => {
    const a = accounts.find((x) => x.studentId === studentId);
    if (!a) throw new ServiceError("No fee account found.", "unavailable");
    const ins = a.installments.filter((i) => installmentIds.includes(i.id));
    const amount = ins.reduce((s, i) => s + (i.amount - i.paid) + (i.lateFee ?? 0), 0);
    const status: TxnStatus = outcome === "success" ? "Successful" : outcome === "pending" ? "Pending" : "Failed";
    const t: FeeTransaction = { id: uid("txn"), feeAccountId: a.id, installmentIds, amount, currency: "INR", methodLabel: method, status, initiatedAt: new Date().toISOString(), completedAt: status === "Successful" ? new Date().toISOString() : undefined, receiptNumber: status === "Successful" ? `DEMO-RCPT-${Math.floor(1000 + Math.random() * 9000)}` : undefined, demoReference: `DEMO-TXN-${Math.floor(10000 + Math.random() * 89999)}` };
    a.transactions.unshift(t);
    if (status === "Successful") { ins.forEach((i) => { i.paid = i.amount; i.status = "paid"; i.lateFee = undefined; }); recompute(a); notificationService.push({ role: "parent", childId: studentId, category: "finance", title: "Payment received (demo)", body: `₹ ${amount.toLocaleString("en-IN")} · ${t.receiptNumber}`, href: "/parent/fees" }); }
    track("payment_simulated", { domain: "fees", status });
    return t;
  }, { ms: 800 }),
  refresh: (txnId: string) => simulate(() => { for (const a of accounts) { const t = a.transactions.find((x) => x.id === txnId); if (t && t.status === "Pending") { t.status = "Successful"; t.completedAt = new Date().toISOString(); t.receiptNumber = `DEMO-RCPT-${Math.floor(1000 + Math.random() * 9000)}`; a.installments.filter((i) => t.installmentIds.includes(i.id)).forEach((i) => { i.paid = i.amount; i.status = "paid"; i.lateFee = undefined; }); recompute(a); return t; } } return null; }),
  /** Institution finance summary derived from the same accounts (so a parent payment reflects here). */
  summary: () => simulate(() => {
    const assessed = accounts.reduce((s, a) => s + a.assessedTotal - a.concessionTotal, 0), collected = accounts.reduce((s, a) => s + a.paidTotal, 0);
    return { assessed, collected, outstanding: assessed - collected, overdueAccounts: accounts.filter((a) => a.status === "overdue").length, pending: accounts.flatMap((a) => a.transactions).filter((t) => t.status === "Pending" || t.status === "Failed").length, accounts: accounts.length };
  }),
  requestClarification: (_studentId: string, _msg: string) => simulate(() => true),
};
