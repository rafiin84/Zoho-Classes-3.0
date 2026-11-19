"use client";
import { Suspense, lazy, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { resolveScreen } from "@/features/resolve";
import { useApp } from "@/stores/app-store";
import { Skeleton, EmptyState } from "@/components/ui";
import { track } from "@/lib/analytics";
import type { Role } from "@/types";

function ScreenFallback() {
  return <div className="space-y-4" role="status" aria-label="Loading screen"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-44 w-full" /><div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div></div>;
}

export function ScreenHost({ role, slug, searchParams }: { role: Role; slug: string[]; searchParams: Record<string, string> }) {
  const setRole = useApp((s) => s.setRole);
  const current = useApp((s) => s.role);
  useEffect(() => { if (current !== role) setRole(role); }, [role, current, setRole]);
  const key = slug.join("/");
  useEffect(() => { track("screen_view", { role, path: key }); }, [role, key]);
  const resolved = useMemo(() => (slug.length === 0 ? null : resolveScreen(role, slug)), [role, slug]);
  const Screen = useMemo(() => (resolved ? lazy(resolved.loader) : null), [resolved]);
  if (slug.length === 0) return <EmptyState title="Choose where to go" body="Open the first destination from the navigation." action={{ label: "Go home", href: `/${role}/${role === "student" || role === "parent" ? "home" : "overview"}` }} />;
  if (!Screen || !resolved) return <EmptyState title="This screen isn't available" body={`“${key}” doesn't exist for the ${role} experience.`} action={{ label: "Back to start", href: `/${role}/${role === "student" || role === "parent" ? "home" : "overview"}` }} />;
  return (
    <motion.div key={role + key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 30 }}>
      <Suspense fallback={<ScreenFallback />}><Screen role={role} slug={slug} params={resolved.params} searchParams={searchParams} /></Suspense>
    </motion.div>
  );
}
