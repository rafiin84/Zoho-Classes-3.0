"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, ChatsCircle, Warning } from "@phosphor-icons/react";
import { bookService } from "@/lib/api/bookService";
import { Badge, Button, Card, CardBody, Cover, EmptyState, Icon, ListToolbar, NoResults, PageHeader, SkeletonCards } from "@/components/ui";
import { Boundary, SubjectChip } from "@/features/student/campus/shared";
import { ck } from "@/features/student/campus/keys";
import type { IngestionStage } from "@/types/books";

const STAGE: Record<IngestionStage, { tone: "success" | "warning" | "danger" | "neutral"; label: string }> = { Indexed: { tone: "success", label: "Ready to chat" }, Processing: { tone: "warning", label: "Processing" }, Uploaded: { tone: "neutral", label: "Uploaded" }, "Needs attention": { tone: "danger", label: "Needs attention" }, Failed: { tone: "danger", label: "Failed" } };

export function BooksList({ classId }: { classId: string }) {
  const q = useQuery({ queryKey: ck.books(classId), queryFn: () => bookService.listForClass(classId) }); const [query, setQuery] = useState("");
  return (
    <div>
      <PageHeader title="Chat with a Book" subtitle="Ask questions about the books your teachers have assigned. Answers come only from the book and always show where." />
      <p className="mb-4 flex items-start gap-2 rounded-2xl bg-highlight-soft p-3 text-sm text-warning"><Warning size={18} className="mt-0.5 shrink-0" />Prototype: book text and citations are demo content, and no AI model is running. Answers are matched from a small set of curated passages.</p>
      <ListToolbar query={query} onQuery={setQuery} placeholder="Search your books" onClear={() => setQuery("")} />
      <Boundary q={q} skeleton={<SkeletonCards n={3} h="h-36" />} isEmpty={(d) => d.length === 0} empty={<EmptyState icon={<BookOpenText size={28} weight="duotone" />} title="No books assigned to your class yet" body="Your teachers assign books from the school library. Once one is assigned and processed, it appears here." />}>
        {(books) => { const list = books.filter((b) => b.title.toLowerCase().includes(query.toLowerCase())); return list.length === 0 ? <NoResults onClear={() => setQuery("")} query={query} /> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((b) => { const s = STAGE[b.ingestion.stage]; const ok = b.ingestion.stage === "Indexed"; return (
            <Card key={b.id} className="overflow-hidden"><Cover from={b.cover.from} to={b.cover.to} image={(b.cover as any).image} className="h-28" icon={<Icon name={b.cover.icon} size={44} weight="duotone" />} rounded="rounded-none" />
              <CardBody className="space-y-3"><div className="flex flex-wrap gap-2"><SubjectChip subjectId={b.subjectId} /><Badge tone={s.tone}>{s.label}</Badge></div><div><h3 className="font-semibold leading-snug">{b.title}</h3><p className="mt-0.5 text-xs text-text-2">{b.edition.label} · {b.edition.version} · {b.gradeLabel}</p></div><p className="text-sm text-text-2">{b.description}</p>
                {ok ? <Button asChild className="w-full"><Link href={`/student/books/${b.id}`}><ChatsCircle size={18} weight="fill" />Chat with this book</Link></Button> : <p className="rounded-xl bg-surface-2 p-3 text-xs text-text-2">{b.ingestion.stage === "Processing" || b.ingestion.stage === "Uploaded" ? "Your library is still preparing this book. Chat opens when it's ready." : "This book isn't available right now. Your teacher has been notified."}</p>}</CardBody></Card>); })}</div>; }}
      </Boundary>
    </div>
  );
}
