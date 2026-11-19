"use client";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ShieldCheck, UserSwitch } from "@phosphor-icons/react";
import { Modal, Button, Field, Input, Select, Switch, Segmented, cn, toast } from "@/components/ui";
import { tutorService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { TUTOR_AVATARS, TUTOR_LANGUAGES, TUTOR_STYLES, TUTOR_TONES } from "@/lib/mock-data/tutor";
import type { TutorPreferences } from "@/types/tutor";
import { studentKeys } from "../keys";
import { TutorAvatar } from "../components/TutorAvatar";

export function PersonaliseSheet({ open, onOpenChange, prefs }: { open: boolean; onOpenChange: (v: boolean) => void; prefs: TutorPreferences }) {
  const { studentId } = useActors(); const qc = useQueryClient();
  const [d, setD] = useState(prefs);
  useEffect(() => { if (open) setD(prefs); }, [open, prefs]);
  const save = useMutation({ mutationFn: () => tutorService.savePreferences(studentId, { ...d, name: d.name.trim() || "Sage" }), onSuccess: () => { qc.invalidateQueries({ queryKey: studentKeys.tutorPrefs }); toast.success(`${d.name.trim() || "Sage"} is ready — tuned to you`); onOpenChange(false); } });
  const set = <K extends keyof TutorPreferences>(k: K, v: TutorPreferences[K]) => setD((x) => ({ ...x, [k]: v }));
  const tone = TUTOR_TONES.find((t) => t.id === d.tone)!;
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Make your tutor yours" description="Name, look, tone and how it explains things." className="sm:max-w-xl"
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save preferences</Button></>}>
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-lilac p-3.5 text-sm"><UserSwitch size={22} weight="duotone" className="mt-0.5 shrink-0 text-primary" /><div><p className="font-semibold">Personal preference, not a school record</p><p className="text-text-2">These choices belong to you and travel with you — even if you change schools. Your teachers never see them, and they don’t affect marks or your academic record.</p></div></div>
        <Field label="Tutor name" htmlFor="tn" hint="Anything friendly — up to 20 characters."><Input id="tn" maxLength={20} value={d.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <div><p className="mb-2 text-sm font-semibold">Avatar</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Tutor avatar">
            {TUTOR_AVATARS.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={d.avatarId === a.id} onClick={() => set("avatarId", a.id)} className={cn("relative flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-xs font-semibold", d.avatarId === a.id ? "border-primary bg-lilac" : "border-border hover:bg-surface-2")}>
                <TutorAvatar avatarId={a.id} size={44} />{a.label}{d.avatarId === a.id && <Check size={14} weight="bold" className="absolute right-1.5 top-1.5 text-primary" />}
              </button>))}
          </div></div>
        <div><p className="mb-2 text-sm font-semibold">Tone</p><div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tone">{TUTOR_TONES.map((t) => <button key={t.id} type="button" role="radio" aria-checked={d.tone === t.id} onClick={() => set("tone", t.id)} className={cn("min-h-9 rounded-full border px-3.5 text-sm font-semibold", d.tone === t.id ? "border-primary bg-primary text-primary-fg" : "border-border text-text-2 hover:bg-surface-2")}>{t.label}</button>)}</div>
          <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm italic text-text-2">“{tone.sample}”</p></div>
        <div><p className="mb-2 text-sm font-semibold">How should it explain?</p><div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Explanation style">{TUTOR_STYLES.map((t) => <button key={t.id} type="button" role="radio" aria-checked={d.style === t.id} onClick={() => set("style", t.id)} title={t.hint} className={cn("min-h-9 rounded-full border px-3.5 text-sm font-semibold", d.style === t.id ? "border-primary bg-primary text-primary-fg" : "border-border text-text-2 hover:bg-surface-2")}>{t.label}</button>)}</div>
          <p className="mt-1.5 text-xs text-text-2">{TUTOR_STYLES.find((s) => s.id === d.style)?.hint}</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Language" htmlFor="tl"><Select id="tl" value={d.language} onChange={(e) => set("language", e.target.value)}>{TUTOR_LANGUAGES.map((l) => <option key={l}>{l}</option>)}</Select></Field>
          <div><p className="mb-2 text-sm font-semibold">Pace</p><Segmented label="Pace" value={d.pace} onChange={(v) => set("pace", v)} options={[{ value: "relaxed", label: "Relaxed" }, { value: "steady", label: "Steady" }, { value: "quick", label: "Quick" }]} /></div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3.5"><div><p className="text-sm font-semibold">Read answers aloud</p><p className="text-xs text-text-2">Voice output preview — available in a later release.</p></div><Switch checked={d.voice} onChange={(v) => set("voice", v)} label="Read answers aloud" /></div>
        <p className="flex items-center gap-2 text-xs text-text-2"><ShieldCheck size={16} className="text-success" />Your tutor never replaces your teacher — “Ask my teacher” is always one tap away.</p>
      </div>
    </Modal>
  );
}
