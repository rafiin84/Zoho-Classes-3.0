"use client";
import * as React from "react";
import Link from "next/link";
import type { UseQueryResult } from "@tanstack/react-query";
import { Eye } from "@phosphor-icons/react";
import { useActors } from "@/stores/app-store";
import { STUDENTS, subjectById } from "@/lib/mock-data/core";
import { ErrorState, Skeleton, SkeletonCards, Card } from "@/components/ui";
import type { Role } from "@/types";

/** Resolves "whose data am I looking at": the student themself, or the parent's currently selected child. */
export function useSubject(role: Role) {
  const a = useActors();
  const studentId = role === "parent" ? a.childId : a.studentId;
  const student = STUDENTS.find((s) => s.id === studentId) ?? STUDENTS[0];
  return { studentId, student, classId: student.classId, firstName: student.displayName.split(" ")[0], isParent: role === "parent", parentId: a.parentId, base: `/${role}` };
}
export const subjectOf = (id: string) => subjectById(id);

export interface CampusProps { studentId: string; mode: "student" | "parent" }

/** Standard loading / error / success wrapper. `empty` decides when to render the empty node instead. */
export function Boundary<T>({ q, skeleton, children, empty, isEmpty }: { q: UseQueryResult<T | null>; skeleton?: React.ReactNode; children: (d: T) => React.ReactNode; empty?: React.ReactNode; isEmpty?: (d: T) => boolean }) {
  if (q.isLoading) return <>{skeleton ?? <SkeletonCards n={3} />}</>;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} body={(q.error as Error)?.message || undefined} />;
  if (q.data === undefined || q.data === null) return <>{empty ?? null}</>;
  if (isEmpty?.(q.data as T)) return <>{empty}</>;
  return <>{children(q.data as T)}</>;
}

/** Shown on parent screens so it is always clear which child's records are on screen. */
export function ChildContext({ name, what }: { name: string; what: string }) {
  return (
    <div role="status" className="mb-4 flex items-center gap-2 rounded-2xl bg-lilac px-4 py-2.5 text-sm text-primary">
      <Eye size={18} weight="duotone" /> <span>Showing <strong>{name}</strong>&apos;s {what}. Switch child from the top bar; nothing here is mixed between children.</span>
    </div>
  );
}
export const ScreenSkeleton = () => (
  <div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-12 w-full" /><SkeletonCards n={3} h="h-28" /></div>
);
export function SubjectChip({ subjectId, className }: { subjectId: string; className?: string }) {
  const s = subjectById(subjectId);
  return <span className={`inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold ${className ?? ""}`}><span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />{s.name}</span>;
}
export const BackLink = ({ href, label }: { href: string; label: string }) => <Link href={href} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">← {label}</Link>;
export const Panel = ({ children, className }: { children: React.ReactNode; className?: string }) => <Card className={className}><div className="p-4 sm:p-5">{children}</div></Card>;
