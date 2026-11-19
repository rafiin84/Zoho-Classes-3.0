"use client";
import * as React from "react";
import { Button, Field, Input, Select, toast, ConfirmDialog } from "@/components/ui";
import { BLOOM, DIFFICULTY, QTYPES, type Blueprint } from "@/types/questions";
import { LANGUAGES } from "./shared";

const num = (v: string) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };

export function BlueprintEditor({ bp, onChange, paperTotal, templates, onApply, onSaveTemplate, onDeleteTemplate, disabled }: { bp: Blueprint; onChange: (b: Blueprint) => void; paperTotal: number; templates: Blueprint[]; onApply: (id: string) => void; onSaveTemplate: (name: string) => Promise<void>; onDeleteTemplate: (id: string) => Promise<void>; disabled?: boolean }) {
  const [name, setName] = React.useState(""); const [del, setDel] = React.useState(false);
  const bloomSum = BLOOM.reduce((a, b) => a + (bp.bloomMarks[b] ?? 0), 0); const diffSum = DIFFICULTY.reduce((a, d) => a + bp.difficultyPct[d], 0);
  const scale = () => { const f = paperTotal / (bloomSum || 1); const bm = { ...bp.bloomMarks }; let acc = 0; BLOOM.forEach((b) => { bm[b] = Math.round((bp.bloomMarks[b] ?? 0) * f); acc += bm[b]; }); bm.Apply += paperTotal - acc; onChange({ ...bp, totalMarks: paperTotal, bloomMarks: bm }); toast.info("Bloom targets scaled to the paper total."); };
  const tpl = templates.find((t) => t.id === bp.id);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2"><Field label="Blueprint template" htmlFor="bp-t" className="min-w-52 flex-1"><Select id="bp-t" value={tpl ? bp.id : ""} onChange={(e) => e.target.value && onApply(e.target.value)} disabled={disabled}><option value="">Custom (unsaved)</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.builtIn ? " (built-in)" : ""}</option>)}</Select></Field>
        {tpl && !tpl.builtIn && <Button variant="ghost" size="sm" onClick={() => setDel(true)}>Delete template</Button>}</div>
      <fieldset disabled={disabled} className="rounded-xl border border-border p-3"><legend className="px-1 text-sm font-bold">Target marks by Bloom level</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{BLOOM.map((b) => <Field key={b} label={b} htmlFor={`bp-b-${b}`}><Input id={`bp-b-${b}`} inputMode="numeric" value={bp.bloomMarks[b] ?? 0} onChange={(e) => onChange({ ...bp, bloomMarks: { ...bp.bloomMarks, [b]: num(e.target.value) } })} /></Field>)}</div>
        <p className={`tnum mt-2 text-xs ${bloomSum === paperTotal ? "text-success" : "text-warning"}`} aria-live="polite">Bloom targets add up to {bloomSum} of {paperTotal} marks{bloomSum !== paperTotal && ". "}{bloomSum !== paperTotal && <button type="button" className="font-semibold underline" onClick={scale}>Scale to {paperTotal}</button>}</p></fieldset>
      <fieldset disabled={disabled} className="rounded-xl border border-border p-3"><legend className="px-1 text-sm font-bold">Difficulty distribution (separate from Bloom), %</legend>
        <div className="grid grid-cols-3 gap-3">{DIFFICULTY.map((d) => <Field key={d} label={d} htmlFor={`bp-d-${d}`}><Input id={`bp-d-${d}`} inputMode="numeric" value={bp.difficultyPct[d]} onChange={(e) => onChange({ ...bp, difficultyPct: { ...bp.difficultyPct, [d]: num(e.target.value) } })} /></Field>)}</div>
        <p className={`tnum mt-2 text-xs ${diffSum === 100 ? "text-success" : "text-danger"}`} role="status">{diffSum === 100 ? "Adds up to 100%." : `Adds up to ${diffSum}%; must be 100%.`}</p></fieldset>
      <fieldset disabled={disabled} className="rounded-xl border border-border p-3"><legend className="px-1 text-sm font-bold">Question count by type (guide)</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{QTYPES.map((t) => <Field key={t.id} label={t.label} htmlFor={`bp-q-${t.id}`}><Input id={`bp-q-${t.id}`} inputMode="numeric" value={bp.typeMix[t.id] ?? 0} onChange={(e) => onChange({ ...bp, typeMix: { ...bp.typeMix, [t.id]: num(e.target.value) } })} /></Field>)}</div></fieldset>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Language" htmlFor="bp-l"><Select id="bp-l" disabled={disabled} value={bp.language} onChange={(e) => onChange({ ...bp, language: e.target.value })}>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</Select></Field>
        <Field label="Accessibility" htmlFor="bp-a"><Input id="bp-a" disabled={disabled} value={bp.accessibility} onChange={(e) => onChange({ ...bp, accessibility: e.target.value })} /></Field></div>
      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3"><Field label="Save as reusable template" htmlFor="bp-n" className="min-w-52 flex-1"><Input id="bp-n" placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Button variant="outline" disabled={name.trim().length < 3 || diffSum !== 100} onClick={async () => { await onSaveTemplate(name.trim()); setName(""); }}>Save template</Button></div>
      <ConfirmDialog open={del} onOpenChange={setDel} title="Delete template?" body="Papers already using it keep their own copy of the blueprint." confirmLabel="Delete" destructive onConfirm={() => onDeleteTemplate(bp.id)} />
    </div>
  );
}
