"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { UsersThree, Lock, Clock, Check } from "@phosphor-icons/react";
import { eventService } from "@/lib/api";
import type { Club } from "@/types";
import { Badge, Button, Card, Cover, EmptyState, ErrorState, Icon, ListToolbar, NoResults, PageHeader, Rail, SectionHeader, SkeletonCards, ConfirmDialog } from "@/components/ui";
import { communityKeys } from "../community/keys";
import { INTERESTS, STATUS_TEXT, useClubActions } from "./shared";
import { cn } from "@/lib/utils";

function ClubCard({ c, onLeave }: { c: Club; onLeave: (c: Club) => void }) {
  const { join } = useClubActions();
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <Link href={`/student/clubs/${c.id}`} className="block" aria-label={`Open ${c.name}`}>
        <Cover from={c.cover.from} to={c.cover.to} image={(c.cover as any).image} className="h-24" rounded="rounded-none" icon={<Icon name={c.cover.icon} size={40} weight="duotone" />} />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1.5"><Badge tone="primary">{c.category}</Badge>{c.membershipPolicy === "request" && <Badge icon={<Lock size={11} />}>Request to join</Badge>}</div>
        <Link href={`/student/clubs/${c.id}`}><h3 className="font-semibold leading-snug hover:underline">{c.name}</h3></Link>
        <p className="line-clamp-2 text-sm text-text-2">{c.description}</p>
        <p className="tnum flex items-center gap-1.5 text-xs text-text-2"><UsersThree size={14} /> {c.members} members · {c.meeting}</p>
        <div className="mt-auto flex items-center gap-2 pt-2">
          {c.myStatus === "active" && <><Badge tone="success" icon={<Check size={12} />}>Member</Badge><Button size="sm" variant="ghost" className="ml-auto" onClick={() => onLeave(c)}>Leave</Button></>}
          {c.myStatus === "pending" && <><Badge tone="warning" icon={<Clock size={12} />}>Request pending</Badge></>}
          {(c.myStatus === "none" || c.myStatus === "rejected") && <Button size="sm" loading={join.isPending && join.variables?.id === c.id} onClick={() => join.mutate(c)}>{c.myStatus === "rejected" ? "Ask again" : c.membershipPolicy === "open" ? "Join" : "Request to join"}</Button>}
          {c.myStatus === "rejected" && <span className="text-xs text-text-2">Not accepted last time — that's okay.</span>}
        </div>
      </div>
    </Card>
  );
}

export default function ClubsScreen() {
  const [q, setQ] = React.useState("");
  const [interest, setInterest] = React.useState<string | null>(null);
  const [mine, setMine] = React.useState(false);
  const [leaving, setLeaving] = React.useState<Club | null>(null);
  const { leave } = useClubActions();
  const query = useQuery({ queryKey: communityKeys.clubs, queryFn: () => eventService.clubs(), retry: false });
  const all = query.data ?? [];
  const list = all.filter((c) => (!interest || c.category === interest) && (!mine || c.myStatus === "active" || c.myStatus === "pending") && (!q || (c.name + c.description + c.category).toLowerCase().includes(q.toLowerCase())));
  const joined = all.filter((c) => c.myStatus === "active");
  const clear = () => { setQ(""); setInterest(null); setMine(false); };
  return (
    <div>
      <PageHeader title="Clubs & communities" subtitle="Find people who like what you like. Every club has a teacher mentor, and you can leave any time." />
      {query.isSuccess && joined.length > 0 && !interest && !q && !mine && (
        <section className="mb-6"><SectionHeader title="Your clubs" /><Rail>{joined.map((c) => (
          <Link key={c.id} href={`/student/clubs/${c.id}`} className="w-56 shrink-0"><Cover from={c.cover.from} to={c.cover.to} image={(c.cover as any).image} className="h-28 p-3" rounded="rounded-2xl" icon={<Icon name={c.cover.icon} size={36} weight="duotone" />}><span className="absolute bottom-2 left-3 text-sm font-bold text-white drop-shadow">{c.name}</span></Cover></Link>
        ))}</Rail></section>
      )}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="group" aria-label="Interests">
        <button aria-pressed={!interest} onClick={() => setInterest(null)} className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-semibold", !interest ? "bg-primary text-primary-fg" : "bg-surface-2 text-text-2")}>All interests</button>
        {INTERESTS.map((i) => <button key={i} aria-pressed={interest === i} onClick={() => setInterest(interest === i ? null : i)} className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-semibold", interest === i ? "bg-primary text-primary-fg" : "bg-surface-2 text-text-2 hover:text-text")}>{i}</button>)}
      </div>
      <ListToolbar query={q} onQuery={setQ} placeholder="Search clubs" count={query.isSuccess ? list.length : undefined} onClear={clear} hasFilters={!!interest || mine}>
        <Button variant={mine ? "soft" : "outline"} aria-pressed={mine} onClick={() => setMine((v) => !v)}>My clubs</Button>
      </ListToolbar>
      {query.isPending && <SkeletonCards n={3} h="h-56" />}
      {query.isError && <ErrorState title="Clubs didn't load" onRetry={() => query.refetch()} />}
      {query.isSuccess && (list.length === 0 ? (interest && !q && !mine ? <EmptyState title={`No ${interest} club yet`} body="Nobody has started one at your school. Ask a teacher mentor — clubs begin with just a few friends." action={{ label: "See all clubs", onClick: clear }} /> : <NoResults onClear={clear} query={q} />) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((c) => <ClubCard key={c.id} c={c} onLeave={setLeaving} />)}</div>
      ))}
      <ConfirmDialog open={!!leaving} onOpenChange={(o) => !o && setLeaving(null)} title={`Leave ${leaving?.name}?`} body="You'll lose access to the club gallery and discussions. You can rejoin later." confirmLabel="Leave club" destructive onConfirm={() => leaving && leave.mutate(leaving)} />
    </div>
  );
}
