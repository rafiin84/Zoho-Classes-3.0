"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MagicWand, Check, X, PencilSimple, BookOpenText, Trash, Plus } from "@phosphor-icons/react";
import { Card, CardBody, SectionHeader, Select, Field, Button, Badge, StatusBadge, AIBadge, Textarea, Skeleton, ErrorState, EmptyState, Modal, Segmented, toast } from "@/components/ui";
import { bookService } from "@/lib/api/bookService";
import { COURSES } from "@/lib/mock-data/content";
import { libraryExtras, type LearningPackage, type PackageItem, type PackageItemKind } from "./extras";
import type { Book } from "@/types/books";
import { cn } from "@/lib/utils";

const KIND: Record<PackageItemKind, string> = { summary: "Summary", glossary: "Glossary", mcq: "MCQ", short: "Short answer", practice: "Practice" };
const KINDS = Object.keys(KIND) as PackageItemKind[];

export function LearningPackages({ books, actorName, canAddToQB }: { books: Book[]; actorName: string; canAddToQB: boolean }) {
  const qc = useQueryClient();
  const ready = books.filter((b) => b.ingestion.stage === "Indexed" && !b.access.revoked);
  const [bookId, setBookId] = React.useState(""), [chapterId, setChapterId] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const book = ready.find((b) => b.id === bookId);
  React.useEffect(() => { if (!bookId && ready[0]) setBookId(ready[0].id); }, [ready.length]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (book && !book.chapters.some((c) => c.id === chapterId)) setChapterId(book.chapters[0]?.id ?? ""); }, [book, chapterId]);
  const pk = useQuery({ queryKey: ["library", "packages"], queryFn: libraryExtras.listPackages });
  const gen = useMutation({ mutationFn: () => libraryExtras.generate(bookId, chapterId, actorName), onSuccess: (p) => { toast.success(`Draft package created with ${p.items.length} items. Review before it can be used.`); qc.invalidateQueries({ queryKey: ["library", "packages"] }); setOpenId(p.id); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed") });
  const del = useMutation({ mutationFn: (id: string) => libraryExtras.discard(id), onSuccess: () => { toast.info("Package discarded."); setOpenId(null); qc.invalidateQueries({ queryKey: ["library", "packages"] }); } });
  const open = pk.data?.find((p) => p.id === openId);
  return (
    <div className="space-y-5">
      <Card><CardBody className="space-y-3">
        <SectionHeader title="Book-to-learning package" subtitle="Select an approved book and chapter. Every generated item links back to its chapter and page, and nothing is used until you approve it." />
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Approved book" htmlFor="lp-book"><Select id="lp-book" value={bookId} onChange={(e) => setBookId(e.target.value)} className="min-w-56"><option value="" disabled>Select a book</option>{ready.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</Select></Field>
          <Field label="Chapter" htmlFor="lp-ch"><Select id="lp-ch" value={chapterId} onChange={(e) => setChapterId(e.target.value)} className="min-w-56" disabled={!book}>{book?.chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select></Field>
          <Button onClick={() => gen.mutate()} loading={gen.isPending} disabled={!bookId || !chapterId}><MagicWand size={18} />Generate draft package</Button>
          <AIBadge label="AI-generated draft · demo" />
        </div>
        {ready.length === 0 && <p className="text-sm text-warning">No indexed books are available. Finish processing a book first.</p>}
      </CardBody></Card>

      <section><SectionHeader title="Your packages" />
        {pk.isLoading ? <Skeleton className="h-24" /> : pk.isError ? <ErrorState onRetry={() => pk.refetch()} /> : !pk.data?.length ? <EmptyState title="No packages yet" body="Generate a draft from an indexed chapter to create summaries, a glossary, questions and practice tasks with page-level sources." icon={<BookOpenText size={28} />} /> : (
          <ul className="space-y-2">{pk.data.map((p) => { const a = p.items.filter((i) => i.decision === "approved").length, r = p.items.filter((i) => i.decision === "rejected").length; return (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3">
              <div className="min-w-0"><p className="font-semibold">{p.chapterTitle}</p><p className="truncate text-xs text-text-2">{p.bookTitle} · {p.items.length} items · <span className="tnum">{a}</span> approved · <span className="tnum">{r}</span> rejected{p.destination ? ` · added to ${p.destination.label}` : ""}</p></div>
              <div className="flex items-center gap-2"><StatusBadge status={p.status === "added" ? "approved" : p.status === "approved" ? "approved" : "draft"} label={p.status === "added" ? "Added" : p.status === "approved" ? "Approved" : "Draft: needs review"} /><Button size="sm" variant="outline" onClick={() => setOpenId(p.id)}>Review</Button></div>
            </li>); })}</ul>)}
      </section>
      {open && <PackageReview pkg={open} onClose={() => setOpenId(null)} actorName={actorName} canAddToQB={canAddToQB} onDiscard={() => del.mutate(open.id)} />}
    </div>
  );
}

function PackageReview({ pkg, onClose, actorName, canAddToQB, onDiscard }: { pkg: LearningPackage; onClose: () => void; actorName: string; canAddToQB: boolean; onDiscard: () => void }) {
  const qc = useQueryClient();
  const [kind, setKind] = React.useState<PackageItemKind | "all">("all");
  const [editing, setEditing] = React.useState<PackageItem | null>(null);
  const [src, setSrc] = React.useState<PackageItem | null>(null);
  const [dest, setDest] = React.useState(`course:${COURSES[0].id}`);
  const inv = () => qc.invalidateQueries({ queryKey: ["library", "packages"] });
  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed");
  const dec = useMutation({ mutationFn: ({ id, d }: { id: string; d: PackageItem["decision"] }) => libraryExtras.setDecision(pkg.id, id, d), onSuccess: inv, onError: fail });
  const appr = useMutation({ mutationFn: () => libraryExtras.approve(pkg.id, actorName), onSuccess: () => { toast.success("Package approved. Choose where to add it."); inv(); }, onError: fail });
  const add = useMutation({ mutationFn: () => { const [k, id] = dest.split(":"); const label = k === "course" ? COURSES.find((c) => c.id === id)?.title ?? id : "Question Bank (approved draft pool)"; return libraryExtras.addTo(pkg.id, { kind: k as "course" | "question-bank", id, label }); }, onSuccess: (p) => { toast.success(`Added to ${p.destination?.label}.`); inv(); }, onError: fail });
  const pending = pkg.items.filter((i) => i.decision === "pending").length;
  const shown = pkg.items.filter((i) => kind === "all" || i.kind === kind);
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={pkg.chapterTitle} className="sm:max-w-3xl" description={`${pkg.bookTitle} · AI-generated draft. Teacher approval required.`}
      footer={<><Button variant="ghost" size="sm" onClick={onDiscard}><Trash size={16} />Discard</Button><div className="flex-1" />
        {pkg.status === "draft" && <Button onClick={() => appr.mutate()} loading={appr.isPending}>Approve package{pending ? ` (${pending} pending)` : ""}</Button>}
        {pkg.status !== "draft" && <><Select aria-label="Destination" className="w-auto max-w-56" value={dest} onChange={(e) => setDest(e.target.value)}>{COURSES.filter((c) => c.kind === "institution").map((c) => <option key={c.id} value={`course:${c.id}`}>Course: {c.title}</option>)}{canAddToQB && <option value="question-bank:main">Question Bank</option>}</Select><Button onClick={() => add.mutate()} loading={add.isPending}><Plus size={16} />{pkg.status === "added" ? "Add again" : "Add"}</Button></>}</>}>
      <div className="space-y-3">
        <Segmented label="Item type" value={kind} onChange={setKind} options={[{ value: "all", label: "All", count: pkg.items.length }, ...KINDS.map((k) => ({ value: k, label: KIND[k], count: pkg.items.filter((i) => i.kind === k).length }))]} />
        {pkg.destination && <p className="rounded-lg bg-success-soft p-2 text-sm text-success" role="status">Added to {pkg.destination.label}. Only approved items are included.</p>}
        <ul className="space-y-2">{shown.map((i) => (
          <li key={i.id} className={cn("rounded-xl border p-3 text-sm", i.decision === "approved" ? "border-success/40" : i.decision === "rejected" ? "border-danger/40 opacity-70" : "border-border")}>
            <div className="mb-1 flex flex-wrap items-center gap-2"><Badge tone="primary">{KIND[i.kind]}</Badge><button type="button" onClick={() => setSrc(i)} className="text-xs font-semibold text-primary underline">{i.source.chapterTitle.split("·").pop()?.trim()} · p. {i.source.page} · {i.source.section}</button>{i.edited && <Badge tone="info">Edited</Badge>}<StatusBadge status={i.decision === "pending" ? "pending" : i.decision} label={i.decision === "pending" ? "Pending review" : i.decision === "approved" ? "Approved" : "Rejected"} /></div>
            <p className="font-medium">{i.kind === "glossary" ? <><b>{i.text}</b></> : i.text}</p>
            {i.options && <ol className="mt-1 list-[upper-alpha] pl-5 text-text-2">{i.options.map((o, idx) => <li key={o} className={idx === i.answerIndex ? "font-semibold text-success" : ""}>{o}{idx === i.answerIndex ? " (correct)" : ""}</li>)}</ol>}
            {i.answer && !i.options && <p className="mt-1 text-text-2">{i.kind === "glossary" ? "Definition: " : "Model answer: "}{i.answer}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5"><Button size="sm" variant={i.decision === "approved" ? "success" : "outline"} onClick={() => dec.mutate({ id: i.id, d: "approved" })} aria-pressed={i.decision === "approved"}><Check size={14} />Approve</Button><Button size="sm" variant="outline" onClick={() => setEditing(i)}><PencilSimple size={14} />Edit</Button><Button size="sm" variant={i.decision === "rejected" ? "danger" : "outline"} onClick={() => dec.mutate({ id: i.id, d: "rejected" })} aria-pressed={i.decision === "rejected"}><X size={14} />Reject</Button></div>
          </li>))}</ul>
      </div>
      {editing && <EditItem pkgId={pkg.id} item={editing} onClose={() => setEditing(null)} onDone={inv} />}
      {src && <SourceView item={src} onClose={() => setSrc(null)} />}
    </Modal>
  );
}

function EditItem({ pkgId, item, onClose, onDone }: { pkgId: string; item: PackageItem; onClose: () => void; onDone: () => void }) {
  const [text, setText] = React.useState(item.text), [answer, setAnswer] = React.useState(item.answer ?? "");
  const m = useMutation({ mutationFn: () => libraryExtras.editItem(pkgId, item.id, { text, answer: item.answer !== undefined ? answer : undefined }), onSuccess: () => { toast.success("Item updated. It needs approval again."); onDone(); onClose(); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Failed") });
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title="Edit item" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => m.mutate()} loading={m.isPending} disabled={!text.trim()}>Save</Button></>}>
      <div className="space-y-3"><Field label="Text" htmlFor="ei-t" error={!text.trim() ? "Text is required" : undefined}><Textarea id="ei-t" value={text} onChange={(e) => setText(e.target.value)} /></Field>
        {item.answer !== undefined && <Field label={item.kind === "glossary" ? "Definition" : "Answer"} htmlFor="ei-a"><Textarea id="ei-a" value={answer} onChange={(e) => setAnswer(e.target.value)} /></Field>}</div>
    </Modal>
  );
}
function SourceView({ item, onClose }: { item: PackageItem; onClose: () => void }) {
  const q = useQuery({ queryKey: ["library", "page", item.source.bookId, item.source.page], queryFn: () => bookService.page(item.source.bookId, item.source.page) });
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={`Source · page ${item.source.page}`} description={`${item.source.chapterTitle} · ${item.source.section}`} footer={<Button onClick={onClose}>Close</Button>}>
      {q.isLoading ? <Skeleton className="h-24" /> : <div className="space-y-2 text-sm">{q.data?.chunks.filter((c) => c.id === item.source.chunkId || true).map((c) => <blockquote key={c.id} className={cn("border-l-2 pl-3", c.id === item.source.chunkId ? "border-primary" : "border-border text-text-2")}><p className="text-xs font-semibold">{c.section}</p>{c.text}</blockquote>)}{!q.data?.chunks.length && <p className="text-text-2">Passage not available.</p>}</div>}
    </Modal>
  );
}
