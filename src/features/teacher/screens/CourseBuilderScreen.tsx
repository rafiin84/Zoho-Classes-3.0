"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FloppyDisk, RocketLaunch, Eye, WarningCircle } from "@phosphor-icons/react";
import { PageHeader, Button, Badge, StatusBadge, Segmented, Card, CardBody, Field, Input, Textarea, Select, Checkbox, EmptyState, ErrorState, SkeletonCards, ConfirmDialog, toast } from "@/components/ui";
import type { ScreenProps } from "@/types/screens";
import { courseService } from "@/lib/api";
import { useApp } from "@/stores/app-store";
import { SUBJECTS, GRADES, OBJECTIVES } from "@/lib/mock-data/core";
import { KEYS, errMsg, tHref, useTeacher } from "../components/common";
import { OutlineEditor } from "../builder/OutlineEditor";
import { StudentPreview } from "../builder/StudentPreview";
import { TimelineTab } from "../builder/TimelineTab";
import { RemedialTab } from "../builder/RemedialTab";
import { toOutline, fromOutline, validate, hiddenStore, type Outline } from "../builder/model";

type Tab = "outline" | "details" | "timeline" | "remedial";
interface Meta { title: string; description: string; subjectId: string; gradeIds: string[]; language: string; outcomes: string }

export default function CourseBuilderScreen({ params }: ScreenProps) {
  const id = params.id; const t = useTeacher(); const qc = useQueryClient(); const setUnsaved = useApp((s) => s.setUnsaved);
  const load = useQuery({ queryKey: [...KEYS.course, id], queryFn: async () => { const [c, s] = await Promise.all([courseService.get(id, "stu-ananya"), courseService.structure(id)]); return { c, s }; }, refetchOnWindowFocus: false, staleTime: Infinity });
  const [meta, setMeta] = React.useState<Meta | null>(null); const [outline, setOutline] = React.useState<Outline>([]);
  const [dirty, setDirty] = React.useState(false); const [tab, setTab] = React.useState<Tab>("outline"); const [preview, setPreview] = React.useState(false); const [confirmPub, setConfirmPub] = React.useState(false);
  const [status, setStatus] = React.useState<"draft" | "published" | "archived">("draft");
  React.useEffect(() => {
    if (!load.data || meta) return; const { c, s } = load.data; const o = toOutline(id, s.modules, s.activities);
    (hiddenStore[id] ?? []).forEach((h) => { const m = o.find((x) => x.id === h.moduleId); if (m) m.activities.splice(Math.min(h.sequence - 1, m.activities.length), 0, h); });
    setOutline(o); setStatus(c.status); setMeta({ title: c.title, description: c.description, subjectId: c.subjectId, gradeIds: c.gradeIds, language: c.language, outcomes: c.outcomes.join("\n") });
  }, [load.data, meta, id]);
  React.useEffect(() => { setUnsaved(dirty); return () => setUnsaved(false); }, [dirty, setUnsaved]);
  React.useEffect(() => { if (!dirty) return; const h = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [dirty]);

  const edit = (fn: (o: Outline) => Outline) => { setOutline(fn); setDirty(true); };
  const issues = React.useMemo(() => (meta ? validate(meta, outline) : []), [meta, outline]);
  const errors = issues.filter((i) => i.level === "error");

  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!meta) throw new Error("Not loaded"); if (errors.length) throw new Error(errors[0].text);
      if (publish && issues.length) throw new Error(issues[0].text);
      const { mods, acts, hidden } = fromOutline(id, outline); hiddenStore[id] = hidden;
      await courseService.updateMeta(id, { title: meta.title.trim(), description: meta.description.trim(), subjectId: meta.subjectId, gradeIds: meta.gradeIds, language: meta.language, outcomes: meta.outcomes.split("\n").map((x) => x.trim()).filter(Boolean) });
      await courseService.saveStructure(id, mods, acts); if (publish) await courseService.setStatus(id, "published"); return publish;
    },
    onSuccess: (pub) => { setDirty(false); if (pub) setStatus("published"); toast.success(pub ? "Published — students see this sequence now" : "Draft saved"); qc.invalidateQueries({ queryKey: [...KEYS.courses] }); qc.invalidateQueries({ queryKey: ["student"] }); qc.invalidateQueries({ queryKey: ["courses"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (load.isError) return <ErrorState body={errMsg(load.error)} onRetry={() => load.refetch()} />;
  if (load.isLoading || !meta) return <SkeletonCards n={4} h="h-24" />;
  const c = load.data!.c; const isMine = c.creatorName === t.plain;
  if (!isMine) return <EmptyState title="Read-only course" body={`“${c.title}” belongs to ${c.creatorName}. Only its author can edit the structure.`} action={{ label: "Back to courses", href: tHref("courses") }} />;
  const objs = OBJECTIVES.filter((o) => o.subjectId === meta.subjectId);
  const mapped = new Set(outline.flatMap((m) => m.activities.flatMap((a) => a.learningObjectiveIds)));
  const upd = (p: Partial<Meta>) => { setMeta({ ...meta, ...p }); setDirty(true); };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader back={<Link href={tHref("courses")} className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-primary"><ArrowLeft size={12} />Courses</Link>} title={meta.title || "Untitled course"}
        eyebrow={<div className="flex flex-wrap items-center gap-2"><StatusBadge status={status} /><Badge>v{c.version}</Badge><span role="status" aria-live="polite" className={dirty ? "text-xs font-semibold text-warning" : "text-xs text-text-2"}>{dirty ? "● Unsaved changes" : "All changes saved"}</span></div>}
        actions={<><Button variant="outline" size="sm" onClick={() => setPreview(true)}><Eye size={16} />Preview as student</Button><Button variant="outline" size="sm" onClick={() => save.mutate(false)} loading={save.isPending} disabled={!dirty && !errors.length}><FloppyDisk size={16} />Save draft</Button><Button size="sm" onClick={() => setConfirmPub(true)} disabled={save.isPending}><RocketLaunch size={16} />{status === "published" ? "Publish update" : "Publish"}</Button></>} />
      {issues.length > 0 && (
        <details className="mb-4 rounded-xl border border-border bg-surface p-3 text-sm" open={errors.length > 0}><summary className="flex cursor-pointer items-center gap-2 font-semibold"><WarningCircle size={18} className={errors.length ? "text-danger" : "text-warning"} />{errors.length} to fix, {issues.length - errors.length} to check before publishing</summary>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-text-2">{issues.slice(0, 8).map((i, k) => <li key={k} className={i.level === "error" ? "text-danger" : ""}>{i.text}</li>)}{issues.length > 8 && <li>…and {issues.length - 8} more</li>}</ul></details>
      )}
      <div className="mb-4"><Segmented label="Builder sections" value={tab} onChange={setTab} options={[{ value: "outline", label: "Outline" }, { value: "details", label: "Details & curriculum" }, { value: "timeline", label: "Timeline" }, { value: "remedial", label: "Remedial journeys" }]} /></div>
      {tab === "outline" && <OutlineEditor courseId={id} outline={outline} edit={edit} issues={issues} subjectId={meta.subjectId} />}
      {tab === "details" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardBody className="space-y-3"><h2 className="text-sm font-bold">Course details</h2>
            <Field label="Title" required error={meta.title.trim().length < 3 ? "At least 3 characters" : undefined} htmlFor="m-title"><Input id="m-title" value={meta.title} onChange={(e) => upd({ title: e.target.value })} /></Field>
            <Field label="Description" required error={meta.description.trim().length < 20 ? "Needed to publish (20+ characters)" : undefined} htmlFor="m-desc"><Textarea id="m-desc" value={meta.description} onChange={(e) => upd({ description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Subject" htmlFor="m-sub"><Select id="m-sub" value={meta.subjectId} onChange={(e) => upd({ subjectId: e.target.value })}>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field><Field label="Language" htmlFor="m-lang"><Select id="m-lang" value={meta.language} onChange={(e) => upd({ language: e.target.value })}><option>English</option><option>Hindi</option><option>Tamil</option></Select></Field></div>
            <fieldset><legend className="mb-1 text-sm font-semibold">Grades</legend><div className="flex flex-wrap gap-3">{GRADES.map((g) => <Checkbox key={g.id} label={g.label} checked={meta.gradeIds.includes(g.id)} onChange={(v) => upd({ gradeIds: v ? [...meta.gradeIds, g.id] : meta.gradeIds.filter((x) => x !== g.id) })} />)}</div></fieldset>
            <Field label="Learning outcomes" optional hint="One per line, shown to students" htmlFor="m-out"><Textarea id="m-out" value={meta.outcomes} onChange={(e) => upd({ outcomes: e.target.value })} /></Field>
          </CardBody></Card>
          <Card><CardBody><h2 className="mb-1 text-sm font-bold">Curriculum & learning-objective mapping</h2><p className="mb-3 text-xs text-text-2">Karuvana State Curriculum 2026.1. Objectives are mapped on each activity; coverage is shown here.</p>
            {!objs.length ? <p className="text-sm text-text-2">No curriculum objectives for this subject.</p> : <ul className="space-y-2">{objs.map((o) => <li key={o.id} className="flex items-start justify-between gap-2 rounded-xl bg-surface-2 p-2.5 text-sm"><span><span className="font-semibold">{o.code}</span> · {o.title}<br /><span className="text-xs text-text-2">{o.chapter} · {o.competency}</span></span><Badge tone={mapped.has(o.id) ? "success" : "warning"}>{mapped.has(o.id) ? `${outline.flatMap((m) => m.activities).filter((a) => a.learningObjectiveIds.includes(o.id)).length} activities` : "Not covered"}</Badge></li>)}</ul>}
          </CardBody></Card>
        </div>
      )}
      {tab === "timeline" && <TimelineTab courseId={id} outline={outline} onDirty={() => setDirty(true)} />}
      {tab === "remedial" && <RemedialTab courseId={id} outline={outline} subjectId={meta.subjectId} teacherId={t.id} />}
      <StudentPreview open={preview} onOpenChange={setPreview} title={meta.title} outline={outline} />
      <ConfirmDialog open={confirmPub} onOpenChange={setConfirmPub} title={status === "published" ? "Publish this update?" : "Publish this course?"} body="Students will see the saved sequence in their Course Player straight away. You can keep editing and republish later." confirmLabel="Publish" onConfirm={() => save.mutate(true)} />
    </div>
  );
}
