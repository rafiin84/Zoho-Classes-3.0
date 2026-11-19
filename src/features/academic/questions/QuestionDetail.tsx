"use client";
import * as React from "react";
import { Badge, Button, AIBadge, Card, CardBody, ConfirmDialog } from "@/components/ui";
import { subjectById, objectiveById, GRADES } from "@/lib/mock-data/core";
import { qTypeLabel, SHARE_TIERS, type Question, type ShareTier } from "@/types/questions";
import { fmtDate } from "@/lib/format";
import { BloomBadge, DiffBadge, QStatusBadge, QuestionBody, answerText, shareLabel } from "./shared";

const H = ({ children }: { children: React.ReactNode }) => <h3 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide text-text-2">{children}</h3>;

export interface DetailActions { onEdit: () => void; onDuplicate: () => void; onArchive: () => void; onAddToPaper: () => void; onShare: (s: ShareTier) => void; onSubmitReview: () => void; onReview: (d: "approved" | "rejected") => void; onApproveAI: () => void; onRegenerate: () => void; onReject: () => void }

export function QuestionDetail({ q, role, mine, actions, busy }: { q: Question; role: string; mine: boolean; actions: DetailActions; busy?: boolean }) {
  const [archive, setArchive] = React.useState(false);
  const canEdit = mine || role === "institution";
  return (
    <div>
      <div className="flex flex-wrap gap-1.5"><QStatusBadge s={q.status} /><BloomBadge b={q.bloom} /><DiffBadge d={q.difficulty} /><Badge>{qTypeLabel(q.type)}</Badge><Badge className="tnum">{q.marks} marks</Badge><Badge>{q.language}</Badge>{q.aiGenerated && <AIBadge label="AI-generated · demo" />}<Badge tone="info">{shareLabel(q.share)}</Badge></div>
      {q.aiGenerated && q.status === "draft" && <p role="note" className="mt-3 rounded-xl bg-highlight-soft p-3 text-xs text-warning">This is an AI draft (demo). It stays a draft until a teacher reviews and approves it. Check the source, answer key and ambiguity flags first.</p>}
      {q.ambiguityFlags?.map((f) => <p key={f} className="mt-2 rounded-lg bg-warning-soft px-3 py-1.5 text-xs font-medium text-warning">Ambiguity flag: {f}</p>)}
      <H>Question</H><QuestionBody q={q} showAnswer />
      <H>Answer key / model answer</H><p className="rounded-xl bg-success-soft p-3 text-sm">{answerText(q)}</p>
      <H>Explanation</H><p className="text-sm text-text-2">{q.explanation}</p>
      {q.rubric && <><H>Rubric{q.aiGenerated ? " (AI-suggested)" : ""}</H><table className="w-full text-sm"><tbody>{q.rubric.map((r) => <tr key={r.criterion} className="border-b border-border"><td className="py-1.5">{r.criterion}</td><td className="tnum py-1.5 text-right font-semibold">{r.marks}</td></tr>)}</tbody></table></>}
      <H>Classification</H>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-text-2">Subject · grade</dt><dd>{subjectById(q.subjectId).name} · {GRADES.find((g) => g.id === q.gradeId)?.label}</dd>
        <dt className="text-text-2">Objective</dt><dd>{q.objectiveIds.map((o) => objectiveById(o)?.code).join(", ") || "Unmapped"}</dd>
        <dt className="text-text-2">Chapter</dt><dd>{objectiveById(q.objectiveIds[0] ?? "")?.chapter ?? "—"}</dd>
        <dt className="text-text-2">Author</dt><dd>{q.authorName}</dd>
        <dt className="text-text-2">Source</dt><dd>{q.source}</dd>
        <dt className="text-text-2">Tags</dt><dd className="flex flex-wrap gap-1">{q.tags.map((t) => <Badge key={t}>{t}</Badge>)}</dd>
      </dl>
      {q.reviewNote && <p className="mt-3 text-xs text-text-2">Reviewer note: {q.reviewNote}</p>}
      <H>Version history</H>
      <ol className="space-y-1.5">{q.versions.map((v) => <li key={v.v} className="rounded-lg border border-border px-3 py-1.5 text-xs"><span className="tnum font-bold">v{v.v}</span>{v.v === q.version && <Badge tone="primary" className="ml-1.5">current</Badge>} · {v.by} · {fmtDate(v.at)} · {v.note} · {v.marks} marks<p className="mt-0.5 text-text-2">{v.stem.slice(0, 110)}</p></li>)}</ol>
      <H>Usage across papers</H>
      {q.usage.length ? <ul className="space-y-1 text-sm">{q.usage.map((u) => <li key={u.paperId} className="flex justify-between"><span>{u.paperTitle}</span><span className="text-xs text-text-2">{fmtDate(u.at)}</span></li>)}</ul> : <p className="text-sm text-text-2">Not used in any paper yet.</p>}
      <Card tone="plain" className="mt-5"><CardBody className="space-y-3 !p-3">
        <div className="flex flex-wrap gap-2">
          {q.status === "approved" && <Button size="sm" onClick={actions.onAddToPaper}>Add to paper</Button>}
          {canEdit && q.status !== "archived" && <Button size="sm" variant="outline" onClick={actions.onEdit}>Edit (new version)</Button>}
          <Button size="sm" variant="outline" onClick={actions.onDuplicate}>Duplicate</Button>
          {canEdit && q.status !== "archived" && <Button size="sm" variant="ghost" onClick={() => setArchive(true)}>Archive</Button>}
          {canEdit && (q.status === "draft" || q.status === "rejected") && !q.aiGenerated && <Button size="sm" variant="soft" onClick={actions.onSubmitReview} disabled={busy}>Submit for review</Button>}
        </div>
        {q.aiGenerated && q.status === "draft" && <div className="flex flex-wrap gap-2"><Button size="sm" variant="success" onClick={actions.onApproveAI} disabled={busy}>Approve draft (send to review)</Button><Button size="sm" variant="outline" onClick={actions.onRegenerate} disabled={busy}>Regenerate</Button><Button size="sm" variant="danger" onClick={actions.onReject} disabled={busy}>Reject</Button></div>}
        {role === "institution" && q.status === "in-review" && <div className="flex flex-wrap gap-2"><Button size="sm" variant="success" onClick={() => actions.onReview("approved")} disabled={busy}>Approve question</Button><Button size="sm" variant="danger" onClick={() => actions.onReview("rejected")} disabled={busy}>Reject</Button></div>}
        {role !== "institution" && q.status === "in-review" && <p className="text-xs text-text-2">Waiting for an institution reviewer.</p>}
        {canEdit && q.status !== "archived" && (
          <div><label htmlFor="share-tier" className="text-xs font-semibold">Sharing tier</label>
            <select id="share-tier" value={q.share} onChange={(e) => actions.onShare(e.target.value as ShareTier)} className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm">{SHARE_TIERS.map((t) => <option key={t.id} value={t.id}>{t.label} — {t.help}</option>)}</select>
            <p className="mt-1 text-xs text-text-2">Private → department → institution → marketplace (licensed). Sharing beyond your department needs an approved question.</p></div>
        )}
      </CardBody></Card>
      <ConfirmDialog open={archive} onOpenChange={setArchive} title="Archive this question?" body="It will no longer be offered for new papers. Existing paper snapshots are unaffected." confirmLabel="Archive" destructive onConfirm={actions.onArchive} />
    </div>
  );
}
