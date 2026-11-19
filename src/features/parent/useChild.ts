"use client";
import { useActors } from "@/stores/app-store";
import { STUDENTS, PARENTS } from "@/lib/mock-data/core";

export function useChild() {
  const { childId, parentId } = useActors();
  const child = STUDENTS.find((s) => s.id === childId) ?? STUDENTS[0];
  const parent = PARENTS.find((p) => p.id === parentId) ?? PARENTS[0];
  const siblings = STUDENTS.filter((s) => parent.childIds.includes(s.id));
  return { childId: child.id, child, first: child.displayName.split(" ")[0], parent, parentId, siblings };
}
