"use client";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle, HourglassMedium, XCircle, DeviceMobile, CreditCard, Bank, ArrowClockwise, ShieldCheck, Receipt } from "@phosphor-icons/react";
import { feeService } from "@/lib/api";
import { Button, Modal, Stepper, Checkbox, Badge, toast } from "@/components/ui";
import { cn } from "@/lib/utils";
import { fmtDate, fmtMoney } from "@/lib/format";
import type { FeeAccount, FeeTransaction } from "@/types";

const STEPS = ["Choose installments", "Review", "Method", "Order summary", "Confirm"];
const METHODS = [{ id: "Demo UPI", icon: <DeviceMobile size={22} weight="duotone" />, note: "Simulated UPI approval" }, { id: "Demo card", icon: <CreditCard size={22} weight="duotone" />, note: "Test card ending 4242 (visual only)" }, { id: "Demo net banking", icon: <Bank size={22} weight="duotone" />, note: "Simulated bank redirect" }];
const OUTCOMES = [{ id: "success", label: "Success", hint: "Balance updates and a receipt is created" }, { id: "pending", label: "Pending", hint: "Bank is still confirming; refresh later" }, { id: "failed", label: "Failed", hint: "Nothing is charged; retry or contact finance" }] as const;
const owed = (i: FeeAccount["installments"][number]) => i.amount - i.paid + (i.lateFee ?? 0);

export function PaymentWizard({ open, onClose, account, studentId, studentName, who, onDone, onContact, onReceipt }: { open: boolean; onClose: () => void; account: FeeAccount; studentId: string; studentName: string; who: "student" | "parent"; onDone: () => void; onContact: () => void; onReceipt: (t: FeeTransaction) => void }) {
  const payable = account.installments.filter((i) => i.status !== "paid");
  const firstDue = payable.find((i) => i.status === "overdue" || i.status === "due" || i.status === "partially-paid") ?? payable[0];
  const [step, setStep] = useState(0); const [sel, setSel] = useState<string[]>(firstDue ? [firstDue.id] : []); const [method, setMethod] = useState(METHODS[0].id); const [outcome, setOutcome] = useState<"success" | "pending" | "failed">("success");
  const [result, setResult] = useState<FeeTransaction | null>(null);
  const chosen = useMemo(() => payable.filter((i) => sel.includes(i.id)), [payable, sel]);
  const total = chosen.reduce((s, i) => s + owed(i), 0); const late = chosen.reduce((s, i) => s + (i.lateFee ?? 0), 0);
  const pay = useMutation({ mutationFn: () => feeService.pay(studentId, sel, method, outcome), onSuccess: (t) => { setResult(t); onDone(); if (t.status === "Successful") toast.success("Payment successful (demo)"); else if (t.status === "Pending") toast.info("Payment pending. You can refresh its status."); else toast.error("Payment failed. Nothing was charged."); }, onError: (e) => toast.error((e as Error).message) });
  const refresh = useMutation({ mutationFn: (id: string) => feeService.refresh(id), onSuccess: (t) => { if (t) { setResult(t); onDone(); toast.success("Bank confirmed the payment"); } } });
  const reset = () => { setStep(0); setResult(null); };
  const close = () => { onClose(); setTimeout(reset, 200); };

  return (
    <Modal open={open} onOpenChange={(o) => !o && close()} title="Pay school fees" description={`${who === "parent" ? `For ${studentName}. ` : ""}Institutional fees only. Simulated payment, no real money moves.`} className="sm:max-w-xl"
      footer={result ? (result.status === "Successful" ? <><Button variant="outline" onClick={() => onReceipt(result)}><Receipt size={16} />View receipt</Button><Button onClick={close}>Done</Button></> : result.status === "Pending" ? <><Button variant="outline" loading={refresh.isPending} onClick={() => refresh.mutate(result.id)}><ArrowClockwise size={16} />Refresh status</Button><Button variant="ghost" onClick={close}>Close</Button></> : <><Button variant="ghost" onClick={onContact}>Contact finance office</Button><Button onClick={() => { setResult(null); setStep(2); }}>Try again</Button></>) :
        <>{step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={pay.isPending}>Back</Button>}{step < 4 ? <Button disabled={step === 0 && sel.length === 0} onClick={() => setStep(step + 1)}>Continue</Button> : <Button loading={pay.isPending} onClick={() => pay.mutate()}>Confirm &amp; pay {fmtMoney(total)}</Button>}</>}>
      {!result && <div className="mb-4"><Stepper steps={STEPS} current={step} /></div>}
      {result ? (
        <div className="py-2 text-center" role="status" aria-live="polite">
          {result.status === "Successful" && <><CheckCircle size={52} weight="fill" className="mx-auto text-success" /><h3 className="mt-2 text-heading">Payment received</h3><p className="mt-1 text-sm text-text-2">{fmtMoney(result.amount)} · receipt <span className="font-mono">{result.receiptNumber}</span>. The balance has been updated for the school finance office too.</p></>}
          {result.status === "Pending" && <><HourglassMedium size={52} weight="fill" className="mx-auto text-warning" /><h3 className="mt-2 text-heading">Payment pending</h3><p className="mt-1 text-sm text-text-2">Your bank hasn&apos;t confirmed yet. Reference <span className="font-mono">{result.demoReference}</span>. Installments stay open until it clears. Use Refresh status to check again.</p></>}
          {result.status === "Failed" && <><XCircle size={52} weight="fill" className="mx-auto text-danger" /><h3 className="mt-2 text-heading">Payment didn&apos;t go through</h3><p className="mt-1 text-sm text-text-2">Nothing was charged. Reference <span className="font-mono">{result.demoReference}</span>. Try again with a different method, or ask the finance office for help.</p></>}
        </div>
      ) : step === 0 ? (
        <div className="space-y-2"><p className="text-sm text-text-2">Select the installments to pay now.</p>{payable.map((i) => <div key={i.id} className={cn("rounded-xl border p-3", sel.includes(i.id) ? "border-primary bg-lilac" : "border-border")}><div className="flex items-center justify-between gap-2"><Checkbox checked={sel.includes(i.id)} onChange={(v) => setSel((s) => (v ? [...s, i.id] : s.filter((x) => x !== i.id)))} label={`${i.label} · due ${fmtDate(i.dueDate)}`} /><span className="tnum font-semibold">{fmtMoney(owed(i))}</span></div>{(i.lateFee ?? 0) > 0 && <p className="ml-7 mt-1 text-xs text-danger">Includes late fee {fmtMoney(i.lateFee!)}</p>}{i.paid > 0 && <p className="ml-7 mt-1 text-xs text-text-2">{fmtMoney(i.paid)} already paid</p>}</div>)}</div>
      ) : step === 1 ? (
        <div className="space-y-2 text-sm"><p className="text-text-2">Check the amounts before choosing how to pay.</p>{chosen.map((i) => <div key={i.id} className="rounded-xl bg-surface-2 p-3"><div className="flex justify-between font-semibold"><span>{i.label}</span><span className="tnum">{fmtMoney(owed(i))}</span></div><p className="text-xs text-text-2">Due {fmtDate(i.dueDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {i.status === "overdue" ? "overdue" : i.status === "upcoming" ? "paying early" : "on time"}</p></div>)}{account.concessionTotal > 0 && <p className="rounded-xl bg-success-soft p-3 text-success">Your concession of {fmtMoney(account.concessionTotal)} (Activity fee) is already applied to the amounts above.</p>}</div>
      ) : step === 2 ? (
        <div className="space-y-4">
          <fieldset><legend className="mb-2 text-sm font-semibold">Payment method <Badge tone="highlight">Test only</Badge></legend><div className="space-y-2">{METHODS.map((m) => <label key={m.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3", method === m.id ? "border-primary bg-lilac" : "border-border")}><input type="radio" name="method" className="sr-only" checked={method === m.id} onChange={() => setMethod(m.id)} /><span className="text-primary">{m.icon}</span><span><span className="block text-sm font-semibold">{m.id}</span><span className="text-xs text-text-2">{m.note}</span></span></label>)}</div><p className="mt-2 flex items-center gap-1.5 text-xs text-text-2"><ShieldCheck size={14} />No card number, UPI ID or bank login is ever asked for in this prototype.</p></fieldset>
          <fieldset><legend className="mb-2 text-sm font-semibold">Demo: choose what happens</legend><div className="grid gap-2 sm:grid-cols-3">{OUTCOMES.map((o) => <label key={o.id} className={cn("cursor-pointer rounded-xl border p-3 text-center", outcome === o.id ? "border-primary bg-lilac" : "border-border")}><input type="radio" name="outcome" className="sr-only" checked={outcome === o.id} onChange={() => setOutcome(o.id)} /><span className="block text-sm font-semibold">{o.label}</span><span className="text-xs text-text-2">{o.hint}</span></label>)}</div></fieldset>
        </div>
      ) : step === 3 ? (
        <dl className="space-y-2 rounded-2xl bg-surface-2 p-4 text-sm"><div className="flex justify-between"><dt className="text-text-2">Student</dt><dd className="font-medium">{studentName}</dd></div>{chosen.map((i) => <div key={i.id} className="flex justify-between"><dt className="text-text-2">{i.label}</dt><dd className="tnum">{fmtMoney(i.amount - i.paid)}</dd></div>)}{late > 0 && <div className="flex justify-between"><dt className="text-text-2">Late fee</dt><dd className="tnum">{fmtMoney(late)}</dd></div>}<div className="flex justify-between"><dt className="text-text-2">Method</dt><dd>{method} (simulated)</dd></div><div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>Total</dt><dd className="tnum">{fmtMoney(total)}</dd></div></dl>
      ) : (
        <div className="space-y-3 text-sm"><p>You&apos;re about to pay <strong className="tnum">{fmtMoney(total)}</strong> using <strong>{method}</strong>. The demo outcome will be <strong>{outcome}</strong>.</p><p className="rounded-xl bg-highlight-soft p-3 text-warning">This is a simulation. No real payment is made.</p></div>
      )}
    </Modal>
  );
}
