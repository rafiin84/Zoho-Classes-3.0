"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bell, HeartStraight, Lightning, Medal, Play, Sparkle, ArrowCounterClockwise, CheckCircle } from "@phosphor-icons/react";
import { Badge, Button, Card, CardBody, ConfirmDialog, ErrorState, Icon, PageHeader, Progress, Select, Skeleton, Switch, toast } from "@/components/ui";
import { learningProfileService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { MICRO_TOPICS } from "@/lib/mock-data/micro";
import { relTime } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { studentKeys } from "../keys";
import { TODAY_INDEX, useInvalidateLearning, useProfile, useStudentRecord } from "../hooks";
import { StreakFlame, WeekDots } from "../components/StreakWidget";
import { Session, type SessionTopic } from "../micro/Session";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const topicOf = (objectiveId: string): SessionTopic => objectiveId === "lo-frac-add" ? "fractions" : objectiveId === "lo-frac-mul" ? "divide" : objectiveId === "lo-eco-chain" ? "foodchain" : objectiveId === "lo-alg-lin" ? "linear" : "mixed";

function Reminder() {
  const [on, setOn] = useState(true); const [time, setTime] = useState("17:30");
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem("zc3-micro-reminder") ?? "null"); if (v) { setOn(!!v.on); setTime(v.time); } } catch { /* ignore */ } }, []);
  const save = (o: boolean, t: string) => { setOn(o); setTime(t); try { localStorage.setItem("zc3-micro-reminder", JSON.stringify({ on: o, time: t })); } catch { /* ignore */ } toast.success(o ? `Gentle reminder set for ${t}` : "Reminders are off"); };
  return (
    <Card><CardBody className="space-y-3">
      <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-lilac text-primary"><Bell size={20} weight="fill" /></span><div className="flex-1"><h3 className="font-semibold">Daily reminder</h3><p className="text-xs text-text-2">One friendly nudge. Never more, never guilt.</p></div><Switch checked={on} onChange={(v) => save(v, time)} label="Daily reminder" /></div>
      {on && <div className="flex items-center gap-2"><label htmlFor="rem-time" className="text-sm text-text-2">Remind me at</label><Select id="rem-time" value={time} onChange={(e) => save(true, e.target.value)} className="w-32">{["07:30", "15:30", "17:30", "19:00", "20:30"].map((t) => <option key={t}>{t}</option>)}</Select></div>}
    </CardBody></Card>
  );
}

export default function MicroScreen({ searchParams }: ScreenProps) {
  const { studentId } = useActors(); const student = useStudentRecord(); const inv = useInvalidateLearning();
  const { data: profile, isLoading, isError, refetch } = useProfile();
  const daily = useQuery({ queryKey: studentKeys.dailyDone(studentId), queryFn: () => learningProfileService.dailyDone(studentId) });
  const [session, setSession] = useState<SessionTopic | null>(null); const [confirm, setConfirm] = useState<number | null>(null);
  const [startedBy, setStartedBy] = useState(false);
  const recover = useMutation({ mutationFn: (d: number) => learningProfileService.useRecovery(studentId, d), onSuccess: () => { inv(); toast.success("Streak recovered — welcome back!"); } });

  // deep-links: ?topic=baseline | ?review=1 start straight away
  useEffect(() => {
    if (startedBy || !profile) return; setStartedBy(true);
    if (searchParams.topic === "baseline") setSession("baseline");
    else if (MICRO_TOPICS.some((t) => t.id === searchParams.practice)) setSession(searchParams.practice as SessionTopic);
    else if (searchParams.review) { const weak = [...profile.objectives].sort((a, b) => a.mastery - b.mastery)[0]; setSession(weak ? topicOf(weak.objectiveId) : "mixed"); }
  }, [profile, startedBy, searchParams]);

  if (isLoading || daily.isLoading) return <div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-56" /><Skeleton className="h-40" /></div>;
  if (isError || !profile) return <ErrorState onRetry={() => refetch()} />;
  const done = !!daily.data; const s = profile.streak;
  if (session) return <Session topic={session} wasDone={done} streakBefore={s.current} onExit={() => { setSession(null); inv(); }} />;

  const missed = s.current > 0 || s.best > 0 ? s.weekDays.map((d, i) => ({ d, i })).filter((x) => !x.d && x.i < TODAY_INDEX && s.weekDays.slice(0, x.i).some(Boolean)) : [];
  const weakObjs = profile.objectives.filter((o) => o.mastery < 70).sort((a, b) => a.mastery - b.mastery);
  const lvlBase = (profile.level - 1) * 450; const lvlPct = Math.round(((profile.points - lvlBase) / 450) * 100);
  const isNew = student.status === "pending-baseline";

  return (
    <div className="space-y-6">
      <PageHeader title="Daily challenge" subtitle="Five minutes. A few questions that adapt to you. Come back whenever suits you." />
      <div className="grid gap-4 lg:grid-cols-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-primary via-[#6048e0] to-violet p-6 text-white shadow-glow lg:col-span-3">
          <span aria-hidden className="absolute -right-8 -top-10 size-48 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-4"><StreakFlame streak={s.current} size={72} glow={!done} /><div><p className="text-label text-white/75">{done ? "Done for today" : "Today’s 5-minute challenge"}</p><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{isNew ? "Start with a starter check-in" : done ? "Streak safe — nice work" : s.current > 0 ? `${s.current}-day streak is waiting` : "Begin your streak today"}</h2></div></div>
          <div className="relative mt-5 rounded-2xl bg-white/12 p-3"><WeekDots weekDays={s.weekDays} className="justify-between [&_span:last-child]:text-white/80 [&_li>span:first-child]:bg-white/20 [&_li>span:first-child]:text-white" /></div>
          <div className="relative mt-5 flex flex-wrap items-center gap-3">
            <Button size="lg" variant="outline" className="border-0 bg-white text-primary hover:bg-white/90" onClick={() => setSession(isNew ? "baseline" : weakObjs[0] ? topicOf(weakObjs[0].objectiveId) : "mixed")}><Play size={18} weight="fill" />{done ? "Play another round" : isNew ? "Begin check-in" : "Start now"}</Button>
            <span className="tnum text-sm text-white/85">Best streak {s.best} · {profile.weeklyMinutes}/{profile.weeklyGoalMinutes} min this week</span>
          </div>
        </motion.div>
        <div className="space-y-4 lg:col-span-2">
          <Card><CardBody className="space-y-3"><div className="flex items-center justify-between"><div><p className="text-label text-text-2">Level</p><p className="tnum text-3xl font-extrabold">{profile.level}</p></div><div className="text-right"><p className="tnum text-xl font-bold">{profile.points.toLocaleString("en-IN")}</p><p className="text-xs text-text-2">points</p></div></div><Progress value={lvlPct} tone="highlight" label="Progress to next level" /><p className="tnum text-xs text-text-2">{Math.max(0, 450 - (profile.points - lvlBase))} points to level {profile.level + 1}</p></CardBody></Card>
          <Reminder />
        </div>
      </div>

      {missed.length > 0 && !done && (
        <Card tone="lilac"><CardBody className="flex flex-wrap items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-primary"><HeartStraight size={26} weight="fill" /></span>
          <div className="min-w-0 flex-1"><Badge tone="primary">Streak recovery</Badge><h3 className="mt-1 font-bold">{DAYS[missed[0].i]} was a quiet day — that’s okay</h3><p className="text-sm text-text-2">Life happens. You can bring that day back with a recovery, and your streak carries on. <span className="tnum font-semibold">{s.recoveriesLeft}</span> recover{s.recoveriesLeft === 1 ? "y" : "ies"} left this month.</p></div>
          <Button disabled={s.recoveriesLeft === 0} loading={recover.isPending} onClick={() => setConfirm(missed[0].i)}><ArrowCounterClockwise size={16} weight="bold" />Use a recovery</Button>
        </CardBody></Card>
      )}

      <section className="space-y-3">
        <div><h2 className="text-heading">Pick a topic</h2><p className="text-sm text-text-2">Questions start comfortable and nudge up as you do well.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MICRO_TOPICS.map((t) => <motion.button key={t.id} whileHover={{ y: -3 }} type="button" onClick={() => setSession(t.id)} className="overflow-hidden rounded-[1.25rem] border border-border bg-surface text-left shadow-soft"><div className="flex h-20 items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}><Icon name={t.icon} size={34} weight="duotone" /></div><div className="p-3.5"><p className="font-semibold">{t.label}</p><p className="text-xs text-text-2">{t.hint}</p></div></motion.button>)}
        </div>
        <Button variant="soft" onClick={() => setSession("mixed")}><Sparkle size={16} weight="fill" />Surprise me — mixed round</Button>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="weak-h"><h2 id="weak-h" className="text-heading mb-3">Weak-topic review</h2>
          {weakObjs.length === 0 ? <Card><CardBody className="flex items-center gap-3 text-sm"><CheckCircle size={24} weight="fill" className="text-success" /><p><span className="font-semibold">Nothing needs review right now.</span> <span className="text-text-2">{isNew ? "Once you finish your check-in, we’ll point out topics worth a refresh." : "Your topics are all in good shape."}</span></p></CardBody></Card> :
            <ul className="space-y-2">{weakObjs.map((o) => <li key={o.objectiveId}><Card><CardBody className="flex items-center gap-3 p-3.5 sm:p-3.5"><div className="min-w-0 flex-1"><p className="font-semibold leading-snug">{o.label}</p><p className="tnum text-xs text-text-2">Mastery {o.mastery}% · {o.evidence}</p><Progress value={o.mastery} size="sm" className="mt-1.5" label={`${o.label} mastery`} /></div><Button size="sm" variant="soft" onClick={() => setSession(topicOf(o.objectiveId))}><Lightning size={14} weight="fill" />Review</Button></CardBody></Card></li>)}</ul>}
        </section>
        <section aria-labelledby="badge-h"><h2 id="badge-h" className="text-heading mb-3">Badges</h2>
          {profile.badges.length === 0 ? <Card tone="lilac"><CardBody className="flex items-center gap-3"><Medal size={26} weight="duotone" className="text-primary" /><p className="text-sm"><span className="font-semibold">Your first badge is one challenge away.</span></p></CardBody></Card> :
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{profile.badges.map((b) => <Card key={b.id}><CardBody className="flex flex-col items-center gap-1.5 p-3 text-center sm:p-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-highlight-soft text-warning"><Icon name={b.icon} size={24} weight="fill" /></span><p className="text-xs font-semibold leading-tight">{b.label}</p><p className="text-[11px] text-text-2">{relTime(b.earnedAt)}</p></CardBody></Card>)}</div>}
          <div className="mt-3"><h3 className="mb-2 text-sm font-semibold text-text-2">Recent activity</h3>
            {profile.history.length === 0 ? <p className="text-sm text-text-2">Your activity will appear here after your first challenge.</p> : <ul className="space-y-1.5">{profile.history.slice(0, 4).map((h) => <li key={h.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm"><span className="min-w-0 truncate">{h.title}</span><span className="tnum shrink-0 pl-2 font-semibold">{h.result}</span></li>)}</ul>}</div>
        </section>
      </div>
      <p className="text-center text-xs text-text-2">Missed a day? Nothing is lost — your best streak ({s.best}) stays on your profile. <Link href="/student/home" className="font-semibold text-primary">Back to Home</Link></p>
      <ConfirmDialog open={confirm !== null} onOpenChange={(v) => !v && setConfirm(null)} title="Bring that day back?" body="This uses one streak recovery and restores your streak. You can’t undo it, but you’ll have more next month." confirmLabel="Use recovery" onConfirm={() => confirm !== null && recover.mutate(confirm)} />
    </div>
  );
}
