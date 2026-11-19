"use client";
import { useEffect, useRef, useState } from "react";
import { DotsThree, Info, BookmarkSimple, EyeSlash, X } from "@phosphor-icons/react";
import { Button, cn, toast } from "@/components/ui";
import { ContentCard } from "../components/ContentCard";
import { useRecState, type Rec } from "./data";

/** Recommendation card with "Why am I seeing this?" + save / not interested / dismiss. */
export function RecCard({ rec, studentId }: { rec: Rec; studentId: string }) {
  const [open, setOpen] = useState(false); const [why, setWhy] = useState(false);
  const act = useRecState((s) => s.act); const saved = useRecState((s) => (s.saved[studentId] ?? []).includes(rec.id));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setWhy(false); } };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setWhy(false); } };
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k); return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open]);
  const dismiss = (msg: string) => { act(studentId, rec.id, "dismiss"); toast.info(msg); };
  return (
    <div className="relative shrink-0" ref={ref}>
      <ContentCard href={rec.href} cover={rec.cover} eyebrow={rec.kind === "remedial" ? "Recovery plan" : rec.kind} title={rec.title} meta={rec.meta} badge={rec.badge ? { label: rec.badge, tone: rec.badge === "Start here" || rec.badge === "Your plan" ? "primary" : rec.badge === "Paid" ? "highlight" : "success" } : undefined}
        overlay={<button type="button" aria-label={`More options for ${rec.title}`} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex size-9 items-center justify-center rounded-full bg-surface/90 text-text shadow-soft backdrop-blur hover:bg-surface"><DotsThree size={20} weight="bold" /></button>} />
      {open && (
        <div role="menu" className="absolute right-2 top-12 z-30 w-64 rounded-2xl border border-border bg-surface p-1.5 shadow-glow">
          {!why ? (<>
            <button role="menuitem" type="button" onClick={() => setWhy(true)} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium hover:bg-surface-2"><Info size={18} className="text-primary" />Why am I seeing this?</button>
            <button role="menuitem" type="button" onClick={() => { act(studentId, rec.id, saved ? "unsave" : "save"); toast.success(saved ? "Removed from saved" : "Saved for later"); setOpen(false); }} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium hover:bg-surface-2"><BookmarkSimple size={18} weight={saved ? "fill" : "regular"} className="text-primary" />{saved ? "Saved — tap to unsave" : "Save for later"}</button>
            <button role="menuitem" type="button" onClick={() => dismiss("Got it — we’ll show fewer like this")} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium hover:bg-surface-2"><EyeSlash size={18} className="text-primary" />Not interested</button>
            <button role="menuitem" type="button" onClick={() => dismiss("Hidden for now")} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium hover:bg-surface-2"><X size={18} className="text-primary" />Dismiss</button>
          </>) : (
            <div className="space-y-2 p-2.5" role="dialog" aria-label="Why you’re seeing this">
              <p className="text-sm font-bold">Why am I seeing this?</p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-text-2">{rec.why.map((w) => <li key={w}>{w}</li>)}</ul>
              <p className="text-xs text-text-2">Recommendations use your school work and interests only. You’re always in control.</p>
              <Button size="sm" variant="soft" onClick={() => setWhy(false)}>Back</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
