"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle, GraduationCap, ChatCircleDots, Trophy, Lightning, Megaphone, Receipt, VideoCamera, ShieldCheck, Gear } from "@phosphor-icons/react";
import { notificationService } from "@/lib/api";
import { useApp, useActors } from "@/stores/app-store";
import { relTime } from "@/lib/format";
import { Button, EmptyState, ErrorState, Segmented, SkeletonCards, cn } from "@/components/ui";
import type { AppNotification } from "@/types";

const catMeta: Record<AppNotification["category"], { label: string; icon: any }> = {
  academic: { label: "Academic", icon: GraduationCap }, communication: { label: "Messages", icon: ChatCircleDots }, events: { label: "Events", icon: Trophy },
  learning: { label: "Learning", icon: Lightning }, institution: { label: "Institution", icon: Megaphone }, finance: { label: "Finance", icon: Receipt },
  live: { label: "Live classes", icon: VideoCamera }, governance: { label: "Governance", icon: ShieldCheck },
};

export function useNotifications() {
  const role = useApp((s) => s.role);
  const { studentId, childId } = useActors();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications", role, role === "parent" ? childId : studentId], queryFn: () => notificationService.list(role, { recipientId: studentId, childId }), refetchInterval: 15000 });
  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  return { ...q, unread: (q.data ?? []).filter((n) => !n.read).length, refresh, role };
}

export function NotificationsList({ compact, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const { data, isLoading, isError, refetch, refresh, role } = useNotifications();
  const [cat, setCat] = useState<string>("all");
  const hidePreview = role === "parent";
  const list = useMemo(() => (data ?? []).filter((n) => cat === "all" || n.category === cat), [data, cat]);
  const startToday = new Date("2026-11-19T00:00:00+05:30");
  const today = list.filter((n) => new Date(n.at) >= startToday);
  const earlier = list.filter((n) => !today.includes(n));
  const open = async (n: AppNotification) => { await notificationService.markRead(n.id); refresh(); onNavigate?.(); if (n.href) router.push(n.href); };
  const cats = useMemo(() => Array.from(new Set((data ?? []).map((n) => n.category))), [data]);

  if (isLoading) return <SkeletonCards n={4} h="h-16" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  const Group = ({ title, items }: { title: string; items: AppNotification[] }) => items.length === 0 ? null : (
    <section aria-label={title}>
      <h3 className="text-label mb-2 mt-4 text-text-2">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((n) => { const M = catMeta[n.category]; return (
          <li key={n.id}>
            <button onClick={() => open(n)} className={cn("flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-surface-2", !n.read && "bg-lilac/60")}>
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-soft"><M.icon size={18} weight="duotone" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{n.title}</span>{!n.read && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}</span>
                <span className="block truncate text-xs text-text-2">{hidePreview && n.private ? "Open to view details (private preview hidden)" : n.body}</span>
                <span className="mt-0.5 block text-[11px] text-text-2">{M.label} · {relTime(n.at)}</span>
              </span>
            </button>
          </li>); })}
      </ul>
    </section>
  );
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Segmented label="notif-cat" value={cat} onChange={setCat} options={[{ value: "all", label: "All" }, ...cats.map((c) => ({ value: c, label: catMeta[c as keyof typeof catMeta].label }))]} />
        {!compact && <Button variant="ghost" size="sm" onClick={async () => { await notificationService.markAllRead(role); refresh(); }}><CheckCircle size={16} />Mark all read</Button>}
      </div>
      {list.length === 0 ? <EmptyState icon={<Bell size={28} weight="duotone" />} title="You're all caught up" body="New updates from your school, teachers and community will appear here." /> : <><Group title="Today" items={today} /><Group title="Earlier" items={earlier} /></>}
      {!compact && <p className="mt-6 flex items-center gap-1.5 text-xs text-text-2"><Gear size={14} />Notification preferences are under profile menu → Preferences.</p>}
    </div>
  );
}
