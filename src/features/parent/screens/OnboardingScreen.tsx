"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Eye, EyeSlash, Sparkle, ChatCircleDots, UsersThree, ArrowRight, ArrowCounterClockwise } from "@phosphor-icons/react";
import { Avatar, Badge, Button, Card, CardBody, PageHeader, Stepper } from "@/components/ui";
import { useApp } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { useChild } from "../useChild";

const STEPS = ["Your link", "Choose a child", "What you can see", "Your helpers"];
const SEE = ["Attendance and timetable", "Learning progress and strengths", "Released results and marksheets", "School fees and receipts", "Class announcements and events", "Achievements your child shares"];
const PRIVATE = ["Your child's private chats and AI tutor conversations", "Doubts they haven't shared as a message", "Draft work and unreleased marks", "Other children's data, always", "Private portfolio items"];

export default function ParentOnboarding() {
  const { siblings, childId, parent } = useChild(); const setChild = useApp((s) => s.setChild); const done = useApp((s) => s.onboarded.parent); const complete = useApp((s) => s.completeOnboarding); const router = useRouter();
  const [step, setStep] = useState(0);
  const finish = () => { complete("parent", true); router.push("/parent/home"); };
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Welcome, parent" subtitle="A short tour of what you'll see and who you can reach." actions={<>{done && <Button variant="ghost" size="sm" onClick={() => setStep(0)}><ArrowCounterClockwise size={16} />Replay</Button>}<Button variant="ghost" size="sm" onClick={finish}>Skip</Button></>} />
      <div className="mb-5"><Stepper steps={STEPS} current={step} /></div>
      <Card><CardBody className="space-y-4">
        {step === 0 && <><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-lilac text-primary"><ShieldCheck size={26} weight="duotone" /></span><h2 className="text-heading">You&apos;re linked to {siblings.length} {siblings.length === 1 ? "child" : "children"}</h2></div>
          <p className="text-sm leading-relaxed">The school links each parent to their own child. Hello, <strong>{parent.displayName}</strong>: your account is shown as <Badge tone="success">Verified</Badge> in this prototype.</p><p className="rounded-xl bg-highlight-soft p-3 text-sm text-warning">Prototype state only. This is not real identity verification. In the real product the school confirms each relationship, and it can be limited or removed at any time.</p></>}
        {step === 1 && <><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-lilac text-primary"><UsersThree size={26} weight="duotone" /></span><h2 className="text-heading">Whose records do you want to open first?</h2></div><div className="grid gap-3 sm:grid-cols-2">{siblings.map((c) => <button key={c.id} onClick={() => setChild(c.id)} aria-pressed={childId === c.id} className={cn("flex items-center gap-3 rounded-2xl border p-4 text-left", childId === c.id ? "border-primary bg-lilac" : "border-border hover:bg-surface-2")}><Avatar name={c.displayName} color={c.avatarColor} size={48} /><span><span className="block font-semibold">{c.displayName}</span><span className="text-xs text-text-2">{c.gradeLabel} · {c.className}</span></span></button>)}</div><p className="text-xs text-text-2">You can switch children any time from the top bar. Each child&apos;s screens show only that child&apos;s data.</p></>}
        {step === 2 && <><h2 className="text-heading">What you can see, and what stays private</h2><div className="grid gap-4 sm:grid-cols-2"><div><p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-success"><Eye size={18} />You can see</p><ul className="space-y-1.5 text-sm">{SEE.map((s) => <li key={s} className="rounded-lg bg-success-soft px-3 py-1.5">{s}</li>)}</ul></div><div><p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text-2"><EyeSlash size={18} />Stays private</p><ul className="space-y-1.5 text-sm">{PRIVATE.map((s) => <li key={s} className="rounded-lg bg-surface-2 px-3 py-1.5">{s}</li>)}</ul></div></div></>}
        {step === 3 && <><h2 className="text-heading">Two helpers</h2><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-lilac p-4"><Sparkle size={24} weight="duotone" className="text-primary" /><h3 className="mt-1 font-semibold">Parent AI Assistant</h3><p className="text-sm text-text-2">Ask about your child in plain language. Every answer shows its record and date, and says clearly what is fact and what is suggestion. Demo only, no real AI model.</p></div><div className="rounded-2xl bg-lilac p-4"><ChatCircleDots size={24} weight="duotone" className="text-primary" /><h3 className="mt-1 font-semibold">Teacher messages</h3><p className="text-sm text-text-2">Write to your child&apos;s class and subject teachers. It&apos;s separate from your child&apos;s own doubts and from staff chat.</p></div></div></>}
        <div className="flex items-center justify-between border-t border-border pt-4"><Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>{step < STEPS.length - 1 ? <Button onClick={() => setStep(step + 1)}>Next<ArrowRight size={16} /></Button> : <Button onClick={finish}>Go to home</Button>}</div>
      </CardBody></Card>
    </div>
  );
}
