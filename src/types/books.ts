import type { ID, ISODate } from "./index";

/** Chat with a Book (RAG simulation) + Book Library admin contracts. All book content is DEMO content written for the prototype. */
export type IngestionStage = "Uploaded" | "Processing" | "Indexed" | "Needs attention" | "Failed";
export type BookAccessLevel = "class" | "course" | "institution" | "private";

export interface BookChapter { id: ID; number: number; title: string; startPage: number; endPage: number }
export interface BookEdition { id: ID; label: string; year: number; isbn: string; version: string; current: boolean }
export interface BookAccessPolicy {
  level: BookAccessLevel; classIds: ID[]; courseIds: ID[]; allowDownload: boolean; allowWiderSearch: boolean; revoked: boolean; expiresAt?: ISODate;
}
export interface BookLicence { holder: string; type: "Institution licence" | "Open educational resource" | "Teacher-owned upload"; seats?: number; validUntil?: ISODate; notes: string }
export interface DocumentIngestionJob { id: ID; bookId: ID; fileName: string; stage: IngestionStage; progress: number; startedAt: ISODate; updatedAt: ISODate; message?: string; pages: number; chunks: number; attempts: number }
export interface DocumentChunk { id: ID; bookId: ID; chapterId: ID; chapterTitle: string; page: number; section: string; text: string; /** Plain-language restatement used for paraphrased answers */ summary: string; keywords: string[];
  terms?: { term: string; definition: string }[]; qa?: { q: string; a: string; options?: string[]; answerIndex?: number }[] }
export interface Book {
  id: ID; title: string; subjectId: string; gradeLabel: string; author: string; publisher: string; description: string; cover: { from: string; to: string; icon: string };
  edition: BookEdition; chapters: BookChapter[]; pageCount: number; pageRange: [number, number]; access: BookAccessPolicy; licence: BookLicence; ingestion: DocumentIngestionJob;
  usage: { questions: number; students: number; lastUsedAt?: ISODate; notFoundRate: number }; demo: true; uploadedBy: string;
}
export interface BookCitation { id: ID; bookId: ID; bookTitle: string; editionLabel: string; chapterId: ID; chapterTitle: string; page: number; section: string; passage: string; chunkId: ID; demo: true }
export interface RetrievedPassage { chunk: DocumentChunk; score: number; keywordHits: string[] }
export type RAGMode = "ask" | "explain-simply" | "summarise" | "define" | "compare" | "practice" | "flashcards" | "quiz";
export interface RAGSegment { text: string; kind: "direct" | "paraphrase"; citationIds: ID[] }
export type RAGExtras =
  | { kind: "terms"; items: { term: string; definition: string; citationId: ID }[] }
  | { kind: "practice"; items: { q: string; a: string; citationId: ID }[] }
  | { kind: "flashcards"; items: { front: string; back: string; citationId: ID }[] }
  | { kind: "quiz"; items: { q: string; options: string[]; answerIndex: number; explain: string; citationId: ID }[] }
  | { kind: "compare"; rows: { aspect: string; a: string; b: string }[]; aTitle: string; bTitle: string };
export interface RAGMessage {
  id: ID; role: "user" | "assistant"; text: string; createdAt: ISODate; mode?: RAGMode; segments?: RAGSegment[]; citations?: BookCitation[];
  status?: "answered" | "not-found" | "needs-two-sources"; extras?: RAGExtras; followUps?: string[]; feedback?: "helpful" | "not-helpful" | "citation-reported"; broadenOffered?: boolean; escalatedDoubtId?: ID;
}
export interface RAGChatSession { id: ID; studentId: ID; bookIds: ID[]; messages: RAGMessage[]; createdAt: ISODate; updatedAt: ISODate; lastChunkIds: ID[] }
