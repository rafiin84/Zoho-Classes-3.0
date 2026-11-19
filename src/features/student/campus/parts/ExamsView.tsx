"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Exam } from "@phosphor-icons/react";
import { examService } from "@/lib/api/examService";
import { PageHeader, Segmented, ListToolbar, EmptyState, NoResults, SkeletonCards, Select } from "@/components/ui";
import { SUBJECTS } from "@/lib/mock-data/core";
import type { ExamView } from "@/types/exams";
import { ck } from "../keys";
import { Boundary } from "../shared";
import { ExamCard } from "./ExamCard";

type Tab = "upcoming" | "available" | "in-progress" | "submitted" | "results" | "practice";
const TABS: { value: Tab; label: string }[] = [{ value: "upcoming", label: "Upcoming" }, { value: "available", label: "Available" }, { value: "in-progress", label: "In progress" }, { value: "submitted", label: "Submitted" }, { value: "results", label: "Results" }, { value: "practice", label: "Practice" }];
const inTab = (v: ExamView, t: Tab) => t === "practice" ? v.exam.kind === "practice" : v.exam.kind !== "practice" && (t === "submitted" ? v.state === "submitted" || v.state === "closed" : t === "upcoming" ? v.state === "upcoming" || v.state === "cancelled" : v.state === t);
const EMPTY: Record<Tab, [string, string]> = { upcoming: ["No exams scheduled", "When your teachers schedule an exam, it appears here with date, time and duration."], available: ["Nothing to take right now", "Exams you can start appear here during their window."], "in-progress": ["No attempt in progress", "If you leave an exam midway, you'll find it here to resume."], submitted: ["Nothing waiting on results", "Submitted exams stay here until your teacher releases marks."], results: ["No results yet", "Released results appear here, with a review of your answers."], practice: ["No practice tests assigned", "Practice tests are untimed and never counted towards marks."] };

export function ExamsView({ studentId, base = "/student" }: { studentId: string; base?: string }) {
  const q = useQuery({ queryKey: ck.exams(studentId), queryFn: () => examService.forStudent(studentId) });
  const [tab, setTab] = useState<Tab>("available"); const [query, setQuery] = useState(""); const [subject, setSubject] = useState("all");
  const rows = q.data ?? [];
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.value, rows.filter((r) => inTab(r, t.value)).length])) as Record<Tab, number>, [rows]);
  const list = useMemo(() => rows.filter((r) => inTab(r, tab) && (subject === "all" || r.exam.subjectId === subject) && r.exam.title.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.exam.opensAt.localeCompare(b.exam.opensAt)), [rows, tab, subject, query]);
  const clear = () => { setQuery(""); setSubject("all"); };
  return (
    <div>
      <PageHeader title="Exams & Practice" subtitle="Scheduled exams, unit tests and untimed practice. Marks stay private until your teacher releases them." />
      <div className="mb-4 overflow-x-auto"><Segmented<Tab> label="Exam status" value={tab} onChange={setTab} options={TABS.map((t) => ({ ...t, count: counts[t.value] }))} /></div>
      <ListToolbar query={query} onQuery={setQuery} placeholder="Search exams" count={q.data ? list.length : undefined} onClear={clear} hasFilters={subject !== "all"}>
        <Select aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-44"><option value="all">All subjects</option>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
      </ListToolbar>
      <Boundary q={q} skeleton={<SkeletonCards n={3} h="h-32" />}>
        {() => list.length === 0 ? (rows.length && (query || subject !== "all") ? <NoResults onClear={clear} query={query} /> : <EmptyState icon={<Exam size={28} weight="duotone" />} title={EMPTY[tab][0]} body={EMPTY[tab][1]} />) :
          <div className="grid gap-3 md:grid-cols-2">{list.map((v) => <ExamCard key={v.exam.id} v={v} href={`${base}/exams/${v.exam.id}`} />)}</div>}
      </Boundary>
    </div>
  );
}
