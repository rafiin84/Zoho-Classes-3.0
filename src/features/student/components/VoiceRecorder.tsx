"use client";
import { useEffect, useState } from "react";
import { Microphone, Stop, Trash } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";

/** Voice input UI with a recording state. No audio is captured — this is a Phase 1 interface demo. */
export function VoiceRecorder({ onDone, onCancel, label = "Recording" }: { onDone: (seconds: number) => void; onCancel: () => void; label?: string }) {
  const [s, setS] = useState(0);
  useEffect(() => { const t = setInterval(() => setS((v) => v + 1), 1000); return () => clearInterval(t); }, []);
  const mm = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-3 py-2">
      <span className="relative flex size-9 items-center justify-center rounded-full bg-danger text-white"><Microphone size={18} weight="fill" /><motion.span aria-hidden className="absolute inset-0 rounded-full border-2 border-danger" animate={{ scale: [1, 1.5], opacity: [0.7, 0] }} transition={{ duration: 1.2, repeat: Infinity }} /></span>
      <div className="flex flex-1 items-end gap-0.5" aria-hidden>
        {Array.from({ length: 22 }).map((_, i) => <motion.span key={i} className="w-1 rounded-full bg-danger/70" animate={{ height: [6, 10 + ((i * 7 + s * 3) % 16), 6] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.04 }} />)}
      </div>
      <span className="tnum text-sm font-semibold text-danger">{label} {mm}</span>
      <Button type="button" size="iconSm" variant="ghost" aria-label="Discard recording" onClick={onCancel}><Trash size={16} /></Button>
      <Button type="button" size="iconSm" variant="danger" aria-label="Stop and attach recording" onClick={() => onDone(Math.max(s, 1))}><Stop size={16} weight="fill" /></Button>
    </div>
  );
}
