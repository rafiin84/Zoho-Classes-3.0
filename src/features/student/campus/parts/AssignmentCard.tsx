"use client";
import Link from "next/link";
import { CalendarBlank, Paperclip, ChatCircleText } from "@phosphor-icons/react";
import { Badge, Card, StatusBadge } from "@/components/ui";
import { fmtDate, fmtTime, relTime } from "@/lib/format";
import type { Assignment, AssignmentSubmission } from "@/types";
import { SubjectChip } from "../shared";

export const STATUS_LABEL: Record<AssignmentSubmission["status"], string> = { todo: "To do", draft: "Draft saved", submitted: "Submitted", returned: "Returned", graded: "Graded", overdue: "Overdue" };
export type AssignmentRow = { assignment: Assignment; submission: AssignmentSubmission };

export function AssignmentCard({ row, href }: { row: AssignmentRow; href: string }) {
  const { assignment: a, submission: s } = row;
  const late = s.status === "overdue";
  return (
    <Link href={href} className="group block focus-visible:outline-2">
      <Card className="p-4 transition-shadow group-hover:shadow-card sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2"><SubjectChip subjectId={a.subjectId} /><StatusBadge status={s.status} label={STATUS_LABEL[s.status]} /></div>
            <h3 className="text-base font-semibold leading-snug group-hover:text-primary">{a.title}</h3>
            <p className="mt-0.5 text-sm text-text-2">{a.courseTitle} · {a.teacherName}</p>
          </div>
          <div className="text-right">
            {s.releaseStatus === "released" && s.marks !== undefined ? <p className="tnum text-xl font-bold text-primary">{s.marks}<span className="text-sm font-medium text-text-2">/{a.totalMarks}</span></p> : <p className="tnum text-sm font-semibold text-text-2">{a.totalMarks} marks</p>}
            {s.status === "submitted" && <p className="text-xs text-text-2">Marks not released yet</p>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-2">
          <span className={`inline-flex items-center gap-1 ${late ? "font-semibold text-danger" : ""}`}><CalendarBlank size={14} />Due {fmtDate(a.dueAt, { weekday: "short", day: "numeric", month: "short" })}, {fmtTime(a.dueAt)} IST · {relTime(a.dueAt)}</span>
          {s.attachments.length > 0 && <span className="inline-flex items-center gap-1"><Paperclip size={14} />{s.attachments.length} attached</span>}
          {s.releaseStatus === "released" && s.feedback && <span className="inline-flex items-center gap-1 text-success"><ChatCircleText size={14} />Feedback ready</span>}
          {s.resubmissions > 0 && <Badge tone="info">Resubmitted {s.resubmissions}×</Badge>}
        </div>
      </Card>
    </Link>
  );
}
