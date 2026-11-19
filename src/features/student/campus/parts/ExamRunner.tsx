"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Flag, CaretLeft, CaretRight, Timer, CloudCheck, ListChecks, WarningCircle } from "@phosphor-icons/react";
import { examService } from "@/lib/api/examService";
import { Button, Card, CardBody, Modal, ConfirmDialog, Badge, Progress, toast } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Exam, ExamAttempt, AnswerValue } from "@/types/exams";
import { QuestionView, hasAnswer, validateAnswer } from "@/features/assessment/renderers";
import { useApp } from "@/stores/app-store";

const fmt = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function ExamRunner({ exam, attempt, onSubmitted }: { exam: Exam; attempt: ExamAttempt; onSubmitted: (a: ExamAttempt) => void }) {
  const setUnsaved = useApp((s) => s.setUnsaved);
  const timed = exam.durationMinutes > 0; const qs = exam.questions;
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(attempt.answers ?? {});
  const [flagged, setFlagged] = useState<string[]>(attempt.flagged ?? []);
  const [cur, setCur] = useState(0); const [remaining, setRemaining] = useState(attempt.remainingSeconds); const [elapsed, setElapsed] = useState(0);
  const [review, setReview] = useState(false); const [confirm, setConfirm] = useState(false); const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false); const [warned, setWarned] = useState(false);
  const live = useRef({ answers, flagged, remaining }); live.current = { answers, flagged, remaining };
  const done = useRef(false);

  const submit = useMutation({ mutationFn: (auto: boolean) => examService.submit(attempt.id, live.current.answers, live.current.flagged, auto), onSuccess: (a, auto) => { done.current = true; setUnsaved(false); toast.success(auto ? "Time's up. Your answers were submitted." : exam.kind === "practice" ? "Practice complete" : "Submitted. Your attempt is now locked."); onSubmitted(a); }, onError: (e) => toast.error((e as Error).message || "Couldn't submit. Your answers are safe; try again.") });
  const save = useCallback(async () => { if (done.current) return; const r = await examService.saveProgress(attempt.id, live.current.answers, live.current.flagged, live.current.remaining); if (r.savedAt) { setSavedAt(new Date().toLocaleTimeString("en-IN")); setDirty(false); } }, [attempt.id]);

  useEffect(() => { const t = setInterval(() => { if (done.current) return; if (timed) setRemaining((r) => Math.max(0, r - 1)); else setElapsed((e) => e + 1); }, 1000); return () => clearInterval(t); }, [timed]);
  useEffect(() => { if (timed && remaining === 0 && !done.current && !submit.isPending) submit.mutate(true); if (timed && remaining === 300 && !warned) { setWarned(true); toast.warning("5 minutes left. Review your flagged questions."); } }, [remaining, timed, warned, submit]);
  useEffect(() => { const t = setInterval(() => { if (dirty) void save(); }, 5000); return () => clearInterval(t); }, [dirty, save]);
  useEffect(() => { setUnsaved(true); return () => setUnsaved(false); }, [setUnsaved]);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (!done.current) { e.preventDefault(); } }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, []);

  const q = qs[cur]; const setAns = (v: AnswerValue | undefined) => { setAnswers((a) => { const n = { ...a }; if (v === undefined) delete n[q.id]; else n[q.id] = v; return n; }); setDirty(true); };
  const toggleFlag = () => { setFlagged((f) => (f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id])); setDirty(true); };
  const status = (id: string) => (flagged.includes(id) ? "flagged" : hasAnswer(answers[id]) ? "answered" : "unanswered");
  const answered = useMemo(() => qs.filter((x) => hasAnswer(answers[x.id])).length, [qs, answers]);
  const invalid = qs.filter((x) => validateAnswer(x, answers[x.id]));
  const low = timed && remaining <= 300;

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-20 -mx-1 rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{exam.title}</p><p className="text-xs text-text-2">{answered}/{qs.length} answered · {flagged.length} flagged</p></div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 text-xs text-text-2 sm:inline-flex" aria-live="polite"><CloudCheck size={16} />{savedAt ? `Autosaved ${savedAt} (simulated)` : "Autosave on"}</span>
            <span role="timer" aria-label={timed ? `Time remaining ${fmt(remaining)}` : `Time spent ${fmt(elapsed)}`} className={cn("tnum inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold", low ? "bg-danger-soft text-danger" : "bg-lilac text-primary")}><Timer size={16} weight="fill" />{timed ? fmt(remaining) : `${fmt(elapsed)} · untimed`}</span>
            <Button onClick={() => { void save(); setReview(true); }}><ListChecks size={18} />Review &amp; submit</Button>
          </div>
        </div>
        <Progress value={(answered / qs.length) * 100} size="sm" className="mt-2" label="Questions answered" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <Card><CardBody className="space-y-6">
          <QuestionView key={q.id} question={q} value={answers[q.id]} onChange={setAns} index={cur} flagged={flagged.includes(q.id)} mode="attempt" disabled={submit.isPending} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <Button variant="outline" disabled={cur === 0} onClick={() => setCur((c) => c - 1)}><CaretLeft size={16} />Previous</Button>
            <Button variant={flagged.includes(q.id) ? "soft" : "ghost"} onClick={toggleFlag} aria-pressed={flagged.includes(q.id)}><Flag size={16} weight={flagged.includes(q.id) ? "fill" : "regular"} />{flagged.includes(q.id) ? "Unflag" : "Flag for review"}</Button>
            {cur < qs.length - 1 ? <Button onClick={() => setCur((c) => c + 1)}>Next<CaretRight size={16} /></Button> : <Button onClick={() => { void save(); setReview(true); }}>Finish &amp; review</Button>}
          </div>
        </CardBody></Card>
        <Card className="h-fit lg:sticky lg:top-40"><CardBody>
          <p className="mb-3 text-sm font-semibold">Question palette</p>
          <div className="grid grid-cols-5 gap-2" role="group" aria-label="Question palette">{qs.map((x, i) => { const st = status(x.id); return <button key={x.id} onClick={() => setCur(i)} aria-label={`Question ${i + 1}, ${st}${i === cur ? ", current" : ""}`} aria-current={i === cur ? "step" : undefined} className={cn("tnum relative h-11 rounded-xl border text-sm font-bold transition-colors", i === cur && "ring-2 ring-primary ring-offset-2 ring-offset-surface", st === "answered" ? "border-success bg-success-soft text-success" : st === "flagged" ? "border-highlight bg-highlight-soft text-warning" : "border-border bg-surface text-text-2")}>{i + 1}{st === "flagged" && <Flag size={10} weight="fill" className="absolute right-1 top-1" />}</button>; })}</div>
          <ul className="mt-3 space-y-1 text-xs text-text-2"><li><Badge tone="success">Answered</Badge></li><li><Badge tone="highlight">Flagged</Badge></li><li><Badge>Not answered</Badge></li></ul>
        </CardBody></Card>
      </div>
      <Modal open={review} onOpenChange={setReview} title="Review before you submit" description={`${answered} of ${qs.length} questions answered.`} className="sm:max-w-xl" footer={<><Button variant="ghost" onClick={() => setReview(false)}>Keep working</Button><Button disabled={invalid.length > 0 || submit.isPending} onClick={() => setConfirm(true)}>Submit {exam.kind === "practice" ? "practice" : "exam"}</Button></>}>
        {qs.length - answered > 0 && <p className="mb-3 flex items-center gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning"><WarningCircle size={18} />{qs.length - answered} unanswered. You can still submit, but unanswered questions score zero.</p>}
        {invalid.length > 0 && <p role="alert" className="mb-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">Fix {invalid.length} answer{invalid.length === 1 ? "" : "s"} before submitting: {invalid.map((x) => `Q${qs.indexOf(x) + 1}`).join(", ")}.</p>}
        <ul className="space-y-1.5">{qs.map((x, i) => { const st = status(x.id); return <li key={x.id}><button className="flex w-full items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-left text-sm hover:bg-lilac" onClick={() => { setCur(i); setReview(false); }}><span className="truncate"><span className="tnum mr-2 font-bold">{i + 1}.</span>{x.prompt.slice(0, 54)}{x.prompt.length > 54 ? "…" : ""}</span><Badge tone={st === "answered" ? "success" : st === "flagged" ? "highlight" : "neutral"}>{st === "answered" ? "Answered" : st === "flagged" ? "Flagged" : "Blank"}</Badge></button></li>; })}</ul>
      </Modal>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Submit now?" body={exam.kind === "practice" ? "You'll see your score and the answer key straight away." : "Once submitted, your attempt is locked and can't be changed. Your teacher will release marks later."} confirmLabel="Yes, submit" onConfirm={() => { setReview(false); submit.mutate(false); }} />
    </div>
  );
}
