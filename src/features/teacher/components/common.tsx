"use client";
import * as React from "react";
import Link from "next/link";
import type { UseQueryResult } from "@tanstack/react-query";
import { SkeletonCards, ErrorState, EmptyState, Card } from "@/components/ui";
import { useActors } from "@/stores/app-store";
import { TEACHERS } from "@/lib/mock-data/core";

export function useTeacher() {
  const { teacherId } = useActors();
  const t = TEACHERS.find((x) => x.id === teacherId) ?? TEACHERS[0];
  return { id: t.id, name: `${t.title} ${t.displayName}`, plain: t.displayName, color: t.avatarColor, teacher: t };
}
export const tHref = (slug: string) => `/teacher/${slug}`;
export const TLink = ({ slug, children, className }: { slug: string; children: React.ReactNode; className?: string }) => <Link href={tHref(slug)} className={className}>{children}</Link>;

/** Handles loading / error / empty for a query; renders children(data) on success. */
export function Q<T>({ q, skeleton, isEmpty, empty, children }: { q: UseQueryResult<T>; skeleton?: React.ReactNode; isEmpty?: (d: T) => boolean; empty?: React.ReactNode; children: (d: T) => React.ReactNode }) {
  if (q.isLoading) return <>{skeleton ?? <SkeletonCards n={3} h="h-24" />}</>;
  if (q.isError) return <ErrorState body={(q.error as Error)?.message || undefined} onRetry={() => q.refetch()} />;
  if (q.data === undefined) return null;
  if (isEmpty?.(q.data)) return <>{empty ?? <EmptyState title="Nothing here yet" body="There is nothing to show." />}</>;
  return <>{children(q.data)}</>;
}
export function Panel({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      {(title || action) && <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3"><h2 className="text-sm font-bold">{title}</h2>{action}</div>}
      <div className="p-4">{children}</div>
    </Card>
  );
}
/** Always-visible label that AI output is a demo draft and needs a human decision. */
export function AiNotice({ children }: { children?: React.ReactNode }) {
  return <p className="rounded-xl bg-lilac px-3 py-2 text-xs text-text-2"><strong className="text-primary">AI-generated · demo.</strong> {children ?? "No real AI model ran. Review everything — nothing publishes, grades or sends until you approve."}</p>;
}
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
export const KEYS = {
  doubts: ["t", "doubts"], grading: ["t", "grading"], attention: ["t", "attention"], classes: ["t", "classes"], roster: ["t", "roster"], courses: ["t", "courses"], course: ["t", "course"],
  assignments: ["t", "assignments"], feed: ["t", "feed"], events: ["t", "events"], moderation: ["t", "moderation"], aiTeachers: ["t", "ai-teachers"], agents: ["t", "agents"], remedial: ["t", "remedial"],
} as const;
