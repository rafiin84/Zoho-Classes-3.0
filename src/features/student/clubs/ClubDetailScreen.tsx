"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CaretLeft, Lock, Clock, CalendarBlank, Trophy, FileText, Flag, Users } from "@phosphor-icons/react";
import { eventService, feedService } from "@/lib/api";
import type { ScreenProps } from "@/types/screens";
import { fmtDate, relTime } from "@/lib/format";
import { Avatar, Badge, Button, Card, CardBody, ConfirmDialog, Cover, EmptyState, ErrorState, Icon, SectionHeader, Segmented, Skeleton } from "@/components/ui";
import { PostCard } from "../community/PostCard";
import { useViewer } from "../community/useViewer";
import { communityKeys } from "../community/keys";
import { STATUS_TEXT, useClubActions } from "./shared";

type Tab = "about" | "activities" | "gallery" | "discussions" | "resources" | "projects";
const GALLERY_ICONS = ["Image", "Camera", "Palette", "Star", "Sparkle", "Rocket"];

export default function ClubDetailScreen({ params }: ScreenProps) {
  const id = params.id;
  const viewer = useViewer();
  const { join, leave, decide } = useClubActions();
  const [tab, setTab] = React.useState<Tab>("about");
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const [thread, setThread] = React.useState<{ who: string; text: string }[]>([{ who: "Mentor", text: "This week's question: what's one thing you'd like to build before the term ends?" }]);
  const [draft, setDraft] = React.useState("");
  const q = useQuery({ queryKey: communityKeys.club(id), queryFn: () => eventService.club(id), retry: false });
  const c = q.data;
  const events = useQuery({ queryKey: ["events"], queryFn: () => eventService.list() });
  const feed = useQuery({ queryKey: ["feed", "club", id, viewer.id], queryFn: () => feedService.list({ role: "student", id: viewer.id }, { size: 100 }), enabled: !!c });

  if (q.isPending) return <div className="space-y-4"><Skeleton className="h-44" /><Skeleton className="h-8 w-1/2" /><Skeleton className="h-40" /></div>;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!c) return <EmptyState title="We couldn't find that club" body="It may have closed or the link is out of date." action={{ label: "Browse clubs", href: "/student/clubs" }} />;

  const member = c.myStatus === "active";
  const clubPosts = (feed.data?.items ?? []).filter((p) => c.posts.includes(p.id));
  const related = (events.data ?? []).filter((e) => e.organiser.toLowerCase().includes(c.name.split(" ")[0].toLowerCase()) || e.category.toLowerCase().includes(c.category.toLowerCase()) || e.organiser === c.name);
  const locked = (label: string) => <Card tone="plain" className="flex items-center gap-3 p-5 text-sm"><Lock size={20} /> {label} are for members. {c.myStatus === "pending" ? "Your request is pending." : "Join the club to see them."}</Card>;
  const projects = [{ t: `${c.category} challenge of the month`, d: "Small teams, one shared goal, five weeks.", n: 3 }, { t: "Club showcase", d: "Present what you built to the school.", n: 7 }];
  const history = member ? c.activities.slice(0, 2).map((a) => ({ ...a, state: "Upcoming" })).concat([{ id: "h1", title: "Welcome session", at: new Date(Date.now() - 20 * 864e5).toISOString(), state: "Attended" }]) : [];

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/student/clubs" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-text-2 hover:text-text"><CaretLeft size={16} /> All clubs</Link>
      <Cover from={c.cover.from} to={c.cover.to} className="mb-5 h-40 sm:h-52" rounded="rounded-[1.75rem]" icon={<Icon name={c.cover.icon} size={80} weight="duotone" />}>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-5 text-white"><Badge className="mb-1 bg-white/90 text-text">{c.category}</Badge><h1 className="text-display">{c.name}</h1></div>
      </Cover>
      <Card className="mb-5"><CardBody className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1"><p className="font-semibold">{c.description}</p><p className="tnum mt-0.5 flex items-center gap-1.5 text-sm text-text-2"><Users size={15} /> {c.members} members · {c.meeting}</p></div>
        <div aria-live="polite" className="flex flex-wrap items-center gap-2">
          <Badge tone={member ? "success" : c.myStatus === "pending" ? "warning" : "neutral"}>{STATUS_TEXT[c.myStatus]}</Badge>
          {(c.myStatus === "none" || c.myStatus === "rejected") && <Button loading={join.isPending} onClick={() => join.mutate(c)}>{c.membershipPolicy === "open" ? "Join club" : "Request to join"}</Button>}
          {c.myStatus === "pending" && <><span className="flex items-center gap-1 text-sm text-text-2"><Clock size={15} /> Waiting for {c.mentor}</span><Button size="sm" variant="outline" loading={decide.isPending} onClick={() => decide.mutate({ c, ok: true })}>Demo: mentor approves</Button></>}
          {member && <Button variant="ghost" onClick={() => setLeaveOpen(true)}>Leave</Button>}
        </div>
      </CardBody></Card>
      {c.myStatus === "rejected" && <p role="status" className="mb-4 rounded-xl bg-surface-2 p-3 text-sm">Your last request wasn't accepted this time. Mentors often have limited spots — you're welcome to ask again.</p>}

      <div className="mb-4 overflow-x-auto"><Segmented label="club-tabs" value={tab} onChange={setTab} options={[{ value: "about", label: "About" }, { value: "activities", label: "Activities" }, { value: "gallery", label: "Gallery" }, { value: "discussions", label: "Discussions" }, { value: "resources", label: "Resources" }, { value: "projects", label: "Projects" }]} /></div>

      {tab === "about" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card><CardBody><SectionHeader title="Purpose" /><p className="text-sm">{c.purpose}</p><p className="mt-3 text-sm"><b>Policy:</b> {c.membershipPolicy === "open" ? "Open — anyone can join." : "By request — the mentor approves new members."}</p></CardBody></Card>
          <Card><CardBody><SectionHeader title="Mentor & student reps" />
            <div className="flex items-center gap-3"><Avatar name={c.mentor} size={44} color="#7044D8" /><div><p className="font-semibold">{c.mentor}</p><p className="text-xs text-text-2">Teacher mentor</p></div></div>
            <ul className="mt-3 space-y-2">{c.leaders.map((l) => <li key={l} className="flex items-center gap-3"><Avatar name={l} size={36} color="#5146E5" /><div><p className="text-sm font-semibold">{l}</p><p className="text-xs text-text-2">Student representative</p></div></li>)}</ul>
            <p className="mt-3 text-xs text-text-2">Other members' names stay hidden until you join.</p></CardBody></Card>
          <Card><CardBody><SectionHeader title="Achievements" />{c.achievements.length === 0 ? <p className="text-sm text-text-2">No awards yet — the first one could be yours.</p> : <ul className="space-y-2">{c.achievements.map((a) => <li key={a} className="flex items-start gap-2 text-sm"><Trophy size={18} weight="duotone" className="mt-0.5 text-highlight" />{a}</li>)}</ul>}</CardBody></Card>
          <Card><CardBody><SectionHeader title="Your participation" />{!member ? <p className="text-sm text-text-2">Join to start your participation history.</p> : <ul className="space-y-2 text-sm">{history.map((h) => <li key={h.id} className="flex justify-between gap-2"><span>{h.title}</span><Badge tone={h.state === "Attended" ? "success" : "neutral"}>{h.state}</Badge></li>)}</ul>}<p className="mt-2 text-xs text-text-2">Joined clubs appear in your portfolio.</p></CardBody></Card>
        </div>
      )}
      {tab === "activities" && (
        <div className="space-y-3">
          <SectionHeader title="Upcoming activities" />
          {c.activities.length === 0 ? <EmptyState title="Nothing scheduled yet" body="The mentor hasn't added activities. Check back soon." icon={<CalendarBlank size={28} />} /> : c.activities.map((a) => <Card key={a.id}><CardBody className="flex items-center gap-3"><CalendarBlank size={22} className="text-primary" /><div><p className="font-semibold">{a.title}</p><p className="text-sm text-text-2">{fmtDate(a.at, { weekday: "short", day: "numeric", month: "short" })} · {c.meeting.split("·").slice(1).join("·").trim() || c.meeting}</p></div></CardBody></Card>)}
          {related.length > 0 && <><SectionHeader title="Related events" />{related.map((e) => <Card key={e.id}><CardBody className="flex items-center justify-between gap-3"><div><p className="font-semibold">{e.title}</p><p className="text-sm text-text-2">{fmtDate(e.startAt)}</p></div><Button asChild size="sm" variant="soft"><Link href={`/student/events/${e.id}`}>View</Link></Button></CardBody></Card>)}</>}
        </div>
      )}
      {tab === "gallery" && (member ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{GALLERY_ICONS.map((ic, i) => <Cover key={ic} from={c.cover.from} to={i % 2 ? c.cover.to : "#B8B5FF"} className="aspect-square" icon={<Icon name={ic} size={36} weight="duotone" />}><span className="absolute bottom-1.5 left-2 text-xs font-medium text-white">Session {i + 1}</span></Cover>)}</div> : locked("Gallery photos"))}
      {tab === "discussions" && (member ? (
        <div className="space-y-4">
          {clubPosts.map((p) => <PostCard key={p.id} post={p} viewer={viewer} />)}
          <Card><CardBody><SectionHeader title="Member discussion" subtitle="Visible to club members only" />
            <ul className="mb-3 space-y-2">{thread.map((t, i) => <li key={i} className="text-sm"><b>{t.who}:</b> {t.text}</li>)}</ul>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { setThread((x) => [...x, { who: "You", text: draft.trim() }]); setDraft(""); } }}>
              <input aria-label="Add to the discussion" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add to the discussion" className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm" /><Button type="submit" disabled={!draft.trim()}>Send</Button></form></CardBody></Card>
        </div>
      ) : locked("Discussions"))}
      {tab === "resources" && (member ? (c.resources.length === 0 ? <EmptyState title="No resources yet" body="The mentor will add guides and links here." /> : <div className="space-y-2">{c.resources.map((r) => <Card key={r}><CardBody className="flex items-center gap-3"><FileText size={22} className="text-primary" /><span className="flex-1 text-sm font-semibold">{r}</span><Badge>Club only</Badge></CardBody></Card>)}</div>) : locked("Resources"))}
      {tab === "projects" && (
        <div className="space-y-3">{projects.map((p) => <Card key={p.t}><CardBody className="flex items-center gap-3"><Flag size={22} className="text-primary" /><div className="flex-1"><p className="font-semibold">{p.t}</p><p className="text-sm text-text-2">{p.d}</p></div><Badge>{p.n} teams</Badge></CardBody></Card>)}{!member && <p className="text-sm text-text-2">Join the club to take part in collaborative projects.</p>}</div>
      )}
      <ConfirmDialog open={leaveOpen} onOpenChange={setLeaveOpen} title={`Leave ${c.name}?`} body="You'll lose access to the club gallery and discussions. You can rejoin later." confirmLabel="Leave club" destructive onConfirm={() => leave.mutate(c)} />
    </div>
  );
}
