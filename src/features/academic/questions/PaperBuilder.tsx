"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, Trash, ArrowsClockwise, Shuffle, Sparkle, Plus, Printer } from "@phosphor-icons/react";
import { AIBadge, Badge, Button, Card, CardBody, ConfirmDialog, ErrorState, Field, Input, Modal, PageHeader, Segmented, Select, SkeletonCards, StatusBadge, Textarea, toast } from "@/components/ui";
import { useActors } from "@/stores/app-store";
import { OBJECTIVES, SUBJECTS, GRADES, ACADEMIC_YEARS } from "@/lib/mock-data/core";
import { BLOOM, DIFFICULTY, qTypeLabel, type Blueprint, type Paper, type PaperQuestion, type Question } from "@/types/questions";
import { analysePaper, blockingIssues, questionPaperService, sumMarks, toPaperQuestion } from "@/lib/api/questionPaperService";
import { questionBankService } from "@/lib/api/questionBankService";
import { BLUEPRINT_SEED } from "@/lib/mock-data/questions";
import { fmtDateTime } from "@/lib/format";
import { BloomChart, PaperChecks } from "./BloomChart";
import { BlueprintEditor } from "./BlueprintEditor";
import { PaperPreview, AnswerKey } from "./PaperPreview";
import { QuestionPicker } from "./QuestionPicker";
import { BloomBadge, DiffBadge } from "./shared";

const schema = z.object({
  title: z.string().min(4, "Give the paper a title (4+ characters)"), subjectId: z.string().min(1), gradeId: z.string().min(1), academicYearId: z.string(), term: z.string().min(1, "Choose a term"), examType: z.string().min(1, "Choose an exam type"),
  totalMarks: z.string().regex(/^\d+$/, "Whole number of marks").refine((v) => Number(v) >= 5 && Number(v) <= 200, "Between 5 and 200 marks"), durationMin: z.string().regex(/^\d+$/, "Whole minutes").refine((v) => Number(v) >= 10 && Number(v) <= 300, "Between 10 and 300 minutes"),
  instructions: z.string().min(10, "Add exam instructions for candidates"), restrictedTo: z.enum(["owner", "department", "institution"]),
});
type Meta = z.infer<typeof schema>;
type Tab = "setup" | "blueprint" | "questions" | "preview" | "key";

const blank = (ownerId: string, ownerName: string): Paper => ({ id: "", title: "", subjectId: "sub-math", gradeId: "g8", chapterIds: [], objectiveIds: [], totalMarks: 25, durationMin: 45, academicYearId: "ay-2026-27", term: "Term 2", examType: "Unit test", instructions: "Answer all questions. Show your working. Marks are shown in brackets.", blueprint: structuredClone(BLUEPRINT_SEED[0]), mode: "bank", questions: [], status: "draft", ownerId, ownerName, version: 1, versions: [], restrictedTo: "department", createdAt: "", updatedAt: "" });

export function PaperBuilder({ paperId, role, onClose, onOpen }: { paperId?: string; role: string; onClose: () => void; onOpen: (id: string) => void }) {
  const { teacherId } = useActors();
  const q = useQuery({ queryKey: ["paper", paperId ?? "new"], queryFn: () => (paperId ? questionPaperService.get(paperId) : Promise.resolve(blank(teacherId, "You"))), gcTime: 0 });
  if (q.isLoading) return <SkeletonCards n={3} h="h-40" />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <ErrorState title="Paper not found" body="It may have been deleted or you may not have access." onRetry={onClose} />;
  return <BuilderInner key={q.data.id || "new"} initial={q.data} role={role} onClose={onClose} onOpen={onOpen} />;
}

function BuilderInner({ initial, role, onClose, onOpen }: { initial: Paper; role: string; onClose: () => void; onOpen: (id: string) => void }) {
  const { teacherId } = useActors(); const qc = useQueryClient();
  const tpl = useQuery({ queryKey: ["blueprints"], queryFn: () => questionPaperService.listBlueprints() });
  const [paper, setPaper] = React.useState<Paper>(() => structuredClone(initial)); const [tab, setTab] = React.useState<Tab>("setup"); const [prev, setPrev] = React.useState<"student" | "staff">("staff");
  const [picker, setPicker] = React.useState<{ open: boolean; replace?: PaperQuestion }>({ open: false }); const [reclass, setReclass] = React.useState<PaperQuestion | null>(null); const [versions, setVersions] = React.useState(false);
  const [busy, setBusy] = React.useState(false); const [dirty, setDirty] = React.useState(false); const [confirmGen, setConfirmGen] = React.useState<null | "bank" | "ai">(null); const [rev, setRev] = React.useState<"approved" | "rejected" | null>(null); const [note, setNote] = React.useState("");
  const form = useForm<Meta>({ resolver: zodResolver(schema), mode: "onChange", defaultValues: { title: initial.title, subjectId: initial.subjectId, gradeId: initial.gradeId, academicYearId: initial.academicYearId, term: initial.term, examType: initial.examType, totalMarks: String(initial.totalMarks), durationMin: String(initial.durationMin), instructions: initial.instructions, restrictedTo: initial.restrictedTo } });
  const watched = form.watch();
  const locked = (paper.status === "published" || paper.status === "archived" || (paper.status === "in-review" && role !== "institution")); const inst = role === "institution"; const mine = paper.ownerId === teacherId || !paper.id;
  // keep paper in sync with valid form values (live)
  const live: Paper = React.useMemo(() => ({ ...paper, title: watched.title ?? paper.title, subjectId: watched.subjectId ?? paper.subjectId, gradeId: watched.gradeId ?? paper.gradeId, academicYearId: watched.academicYearId ?? paper.academicYearId, term: watched.term ?? paper.term, examType: watched.examType ?? paper.examType, totalMarks: Number(watched.totalMarks) || paper.totalMarks, durationMin: Number(watched.durationMin) || paper.durationMin, instructions: watched.instructions ?? paper.instructions, restrictedTo: watched.restrictedTo ?? paper.restrictedTo }), [paper, watched]);
  const upd = (p: Partial<Paper>) => { setPaper({ ...live, ...p }); setDirty(true); };
  const objs = OBJECTIVES.filter((o) => o.subjectId === live.subjectId && o.gradeId === live.gradeId);
  const setQs = (qs: PaperQuestion[]) => upd({ questions: qs });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["papers"] }); qc.invalidateQueries({ queryKey: ["qb"] }); };

  const save = async (silent?: boolean): Promise<Paper | null> => {
    const ok = await form.trigger(); if (!ok) { setTab("setup"); toast.error("Fix the highlighted setup fields first."); return null; }
    setBusy(true);
    try { const saved = await questionPaperService.save(live, teacherId, live.questions.length ? "Question set changed" : "Saved"); setPaper(structuredClone(saved)); setDirty(false); refresh(); if (!silent) toast.success(`Saved as version ${saved.version}`); return saved; } catch (e) { toast.error((e as Error).message); return null; } finally { setBusy(false); }
  };
  const flow = async (fn: (id: string) => Promise<Paper>, msg: string) => { const s = dirty || !live.id ? await save(true) : live; if (!s) return; setBusy(true); try { const r = await fn(s.id); setPaper(structuredClone(r)); refresh(); toast.success(msg); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } };
  const gen = async (kind: "bank" | "ai") => {
    setConfirmGen(null); setBusy(true);
    try {
      const g = { subjectId: live.subjectId, gradeId: live.gradeId, objectiveIds: live.objectiveIds, chapterIds: live.chapterIds, blueprint: live.blueprint, totalMarks: live.totalMarks, role, teacherId };
      if (kind === "bank") { const r = await questionPaperService.generateFromBank(g); setQs(r.questions); toast.success(`Selected ${r.questions.length} of ${r.poolSize} eligible approved questions. Snapshots stored; review the distribution.`); if (!r.questions.length) toast.warning("No approved questions matched. Select objectives or add questions manually."); }
      else { if (!live.objectiveIds.length) { toast.error("Select learning objectives first so AI can ground the questions."); return; } const r = await questionPaperService.generateAI({ ...g, count: Math.max(3, Math.round(live.totalMarks / 3)) }); setQs(r); toast.info(`${r.length} AI-drafted questions added (demo). They are drafts: approve them in the Question Bank before the paper can be published.`); }
      setTab("questions");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const dup = async () => { setBusy(true); try { const d = await questionPaperService.duplicate(live.id, teacherId); refresh(); toast.success("Duplicated as a new draft"); onOpen(d.id); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } };
  const syncApprovals = async () => { const out: PaperQuestion[] = []; let n = 0; for (const pq of live.questions) { const b = await questionBankService.get(pq.qid); if (b && b.status === "approved" && pq.snapshot.status !== "approved" && b.version === pq.snapshot.version) { n++; out.push({ ...pq, snapshot: { ...pq.snapshot, status: "approved" } }); } else out.push(pq); } setQs(out); toast.info(n ? `${n} question(s) now approved in the bank.` : "No newly approved questions. Snapshots are otherwise unchanged by design."); };
  const reclassify = (pq: PaperQuestion, patch: Partial<Question>) => setQs(live.questions.map((x) => (x.qid === pq.qid ? { ...x, snapshot: { ...x.snapshot, ...patch } } : x)));
  const move = (i: number, d: number) => { const a = [...live.questions]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setQs(a); };
  const saveTpl = async (name: string) => { await questionPaperService.saveBlueprint({ ...live.blueprint, id: `bp-${Date.now()}`, name }); await qc.invalidateQueries({ queryKey: ["blueprints"] }); toast.success("Blueprint template saved for reuse"); };
  const err = (k: keyof Meta) => form.formState.errors[k]?.message;
  const blocked = blockingIssues(live);
  const tabs: { value: Tab; label: string }[] = [{ value: "setup", label: "Setup" }, { value: "blueprint", label: "Blueprint" }, { value: "questions", label: "Questions", count: live.questions.length } as never, { value: "preview", label: "Preview" }, { value: "key", label: "Answer key" }];

  return (
    <div>
      <PageHeader title={live.id ? live.title || "Untitled paper" : "New question paper"} eyebrow={<div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={() => { if (dirty && !window.confirm("Discard unsaved changes?")) return; onClose(); }}>← Paper bank</Button>{live.id && <StatusBadge status={live.status} />}{live.id && <Badge className="tnum">v{live.version}</Badge>}</div>}
        subtitle={live.status === "published" ? "Published papers are locked. Duplicate as a draft to change anything." : "Draft, check the blueprint, get approval, then publish for exam scheduling."}
        actions={<>
          {live.id && <Button variant="ghost" onClick={() => setVersions(true)}>Versions</Button>}
          {live.id && <Button variant="outline" disabled={busy} onClick={() => dup()}>Duplicate as draft</Button>}
          {!locked && <Button onClick={() => save()} loading={busy} disabled={busy || !dirty && !!live.id}>Save draft</Button>}
        </>} />
      <div className="mb-4"><Segmented label="Paper builder steps" value={tab} onChange={setTab} options={tabs} /></div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {tab === "setup" && (
            <Card><CardBody><form className="grid gap-3 sm:grid-cols-2" noValidate onSubmit={(e) => e.preventDefault()}><fieldset disabled={locked} className="contents">
              <Field label="Paper title" htmlFor="pb-title" error={err("title")} required className="sm:col-span-2"><Input id="pb-title" {...form.register("title")} aria-invalid={!!err("title")} onChange={(e) => { form.register("title").onChange(e); setDirty(true); }} /></Field>
              <Field label="Subject" htmlFor="pb-sub"><Select id="pb-sub" {...form.register("subjectId", { onChange: (e) => upd({ subjectId: e.target.value, objectiveIds: [], questions: [] }) })}>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
              <Field label="Grade" htmlFor="pb-gr"><Select id="pb-gr" {...form.register("gradeId", { onChange: (e) => upd({ gradeId: e.target.value, objectiveIds: [], questions: [] }) })}>{GRADES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select></Field>
              <Field label="Academic year" htmlFor="pb-ay"><Select id="pb-ay" {...form.register("academicYearId")}>{ACADEMIC_YEARS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</Select></Field>
              <Field label="Term" htmlFor="pb-term" error={err("term")}><Select id="pb-term" {...form.register("term")}>{["Term 1", "Term 2", "Term 3"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
              <Field label="Exam type" htmlFor="pb-et" error={err("examType")}><Select id="pb-et" {...form.register("examType")}>{["Unit test", "Weekly check", "Mid-term", "Term exam", "Practice paper", "Re-test"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
              <Field label="Restrict visibility to" htmlFor="pb-rs" hint="Who can see this paper once it leaves draft."><Select id="pb-rs" {...form.register("restrictedTo")}><option value="owner">Only me</option><option value="department">My department</option><option value="institution">Institution staff</option></Select></Field>
              <Field label="Total marks" htmlFor="pb-tm" error={err("totalMarks")} required><Input id="pb-tm" inputMode="numeric" {...form.register("totalMarks")} aria-invalid={!!err("totalMarks")} /></Field>
              <Field label="Duration (minutes)" htmlFor="pb-du" error={err("durationMin")} required><Input id="pb-du" inputMode="numeric" {...form.register("durationMin")} aria-invalid={!!err("durationMin")} /></Field>
              <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-semibold">Learning objectives covered <span className="font-normal text-text-2">(chapters follow the objectives)</span></legend>
                <div className="grid gap-1.5 sm:grid-cols-2">{objs.map((o) => <label key={o.id} className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" checked={live.objectiveIds.includes(o.id)} onChange={(e) => { const ids = e.target.checked ? [...live.objectiveIds, o.id] : live.objectiveIds.filter((x) => x !== o.id); upd({ objectiveIds: ids, chapterIds: [...new Set(OBJECTIVES.filter((x) => ids.includes(x.id)).map((x) => x.chapterId))] }); }} /><span><b className="tnum">{o.code}</b> {o.title}<span className="block text-xs text-text-2">{o.chapter}</span></span></label>)}
                  {!objs.length && <p className="text-sm text-text-2">No curriculum objectives for this subject and grade.</p>}</div></fieldset>
              <Field label="Instructions to candidates" htmlFor="pb-ins" error={err("instructions")} required className="sm:col-span-2"><Textarea id="pb-ins" {...form.register("instructions")} aria-invalid={!!err("instructions")} /></Field>
            </fieldset></form></CardBody></Card>
          )}
          {tab === "blueprint" && <Card><CardBody><BlueprintEditor bp={live.blueprint} onChange={(b) => upd({ blueprint: b })} paperTotal={live.totalMarks} templates={tpl.data ?? []} disabled={locked} onApply={(id) => { const t = tpl.data?.find((x) => x.id === id); if (t) upd({ blueprint: structuredClone(t) }); }} onSaveTemplate={saveTpl} onDeleteTemplate={async (id) => { await questionPaperService.deleteBlueprint(id); await qc.invalidateQueries({ queryKey: ["blueprints"] }); upd({ blueprint: { ...live.blueprint, id: "custom", builtIn: false } }); toast.success("Template deleted"); }} /></CardBody></Card>}
          {tab === "questions" && (
            <div className="space-y-3">
              <Card><CardBody className="space-y-2 !p-3"><div className="flex flex-wrap items-center gap-2"><Segmented label="Generation mode" value={live.mode} onChange={(m) => upd({ mode: m })} options={[{ value: "manual", label: "Manual" }, { value: "bank", label: "From bank" }, { value: "ai", label: "AI-assisted" }]} /></div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={locked} onClick={() => setPicker({ open: true })}><Plus size={16} />Add from bank</Button>
                  {live.mode === "bank" && <Button size="sm" disabled={locked || busy} onClick={() => (live.questions.length ? setConfirmGen("bank") : gen("bank"))}><Shuffle size={16} />Generate within blueprint (randomised)</Button>}
                  {live.mode === "ai" && <Button size="sm" variant="soft" disabled={locked || busy} onClick={() => (live.questions.length ? setConfirmGen("ai") : gen("ai"))}><Sparkle size={16} />AI-assisted draft (demo)</Button>}
                  <Button size="sm" variant="ghost" onClick={syncApprovals}><ArrowsClockwise size={16} />Refresh approvals</Button>
                </div>
                <p className="text-xs text-text-2">Each question is stored as a snapshot in this paper. Later edits in the bank never change a paper that already includes it.{live.mode === "ai" && " AI-drafted items must be approved before publishing."}</p></CardBody></Card>
              {!live.questions.length ? <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-2">No questions yet. Add from the bank{live.mode !== "manual" ? " or generate a selection within your blueprint" : ""}.</div> : (
                <ol className="space-y-2">{live.questions.map((pq, i) => (
                  <li key={pq.qid}><Card><CardBody className="!p-3">
                    <div className="flex items-start gap-2"><span className="tnum mt-0.5 w-6 shrink-0 text-sm font-bold">{i + 1}.</span><div className="min-w-0 flex-1">
                      <p className="text-sm">{pq.snapshot.stem}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><Badge>{qTypeLabel(pq.snapshot.type)}</Badge><BloomBadge b={pq.snapshot.bloom} /><DiffBadge d={pq.snapshot.difficulty} /><Badge tone="info">{pq.snapshot.objectiveIds.map((o) => OBJECTIVES.find((x) => x.id === o)?.code).join(", ") || "Unmapped"}</Badge>{pq.snapshot.status !== "approved" && <Badge tone="warning">{pq.snapshot.aiGenerated ? "AI draft" : pq.snapshot.status}</Badge>}{pq.snapshot.aiGenerated && <AIBadge label="AI · demo" />}</div></div>
                      <div className="w-16 shrink-0"><label className="sr-only" htmlFor={`m-${pq.qid}`}>Marks for question {i + 1}</label><Input id={`m-${pq.qid}`} className="!h-9 text-center" inputMode="decimal" disabled={locked} value={pq.marks} onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= 0 && v <= 50) setQs(live.questions.map((x) => (x.qid === pq.qid ? { ...x, marks: v } : x))); }} /></div></div>
                    {!locked && <div className="mt-2 flex flex-wrap items-center gap-1 pl-8">
                      <Select aria-label="Section" className="!h-8 !w-auto !text-xs" value={pq.section} onChange={(e) => setQs(live.questions.map((x) => (x.qid === pq.qid ? { ...x, section: e.target.value } : x)))}>{["Section A", "Section B", "Section C", "Section D"].map((s) => <option key={s}>{s}</option>)}</Select>
                      <Button size="sm" variant="ghost" onClick={() => setPicker({ open: true, replace: pq })}>Replace</Button><Button size="sm" variant="ghost" onClick={() => setReclass(pq)}>Reclassify</Button>
                      <Button size="iconSm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></Button><Button size="iconSm" variant="ghost" aria-label="Move down" disabled={i === live.questions.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></Button>
                      <Button size="iconSm" variant="ghost" aria-label={`Remove question ${i + 1}`} onClick={() => setQs(live.questions.filter((x) => x.qid !== pq.qid))}><Trash size={16} /></Button></div>}
                  </CardBody></Card></li>))}</ol>
              )}
            </div>
          )}
          {tab === "preview" && <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><Segmented label="Preview audience" value={prev} onChange={setPrev} options={[{ value: "staff", label: "Staff review" }, { value: "student", label: "Student-facing" }]} /><Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={16} />Print</Button></div><PaperPreview paper={live} mode={prev} /></div>}
          {tab === "key" && <AnswerKey paper={live} />}
        </div>
        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start" aria-label="Distribution and validation">
          <Card><CardBody className="space-y-4 !p-4"><BloomChart paper={live} /><PaperChecks paper={live} /></CardBody></Card>
          <Card><CardBody className="space-y-2 !p-4"><p className="text-xs font-bold uppercase tracking-wide text-text-2">Approval and publishing</p>
            {live.status === "draft" && <Button className="w-full" variant="soft" disabled={busy || !mine && !inst} onClick={() => flow((id) => questionPaperService.submitForApproval(id), "Submitted for approval")}>Submit for approval</Button>}
            {live.status === "in-review" && (inst ? <div className="flex gap-2"><Button className="flex-1" variant="success" disabled={busy} onClick={() => setRev("approved")}>Approve</Button><Button className="flex-1" variant="danger" disabled={busy} onClick={() => setRev("rejected")}>Return</Button></div> : <p className="text-sm text-text-2">Waiting for an institution reviewer.</p>)}
            {live.status === "approved" && <Button className="w-full" disabled={busy || blocked.length > 0} onClick={() => flow((id) => questionPaperService.publish(id), "Published. It is now available for exam scheduling.")}>Publish for exam scheduling</Button>}
            {live.status === "approved" && blocked.length > 0 && <p className="text-xs text-danger">Resolve blocking issues above before publishing.</p>}
            {live.status === "published" && <p className="text-sm text-success">Published {live.publishedAt ? fmtDateTime(live.publishedAt) : ""}. Available to the exam creator.</p>}
            {live.reviewNote && <p className="text-xs text-text-2">Reviewer note: {live.reviewNote}</p>}
            <p className="text-xs text-text-2">Papers need approval from an institution reviewer before they can be published. Students only ever see the published question paper, never the answer key.</p></CardBody></Card>
        </aside>
      </div>
      <QuestionPicker open={picker.open} onClose={() => setPicker({ open: false })} paper={live} role={role} teacherId={teacherId} replacing={picker.replace?.snapshot} onPick={(bq) => { const pq = toPaperQuestion(bq, picker.replace?.section); setQs(picker.replace ? live.questions.map((x) => (x.qid === picker.replace!.qid ? pq : x)) : [...live.questions, pq]); toast.success(picker.replace ? "Question replaced" : "Question added"); }} />
      <Modal open={!!reclass} onOpenChange={(v) => !v && setReclass(null)} title="Reclassify in this paper" description="Changes only this paper’s snapshot, not the question bank." footer={<Button onClick={() => setReclass(null)}>Done</Button>}>
        {reclass && (() => { const cur = live.questions.find((x) => x.qid === reclass.qid)!; return <div className="grid gap-3">
          <Field label="Bloom level" htmlFor="rc-b"><Select id="rc-b" value={cur.snapshot.bloom} onChange={(e) => reclassify(cur, { bloom: e.target.value as Question["bloom"] })}>{BLOOM.map((b) => <option key={b}>{b}</option>)}</Select></Field>
          <Field label="Difficulty" htmlFor="rc-d"><Select id="rc-d" value={cur.snapshot.difficulty} onChange={(e) => reclassify(cur, { difficulty: e.target.value as Question["difficulty"] })}>{DIFFICULTY.map((b) => <option key={b}>{b}</option>)}</Select></Field>
          <Field label="Mapped objective" htmlFor="rc-o"><Select id="rc-o" value={cur.snapshot.objectiveIds[0] ?? ""} onChange={(e) => reclassify(cur, { objectiveIds: [e.target.value] })}>{objs.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.title}</option>)}</Select></Field></div>; })()}
      </Modal>
      <Modal open={versions} onOpenChange={setVersions} title="Paper versions" footer={<Button onClick={() => setVersions(false)}>Close</Button>}><ol className="space-y-2">{live.versions.map((v) => <li key={v.v} className="rounded-lg border border-border p-2.5 text-sm"><b className="tnum">v{v.v}</b> · {v.by} · {fmtDateTime(v.at)}<p className="text-xs text-text-2">{v.note} · {v.questionIds.length} questions</p></li>)}{!live.versions.length && <p className="text-sm text-text-2">No versions yet.</p>}</ol></Modal>
      <ConfirmDialog open={!!confirmGen} onOpenChange={(v) => !v && setConfirmGen(null)} title="Replace current questions?" body="Generating a new selection replaces the questions currently in this paper. Your last saved version stays in history." confirmLabel="Replace and generate" onConfirm={() => gen(confirmGen!)} />
      <Modal open={!!rev} onOpenChange={(v) => !v && setRev(null)} title={rev === "approved" ? "Approve this paper" : "Return to author"} footer={<><Button variant="ghost" onClick={() => setRev(null)}>Cancel</Button><Button disabled={rev === "rejected" && note.trim().length < 5} onClick={async () => { const d = rev!; setRev(null); await flow((id) => questionPaperService.review(id, d, note || "Approved", role, "Institution reviewer"), d === "approved" ? "Paper approved" : "Returned to author"); setNote(""); }}>Confirm</Button></>}>
        <Field label="Reviewer note" htmlFor="rv-n" required={rev === "rejected"} hint={rev === "rejected" ? "Explain what must change." : "Optional"}><Textarea id="rv-n" value={note} onChange={(e) => setNote(e.target.value)} /></Field></Modal>
    </div>
  );
}
