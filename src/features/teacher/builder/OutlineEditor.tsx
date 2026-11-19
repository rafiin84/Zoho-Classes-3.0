"use client";
import * as React from "react";
import { ArrowUp, ArrowDown, Copy, Trash, Eye, EyeSlash, DotsSixVertical, Plus, CaretDown, CaretRight, ArrowLineUp, ArrowLineDown } from "@phosphor-icons/react";
import { Button, Badge, Icon, Input, ConfirmDialog, Modal, Card, CardBody, toast, EmptyState } from "@/components/ui";
import type { LearningActivity } from "@/types";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/utils";
import { BLOCKS, blockOf, isHidden, newActivity, type Outline, type Issue } from "./model";
import { Inspector } from "./Inspector";
import { ActivityView } from "./StudentPreview";

type Edit = (fn: (o: Outline) => Outline) => void;
const GROUPS = ["Learn", "Practice", "Engage", "Assess", "Checkpoint", "Live"] as const;

export function OutlineEditor({ courseId, outline, edit, issues, subjectId }: { courseId: string; outline: Outline; edit: Edit; issues: Issue[]; subjectId: string }) {
  const [sel, setSel] = React.useState<string | null>(null);
  const [insertAt, setInsertAt] = React.useState<{ moduleId: string; index: number | null } | null>(null);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [status, setStatus] = React.useState("");
  const [confirm, setConfirm] = React.useState<{ kind: "act" | "mod"; id: string; label: string } | null>(null);
  const [preview, setPreview] = React.useState<LearningActivity | null>(null);
  const drag = React.useRef<{ kind: "act" | "mod"; id: string } | null>(null);
  const [over, setOver] = React.useState<string | null>(null);

  const selected = outline.flatMap((m) => m.activities).find((a) => a.id === sel) ?? null;
  const posOf = (id: string) => { for (const [mi, m] of outline.entries()) { const ai = m.activities.findIndex((a) => a.id === id); if (ai >= 0) return { mi, ai }; } return null; };

  const insert = (kind: string) => {
    const b = BLOCKS.find((x) => x.kind === kind)!; const target = insertAt ?? (sel && posOf(sel) ? { moduleId: outline[posOf(sel)!.mi].id, index: posOf(sel)!.ai + 1 } : { moduleId: outline[outline.length - 1]?.id, index: null });
    if (!target.moduleId) { toast.warning("Add a module first, then insert activities."); return; }
    const a = newActivity(b, courseId, target.moduleId);
    edit((o) => o.map((m) => (m.id === target.moduleId ? { ...m, activities: target.index === null ? [...m.activities, a] : [...m.activities.slice(0, target.index), a, ...m.activities.slice(target.index)] } : m)));
    setSel(a.id); setInsertAt(null); setStatus(`Added ${b.label}`);
  };
  const moveAct = (id: string, toModuleId: string, toIndex: number | null) => edit((o) => {
    let moving: LearningActivity | undefined; const stripped = o.map((m) => { const f = m.activities.find((a) => a.id === id); if (f) moving = f; return { ...m, activities: m.activities.filter((a) => a.id !== id) }; });
    if (!moving) return o;
    return stripped.map((m) => (m.id === toModuleId ? { ...m, activities: toIndex === null ? [...m.activities, { ...moving!, moduleId: m.id }] : [...m.activities.slice(0, toIndex), { ...moving!, moduleId: m.id }, ...m.activities.slice(toIndex)] } : m));
  });
  const stepAct = (id: string, d: -1 | 1) => { const p = posOf(id); if (!p) return; const m = outline[p.mi]; const ni = p.ai + d;
    if (ni < 0) { if (p.mi === 0) { setStatus("Already first"); return; } moveAct(id, outline[p.mi - 1].id, null); }
    else if (ni >= m.activities.length) { if (p.mi === outline.length - 1) { setStatus("Already last"); return; } moveAct(id, outline[p.mi + 1].id, 0); }
    else moveAct(id, m.id, d === -1 ? ni : ni + 1);
    setStatus(`Moved ${m.activities[p.ai].title || "activity"} ${d === -1 ? "up" : "down"}`); };
  const moveMod = (id: string, toIndex: number) => edit((o) => { const from = o.findIndex((m) => m.id === id); if (from < 0) return o; const c = [...o]; const [x] = c.splice(from, 1); c.splice(toIndex > from ? toIndex - 1 : toIndex, 0, x); return c; });
  const stepMod = (id: string, d: -1 | 1) => { const i = outline.findIndex((m) => m.id === id); const n = i + d; if (n < 0 || n >= outline.length) return; edit((o) => { const c = [...o]; [c[i], c[n]] = [c[n], c[i]]; return c; }); setStatus(`Module moved ${d === -1 ? "up" : "down"}`); };
  const dupAct = (a: LearningActivity) => { const p = posOf(a.id)!; const copy = { ...structuredClone(a), id: uid("act"), title: `${a.title} (copy)` }; edit((o) => o.map((m, mi) => (mi === p.mi ? { ...m, activities: [...m.activities.slice(0, p.ai + 1), copy, ...m.activities.slice(p.ai + 1)] } : m))); setSel(copy.id); };
  const patchAct = (id: string, patch: Partial<LearningActivity>) => edit((o) => o.map((m) => ({ ...m, activities: m.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)) })));
  const addModule = () => { const m = { id: uid("mod"), title: `Module ${outline.length + 1}`, activities: [] as LearningActivity[] }; edit((o) => [...o, m]); setStatus("Module added"); };
  const issueFor = (id: string) => issues.find((i) => i.activityId === id);

  const onDropAct = (e: React.DragEvent, moduleId: string, index: number | null) => { e.preventDefault(); e.stopPropagation(); const d = drag.current; setOver(null); drag.current = null; if (d?.kind === "act") { moveAct(d.id, moduleId, index); setStatus("Activity moved"); } };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-3">
        <p className="sr-only" role="status" aria-live="polite">{status}</p>
        {!outline.length && <EmptyState title="This course has no modules" body="Add a module to start building your sequence, then insert activities from the library." action={{ label: "Add first module", onClick: addModule }} />}
        {outline.map((m, mi) => {
          const closed = collapsed[m.id];
          return (
            <Card key={m.id} className={cn(over === `mod:${m.id}` && "ring-2 ring-primary")}
              onDragOver={(e: React.DragEvent) => { if (drag.current?.kind === "mod") { e.preventDefault(); setOver(`mod:${m.id}`); } else if (drag.current?.kind === "act") { e.preventDefault(); setOver(`modend:${m.id}`); } }}
              onDrop={(e: React.DragEvent) => { if (drag.current?.kind === "mod") { e.preventDefault(); moveMod(drag.current.id, mi); drag.current = null; setOver(null); } else onDropAct(e, m.id, null); }}>
              <div className="flex items-center gap-1.5 border-b border-border p-2">
                <span draggable onDragStart={(e) => { drag.current = { kind: "mod", id: m.id }; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", m.id); }} onDragEnd={() => { drag.current = null; setOver(null); }} className="cursor-grab p-1 text-text-2" aria-hidden title="Drag to reorder module"><DotsSixVertical size={18} /></span>
                <Button variant="ghost" size="iconSm" aria-label={closed ? "Expand module" : "Collapse module"} aria-expanded={!closed} onClick={() => setCollapsed((c) => ({ ...c, [m.id]: !c[m.id] }))}>{closed ? <CaretRight size={16} /> : <CaretDown size={16} />}</Button>
                <Input aria-label={`Module ${mi + 1} title`} aria-invalid={!m.title.trim()} className="h-9 flex-1 font-semibold" value={m.title} onChange={(e) => edit((o) => o.map((x) => (x.id === m.id ? { ...x, title: e.target.value } : x)))} />
                <Badge className="hidden sm:inline-flex">{m.activities.length} items · {m.activities.reduce((a, x) => a + x.estimatedMinutes, 0)} min</Badge>
                <Button variant="ghost" size="iconSm" aria-label="Move module up" disabled={mi === 0} onClick={() => stepMod(m.id, -1)}><ArrowUp size={16} /></Button>
                <Button variant="ghost" size="iconSm" aria-label="Move module down" disabled={mi === outline.length - 1} onClick={() => stepMod(m.id, 1)}><ArrowDown size={16} /></Button>
                <Button variant="ghost" size="iconSm" aria-label="Duplicate module" onClick={() => edit((o) => { const c = { ...structuredClone(m), id: uid("mod"), title: `${m.title} (copy)` }; c.activities = c.activities.map((a: LearningActivity) => ({ ...a, id: uid("act"), moduleId: c.id })); return [...o.slice(0, mi + 1), c, ...o.slice(mi + 1)]; })}><Copy size={16} /></Button>
                <Button variant="ghost" size="iconSm" aria-label="Delete module" onClick={() => setConfirm({ kind: "mod", id: m.id, label: m.title || "this module" })}><Trash size={16} className="text-danger" /></Button>
              </div>
              {!closed && (
                <CardBody className="space-y-1.5 p-2 sm:p-3">
                  {!m.activities.length && <div className={cn("rounded-xl border border-dashed p-4 text-center text-sm text-text-2", over === `modend:${m.id}` ? "border-primary bg-lilac" : "border-border")}>Empty module — drop an activity here or pick one from the library.</div>}
                  {m.activities.map((a, ai) => {
                    const b = blockOf(a); const iss = issueFor(a.id);
                    return (
                      <div key={a.id}>
                        {insertAt?.moduleId === m.id && insertAt.index === ai && <InsertMarker onCancel={() => setInsertAt(null)} />}
                        <div draggable onDragStart={(e) => { drag.current = { kind: "act", id: a.id }; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", a.id); }} onDragEnd={() => { drag.current = null; setOver(null); }}
                          onDragOver={(e) => { if (drag.current?.kind === "act") { e.preventDefault(); e.stopPropagation(); setOver(`act:${a.id}`); } }} onDrop={(e) => onDropAct(e, m.id, ai)}
                          className={cn("flex flex-wrap items-center gap-1.5 rounded-xl border p-2 text-sm", sel === a.id ? "border-primary bg-lilac/50" : "border-border bg-surface", over === `act:${a.id}` && "border-t-4 border-t-primary", isHidden(a) && "opacity-60")}>
                          <span className="cursor-grab p-0.5 text-text-2" aria-hidden><DotsSixVertical size={16} /></span>
                          <button onClick={() => setSel(a.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-label={`Edit ${a.title || "untitled activity"}`}>
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-lilac text-primary"><Icon name={b.icon} size={16} /></span>
                            <span className="min-w-0"><span className="block truncate font-semibold">{a.title || <em className="text-danger">Untitled</em>}</span>
                              <span className="flex flex-wrap items-center gap-1 text-xs text-text-2">{b.label} · <span className="tnum">{a.estimatedMinutes} min</span> · {a.mandatory ? "Mandatory" : "Optional"}{a.checkpointMode ? ` · ${a.checkpointMode}` : ""}{isHidden(a) && <Badge tone="warning">Hidden</Badge>}{iss && <Badge tone={iss.level === "error" ? "danger" : "warning"}>{iss.level === "error" ? "Fix required" : "Check"}</Badge>}</span></span>
                          </button>
                          <div className="flex items-center">
                            <Button variant="ghost" size="iconSm" aria-label="Move up" onClick={() => stepAct(a.id, -1)}><ArrowUp size={14} /></Button>
                            <Button variant="ghost" size="iconSm" aria-label="Move down" onClick={() => stepAct(a.id, 1)}><ArrowDown size={14} /></Button>
                            <Button variant="ghost" size="iconSm" aria-label="Insert activity above" onClick={() => setInsertAt({ moduleId: m.id, index: ai })}><ArrowLineUp size={14} /></Button>
                            <Button variant="ghost" size="iconSm" aria-label="Insert activity below" onClick={() => setInsertAt({ moduleId: m.id, index: ai + 1 })}><ArrowLineDown size={14} /></Button>
                            <Button variant="ghost" size="iconSm" aria-label="Duplicate" onClick={() => dupAct(a)}><Copy size={14} /></Button>
                            <Button variant="ghost" size="iconSm" aria-label="Preview" onClick={() => setPreview(a)}><Eye size={14} /></Button>
                            <Button variant="ghost" size="iconSm" aria-label={isHidden(a) ? "Show to students" : "Hide from students"} onClick={() => patchAct(a.id, { payload: { ...a.payload, hidden: !isHidden(a) } })}>{isHidden(a) ? <EyeSlash size={14} /> : <Eye size={14} className="opacity-40" />}</Button>
                            <Button variant="ghost" size="iconSm" aria-label="Delete" onClick={() => setConfirm({ kind: "act", id: a.id, label: a.title || "this activity" })}><Trash size={14} className="text-danger" /></Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {insertAt?.moduleId === m.id && insertAt.index === m.activities.length && m.activities.length > 0 && <InsertMarker onCancel={() => setInsertAt(null)} />}
                  <div className={cn("flex gap-2 pt-1", over === `modend:${m.id}` && "rounded-xl bg-lilac")}><Button size="sm" variant="ghost" onClick={() => setInsertAt({ moduleId: m.id, index: null })}><Plus size={14} />Add activity to end</Button></div>
                </CardBody>
              )}
            </Card>
          );
        })}
        {outline.length > 0 && <Button variant="outline" onClick={addModule}><Plus size={16} />Add module</Button>}
      </div>

      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        {selected ? (
          <Card><CardBody className="max-h-[70vh] overflow-y-auto"><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold">Activity settings</h2><Button size="sm" variant="ghost" onClick={() => setSel(null)}>Close</Button></div><Inspector a={selected} outline={outline} subjectId={subjectId} onChange={(p) => patchAct(selected.id, p)} />
            <div className="mt-3"><label htmlFor="mv" className="text-xs font-semibold text-text-2">Move to module</label><select id="mv" className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-2 text-sm" value={outline[posOf(selected.id)?.mi ?? 0]?.id} onChange={(e) => moveAct(selected.id, e.target.value, null)}>{outline.map((m) => <option key={m.id} value={m.id}>{m.title || "Untitled module"}</option>)}</select></div></CardBody></Card>
        ) : null}
        <Card><CardBody>
          <h2 className="text-sm font-bold">Activity library</h2>
          <p className="mb-2 text-xs text-text-2" aria-live="polite">{insertAt ? `Inserting ${insertAt.index === null ? "at end of" : `at position ${insertAt.index + 1} in`} “${outline.find((m) => m.id === insertAt.moduleId)?.title}”` : sel ? "Inserts after the selected activity." : "Inserts at the end of the last module."}</p>
          <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {GROUPS.map((g) => <div key={g}><p className="mb-1 text-xs font-bold text-text-2">{g}</p><div className="grid grid-cols-2 gap-1.5">{BLOCKS.filter((b) => b.group === g).map((b) => <button key={b.kind} onClick={() => insert(b.kind)} title={b.hint} className="flex items-center gap-1.5 rounded-lg border border-border p-2 text-left text-xs font-medium hover:border-primary hover:bg-lilac/40"><Icon name={b.icon} size={14} className="shrink-0 text-primary" /><span className="leading-tight">{b.label}</span></button>)}</div></div>)}
          </div>
        </CardBody></Card>
      </aside>

      <ConfirmDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)} destructive title={confirm?.kind === "mod" ? "Delete module?" : "Delete activity?"} body={confirm?.kind === "mod" ? `“${confirm?.label}” and every activity in it will be removed from this draft. Save to apply.` : `“${confirm?.label}” will be removed from this draft. Save to apply.`} confirmLabel="Delete"
        onConfirm={() => { if (!confirm) return; if (confirm.kind === "mod") edit((o) => o.filter((m) => m.id !== confirm.id)); else { edit((o) => o.map((m) => ({ ...m, activities: m.activities.filter((a) => a.id !== confirm.id) }))); if (sel === confirm.id) setSel(null); } toast.info("Deleted from draft"); }} />
      <Modal open={!!preview} onOpenChange={(v) => !v && setPreview(null)} title="Activity preview" description="How a student sees this activity">{preview && <ActivityView a={preview} />}</Modal>
    </div>
  );
}
function InsertMarker({ onCancel }: { onCancel: () => void }) {
  return <div className="my-1 flex items-center gap-2 rounded-lg bg-lilac px-2 py-1 text-xs font-semibold text-primary"><Plus size={12} />New activity goes here — choose from the library<Button size="sm" variant="ghost" className="ml-auto h-6" onClick={onCancel}>Cancel</Button></div>;
}
