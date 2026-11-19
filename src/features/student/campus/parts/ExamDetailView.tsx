"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, ListChecks, Lock, Play, ArrowClockwise, ShieldCheck, Hourglass, Trophy } from "@phosphor-icons/react";
import { examService } from "@/lib/api/examService";
import { Button, Card, CardBody, EmptyState, PageHeader, SectionHeader, Skeleton, StatusBadge, ConfirmDialog, toast, Progress } from "@/components/ui";
import { fmtDate, fmtDateTime, fmtTime } from "@/lib/format";
import { useApp } from "@/stores/app-store";
import type { ExamAttempt } from "@/types/exams";
import { QuestionView } from "@/features/assessment/renderers";
import { ck } from "../keys";
import { Boundary, BackLink, SubjectChip } from "../shared";
import { EXAM_STATE_LABEL } from "./ExamCard";
import { ExamRunner } from "./ExamRunner";

function ResultReview({ attemptId }: { attemptId: string }) {
  const q = useQuery({ queryKey: ["campus", "review", attemptId], queryFn: () => examService.review(attemptId), retry: false });
  return <Boundary q={q} skeleton={<Skeleton className="h-40" />}>{({ exam, attempt }) => Object.keys(attempt.answers).length === 0 && !attempt.perQuestion ? <EmptyState title="Answer review isn't available" body="This attempt's marks were recorded by your teacher. Question-by-question review isn't stored for it." /> : (
    <div className="space-y-4">{exam.questions.map((qq, i) => <Card key={qq.id}><CardBody><QuestionView question={qq} value={attempt.answers[qq.id]} onChange={() => {}} mode="review" index={i} result={attempt.perQuestion?.[qq.id]} /></CardBody></Card>)}</div>)}</Boundary>;
}

export function ExamDetailView({ id, studentId, readOnly }: { id: string; studentId: string; readOnly?: boolean }) {
  const qc = useQueryClient(); const [confirmReset, setConfirmReset] = useState(false); const [running, setRunning] = useState<ExamAttempt | null>(null); const [showReview, setShowReview] = useState(false);
  const q = useQuery({ queryKey: ck.exam(id, studentId), queryFn: () => examService.get(id, studentId) });
  const inval = () => { qc.invalidateQueries({ queryKey: ck.exams(studentId) }); qc.invalidateQueries({ queryKey: ck.exam(id, studentId) }); };
  const start = useMutation({ mutationFn: () => examService.start(id, studentId), onSuccess: (a) => { setRunning(a); inval(); }, onError: (e) => toast.error((e as Error).message) });
  const reset = useMutation({ mutationFn: () => examService.resetAttempt(id, studentId), onSuccess: () => { toast.success("Attempt reset (demo admin). You can sit the exam again."); setRunning(null); inval(); } });
  const setUnsaved = useApp((s) => s.setUnsaved);
  return (
    <div>
      <BackLink href="/student/exams" label="All exams" />
      <Boundary q={q} skeleton={<div className="space-y-3"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-48" /></div>} empty={<EmptyState title="Exam not found" body="It may not be set for your class." action={{ label: "Back to exams", href: "/student/exams" }} />}>
        {(v) => {
          const e = v.exam; const a = v.attempt;
          if (running) return <ExamRunner exam={e} attempt={running} onSubmitted={(x) => { setRunning(null); setUnsaved(false); inval(); if (e.kind === "practice") setShowReview(true); void x; }} />;
          const window = e.kind !== "practice" ? `${fmtDate(e.opensAt, { weekday: "long", day: "numeric", month: "long" })}, ${fmtTime(e.opensAt)} – ${fmtTime(e.closesAt)} IST` : "Open any time";
          return (
            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
              <div className="space-y-5">
                <PageHeader title={e.title} subtitle={`${e.teacherName} · ${e.kind === "practice" ? "Practice test" : e.kind === "unit-test" ? "Unit test" : "Exam"}`} eyebrow={<div className="flex gap-2"><SubjectChip subjectId={e.subjectId} /><StatusBadge status={v.state === "closed" ? "overdue" : v.state === "in-progress" ? "pending" : v.state} label={EXAM_STATE_LABEL[v.state]} /></div>} />
                <Card><CardBody><SectionHeader title="Before you begin" /><ol className="list-decimal space-y-2 pl-5 text-[0.95rem] leading-relaxed">{e.instructions.map((i) => <li key={i}>{i}</li>)}</ol>
                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-lilac p-3 text-sm text-primary"><ShieldCheck size={18} className="mt-0.5 shrink-0" />{e.kind === "practice" ? "Practice never counts towards marks. Retake as many times as you like." : "Your answers autosave on this device (simulated). Submitting locks your attempt."}</p></CardBody></Card>
                {v.state === "submitted" && a && <Card><CardBody className="flex items-start gap-3"><Hourglass size={28} weight="duotone" className="text-warning" /><div><h3 className="font-semibold">Submitted {a.submittedAt ? fmtDateTime(a.submittedAt) : ""}</h3><p className="mt-1 text-sm text-text-2">Your attempt is locked. Your score and answers stay hidden until {e.teacherName} releases results.</p></div></CardBody></Card>}
                {(v.state === "results" || (e.kind === "practice" && a?.status === "graded")) && a && (
                  <Card tone="lilac"><CardBody><div className="flex flex-wrap items-center gap-4"><div className="flex size-16 items-center justify-center rounded-2xl bg-surface text-primary shadow-soft"><Trophy size={30} weight="duotone" /></div><div className="flex-1"><p className="tnum text-3xl font-bold text-primary">{a.score}<span className="text-lg text-text-2">/{a.maxScore ?? e.totalMarks}</span></p><p className="text-sm text-text-2">{e.kind === "practice" ? "Practice score · written answers aren't auto-marked" : "Released by your teacher"}</p></div>
                    <Button variant="outline" onClick={() => setShowReview((s) => !s)}>{showReview ? "Hide" : "Review"} answers</Button></div>
                    {a.maxScore ? <Progress className="mt-4" value={((a.score ?? 0) / a.maxScore) * 100} label="Score" /> : null}</CardBody></Card>
                )}
                {showReview && a && <ResultReview attemptId={a.id} />}
              </div>
              <aside className="space-y-3">
                <Card><CardBody className="space-y-3 text-sm">
                  <div className="flex items-start gap-2"><Clock size={18} className="mt-0.5 text-primary" /><div><p className="font-semibold">{e.durationMinutes ? `${e.durationMinutes} minutes` : "Untimed"}</p><p className="text-text-2">{window}</p></div></div>
                  <div className="flex items-center gap-2"><ListChecks size={18} className="text-primary" /><span className="tnum">{e.questions.length} questions · {e.totalMarks} marks</span></div>
                  {v.state === "available" && !readOnly && <Button className="w-full" size="lg" loading={start.isPending} onClick={() => start.mutate()}><Play size={18} weight="fill" />{e.kind === "practice" ? (a ? "Practise again" : "Start practice") : "Start exam"}</Button>}
                  {v.state === "in-progress" && !readOnly && <Button className="w-full" size="lg" loading={start.isPending} onClick={() => start.mutate()}><Play size={18} weight="fill" />Resume attempt</Button>}
                  {v.state === "upcoming" && <p className="rounded-xl bg-surface-2 p-3 text-text-2">Opens {fmtDateTime(e.opensAt)}. You'll be able to start from here.</p>}
                  {v.state === "closed" && <p className="rounded-xl bg-danger-soft p-3 text-danger">The window closed before an attempt was made. Please speak to {e.teacherName}.</p>}
                  {(v.state === "submitted" || v.state === "results") && e.kind !== "practice" && <p className="flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-text-2"><Lock size={16} />Attempt locked</p>}
                  {(v.state === "submitted" || v.state === "results") && e.kind !== "practice" && !readOnly && <Button variant="ghost" size="sm" className="w-full" onClick={() => setConfirmReset(true)}><ArrowClockwise size={16} />Reset attempt (demo admin)</Button>}
                </CardBody></Card>
              </aside>
              <ConfirmDialog open={confirmReset} onOpenChange={setConfirmReset} title="Reset this attempt?" body="Demo admin only: this deletes the locked attempt so the exam can be taken again. Real students can't do this." confirmLabel="Reset attempt" destructive onConfirm={() => reset.mutate()} />
            </div>
          );
        }}
      </Boundary>
    </div>
  );
}
