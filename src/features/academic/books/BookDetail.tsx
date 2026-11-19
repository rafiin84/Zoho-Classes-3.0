"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowsClockwise, Prohibit, ArrowCounterClockwise, Warning, CheckCircle, Lock } from "@phosphor-icons/react";
import { Badge, StatusBadge, Button, Switch, Checkbox, Field, Input, Select, Progress, Card, CardBody, SectionHeader, ConfirmDialog, Skeleton, toast } from "@/components/ui";
import { bookService } from "@/lib/api/bookService";
import { libraryExtras, type Retention } from "./extras";
import { CLASSROOMS, subjectById } from "@/lib/mock-data/core";
import { fmtDate, relTime } from "@/lib/format";
import type { Book, IngestionStage } from "@/types/books";

const STAGES: { label: string; match: IngestionStage[] }[] = [{ label: "Uploaded", match: ["Uploaded"] }, { label: "Extracting text", match: ["Processing"] }, { label: "Indexing", match: ["Processing"] }, { label: "Review", match: ["Needs attention"] }, { label: "Ready", match: ["Indexed"] }];
function stageIndex(b: Book) { const s = b.ingestion.stage, p = b.ingestion.progress; return s === "Uploaded" ? 0 : s === "Processing" ? (p < 50 ? 1 : 2) : s === "Needs attention" ? 3 : s === "Indexed" ? 4 : -1; }

const metaSchema = z.object({ isbn: z.string().trim().regex(/^$|^[0-9Xx-]{10,17}$|^DEMO-[0-9-]+$/, "Use a 10 or 13 digit ISBN"), language: z.string().min(1), curriculum: z.string().trim().min(3, "Map at least one curriculum objective") });
type MV = z.infer<typeof metaSchema>;

export function BookDetail({ book, canManage, myClassIds, actorName }: { book: Book; canManage: boolean; myClassIds: string[]; actorName: string }) {
  const qc = useQueryClient();
  const ex = useQuery({ queryKey: ["library", "extras", book.id], queryFn: () => libraryExtras.get(book.id, book.subjectId) });
  const inv = () => qc.invalidateQueries({ queryKey: ["library"] });
  const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong");
  const retry = useMutation({ mutationFn: () => bookService.retry(book.id), onSuccess: () => { toast.info("Reprocessing started."); inv(); }, onError: err });
  const access = useMutation({ mutationFn: (p: Partial<Book["access"]>) => bookService.setAccess(book.id, p), onSuccess: () => { toast.success("Access updated."); inv(); }, onError: err });
  const assign = useMutation({ mutationFn: ({ id, on }: { id: string; on: boolean }) => on ? bookService.assignToClass(book.id, id) : bookService.removeFromClass(book.id, id), onSuccess: () => { toast.success("Class assignment updated."); inv(); }, onError: err });
  const revoke = useMutation({ mutationFn: (on: boolean) => on ? bookService.revoke(book.id) : bookService.restore(book.id), onSuccess: (_, on) => { toast.success(on ? "Access revoked for all students." : "Access restored."); inv(); }, onError: err });
  const extra = useMutation({ mutationFn: (p: Parameters<typeof libraryExtras.update>[1]) => libraryExtras.update(book.id, p), onSuccess: () => { toast.success("Saved."); qc.invalidateQueries({ queryKey: ["library", "extras"] }); }, onError: err });
  const [confirmRevoke, setConfirmRevoke] = React.useState(false);
  const e = ex.data;
  const mf = useForm<MV>({ resolver: zodResolver(metaSchema), values: e ? { isbn: e.isbnOverride ?? book.edition.isbn, language: e.language, curriculum: e.curriculumMapping.join("; ") } : undefined });
  const si = stageIndex(book);
  const expiry = book.access.expiresAt?.slice(0, 10) ?? "";
  const expired = book.access.expiresAt && new Date(book.access.expiresAt) < new Date("2026-11-19");
  const ro = !canManage;

  return (
    <div className="space-y-5">
      {ro && <p className="flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-sm text-text-2"><Lock size={16} className="mt-0.5" />You can view this book. Only its uploader or an institution admin can change access and metadata.</p>}
      <div className="flex flex-wrap gap-2"><StatusBadge status={book.access.revoked ? "revoked" : book.ingestion.stage} label={book.access.revoked ? "Access revoked" : book.ingestion.stage} /><Badge>{subjectById(book.subjectId).name}</Badge><Badge>{book.gradeLabel}</Badge><Badge tone="info">{book.licence.type}</Badge>{expired && <Badge tone="danger">Expired</Badge>}</div>

      <Card><CardBody className="space-y-3"><SectionHeader title="Processing" />
        <ol className="flex flex-wrap gap-2" aria-label="Ingestion stages">{STAGES.map((s, i) => <li key={s.label} aria-current={i === si ? "step" : undefined} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${book.ingestion.stage === "Failed" ? "bg-surface-2 text-text-2" : i === si ? (i === 3 ? "bg-warning-soft text-warning" : "bg-primary text-primary-fg") : i < si ? "bg-success-soft text-success" : "bg-surface-2 text-text-2"}`}>{i < si && <CheckCircle size={12} />}{s.label}</li>)}{book.ingestion.stage === "Failed" && <li className="rounded-full bg-danger-soft px-3 py-1 text-xs font-semibold text-danger">Failed</li>}</ol>
        <Progress value={book.ingestion.progress} label="Processing progress" tone={book.ingestion.stage === "Failed" ? "danger" : book.ingestion.stage === "Needs attention" ? "warning" : "primary"} />
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">{[["Pages", book.pageCount], ["Chapters detected", book.chapters.length], ["Indexed passages", book.ingestion.chunks], ["Attempts", book.ingestion.attempts]].map(([k, v]) => <div key={k as string}><dt className="text-xs text-text-2">{k}</dt><dd className="tnum font-semibold">{v}</dd></div>)}</dl>
        <p className="text-xs text-text-2">File {book.ingestion.fileName} · updated {relTime(book.ingestion.updatedAt)}</p>
        {book.ingestion.message && <p className="flex items-start gap-2 rounded-lg bg-warning-soft p-2 text-sm text-warning" role="status"><Warning size={16} className="mt-0.5" />{book.ingestion.message}</p>}
        {(book.ingestion.stage === "Needs attention" || book.ingestion.stage === "Failed" || book.ingestion.stage === "Indexed") && <Button size="sm" variant="outline" disabled={ro} loading={retry.isPending} onClick={() => retry.mutate()}><ArrowsClockwise size={16} />{book.ingestion.stage === "Indexed" ? "Reprocess" : "Retry processing"}</Button>}
        <ul className="text-sm text-text-2">{book.chapters.map((c) => <li key={c.id}>Ch. {c.number} · {c.title} <span className="tnum text-xs">(pp. {c.startPage}–{c.endPage})</span></li>)}</ul>
      </CardBody></Card>

      <Card><CardBody className="space-y-3"><SectionHeader title="Metadata and curriculum" />
        {ex.isLoading ? <Skeleton className="h-28" /> : (
          <form onSubmit={mf.handleSubmit((v) => extra.mutate({ isbnOverride: v.isbn || undefined, language: v.language, curriculumMapping: v.curriculum.split(/;\s*/).filter(Boolean) }))} className="grid gap-3 sm:grid-cols-2" noValidate>
            <div className="text-sm"><p className="text-xs text-text-2">Author · Publisher</p>{book.author} · {book.publisher}</div>
            <div className="text-sm"><p className="text-xs text-text-2">Edition</p>{book.edition.label} · {book.edition.version}</div>
            <Field label="ISBN" htmlFor="d-isbn" error={mf.formState.errors.isbn?.message}><Input id="d-isbn" disabled={ro} {...mf.register("isbn")} /></Field>
            <Field label="Language" htmlFor="d-lang"><Select id="d-lang" disabled={ro} {...mf.register("language")}>{["English", "Hindi", "Tamil", "Bilingual"].map((l) => <option key={l}>{l}</option>)}</Select></Field>
            <Field label="Curriculum mapping (separate with ;)" htmlFor="d-cur" error={mf.formState.errors.curriculum?.message} className="sm:col-span-2" hint="Mapped to the Karuvana State Curriculum objectives."><Input id="d-cur" disabled={ro} {...mf.register("curriculum")} /></Field>
            <div className="sm:col-span-2"><Button type="submit" size="sm" disabled={ro || !mf.formState.isDirty} loading={extra.isPending}>Save metadata</Button></div>
          </form>)}
      </CardBody></Card>

      <Card><CardBody className="space-y-2"><SectionHeader title="Licence and rights" />
        <p className="text-sm"><b>{book.licence.holder}</b> · {book.licence.type}{book.licence.seats ? ` · ${book.licence.seats} seats` : ""}{book.licence.validUntil ? ` · valid until ${fmtDate(book.licence.validUntil)}` : ""}</p>
        <p className="text-sm text-text-2">{book.licence.notes}</p>
        <p className="rounded-lg bg-warning-soft p-2 text-xs text-warning">Uploading a book does not grant redistribution rights. Students get citation-linked in-app access only; sharing outside this institution needs explicit permission from the rights holder.</p>
      </CardBody></Card>

      <Card><CardBody className="space-y-4"><SectionHeader title="Audience and access" />
        <fieldset><legend className="mb-1 text-sm font-semibold">Assigned classes</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">{CLASSROOMS.map((c) => { return <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-[var(--primary)]" disabled={ro || !myClassIds.includes(c.id) || assign.isPending} checked={book.access.classIds.includes(c.id)} onChange={(ev) => assign.mutate({ id: c.id, on: ev.target.checked })} />{c.name}</label>; })}</div>
          {book.access.classIds.length === 0 && <p className="mt-1 text-xs text-text-2">No class assigned. Students cannot see this book.</p>}
        </fieldset>
        {e && book.chapters.length > 1 && (
          <fieldset><legend className="mb-1 text-sm font-semibold">Restrict chapters</legend><p className="mb-1 text-xs text-text-2">Untick chapters to hide them from student search and answers. All ticked means no restriction.</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">{book.chapters.map((c) => { const allowed = e.allowedChapterIds.length === 0 || e.allowedChapterIds.includes(c.id); return <Checkbox key={c.id} label={`Ch. ${c.number} ${c.title.split("·").pop()?.trim()}`} checked={allowed} onChange={(v) => { const cur = e.allowedChapterIds.length ? e.allowedChapterIds : book.chapters.map((x) => x.id); let next = v ? [...new Set([...cur, c.id])] : cur.filter((x) => x !== c.id); if (next.length === 0) { toast.warning("Keep at least one chapter available."); return; } if (next.length === book.chapters.length) next = []; extra.mutate({ allowedChapterIds: next }); }} />; })}</div></fieldset>)}
        <div className="space-y-3">
          <Row title="Question scope" body={e?.questionScope === "open" ? "Open: students may ask anything the book covers, including beyond the current syllabus." : "Curriculum-only: answers limited to passages mapped to the assigned curriculum."}><Select aria-label="Question scope" className="w-auto" disabled={ro || !e} value={e?.questionScope ?? "curriculum-only"} onChange={(ev) => extra.mutate({ questionScope: ev.target.value as "open" | "curriculum-only" })}><option value="curriculum-only">Curriculum-only</option><option value="open">Open questions</option></Select></Row>
          <Row title="Allow wider search" body="Lets students broaden a not-found question to other books they may use."><Switch label="Allow wider search" disabled={ro} checked={book.access.allowWiderSearch} onChange={(v) => access.mutate({ allowWiderSearch: v })} /></Row>
          <Row title="Allow download" body="Only enable when the licence permits it."><Switch label="Allow download" disabled={ro} checked={book.access.allowDownload} onChange={(v) => access.mutate({ allowDownload: v })} /></Row>
          <Row title="Access expires" body={expiry ? `Students lose access on ${fmtDate(expiry)}.` : "No expiry set."}><Input type="date" aria-label="Access expiry date" className="w-auto" disabled={ro} value={expiry} onChange={(ev) => access.mutate({ expiresAt: ev.target.value ? new Date(ev.target.value + "T23:59:00+05:30").toISOString() : undefined })} /></Row>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
          <p className="text-sm">{book.access.revoked ? "Access is revoked. The book is hidden from every student list." : "Revoking removes this book from all students immediately."}</p>
          {book.access.revoked ? <Button size="sm" variant="outline" disabled={ro} onClick={() => revoke.mutate(false)}><ArrowCounterClockwise size={16} />Restore access</Button> : <Button size="sm" variant="danger" disabled={ro} onClick={() => setConfirmRevoke(true)}><Prohibit size={16} />Revoke access</Button>}
        </div>
      </CardBody></Card>

      <Card><CardBody className="space-y-2"><SectionHeader title="Usage (aggregate only)" subtitle="Individual student chats are never shown to staff here." />
        <dl className="grid grid-cols-3 gap-2 text-sm"><div><dt className="text-xs text-text-2">Questions</dt><dd className="tnum text-lg font-bold">{book.usage.questions}</dd></div><div><dt className="text-xs text-text-2">Students</dt><dd className="tnum text-lg font-bold">{book.usage.students}</dd></div><div><dt className="text-xs text-text-2">Not-found rate</dt><dd className="tnum text-lg font-bold">{Math.round(book.usage.notFoundRate * 100)}%</dd></div></dl>
        <p className="text-xs text-text-2">{book.usage.lastUsedAt ? `Last used ${relTime(book.usage.lastUsedAt)}.` : "Not used yet."} A high not-found rate suggests content gaps worth covering.</p>
      </CardBody></Card>

      <Card><CardBody className="space-y-2"><SectionHeader title="Tenant isolation and retention" />
        <p className="text-sm text-text-2">Indexed text and embeddings for this book live in the <b>{e?.tenantId ?? "tnt-greenfield"}</b> tenant only. A book from another institution never appears here unless that institution explicitly shares it. Shared-in books: <b>0</b>.</p>
        <Field label="Retention after access ends" htmlFor="d-ret"><Select id="d-ret" disabled={ro || !e} value={e?.retention ?? "keep-while-licensed"} onChange={(ev) => extra.mutate({ retention: ev.target.value as Retention })}><option value="keep-while-licensed">Keep indexed copy while licensed</option><option value="delete-on-revoke">Delete indexed copy on revoke</option><option value="archive-12-months">Archive for 12 months, then delete</option></Select></Field>
        <p className="text-xs text-text-2">Uploaded by {book.uploadedBy}. Actions here are recorded for {actorName}.</p>
      </CardBody></Card>
      <ConfirmDialog open={confirmRevoke} onOpenChange={setConfirmRevoke} destructive title="Revoke access to this book?" body="It disappears from every student's book list immediately. You can restore access later." confirmLabel="Revoke access" onConfirm={() => revoke.mutate(true)} />
    </div>
  );
}
const Row = ({ title, body, children }: { title: string; body: string; children: React.ReactNode }) => <div className="flex flex-wrap items-center justify-between gap-3"><div className="max-w-md"><p className="text-sm font-semibold">{title}</p><p className="text-xs text-text-2">{body}</p></div>{children}</div>;
