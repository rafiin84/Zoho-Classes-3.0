"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { UploadSimple, BookOpenText } from "@phosphor-icons/react";
import { PageHeader, Segmented, ListToolbar, Select, Card, CardBody, StatTile, Badge, StatusBadge, Button, Cover, Icon, Progress, Skeleton, ErrorState, EmptyState, NoResults, Drawer, DemoTag } from "@/components/ui";
import { bookService } from "@/lib/api/bookService";
import { useActors } from "@/stores/app-store";
import { SUBJECTS, TEACHERS, CLASSROOMS, subjectById, teacherName } from "@/lib/mock-data/core";
import { relTime } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import type { Book } from "@/types/books";
import { BookDetail } from "../books/BookDetail";
import { UploadDialog } from "../books/UploadDialog";
import { LearningPackages } from "../books/LearningPackages";

type Sort = "recent" | "title" | "usage";
const INFLIGHT = ["Uploaded", "Processing"];

export default function BookLibraryScreen({ role }: ScreenProps) {
  const { teacherId } = useActors();
  const isInst = role === "institution";
  const me = TEACHERS.find((t) => t.id === teacherId);
  const myName = teacherName(teacherId);
  const actorName = isInst ? "Institution admin" : myName;
  const [tab, setTab] = React.useState<"library" | "packages">("library");
  const [q, setQ] = React.useState(""), [subject, setSubject] = React.useState("all"), [stage, setStage] = React.useState("all"), [sort, setSort] = React.useState<Sort>("recent");
  const [sel, setSel] = React.useState<string | null>(null);
  const [upload, setUpload] = React.useState(false);

  const lib = useQuery({ queryKey: ["library", "list"], queryFn: bookService.listLibrary, refetchInterval: (query) => (query.state.data as Book[] | undefined)?.some((b) => INFLIGHT.includes(b.ingestion.stage)) ? 1500 : false });
  const myClassIds = isInst ? CLASSROOMS.map((c) => c.id) : me?.classIds ?? [];
  const books = React.useMemo(() => (lib.data ?? []).filter((b) => isInst || b.uploadedBy === myName || b.access.classIds.some((c) => myClassIds.includes(c))), [lib.data, isInst, myName]); // eslint-disable-line react-hooks/exhaustive-deps
  const canManage = (b: Book) => isInst || b.uploadedBy === myName;
  const view = books.filter((b) => (subject === "all" || b.subjectId === subject) && (stage === "all" || (stage === "revoked" ? b.access.revoked : b.ingestion.stage === stage && !b.access.revoked)) && (!q.trim() || `${b.title} ${b.author} ${b.publisher}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : sort === "usage" ? b.usage.questions - a.usage.questions : b.ingestion.updatedAt.localeCompare(a.ingestion.updatedAt));
  const hasFilters = subject !== "all" || stage !== "all";
  const clear = () => { setQ(""); setSubject("all"); setStage("all"); };
  const current = books.find((b) => b.id === sel);
  const tiles = { total: books.length, ready: books.filter((b) => b.ingestion.stage === "Indexed" && !b.access.revoked).length, attention: books.filter((b) => b.ingestion.stage === "Needs attention" || b.ingestion.stage === "Failed").length, questions: books.reduce((s, b) => s + b.usage.questions, 0) };

  return (
    <div>
      <PageHeader title={isInst ? "Book & Resource Library" : "Book Library"} eyebrow={<DemoTag label="Demo books" />}
        subtitle={isInst ? "Approve, process and control access to books across the institution. Usage is aggregate only." : "Upload books for your classes, control what students can ask, and turn chapters into reviewed learning material."}
        actions={<><Segmented label="Library view" value={tab} onChange={setTab} options={[{ value: "library", label: "Library" }, { value: "packages", label: "Learning packages" }]} /><Button onClick={() => setUpload(true)}><UploadSimple size={18} />Upload book</Button></>} />
      {lib.isLoading ? <div className="space-y-3" role="status" aria-label="Loading library"><Skeleton className="h-20" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
        : lib.isError ? <ErrorState onRetry={() => lib.refetch()} />
        : tab === "packages" ? <LearningPackages books={books} actorName={actorName} canAddToQB />
        : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatTile label="Books" value={tiles.total} icon={<BookOpenText size={18} />} /><StatTile label="Ready for students" value={tiles.ready} /><StatTile label="Need attention" value={tiles.attention} /><StatTile label="Student questions" value={tiles.questions} hint="aggregate" /></div>
          <p className="rounded-xl bg-lilac p-3 text-sm text-text-2">Books are isolated to this institution. Uploading does not grant redistribution rights, and a book from another institution appears only after that institution explicitly shares it.</p>
          <ListToolbar query={q} onQuery={setQ} placeholder="Search title, author or publisher" count={view.length} onClear={clear} hasFilters={hasFilters}>
            <Select aria-label="Subject" className="w-auto" value={subject} onChange={(e) => setSubject(e.target.value)}><option value="all">All subjects</option>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
            <Select aria-label="Processing stage" className="w-auto" value={stage} onChange={(e) => setStage(e.target.value)}><option value="all">Any stage</option>{["Uploaded", "Processing", "Indexed", "Needs attention", "Failed"].map((s) => <option key={s}>{s}</option>)}<option value="revoked">Access revoked</option></Select>
            <Select aria-label="Sort" className="w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="recent">Recently updated</option><option value="title">Title A–Z</option><option value="usage">Most used</option></Select>
          </ListToolbar>
          {books.length === 0 ? <EmptyState title="No books in your library yet" body="Upload a textbook or reader for your classes. Once processing finishes, students can ask questions with page citations." action={{ label: "Upload a book", onClick: () => setUpload(true) }} />
            : view.length === 0 ? <NoResults onClear={clear} query={q} /> : (
            <ul className="grid gap-3 md:grid-cols-2">{view.map((b) => (
              <li key={b.id}><Card className="h-full"><CardBody className="flex h-full gap-3">
                <Cover from={b.cover.from} to={b.cover.to} icon={<Icon name={b.cover.icon} size={26} />} className="h-24 w-[4.5rem] shrink-0" rounded="rounded-xl" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5"><StatusBadge status={b.access.revoked ? "revoked" : b.ingestion.stage} label={b.access.revoked ? "Access revoked" : b.ingestion.stage} /><Badge>{subjectById(b.subjectId).name}</Badge><Badge>{b.gradeLabel}</Badge></div>
                  <h2 className="line-clamp-2 text-sm font-bold">{b.title}</h2>
                  <p className="text-xs text-text-2">{b.author} · {b.edition.label} · {b.pageCount} pages · {b.access.classIds.length} class{b.access.classIds.length === 1 ? "" : "es"}</p>
                  {INFLIGHT.includes(b.ingestion.stage) && <Progress value={b.ingestion.progress} size="sm" label={`${b.title} processing`} />}
                  {b.ingestion.message && <p className="line-clamp-2 text-xs text-warning">{b.ingestion.message}</p>}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1"><span className="tnum text-xs text-text-2">{b.usage.questions} questions · {relTime(b.ingestion.updatedAt)}</span><Button size="sm" variant="outline" onClick={() => setSel(b.id)}>{canManage(b) ? "Manage" : "View"}</Button></div>
                </div></CardBody></Card></li>))}</ul>)}
        </div>)}
      <Drawer open={!!current} onOpenChange={(v) => !v && setSel(null)} title={current?.title ?? "Book"} width="sm:max-w-2xl">{current && <BookDetail book={current} canManage={canManage(current)} myClassIds={myClassIds} actorName={actorName} />}</Drawer>
      <UploadDialog open={upload} onOpenChange={setUpload} uploader={actorName === "Institution admin" ? "Institution library" : myName} classOptions={myClassIds} />
    </div>
  );
}
