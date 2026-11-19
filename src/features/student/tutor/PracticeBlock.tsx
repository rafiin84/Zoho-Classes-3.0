"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle, Circle, Lightbulb, ArrowRight } from "@phosphor-icons/react";
import { Button, Badge, cn } from "@/components/ui";
import { learningProfileService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import type { TutorMcq } from "@/types/tutor";
import { useInvalidateLearning } from "../hooks";

/** Interactive MCQs inside the chat. Each answer updates mastery; weak results surface a gentle remedial recommendation. */
export function PracticeBlock({ questions }: { questions: TutorMcq[] }) {
  const { studentId } = useActors();
  const inv = useInvalidateLearning();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const mastery = useMutation({ mutationFn: (p: { q: TutorMcq; ok: boolean }) => learningProfileService.recordMastery(studentId, p.q.objectiveId, p.ok, p.q.label, p.q.subjectId), onSuccess: inv });
  const answered = Object.keys(answers).length; const done = answered === questions.length;
  const correct = questions.filter((q) => answers[q.id] === q.answer).length;
  const weak = done && correct / questions.length < 0.67;
  const label = questions[0]?.label;
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-3.5">
      <div className="flex items-center justify-between"><p className="text-sm font-semibold">Practice · {answered}/{questions.length} answered</p><Badge tone="primary">Tutor-made</Badge></div>
      {questions.map((q, qi) => {
        const a = answers[q.id]; const has = a !== undefined;
        return (
          <fieldset key={q.id} className="space-y-2" disabled={has}>
            <legend className="text-sm font-medium"><span className="tnum mr-1.5 text-text-2">{qi + 1}.</span>{q.q}</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {q.options.map((o, oi) => {
                const isAns = oi === q.answer; const chosen = a === oi;
                return (
                  <button key={oi} type="button" aria-pressed={chosen} onClick={() => { setAnswers((x) => ({ ...x, [q.id]: oi })); mastery.mutate({ q, ok: oi === q.answer }); }}
                    className={cn("flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors", !has && "border-border hover:border-primary hover:bg-lilac", has && isAns && "border-success bg-success-soft text-success", has && chosen && !isAns && "border-warning bg-warning-soft text-warning", has && !isAns && !chosen && "border-border opacity-60")}>
                    {has && isAns ? <CheckCircle size={18} weight="fill" /> : <Circle size={18} />}<span>{o}</span>{has && chosen && !isAns && <span className="ml-auto text-xs font-semibold">Not quite</span>}{has && isAns && <span className="ml-auto text-xs font-semibold">Answer</span>}
                  </button>
                );
              })}
            </div>
            {has && <p role="status" className="flex gap-1.5 rounded-xl bg-lilac px-3 py-2 text-xs text-text-2"><Lightbulb size={14} weight="fill" className="mt-0.5 shrink-0 text-primary" />{a === q.answer ? "Nice. " : "Good try — here’s the idea: "}{q.explain}</p>}
          </fieldset>
        );
      })}
      {done && (
        <div role="status" className={cn("rounded-2xl p-3.5 text-sm", weak ? "bg-highlight-soft" : "bg-success-soft")}>
          <p className="tnum font-semibold">{correct} of {questions.length} correct{weak ? " — a great place to focus" : " — strong work"}</p>
          {weak ? (<><p className="mt-1 text-text-2">“{label}” still needs a little practice, and that’s completely normal. I’ve noted it, and a short, friendly revision path is ready for you.</p>
            <div className="mt-2.5 flex flex-wrap gap-2"><Button asChild size="sm"><Link href="/student/learn">Open my revision path<ArrowRight size={14} weight="bold" /></Link></Button><Button asChild size="sm" variant="outline"><Link href="/student/micro?review=1">5-minute weak-topic review</Link></Button></div></>) :
            <p className="mt-1 text-text-2">Your mastery for “{label}” just went up. Want a tougher set or a new topic?</p>}
        </div>
      )}
    </div>
  );
}
