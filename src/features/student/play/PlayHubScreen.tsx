"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Lightning, Trophy, UsersThree, Flame, ArrowRight, Chalkboard } from "@phosphor-icons/react";
import { learningProfileService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { Avatar, Badge, Button, Card, CardBody, ErrorState, PageHeader, Rail, SectionHeader, Segmented, Skeleton, EmptyState } from "@/components/ui";
import { relTime } from "@/lib/format";
import { GAMES } from "./games";
import { GameCard } from "./GameCard";
import { communityKeys } from "../community/keys";

export default function PlayHubScreen() {
  const { studentId } = useActors();
  const [board, setBoard] = React.useState<"class" | "me">("class");
  const prof = useQuery({ queryKey: communityKeys.profile(studentId), queryFn: () => learningProfileService.get(studentId), retry: false });
  const all = useQuery({ queryKey: ["learning-profile", "all"], queryFn: () => learningProfileService.all() });
  const daily = useQuery({ queryKey: ["daily-done", studentId], queryFn: () => learningProfileService.dailyDone(studentId) });
  const names: Record<string, string> = { "stu-ananya": "Ananya R.", "stu-kabir": "Kabir M.", "stu-meera": "Meera I.", "stu-vihaan": "Vihaan R." };
  const rows = (all.data ?? []).filter((p) => names[p.studentId] && p.points > 0).sort((a, b) => b.points - a.points);
  const history = (prof.data?.history ?? []).filter((h) => h.kind === "game" || h.kind === "challenge");
  return (
    <div>
      <PageHeader title="Play" subtitle="Games that make practice feel like play. Everything you play counts towards your learning profile." />
      {prof.isError && <ErrorState onRetry={() => prof.refetch()} />}
      <Card tone="dark" className="mb-6 overflow-hidden"><CardBody className="flex flex-wrap items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15"><Lightning size={30} weight="fill" className="text-highlight" /></span>
        <div className="min-w-0 flex-1"><p className="text-lg font-bold">Daily challenge</p><p className="text-sm text-white/80">{daily.data ? "Done for today. Nice work — come back tomorrow to keep your streak." : "Five quick questions. Keep your streak glowing."}</p></div>
        {prof.data && <Badge tone="highlight" icon={<Flame size={12} weight="fill" />}>{prof.data.streak.current}-day streak</Badge>}
        <Button asChild variant="soft"><Link href="/student/micro">{daily.data ? "Review" : "Start"} <ArrowRight size={16} /></Link></Button>
      </CardBody></Card>

      <section className="mb-8"><SectionHeader title="Featured" action={<Button asChild variant="ghost" size="sm"><Link href="/student/play/games">All games</Link></Button>} />
        <Rail>{GAMES.filter((g) => g.featured).map((g) => <div key={g.id} className="w-72 shrink-0"><GameCard g={g} /></div>)}</Rail></section>

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <Card><CardBody className="space-y-2"><Chalkboard size={26} className="text-primary" weight="duotone" /><h3 className="font-semibold">Teacher-hosted live game</h3><p className="text-sm text-text-2">When your teacher launches a game on the classroom screen, join with the code.</p><Button asChild size="sm"><Link href="/student/play/tug-of-war/join">Enter a code</Link></Button></CardBody></Card>
        <Card><CardBody className="space-y-2"><Trophy size={26} className="text-primary" weight="duotone" /><h3 className="font-semibold">Competitions</h3><p className="text-sm text-text-2">Quizzes, sports and arts events — from class to state level.</p><Button asChild size="sm" variant="soft"><Link href="/student/events">Browse events</Link></Button></CardBody></Card>
        <Card><CardBody className="space-y-2"><UsersThree size={26} className="text-primary" weight="duotone" /><h3 className="font-semibold">Clubs</h3><p className="text-sm text-text-2">Team up with students who share your interests.</p><Button asChild size="sm" variant="soft"><Link href="/student/clubs">Find a club</Link></Button></CardBody></Card>
      </section>

      <section className="mb-8"><SectionHeader title="Play now" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{GAMES.slice(0, 6).map((g) => <GameCard key={g.id} g={g} />)}</div></section>

      <section aria-label="Leaderboard and history" className="grid gap-5 lg:grid-cols-2">
        <div><SectionHeader title="Leaderboard" subtitle="Class points this term. Shown as first name and initial." />
          {all.isPending ? <Skeleton className="h-40" /> : rows.length === 0 ? <EmptyState title="No scores yet" body="Play a game to appear on the board." /> : (
            <Card><CardBody><ol className="space-y-2">{rows.map((r, i) => <li key={r.studentId} className={`flex items-center gap-3 rounded-xl p-2 ${r.studentId === studentId ? "bg-lilac" : ""}`}><span className="tnum w-6 text-center font-bold">{i + 1}</span><Avatar name={names[r.studentId]} size={32} /><span className="flex-1 text-sm font-semibold">{names[r.studentId]}{r.studentId === studentId && <Badge tone="primary" className="ml-2">You</Badge>}</span><span className="tnum text-sm text-text-2">{r.points.toLocaleString("en-IN")} pts</span></li>)}</ol></CardBody></Card>)}
        </div>
        <div><SectionHeader title="My game history" />
          {prof.isPending ? <Skeleton className="h-40" /> : history.length === 0 ? <EmptyState title="Nothing played yet" body="Your games and daily challenges will be listed here." action={{ label: "Play a game", href: "/student/play/games" }} /> : (
            <Card><CardBody><ul className="space-y-3">{history.slice(0, 6).map((h) => <li key={h.id} className="flex items-center justify-between gap-2 text-sm"><span><b>{h.title}</b><br /><span className="text-xs text-text-2">{relTime(h.at)}</span></span><Badge tone={/won|5\/5/i.test(h.result) ? "success" : "neutral"}>{h.result}</Badge></li>)}</ul></CardBody></Card>)}
        </div>
      </section>
    </div>
  );
}
