export type TutorTone = "friendly" | "patient" | "encouraging" | "playful" | "formal" | "direct";
export type ExplainStyle = "simple" | "detailed" | "storytelling" | "examples" | "socratic";
export type TutorPace = "relaxed" | "steady" | "quick";
export type TutorMode = "ask" | "photo" | "homework" | "practice" | "handwritten" | "textbook";

/** Personal preferences — belong to the student, persist across institutions, never part of the school academic record. */
export interface TutorPreferences {
  name: string; avatarId: string; tone: TutorTone; style: ExplainStyle; language: string; voice: boolean; pace: TutorPace;
}
export interface TutorAvatarOption { id: string; label: string; color: string; icon: string }

export interface TutorContextChip { id: string; kind: "course" | "lesson" | "book" | "doc" | "feedback" | "topic"; label: string }
export interface TutorAttachment { id: string; kind: "image" | "doc" | "audio" | "video"; name: string; mock?: "handwritten-maths" | "textbook-page" }
export interface TutorMcq { id: string; q: string; options: string[]; answer: number; explain: string; objectiveId: string; label: string; subjectId: string }
export interface TutorSource { label: string; href?: string; kind: "course" | "lesson" | "book" | "practice" | "doubt" }

export interface TutorMessage {
  id: string; role: "user" | "tutor"; text: string; at: string;
  attachments?: TutorAttachment[];
  /** Tutor only: short answer first, then optional steps / deeper explanation. */
  steps?: string[]; explanation?: string; practice?: TutorMcq[]; sources?: TutorSource[]; notFound?: boolean; suggestions?: string[];
  offerTeacher?: boolean; lang?: string; stepMode?: boolean;
}
export interface TutorConversation { id: string; studentId: string; title: string; updatedAt: string; messages: TutorMessage[]; context: TutorContextChip[]; mode: TutorMode }
