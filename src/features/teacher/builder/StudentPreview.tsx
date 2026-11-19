"use client";
import * as React from "react";
import { CheckCircle, Lock, EyeSlash } from "@phosphor-icons/react";
import { Modal, Button, Badge, Cover, Icon, Progress } from "@/components/ui";
import type { LearningActivity } from "@/types";
import { cn } from "@/lib/utils";
import { blockOf, isHidden, type Outline } from "./model";

/** Renders one activity roughly as a student would meet it. Used for single-activity preview and the full preview-as-student. */
export function ActivityView({ a }: { a: LearningActivity }) {
  const b = blockOf(a); const p = (a.payload ?? {}) as Record<string, any>;
  const [pick, setPick] = React.useState<number | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><Badge tone="primary" icon={<Icon name={b.icon} size={12} />}>{b.label}</Badge><Badge>{a.estimatedMinutes} min</Badge>{!a.mandatory && <Badge tone="info">Optional</Badge>}{a.checkpointMode && <Badge tone="highlight">Checkpoint · {a.checkpointMode}</Badge>}</div>
      <h3 className="text-heading">{a.title || "Untitled activity"}</h3>
      {a.instructions && <p className="whitespace-pre-line text-sm text-text-2">{a.instructions}</p>}
      {(a.type === "video" || a.type === "simulation" || a.type === "game") && <Cover from="#5146E5" to="#B8B5FF" className="h-40" icon={<Icon name={b.icon} size={44} />} />}
      {a.type === "mcq" && (
        <div className="space-y-2"><p className="font-semibold">{p.q || "Your question appears here"}</p>
          {(p.options as string[] | undefined)?.map((o, i) => <button key={i} onClick={() => setPick(i)} className={cn("block w-full rounded-xl border p-3 text-left text-sm", pick === i ? (i === p.answer ? "border-success bg-success-soft" : "border-danger bg-danger-soft") : "border-border hover:border-primary")}>{o || `Option ${i + 1}`}{pick === i && <span className="ml-2 text-xs font-semibold">{i === p.answer ? "Correct" : "Not quite"}</span>}</button>)}
          {pick !== null && p.explain && <p className="rounded-xl bg-lilac p-3 text-sm">{p.explain}</p>}</div>
      )}
      {["quiz", "assignment", "assessment", "discussion", "poll"].includes(a.type) && <div className="rounded-xl border border-dashed border-border p-4 text-sm text-text-2">{a.type === "poll" ? "Students vote on options here." : a.type === "discussion" ? "Students post and reply here." : "Students answer or submit their work here."}</div>}
      {(a.type === "teacher-checkpoint" || a.type === "ai-checkpoint") && <div className="rounded-xl bg-highlight-soft p-4 text-sm">{a.type === "ai-checkpoint" ? "An adaptive question tuned to the student's recent answers." : "Pause: a prompt from your teacher."}</div>}
      {a.type === "live-class" && <div className="rounded-xl bg-info-soft p-4 text-sm">Live session — students join from the Live Classes page.</div>}
    </div>
  );
}

export function StudentPreview({ open, onOpenChange, title, outline }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; outline: Outline }) {
  const flat = outline.flatMap((m) => m.activities.filter((a) => !isHidden(a)).map((a) => ({ a, m })));
  const [i, setI] = React.useState(0); const [done, setDone] = React.useState<string[]>([]);
  React.useEffect(() => { if (open) { setI(0); setDone([]); } }, [open]);
  const cur = flat[Math.min(i, flat.length - 1)];
  const hiddenCount = outline.reduce((n, m) => n + m.activities.filter(isHidden).length, 0);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Preview as student" description={`${title} — built from your current edits. After saving, the Student Course Player shows this same sequence.`} className="sm:max-w-3xl">
      {!flat.length ? <p className="text-sm text-text-2">Nothing visible to students yet. Add activities (hidden ones are not shown).</p> : (
        <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
          <nav aria-label="Course outline" className="max-h-72 space-y-3 overflow-y-auto sm:max-h-96">
            <Progress value={(done.length / flat.length) * 100} size="sm" label="Preview progress" />
            {outline.map((m) => <div key={m.id}><p className="mb-1 text-xs font-bold text-text-2">{m.title}</p>
              <ul>{m.activities.filter((a) => !isHidden(a)).map((a) => { const idx = flat.findIndex((x) => x.a.id === a.id); const locked = idx > done.length + 0 && a.mandatory && false; return <li key={a.id}><button disabled={locked} onClick={() => setI(idx)} className={cn("flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs", idx === i ? "bg-lilac font-semibold text-primary" : "hover:bg-surface-2")}>{done.includes(a.id) ? <CheckCircle size={14} weight="fill" className="text-success" /> : locked ? <Lock size={14} /> : <Icon name={blockOf(a).icon} size={14} />}<span className="truncate">{a.title || "Untitled"}</span></button></li>; })}</ul></div>)}
          </nav>
          <div><ActivityView key={cur.a.id} a={cur.a} />
            <div className="mt-4 flex justify-between"><Button variant="ghost" size="sm" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</Button>
              <Button size="sm" onClick={() => { setDone((d) => (d.includes(cur.a.id) ? d : [...d, cur.a.id])); if (i < flat.length - 1) setI(i + 1); }}>{i < flat.length - 1 ? "Mark done & next" : "Finish"}</Button></div>
            {hiddenCount > 0 && <p className="mt-3 flex items-center gap-1 text-xs text-text-2"><EyeSlash size={14} />{hiddenCount} hidden {hiddenCount === 1 ? "activity is" : "activities are"} not shown to students.</p>}
          </div>
        </div>
      )}
    </Modal>
  );
}
