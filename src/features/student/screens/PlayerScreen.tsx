"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookmarkSimple, CheckCircle, Circle, Lock, ChatCircleDots, ListBullets, NotePencil, Sparkle, UserCircle, Play } from "@phosphor-icons/react";
import { Badge, Button, Drawer, EmptyState, ErrorState, Progress, Skeleton, Textarea, toast } from "@/components/ui";
import { courseService, learningProfileService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { subjectById } from "@/lib/mock-data/core";
import { cn } from "@/lib/utils";
import type { ScreenProps } from "@/types/screens";
import { studentKeys } from "../keys";
import { useInvalidateLearning } from "../hooks";
import { AskDoubtSheet } from "../doubts/AskDoubtSheet";
import { ACTIVITY_LABEL, getRenderer } from "../player/registry";
import "../player/renderers";

const store = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } } };

function Outline({ mods, acts, done, cur, locked, onPick }: { mods: { id: string; title: string; sequence: number }[]; acts: { id: string; moduleId: string; title: string; type: string; estimatedMinutes: number }[]; done: string[]; cur: string; locked: boolean; onPick: (id: string) => void }) {
  return (
    <ol className="space-y-4" aria-label="Course outline">{mods.map((m) => { const a = acts.filter((x) => x.moduleId === m.id); const d = a.filter((x) => done.includes(x.id)).length;
      return <li key={m.id}><p className="mb-1.5 flex items-center justify-between text-sm font-bold"><span><span className="tnum mr-1 text-text-2">{m.sequence}.</span>{m.title}</span><span className="tnum text-xs font-medium text-text-2">{d}/{a.length}</span></p>
        <ul className="space-y-0.5">{a.map((x) => <li key={x.id}><button type="button" disabled={locked} onClick={() => onPick(x.id)} aria-current={cur === x.id ? "step" : undefined} className={cn("flex min-h-10 w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm hover:bg-surface-2 disabled:opacity-60", cur === x.id && "bg-lilac font-semibold text-primary")}>
          {locked ? <Lock size={16} /> : done.includes(x.id) ? <CheckCircle size={18} weight="fill" className="shrink-0 text-success" /> : cur === x.id ? <Play size={16} weight="fill" className="shrink-0" /> : <Circle size={18} className="shrink-0 text-text-2" />}<span className="min-w-0 flex-1 truncate">{x.title}</span><span className="tnum text-[11px] text-text-2">{x.estimatedMinutes}m</span></button></li>)}</ul></li>; })}</ol>
  );
}

export default function PlayerScreen({ params, searchParams }: ScreenProps) {
  const { studentId } = useActors(); const inv = useInvalidateLearning();
  const course = useQuery({ queryKey: studentKeys.course(params.id, studentId), queryFn: () => courseService.get(params.id, studentId) });
  const st = useQuery({ queryKey: studentKeys.structure(params.id), queryFn: () => courseService.structure(params.id) });
  const doneQ = useQuery({ queryKey: ["player-done", studentId, params.id], queryFn: () => courseService.completed(studentId, params.id) });
  const [curId, setCurId] = useState<string | null>(searchParams.activity ?? null);
  const [outline, setOutline] = useState(false); const [doubt, setDoubt] = useState(false); const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(""); const [mark, setMark] = useState(false);
  const acts = useMemo(() => { const mods = st.data?.modules ?? []; return [...(st.data?.activities ?? [])].sort((a, b) => (mods.find((m) => m.id === a.moduleId)?.sequence ?? 0) - (mods.find((m) => m.id === b.moduleId)?.sequence ?? 0) || a.sequence - b.sequence); }, [st.data]);
  const done = doneQ.data ?? [];
  const activity = acts.find((a) => a.id === curId) ?? acts.find((a) => !done.includes(a.id)) ?? acts[0];
  const idx = activity ? acts.findIndex((a) => a.id === activity.id) : -1;

  useEffect(() => { if (!activity) return; setNotes(store.get(`zc3-note-${studentId}-${activity.id}`) ?? ""); setMark(store.get(`zc3-bm-${studentId}-${activity.id}`) === "1"); }, [activity?.id, studentId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (activity && typeof window !== "undefined") window.history.replaceState(null, "", `?activity=${activity.id}`); }, [activity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const complete = useMutation({ mutationFn: (id: string) => courseService.completeActivity(studentId, params.id, id), onSuccess: () => { inv(); doneQ.refetch(); } });
  const mastery = useMutation({ mutationFn: (p: { ok: boolean; obj: string; label: string }) => learningProfileService.recordMastery(studentId, p.obj, p.ok, p.label, course.data?.subjectId), onSuccess: inv });
  const enrol = useMutation({ mutationFn: () => courseService.enrol(studentId, params.id), onSuccess: () => { inv(); course.refetch(); toast.success("Enrolled — let’s go!"); } });

  if (course.isLoading || st.isLoading) return <div className="grid gap-4 lg:grid-cols-[18rem_1fr]"><Skeleton className="hidden h-96 lg:block" /><div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="aspect-video" /></div></div>;
  if (course.isError || st.isError || !course.data) return <ErrorState title="This course didn’t load" onRetry={() => { course.refetch(); st.refetch(); }} />;
  const c = course.data;
  if (c.priceType === "paid" && !c.owned) return <div className="mx-auto max-w-lg"><EmptyState icon={<Lock size={28} weight="duotone" />} title="This paid course is locked" body="Purchase it to unlock lessons and checkpoints. Sample previews are free on the course page." action={{ label: "View course & purchase", href: `/student/courses/${c.id}` }} /></div>;
  if (!c.enrolled) return <div className="mx-auto max-w-lg"><EmptyState title="Enrol to start learning" body="This is a free course — one tap and you’re in. No payment needed." action={{ label: enrol.isPending ? "Enrolling…" : "Enrol for free", onClick: () => enrol.mutate() }} /></div>;
  if (!activity) return <EmptyState title="This course has no activities yet" body="Your teacher is still building it. Check back soon." action={{ label: "Back to courses", href: "/student/courses" }} />;

  const Renderer = getRenderer(activity.type);
  const pct = acts.length ? Math.round((done.length / acts.length) * 100) : 0;
  const isDone = done.includes(activity.id); const next = acts[idx + 1]; const prev = acts[idx - 1];
  const go = (id: string) => { setCurId(id); setOutline(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const mod = st.data!.modules.find((m) => m.id === activity.moduleId);
  const ctxLink = `course=${c.id}&lesson=${activity.id}`;
  const blockedNext = activity.mandatory && !isDone && ["ai-checkpoint", "teacher-checkpoint", "assessment", "mcq", "quiz"].includes(activity.type);

  return (
    <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="hidden lg:block"><div className="sticky top-24 max-h-[calc(100dvh-8rem)] space-y-4 overflow-y-auto rounded-[1.25rem] border border-border bg-surface p-4">
        <Link href={`/student/courses/${c.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-text-2 hover:text-text"><ArrowLeft size={14} />Course page</Link>
        <div><p className="font-bold leading-snug">{c.title}</p><Progress value={pct} size="sm" className="mt-2" label="Course progress" /><p className="tnum mt-1 text-xs text-text-2">{done.length}/{acts.length} complete</p></div>
        <Outline mods={st.data!.modules} acts={acts} done={done} cur={activity.id} locked={false} onPick={go} /></div></aside>

      <main className="min-w-0 space-y-4">
        <div className="flex items-center gap-2 lg:hidden"><Button asChild variant="ghost" size="iconSm"><Link href={`/student/courses/${c.id}`} aria-label="Back to course"><ArrowLeft size={18} /></Link></Button><div className="min-w-0 flex-1"><Progress value={pct} size="sm" label="Course progress" /></div><span className="tnum text-xs font-semibold text-text-2">{pct}%</span><Button variant="outline" size="sm" onClick={() => setOutline(true)}><ListBullets size={16} />Outline</Button></div>
        <header className="space-y-1.5"><div className="flex flex-wrap items-center gap-2"><Badge tone="primary">{ACTIVITY_LABEL[activity.type]}</Badge>{!activity.mandatory && <Badge>Optional</Badge>}{isDone && <Badge tone="success" icon={<CheckCircle size={12} weight="fill" />}>Done</Badge>}<span className="text-xs text-text-2">{subjectById(c.subjectId).name} · {mod?.title} · {activity.estimatedMinutes} min</span></div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{activity.title}</h1></header>

        <motion.div key={activity.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {Renderer ? <Renderer activity={activity} course={c} done={isDone} all={acts} goTo={go} nextActivityId={next?.id} prevActivityId={prev?.id}
            onComplete={() => { if (!done.includes(activity.id)) { complete.mutate(activity.id); if (!isDone) toast.success("Activity complete"); } }}
            onMastery={(ok, obj) => { const o = obj ?? activity.learningObjectiveIds[0]; if (o) mastery.mutate({ ok, obj: o, label: activity.title }); }} /> :
            <EmptyState title="This activity type isn’t supported yet" body={`“${activity.type}” will render here once its player is added. You can mark it complete or move on.`} action={{ label: "Mark complete", onClick: () => complete.mutate(activity.id) }} />}
        </motion.div>

        <div className="flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-border bg-surface p-2.5" role="toolbar" aria-label="Help and tools">
          <Button size="sm" variant="soft" asChild><Link href={`/student/tutor?${ctxLink}&q=${encodeURIComponent(`Help me with: ${activity.title}`)}`}><Sparkle size={16} weight="fill" />Ask AI Tutor</Link></Button>
          <Button size="sm" variant="soft" onClick={() => setDoubt(true)}><ChatCircleDots size={16} weight="fill" />Ask a doubt</Button>
          <Button size="sm" variant="ghost" asChild><Link href="/student/live-classes"><UserCircle size={16} />Ask teacher</Link></Button>
          <span className="flex-1" />
          <Button size="sm" variant="ghost" aria-pressed={mark} onClick={() => { const v = !mark; setMark(v); store.set(`zc3-bm-${studentId}-${activity.id}`, v ? "1" : "0"); toast.info(v ? "Bookmarked" : "Bookmark removed"); }}><BookmarkSimple size={16} weight={mark ? "fill" : "regular"} />{mark ? "Saved" : "Bookmark"}</Button>
          <Button size="sm" variant="ghost" aria-expanded={notesOpen} onClick={() => setNotesOpen((v) => !v)}><NotePencil size={16} />Notes</Button>
        </div>
        {notesOpen && <div className="space-y-2 rounded-[1.25rem] border border-border bg-surface p-4"><label htmlFor="notes" className="text-sm font-semibold">My notes — only you can see these</label><Textarea id="notes" value={notes} onChange={(e) => { setNotes(e.target.value); store.set(`zc3-note-${studentId}-${activity.id}`, e.target.value); }} placeholder="Jot down what clicked, or what to ask later…" /><p className="text-xs text-text-2">Saved automatically on this device.</p></div>}

        <nav className="flex items-center justify-between gap-3" aria-label="Activity navigation">
          <Button variant="outline" disabled={!prev} onClick={() => prev && go(prev.id)}><ArrowLeft size={16} />Previous</Button>
          {next ? <Button disabled={blockedNext} onClick={() => go(next.id)}>{blockedNext ? "Answer to continue" : <>Next: {next.title.length > 28 ? next.title.slice(0, 26) + "…" : next.title}<ArrowRight size={16} weight="bold" /></>}</Button> : <Button asChild variant={pct === 100 ? "primary" : "outline"}><Link href="/student/learn">{pct === 100 ? "Course complete — see your journey" : "Back to my journey"}</Link></Button>}
        </nav>
      </main>

      <Drawer open={outline} onOpenChange={setOutline} title="Course outline"><Outline mods={st.data!.modules} acts={acts} done={done} cur={activity.id} locked={false} onPick={go} /></Drawer>
      <AskDoubtSheet open={doubt} onOpenChange={setDoubt} context={{ courseId: c.id, lessonId: activity.id, lessonTitle: activity.title, subjectId: c.subjectId }} />
    </div>
  );
}
