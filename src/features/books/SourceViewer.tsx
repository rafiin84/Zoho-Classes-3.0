"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, CaretLeft, CaretRight, ListBullets } from "@phosphor-icons/react";
import { bookService } from "@/lib/api/bookService";
import { Badge, Button, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Book, BookCitation } from "@/types/books";

/** PDF-like page viewer for a cited source. Full-screen on phones, side panel on desktop. Closing returns to the chat unchanged. */
export function SourceViewer({ book, citation, onClose }: { book: Book; citation: BookCitation; onClose: () => void }) {
  const [page, setPage] = useState(citation.page); const [outline, setOutline] = useState(false);
  useEffect(() => setPage(citation.page), [citation]);
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  const q = useQuery({ queryKey: ["books", "page", book.id, page], queryFn: () => bookService.page(book.id, page) });
  const [lo, hi] = book.pageRange;
  return (
    <aside role="dialog" aria-label={`Source viewer: ${book.title}, page ${page}`} className="fixed inset-0 z-[70] flex flex-col bg-surface lg:static lg:z-auto lg:max-h-[calc(100dvh-7rem)] lg:rounded-[1.25rem] lg:border lg:border-border lg:shadow-soft">
      <div className="flex items-start justify-between gap-2 border-b border-border p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{book.title}</p><p className="text-xs text-text-2">{book.edition.label} · {book.edition.version} · <Badge tone="highlight">Demo content</Badge></p></div><Button size="iconSm" variant="ghost" aria-label="Close source viewer" onClick={onClose}><X size={18} /></Button></div>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2"><Button size="sm" variant="ghost" onClick={() => setOutline(!outline)} aria-expanded={outline}><ListBullets size={16} />Outline</Button><div className="flex items-center gap-2"><Button size="iconSm" variant="outline" aria-label="Previous page" disabled={page <= lo} onClick={() => setPage(page - 1)}><CaretLeft size={14} /></Button><span className="tnum text-sm" aria-live="polite">Page {page} of {hi}</span><Button size="iconSm" variant="outline" aria-label="Next page" disabled={page >= hi} onClick={() => setPage(page + 1)}><CaretRight size={14} /></Button></div></div>
      {outline && <ul className="border-b border-border p-3 text-sm">{book.chapters.map((c) => <li key={c.id}><button className={cn("w-full rounded-lg px-2 py-1.5 text-left hover:bg-lilac", page >= c.startPage && page <= c.endPage && "bg-lilac font-semibold text-primary")} onClick={() => { setPage(Math.max(c.startPage, lo)); setOutline(false); }}>{c.title} <span className="tnum text-xs text-text-2">p.{c.startPage}–{c.endPage}</span></button></li>)}</ul>}
      <div className="flex-1 overflow-y-auto bg-surface-2 p-4">
        <div className="mx-auto min-h-72 max-w-prose rounded-lg bg-surface p-6 shadow-soft">
          {q.isLoading ? <Skeleton className="h-48" /> : q.data && q.data.chunks.length > 0 ? <>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-2">{q.data.chapter?.title ?? citation.chapterTitle}</p>
            {q.data.chunks.map((c) => { const cited = c.id === citation.chunkId; const idx = cited ? c.text.indexOf(citation.passage) : -1; return <section key={c.id} className="mb-5"><h3 className="mb-1 text-sm font-bold">{c.section}</h3><p className="font-serif text-[0.98rem] leading-relaxed">{cited && idx >= 0 ? <>{c.text.slice(0, idx)}<mark className="rounded bg-highlight/60 px-0.5 text-text" id="cited-passage">{citation.passage}</mark>{c.text.slice(idx + citation.passage.length)}</> : c.text}</p></section>; })}
            <p className="mt-6 text-center text-xs text-text-2">{page}</p></> : <p className="py-10 text-center text-sm text-text-2">Page {page} is outside the demo excerpt, so there is no text to show.</p>}
        </div>
      </div>
      <div className="border-t border-border p-3 text-xs text-text-2">Cited: {citation.section}, p.{citation.page}. <button className="font-semibold text-primary underline" onClick={onClose}>Back to chat</button></div>
    </aside>
  );
}
