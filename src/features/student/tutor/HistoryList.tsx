"use client";
import { useState } from "react";
import { ChatCircleText, Plus, Trash } from "@phosphor-icons/react";
import { Button, ConfirmDialog, ListToolbar, cn } from "@/components/ui";
import { relTime } from "@/lib/format";
import type { TutorConversation } from "@/types/tutor";

export function HistoryList({ items, activeId, onOpen, onNew, onDelete }: { items: TutorConversation[]; activeId?: string; onOpen: (id: string) => void; onNew: () => void; onDelete: (id: string) => void }) {
  const [q, setQ] = useState(""); const [del, setDel] = useState<string | null>(null);
  const list = items.filter((c) => !q || c.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={onNew}><Plus size={16} weight="bold" />New conversation</Button>
      <ListToolbar query={q} onQuery={setQ} placeholder="Search chats" count={list.length} />
      {items.length === 0 ? <p className="rounded-2xl bg-surface-2 p-4 text-sm text-text-2">No conversations yet. Ask your first question — your chats are saved here.</p> :
        list.length === 0 ? <p className="text-sm text-text-2">No chats match “{q}”.</p> :
        <ul className="space-y-1">{list.map((c) => (
          <li key={c.id} className="group flex items-center gap-1">
            <button type="button" onClick={() => onOpen(c.id)} className={cn("flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-3 py-2 text-left hover:bg-surface-2", activeId === c.id && "bg-lilac")}>
              <ChatCircleText size={18} className="shrink-0 text-primary" /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{c.title}</span><span className="block text-xs text-text-2">{relTime(c.updatedAt)}</span></span>
            </button>
            <Button variant="ghost" size="iconSm" aria-label={`Delete ${c.title}`} onClick={() => setDel(c.id)}><Trash size={16} /></Button>
          </li>))}</ul>}
      <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)} title="Delete this conversation?" body="It will be removed from your history. This can’t be undone." confirmLabel="Delete" destructive onConfirm={() => del && onDelete(del)} />
    </div>
  );
}
