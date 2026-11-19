"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, Button, Badge, Input, Select, NoResults } from "@/components/ui";
import { questionBankService } from "@/lib/api/questionBankService";
import { BLOOM, qTypeLabel, type Paper, type Question } from "@/types/questions";
import { BloomBadge, DiffBadge } from "./shared";

/** Pick approved bank questions to add, or to replace an existing question (defaults the Bloom filter to the replaced item). */
export function QuestionPicker({ open, onClose, paper, role, teacherId, replacing, onPick }: { open: boolean; onClose: () => void; paper: Paper; role: string; teacherId: string; replacing?: Question; onPick: (q: Question) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["qb-approved", role, teacherId], queryFn: () => questionBankService.listApproved(role, teacherId), enabled: open });
  const [t, setT] = React.useState(""); const [bloom, setBloom] = React.useState("");
  React.useEffect(() => { if (open) { setT(""); setBloom(replacing?.bloom ?? ""); } }, [open, replacing]);
  const used = new Set(paper.questions.map((q) => q.qid));
  const rows = (data ?? []).filter((q) => q.subjectId === paper.subjectId && q.gradeId === paper.gradeId && !used.has(q.id) && (!bloom || q.bloom === bloom) && (!t || q.stem.toLowerCase().includes(t.toLowerCase())));
  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()} title={replacing ? "Replace question" : "Add from question bank"} description="Approved questions in this subject and grade. A snapshot is stored in the paper." className="sm:max-w-2xl" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="mb-3 flex gap-2"><Input aria-label="Search questions" placeholder="Search" value={t} onChange={(e) => setT(e.target.value)} /><Select aria-label="Bloom level" value={bloom} onChange={(e) => setBloom(e.target.value)} className="!w-44"><option value="">All Bloom levels</option>{BLOOM.map((b) => <option key={b}>{b}</option>)}</Select></div>
      {isLoading ? <p className="text-sm text-text-2">Loading…</p> : !rows.length ? <NoResults onClear={() => { setT(""); setBloom(""); }} query={t} /> : (
        <ul className="space-y-2">{rows.map((q) => <li key={q.id} className="rounded-xl border border-border p-3"><p className="text-sm">{q.stem}</p><div className="mt-1.5 flex flex-wrap items-center gap-1.5"><Badge>{qTypeLabel(q.type)}</Badge><BloomBadge b={q.bloom} /><DiffBadge d={q.difficulty} /><Badge className="tnum">{q.marks} marks</Badge><Button size="sm" className="ml-auto" onClick={() => { onPick(q); onClose(); }}>{replacing ? "Use instead" : "Add"}</Button></div></li>)}</ul>
      )}
    </Modal>
  );
}
