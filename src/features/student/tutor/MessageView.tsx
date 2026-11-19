"use client";
import { useState } from "react";
import Link from "next/link";
import { CaretDown, CaretRight, FileText, Image as ImageIcon, UserCircle, BookOpenText, Info, MusicNote, VideoCamera, Translate } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { AIBadge, Badge, Button, cn } from "@/components/ui";
import type { TutorMessage, TutorPreferences } from "@/types/tutor";
import { TutorAvatar } from "../components/TutorAvatar";
import { PracticeBlock } from "./PracticeBlock";

const attIcon = { image: ImageIcon, doc: FileText, audio: MusicNote, video: VideoCamera } as const;

function StepList({ steps, stepMode }: { steps: string[]; stepMode?: boolean }) {
  const [shown, setShown] = useState(stepMode ? 1 : steps.length);
  return (
    <div className="rounded-2xl bg-surface-2 p-3.5">
      <p className="text-label mb-2 text-text-2">{stepMode ? "Step by step" : "Steps"}</p>
      <ol className="space-y-2">
        {steps.slice(0, shown).map((s, i) => (
          <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2.5 text-sm">
            <span className="tnum flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-fg">{i + 1}</span><span className="pt-0.5">{s}</span>
          </motion.li>
        ))}
      </ol>
      {shown < steps.length && <div className="mt-2.5 flex gap-2"><Button size="sm" onClick={() => setShown((v) => v + 1)}>Next step<CaretRight size={14} weight="bold" /></Button><Button size="sm" variant="ghost" onClick={() => setShown(steps.length)}>Show all {steps.length} steps</Button></div>}
    </div>
  );
}

export function UserBubble({ m }: { m: TutorMessage }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
      <div className="max-w-[88%] space-y-2 rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-primary-fg">
        {m.attachments?.map((a) => { const Ic = attIcon[a.kind]; return (
          <div key={a.id} className="rounded-2xl bg-white/15 p-2">
            {a.mock ? <div className="mb-1.5 flex h-24 items-center justify-center rounded-xl bg-white/90 px-3 text-center text-sm text-[#202333]" style={{ fontFamily: a.mock === "handwritten-maths" ? "cursive" : undefined }}>{a.mock === "handwritten-maths" ? "2x + 3 = 11  →  2x = 14  →  x = 7" : "Adding unlike fractions · Example 1: 1/4 + 2/3 = 11/12"}</div> : null}
            <span className="inline-flex items-center gap-1.5 text-xs font-medium"><Ic size={14} />{a.name}</span>
          </div>); })}
        {m.text && <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{m.text}</p>}
      </div>
    </motion.div>
  );
}

export function TutorBubble({ m, prefs, onSuggest, onAskTeacher, onLang }: { m: TutorMessage; prefs: TutorPreferences; onSuggest: (s: string) => void; onAskTeacher: () => void; onLang?: (l: string) => void }) {
  const [more, setMore] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
      <TutorAvatar avatarId={prefs.avatarId} size={34} className="mt-0.5" />
      <div className="min-w-0 max-w-[92%] flex-1 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{prefs.name}</span><AIBadge label="AI Tutor" />{m.lang && m.lang !== "English" && <Badge icon={<Translate size={12} />}>{m.lang}</Badge>}</div>
        <div className={cn("rounded-3xl rounded-tl-lg border px-4 py-3", m.notFound ? "border-warning/40 bg-warning-soft" : "border-border bg-surface shadow-soft")}>
          {m.notFound && <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-warning"><Info size={14} weight="fill" />Not found in your selected source</p>}
          <p className="text-[15px] font-medium leading-relaxed">{m.text}</p>
        </div>
        {m.steps && <StepList steps={m.steps} stepMode={m.stepMode} />}
        {m.explanation && (
          <div>
            <button type="button" aria-expanded={more} onClick={() => setMore((v) => !v)} className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><CaretDown size={14} weight="bold" className={cn("transition-transform", more && "rotate-180")} />{more ? "Hide explanation" : "Explain more"}</button>
            {more && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-1.5 rounded-2xl bg-lilac p-3 text-sm leading-relaxed text-text-2">{m.explanation}</motion.p>}
          </div>
        )}
        {m.practice && <PracticeBlock questions={m.practice} />}
        {m.sources && m.sources.length > 0 && (
          <div className="rounded-2xl border border-border p-3"><p className="text-label mb-1.5 flex items-center gap-1 text-text-2"><BookOpenText size={13} />Where this comes from</p>
            <ul className="space-y-1">{m.sources.map((s) => <li key={s.label} className="text-sm">{s.href ? <Link href={s.href} className="font-medium text-primary hover:underline">{s.label}</Link> : <span className="font-medium">{s.label}</span>}<span className="ml-1.5 text-xs text-text-2">{s.kind}</span></li>)}</ul></div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {m.suggestions?.map((s) => <button key={s} type="button" onClick={() => (s === "Say it in Hindi" ? onLang?.("Hindi") : s === "Switch back to English" ? onLang?.("English") : onSuggest(s))} className="min-h-9 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-text-2 hover:border-primary hover:text-primary">{s}</button>)}
          <button type="button" onClick={onAskTeacher} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-lilac px-3 text-xs font-semibold text-primary hover:bg-lavender/40"><UserCircle size={14} weight="fill" />Ask my teacher</button>
        </div>
        <p className="text-[11px] text-text-2">Demo response — no real AI model was called.</p>
      </div>
    </motion.div>
  );
}
