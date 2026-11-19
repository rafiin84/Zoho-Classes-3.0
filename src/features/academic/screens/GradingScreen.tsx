"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Warning } from "@phosphor-icons/react";
import { PageHeader, Segmented, ListToolbar, Select, Badge, Button, Skeleton, ErrorState, EmptyState, NoResults, Card, CardBody, StatusBadge, Checkbox, ConfirmDialog, Modal, Drawer, AIBadge, DemoTag, toast } from "@/components/ui";
import { gradingService, needsReview } from "@/lib/api/gradingService";
import { useActors } from "@/stores/app-store";
import { teacherName } from "@/lib/mock-data/core";
import { FORMAT_LABEL, type GradingItem, type SubmissionFormat } from "@/types/grading";
import type { ScreenProps } from "@/types/screens";
import { cn } from "@/lib/utils";
import { relTime } from "@/lib/format";
import { Workspace, ConfidenceMeter, statusLabel } from "../grading/Workspace";
import { PolicyCard, ModerationPanel } from "../grading/Moderation";

function useWide() {
  const [w, setW] = React.useState(false);
  React.useEffect(() => { const m = window.matchMedia("(min-width: 1024px)"); const f = () => setW(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  return w;
}
type Sort = "newest" | "confidence" | "review";

export default function GradingScreen({ role }: ScreenProps) {
  const { teacherId } = useActors();
  const qc = useQueryClient();
  const isInst = role === "institution";
  const actor = isInst ? "Institution reviewer" : teacherName(teacherId);
  const scope = isInst ? undefined : teacherId;
  const [tab, setTab] = React.useState<"queue" | "moderation">("queue");
  const [assessment, setAssessment] = React.useState("all"), [cls, setCls] = React.useState("all"), [status, setStatus] = React.useState("all"), [format, setFormat] = React.useState("all");
  const [q, setQ] = React.useState(""), [sort, setSort] = React.useState<Sort>("newest");
  const [sel, setSel] = React.useState<string | null>(null);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [bulk, setBulk] = React.useState<null | "approve" | "release">(null);
  const wide = useWide();

  const list = useQuery({ queryKey: ["grading", "list", scope ?? "all"], queryFn: () => gradingService.list({ teacherId: scope }) });
  const pol = useQuery({ queryKey: ["grading", "policy"], queryFn: gradingService.policy });
  const policy = pol.data;
  const items = list.data ?? [];
  const assessments = [...new Map(items.map((i) => [i.assessmentId, i.assessmentTitle])).entries()];
  const classes = [...new Map(items.map((i) => [i.classId, i.className])).entries()];

  const view = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = items.filter((i) => (assessment === "all" || i.assessmentId === assessment) && (cls === "all" || i.classId === cls) && (format === "all" || i.format === format)
      && (status === "all" || (status === "needs" ? !!policy && needsReview(i, policy) : i.status === status)) && (!t || `${i.studentName} ${i.assessmentTitle}`.toLowerCase().includes(t)));
    return f.sort((a, b) => sort === "confidence" ? a.confidence - b.confidence : sort === "review" ? Number(!!policy && needsReview(b, policy)) - Number(!!policy && needsReview(a, policy)) || a.confidence - b.confidence : b.submittedAt.localeCompare(a.submittedAt));
  }, [items, assessment, cls, format, status, q, sort, policy]);
  const hasFilters = assessment !== "all" || cls !== "all" || format !== "all" || status !== "all";
  const clear = () => { setAssessment("all"); setCls("all"); setFormat("all"); setStatus("all"); setQ(""); };
  const current = view.find((i) => i.id === sel) ?? items.find((i) => i.id === sel);

  const eligibility = useQuery({ queryKey: ["grading", "elig", [...checked].sort().join(",")], queryFn: () => gradingService.bulkEligibility([...checked]), enabled: bulk === "approve" && checked.size > 0 });
  const done = (msg: string) => { toast.success(msg); setChecked(new Set()); setBulk(null); qc.invalidateQueries({ queryKey: ["grading"] }); qc.invalidateQueries({ predicate: (x) => ["assignment", "notification", "home"].some((k) => String(x.queryKey[0]).includes(k)) }); };
  const bulkApprove = useMutation({ mutationFn: () => gradingService.bulkApprove([...checked], actor), onSuccess: (r) => done(`Approved ${r.approved.length}; ${r.skipped.length} skipped by policy. Nothing was released.`), onError: (e) => { toast.error(e instanceof Error ? e.message : "Failed"); setBulk(null); } });
  const bulkRelease = useMutation({ mutationFn: () => gradingService.release([...checked], actor), onSuccess: (r) => done(`Released ${r.released.length}; ${r.skipped.length} skipped (not approved).`), onError: (e) => { toast.error(e instanceof Error ? e.message : "Failed"); setBulk(null); } });
  const toggle = (id: string) => setChecked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allChecked = view.length > 0 && view.every((i) => checked.has(i.id));
  const approvedChecked = view.filter((i) => checked.has(i.id) && (i.status === "approved" || i.status === "overridden")).length;
  const counts = { awaiting: items.filter((i) => i.status === "ai-drafted").length, needs: policy ? items.filter((i) => needsReview(i, policy)).length : 0, ready: items.filter((i) => i.status === "approved" || i.status === "overridden").length, released: items.filter((i) => i.status === "released").length };

  return (
    <div>
      <PageHeader title="AI Grading" subtitle={isInst ? "Review policy, moderation and every teacher's grading queue across the institution." : "Review AI-suggested marks, correct evidence, and release feedback when you are satisfied."}
        eyebrow={<div className="flex gap-2"><AIBadge label="AI-assisted · demo" /><DemoTag /></div>}
        actions={isInst ? <Segmented label="Grading view" value={tab} onChange={setTab} options={[{ value: "queue", label: "Review queue" }, { value: "moderation", label: "Moderation & analytics" }]} /> : undefined} />
      <p className="mb-4 rounded-xl bg-lilac p-3 text-sm text-text-2">AI never publishes marks. Drafts are visible only to staff; students see marks after you approve and release them.</p>

      {tab === "moderation" && isInst && policy ? <div className="space-y-5"><ModerationPanel policy={policy} actor={actor} onOpen={(id) => { setSel(id); setTab("queue"); }} /><PolicyCard policy={policy} editable actor={actor} /></div> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Awaiting review", counts.awaiting], ["Needs review", counts.needs], ["Approved, to release", counts.ready], ["Released", counts.released]].map(([l, v]) => <Card key={l as string} className="p-3"><p className="text-xs font-semibold text-text-2">{l}</p><p className="tnum text-2xl font-bold">{v}</p></Card>)}
          </div>
          <ListToolbar query={q} onQuery={setQ} placeholder="Search student or assessment" count={view.length} onClear={clear} hasFilters={hasFilters}>
            <Select aria-label="Assessment" value={assessment} onChange={(e) => setAssessment(e.target.value)} className="w-auto max-w-56"><option value="all">All assessments</option>{assessments.map(([id, t]) => <option key={id} value={id}>{t}</option>)}</Select>
            <Select aria-label="Class" value={cls} onChange={(e) => setCls(e.target.value)} className="w-auto"><option value="all">All classes</option>{classes.map(([id, t]) => <option key={id} value={id}>{t}</option>)}</Select>
            <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto"><option value="all">Any status</option><option value="ai-drafted">AI draft</option><option value="needs">Needs review</option><option value="approved">Approved</option><option value="overridden">Overridden</option><option value="rejected">Rejected</option><option value="released">Released</option></Select>
            <Select aria-label="Format" value={format} onChange={(e) => setFormat(e.target.value)} className="w-auto"><option value="all">Any format</option>{(Object.keys(FORMAT_LABEL) as SubmissionFormat[]).map((f) => <option key={f} value={f}>{FORMAT_LABEL[f]}</option>)}</Select>
            <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-auto"><option value="newest">Newest first</option><option value="review">Needs review first</option><option value="confidence">Lowest confidence</option></Select>
          </ListToolbar>

          <div className={cn("grid gap-5", wide && "lg:grid-cols-[minmax(320px,400px)_1fr] items-start")}>
            <div className="space-y-3">
              {list.isLoading || pol.isLoading ? <div className="space-y-2" role="status" aria-label="Loading submissions">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
                : list.isError || pol.isError ? <ErrorState onRetry={() => { list.refetch(); pol.refetch(); }} />
                : items.length === 0 ? <EmptyState title="No submissions to grade" body="When students submit assessments assigned to you, AI drafts will appear here for review." />
                : view.length === 0 ? <NoResults onClear={clear} query={q} /> : (
                <>
                  <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 p-2">
                    <Checkbox checked={allChecked} onChange={(v) => setChecked(v ? new Set(view.map((i) => i.id)) : new Set())} label={`Select all (${checked.size})`} />
                    <Button size="sm" variant="outline" disabled={checked.size === 0 || !policy?.bulkApprovalEnabled} onClick={() => setBulk("approve")}>Bulk approve…</Button>
                    <Button size="sm" variant="outline" disabled={approvedChecked === 0} onClick={() => setBulk("release")}>Release approved…</Button>
                  </div>
                  <ul className="space-y-2" aria-label="Submission queue">{view.map((i) => (
                    <QueueRow key={i.id} item={i} active={sel === i.id} checked={checked.has(i.id)} onCheck={() => toggle(i.id)} onOpen={() => setSel(i.id)} threshold={policy!.confidenceThreshold} flagged={needsReview(i, policy!)} showTeacher={isInst} />))}</ul>
                </>)}
              {policy && !isInst && <PolicyCard policy={policy} editable={false} actor={actor} />}
            </div>
            {wide && <div className="min-w-0">{current && policy ? <Card><CardBody><Workspace item={current} role={role} actor={actor} policy={policy} /></CardBody></Card>
              : <EmptyState title="Select a submission" body="Open a submission to see the extracted evidence, rubric alignment and AI-suggested marks side by side." icon={<CheckCircle size={28} />} />}</div>}
          </div>
        </div>)}

      {!wide && tab === "queue" && <Drawer open={!!current} onOpenChange={(v) => !v && setSel(null)} title="Review submission" width="sm:max-w-2xl">{current && policy && <Workspace item={current} role={role} actor={actor} policy={policy} />}</Drawer>}

      <Modal open={bulk === "approve"} onOpenChange={(v) => !v && setBulk(null)} title="Bulk approve under review policy" description="Only items that meet the policy are approved. Approving does not release marks to students."
        footer={<><Button variant="ghost" onClick={() => setBulk(null)}>Cancel</Button><Button loading={bulkApprove.isPending} disabled={!eligibility.data?.some((e) => !e.blocker)} onClick={() => bulkApprove.mutate()}>Approve {eligibility.data?.filter((e) => !e.blocker).length ?? 0} eligible</Button></>}>
        {eligibility.isLoading ? <Skeleton className="h-24" /> : (
          <ul className="space-y-1.5 text-sm">{eligibility.data?.map((e) => { const it = items.find((i) => i.id === e.id)!; return <li key={e.id} className="flex items-start gap-2">{e.blocker ? <Warning size={16} className="mt-0.5 text-warning" /> : <CheckCircle size={16} className="mt-0.5 text-success" />}<span><b>{it.studentName}</b> · {it.assessmentTitle}<br /><span className="text-xs text-text-2">{e.blocker ?? "Eligible"}</span></span></li>; })}</ul>)}
      </Modal>
      <ConfirmDialog open={bulk === "release"} onOpenChange={(v) => !v && setBulk(null)} title="Release approved marks?" body={`${approvedChecked} approved submission(s) will be shared with students with your feedback. Items not yet approved are skipped.`} confirmLabel="Release to students" onConfirm={() => bulkRelease.mutate()} />
    </div>
  );
}

function QueueRow({ item, active, checked, onCheck, onOpen, threshold, flagged, showTeacher }: { item: GradingItem; active: boolean; checked: boolean; onCheck: () => void; onOpen: () => void; threshold: number; flagged: boolean; showTeacher: boolean }) {
  return (
    <li className={cn("flex gap-2 rounded-xl border p-3", active ? "border-primary bg-lilac/50" : "border-border bg-surface")}>
      <input type="checkbox" checked={checked} onChange={onCheck} aria-label={`Select ${item.studentName}`} className="mt-1 size-5 accent-[var(--primary)]" />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left" aria-current={active}>
        <div className="flex flex-wrap items-center justify-between gap-1"><span className="font-semibold">{item.studentName}</span><StatusBadge status={item.status === "ai-drafted" ? "pending review" : item.status} label={statusLabel(item.status)} /></div>
        <p className="truncate text-xs text-text-2">{item.assessmentTitle}{showTeacher ? ` · ${teacherName(item.teacherId)}` : ""}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2"><Badge tone="primary">{FORMAT_LABEL[item.format]}</Badge><ConfidenceMeter value={item.confidence} policy={threshold} />{flagged && <Badge tone="warning">Needs review</Badge>}
          <span className="tnum ml-auto text-xs text-text-2">{item.finalMarks ?? (item.format === "mcq" ? item.autoMarks : item.suggestedMarks) ?? "–"}/{item.maxMarks} · {relTime(item.submittedAt)}</span></div>
      </button>
    </li>
  );
}
