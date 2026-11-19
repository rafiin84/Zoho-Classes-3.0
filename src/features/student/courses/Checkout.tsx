"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, WarningCircle, ShieldCheck, Receipt as ReceiptIcon } from "@phosphor-icons/react";
import { Badge, Button, Modal, Stepper, cn, toast } from "@/components/ui";
import { courseService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import type { Course, CourseOrder } from "@/types";
import { studentKeys } from "../keys";

const METHODS = ["Demo UPI", "Demo card", "Demo net banking", "Demo wallet"];
const OUTCOMES: { v: "success" | "pending" | "failed"; l: string; d: string }[] = [{ v: "success", l: "Payment succeeds", d: "Course unlocks immediately" }, { v: "pending", l: "Payment pending", d: "Bank is still confirming" }, { v: "failed", l: "Payment fails", d: "Nothing is charged" }];

export function ReceiptPreview({ order, course }: { order: CourseOrder; course?: Pick<Course, "title"> }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface-2 p-4 text-sm">
      <div className="mb-2 flex items-center justify-between"><p className="flex items-center gap-1.5 font-bold"><ReceiptIcon size={18} />Course receipt</p><Badge tone="highlight">Demo receipt</Badge></div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-text-2">Reference</dt><dd className="tnum font-semibold">{order.receiptReference}</dd>
        <dt className="text-text-2">Course</dt><dd>{course?.title ?? order.courseId}</dd><dt className="text-text-2">Seller</dt><dd>{order.sellerName}</dd>
        <dt className="text-text-2">Licence</dt><dd>{order.licenceType}</dd><dt className="text-text-2">Amount</dt><dd className="tnum font-semibold">{fmtMoney(order.amount)}</dd>
        <dt className="text-text-2">Status</dt><dd>{order.status}</dd><dt className="text-text-2">Date</dt><dd>{fmtDateTime(order.at)}</dd>
      </dl>
      <p className="mt-2 text-xs text-text-2">Not a tax invoice. No real payment was made. Course purchases are separate from school fees.</p>
    </div>
  );
}

/** Simulated course checkout: summary -> method + demo outcome -> result. No real card data is ever collected. */
export function CheckoutModal({ course, open, onOpenChange }: { course: Course; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { studentId } = useActors(); const qc = useQueryClient();
  const [step, setStep] = useState(0); const [method, setMethod] = useState(METHODS[0]); const [outcome, setOutcome] = useState<"success" | "pending" | "failed">("success"); const [order, setOrder] = useState<CourseOrder | null>(null);
  const done = () => { qc.invalidateQueries({ queryKey: studentKeys.courses(studentId) }); qc.invalidateQueries({ queryKey: studentKeys.orders(studentId) }); qc.invalidateQueries({ queryKey: studentKeys.home(studentId) }); };
  const pay = useMutation({ mutationFn: () => courseService.purchase(studentId, course.id, outcome), onSuccess: (o) => { setOrder(o); setStep(2); done(); }, onError: () => toast.error("Something went wrong. You haven’t been charged.") });
  const refresh = useMutation({ mutationFn: () => courseService.refreshOrder(order!.id), onSuccess: (o) => { setOrder(o); done(); toast.success("Payment confirmed"); } });
  const close = (v: boolean) => { onOpenChange(v); if (!v) setTimeout(() => { setStep(0); setOrder(null); }, 200); };
  return (
    <Modal open={open} onOpenChange={close} title="Buy this course" description="Simulated checkout — no real payment, card or bank details." className="sm:max-w-xl">
      <div className="space-y-4">
        <Stepper steps={["Order", "Pay (demo)", "Done"]} current={step} />
        {step === 0 && <div className="space-y-3">
          <div className="rounded-2xl border border-border p-4"><p className="font-semibold">{course.title}</p><p className="text-sm text-text-2">By {course.creatorName.replace(" (creator)", "")} · {course.language}</p>
            <dl className="mt-3 space-y-1 text-sm"><div className="flex justify-between"><dt className="text-text-2">Licence</dt><dd>Individual · {course.accessDays ?? 365} days access</dd></div><div className="flex justify-between"><dt className="text-text-2">Course price</dt><dd className="tnum">{fmtMoney(course.price)}</dd></div><div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>Total</dt><dd className="tnum">{fmtMoney(course.price)}</dd></div></dl></div>
          <p className="flex items-start gap-2 rounded-xl bg-lilac p-3 text-xs text-text-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" />This is a marketplace purchase from an independent creator. It is separate from your school fees, which are managed under Fees.</p>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => close(false)}>Cancel</Button><Button onClick={() => setStep(1)}>Continue</Button></div></div>}
        {step === 1 && <div className="space-y-4">
          <fieldset><legend className="mb-2 text-sm font-semibold">Payment method (simulated)</legend><div className="grid grid-cols-2 gap-2">{METHODS.map((m) => <label key={m} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium", method === m ? "border-primary bg-lilac" : "border-border")}><input type="radio" name="m" checked={method === m} onChange={() => setMethod(m)} className="accent-[var(--primary)]" />{m}</label>)}</div></fieldset>
          <fieldset><legend className="mb-2 text-sm font-semibold">Demo outcome</legend><div className="space-y-2">{OUTCOMES.map((o) => <label key={o.v} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5", outcome === o.v ? "border-primary bg-lilac" : "border-border")}><input type="radio" name="o" checked={outcome === o.v} onChange={() => setOutcome(o.v)} className="accent-[var(--primary)]" /><span className="text-sm"><span className="font-semibold">{o.l}</span><span className="block text-xs text-text-2">{o.d}</span></span></label>)}</div></fieldset>
          <div className="flex justify-between gap-2"><Button variant="ghost" onClick={() => setStep(0)}>Back</Button><Button loading={pay.isPending} onClick={() => pay.mutate()}>Pay {fmtMoney(course.price)} (demo)</Button></div></div>}
        {step === 2 && order && <div className="space-y-4" role="status">
          {order.status === "Successful" && <div className="text-center"><CheckCircle size={48} weight="fill" className="mx-auto text-success" /><h3 className="mt-2 text-xl font-bold">You’re in!</h3><p className="text-sm text-text-2">Access active for {course.accessDays ?? 365} days. Your course is ready to open.</p></div>}
          {order.status === "Pending" && <div className="text-center"><Clock size={48} weight="fill" className="mx-auto text-warning" /><h3 className="mt-2 text-xl font-bold">Payment pending</h3><p className="text-sm text-text-2">Your bank is still confirming. The course unlocks as soon as it does — you can check again below.</p></div>}
          {order.status === "Failed" && <div className="text-center"><WarningCircle size={48} weight="fill" className="mx-auto text-danger" /><h3 className="mt-2 text-xl font-bold">Payment didn’t go through</h3><p className="text-sm text-text-2">Nothing was charged. Try another method whenever you’re ready.</p></div>}
          <ReceiptPreview order={order} course={course} />
          <div className="flex flex-wrap justify-end gap-2">
            {order.status === "Pending" && <Button variant="outline" loading={refresh.isPending} onClick={() => refresh.mutate()}>Check payment status</Button>}
            {order.status === "Failed" && <Button onClick={() => { setStep(1); setOrder(null); }}>Try again</Button>}
            {order.status === "Successful" && <Button asChild><Link href={`/student/player/${course.id}`}>Open course</Link></Button>}
            <Button variant="ghost" onClick={() => close(false)}>Close</Button></div></div>}
      </div>
    </Modal>
  );
}
