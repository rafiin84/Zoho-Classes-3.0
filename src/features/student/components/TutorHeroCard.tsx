"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUp, ChatCircleDots, Camera, NotePencil, Lightning, UserCircle } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { AIBadge } from "@/components/ui";
import { tutorService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { DEFAULT_TUTOR_PREFS } from "@/lib/mock-data/tutor";
import { studentKeys } from "../keys";
import { TutorAvatar } from "./TutorAvatar";

const ACTIONS = [
  { label: "Ask a doubt", icon: ChatCircleDots, href: "/student/tutor?mode=ask" },
  { label: "Explain a photo", icon: Camera, href: "/student/tutor?mode=photo" },
  { label: "Help with homework", icon: NotePencil, href: "/student/tutor?mode=homework" },
  { label: "Practise a topic", icon: Lightning, href: "/student/tutor?mode=practice" },
];
export function TutorHeroCard({ hint }: { hint?: string }) {
  const router = useRouter(); const { studentId } = useActors();
  const { data } = useQuery({ queryKey: [...studentKeys.tutorPrefs, studentId], queryFn: () => tutorService.preferences(studentId) });
  const p = data ?? DEFAULT_TUTOR_PREFS; const [q, setQ] = useState("");
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 220, damping: 26 }} aria-label="Your AI Tutor"
      className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-primary via-[#6048e0] to-violet p-5 text-white shadow-glow sm:p-7">
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-14 size-56 rounded-full bg-white/10" />
      <span aria-hidden className="pointer-events-none absolute -bottom-20 right-24 size-48 rounded-full bg-highlight/20 blur-2xl" />
      <div className="relative flex items-start gap-4">
        <TutorAvatar avatarId={p.avatarId} size={56} ring />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="text-sm font-semibold text-white/90">{p.name}</span><AIBadge label="Your AI Tutor" /></div>
          <h2 className="mt-1 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">What would you like to figure out today?</h2>
          {hint && <p className="mt-1 text-sm text-white/80">{hint}</p>}
        </div>
      </div>
      <form className="relative mt-4 flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 text-[#202333] shadow-card" onSubmit={(e) => { e.preventDefault(); router.push(q.trim() ? `/student/tutor?q=${encodeURIComponent(q.trim())}` : "/student/tutor"); }}>
        <label htmlFor="hero-q" className="sr-only">Ask your tutor</label>
        <input id="hero-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything — a doubt, a photo, a topic…" className="h-11 min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-[#687083] focus:outline-none" />
        <button type="submit" aria-label="Ask" className="flex size-11 items-center justify-center rounded-full bg-primary text-white"><ArrowUp size={20} weight="bold" /></button>
      </form>
      <div className="relative mt-3 flex flex-wrap gap-2">
        {ACTIONS.map((a) => <Link key={a.label} href={a.href} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/25"><a.icon size={16} weight="fill" />{a.label}</Link>)}
      </div>
      <p className="relative mt-3 flex items-center gap-1.5 text-xs text-white/75"><UserCircle size={14} weight="fill" />Prefer a person? <Link href="/student/doubts?ask=1" className="font-semibold underline underline-offset-2">Ask my teacher</Link> any time.</p>
    </motion.section>
  );
}
