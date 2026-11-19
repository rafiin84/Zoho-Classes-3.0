import type { FeeAccount, CourseOrder } from "@/types";
import { inDays, ago } from "@/lib/format";

const heads = [{ id: "fh-tuition", label: "Tuition", amount: 72000, concession: 0 }, { id: "fh-exam", label: "Examination", amount: 4000, concession: 0 }, { id: "fh-lab", label: "Laboratory", amount: 6000, concession: 0 }, { id: "fh-transport", label: "Transport", amount: 12000, concession: 0 }, { id: "fh-activity", label: "Activity", amount: 3000, concession: 1500 }];
export const FEE_ACCOUNTS: FeeAccount[] = [
  { id: "fa-ananya", studentId: "stu-ananya", institutionId: "inst-greenfield", academicYearId: "ay-2026-27", feesEnabled: true, currency: "INR", heads, assessedTotal: 97000, concessionTotal: 1500, paidTotal: 38500, balance: 57000, status: "due",
    installments: [
      { id: "ins-1", label: "Term 1", dueDate: inDays(-100), amount: 38500, paid: 38500, status: "paid", heads: [{ headId: "fh-tuition", amount: 28000 }, { headId: "fh-exam", amount: 2000 }, { headId: "fh-lab", amount: 3000 }, { headId: "fh-transport", amount: 5500 }] },
      { id: "ins-2", label: "Term 2", dueDate: inDays(6), amount: 18500, paid: 0, status: "due", heads: [{ headId: "fh-tuition", amount: 14000 }, { headId: "fh-lab", amount: 1500 }, { headId: "fh-transport", amount: 3000 }] },
      { id: "ins-3", label: "Term 3", dueDate: inDays(90), amount: 38500, paid: 0, status: "upcoming", heads: [{ headId: "fh-tuition", amount: 30000 }, { headId: "fh-exam", amount: 2000 }, { headId: "fh-activity", amount: 1500 }, { headId: "fh-transport", amount: 5000 }] } ],
    transactions: [{ id: "txn-0", feeAccountId: "fa-ananya", installmentIds: ["ins-1"], amount: 38500, currency: "INR", methodLabel: "Demo UPI", status: "Successful", initiatedAt: ago(144000), completedAt: ago(144000), receiptNumber: "DEMO-RCPT-0001", demoReference: "DEMO-TXN-48213" }] },
  { id: "fa-vihaan", studentId: "stu-vihaan", institutionId: "inst-greenfield", academicYearId: "ay-2026-27", feesEnabled: true, currency: "INR", heads: heads.slice(0, 3), assessedTotal: 62000, concessionTotal: 0, paidTotal: 62000, balance: 0, status: "clear",
    installments: [{ id: "ins-v1", label: "Annual", dueDate: inDays(-120), amount: 62000, paid: 62000, status: "paid", heads: [{ headId: "fh-tuition", amount: 62000 }] }],
    transactions: [{ id: "txn-v0", feeAccountId: "fa-vihaan", installmentIds: ["ins-v1"], amount: 62000, currency: "INR", methodLabel: "Demo net banking", status: "Successful", initiatedAt: ago(170000), completedAt: ago(170000), receiptNumber: "DEMO-RCPT-0002", demoReference: "DEMO-TXN-48002" }] },
  { id: "fa-kabir", studentId: "stu-kabir", institutionId: "inst-greenfield", academicYearId: "ay-2026-27", feesEnabled: true, currency: "INR", heads: heads.slice(0, 3), assessedTotal: 82000, concessionTotal: 0, paidTotal: 20000, balance: 62000, status: "overdue",
    installments: [{ id: "ins-k1", label: "Term 1", dueDate: inDays(-30), amount: 41000, paid: 20000, status: "overdue", lateFee: 500, heads: [{ headId: "fh-tuition", amount: 41000 }] }, { id: "ins-k2", label: "Term 2", dueDate: inDays(60), amount: 41000, paid: 0, status: "upcoming", heads: [{ headId: "fh-tuition", amount: 41000 }] }],
    transactions: [{ id: "txn-k0", feeAccountId: "fa-kabir", installmentIds: ["ins-k1"], amount: 20000, currency: "INR", methodLabel: "Demo card", status: "Partially Paid", initiatedAt: ago(60000), completedAt: ago(60000), receiptNumber: "DEMO-RCPT-0003", demoReference: "DEMO-TXN-47110" }] },
];
export const COURSE_ORDERS: CourseOrder[] = [
  { id: "ord-1", studentId: "stu-ananya", courseId: "crs-algebra-pro", sellerName: "Meena Subramaniam", amount: 599, currency: "INR", licenceType: "Individual · 180 days", status: "Successful", entitlementStatus: "active", receiptReference: "DEMO-ORD-7731", at: ago(20000), expiresAt: inDays(140) },
];
