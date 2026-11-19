"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, ShieldCheck } from "@phosphor-icons/react";
import { feedService } from "@/lib/api";
import { Button, Card, CardBody, EmptyState, ErrorState, PageHeader, SectionHeader, Segmented, Skeleton, toast, Badge } from "@/components/ui";
import { PostCard } from "@/features/student/community/PostCard";
import type { Viewer } from "@/features/student/community/useViewer";
import { useChild } from "../useChild";
import { AccessGate } from "../relationship";
import { pk } from "../data";

function Body() {
  const { childId, child, parentId, parent, first } = useChild();
  const viewer: Viewer = { id: parentId, name: parent.displayName, role: "parent", color: parent.avatarColor };
  const [f, setF] = useState<"all" | "class" | "school" | "competitions">("all"); const [decided, setDecided] = useState<Record<string, "approved" | "denied">>({});
  const q = useQuery({ queryKey: pk("feed", childId + f), queryFn: async () => { const r = await feedService.list({ role: "parent", id: parentId }, { filter: f, size: 30 }); return r.items.filter((p) => p.audienceType !== "class" || p.audienceLabel.includes(child.className)); } });
  const mod = useQuery({ queryKey: pk("feed-mod", childId), queryFn: async () => (await feedService.moderationQueue()).pending.filter((p) => p.authorId === childId) });
  return (
    <div className="space-y-5">
      {(mod.data ?? []).length > 0 && <Card tone="lilac"><CardBody><SectionHeader title={`${first}'s post needs your OK`} subtitle="Public-facing posts by children need a parent's approval, then a teacher's review." />
        <ul className="space-y-3">{mod.data!.map((p) => <li key={p.id} className="rounded-2xl bg-surface p-4"><p className="mb-1 text-xs text-text-2">Audience: {p.audienceLabel}</p><p className="text-sm">{p.text}</p>{decided[p.id] ? <Badge className="mt-2" tone={decided[p.id] === "approved" ? "success" : "danger"}>You {decided[p.id]} this post</Badge> : <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => { setDecided({ ...decided, [p.id]: "approved" }); toast.success("Approved. A teacher still reviews it before it's visible."); }}><ShieldCheck size={16} />Approve</Button><Button size="sm" variant="outline" onClick={() => { setDecided({ ...decided, [p.id]: "denied" }); toast.info("Denied. It stays private."); }}>Don&apos;t approve</Button></div>}</li>)}</ul></CardBody></Card>}
      <Segmented value={f} onChange={setF} label="Feed filter" options={[{ value: "all", label: "All" }, { value: "class", label: "Class" }, { value: "school", label: "School" }, { value: "competitions", label: "Events" }]} />
      {q.isLoading ? <div className="space-y-3"><Skeleton className="h-48" /><Skeleton className="h-48" /></div> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={<Newspaper size={28} weight="duotone" />} title="No updates here yet" body={`Class announcements, events and achievements for ${first} will appear here.`} /> :
        <div className="space-y-4">{q.data!.map((p) => <PostCard key={p.id} post={p} viewer={viewer} readOnly />)}</div>}
    </div>
  );
}
export default function ParentFeed() {
  const { childId, first } = useChild();
  return <div><PageHeader title="Feed & updates" subtitle={`Announcements, events and achievements relevant to ${first}'s class and school.`} /><AccessGate need="basic"><Body key={childId} /></AccessGate></div>;
}
