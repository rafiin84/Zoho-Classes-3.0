"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NotePencil } from "@phosphor-icons/react";
import { assignmentService } from "@/lib/api";
import { PageHeader, Segmented, ListToolbar, Select, EmptyState, NoResults, SkeletonCards } from "@/components/ui";
import { ck } from "../keys";
import { Boundary } from "../shared";
import { AssignmentCard, type AssignmentRow } from "./AssignmentCard";
import { SUBJECTS } from "@/lib/mock-data/core";

type Tab = "todo" | "submitted" | "returned" | "graded" | "overdue";
const inTab = (r: AssignmentRow, t: Tab) => (t === "todo" ? r.submission.status === "todo" || r.submission.status === "draft" : r.submission.status === t);

export function AssignmentsView({ studentId }: { studentId: string }) {
  const q = useQuery({ queryKey: ck.assignments(studentId), queryFn: () => assignmentService.forStudent(studentId) });
  const [tab, setTab] = useState<Tab>("todo"); const [query, setQuery] = useState(""); const [subject, setSubject] = useState("all"); const [sort, setSort] = useState("due");
  const rows = q.data ?? [];
  const counts = useMemo(() => ({ todo: rows.filter((r) => inTab(r, "todo")).length, submitted: rows.filter((r) => inTab(r, "submitted")).length, returned: rows.filter((r) => inTab(r, "returned")).length, graded: rows.filter((r) => inTab(r, "graded")).length, overdue: rows.filter((r) => inTab(r, "overdue")).length }), [rows]);
  const list = useMemo(() => rows.filter((r) => inTab(r, tab) && (subject === "all" || r.assignment.subjectId === subject) && (r.assignment.title + r.assignment.courseTitle).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === "due" ? a.assignment.dueAt.localeCompare(b.assignment.dueAt) : a.assignment.title.localeCompare(b.assignment.title)), [rows, tab, subject, query, sort]);
  const clear = () => { setQuery(""); setSubject("all"); };
  return (
    <div>
      <PageHeader title="Assignments" subtitle="Everything your teachers have set, in one place. Marks stay hidden until your teacher releases them." />
      <div className="mb-4 overflow-x-auto"><Segmented<Tab> label="Assignment status" value={tab} onChange={setTab} options={[{ value: "todo", label: "To do", count: counts.todo }, { value: "submitted", label: "Submitted", count: counts.submitted }, { value: "returned", label: "Returned", count: counts.returned }, { value: "graded", label: "Graded", count: counts.graded }, { value: "overdue", label: "Overdue", count: counts.overdue }]} /></div>
      <ListToolbar query={query} onQuery={setQuery} placeholder="Search assignments" count={q.data ? list.length : undefined} onClear={clear} hasFilters={subject !== "all"}>
        <Select aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-44"><option value="all">All subjects</option>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="w-40"><option value="due">Due soonest</option><option value="title">Title A–Z</option></Select>
      </ListToolbar>
      <Boundary q={q} skeleton={<SkeletonCards n={3} h="h-28" />}>
        {() => list.length === 0 ? (rows.length && (query || subject !== "all") ? <NoResults onClear={clear} query={query} /> :
          <EmptyState icon={<NotePencil size={28} weight="duotone" />} title={tab === "todo" ? "Nothing to do right now" : `No ${tab} assignments`} body={tab === "todo" ? "You're all caught up. New assignments from your teachers will appear here." : "When assignments reach this stage, they'll show up here."} />) :
          <div className="grid gap-3 lg:grid-cols-2">{list.map((r) => <AssignmentCard key={r.assignment.id} row={r} href={`/student/assignments/${r.assignment.id}`} />)}</div>}
      </Boundary>
    </div>
  );
}
