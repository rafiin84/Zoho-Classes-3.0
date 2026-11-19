import type { ID } from "./index";
export interface ParentMessage { id: ID; authorRole: "parent" | "teacher"; authorId: ID; authorName: string; text: string; at: string; attachments: { name: string; kind: "doc" | "image" }[]; readByParent: boolean; readByTeacher: boolean }
export interface ParentConversation { id: ID; childId: ID; parentId: ID; teacherId: ID; teacherName: string; teacherRole: string; subjectId?: string; topic: string; messages: ParentMessage[]; createdAt: string; updatedAt: string; status: "open" | "closed" }
export interface ParentRecipient { teacherId: ID; name: string; role: string; subjectId?: string; permitted: boolean; reason?: string }
