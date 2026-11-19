"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkle, PlusCircle, Heart, ChatCircle, PencilSimple, Trash, SealCheck } from "@phosphor-icons/react";
import { feedService } from "@/lib/api";
import type { FeedPost } from "@/types";
import { Badge, Button, Card, Cover, EmptyState, ErrorState, Icon, ListToolbar, Modal, NoResults, PageHeader, Rail, SectionHeader, Segmented, SkeletonCards, StatusBadge, toast, Skeleton } from "@/components/ui";
import { PostCard } from "../community/PostCard";
import { Composer } from "../community/Composer";
import { useViewer } from "../community/useViewer";
import { communityKeys } from "../community/keys";
import { useTalentDrafts } from "./draft-store";
import { relTime } from "@/lib/format";

export const TALENT_TABS = ["Drawing & painting", "Music & singing", "Dance & performance", "Photography", "Stories & poetry", "Crafts & DIY", "Science projects", "Other achievements"];
const ALIAS: Record<string, string> = { Drawing: "Drawing & painting", Painting: "Drawing & painting" };
const tabOf = (p: FeedPost) => (p.category && (TALENT_TABS.includes(p.category) ? p.category : ALIAS[p.category])) || "Other achievements";
/** Privacy-aware creator label: first name + initial and class only. */
const creator = (p: FeedPost) => { const [f, l] = p.authorName.split(" "); return p.authorId === "stu-ananya" ? "You" : `${f} ${l?.[0] ?? ""}.`; };
const STATUS_LABEL: Record<string, string> = { draft: "Draft", submitted: "Submitted", approved: "Approved", published: "Published", rejected: "Rejected", hidden: "Hidden", removed: "Removed" };

function Tile({ p, onOpen }: { p: FeedPost; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group text-left" aria-label={`Open ${p.category ?? "work"} by ${creator(p)}`}>
      <Cover from={p.media?.from ?? "#5146E5"} to={p.media?.to ?? "#B8B5FF"} className="aspect-[4/3] w-full transition-transform group-hover:scale-[1.02]" icon={<Icon name={p.media?.icon ?? "Palette"} size={48} weight="duotone" />}>
        <span className="absolute left-2 top-2 rounded-full bg-black/35 px-2 py-0.5 text-[11px] font-medium text-white">{tabOf(p)}</span>
      </Cover>
      <div className="mt-2 px-0.5">
        <p className="line-clamp-2 text-sm font-semibold">{p.text}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-text-2"><span>{creator(p)} · Grade 8</span><span className="tnum inline-flex items-center gap-0.5"><Heart size={12} weight="fill" /> {p.reactionCount}</span><span className="tnum inline-flex items-center gap-0.5"><ChatCircle size={12} /> {p.commentCount}</span></p>
      </div>
    </button>
  );
}

export default function TalentScreen() {
  const viewer = useViewer();
  const [view, setView] = React.useState<"gallery" | "mine">("gallery");
  const [tab, setTab] = React.useState<string>("all");
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState<string | null>(null);
  const [compose, setCompose] = React.useState<null | { text?: string; category?: string; audience?: FeedPost["audienceType"]; replaceId?: string; draftId?: string }>(null);
  const drafts = useTalentDrafts();

  const query = useQuery({ queryKey: [...communityKeys.talent, viewer.id], queryFn: () => feedService.list({ role: "student", id: viewer.id }, { size: 200 }), retry: false });
  const all = (query.data?.items ?? []).filter((p) => p.postType === "talent");
  const live = all.filter((p) => (p.moderationStatus === "published" || p.moderationStatus === "approved") && p.audienceType !== "private");
  const mine = all.filter((p) => p.authorId === viewer.id);
  const featured = [...live].sort((a, b) => b.reactionCount - a.reactionCount).slice(0, 3);
  const showcase = live.filter((p) => p.audienceType === "wider" || p.reactionCount >= 70);
  const filtered = live.filter((p) => (tab === "all" || tabOf(p) === tab) && (!q || (p.text + p.authorName + (p.category ?? "")).toLowerCase().includes(q.toLowerCase())));
  const openPost = all.find((p) => p.id === open);
  const clear = () => { setQ(""); setTab("all"); };
  const draftCats = [...TALENT_TABS];

  return (
    <div>
      <PageHeader title="Talent Corner" subtitle="A showcase of what Greenfield learners make — art, music, stories, science and more. Everything here was approved by a teacher first."
        eyebrow={<Badge tone="primary" icon={<Sparkle size={12} weight="fill" />}>Gallery</Badge>}
        actions={<Button onClick={() => setCompose({})}><PlusCircle size={18} /> Share my work</Button>} />
      <div className="mb-4"><Segmented label="talent-view" value={view} onChange={setView} options={[{ value: "gallery", label: "Gallery" }, { value: "mine", label: "My submissions", count: mine.length + drafts.drafts.length }]} /></div>

      {query.isPending && <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="aspect-[4/3]" /><Skeleton className="aspect-[4/3]" /><Skeleton className="aspect-[4/3]" /></div>}
      {query.isError && <ErrorState title="Talent Corner didn't load" onRetry={() => query.refetch()} />}

      {query.isSuccess && view === "gallery" && (
        <>
          {featured.length > 0 && !q && tab === "all" && (
            <section className="mb-8" aria-label="Featured work">
              <SectionHeader title="Featured this week" subtitle="Most-loved by classmates" />
              <div className="grid gap-4 md:grid-cols-3">
                {featured.map((p, i) => (
                  <button key={p.id} onClick={() => setOpen(p.id)} className={i === 0 ? "text-left md:col-span-2" : "text-left"} aria-label={`Featured: ${p.text}`}>
                    <Cover from={p.media?.from ?? "#5146E5"} to={p.media?.to ?? "#7044D8"} className="h-52 w-full sm:h-64" rounded="rounded-[1.5rem]" icon={<Icon name={p.media?.icon ?? "Palette"} size={72} weight="duotone" />}>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-white"><Badge tone="highlight" className="mb-1">Featured</Badge><p className="line-clamp-2 font-semibold">{p.text}</p><p className="text-xs opacity-90">{creator(p)} · {tabOf(p)}</p></div>
                    </Cover>
                  </button>
                ))}
              </div>
            </section>
          )}
          {showcase.length > 0 && !q && tab === "all" && (
            <section className="mb-8" aria-label="School showcase">
              <SectionHeader title="Greenfield showcase" subtitle="A collection curated by teachers for the school and approved wider audiences" />
              <Rail>{showcase.map((p) => <div key={p.id} className="w-52 shrink-0"><Tile p={p} onOpen={() => setOpen(p.id)} /></div>)}</Rail>
            </section>
          )}
          <div className="mb-3 overflow-x-auto"><Segmented label="talent-cat" value={tab} onChange={setTab} options={[{ value: "all", label: "All" }, ...TALENT_TABS.map((t) => ({ value: t, label: t }))]} /></div>
          <ListToolbar query={q} onQuery={setQ} placeholder="Search by title, creator or category" count={filtered.length} onClear={clear} hasFilters={tab !== "all"} />
          {filtered.length === 0 ? (q || tab !== "all" ? <NoResults onClear={clear} query={q} /> : <EmptyState title="The gallery is waiting for its first piece" body="Approved work from your school will appear here." action={{ label: "Share my work", onClick: () => setCompose({}) }} />) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{filtered.map((p) => <Tile key={p.id} p={p} onOpen={() => setOpen(p.id)} />)}</div>
          )}
          <Card tone="plain" className="mt-6 p-4 text-xs text-text-2">Creators appear with first name, initial and grade only. Comments follow school moderation rules; reports go to a teacher.</Card>
        </>
      )}

      {query.isSuccess && view === "mine" && (
        <section aria-label="My submissions" className="max-w-2xl space-y-4">
          <div className="flex flex-wrap gap-2 text-xs" aria-label="Status legend">{["Draft", "Submitted", "Approved", "Published", "Rejected"].map((s) => <StatusBadge key={s} status={s} />)}</div>
          {drafts.drafts.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex items-center gap-2"><StatusBadge status="Draft" /><Badge>{d.category}</Badge><span className="text-xs text-text-2">Saved {relTime(d.savedAt)} · only you can see this</span></div>
              <p className="mt-2 text-sm">{d.text || "(Empty draft)"}</p>
              <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => setCompose({ text: d.text, category: d.category, audience: d.audience, draftId: d.id })}><PencilSimple size={14} /> Edit and submit</Button><Button size="sm" variant="ghost" onClick={() => { drafts.remove(d.id); toast.info("Draft deleted"); }}><Trash size={14} /> Delete</Button></div>
            </Card>
          ))}
          {mine.map((p) => (
            <div key={p.id}>
              <div className="mb-1 flex items-center gap-2"><StatusBadge status={STATUS_LABEL[p.moderationStatus] ?? p.moderationStatus} />{(p.moderationStatus === "published" && p.audienceType !== "private") && <Badge tone="success" icon={<SealCheck size={12} />}>In your portfolio</Badge>}{p.audienceType === "private" && <Badge>Private · portfolio only</Badge>}</div>
              <PostCard post={p} viewer={viewer} onEdit={(post) => setCompose({ text: post.text, category: post.category, audience: post.audienceType, replaceId: post.id })} />
            </div>
          ))}
          {mine.length + drafts.drafts.length === 0 && <EmptyState title="You haven't shared anything yet" body="Share a drawing, song, story or project. You choose who sees it, and a teacher approves anything shared beyond you." action={{ label: "Share my work", onClick: () => setCompose({}) }} />}
        </section>
      )}

      <Modal open={!!openPost} onOpenChange={(o) => !o && setOpen(null)} title={openPost ? `${tabOf(openPost)} · ${creator(openPost)}` : "Work"} className="sm:max-w-2xl">
        {openPost && <PostCard post={openPost} viewer={viewer} onChange={() => query.refetch()} />}
      </Modal>
      <Modal open={!!compose} onOpenChange={(o) => !o && setCompose(null)} title="Share my work" description="Pick who can see it, then submit for approval. Nothing is published until a teacher approves." className="sm:max-w-xl">
        {compose && <Composer viewer={viewer} initial={compose} categories={draftCats} onCancel={() => setCompose(null)}
          onSaveDraft={(d) => { drafts.save(d, compose.draftId); setCompose(null); setView("mine"); toast.success("Draft saved", "Find it under My submissions."); }}
          onPosted={() => { if (compose.draftId) drafts.remove(compose.draftId); setView("mine"); }} />}
      </Modal>
    </div>
  );
}
