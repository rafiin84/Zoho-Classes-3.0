"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, SectionHeader, StatTile, Skeleton, ErrorState, Badge, Switch, Slider, Button, toast, EmptyState } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { gradingService } from "@/lib/api/gradingService";
import { FORMAT_LABEL, type GradingItem, type ReviewPolicy, type SubmissionFormat } from "@/types/grading";
import { teacherName } from "@/lib/mock-data/core";

export function PolicyCard({ policy, editable, actor }: { policy: ReviewPolicy; editable: boolean; actor: string }) {
  const qc = useQueryClient();
  const [thr, setThr] = React.useState(Math.round(policy.confidenceThreshold * 100));
  const m = useMutation({ mutationFn: (p: Parameters<typeof gradingService.setPolicy>[0]) => gradingService.setPolicy(p, actor), onSuccess: () => { toast.success("Review policy updated."); qc.invalidateQueries({ queryKey: ["grading"] }); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Failed") });
  return (
    <Card><CardBody className="space-y-3">
      <SectionHeader title="Review policy" subtitle={editable ? "Applies to every teacher in the institution" : "Set by your institution (read-only)"} />
      <div>
        <label htmlFor="thr" className="flex justify-between text-sm font-semibold">Confidence needed for bulk approval<span className="tnum">{thr}%</span></label>
        <Slider label="Confidence threshold" min={50} max={99} value={thr} onChange={setThr} />
        {editable && <Button size="sm" variant="soft" className="mt-2" disabled={thr === Math.round(policy.confidenceThreshold * 100) || m.isPending} onClick={() => m.mutate({ confidenceThreshold: thr / 100 })}>Save threshold</Button>}
      </div>
      <div className="flex items-center justify-between gap-3 text-sm"><span>Allow bulk approval of eligible items<br /><span className="text-xs text-text-2">Flagged, low-confidence, unreviewed handwriting, audio/video and project work are always excluded.</span></span>
        <Switch label="Bulk approval" checked={policy.bulkApprovalEnabled} disabled={!editable || m.isPending} onChange={(v) => m.mutate({ bulkApprovalEnabled: v })} /></div>
      <p className="rounded-lg bg-surface-2 p-2 text-xs text-text-2">Auto-release is permanently off: approved marks are shared only when a teacher presses Release.</p>
    </CardBody></Card>
  );
}

export function ModerationPanel({ policy, onOpen, actor }: { policy: ReviewPolicy; onOpen: (id: string) => void; actor: string }) {
  const stats = useQuery({ queryKey: ["grading", "stats"], queryFn: gradingService.stats });
  const all = useQuery({ queryKey: ["grading", "list", "all-mod"], queryFn: () => gradingService.list() });
  if (stats.isLoading || all.isLoading) return <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-48" /></div>;
  if (stats.isError || all.isError || !stats.data || !all.data) return <ErrorState onRetry={() => { stats.refetch(); all.refetch(); }} />;
  const s = stats.data, items: GradingItem[] = all.data;
  const flagged = items.filter((i) => (i.flags.length || i.overrideReason) && i.status !== "released");
  const perTeacher = [...new Set(items.map((i) => i.teacherId))].map((t) => ({ label: teacherName(t).replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.) /, ""), value: items.filter((i) => i.teacherId === t && i.status === "ai-drafted").length }));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Awaiting review" value={s.awaiting} /><StatTile label="Flagged / needs review" value={s.flagged} />
        <StatTile label="Override rate" value={`${Math.round(s.overrideRate * 100)}%`} hint="of reviewed" /><StatTile label="Mean |final − AI|" value={s.meanAbsDelta.toFixed(1)} hint="marks" /><StatTile label="Moderated" value={s.moderated} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardBody><SectionHeader title="Average AI confidence by format" subtitle={`Policy threshold ${Math.round(policy.confidenceThreshold * 100)}%`} />
          <BarChart horizontal ariaLabel="Average confidence by format" unit="%" max={100} data={s.byFormat.map((f) => ({ label: FORMAT_LABEL[f.format as SubmissionFormat], value: Math.round(f.avgConfidence * 100), color: f.avgConfidence < policy.confidenceThreshold ? "#C0262D" : "#5146E5" }))} />
          <p className="mt-2 text-xs text-text-2">Red bars sit below the review threshold. Values are demo figures.</p></CardBody></Card>
        <Card><CardBody><SectionHeader title="Drafts awaiting teacher review" /><BarChart horizontal ariaLabel="Pending drafts per teacher" data={perTeacher} /></CardBody></Card>
      </div>
      <Card><CardBody><SectionHeader title="Moderation queue" subtitle="Items with flags or overrides, for sample moderation" />
        {flagged.length === 0 ? <EmptyState title="Nothing to moderate" body="No flagged or overridden items are open right now." /> :
          <ul className="divide-y divide-border">{flagged.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <div><p className="font-semibold">{i.studentName} · {i.assessmentTitle}</p><p className="text-xs text-text-2">{teacherName(i.teacherId)} · {FORMAT_LABEL[i.format]} · {(i.overrideReason ? ["Override"] : i.flags).join(", ")}</p></div>
              <div className="flex items-center gap-2">{i.moderated && <Badge tone="info">Moderated</Badge>}<Button size="sm" variant="outline" onClick={() => onOpen(i.id)}>Open</Button></div>
            </li>))}</ul>}
      </CardBody></Card>
    </div>
  );
}
