"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Fire, GraduationCap, House, Newspaper, Path, Sparkle, ShieldCheck, Lightning, Heart } from "@phosphor-icons/react";
import { Button, Field, Input, Select, Switch, Progress, Badge, cn, toast } from "@/components/ui";
import { tutorService } from "@/lib/api";
import { useActors, useApp } from "@/stores/app-store";
import { CLASSROOMS, GRADES, INSTITUTIONS } from "@/lib/mock-data/core";
import { DEFAULT_TUTOR_PREFS, TUTOR_AVATARS, TUTOR_LANGUAGES, TUTOR_STYLES, TUTOR_TONES } from "@/lib/mock-data/tutor";
import type { ScreenProps } from "@/types/screens";
import type { TutorPreferences } from "@/types/tutor";
import { useStudentRecord } from "../hooks";
import { TutorAvatar } from "../components/TutorAvatar";
import { WeekDots } from "../components/StreakWidget";

const schema = z.object({ gradeId: z.string().min(1, "Choose your grade"), classId: z.string().min(1, "Choose your class"), tutorName: z.string().trim().min(1, "Give your tutor a name").max(20, "20 characters or fewer") });
type F = z.infer<typeof schema>;
const STEPS = ["Welcome", "Your class", "Your tutor", "Style", "Daily habit", "Community", "Quick tour", "Ready"];
const TOUR = [
  { icon: House, t: "Home", d: "Your day at a glance: a daily challenge, what to continue, and what’s on at school.", try: "Tap the card to see how Home highlights your next step" },
  { icon: Path, t: "Learn", d: "A path that bends around you. Gaps get a gentle detour, strengths get a stretch.", try: "Tap a node — they open details and your next action" },
  { icon: Sparkle, t: "AI Tutor", d: "Ask anything, snap a photo of your work. Teachers are always one tap away too.", try: "Tap ‘Ask my teacher’ — a person always answers" },
  { icon: Newspaper, t: "Feed & Play", d: "School news, clubs, games and competitions — shared kindly, moderated by your school.", try: "Tap a reaction to try it out" },
];

export default function OnboardingScreen({ searchParams }: ScreenProps) {
  const router = useRouter(); const { studentId } = useActors(); const student = useStudentRecord(); const complete = useApp((s) => s.completeOnboarding);
  const replay = !!searchParams.replay;
  const [step, setStep] = useState(replay ? 6 : 0); const [avatar, setAvatar] = useState(DEFAULT_TUTOR_PREFS.avatarId);
  const [tone, setTone] = useState<TutorPreferences["tone"]>("friendly"); const [style, setStyle] = useState<TutorPreferences["style"]>("simple"); const [lang, setLang] = useState(student.preferredLanguage || "English");
  const [reminder, setReminder] = useState(true); const [feedVis, setFeedVis] = useState(true); const [classOnly, setClassOnly] = useState(true); const [tour, setTour] = useState(0); const [tried, setTried] = useState<number[]>([]); const [saving, setSaving] = useState(false);
  const form = useForm<F>({ resolver: zodResolver(schema), defaultValues: { gradeId: student.gradeId, classId: student.classId, tutorName: DEFAULT_TUTOR_PREFS.name }, mode: "onTouched" });
  const name = form.watch("tutorName") || "Sage"; const inst = INSTITUTIONS.find((i) => i.id === student.institutionId);
  const isNew = student.status === "pending-baseline";
  const go = async (n: number) => { if (step === 1 && n > step && !(await form.trigger(["gradeId", "classId"]))) return; if (step === 2 && n > step && !(await form.trigger("tutorName"))) return; setStep(n); };
  const finish = async (href: string) => {
    setSaving(true);
    try { if (!replay) await tutorService.savePreferences(studentId, { ...DEFAULT_TUTOR_PREFS, name: form.getValues("tutorName").trim() || "Sage", avatarId: avatar, tone, style, language: lang }); complete("student", true); toast.success(replay ? "Tour finished" : "You’re all set"); router.push(href); }
    catch { toast.error("Couldn’t save just now — try again."); setSaving(false); }
  };
  const Chip = ({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) => <button type="button" aria-pressed={on} onClick={onClick} className={cn("min-h-10 rounded-full border px-4 text-sm font-semibold", on ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface text-text-2 hover:bg-surface-2")}>{children}</button>;
  const next = () => go(step + 1); const back = () => setStep(step - 1);

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-2">
      <div className="flex items-center gap-3"><Progress value={((step + 1) / STEPS.length) * 100} className="flex-1" size="sm" label="Setup progress" /><span className="tnum text-xs font-semibold text-text-2">{step + 1}/{STEPS.length} · {STEPS[step]}</span></div>
      <AnimatePresence mode="wait">
        <motion.section key={step} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="space-y-5 rounded-[1.75rem] border border-border bg-surface p-6 shadow-card sm:p-8" aria-live="polite">
          {step === 0 && <div className="space-y-4 text-center"><motion.span initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} className="mx-auto flex size-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-primary to-violet text-white shadow-glow"><GraduationCap size={40} weight="fill" /></motion.span><h1 className="text-display">Hi {student.displayName.split(" ")[0]}, welcome!</h1><p className="mx-auto max-w-md text-text-2">This is your learning space: a personal AI Tutor, bite-sized daily practice, your courses and your school community. Setup takes about a minute, and you can change everything later.</p></div>}
          {step === 1 && <div className="space-y-4"><div><h2 className="text-heading">Where do you learn?</h2><p className="text-sm text-text-2">We found you from your school record. Check it looks right.</p></div>
            <div className="rounded-2xl bg-lilac p-3 text-sm"><p className="font-semibold">{inst?.name}</p><p className="text-text-2">Academic year 2026–27</p></div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Grade" htmlFor="ob-grade" error={form.formState.errors.gradeId?.message}><Select id="ob-grade" {...form.register("gradeId")}>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</Select></Field>
              <Field label="Class" htmlFor="ob-class" error={form.formState.errors.classId?.message}><Select id="ob-class" {...form.register("classId")}>{CLASSROOMS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field></div></div>}
          {step === 2 && <div className="space-y-5"><div className="flex items-center gap-4"><TutorAvatar avatarId={avatar} size={72} /><div><h2 className="text-heading">Meet your AI Tutor</h2><p className="text-sm text-text-2">Your personal helper — separate from the teachers at your school. Name it and pick a look.</p></div></div>
            <Field label="Tutor name" htmlFor="ob-name" error={form.formState.errors.tutorName?.message}><Input id="ob-name" maxLength={20} aria-invalid={!!form.formState.errors.tutorName} {...form.register("tutorName")} /></Field>
            <div role="radiogroup" aria-label="Tutor avatar" className="grid grid-cols-3 gap-2 sm:grid-cols-6">{TUTOR_AVATARS.map((a) => <button key={a.id} type="button" role="radio" aria-checked={avatar === a.id} onClick={() => setAvatar(a.id)} className={cn("relative flex flex-col items-center gap-1 rounded-2xl border p-2 text-xs font-semibold", avatar === a.id ? "border-primary bg-lilac" : "border-border")}><TutorAvatar avatarId={a.id} size={44} />{a.label}{avatar === a.id && <Check size={12} weight="bold" className="absolute right-1.5 top-1.5 text-primary" />}</button>)}</div>
            <p className="rounded-2xl bg-surface-2 p-3 text-sm"><span className="font-semibold">{name}:</span> “Hi! I’m {name}. What would you like to figure out today?”</p></div>}
          {step === 3 && <div className="space-y-5"><div><h2 className="text-heading">How should {name} talk to you?</h2><p className="text-sm text-text-2">Personal preferences — they stay with you, even if you change schools, and teachers never see them.</p></div>
            <div><p className="mb-2 text-sm font-semibold">Language</p><div className="flex flex-wrap gap-2">{TUTOR_LANGUAGES.map((l) => <Chip key={l} on={lang === l} onClick={() => setLang(l)}>{l}</Chip>)}</div></div>
            <div><p className="mb-2 text-sm font-semibold">Explanation style</p><div className="flex flex-wrap gap-2">{TUTOR_STYLES.map((s) => <Chip key={s.id} on={style === s.id} onClick={() => setStyle(s.id)}>{s.label}</Chip>)}</div><p className="mt-1.5 text-xs text-text-2">{TUTOR_STYLES.find((s) => s.id === style)?.hint}</p></div>
            <div><p className="mb-2 text-sm font-semibold">Tone</p><div className="flex flex-wrap gap-2">{TUTOR_TONES.map((t) => <Chip key={t.id} on={tone === t.id} onClick={() => setTone(t.id)}>{t.label}</Chip>)}</div><p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm italic text-text-2">“{TUTOR_TONES.find((t) => t.id === tone)?.sample}”</p></div></div>}
          {step === 4 && <div className="space-y-4"><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-highlight-soft text-warning"><Fire size={26} weight="fill" /></span><div><h2 className="text-heading">Five minutes a day</h2><p className="text-sm text-text-2">Short, friendly practice that builds up over time.</p></div></div>
            <ul className="space-y-2 text-sm"><li className="flex gap-2"><Lightning size={18} weight="fill" className="mt-0.5 shrink-0 text-primary" />A daily challenge takes about five minutes and adapts to you.</li><li className="flex gap-2"><Fire size={18} weight="fill" className="mt-0.5 shrink-0 text-primary" />Each day you practise, your streak grows. It’s a celebration, not a test.</li><li className="flex gap-2"><Heart size={18} weight="fill" className="mt-0.5 shrink-0 text-primary" />Missed a day? Nothing bad happens — you get free recoveries and your best streak is always kept.</li></ul>
            <div className="rounded-2xl bg-lilac p-4"><WeekDots weekDays={[true, true, false, true, false, false, false]} /></div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3.5"><div><p className="text-sm font-semibold">One gentle daily reminder</p><p className="text-xs text-text-2">Around 5:30 PM. Turn it off anytime.</p></div><Switch checked={reminder} onChange={setReminder} label="Daily reminder" /></div></div>}
          {step === 5 && <div className="space-y-4"><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-lilac text-primary"><ShieldCheck size={26} weight="fill" /></span><div><h2 className="text-heading">Your community, your comfort</h2><p className="text-sm text-text-2">Posts are age-appropriate and moderated by your school.</p></div></div>
            <div className="space-y-2.5">{[{ l: "Show the school & class feed", d: "See announcements, clubs and achievements.", v: feedVis, f: setFeedVis }, { l: "Only interact within my class and clubs", d: "Comments and reactions stay inside groups you belong to.", v: classOnly, f: setClassOnly }].map((r) => <div key={r.l} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3.5"><div><p className="text-sm font-semibold">{r.l}</p><p className="text-xs text-text-2">{r.d}</p></div><Switch checked={r.v} onChange={r.f} label={r.l} /></div>)}</div>
            <p className="text-xs text-text-2">Posts you write are checked by a teacher before others see them. You can report anything, any time. Parents can see what the school shares about you.</p></div>}
          {step === 6 && <div className="space-y-4"><div className="flex items-center justify-between"><div><h2 className="text-heading">A quick look around</h2><p className="text-sm text-text-2">Try each one — about 30 seconds.</p></div><Badge>{tried.length}/{TOUR.length} tried</Badge></div>
            <div className="flex gap-1.5" role="tablist" aria-label="Tour stops">{TOUR.map((t, i) => <button key={t.t} role="tab" aria-selected={tour === i} onClick={() => setTour(i)} className={cn("flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full text-xs font-semibold", tour === i ? "bg-primary text-primary-fg" : "bg-surface-2 text-text-2")}>{tried.includes(i) ? <Check size={14} weight="bold" /> : <t.icon size={16} />}<span className="hidden sm:inline">{t.t}</span></button>)}</div>
            {(() => { const T = TOUR[tour]; return <motion.div key={tour} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl bg-surface-2 p-5"><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-lilac text-primary"><T.icon size={26} weight="fill" /></span><h3 className="text-lg font-bold">{T.t}</h3></div><p className="text-sm text-text-2">{T.d}</p>
              <button type="button" onClick={() => { setTried((x) => (x.includes(tour) ? x : [...x, tour])); toast.info("Nice — that’s how it works!"); }} className={cn("w-full rounded-2xl border-2 border-dashed p-4 text-sm font-semibold transition-colors", tried.includes(tour) ? "border-success bg-success-soft text-success" : "border-primary/50 bg-surface text-primary hover:bg-lilac")}>{tried.includes(tour) ? "Got it ✓" : T.try}</button>
              <div className="flex justify-between"><Button variant="ghost" size="sm" disabled={tour === 0} onClick={() => setTour(tour - 1)}>Previous stop</Button><Button size="sm" variant="soft" disabled={tour === TOUR.length - 1} onClick={() => setTour(tour + 1)}>Next stop</Button></div></motion.div>; })()}
            <p className="text-xs text-text-2">You can replay this tour anytime from You → Settings, or open /student/onboarding?replay=1.</p></div>}
          {step === 7 && <div className="space-y-4 text-center"><motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="mx-auto flex size-20 items-center justify-center rounded-[1.75rem] bg-success-soft text-success"><Check size={40} weight="bold" /></motion.span><h2 className="text-display">You’re all set</h2><p className="mx-auto max-w-md text-text-2">{name} is ready. Here’s one small thing to start with — whenever you like.</p>
            <div className="mx-auto max-w-md rounded-2xl bg-lilac p-4 text-left"><p className="text-label text-text-2">Recommended first step</p><p className="mt-1 font-bold">{isNew ? "Starter check-in · about 6 minutes" : "Your first 5-minute challenge"}</p><p className="text-sm text-text-2">{isNew ? "No marks. It simply helps your tutor choose where to begin." : "A few questions that adapt to you — a nice way to begin your streak."}</p></div></div>}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div>{step > 0 && !(replay && step === 6) ? <Button variant="ghost" onClick={back}><ArrowLeft size={16} />Back</Button> : replay ? <Button variant="ghost" asChild><Link href="/student/home">Close tour</Link></Button> : null}</div>
            <div className="flex flex-wrap gap-2">
              {step === 6 && <Button variant="ghost" onClick={() => (replay ? finish("/student/home") : setStep(7))}>Skip tour</Button>}
              {step < 6 && <Button onClick={next}>{step === 0 ? "Let’s begin" : "Continue"}<ArrowRight size={16} weight="bold" /></Button>}
              {step === 6 && <Button onClick={() => (replay ? finish("/student/home") : setStep(7))} disabled={tried.length === 0 && false}>{replay ? "Finish" : "Continue"}<ArrowRight size={16} weight="bold" /></Button>}
              {step === 7 && <><Button variant="outline" loading={saving} onClick={() => finish("/student/home")}><House size={16} />Go to Home</Button><Button loading={saving} onClick={() => finish(isNew ? "/student/micro?topic=baseline" : "/student/micro")}>{isNew ? "Start check-in" : "Start challenge"}<ArrowRight size={16} weight="bold" /></Button></>}
            </div>
          </div>
        </motion.section>
      </AnimatePresence>
      {step < 6 && !replay && <p className="text-center text-sm text-text-2"><button type="button" className="font-semibold text-primary hover:underline" onClick={() => setStep(6)}>Skip to the quick tour</button> · <Link href="/student/home" className="font-semibold hover:underline">Do this later</Link></p>}
    </div>
  );
}
