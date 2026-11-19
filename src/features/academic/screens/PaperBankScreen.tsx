"use client";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "@phosphor-icons/react";
import type { ScreenProps } from "@/types/screens";
import { Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, ErrorState, ListToolbar, NoResults, PageHeader, Select, SkeletonCards, StatusBadge, toast } from "@/components/ui";
import { useActors } from "@/stores/app-store";
import { SUBJECTS, GRADES, subjectById } from "@/lib/mock-data/core";
import { questionPaperService } from "@/lib/api/questionPaperService";
import { fmtDate } from "@/lib/format";
import { PaperBuilder } from "../questions/PaperBuilder";
import type { Paper } from "@/types/questions";

/** Paper bank + builder host. Papers list; "New paper" / "Open" switches to the builder in place. */
export default function PaperBankScreen({ role }: ScreenProps) {
  const { teacherId } = useActors(); const qc = useQueryClient(); const inst = role === "institution";
  const [view, setView] = React.useState<{ id?: string } | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["papers", role, teacherId], queryFn: () => questionPaperService.list({ role, teacherId }) });
  const [q, setQ] = React.useState(""); const [subject, setSubject] = React.useState(""); const [grade, setGrade] = React.useState(""); const [status, setStatus] = React.useState(""); const [exam, setExam] = React.useState(""); const [del, setDel] = React.useState<Paper | null>(null);
  const clear = () => { setQ(""); setSubject(""); setGrade(""); setStatus(""); setExam(""); };
  if (view) return <PaperBuilder paperId={view.id} role={role} onClose={() => { setView(null); qc.invalidateQueries({ queryKey: ["papers"] }); }} onOpen={(id) => setView({ id })} />;
  const all = data ?? []; const rows = all.filter((p) => (!q || p.title.toLowerCase().includes(q.toLowerCase())) && (!subject || p.subjectId === subject) && (!grade || p.gradeId === grade) && (!status || p.status === status) && (!exam || p.examType === exam));
  const refresh = () => qc.invalidateQueries({ queryKey: ["papers"] });
  const act = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); await refresh(); toast.success(msg); } catch (e) { toast.error((e as Error).message); } };
  return (
    <div>
      <PageHeader title="Question Papers" subtitle={inst ? "All papers in the institution. Approve and publish them for exam scheduling." : "Your papers and papers shared with you. Published papers can be used to schedule exams."} actions={<Button onClick={() => setView({})}><Plus size={18} />New paper</Button>} />
      <ListToolbar query={q} onQuery={setQ} placeholder="Search papers" count={rows.length} onClear={clear} hasFilters={!!(subject || grade || status || exam)}>
        <Select aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="!h-10 !w-auto !rounded-full text-xs"><option value="">Subject</option>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select aria-label="Grade" value={grade} onChange={(e) => setGrade(e.target.value)} className="!h-10 !w-auto !rounded-full text-xs"><option value="">Grade</option>{GRADES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select>
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="!h-10 !w-auto !rounded-full text-xs"><option value="">Status</option>{["draft", "in-review", "approved", "published", "archived"].map((s) => <option key={s}>{s}</option>)}</Select>
        <Select aria-label="Exam type" value={exam} onChange={(e) => setExam(e.target.value)} className="!h-10 !w-auto !rounded-full text-xs"><option value="">Exam type</option>{["Unit test", "Weekly check", "Mid-term", "Term exam", "Practice paper", "Re-test"].map((s) => <option key={s}>{s}</option>)}</Select>
      </ListToolbar>
      {isLoading ? <SkeletonCards n={3} h="h-28" /> : isError ? <ErrorState onRetry={() => refetch()} /> : !all.length ? <EmptyState title="No question papers yet" body="Build a paper from a blueprint, pull questions from the bank, or let AI draft one for review." action={{ label: "New paper", onClick: () => setView({}) }} /> : !rows.length ? <NoResults onClear={clear} query={q} /> : (
        <ul className="grid gap-3 md:grid-cols-2">{rows.map((p) => (
          <li key={p.id}><Card><CardBody className="space-y-2">
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-semibold">{p.title}</h3><p className="text-xs text-text-2">{subjectById(p.subjectId).name} · {GRADES.find((g) => g.id === p.gradeId)?.label} · {p.examType} · {p.term} · {p.academicYearId.replace("ay-", "")}</p></div><StatusBadge status={p.status} /></div>
            <div className="flex flex-wrap gap-1.5 text-xs"><Badge className="tnum">{p.totalMarks} marks</Badge><Badge className="tnum">{p.durationMin} min</Badge><Badge className="tnum">{p.questions.length} questions</Badge><Badge className="tnum">v{p.version}</Badge><Badge>{p.mode === "ai" ? "AI-assisted" : p.mode === "bank" ? "From bank" : "Manual"}</Badge><Badge tone="info">{p.restrictedTo === "owner" ? "Owner only" : p.restrictedTo === "department" ? "Department" : "Institution"}</Badge></div>
            <p className="text-xs text-text-2">By {p.ownerName} · updated {fmtDate(p.updatedAt)}</p>
            <div className="flex flex-wrap gap-1.5"><Button size="sm" onClick={() => setView({ id: p.id })}>{p.status === "published" ? "View" : "Open"}</Button>
              <Button size="sm" variant="outline" onClick={() => act(() => questionPaperService.duplicate(p.id, teacherId), "Duplicated as draft")}>Duplicate as draft</Button>
              {(p.ownerId === teacherId || inst) && p.status !== "archived" && p.status !== "published" && <Button size="sm" variant="ghost" onClick={() => setDel(p)}>Delete</Button>}
              {(p.ownerId === teacherId || inst) && p.status === "published" && <Button size="sm" variant="ghost" onClick={() => act(() => questionPaperService.archive(p.id), "Archived")}>Archive</Button>}</div>
          </CardBody></Card></li>))}</ul>
      )}
      <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)} title="Delete this paper?" body={`“${del?.title}” and its drafts will be removed. Question bank items are not affected.`} confirmLabel="Delete" destructive onConfirm={() => del && act(() => questionPaperService.remove(del.id), "Paper deleted")} />
    </div>
  );
}
