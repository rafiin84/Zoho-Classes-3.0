"use client";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Certificate, Palette, Lock, Medal } from "@phosphor-icons/react";
import { Badge, Card, CardBody, EmptyState, PageHeader, SectionHeader, Skeleton, ErrorState, Icon } from "@/components/ui";
import { ACHIEVEMENT_ITEMS } from "@/lib/mock-data/parent";
import { fmtDate } from "@/lib/format";
import { simulate } from "@/lib/api";
import { useChild } from "../useChild";
import { AccessGate } from "../relationship";
import { useChildProfile, pk } from "../data";

const ICON = { certificate: <Certificate size={22} weight="duotone" />, competition: <Trophy size={22} weight="duotone" />, portfolio: <Palette size={22} weight="duotone" /> };
function Body() {
  const { childId, first } = useChild(); const prof = useChildProfile(childId);
  const q = useQuery({ queryKey: pk("achievements", childId), queryFn: () => simulate(() => ACHIEVEMENT_ITEMS.filter((a) => a.childId === childId)) });
  if (q.isLoading || prof.isLoading) return <div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const items = q.data ?? []; const badges = prof.data?.badges ?? []; const shown = items.filter((i) => i.visibility !== "private"); const hidden = items.length - shown.length;
  if (!shown.length && !badges.length) return <EmptyState icon={<Medal size={28} weight="duotone" />} title="No achievements to show yet" body={`Certificates, badges and competition entries appear here as ${first} earns them, if ${first} chooses to share them.`} />;
  return (
    <div className="space-y-5">
      {badges.length > 0 && <Card><CardBody><SectionHeader title="Badges" /><ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{badges.map((b) => <li key={b.id} className="flex items-center gap-3 rounded-2xl bg-lilac p-3"><span className="flex size-10 items-center justify-center rounded-xl bg-surface text-primary"><Icon name={b.icon} size={22} weight="duotone" /></span><span><span className="block text-sm font-semibold">{b.label}</span><span className="text-xs text-text-2">{fmtDate(b.earnedAt)}</span></span></li>)}</ul></CardBody></Card>}
      <div className="grid gap-3 md:grid-cols-2">{shown.map((i) => <Card key={i.id}><CardBody className="flex gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-lilac text-primary">{ICON[i.kind]}</span><div className="min-w-0"><div className="mb-1 flex flex-wrap gap-1.5"><Badge>{i.kind}</Badge><Badge tone={i.visibility === "shared-with-parent" ? "success" : "info"}>{i.visibility === "shared-with-parent" ? "Shared with you" : "Visible to school"}</Badge></div><h3 className="font-semibold">{i.title}</h3><p className="text-sm text-text-2">{i.detail}</p><p className="mt-1 text-xs text-text-2">{fmtDate(i.at)}</p></div></CardBody></Card>)}</div>
      {hidden > 0 && <p className="flex items-center gap-2 rounded-2xl bg-surface-2 p-4 text-sm text-text-2"><Lock size={18} />{hidden} item{hidden === 1 ? " is" : "s are"} private to {first}. Children decide what to share beyond the school, and that choice is respected here.</p>}
    </div>
  );
}
export default function ParentAchievements() {
  const { childId, first } = useChild();
  return <div><PageHeader title="Achievements" subtitle={`Certificates, badges, competitions and portfolio items ${first} has shared with you.`} /><AccessGate need="basic"><Body key={childId} /></AccessGate></div>;
}
