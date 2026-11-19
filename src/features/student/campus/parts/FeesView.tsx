"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, CreditCard, BellRinging, ChatCircleText, CheckCircle, Prohibit, ArrowClockwise, Gift, Wallet } from "@phosphor-icons/react";
import { feeService } from "@/lib/api";
import { Button, Card, CardBody, EmptyState, PageHeader, SectionHeader, StatTile, StatusBadge, Switch, Modal, Textarea, Field, Skeleton, toast, Badge } from "@/components/ui";
import { fmtDate, fmtMoney, relTime } from "@/lib/format";
import type { FeeAccount, FeeTransaction } from "@/types";
import { ck } from "../keys";
import { Boundary } from "../shared";
import { PaymentWizard } from "./PaymentWizard";
import { ReceiptModal } from "./ReceiptModal";

const owed = (i: FeeAccount["installments"][number]) => i.amount - i.paid + (i.lateFee ?? 0);
const INS_LABEL: Record<string, string> = { paid: "Paid", due: "Due", overdue: "Overdue", "partially-paid": "Partly paid", upcoming: "Upcoming" };

export function FeesView({ studentId, name, mode }: { studentId: string; name: string; mode: "student" | "parent" }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ck.fees(studentId), queryFn: () => feeService.account(studentId) });
  const [pay, setPay] = useState(false); const [receipt, setReceipt] = useState<FeeTransaction | null>(null); const [contact, setContact] = useState(false); const [msg, setMsg] = useState(""); const [remind, setRemind] = useState(true);
  const done = () => { qc.invalidateQueries({ queryKey: ck.fees(studentId) }); qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["fees"] }); };
  const refresh = useMutation({ mutationFn: (id: string) => feeService.refresh(id), onSuccess: (t) => { done(); toast[t ? "success" : "info"](t ? "Bank confirmed. Receipt created." : "Still pending. Check again shortly."); } });
  const clar = useMutation({ mutationFn: () => feeService.requestClarification(studentId, msg), onSuccess: () => { toast.success("Sent to the finance office. They usually reply within 2 working days."); setContact(false); setMsg(""); } });
  const who = mode === "parent" ? `${name}'s` : "Your";
  return (
    <div>
      <PageHeader title="Fees & Payments" subtitle={`${who} school fee account for 2026–27. Fees owed to the school only.`} actions={<Link href={`/${mode}/courses`} className="text-sm font-semibold text-primary hover:underline">{mode === "student" ? "Course purchases are listed under Courses → Orders" : "Paid-course orders belong to the student's Courses → Orders"}</Link>} />
      <Boundary q={q} skeleton={<div className="space-y-3"><div className="grid gap-3 sm:grid-cols-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div><Skeleton className="h-64" /></div>}
        empty={<EmptyState icon={<Prohibit size={28} weight="duotone" />} title="Fees aren't set up for this account" body="The school hasn't assigned a fee account yet. If you expected one, ask the finance office." action={{ label: "Contact finance office", onClick: () => setContact(true) }} />}>
        {(a) => {
          if (!a.feesEnabled) return <EmptyState icon={<Prohibit size={28} weight="duotone" />} title="Online fees aren't enabled for this school" body="Greenfield collects fees at the finance office for now. Nothing is due online." action={{ label: "Contact finance office", onClick: () => setContact(true) }} />;
          const open = a.installments.filter((i) => i.status !== "paid"); const next = open.find((i) => i.status !== "upcoming") ?? open[0]; const dueNow = open.filter((i) => i.status !== "upcoming");
          const dueAmount = dueNow.reduce((s, i) => s + owed(i), 0); const clear = a.balance <= 0;
          const concessions = a.heads.filter((h) => h.concession > 0);
          return (
            <div className="space-y-5">
              {clear ? <Card tone="lilac"><CardBody className="flex items-center gap-3"><CheckCircle size={32} weight="fill" className="text-success" /><div><h2 className="font-semibold">No dues. All fees are paid</h2><p className="text-sm text-text-2">Receipts for every payment are below. Nothing needs doing.</p></div></CardBody></Card> :
                dueNow.length > 0 && <Card tone="lilac"><CardBody className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Wallet size={32} weight="duotone" className="text-primary" /><div><h2 className="font-semibold">{fmtMoney(dueAmount)} due {next ? relTime(next.dueDate) : ""}</h2><p className="text-sm text-text-2">{next?.label} · due {next ? fmtDate(next.dueDate, { weekday: "short", day: "numeric", month: "short" }) : ""}{next?.status === "overdue" ? " · overdue, a late fee applies" : ""}</p></div></div><Button size="lg" onClick={() => setPay(true)}><CreditCard size={18} weight="fill" />Pay now</Button></CardBody></Card>}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <StatTile label="Assessed" value={fmtMoney(a.assessedTotal)} /><StatTile label="Concessions" value={`− ${fmtMoney(a.concessionTotal)}`} />
                <StatTile label="Paid" value={fmtMoney(a.paidTotal)} /><StatTile label="Balance" value={fmtMoney(Math.max(0, a.balance))} tone="lilac" />
                <StatTile label="Next due" value={next ? fmtDate(next.dueDate, { day: "numeric", month: "short" }) : "None"} hint={next ? `${next.label} · ${fmtMoney(owed(next))}` : "All clear"} />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <Card><CardBody><SectionHeader title="Fee heads" subtitle="What the year's fees are made of" />
                  <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Fee head breakdown</caption><thead><tr className="text-left text-xs text-text-2"><th className="pb-2 font-semibold">Head</th><th className="pb-2 text-right font-semibold">Amount</th><th className="pb-2 text-right font-semibold">Concession</th><th className="pb-2 text-right font-semibold">Net</th></tr></thead>
                    <tbody>{a.heads.map((h) => <tr key={h.id} className="border-t border-border"><td className="py-2">{h.label}</td><td className="tnum py-2 text-right">{fmtMoney(h.amount)}</td><td className="tnum py-2 text-right text-success">{h.concession ? `− ${fmtMoney(h.concession)}` : "–"}</td><td className="tnum py-2 text-right font-semibold">{fmtMoney(h.amount - h.concession)}</td></tr>)}</tbody></table></div></CardBody></Card>
                <Card><CardBody><SectionHeader title="Concessions & scholarships" subtitle="Reductions, shown separately from payments" />
                  {concessions.length === 0 ? <p className="rounded-xl bg-surface-2 p-4 text-sm text-text-2">No concession or scholarship is applied to this account.</p> : <ul className="space-y-2">{concessions.map((h) => <li key={h.id} className="flex items-start gap-3 rounded-xl bg-success-soft p-3 text-sm"><Gift size={20} className="mt-0.5 text-success" weight="duotone" /><div className="flex-1"><p className="font-semibold text-success">{h.label} fee concession</p><p className="text-text-2">Sibling / participation concession (demo) · applied by the finance office</p></div><span className="tnum font-bold text-success">− {fmtMoney(h.concession)}</span></li>)}</ul>}
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2 p-3"><div className="flex items-center gap-2 text-sm"><BellRinging size={18} className="text-primary" /><span>Remind me 3 days before each due date</span></div><Switch checked={remind} onChange={(v) => { setRemind(v); toast.info(v ? "Reminder on. We'll nudge you before each due date." : "Reminders turned off."); }} label="Fee due reminders" /></div></CardBody></Card>
              </div>
              <Card><CardBody><SectionHeader title="Installments" action={!clear && <Button size="sm" onClick={() => setPay(true)}>Pay selected…</Button>} />
                <ul className="space-y-2">{a.installments.map((i) => <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"><div><p className="font-semibold">{i.label}</p><p className="text-xs text-text-2">Due {fmtDate(i.dueDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}{i.status === "partially-paid" || (i.paid > 0 && i.status !== "paid") ? ` · ${fmtMoney(i.paid)} of ${fmtMoney(i.amount)} paid` : ""}{(i.lateFee ?? 0) > 0 ? ` · late fee ${fmtMoney(i.lateFee!)}` : ""}</p></div><div className="flex items-center gap-3"><span className="tnum font-semibold">{fmtMoney(i.status === "paid" ? i.amount : owed(i))}</span><StatusBadge status={i.status} label={INS_LABEL[i.status]} /></div></li>)}</ul></CardBody></Card>
              <Card><CardBody><SectionHeader title="Payment history" subtitle="Every attempt, including pending and failed ones" />
                {a.transactions.length === 0 ? <p className="text-sm text-text-2">No payments yet.</p> : <ul className="space-y-2">{a.transactions.map((t) => <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 p-3 text-sm"><div><p className="font-semibold">{fmtMoney(t.amount)} <span className="font-normal text-text-2">· {t.methodLabel}</span></p><p className="text-xs text-text-2">{fmtDate(t.initiatedAt, { day: "numeric", month: "short", year: "numeric" })} · <span className="font-mono">{t.demoReference}</span></p></div><div className="flex items-center gap-2"><StatusBadge status={t.status} />{t.status === "Pending" && <Button size="sm" variant="outline" loading={refresh.isPending} onClick={() => refresh.mutate(t.id)}><ArrowClockwise size={14} />Refresh</Button>}{t.receiptNumber && <Button size="sm" variant="soft" onClick={() => setReceipt(t)}><Receipt size={14} />Receipt</Button>}{t.status === "Failed" && <Button size="sm" variant="outline" onClick={() => setPay(true)}>Retry</Button>}</div></li>)}</ul>}
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border p-3 text-sm"><ChatCircleText size={20} className="text-primary" /><span className="flex-1 text-text-2">Something look wrong, or need a payment plan?</span><Button variant="outline" size="sm" onClick={() => setContact(true)}>Request clarification / contact finance office</Button></div></CardBody></Card>
              {open.length > 0 && <PaymentWizard key={a.paidTotal + "-" + a.transactions.length} open={pay} onClose={() => setPay(false)} account={a} studentId={studentId} studentName={name} who={mode} onDone={done} onContact={() => { setPay(false); setContact(true); }} onReceipt={(t) => { setPay(false); setReceipt(t); }} />}
              <ReceiptModal txn={receipt} studentName={name} labels={receipt ? a.installments.filter((i) => receipt.installmentIds.includes(i.id)).map((i) => i.label) : []} onClose={() => setReceipt(null)} />
            </div>
          );
        }}
      </Boundary>
      <Modal open={contact} onOpenChange={setContact} title="Contact the finance office" description="Your message goes to Greenfield's finance office, not a teacher." footer={<><Button variant="ghost" onClick={() => setContact(false)}>Cancel</Button><Button loading={clar.isPending} disabled={msg.trim().length < 10} onClick={() => clar.mutate()}>Send request</Button></>}>
        <Field label="What do you need help with?" htmlFor="fee-msg" hint="Don't include card or bank details. Finance will never ask for them here."><Textarea id="fee-msg" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="For example: The Term 2 amount looks higher than last year's concession letter." /></Field>
        <p className="mt-2"><Badge tone="info">Demo: no real office receives this</Badge></p>
      </Modal>
    </div>
  );
}
