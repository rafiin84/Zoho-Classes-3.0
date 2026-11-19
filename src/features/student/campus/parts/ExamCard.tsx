"use client";
import Link from "next/link";
import { Clock, CalendarBlank, Infinity as Inf, ListChecks } from "@phosphor-icons/react";
import { Badge, Card, StatusBadge } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/format";
import type { ExamView, ExamState } from "@/types/exams";
import { SubjectChip } from "../shared";

export const EXAM_STATE_LABEL: Record<ExamState, string> = { upcoming: "Upcoming", available: "Available", "in-progress": "In progress", submitted: "Submitted", results: "Results out", closed: "Window closed", cancelled: "Cancelled" };
const KIND = { exam: "Exam", "unit-test": "Unit test", practice: "Practice" } as const;

export function ExamCard({ v, href }: { v: ExamView; href: string }) {
  const e = v.exam; const score = v.resultVisible && v.attempt?.score !== undefined && e.kind !== "practice";
  return (
    <Link href={href} className="group block focus-visible:outline-2">
      <Card className="h-full p-4 transition-shadow group-hover:shadow-card sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2"><SubjectChip subjectId={e.subjectId} /><Badge tone={e.kind === "practice" ? "info" : "primary"}>{KIND[e.kind]}</Badge><StatusBadge status={v.state === "closed" ? "overdue" : v.state === "in-progress" ? "pending" : v.state} label={EXAM_STATE_LABEL[v.state]} /></div>
        <h3 className="text-base font-semibold leading-snug group-hover:text-primary">{e.title}</h3>
        <p className="mt-0.5 text-sm text-text-2">{e.teacherName}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-2">
          {e.kind !== "practice" && <span className="inline-flex items-center gap-1"><CalendarBlank size={14} />{fmtDate(e.opensAt, { weekday: "short", day: "numeric", month: "short" })}, {fmtTime(e.opensAt)} IST</span>}
          <span className="inline-flex items-center gap-1">{e.durationMinutes ? <><Clock size={14} />{e.durationMinutes} min</> : <><Inf size={14} />Untimed</>}</span>
          <span className="inline-flex items-center gap-1"><ListChecks size={14} />{e.questions.length} questions · {e.totalMarks} marks</span>
        </div>
        {v.state === "submitted" && <p className="mt-2 text-xs font-medium text-warning">Marks not released yet. Your teacher will publish them.</p>}
        {score && <p className="tnum mt-2 text-sm font-bold text-primary">{v.attempt!.score}/{v.attempt!.maxScore}</p>}
        {e.kind === "practice" && v.attempt?.status === "graded" && <p className="mt-2 text-xs text-text-2">Last practice: <span className="tnum font-semibold text-text">{v.attempt.score}/{v.attempt.maxScore}</span></p>}
      </Card>
    </Link>
  );
}
