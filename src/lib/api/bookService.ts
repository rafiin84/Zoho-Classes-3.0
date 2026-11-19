import type { Book, DocumentChunk, BookCitation, RAGMessage, RAGMode, RAGSegment, RAGExtras, RAGChatSession, RetrievedPassage, BookAccessPolicy, IngestionStage } from "@/types/books";
import { BOOKS_SEED, BOOK_CHUNKS_SEED } from "../mock-data/books";
import { TEACHERS } from "../mock-data/core";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { track } from "../analytics";
import { doubtService } from "./doubtService";

/** Chat-with-a-Book (RAG simulation) + Book Library admin. Deterministic keyword retrieval over curated DEMO passages — no model is called. */
const books: Book[] = structuredClone(BOOKS_SEED);
const chunks: DocumentChunk[] = structuredClone(BOOK_CHUNKS_SEED);
const sessions = new Map<string, RAGChatSession>();

const STOP = new Set("a an the is are was were be been of in on at to for from by with and or but if then so as it its this that these those what which who whom whose when where why how do does did can could should would will you your me my i we they them he she explain tell give about please simply mean means meant define use used using make makes show shows between difference differ compare example examples more also very much many some any not no yes into out up down over than there here have has had get got".split(" "));
const stem = (w: string) => (w.length > 4 ? w.replace(/(ing|ed|es|s|e)$/, "") : w);
export const tokenize = (q: string) => q.toLowerCase().replace(/[^a-z0-9%\- ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).map(stem);
const SCORE_THRESHOLD = 3;

function scoreChunk(c: DocumentChunk, toks: string[]): RetrievedPassage {
  const kw = new Set(c.keywords.map(stem)); const text = new Set(tokenize(c.text));
  const hits = new Set<string>(); let score = 0;
  for (const t of new Set(toks)) { if (kw.has(t)) { score += 3; hits.add(t); } else if (text.has(t)) { score += 1; hits.add(t); } }
  return { chunk: c, score, keywordHits: [...hits] };
}
export function retrieve(bookIds: string[], question: string, limit = 3): RetrievedPassage[] {
  const toks = tokenize(question);
  return chunks.filter((c) => bookIds.includes(c.bookId)).map((c) => scoreChunk(c, toks)).filter((r) => r.score >= SCORE_THRESHOLD).sort((a, b) => b.score - a.score || a.chunk.page - b.chunk.page).slice(0, limit);
}
const bestSentence = (text: string, toks: string[]) => {
  const sents = text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [text];
  return sents.map((s) => ({ s, n: tokenize(s).filter((t) => toks.includes(t)).length })).sort((a, b) => b.n - a.n)[0].s;
};
const cite = (c: DocumentChunk, toks: string[]): BookCitation => {
  const b = books.find((x) => x.id === c.bookId)!;
  return { id: uid("cit"), bookId: b.id, bookTitle: b.title, editionLabel: `${b.edition.label} · ${b.edition.version}`, chapterId: c.chapterId, chapterTitle: c.chapterTitle, page: c.page, section: c.section, passage: bestSentence(c.text, toks), chunkId: c.id, demo: true };
};
const msg = (m: Partial<RAGMessage>): RAGMessage => ({ id: uid("rm"), role: "assistant", text: "", createdAt: new Date().toISOString(), ...m });
const followUpsFor = (c: DocumentChunk) => ["Explain this more simply", ...(c.terms?.length ? ["Define the key terms"] : []), ...(c.qa?.length ? ["Give me practice questions"] : []), "Quiz me on this chapter"];

export interface AskOptions { mode?: RAGMode; contextChunkIds?: string[]; chapterId?: string; studentId?: string }

function ask(bookIds: string[], question: string, opts: AskOptions = {}): RAGMessage {
  const mode = opts.mode ?? "ask";
  const selected = books.filter((b) => bookIds.includes(b.id) && !b.access.revoked);
  const ids = selected.map((b) => b.id);
  if (!ids.length) return msg({ status: "not-found", mode, text: "No permitted book is selected, so I have nothing to search." });
  const toks = tokenize(question);
  const ctx = (opts.contextChunkIds ?? []).map((id) => chunks.find((c) => c.id === id)).filter(Boolean) as DocumentChunk[];
  let found = retrieve(ids, question, mode === "compare" ? 6 : 3);
  const vague = /\b(it|that|this|they|those|more|why|again|example|simpler|simply)\b/i.test(question) || toks.length <= 1;
  if (!found.length && ctx.length && vague) found = ctx.slice(0, 2).map((c) => ({ chunk: c, score: SCORE_THRESHOLD, keywordHits: [] }));
  // Mode-specific context fallbacks for chapter-level actions that need no topic words.
  const chapterLevel = mode === "summarise" || mode === "practice" || mode === "flashcards" || mode === "quiz" || mode === "define";
  if (!found.length && chapterLevel) {
    const base = ctx[0] ?? chunks.find((c) => ids.includes(c.bookId) && (!opts.chapterId || c.chapterId === opts.chapterId));
    if (base) found = [{ chunk: base, score: SCORE_THRESHOLD, keywordHits: [] }];
  }
  const broadenOffered = selected.some((b) => b.access.allowWiderSearch);
  if (!found.length) {
    return msg({ status: "not-found", mode, broadenOffered, text: `I couldn't find anything about this in ${selected.map((b) => `“${b.title}”`).join(" or ")}. I won't guess or cite a passage that doesn't say it. You can rephrase, search other books you're allowed to use, or send it to your teacher.` });
  }
  if (mode === "compare") {
    if (selected.length < 2) return msg({ status: "needs-two-sources", mode, text: "Comparing needs two permitted sources. Add a second book from the source picker, then ask again." });
    const per = selected.map((b) => found.find((f) => f.chunk.bookId === b.id)).filter(Boolean) as RetrievedPassage[];
    if (per.length < 2) return msg({ status: "not-found", mode, broadenOffered, text: "Only one of the selected books covers this, so a fair comparison isn't possible. I haven't cited anything for the book that doesn't mention it." });
    const [a, b] = per; const ca = cite(a.chunk, toks), cb = cite(b.chunk, toks);
    const rows = [{ aspect: "Where it appears", a: `${a.chunk.section} (p. ${a.chunk.page})`, b: `${b.chunk.section} (p. ${b.chunk.page})` }, { aspect: "What the book says", a: a.chunk.summary, b: b.chunk.summary }];
    return msg({ status: "answered", mode, text: "Here is a side-by-side view, using only what each book says.", citations: [ca, cb], segments: [{ text: a.chunk.summary, kind: "paraphrase", citationIds: [ca.id] }, { text: b.chunk.summary, kind: "paraphrase", citationIds: [cb.id] }], extras: { kind: "compare", rows, aTitle: selected[0].title, bTitle: selected[1].title }, followUps: followUpsFor(a.chunk) });
  }
  const top = found[0].chunk; const cits = found.slice(0, 2).map((f) => cite(f.chunk, toks.length ? toks : tokenize(f.chunk.keywords.join(" "))));
  const base = { status: "answered" as const, mode, citations: cits, followUps: followUpsFor(top), broadenOffered: false };
  if (mode === "summarise") {
    const chapterChunks = chunks.filter((c) => c.bookId === top.bookId && c.chapterId === top.chapterId).sort((a, b) => a.page - b.page).slice(0, 6);
    const cs = chapterChunks.map((c) => cite(c, tokenize(c.keywords.join(" "))));
    return msg({ ...base, citations: cs, text: `Summary of ${top.chapterTitle}, section by section.`, segments: chapterChunks.map((c, i) => ({ text: `${c.section}: ${c.summary}`, kind: "paraphrase", citationIds: [cs[i].id] })) });
  }
  if (mode === "define") {
    const wanted = found.flatMap((f) => f.chunk.terms ?? []).filter((t, i, arr) => arr.findIndex((x) => x.term === t.term) === i);
    const matching = wanted.filter((t) => tokenize(t.term).some((x) => toks.includes(x)));
    const items = (matching.length ? matching : wanted).slice(0, 4);
    if (!items.length) return msg({ status: "not-found", mode, text: "This passage doesn't define any key terms, and I won't invent definitions." });
    const extras: RAGExtras = { kind: "terms", items: items.map((t) => ({ ...t, citationId: (cits.find((c) => chunks.find((k) => k.id === c.chunkId)?.terms?.some((x) => x.term === t.term)) ?? cits[0]).id })) };
    return msg({ ...base, text: "Key terms as the book defines them:", extras });
  }
  if (mode === "practice" || mode === "flashcards" || mode === "quiz") {
    const pool = (found.length > 1 ? found.map((f) => f.chunk) : [top, ...chunks.filter((c) => c.chapterId === top.chapterId && c.bookId === top.bookId && c.id !== top.id)]).slice(0, 5);
    const citeFor = (c: DocumentChunk) => (cits.find((x) => x.chunkId === c.id) ?? (cits.push(cite(c, tokenize(c.keywords.join(" ")))), cits[cits.length - 1])).id;
    if (mode === "practice") {
      const items = pool.flatMap((c) => (c.qa ?? []).map((q) => ({ q: q.q, a: q.a, citationId: citeFor(c) }))).slice(0, 4);
      if (!items.length) return msg({ status: "not-found", mode, text: "This part of the book has no worked questions I can base practice on without making things up." });
      return msg({ ...base, text: "Practice questions drawn from this section. Try them first, then reveal each answer.", extras: { kind: "practice", items } });
    }
    if (mode === "flashcards") {
      const items = pool.flatMap((c) => [...(c.terms ?? []).map((t) => ({ front: t.term, back: t.definition, citationId: citeFor(c) })), ...(c.qa ?? []).slice(0, 1).map((q) => ({ front: q.q, back: q.a, citationId: citeFor(c) }))]).slice(0, 6);
      if (!items.length) return msg({ status: "not-found", mode, text: "No terms or questions in this section to turn into flashcards." });
      return msg({ ...base, text: `${items.length} flashcards ready. Save them to review later.`, extras: { kind: "flashcards", items } });
    }
    const mcq = pool.flatMap((c) => (c.qa ?? []).filter((q) => q.options).map((q) => ({ q: q.q, options: q.options!, answerIndex: q.answerIndex!, explain: q.a, citationId: citeFor(c) })));
    const allTerms = chunks.filter((c) => c.bookId === top.bookId).flatMap((c) => (c.terms ?? []).map((t) => ({ ...t, c })));
    const gen = pool.flatMap((c) => (c.terms ?? []).map((t) => { const wrong = allTerms.filter((x) => x.term !== t.term).slice(0, 3).map((x) => x.definition); const opts2 = [t.definition, ...wrong]; const rot = t.term.length % opts2.length; const arranged = [...opts2.slice(rot), ...opts2.slice(0, rot)]; return { q: `Which statement describes “${t.term}”?`, options: arranged, answerIndex: arranged.indexOf(t.definition), explain: t.definition, citationId: citeFor(c) }; }));
    const items = [...mcq, ...gen].filter((q) => q.options.length >= 3).slice(0, 4);
    if (!items.length) return msg({ status: "not-found", mode, text: "There isn't enough material here to build a fair quiz." });
    return msg({ ...base, text: `A ${items.length}-question quiz from the book. Answers are checked against the cited passage.`, extras: { kind: "quiz", items } });
  }
  // ask / explain-simply
  const segs: RAGSegment[] = [];
  if (mode === "explain-simply") {
    segs.push({ text: `In simple words: ${top.summary}`, kind: "paraphrase", citationIds: [cits[0].id] });
    if (found[1]) segs.push({ text: found[1].chunk.summary, kind: "paraphrase", citationIds: [cits[1].id] });
  } else {
    segs.push({ text: `“${cits[0].passage}”`, kind: "direct", citationIds: [cits[0].id] });
    segs.push({ text: `In other words, ${top.summary.charAt(0).toLowerCase()}${top.summary.slice(1)}`, kind: "paraphrase", citationIds: [cits[0].id] });
    if (found[1]) segs.push({ text: found[1].chunk.summary, kind: "paraphrase", citationIds: [cits[1].id] });
  }
  return msg({ ...base, text: mode === "explain-simply" ? "Here's a simpler way to see it, based on the book." : "Here is what the book says.", segments: segs });
}

const teacherForSubject = (subjectId: string) => TEACHERS.find((t) => t.subjectIds.includes(subjectId) && t.status === "active") ?? TEACHERS[0];
const advance = (id: string, stage: IngestionStage, progress: number, message?: string) => { const b = books.find((x) => x.id === id); if (!b) return; b.ingestion.stage = stage; b.ingestion.progress = progress; b.ingestion.updatedAt = new Date().toISOString(); b.ingestion.message = message; };
const synthChunks = (b: Book): DocumentChunk[] => ["Introduction", "Key ideas", "Summary"].map((sec, i) => ({ id: `${b.id}-g${i}`, bookId: b.id, chapterId: b.chapters[0]?.id ?? "ch1", chapterTitle: b.chapters[0]?.title ?? "Chapter 1", page: b.pageRange[0] + i, section: sec, text: `${sec} of ${b.title}. This passage was generated as placeholder content for a newly indexed demo upload.`, summary: `${sec} of the uploaded book (placeholder demo content).`, keywords: [sec.toLowerCase(), "demo"] }));
const finishIndexing = (id: string) => { const b = books.find((x) => x.id === id); if (!b) return; if (!chunks.some((c) => c.bookId === id)) chunks.push(...synthChunks(b)); b.ingestion.chunks = chunks.filter((c) => c.bookId === id).length; advance(id, "Indexed", 100, undefined); };
const later = (fn: () => void, ms: number) => { if (typeof window !== "undefined") setTimeout(fn, ms); else fn(); };

export const bookService = {
  // ---------- student reads ----------
  /** Books assigned to a class (any ingestion status, never revoked). Chat is only enabled for `ingestion.stage === "Indexed"`. */
  listForClass: (classId: string) => simulate(() => books.filter((b) => !b.access.revoked && b.access.classIds.includes(classId))),
  get: (id: string) => simulate(() => books.find((b) => b.id === id) ?? null),
  chapterChunks: (bookId: string) => simulate(() => chunks.filter((c) => c.bookId === bookId).sort((a, b) => a.page - b.page)),
  /** Chunks on a given page, for the source viewer. */
  page: (bookId: string, page: number) => simulate(() => ({ page, chunks: chunks.filter((c) => c.bookId === bookId && c.page === page), chapter: books.find((b) => b.id === bookId)?.chapters.find((c) => page >= c.startPage && page <= c.endPage) ?? null })),
  ask: (bookIds: string[], question: string, opts: AskOptions = {}) => simulate(() => { const m = ask(bookIds, question, opts); track("book_question_asked", { status: m.status, mode: m.mode }); for (const id of bookIds) { const b = books.find((x) => x.id === id); if (b) { b.usage.questions++; b.usage.lastUsedAt = new Date().toISOString(); } } return m; }, { ms: 650 }),
  getSession: (studentId: string, key: string) => simulate(() => sessions.get(`${studentId}:${key}`) ?? null, { ms: 40 }),
  saveSession: (studentId: string, key: string, s: RAGChatSession) => { sessions.set(`${studentId}:${key}`, structuredClone(s)); },
  clearSession: (studentId: string, key: string) => { sessions.delete(`${studentId}:${key}`); },
  /** Creates a real doubt for the subject teacher (same service the doubts screens use). */
  askTeacher: async (p: { studentId: string; bookId: string; question: string }) => {
    const b = books.find((x) => x.id === p.bookId); if (!b) throw new ServiceError("Book not found.", "unavailable");
    const t = teacherForSubject(b.subjectId);
    return doubtService.create({ studentId: p.studentId, teacherId: t.id, title: p.question.slice(0, 80), text: `${p.question}\n\n(Asked while reading “${b.title}”; the book didn't cover it.)`, subjectId: b.subjectId, context: `Chat with a Book › ${b.title}`, escalatedFromTutor: false });
  },
  feedback: (_messageId: string, _v: "helpful" | "not-helpful" | "citation-reported") => simulate(() => true, { ms: 60 }),
  retrieve: (bookIds: string[], q: string) => retrieve(bookIds, q),

  // ---------- library admin (teacher / institution Book Library) ----------
  listLibrary: () => simulate(() => [...books]),
  stats: () => simulate(() => ({ total: books.length, indexed: books.filter((b) => b.ingestion.stage === "Indexed").length, needsAttention: books.filter((b) => b.ingestion.stage === "Needs attention" || b.ingestion.stage === "Failed").length, processing: books.filter((b) => b.ingestion.stage === "Processing" || b.ingestion.stage === "Uploaded").length, questions: books.reduce((s, b) => s + b.usage.questions, 0), revoked: books.filter((b) => b.access.revoked).length })),
  /** Mock upload: Uploaded → Processing → Indexed. File names containing "scan"/"blurry" end in Needs attention; "fail"/"corrupt" end in Failed. */
  upload: (p: { title: string; subjectId: string; gradeLabel: string; fileName: string; pages?: number; licenceType?: Book["licence"]["type"]; uploadedBy: string; classIds?: string[]; author?: string; publisher?: string }) => simulate(() => {
    const id = uid("book"); const pages = p.pages ?? 24; const now = new Date().toISOString();
    const b: Book = { id, title: p.title, subjectId: p.subjectId, gradeLabel: p.gradeLabel, author: p.author ?? "Unknown author", publisher: p.publisher ?? "Uploaded by school", description: "Newly uploaded demo document.", cover: { from: "#5146E5", to: "#B8B5FF", icon: "BookOpenText" },
      edition: { id: `ed-${id}`, label: "Uploaded edition", year: 2026, isbn: "DEMO-PENDING", version: "v1.0", current: true }, chapters: [{ id: "ch1", number: 1, title: "Chapter 1", startPage: 1, endPage: pages }], pageCount: pages, pageRange: [1, pages],
      access: { level: "class", classIds: p.classIds ?? [], courseIds: [], allowDownload: false, allowWiderSearch: false, revoked: false }, licence: { holder: "Greenfield International School", type: p.licenceType ?? "Teacher-owned upload", notes: "Licence details not yet confirmed." },
      ingestion: { id: `job-${id}`, bookId: id, fileName: p.fileName, stage: "Uploaded", progress: 5, startedAt: now, updatedAt: now, pages, chunks: 0, attempts: 1 }, usage: { questions: 0, students: 0, notFoundRate: 0 }, demo: true, uploadedBy: p.uploadedBy };
    books.unshift(b);
    const f = p.fileName.toLowerCase();
    later(() => advance(id, "Processing", 45), 1200);
    later(() => { if (/fail|corrupt/.test(f)) advance(id, "Failed", 60, "The file could not be read. It may be corrupted or password-protected."); else if (/scan|blurry/.test(f)) advance(id, "Needs attention", 70, "Some pages look like low-resolution scans. Retry OCR or upload a clearer copy."); else finishIndexing(id); }, 3800);
    track("book_question_asked", { upload: id });
    return b;
  }),
  retry: (id: string) => simulate(() => { const b = books.find((x) => x.id === id); if (!b) throw new ServiceError("Book not found.", "unavailable"); b.ingestion.attempts++; advance(id, "Processing", 30); later(() => finishIndexing(id), 2600); return b; }, { ms: 200 }),
  assignToClass: (id: string, classId: string) => simulate(() => { const b = books.find((x) => x.id === id)!; if (!b.access.classIds.includes(classId)) b.access.classIds.push(classId); b.access.revoked = false; return b; }),
  removeFromClass: (id: string, classId: string) => simulate(() => { const b = books.find((x) => x.id === id)!; b.access.classIds = b.access.classIds.filter((c) => c !== classId); return b; }),
  setAccess: (id: string, patch: Partial<BookAccessPolicy>) => simulate(() => { const b = books.find((x) => x.id === id)!; b.access = { ...b.access, ...patch }; return b; }),
  setLicence: (id: string, patch: Partial<Book["licence"]>) => simulate(() => { const b = books.find((x) => x.id === id)!; b.licence = { ...b.licence, ...patch }; return b; }),
  /** Revoking removes the book from every student list immediately. */
  revoke: (id: string) => simulate(() => { const b = books.find((x) => x.id === id)!; b.access.revoked = true; return b; }),
  restore: (id: string) => simulate(() => { const b = books.find((x) => x.id === id)!; b.access.revoked = false; return b; }),
  chunks: (id: string) => simulate(() => chunks.filter((c) => c.bookId === id)),
};
export const bookRAGService = bookService;
