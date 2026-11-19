// Library-admin metadata that the shared bookService does not model (language, curriculum mapping, chapter restriction,
// question scope, retention, learning packages). Isolated so it can be folded into bookService later without UI changes.
import type { DocumentChunk } from "@/types/books";
import { simulate, ServiceError } from "@/lib/api/latency";
import { bookService } from "@/lib/api/bookService";
import { OBJECTIVES } from "@/lib/mock-data/core";
import { uid } from "@/lib/utils";

export type Retention = "keep-while-licensed" | "delete-on-revoke" | "archive-12-months";
export interface BookExtras {
  bookId: string; language: string; isbnOverride?: string; curriculumMapping: string[]; retention: Retention;
  /** empty = all chapters available to students */ allowedChapterIds: string[]; questionScope: "open" | "curriculum-only"; tenantId: string; sharedFromTenant?: string;
}
export type PackageItemKind = "summary" | "glossary" | "mcq" | "short" | "practice";
export interface PackageItem {
  id: string; kind: PackageItemKind; text: string; answer?: string; options?: string[]; answerIndex?: number; decision: "pending" | "approved" | "rejected"; edited: boolean;
  source: { bookId: string; chapterTitle: string; page: number; section: string; chunkId: string };
}
export interface LearningPackage {
  id: string; bookId: string; bookTitle: string; chapterId: string; chapterTitle: string; createdAt: string; createdBy: string; status: "draft" | "approved" | "added";
  items: PackageItem[]; destination?: { kind: "course" | "question-bank"; id: string; label: string }; approvedBy?: string;
}

const mapFor = (subjectId: string) => OBJECTIVES.filter((o) => o.subjectId === subjectId).slice(0, 3).map((o) => `${o.code} ${o.title}`);
const extras = new Map<string, BookExtras>();
const ensure = (bookId: string, subjectId = "sub-math"): BookExtras => {
  let e = extras.get(bookId);
  if (!e) { e = { bookId, language: bookId === "book-hin" ? "Hindi" : "English", curriculumMapping: mapFor(subjectId), retention: "keep-while-licensed", allowedChapterIds: [], questionScope: "curriculum-only", tenantId: "tnt-greenfield" }; extras.set(bookId, e); }
  return e;
};
const packages: LearningPackage[] = [];

export const libraryExtras = {
  get: (bookId: string, subjectId?: string) => simulate(() => ensure(bookId, subjectId), { ms: 60 }),
  all: (books: { id: string; subjectId: string }[]) => simulate(() => Object.fromEntries(books.map((b) => [b.id, ensure(b.id, b.subjectId)])), { ms: 60 }),
  update: (bookId: string, patch: Partial<Omit<BookExtras, "bookId" | "tenantId">>) => simulate(() => { const e = ensure(bookId); Object.assign(e, patch); return e; }),
  // ----- learning packages -----
  listPackages: () => simulate(() => [...packages].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
  /** Deterministic mock generation from indexed chunks. Every item carries its chapter/page source. */
  generate: (bookId: string, chapterId: string, by: string) => generatePackage(bookId, chapterId, by),
  setDecision: (pkgId: string, itemId: string, decision: PackageItem["decision"]) => simulate(() => { const p = pk(pkgId); const i = p.items.find((x) => x.id === itemId)!; i.decision = decision; if (p.status !== "draft") p.status = "draft"; return p; }, { ms: 60 }),
  editItem: (pkgId: string, itemId: string, patch: Partial<Pick<PackageItem, "text" | "answer">>) => simulate(() => { const p = pk(pkgId); const i = p.items.find((x) => x.id === itemId)!; if (patch.text !== undefined && !patch.text.trim()) throw new ServiceError("Text cannot be empty.", "validation"); Object.assign(i, patch, { edited: true, decision: "pending" as const }); return p; }, { ms: 60 }),
  approve: (pkgId: string, by: string) => simulate(() => {
    const p = pk(pkgId); if (p.items.some((i) => i.decision === "pending")) throw new ServiceError("Review every item (approve or reject) before approving the package.", "validation");
    if (!p.items.some((i) => i.decision === "approved")) throw new ServiceError("Approve at least one item.", "validation"); p.status = "approved"; p.approvedBy = by; return p;
  }),
  addTo: (pkgId: string, dest: NonNullable<LearningPackage["destination"]>) => simulate(() => { const p = pk(pkgId); if (p.status !== "approved" && p.status !== "added") throw new ServiceError("Approve the package before adding it.", "validation"); p.destination = dest; p.status = "added"; return p; }),
  discard: (pkgId: string) => simulate(() => { const i = packages.findIndex((p) => p.id === pkgId); if (i >= 0) packages.splice(i, 1); return true; }, { ms: 80 }),
};
const pk = (id: string) => { const p = packages.find((x) => x.id === id); if (!p) throw new ServiceError("Package not found.", "validation"); return p; };

async function generatePackage(bookId: string, chapterId: string, by: string): Promise<LearningPackage> {
  const book = await bookService.get(bookId); if (!book) throw new ServiceError("Book not found.", "validation");
  if (book.ingestion.stage !== "Indexed" || book.access.revoked) throw new ServiceError("Only indexed, non-revoked books can be used.", "validation");
  const chunks: DocumentChunk[] = (await bookService.chunks(bookId)).filter((c) => c.chapterId === chapterId).sort((a, b) => a.page - b.page);
  if (!chunks.length) throw new ServiceError("No indexed text found for this chapter.", "validation");
  await new Promise((r) => setTimeout(r, 900));
  const src = (c: DocumentChunk) => ({ bookId, chapterTitle: c.chapterTitle, page: c.page, section: c.section, chunkId: c.id });
  const items: PackageItem[] = [];
  const add = (kind: PackageItemKind, c: DocumentChunk, text: string, extra: Partial<PackageItem> = {}) => items.push({ id: uid("pi"), kind, text, decision: "pending", edited: false, source: src(c), ...extra });
  const allDefs = chunks.flatMap((c) => c.terms ?? []);
  chunks.forEach((c) => {
    add("summary", c, `${c.section}: ${c.summary}`);
    (c.terms ?? []).forEach((t) => add("glossary", c, t.term, { answer: t.definition }));
    (c.qa ?? []).forEach((q) => q.options ? add("mcq", c, q.q, { options: q.options, answerIndex: q.answerIndex, answer: q.a }) : add("short", c, q.q, { answer: q.a }));
    (c.terms ?? []).slice(0, 1).forEach((t) => { const wrong = allDefs.filter((d) => d.term !== t.term).map((d) => d.definition).slice(0, 3); if (wrong.length === 3) { const options = [t.definition, ...wrong]; add("mcq", c, `Which statement describes “${t.term}”?`, { options, answerIndex: 0, answer: t.definition }); } });
    add("practice", c, `In your own words, explain “${c.section}” and give one example.`, { answer: c.summary });
  });
  const p: LearningPackage = { id: uid("pkg"), bookId, bookTitle: book.title, chapterId, chapterTitle: chunks[0].chapterTitle, createdAt: new Date().toISOString(), createdBy: by, status: "draft", items };
  packages.unshift(p);
  return structuredClone(p);
}
