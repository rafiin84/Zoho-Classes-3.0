export const ck = {
  assignments: (sid: string) => ["campus", "assignments", sid] as const,
  assignment: (id: string, sid: string) => ["campus", "assignment", id, sid] as const,
  exams: (sid: string) => ["campus", "exams", sid] as const,
  exam: (id: string, sid: string) => ["campus", "exam", id, sid] as const,
  attendance: (sid: string, month: string) => ["campus", "attendance", sid, month] as const,
  fees: (sid: string) => ["campus", "fees", sid] as const,
  live: ["campus", "live"] as const,
  timetable: (cid: string) => ["campus", "timetable", cid] as const,
  results: (sid: string) => ["campus", "results", sid] as const,
  books: (cid: string) => ["campus", "books", cid] as const,
};
