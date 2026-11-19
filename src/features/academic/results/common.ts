import { STUDENTS } from "@/lib/mock-data/core";
export const studentName = (id: string) => STUDENTS.find((s) => s.id === id)?.displayName ?? id;
