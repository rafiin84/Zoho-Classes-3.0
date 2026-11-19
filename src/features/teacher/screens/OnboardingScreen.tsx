"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Sparkle, ChatCircleDots, Newspaper, CheckCircle, PencilSimple, XCircle, ArrowLeft, ArrowRight, ArrowCounterClockwise } from "@phosphor-icons/react";
import { Button, Card, CardBody, Stepper, Badge, AIBadge, Checkbox, PageHeader, toast, SkeletonCards, ErrorState } from "@/components/ui";
import { useApp } from "@/stores/app-store";
import { doubtService, feedService } from "@/lib/api";
import { CLASSROOMS, subjectById, INSTITUTIONS } from "@/lib/mock-data/core";
import { nameOf } from "@/lib/api/teacherInsightService";
import { relTime } from "@/lib/format";
import { useTeacher, KEYS } from "../components/common";

const STEPS = ["Welcome", "Your classes", "AI Workspace", "Reviewing AI work", "Inbox & feed", "First action"];

export default function OnboardingScreen() {
  const router = useRouter();
  const { id, name, teacher } = useTeacher();
  const done = useApp((s) => s.onboarded.teacher);
  const complete = useApp((s) => s.completeOnboarding);
  const [step, setStep] = React.useState(0);
  const [classes, setClasses] = React.useState<string[]>(teacher.classIds);
  const [sample, setSample] = React.useState<"pending" | "approved" | "edited" | "rejected">("pending");
  const doubts = useQuery({ queryKey: [...KEYS.doubts, id], queryFn: () => doubtService.forTeacher(id), enabled: step === 4 });
  const feed = useQuery({ queryKey: [...KEYS.feed, "onb"], queryFn: () => feedService.list({ role: "teacher", id }, { filter: "class", size: 3 }), enabled: step === 4 });
  const finish = (target = "overview") => { complete("teacher"); toast.success(done ? "Tour closed" : "You're all set"); router.push(`/teacher/${target}`); };
  const inst = INSTITUTIONS[0];
  const subjects = [...new Set(teacher.subjectIds)].map((s) => subjectById(s));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Welcome to your teaching workspace" subtitle={done ? "You've completed this tour. Replay any time." : "A two-minute tour. You can skip and replay it later."}
        actions={<><Button variant="ghost" size="sm" onClick={() => { setStep(0); setSample("pending"); }}><ArrowCounterClockwise size={16} />Replay</Button><Button variant="ghost" size="sm" onClick={() => finish()}>Skip tour</Button></>} />
      <div className="mb-4"><Stepper steps={STEPS} current={step} /></div>
      <Card><CardBody className="min-h-72 space-y-4" aria-live="polite">
        {step === 0 && (<>
          <h2 className="text-heading">Hello, {name}</h2>
          <p className="text-sm text-text-2">You are signed in as a <strong>teacher</strong> at <strong>{inst.name}</strong> ({teacher.departmentName}). Your workspace is built for speed: your day at a glance, a conversational AI Workspace for preparation, and one place to follow every student.</p>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">{["Overview shows today's periods, doubts and grading", "AI drafts — you decide what is published or graded", "Student and parent views update when you approve", "Your actions are logged for audit"].map((t) => <li key={t} className="flex items-start gap-2 rounded-xl bg-surface-2 p-3"><CheckCircle size={18} weight="fill" className="mt-0.5 text-success" />{t}</li>)}</ul>
        </>)}
        {step === 1 && (<>
          <h2 className="text-heading">Confirm your classes and subjects</h2>
          <p className="text-sm text-text-2">These come from your timetable assignment. Untick any you want hidden from your Overview.</p>
          <div className="space-y-2">{teacher.classIds.map((cid) => { const c = CLASSROOMS.find((x) => x.id === cid)!; return <div key={cid} className="flex items-center justify-between rounded-xl border border-border p-3"><Checkbox checked={classes.includes(cid)} onChange={(v) => setClasses((p) => (v ? [...p, cid] : p.filter((x) => x !== cid)))} label={`${c.name} · ${c.studentIds.length || "—"} students`} /><span className="text-xs text-text-2">{subjects.map((s) => s.name).join(", ")}</span></div>; })}</div>
          {!classes.length && <p role="alert" className="text-xs font-medium text-danger">Select at least one class to continue.</p>}
        </>)}
        {step === 2 && (<>
          <div className="flex items-center gap-2"><Sparkle size={22} className="text-primary" weight="fill" /><h2 className="text-heading">Your AI Workspace</h2><AIBadge label="AI · demo" /></div>
          <p className="text-sm text-text-2">Ask in plain language or pick a suggested action — prepare a lesson, generate MCQs, draft a parent update. The workspace shows what it plans to do, then a preview you can <strong>Approve</strong>, <strong>Edit</strong> or <strong>Reject</strong>.</p>
          <div className="grid gap-2 sm:grid-cols-3">{[["Answer", "Read-only questions are answered directly."], ["Proposed action", "Commands show scope, audience and approval needed."], ["Approval", "Nothing publishes, grades or sends until you approve."]].map(([t, b]) => <div key={t} className="rounded-xl bg-lilac p-3"><p className="text-sm font-bold text-primary">{t}</p><p className="mt-1 text-xs text-text-2">{b}</p></div>)}</div>
          <p className="text-xs text-text-2">In this prototype no real AI model runs; outputs are labelled demo drafts.</p>
        </>)}
        {step === 3 && (<>
          <h2 className="text-heading">Try reviewing a generated item</h2>
          <div className="rounded-2xl border border-border p-4">
            <div className="mb-2 flex items-center gap-2"><AIBadge /><Badge tone="highlight">Sample · nothing is saved</Badge></div>
            <p className="font-semibold">Exit ticket: What is 2/5 + 1/3?</p>
            <p className="mt-1 text-sm text-text-2">Answer 11/15 — LCD 15: 6/15 + 5/15.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="success" onClick={() => setSample("approved")}><CheckCircle size={16} />Approve</Button>
              <Button size="sm" variant="outline" onClick={() => setSample("edited")}><PencilSimple size={16} />Edit</Button>
              <Button size="sm" variant="outline" onClick={() => setSample("rejected")}><XCircle size={16} />Reject</Button>
            </div>
            <p role="status" className="mt-3 text-sm font-medium">{sample === "pending" ? "Choose an option to see what would happen." : sample === "approved" ? "Approved — in the real workspace this would now appear in the course for students." : sample === "edited" ? "Edit opens the fields so you can change the wording before approving." : "Rejected — nothing is published and the draft is discarded."}</p>
          </div>
        </>)}
        {step === 4 && (<>
          <h2 className="text-heading">Your inbox and class feed</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold"><ChatCircleDots size={16} />Doubts inbox</h3>
              {doubts.isLoading ? <SkeletonCards n={2} h="h-14" /> : doubts.isError ? <ErrorState onRetry={() => doubts.refetch()} /> : <ul className="space-y-2">{(doubts.data ?? []).slice(0, 3).map((d) => <li key={d.id} className="rounded-xl bg-surface-2 p-2.5 text-sm"><p className="font-semibold">{d.title}</p><p className="text-xs text-text-2">{nameOf(d.studentId)} · {relTime(d.updatedAt)}</p></li>)}</ul>}</div>
            <div><h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold"><Newspaper size={16} />Class feed</h3>
              {feed.isLoading ? <SkeletonCards n={2} h="h-14" /> : feed.isError ? <ErrorState onRetry={() => feed.refetch()} /> : <ul className="space-y-2">{(feed.data?.items ?? []).slice(0, 3).map((p) => <li key={p.id} className="rounded-xl bg-surface-2 p-2.5 text-sm"><p className="line-clamp-2">{p.text}</p><p className="text-xs text-text-2">{p.authorName} · {p.audienceLabel}</p></li>)}</ul>}</div>
          </div>
        </>)}
        {step === 5 && (<>
          <h2 className="text-heading">Take your first action</h2>
          <p className="text-sm text-text-2">The fastest way to feel the workspace: prepare tomorrow's lesson. You'll review the draft before anything reaches students.</p>
          <div className="flex flex-wrap gap-2"><Button onClick={() => finish("workspace?action=lesson")}><Sparkle size={16} />Prepare tomorrow's lesson</Button><Button variant="outline" onClick={() => finish()}>Go to Overview instead</Button></div>
        </>)}
      </CardBody></Card>
      <div className="mt-4 flex justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ArrowLeft size={16} />Back</Button>
        {step < STEPS.length - 1 && <Button disabled={step === 1 && !classes.length} onClick={() => setStep((s) => s + 1)}>Next<ArrowRight size={16} /></Button>}
      </div>
    </div>
  );
}
