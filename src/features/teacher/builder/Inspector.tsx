"use client";
import * as React from "react";
import { Field, Input, Textarea, Select, Switch, Checkbox, Badge } from "@/components/ui";
import type { LearningActivity } from "@/types";
import { OBJECTIVES } from "@/lib/mock-data/core";
import { blockOf, isCheckpoint, type Outline } from "./model";

export function Inspector({ a, outline, onChange, subjectId }: { a: LearningActivity; outline: Outline; onChange: (patch: Partial<LearningActivity>) => void; subjectId: string }) {
  const p = (a.payload ?? {}) as Record<string, any>;
  const setP = (patch: Record<string, unknown>) => onChange({ payload: { ...p, ...patch } });
  const others = outline.flatMap((m) => m.activities).filter((x) => x.id !== a.id);
  const objs = OBJECTIVES.filter((o) => o.subjectId === subjectId);
  const titleErr = !a.title.trim() ? "Title is required" : undefined; const minErr = !(a.estimatedMinutes > 0) ? "Enter minutes above 0" : undefined;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><Badge tone="primary">{blockOf(a).label}</Badge><span className="text-xs text-text-2">Edits apply to this activity only</span></div>
      <Field label="Title" required error={titleErr} htmlFor="ins-title"><Input id="ins-title" aria-invalid={!!titleErr} value={a.title} onChange={(e) => onChange({ title: e.target.value })} /></Field>
      <Field label="Instructions / content" optional htmlFor="ins-ins"><Textarea id="ins-ins" value={a.instructions ?? ""} onChange={(e) => onChange({ instructions: e.target.value })} /></Field>
      {a.type === "mcq" && (
        <fieldset className="space-y-2 rounded-xl border border-border p-3"><legend className="px-1 text-xs font-bold">Question</legend>
          <Input aria-label="Question text" placeholder="Question text" value={p.q ?? ""} onChange={(e) => setP({ q: e.target.value })} />
          {(p.options as string[]).map((o, i) => <div key={i} className="flex items-center gap-2"><input type="radio" name="correct" aria-label={`Option ${i + 1} is correct`} checked={p.answer === i} onChange={() => setP({ answer: i })} className="accent-[var(--primary)]" /><Input aria-label={`Option ${i + 1}`} placeholder={`Option ${i + 1}`} value={o} onChange={(e) => setP({ options: (p.options as string[]).map((x, j) => (j === i ? e.target.value : x)) })} /></div>)}
          <Input aria-label="Explanation" placeholder="Explanation shown after answering" value={p.explain ?? ""} onChange={(e) => setP({ explain: e.target.value })} />
        </fieldset>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Minutes" required error={minErr} htmlFor="ins-min"><Input id="ins-min" type="number" min={1} max={240} value={a.estimatedMinutes} onChange={(e) => onChange({ estimatedMinutes: Number(e.target.value) })} /></Field>
        <div className="flex flex-col justify-end gap-1.5"><span className="text-sm font-semibold">{a.mandatory ? "Mandatory" : "Optional"}</span><Switch checked={a.mandatory} onChange={(v) => onChange({ mandatory: v })} label="Mandatory" /></div>
      </div>
      {isCheckpoint(a) && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Mode" htmlFor="ins-mode"><Select id="ins-mode" value={a.checkpointMode ?? "inline"} onChange={(e) => onChange({ checkpointMode: e.target.value as any })}><option value="inline">Inline</option><option value="overlay">Overlay</option><option value="popup">Popup</option><option value="fullscreen">Fullscreen</option></Select></Field>
          <Field label="Frequency" htmlFor="ins-freq"><Select id="ins-freq" value={p.frequency ?? "once"} onChange={(e) => setP({ frequency: e.target.value })}><option value="once">Once</option><option value="each-module">Each module</option><option value="every-5">Every 5 activities</option></Select></Field>
          <Field label="Difficulty" htmlFor="ins-diff"><Select id="ins-diff" value={p.difficulty ?? "adaptive"} onChange={(e) => setP({ difficulty: e.target.value })}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="adaptive">Adaptive</option></Select></Field>
        </div>
      )}
      <fieldset className="space-y-2 rounded-xl border border-border p-3"><legend className="px-1 text-xs font-bold">Prerequisite & completion rule</legend>
        <Field label="Unlocks after" htmlFor="ins-pre"><Select id="ins-pre" value={p.prereqId ?? ""} onChange={(e) => setP({ prereqId: e.target.value || undefined })}><option value="">No prerequisite</option>{others.map((o) => <option key={o.id} value={o.id}>{o.title || "Untitled"}</option>)}</Select></Field>
        <Field label="Counts as complete when" htmlFor="ins-comp"><Select id="ins-comp" value={p.completion ?? "view"} onChange={(e) => setP({ completion: e.target.value })}><option value="view">Student views it</option><option value="submit">Student submits an answer</option><option value="score">Student scores at least…</option><option value="teacher">Teacher marks complete</option></Select></Field>
        {p.completion === "score" && <Field label="Minimum score (%)" htmlFor="ins-score"><Input id="ins-score" type="number" min={1} max={100} value={p.threshold ?? 60} onChange={(e) => setP({ threshold: Number(e.target.value) })} /></Field>}
      </fieldset>
      <fieldset className="rounded-xl border border-border p-3"><legend className="px-1 text-xs font-bold">Learning objectives</legend>
        {objs.length ? <div className="space-y-1.5">{objs.map((o) => <Checkbox key={o.id} label={`${o.code} · ${o.title}`} checked={a.learningObjectiveIds.includes(o.id)} onChange={(v) => onChange({ learningObjectiveIds: v ? [...a.learningObjectiveIds, o.id] : a.learningObjectiveIds.filter((x) => x !== o.id) })} />)}</div> : <p className="text-xs text-text-2">No curriculum objectives for this subject.</p>}
      </fieldset>
      <div className="flex items-center justify-between rounded-xl bg-surface-2 p-3 text-sm"><span>Hidden from students</span><Switch checked={!!p.hidden} onChange={(v) => setP({ hidden: v })} label="Hidden from students" /></div>
    </div>
  );
}
