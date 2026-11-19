"use client";
import * as React from "react";
import { Modal, Button, Field, Input, Select, AIBadge, toast, Checkbox } from "@/components/ui";
import { OBJECTIVES, SUBJECTS, GRADES } from "@/lib/mock-data/core";
import { BLOOM, BLOOM_HELP, DIFFICULTY, QTYPES, type Bloom, type Difficulty, type QType } from "@/types/questions";
import { questionBankService } from "@/lib/api/questionBankService";

const SOURCES = ["Selected learning objectives only", "Lesson: Unlike fractions (Course crs-fractions)", "Approved textbook: Science Explorer Grade 8 (demo)", "Approved textbook: Karuvana Maths Grade 8 (demo)"];

export function AIGenerateModal({ open, onOpenChange, teacherId, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; teacherId: string; onDone: () => void }) {
  const [subjectId, setSubject] = React.useState("sub-math"); const [gradeId, setGrade] = React.useState("g8");
  const [objs, setObjs] = React.useState<string[]>([]); const [types, setTypes] = React.useState<QType[]>(["mcq", "short"]);
  const [count, setCount] = React.useState("4"); const [marks, setMarks] = React.useState("2"); const [diff, setDiff] = React.useState<Difficulty>("Medium"); const [bloom, setBloom] = React.useState<Bloom>("Apply"); const [source, setSource] = React.useState(SOURCES[0]);
  const [busy, setBusy] = React.useState(false); const [err, setErr] = React.useState<string>();
  const list = OBJECTIVES.filter((o) => o.subjectId === subjectId && o.gradeId === gradeId);
  const submit = async () => {
    const n = Number(count), m = Number(marks);
    if (!objs.length) return setErr("Select at least one learning objective."); if (!types.length) return setErr("Select at least one question type.");
    if (!(n >= 1 && n <= 10)) return setErr("Count must be between 1 and 10."); if (!(m > 0 && m <= 20)) return setErr("Marks must be between 1 and 20.");
    setErr(undefined); setBusy(true);
    try { const r = await questionBankService.generate({ objectiveIds: objs, source, types, count: n, marks: m, difficulty: diff, bloom, subjectId, gradeId }, teacherId); toast.success(`${r.length} AI drafts created. Review each before approving.`); onDone(); onOpenChange(false); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Generate questions with AI" description="Demo generator: no real model runs. Items are grounded to your chosen source and stay DRAFT until you approve them." className="sm:max-w-2xl"
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} loading={busy} disabled={busy}>Generate drafts</Button></>}>
      <div className="mb-3"><AIBadge label="AI-generated · demo" /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Subject" htmlFor="ag-s"><Select id="ag-s" value={subjectId} onChange={(e) => { setSubject(e.target.value); setObjs([]); }}>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Grade" htmlFor="ag-g"><Select id="ag-g" value={gradeId} onChange={(e) => { setGrade(e.target.value); setObjs([]); }}>{GRADES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select></Field>
        <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-semibold">Learning objectives</legend>
          {list.length ? <div className="grid gap-1.5 sm:grid-cols-2">{list.map((o) => <Checkbox key={o.id} checked={objs.includes(o.id)} onChange={(v) => setObjs(v ? [...objs, o.id] : objs.filter((x) => x !== o.id))} label={`${o.code} · ${o.title}`} />)}</div> : <p className="text-sm text-text-2">No objectives for this subject and grade in the curriculum.</p>}</fieldset>
        <Field label="Source grounding" htmlFor="ag-src" className="sm:col-span-2" hint="Every item cites this source. Only approved textbooks can be selected."><Select id="ag-src" value={source} onChange={(e) => setSource(e.target.value)}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-semibold">Question types</legend><div className="grid gap-1.5 sm:grid-cols-3">{QTYPES.map((t) => <Checkbox key={t.id} checked={types.includes(t.id)} onChange={(v) => setTypes(v ? [...types, t.id] : types.filter((x) => x !== t.id))} label={t.label} />)}</div></fieldset>
        <Field label="Number of questions" htmlFor="ag-n"><Input id="ag-n" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} /></Field>
        <Field label="Marks each" htmlFor="ag-m"><Input id="ag-m" inputMode="numeric" value={marks} onChange={(e) => setMarks(e.target.value)} /></Field>
        <Field label="Difficulty" htmlFor="ag-d"><Select id="ag-d" value={diff} onChange={(e) => setDiff(e.target.value as Difficulty)}>{DIFFICULTY.map((d) => <option key={d}>{d}</option>)}</Select></Field>
        <Field label="Bloom level" htmlFor="ag-b" hint={BLOOM_HELP[bloom]}><Select id="ag-b" value={bloom} onChange={(e) => setBloom(e.target.value as Bloom)}>{BLOOM.map((d) => <option key={d}>{d}</option>)}</Select></Field>
      </div>
      {err && <p role="alert" className="mt-3 text-sm font-medium text-danger">{err}</p>}
    </Modal>
  );
}
