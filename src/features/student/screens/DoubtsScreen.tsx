"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChatCircleDots, Plus, Sparkle, ArrowRight } from "@phosphor-icons/react";
import { Button, Card, CardBody, EmptyState, ErrorState, ListToolbar, PageHeader, Segmented, SkeletonCards, Badge, Avatar, NoResults } from "@/components/ui";
import { doubtService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { subjectById, teacherName, TEACHERS } from "@/lib/mock-data/core";
import { relTime } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import type { DoubtStatus } from "@/types";
import { studentKeys } from "../keys";
import { AskDoubtSheet, type DoubtContext } from "../doubts/AskDoubtSheet";

export const DOUBT_STATUS: Record<DoubtStatus, { label: string; tone: "warning" | "success" | "info" | "primary" }> = {
  open: { label: "Open", tone: "info" }, answered: { label: "Answered", tone: "success" }, "follow-up": { label: "Follow-up required", tone: "warning" }, resolved: { label: "Resolved", tone: "primary" },
};
type Filter = "all" | DoubtStatus;

export default function DoubtsScreen({ searchParams }: ScreenProps) {
  const { studentId } = useActors();
  const hasCtx = !!(searchParams.course || searchParams.lesson || searchParams.q || searchParams.from || searchParams.ask);
  const [sheet, setSheet] = useState(hasCtx);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: studentKeys.doubts(studentId), queryFn: () => doubtService.forStudent(studentId) });
  const ctx: DoubtContext = useMemo(() => ({ courseId: searchParams.course, lessonId: searchParams.lesson, lessonTitle: searchParams.lessonTitle, q: searchParams.q, fromTutor: searchParams.from === "tutor", origin: searchParams.origin }), [searchParams]);
  const counts = useMemo(() => { const c: Record<string, number> = { all: data?.length ?? 0 }; data?.forEach((d) => (c[d.status] = (c[d.status] ?? 0) + 1)); return c; }, [data]);
  const list = useMemo(() => (data ?? []).filter((d) => (filter === "all" || d.status === filter) && (!q || (d.title + d.messages.map((m) => m.text).join(" ")).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => sort === "recent" ? b.updatedAt.localeCompare(a.updatedAt) : a.updatedAt.localeCompare(b.updatedAt)), [data, filter, q, sort]);

  return (
    <div className="space-y-5">
      <PageHeader title="Ask a doubt" subtitle="Stuck on something? Send it to your teacher — with a photo, a voice note or just words. Real people reply."
        actions={<><Button asChild variant="soft"><Link href="/student/tutor"><Sparkle size={18} weight="fill" />Try AI Tutor first</Link></Button><Button onClick={() => setSheet(true)}><Plus size={18} weight="bold" />Ask a doubt</Button></>} />
      <Segmented<Filter> label="Doubt status" value={filter} onChange={setFilter} options={[{ value: "all", label: "All", count: counts.all }, ...(Object.keys(DOUBT_STATUS) as DoubtStatus[]).map((s) => ({ value: s as Filter, label: DOUBT_STATUS[s].label, count: counts[s] ?? 0 }))]} />
      <ListToolbar query={q} onQuery={setQ} placeholder="Search your doubts" count={list.length} onClear={() => { setQ(""); setFilter("all"); }} hasFilters={filter !== "all"}>
        <select aria-label="Sort doubts" value={sort} onChange={(e) => setSort(e.target.value as "recent" | "oldest")} className="h-11 rounded-full border border-border bg-surface px-4 text-sm"><option value="recent">Newest activity</option><option value="oldest">Oldest first</option></select>
      </ListToolbar>
      {isLoading ? <SkeletonCards n={3} h="h-24" /> : isError ? <ErrorState onRetry={() => refetch()} /> :
        !data?.length ? <EmptyState icon={<ChatCircleDots size={28} weight="duotone" />} title="No doubts yet — and that’s fine" body="When something doesn’t click, ask. Teachers love good questions, and your thread stays here so you can come back to it." action={{ label: "Ask your first doubt", onClick: () => setSheet(true) }} /> :
        list.length === 0 ? <NoResults query={q} onClear={() => { setQ(""); setFilter("all"); }} /> :
        <ul className="space-y-3">{list.map((d, i) => {
          const sub = subjectById(d.subjectId); const t = TEACHERS.find((x) => x.id === d.teacherId); const last = d.messages[d.messages.length - 1]; const st = DOUBT_STATUS[d.status];
          return (
            <motion.li key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link href={`/student/doubts/${d.id}`} className="block"><Card className="transition-shadow hover:shadow-card"><CardBody className="flex items-start gap-3">
                <Avatar name={t?.displayName ?? "Teacher"} color={t?.avatarColor} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold leading-snug">{d.title}</h3><Badge tone={st.tone}>{st.label}</Badge>{d.escalatedFromTutor && <Badge tone="ai">From AI Tutor</Badge>}</div>
                  <p className="mt-0.5 text-xs text-text-2">{sub.name} · {teacherName(d.teacherId)} · {relTime(d.updatedAt)}</p>
                  <p className="mt-1.5 line-clamp-2 text-sm text-text-2"><span className="font-medium text-text">{last.authorRole === "teacher" ? "Teacher: " : "You: "}</span>{last.text}</p>
                  {d.context && <p className="mt-1 truncate text-xs text-primary">{d.context}</p>}
                </div>
                <ArrowRight size={18} className="mt-1 hidden shrink-0 text-text-2 sm:block" />
              </CardBody></Card></Link>
            </motion.li>
          );
        })}</ul>}
      <AskDoubtSheet open={sheet} onOpenChange={setSheet} context={ctx} />
    </div>
  );
}
