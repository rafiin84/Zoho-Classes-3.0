"use client";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal, Button, Select, Field, toast } from "@/components/ui";
import { questionPaperService, toPaperQuestion } from "@/lib/api/questionPaperService";
import type { Question } from "@/types/questions";

export function AddToPaperModal({ q, role, teacherId, onClose }: { q: Question | null; role: string; teacherId: string; onClose: () => void }) {
  const qc = useQueryClient(); const [pid, setPid] = React.useState(""); const [busy, setBusy] = React.useState(false);
  const papers = useQuery({ queryKey: ["papers", role, teacherId], queryFn: () => questionPaperService.list({ role, teacherId }), enabled: !!q });
  const drafts = (papers.data ?? []).filter((p) => (p.status === "draft" || p.status === "in-review") && (p.ownerId === teacherId || role === "institution") && p.subjectId === q?.subjectId);
  const add = async () => {
    const p = drafts.find((x) => x.id === pid); if (!p || !q) return;
    if (p.questions.some((x) => x.qid === q.id)) return toast.warning("That question is already in this paper.");
    setBusy(true);
    try { await questionPaperService.save({ ...p, questions: [...p.questions, toPaperQuestion(q)] }, teacherId, `Added ${q.id}`); await qc.invalidateQueries({ queryKey: ["papers"] }); await qc.invalidateQueries({ queryKey: ["qb"] }); toast.success(`Added to “${p.title}”. A snapshot of the question is stored in the paper.`); onClose(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal open={!!q} onOpenChange={(v) => !v && onClose()} title="Add to paper" description="Pick a draft paper in the same subject. A snapshot of this version is copied in."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={add} disabled={!pid || busy} loading={busy}>Add question</Button></>}>
      {papers.isLoading ? <p className="text-sm text-text-2">Loading papers…</p> : drafts.length ? <Field label="Draft paper" htmlFor="atp"><Select id="atp" value={pid} onChange={(e) => setPid(e.target.value)}><option value="">Select…</option>{drafts.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.totalMarks} marks</option>)}</Select></Field> : <p className="text-sm text-text-2">No editable draft papers for this subject. Create one in the Question Paper Builder first.</p>}
    </Modal>
  );
}
