"use client";
import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { PencilSimpleLine, BookmarkSimple } from "@phosphor-icons/react";
import { feedService, type FeedFilter } from "@/lib/api";
import { Button, EmptyState, ErrorState, ListToolbar, Modal, NoResults, PageHeader, Segmented, SkeletonCards, Badge, Card } from "@/components/ui";
import type { FeedPost } from "@/types";
import { PostCard } from "../community/PostCard";
import { Composer } from "../community/Composer";
import { useViewer } from "../community/useViewer";
import { communityKeys } from "../community/keys";

const TABS: { value: FeedFilter; label: string }[] = [
  { value: "all", label: "All" }, { value: "school", label: "School" }, { value: "class", label: "Class" },
  { value: "clubs", label: "Clubs" }, { value: "competitions", label: "Competitions" }, { value: "learning", label: "Learning" },
];

export default function FeedScreen() {
  const viewer = useViewer();
  const [filter, setFilter] = React.useState<FeedFilter>("all");
  const [q, setQ] = React.useState("");
  const [dq, setDq] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [compose, setCompose] = React.useState<null | { text?: string; category?: string; audience?: FeedPost["audienceType"]; replaceId?: string }>(null);
  React.useEffect(() => { const t = setTimeout(() => setDq(q), 250); return () => clearTimeout(t); }, [q]);

  const query = useInfiniteQuery({
    queryKey: communityKeys.feedList(viewer.id, filter, dq, saved),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => feedService.list({ role: "student", id: viewer.id }, { filter, q: dq, page: pageParam, savedOnly: saved }),
    getNextPageParam: (last) => last.nextPage,
    retry: false,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const clear = () => { setQ(""); setFilter("all"); setSaved(false); };
  const hasFilters = filter !== "all" || saved;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Feed" subtitle="Updates from your class, school and clubs. Nothing here is public — posts need approval first."
        actions={<Button onClick={() => setCompose({})}><PencilSimpleLine size={18} /> Share something</Button>} />
      <div className="mb-3 overflow-x-auto"><Segmented label="feed" value={filter} onChange={setFilter} options={TABS} /></div>
      <ListToolbar query={q} onQuery={setQ} placeholder="Search posts and people" count={query.isSuccess ? total : undefined} onClear={clear} hasFilters={hasFilters}>
        <Button variant={saved ? "soft" : "outline"} size="md" aria-pressed={saved} onClick={() => setSaved((v) => !v)}><BookmarkSimple size={16} weight={saved ? "fill" : "regular"} /> Saved</Button>
      </ListToolbar>

      {query.isPending && <SkeletonCards n={3} h="h-56" />}
      {query.isError && <ErrorState title="Your feed didn't load" onRetry={() => query.refetch()} />}
      {query.isSuccess && items.length === 0 && (
        q || hasFilters ? <NoResults onClear={clear} query={q} /> : <EmptyState title="Your feed is quiet right now" body="When teachers, clubs and classmates post, it shows up here. Why not share something of your own?" action={{ label: "Share something", onClick: () => setCompose({}) }} />
      )}
      {query.isSuccess && items.length > 0 && (
        <div className="space-y-4">
          {items.map((p) => <PostCard key={p.id} post={p} viewer={viewer} why onEdit={(post) => setCompose({ text: post.text, category: post.category, audience: post.audienceType, replaceId: post.id })} />)}
          <div className="flex flex-col items-center gap-2 py-3">
            {query.hasNextPage ? <Button variant="outline" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>Load more</Button>
              : <p className="text-sm text-text-2">You're all caught up · {total} post{total === 1 ? "" : "s"}</p>}
            {query.isFetchNextPageError && <p role="alert" className="text-sm text-danger">Couldn't load more. Try again.</p>}
          </div>
        </div>
      )}
      <Card tone="plain" className="mt-6 p-4 text-xs text-text-2"><Badge tone="info">Safety</Badge> <span className="ml-1">Posts by students are reviewed by teachers. Private details are never shown. Use the flag on any post to report something that feels wrong.</span></Card>

      <Modal open={!!compose} onOpenChange={(o) => !o && setCompose(null)} title={compose?.replaceId ? "Edit your post" : "Share something"} description="Choose who can see it before you publish.">
        {compose && <Composer viewer={viewer} initial={compose} onCancel={() => setCompose(null)} postType="achievement" context="Feed" categories={undefined} />}
      </Modal>
    </div>
  );
}
