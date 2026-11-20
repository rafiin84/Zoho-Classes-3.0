"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarBlank, MapPin, UsersThree, Trophy } from "@phosphor-icons/react";
import { eventService } from "@/lib/api";
import type { EventItem } from "@/types";
import { fmtDate } from "@/lib/format";
import { Badge, Card, Cover, EmptyState, ErrorState, Icon, ListToolbar, NoResults, PageHeader, Segmented, Select, SkeletonCards, StatusBadge } from "@/components/ui";
import { communityKeys } from "../community/keys";
import { CAT_LABEL, LEVELS, LEVEL_LABEL, REG_LABEL, STATUS_LABEL, catOf, type EventCat } from "./shared";

export function EventCard({ e }: { e: EventItem }) {
  const reg = e.myRegistration;
  return (
    <Link href={`/student/events/${e.id}`} className="block rounded-[1.25rem] focus-visible:outline-2">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-card">
        <Cover from={e.cover.from} to={e.cover.to} image={(e.cover as any).image} className="h-28" rounded="rounded-none" icon={<Icon name={e.cover.icon} size={44} weight="duotone" />}>
          <span className="absolute left-3 top-3 rounded-full bg-black/35 px-2.5 py-0.5 text-xs font-semibold text-white">{LEVEL_LABEL[e.scope]} level</span>
        </Cover>
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap gap-1.5"><StatusBadge status={STATUS_LABEL[e.status]} />{reg !== "not-registered" && <Badge tone={reg === "registered" ? "success" : "warning"}>{REG_LABEL[reg]}</Badge>}</div>
          <h3 className="line-clamp-2 font-semibold leading-snug">{e.title}</h3>
          <p className="flex items-center gap-1.5 text-xs text-text-2"><CalendarBlank size={14} /> {fmtDate(e.startAt, { day: "numeric", month: "short" })} · <MapPin size={14} /> <span className="truncate">{e.venue}</span></p>
          <p className="flex items-center gap-1.5 text-xs text-text-2"><UsersThree size={14} /> <span className="tnum">{e.registered}/{e.capacity}</span> registered · {e.registrationMode === "team" ? "Team" : e.registrationMode === "none" ? "Open entry" : "Individual"}</p>
        </div>
      </Card>
    </Link>
  );
}

export default function EventsScreen() {
  const [q, setQ] = React.useState("");
  const [level, setLevel] = React.useState<string>("all");
  const [cat, setCat] = React.useState<"all" | EventCat>("all");
  const [status, setStatus] = React.useState("all");
  const [sort, setSort] = React.useState("date");
  const [mineOnly, setMineOnly] = React.useState(false);
  const query = useQuery({ queryKey: communityKeys.events, queryFn: () => eventService.list(), retry: false });
  const all = (query.data ?? []).filter((e) => e.status !== "draft");
  const list = all
    .filter((e) => (level === "all" || e.scope === level) && (cat === "all" || catOf(e) === cat) && (status === "all" || e.status === status) && (!mineOnly || e.myRegistration !== "not-registered") && (!q || (e.title + e.organiser + e.category).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => sort === "popular" ? b.registered - a.registered : sort === "title" ? a.title.localeCompare(b.title) : a.startAt.localeCompare(b.startAt));
  const hasFilters = level !== "all" || cat !== "all" || status !== "all" || mineOnly;
  const clear = () => { setQ(""); setLevel("all"); setCat("all"); setStatus("all"); setMineOnly(false); };
  const mine = all.filter((e) => e.myRegistration !== "not-registered");

  return (
    <div>
      <PageHeader title="Competitions & events" subtitle="Find something to try — from class quizzes to state-level contests. Beyond your school, your guardian is asked first." />
      {mine.length > 0 && (
        <Card tone="lilac" className="mb-5 flex flex-wrap items-center gap-3 p-4"><Trophy size={24} weight="duotone" className="text-primary" /><div className="min-w-0 flex-1"><p className="font-semibold">You're in {mine.length} event{mine.length === 1 ? "" : "s"}</p><p className="text-sm text-text-2">{mine.map((e) => e.title).slice(0, 2).join(" · ")}{mine.length > 2 ? ` · +${mine.length - 2} more` : ""}</p></div></Card>
      )}
      <div className="mb-3 overflow-x-auto"><Segmented label="event-level" value={level} onChange={setLevel} options={[{ value: "all", label: "All levels" }, ...LEVELS.map((l) => ({ value: l as string, label: LEVEL_LABEL[l] }))]} /></div>
      <div className="mb-3 overflow-x-auto"><Segmented label="event-cat" value={cat} onChange={(v) => setCat(v as any)} options={[{ value: "all", label: "Any category" }, ...(Object.keys(CAT_LABEL) as EventCat[]).map((c) => ({ value: c, label: CAT_LABEL[c] }))]} /></div>
      <ListToolbar query={q} onQuery={setQ} placeholder="Search events and organisers" count={query.isSuccess ? list.length : undefined} onClear={clear} hasFilters={hasFilters}>
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto"><option value="all">Any status</option>{Object.entries(STATUS_LABEL).filter(([k]) => k !== "draft").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto"><option value="date">Soonest first</option><option value="popular">Most registered</option><option value="title">A to Z</option></Select>
        <label className="flex h-11 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} className="size-5 accent-[var(--primary)]" /> My events</label>
      </ListToolbar>
      {query.isPending && <SkeletonCards n={3} h="h-56" />}
      {query.isError && <ErrorState title="Events didn't load" onRetry={() => query.refetch()} />}
      {query.isSuccess && (all.length === 0 ? <EmptyState title="No events yet" body="When your school or district publishes a competition it appears here." /> : list.length === 0 ? <NoResults onClear={clear} query={q} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((e) => <EventCard key={e.id} e={e} />)}</div>
      ))}
    </div>
  );
}
