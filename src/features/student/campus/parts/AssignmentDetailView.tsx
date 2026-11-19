"use client";
import { useQuery } from "@tanstack/react-query";
import { CalendarBlank, FileText, DownloadSimple, CheckCircle, Hourglass, Medal } from "@phosphor-icons/react";
import { assignmentService } from "@/lib/api";
import { Button, Card, CardBody, PageHeader, SectionHeader, StatusBadge, Skeleton, toast, EmptyState, Progress } from "@/components/ui";
import { fmtDate, fmtDateTime, fmtTime, relTime } from "@/lib/format";
import { ck } from "../keys";
import { Boundary, BackLink, SubjectChip } from "../shared";
import { STATUS_LABEL } from "./AssignmentCard";
import { SubmissionComposer } from "./SubmissionComposer";

const RUBRIC = [{ c: "Understanding of the concept", w: 0.4 }, { c: "Accuracy and working shown", w: 0.3 }, { c: "Clarity and presentation", w: 0.2 }, { c: "Reflection / explanation", w: 0.1 }];

export function AssignmentDetailView({ id, studentId }: { id: string; studentId: string }) {
  const q = useQuery({ queryKey: ck.assignment(id, studentId), queryFn: () => assignmentService.get(id, studentId) });
  return (
    <div>
      <BackLink href="/student/assignments" label="All assignments" />
      <Boundary q={q} skeleton={<div className="space-y-3"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>} empty={<EmptyState title="Assignment not found" body="It may have been removed or isn't set for your class." action={{ label: "Back to assignments", href: "/student/assignments" }} />}>
        {({ assignment: a, submission: s }) => {
          const canSubmit = ["todo", "draft", "returned", "overdue"].includes(s.status);
          const released = s.releaseStatus === "released" && s.marks !== undefined;
          return (
            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
              <div className="space-y-5">
                <PageHeader title={a.title} subtitle={`${a.courseTitle} · ${a.teacherName}`} eyebrow={<div className="flex gap-2"><SubjectChip subjectId={a.subjectId} /><StatusBadge status={s.status} label={STATUS_LABEL[s.status]} /></div>} />
                <Card><CardBody><SectionHeader title="Instructions" /><p className="whitespace-pre-line text-[0.95rem] leading-relaxed">{a.instructions}</p>
                  {a.resources.length > 0 && <div className="mt-4"><p className="mb-2 text-sm font-semibold">Resources from your teacher</p><ul className="space-y-1.5">{a.resources.map((r) => <li key={r} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm"><span className="flex items-center gap-2"><FileText size={16} />{r}</span><Button size="sm" variant="ghost" onClick={() => toast.info(`Demo: “${r}” would download here.`)}><DownloadSimple size={16} />Open</Button></li>)}</ul></div>}</CardBody></Card>
                {released && (
                  <Card tone="lilac"><CardBody>
                    <SectionHeader title="Marks and feedback" subtitle="Released by your teacher" />
                    <div className="mb-4 flex items-center gap-4"><div className="flex size-16 items-center justify-center rounded-2xl bg-surface text-primary shadow-soft"><Medal size={30} weight="duotone" /></div><div><p className="tnum text-3xl font-bold text-primary">{s.marks}<span className="text-lg text-text-2">/{a.totalMarks}</span></p><p className="text-sm text-text-2">{Math.round(((s.marks ?? 0) / a.totalMarks) * 100)}%</p></div></div>
                    {s.feedback && <blockquote className="rounded-2xl bg-surface p-4 text-sm leading-relaxed"><span className="mb-1 block text-xs font-semibold text-text-2">{a.teacherName} says</span>{s.feedback}</blockquote>}
                    <div className="mt-4"><p className="mb-2 text-sm font-semibold">Rubric breakdown <span className="text-xs font-normal text-text-2">(demo distribution)</span></p>
                      <div className="space-y-2.5">{RUBRIC.map((r) => { const max = Math.round(a.totalMarks * r.w * 10) / 10; const got = Math.round(((s.marks ?? 0) / a.totalMarks) * max * 10) / 10; return <div key={r.c}><div className="mb-1 flex justify-between text-xs"><span>{r.c}</span><span className="tnum font-semibold">{got}/{max}</span></div><Progress value={(got / max) * 100} size="sm" label={r.c} /></div>; })}</div></div>
                  </CardBody></Card>
                )}
                {s.status === "submitted" && <Card><CardBody><div className="flex items-start gap-3"><Hourglass size={26} className="text-warning" weight="duotone" /><div><h3 className="font-semibold">Submitted. Waiting for your teacher</h3><p className="mt-1 text-sm text-text-2">Sent {s.submittedAt ? fmtDateTime(s.submittedAt) : ""}. Marks and feedback stay hidden until {a.teacherName} releases them.</p>
                  {s.text && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">{s.text}</p>}{s.attachments.length > 0 && <ul className="mt-2 flex flex-wrap gap-2">{s.attachments.map((x, i) => <li key={i} className="rounded-full bg-surface-2 px-3 py-1 text-xs">{x.name}</li>)}</ul>}</div></div></CardBody></Card>}
                {s.status === "graded" && !released && <EmptyState icon={<CheckCircle size={28} weight="duotone" />} title="Graded; marks coming soon" body="Your teacher has finished marking. Marks appear here the moment they're released." />}
                {canSubmit && <Card><CardBody><SectionHeader title={s.status === "returned" ? "Revise and resubmit" : "Your submission"} /><SubmissionComposer key={s.status + s.resubmissions} assignment={a} submission={s} studentId={studentId} /></CardBody></Card>}
              </div>
              <aside className="space-y-3">
                <Card><CardBody className="space-y-3 text-sm">
                  <div className="flex items-start gap-2"><CalendarBlank size={18} className="mt-0.5 text-primary" /><div><p className="font-semibold">Due {fmtDate(a.dueAt, { weekday: "long", day: "numeric", month: "long" })}</p><p className="text-text-2">{fmtTime(a.dueAt)} IST · {relTime(a.dueAt)}</p></div></div>
                  <div className="flex justify-between"><span className="text-text-2">Total marks</span><span className="tnum font-semibold">{a.totalMarks}</span></div>
                  <div className="flex justify-between"><span className="text-text-2">Accepted work</span><span className="font-semibold capitalize">{a.submissionTypes.join(", ")}</span></div>
                  <div className="flex justify-between"><span className="text-text-2">Status</span><StatusBadge status={s.status} label={STATUS_LABEL[s.status]} /></div>
                </CardBody></Card>
              </aside>
            </div>
          );
        }}
      </Boundary>
    </div>
  );
}
