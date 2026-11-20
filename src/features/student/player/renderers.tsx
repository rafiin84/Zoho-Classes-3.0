"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle, Circle, FilePdf, GameController, Lightbulb, Pause, Play, VideoCamera, WarningCircle, ChatsCircle, PaperPlaneRight, ClosedCaptioning, Flask, NotePencil, X, Sparkle } from "@phosphor-icons/react";
import { Badge, Button, Modal, Progress, Select, Textarea, cn } from "@/components/ui";
import { videoFor } from "@/lib/media";
import { MICRO_BANK } from "@/lib/mock-data/micro";
import { ACTIVITY_LABEL, registerRenderer, type RendererProps } from "./registry";

type Mcq = { q: string; options: string[]; answer: number; explain: string };
const payloadMcq = (a: RendererProps["activity"]): Mcq | null => { const p = a.payload as Partial<Mcq> | undefined; return p?.q && p.options ? { q: p.q, options: p.options, answer: p.answer ?? 0, explain: p.explain ?? "" } : null; };
const topicFor = (obj?: string) => obj === "lo-frac-mul" ? "divide" : obj === "lo-eco-chain" || obj === "lo-eco-bal" ? "foodchain" : obj === "lo-alg-lin" ? "linear" : "fractions";
const mcqsFor = (a: RendererProps["activity"], n: number): Mcq[] => { const t = topicFor(a.learningObjectiveIds[0]); return MICRO_BANK.filter((q) => q.topic === t).sort((x, y) => x.difficulty - y.difficulty).slice(0, n); };

const Complete = ({ done, onComplete, label = "Mark as complete" }: { done: boolean; onComplete: () => void; label?: string }) => done ? <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-success"><CheckCircle size={18} weight="fill" />Completed</p> : <Button onClick={onComplete}><CheckCircle size={16} weight="fill" />{label}</Button>;

/* ---------- MCQ block (used by mcq, quiz, assessment, checkpoints) ---------- */
function McqBlock({ q, onAnswer, locked }: { q: Mcq; onAnswer: (ok: boolean) => void; locked?: boolean }) {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div className="space-y-3"><h3 className="text-lg font-semibold leading-snug">{q.q}</h3>
      <div className="space-y-2" role="group" aria-label="Options">{q.options.map((o, i) => { const has = sel !== null; const ans = i === q.answer; return (
        <button key={i} type="button" disabled={has || locked} onClick={() => { setSel(i); onAnswer(i === q.answer); }} className={cn("flex min-h-12 w-full items-center gap-2.5 rounded-2xl border-2 px-4 py-2.5 text-left text-sm font-medium transition-colors", !has && "border-border hover:border-primary hover:bg-lilac", has && ans && "border-success bg-success-soft text-success", has && sel === i && !ans && "border-warning bg-warning-soft text-warning", has && !ans && sel !== i && "border-border opacity-55")}>
          {has && ans ? <CheckCircle size={20} weight="fill" /> : <Circle size={20} />}{o}</button>); })}</div>
      {sel !== null && <p role="status" className="flex gap-2 rounded-2xl bg-lilac p-3 text-sm text-text-2"><Lightbulb size={18} weight="fill" className="shrink-0 text-primary" />{sel === q.answer ? "Nicely done. " : "Good try — "}{q.explain}</p>}
    </div>
  );
}
function Sequence({ qs, onResult, onDone }: { qs: Mcq[]; onResult: (ok: boolean) => void; onDone: (score: number) => void }) {
  const [i, setI] = useState(0); const [score, setScore] = useState(0); const [answered, setAnswered] = useState(false); const [fin, setFin] = useState(false);
  if (fin) return <div className="rounded-2xl bg-lilac p-5 text-center" role="status"><p className="tnum text-3xl font-extrabold">{score}/{qs.length}</p><p className="text-sm text-text-2">{score === qs.length ? "Flawless!" : score >= qs.length / 2 ? "Solid work — review anything you missed." : "That’s useful information — a quick revision will help."}</p></div>;
  return (<div className="space-y-4"><div className="flex items-center gap-3"><Progress value={(i / qs.length) * 100} className="flex-1" size="sm" label="Quiz progress" /><span className="tnum text-xs text-text-2">{i + 1}/{qs.length}</span></div>
    <McqBlock key={i} q={qs[i]} onAnswer={(ok) => { setAnswered(true); onResult(ok); if (ok) setScore((s) => s + 1); }} />
    {answered && <Button onClick={() => { if (i + 1 >= qs.length) { setFin(true); onDone(score); } else { setI(i + 1); setAnswered(false); } }}>{i + 1 >= qs.length ? "Finish" : "Next question"}<ArrowRight size={16} weight="bold" /></Button>}</div>);
}

/* ---------- checkpoints: inline / overlay / popup / fullscreen ---------- */
function CheckpointBody({ p, kind, onClose }: { p: RendererProps; kind: "ai" | "teacher"; onClose?: () => void }) {
  const q = payloadMcq(p.activity); const [res, setRes] = useState<null | boolean>(null); const [reflect, setReflect] = useState(""); const [sent, setSent] = useState(false);
  const objective = p.activity.learningObjectiveIds[0];
  const rec = res === false ? p.all.find((a) => a.learningObjectiveIds.includes(objective ?? "~") && (a.type === "lesson" || a.type === "video") && a.sequence <= p.activity.sequence && a.id !== p.activity.id) : undefined;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><Badge tone={kind === "ai" ? "ai" : "primary"}>{kind === "ai" ? "Adaptive checkpoint · AI-chosen" : "Teacher checkpoint"}</Badge><Badge>{p.activity.mandatory ? "Required" : "Optional"}</Badge></div>
      {q ? <McqBlock q={q} onAnswer={(ok) => { setRes(ok); p.onMastery(ok, objective); p.onComplete(); }} /> : (
        <div className="space-y-3"><p className="text-lg font-semibold leading-snug">{p.activity.instructions ?? "Pause for a moment: explain this idea in your own words, as if telling a friend."}</p>
          <Textarea aria-label="Your reflection" value={reflect} onChange={(e) => setReflect(e.target.value)} placeholder="There’s no wrong answer — just say what you understood so far." disabled={sent} />
          {!sent ? <div className="flex gap-2"><Button disabled={reflect.trim().length < 5} onClick={() => { setSent(true); p.onMastery(true, objective); p.onComplete(); }}>Save response</Button>{!p.activity.mandatory && <Button variant="ghost" onClick={() => { p.onComplete(); onClose?.(); }}>Skip this one</Button>}</div> : <p role="status" className="rounded-2xl bg-success-soft p-3 text-sm text-success">Saved for your teacher. Lovely reflecting.</p>}</div>)}
      {res !== null && <div role="status" className={cn("space-y-2 rounded-2xl p-4", res ? "bg-success-soft" : "bg-highlight-soft")}>
        <p className={cn("font-bold", res ? "text-success" : "text-warning")}>{res ? "Great — you’re ready to move on" : "Let’s strengthen this together"}</p>
        <p className="text-sm text-text-2">{res ? "Your mastery for this objective just went up." : "This is useful signal, not a mark against you. Here’s the next best step:"}</p>
        {!res && <div className="flex flex-wrap gap-2">{rec && <Button size="sm" onClick={() => { p.goTo(rec.id); onClose?.(); }}>Revisit: {rec.title}</Button>}<Button size="sm" variant="outline" asChild><Link href={`/student/tutor?course=${p.course.id}&lesson=${p.activity.id}&q=${encodeURIComponent(`Help me understand: ${q?.q ?? p.activity.title}`)}`}>Ask my tutor</Link></Button></div>}
        {onClose && <Button size="sm" variant="soft" onClick={onClose}>Continue</Button>}</div>}
    </div>
  );
}
function Checkpoint(kind: "ai" | "teacher") {
  return function CheckpointRenderer(p: RendererProps) {
    const mode = p.activity.checkpointMode ?? "inline"; const [open, setOpen] = useState(mode !== "inline" && !p.done);
    if (mode === "inline") return <div className="rounded-[1.25rem] border border-border bg-surface p-5"><CheckpointBody p={p} kind={kind} /></div>;
    const close = () => setOpen(false);
    return (<>
      <div className="rounded-[1.25rem] border border-dashed border-primary/40 bg-lilac p-5 text-center"><p className="font-semibold">{p.done ? "Checkpoint complete" : "A checkpoint is waiting"}</p><p className="text-sm text-text-2">Mode: {mode}{p.activity.mandatory ? " · required to continue" : " · optional"}</p>{!open && <Button className="mt-3" variant="soft" onClick={() => setOpen(true)}>{p.done ? "Review it" : "Open checkpoint"}</Button>}</div>
      {mode === "popup" && <Modal open={open} onOpenChange={(v) => (p.activity.mandatory && !p.done ? undefined : setOpen(v))} title={p.activity.title}><CheckpointBody p={p} kind={kind} onClose={close} /></Modal>}
      <AnimatePresence>{open && mode !== "popup" && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={p.activity.title} className={cn("fixed inset-0 z-[60] flex overflow-y-auto", mode === "fullscreen" ? "bg-bg p-4 sm:p-10" : "items-center justify-center bg-[#0b0c1f]/60 p-4 backdrop-blur-sm")}>
        <motion.div initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} className={cn("m-auto w-full rounded-[1.5rem] bg-surface p-5 shadow-glow sm:p-7", mode === "fullscreen" ? "max-w-2xl" : "max-w-lg")}>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-heading">{p.activity.title}</h2>{(!p.activity.mandatory || p.done) && <Button variant="ghost" size="iconSm" aria-label="Close" onClick={close}><X size={18} /></Button>}</div>
          <CheckpointBody p={p} kind={kind} onClose={close} /></motion.div></motion.div>}</AnimatePresence></>);
  };
}

/* ---------- video ---------- */
const CAPTIONS = ["Welcome back — today we’re building intuition first.", "Imagine two pizzas, cut into different numbers of slices.", "To compare fairly, we make the slices the same size.", "Now count how many matching slices we have.", "Great. Let’s try one together on the next screen."];
function fmt(t: number) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, "0")}`; }
function Video(p: RendererProps) {
  const asset = useMemo(() => videoFor(p.activity.id, p.course.id), [p.activity.id, p.course.id]);
  const ref = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0); const [dur, setDur] = useState(0); const [playing, setPlaying] = useState(false); const [speed, setSpeed] = useState("1"); const [cc, setCc] = useState(true); const [failed, setFailed] = useState(false); const [paused, setPaused] = useState(false); const [cpDone, setCpDone] = useState(false);
  const cp = useMemo(() => p.all.find((a) => a.moduleId === p.activity.moduleId && a.type === "ai-checkpoint") ?? null, [p.all, p.activity]);
  const q = useMemo<Mcq>(() => payloadMcq(cp ?? p.activity) ?? mcqsFor(p.activity, 2)[1] ?? mcqsFor(p.activity, 1)[0], [cp, p.activity]);
  const pct = dur ? (t / dur) * 100 : 0;
  const toggle = () => { const v = ref.current; if (!v || paused) return; if (v.paused) v.play().catch(() => setFailed(true)); else v.pause(); };
  useEffect(() => { if (ref.current) ref.current.playbackRate = Number(speed); }, [speed]);
  const onTime = () => {
    const v = ref.current; if (!v) return; setT(v.currentTime);
    if (v.duration && v.currentTime / v.duration >= 0.5 && !cpDone && !p.done) { v.pause(); setPaused(true); }
  };
  const reset = () => { const v = ref.current; if (v) { v.currentTime = 0; v.pause(); } setT(0); setFailed(false); setPaused(false); setCpDone(false); };
  const cap = CAPTIONS[Math.min(CAPTIONS.length - 1, Math.floor(pct / 20))];
  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-[1.25rem] bg-[#0b0c1f] text-white">
        {failed ? <div role="alert" className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1d1b4b] to-[#5146E5] p-4 text-center"><WarningCircle size={40} weight="fill" className="text-highlight" /><p className="font-semibold">This video couldn’t load</p><p className="text-sm text-white/80">Check your connection — your place is saved.</p><div className="flex gap-2"><Button size="sm" variant="outline" className="border-0 bg-white text-primary" onClick={() => { setFailed(false); ref.current?.load(); }}>Retry</Button><Button size="sm" variant="ghost" className="text-white hover:bg-white/15" asChild><Link href={`/student/doubts?ask=1&course=${p.course.id}&lesson=${p.activity.id}`}>Report to my teacher</Link></Button></div></div> : <>
          <video ref={ref} src={asset.src} poster={asset.poster} playsInline preload="metadata" className="size-full object-cover" aria-label={asset.title}
            onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} onTimeUpdate={onTime} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setFailed(true)}
            onEnded={() => { setPlaying(false); p.done || p.onComplete(); }} />
          <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={toggle} className="absolute inset-0 flex items-center justify-center">{!playing && !paused && <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-primary shadow-glow"><Play size={30} weight="fill" /></span>}</button>
          {cc && playing && <p aria-live="off" className="absolute inset-x-4 bottom-14 rounded-lg bg-black/60 px-3 py-1.5 text-center text-sm">{cap}</p>}
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6"><button type="button" aria-label={playing ? "Pause" : "Play"} onClick={toggle} className="flex size-8 items-center justify-center rounded-full bg-white/20">{playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}</button><div role="progressbar" aria-valuenow={Math.round(pct)} aria-label="Video progress" className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25"><div className="h-full bg-highlight" style={{ width: `${pct}%` }} /></div><span className="tnum text-[11px]">{fmt(t)} / {fmt(dur)}</span><button type="button" aria-pressed={cc} aria-label="Captions" onClick={() => setCc((v) => !v)} className={cn("flex size-8 items-center justify-center rounded-full", cc ? "bg-white text-primary" : "bg-white/20")}><ClosedCaptioning size={18} weight="fill" /></button></div></>}
        {paused && !failed && <div className="absolute inset-0 flex items-center justify-center bg-[#0b0c1f]/80 p-4"><div className="w-full max-w-md rounded-2xl bg-surface p-4 text-text"><Badge tone="ai">Playback paused for a quick check</Badge><div className="mt-3"><McqBlock q={q} onAnswer={(ok) => { p.onMastery(ok); setCpDone(true); }} />{cpDone && <Button className="mt-3" onClick={() => { setPaused(false); ref.current?.play().catch(() => {}); }}>Resume video</Button>}</div></div></div>}
      </div>
      <p className="text-xs text-text-2">{asset.title} · demo clip ({asset.credit}) — captions below are sample text.</p>
      <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm text-text-2">Speed<Select value={speed} onChange={(e) => setSpeed(e.target.value)} className="h-9 w-24">{["0.75", "1", "1.25", "1.5", "2"].map((s) => <option key={s} value={s}>{s}×</option>)}</Select></label><Button size="sm" variant="ghost" onClick={reset}>Restart</Button><Button size="sm" variant="ghost" onClick={() => setFailed(true)}>Simulate media error</Button><span className="tnum text-xs text-text-2">{Math.round(pct)}% watched</span><span className="ml-auto"><Complete done={p.done} onComplete={p.onComplete} label="Mark as watched" /></span></div>
    </div>
  );
}

/* ---------- reading / lesson / document ---------- */
const BODY = (title: string) => [`${title} starts with a simple idea you already use every day. We’ll build it up step by step so it feels natural, not memorised.`, "Key idea: look for what stays the same while other things change. That’s usually where the pattern hides.", "Worked example: start with a small, friendly case, check it by drawing or counting, then try a slightly bigger one.", "Try it yourself: change one number in the example and predict the result before you work it out."];
function Reading(p: RendererProps) {
  return (<div className="space-y-4"><article className="space-y-3 rounded-[1.25rem] border border-border bg-surface p-5 sm:p-7">{BODY(p.activity.title).map((t, i) => <p key={i} className={cn("leading-relaxed", i === 1 ? "rounded-2xl bg-lilac p-3 font-medium" : "text-text-2")}>{t}</p>)}<p className="text-xs text-text-2">{p.activity.estimatedMinutes} min read · {p.course.language}</p></article><Complete done={p.done} onComplete={p.onComplete} label="Finished reading" /></div>);
}
function Doc(p: RendererProps) {
  const [pg, setPg] = useState(1);
  return (<div className="space-y-3"><div className="rounded-[1.25rem] border border-border bg-surface-2 p-4"><div className="mx-auto flex aspect-[3/4] max-w-sm flex-col rounded-xl bg-white p-6 text-[#202333] shadow-card"><FilePdf size={28} className="text-danger" /><p className="mt-2 font-bold">{p.activity.title}</p><div className="mt-3 space-y-2">{[90, 100, 70, 95, 60, 85].map((w, i) => <span key={i} className="block h-2 rounded bg-[#e7e8f0]" style={{ width: `${w}%` }} />)}</div><p className="mt-auto text-center text-xs text-[#687083]">Page {pg} of 3</p></div></div><div className="flex items-center justify-between"><div className="flex gap-2"><Button size="sm" variant="outline" disabled={pg === 1} onClick={() => setPg(pg - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={pg === 3} onClick={() => setPg(pg + 1)}>Next page</Button></div><Complete done={p.done} onComplete={p.onComplete} label="Mark as read" /></div></div>);
}
function Mcq1(p: RendererProps) {
  const q = payloadMcq(p.activity) ?? mcqsFor(p.activity, 1)[0];
  return <div className="space-y-4 rounded-[1.25rem] border border-border bg-surface p-5"><McqBlock q={q} onAnswer={(ok) => { p.onMastery(ok); p.onComplete(); }} /></div>;
}
function Quiz(n: number) { return function QuizR(p: RendererProps) { const qs = mcqsFor(p.activity, n); return <div className="rounded-[1.25rem] border border-border bg-surface p-5"><Sequence qs={qs} onResult={(ok) => p.onMastery(ok)} onDone={() => p.onComplete()} /></div>; }; }
function Game(p: RendererProps) { return <LinkCard {...p} icon={<GameController size={36} weight="fill" />} title="Play it out" body="This activity is a game. Play a round, then come back — we’ll count it when you return." href="/student/play" cta="Open Play" />; }
function LinkCard({ icon, title, body, href, cta, onComplete, done }: RendererProps & { icon: React.ReactNode; title: string; body: string; href: string; cta: string }) {
  return <div className="flex flex-col items-center gap-3 rounded-[1.25rem] border border-border bg-surface p-8 text-center"><span className="flex size-16 items-center justify-center rounded-2xl bg-lilac text-primary">{icon}</span><h3 className="text-lg font-bold">{title}</h3><p className="max-w-md text-sm text-text-2">{body}</p><div className="flex flex-wrap justify-center gap-2"><Button asChild><Link href={href}>{cta}</Link></Button><Complete done={done} onComplete={onComplete} label="I’ve done this" /></div></div>;
}
function Assignment(p: RendererProps) { return <LinkCard {...p} icon={<NotePencil size={36} weight="fill" />} title={p.activity.title} body="A teacher-reviewed task. Open it to see instructions, due date and to submit your work." href="/student/assignments" cta="Open assignment" />; }
function Live(p: RendererProps) { return <LinkCard {...p} icon={<VideoCamera size={36} weight="fill" />} title={p.activity.title} body="Join this live class from the Live Classes page. Recordings appear after class when allowed." href="/student/live-classes" cta="Open live classes" />; }
function Discussion(p: RendererProps) {
  const [posts, setPosts] = useState([{ n: "Zoya Khan", t: "I think dividing helps when you’re sharing a half-pizza among friends!" }, { n: "Dev Malhotra", t: "Same — it asks how many fit." }]); const [v, setV] = useState("");
  return (<div className="space-y-3 rounded-[1.25rem] border border-border bg-surface p-5"><h3 className="flex items-center gap-2 font-semibold"><ChatsCircle size={20} className="text-primary" />Class discussion</h3><p className="text-sm text-text-2">{p.activity.title}. Be kind and specific — teachers can see this thread.</p><ul className="space-y-2">{posts.map((x, i) => <li key={i} className="rounded-2xl bg-surface-2 p-3 text-sm"><span className="font-semibold">{x.n}</span><p className="text-text-2">{x.t}</p></li>)}</ul><form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { setPosts([...posts, { n: "You", t: v.trim() }]); setV(""); } }}><input aria-label="Add to discussion" value={v} onChange={(e) => setV(e.target.value)} placeholder="Add your thought…" className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm" /><Button type="submit" size="icon" aria-label="Post" disabled={!v.trim()}><PaperPlaneRight size={16} weight="fill" /></Button></form><Complete done={p.done} onComplete={p.onComplete} label="I’ve joined in" /></div>);
}
function Poll(p: RendererProps) {
  const opts = ["Pizza slices", "Chocolate bars", "Number lines", "Fraction strips"]; const [sel, setSel] = useState<number | null>(null); const base = [9, 6, 11, 4];
  return (<div className="space-y-3 rounded-[1.25rem] border border-border bg-surface p-5"><h3 className="text-lg font-semibold">Which picture helps you most?</h3>{opts.map((o, i) => { const total = base.reduce((a, b) => a + b, 0) + (sel !== null ? 1 : 0); const c = base[i] + (sel === i ? 1 : 0); return <button key={o} type="button" disabled={sel !== null} onClick={() => { setSel(i); p.onComplete(); }} className="relative block w-full overflow-hidden rounded-2xl border border-border px-4 py-3 text-left text-sm font-medium"><span className="absolute inset-y-0 left-0 bg-lilac transition-all" style={{ width: sel !== null ? `${(c / total) * 100}%` : 0 }} /><span className="relative flex justify-between"><span>{o}</span>{sel !== null && <span className="tnum">{Math.round((c / total) * 100)}%</span>}</span></button>; })}</div>);
}
function Sim(p: RendererProps) {
  const [wolves, setWolves] = useState(50); const deer = Math.round(100 - wolves * 0.6 + 20); const grass = Math.max(5, Math.round(100 - (deer - 60) * 1.4));
  return (<div className="space-y-4 rounded-[1.25rem] border border-border bg-surface p-5"><h3 className="flex items-center gap-2 font-semibold"><Flask size={20} className="text-primary" />Try the ecosystem</h3><label className="block text-sm font-medium">Wolves in the ecosystem: <span className="tnum">{wolves}</span><input type="range" min={0} max={100} value={wolves} onChange={(e) => setWolves(Number(e.target.value))} className="mt-2 w-full accent-[var(--primary)]" /></label>{[{ l: "Deer", v: deer, c: "bg-violet" }, { l: "Grass", v: grass, c: "bg-success" }].map((b) => <div key={b.l}><div className="flex justify-between text-xs"><span>{b.l}</span><span className="tnum">{b.v}</span></div><div className="h-3 overflow-hidden rounded-full bg-surface-2"><div className={cn("h-full rounded-full transition-all", b.c)} style={{ width: `${Math.min(100, b.v)}%` }} /></div></div>)}<p role="status" className="rounded-2xl bg-lilac p-3 text-sm text-text-2">{wolves < 20 ? "With few wolves, deer multiply and grass is grazed down — the balance tips." : wolves > 80 ? "Too many wolves and deer struggle; the web thins out." : "A healthy middle keeps deer and grass in balance."}</p><Complete done={p.done} onComplete={p.onComplete} label="I explored it" /></div>);
}
function Assessment(p: RendererProps) { return <div className="space-y-3 rounded-[1.25rem] border border-border bg-surface p-5"><div className="flex flex-wrap items-center gap-2"><Badge tone="primary">Assessment</Badge><span className="text-sm text-text-2">{p.activity.estimatedMinutes} min · answers update your mastery; your teacher reviews results.</span></div><Sequence qs={mcqsFor(p.activity, 3)} onResult={(ok) => p.onMastery(ok)} onDone={() => p.onComplete()} /></div>; }

registerRenderer("video", Video); registerRenderer("lesson", Reading); registerRenderer("reading", Reading); registerRenderer("mcq", Mcq1); registerRenderer("quiz", Quiz(3)); registerRenderer("game", Game);
registerRenderer("assignment", Assignment); registerRenderer("discussion", Discussion); registerRenderer("document", Doc); registerRenderer("teacher-checkpoint", Checkpoint("teacher")); registerRenderer("ai-checkpoint", Checkpoint("ai"));
registerRenderer("assessment", Assessment); registerRenderer("live-class", Live); registerRenderer("poll", Poll); registerRenderer("simulation", Sim);
export { ACTIVITY_LABEL };
export const _sparkle = Sparkle;
