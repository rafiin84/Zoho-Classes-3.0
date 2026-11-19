"use client";
import { useActors } from "@/stores/app-store";
import type { Role } from "@/types";

export interface Viewer { id: string; name: string; role: Role; color: string }

const PEOPLE: Record<string, { name: string; color: string }> = {
  "stu-ananya": { name: "Ananya Rao", color: "#5146E5" },
  "stu-kabir": { name: "Kabir Mehta", color: "#7044D8" },
  "stu-meera": { name: "Meera Iyer", color: "#1D6FB8" },
};

/** The currently signed-in student as a feed viewer. */
export function useViewer(): Viewer {
  const { studentId } = useActors();
  const p = PEOPLE[studentId] ?? { name: "Student", color: "#5146E5" };
  return { id: studentId, name: p.name, role: "student", color: p.color };
}
