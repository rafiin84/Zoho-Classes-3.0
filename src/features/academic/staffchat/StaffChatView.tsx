"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, PaperPlaneRight, Paperclip, PushPin, BellSlash, Bell, EnvelopeSimple, Users, Hash, Lock, MagnifyingGlass, ArrowBendUpLeft, Smiley, X, ArrowLeft, CalendarBlank, Exam, BookBookmark, VideoCamera, Heartbeat, FilePdf, LinkSimple, Megaphone } from "@phosphor-icons/react";
import { Avatar, Badge, Button, Checkbox, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Segmented, Select, Skeleton, Textarea, toast, cn } from "@/components/ui";
import { useActors } from "@/stores/app-store";
import { staffChatService, staffViewerId } from "@/lib/api/staffChatService";
import { staffById } from "@/lib/mock-data/staffChat";
import { relTime } from "@/lib/format";
import type { Role } from "@/types";
import type { ConversationView, StaffMessage, ShareCard, StaffPresence, MessageAttachment } from "@/types/staffChat";

const PRES: Record<StaffPresence, { label: string; cls: string }> = { available: { label: "Available", cls: "bg-success" }, "in-class": { label: "In class", cls: "bg-warning" }, away: { label: "Away", cls: "bg-highlight" }, offline: { label: "Offline", cls: "bg-border" } };
const Dot = ({ p }: { p: StaffPresence }) => <span className={cn("inline-block size-2.5 rounded-full", PRES[p].cls)} title={PRES[p].label} aria-label={PRES[p].label} />;
const CARDS: { kind: ShareCard["kind"]; label: string; card: ShareCard; icon: React.ReactNode }[] = [
  { kind: "course", label: "Course", icon: <BookBookmark size={16} />, card: { kind: "course", title: "Fractions & Decimals, Made Friendly", subtitle: "Course · Grade 8 Maths", href: "/teacher/courses" } },
  { kind: "timetable", label: "Timetable", icon: <CalendarBlank size={16} />, card: { kind: "timetable", title: "Grade 8B weekly timetable", subtitle: "Published v1", href: "/teacher/timetable" } },
  { kind: "meeting", label: "Meeting", icon: <VideoCamera size={16} />, card: { kind: "meeting", title: "Maths office hours", subtitle: "Live class · Saturday 4 PM", href: "/teacher/live-classes" } },
  { kind: "assessment", label: "Assessment", icon: <Exam size={16} />, card: { kind: "assessment", title: "Term 2 internal assessment", subtitle: "Grade 8 · 50 marks", href: "/teacher/assessments" } },
  { kind: "student-support", label: "Student-support reference", icon: <Heartbeat size={16} />, card: { kind: "student-support", title: "Support plan reference SP-114", subtitle: "Reference only. No student details shared here.", href: "/teacher/classes" } },
];
const KIND_ICON = { direct: null, department: Hash, team: Hash, announcement: Megaphone, group: Users } as const;
const MOCK_FILES: MessageAttachment[] = [{ id: "f1", name: "Term2-moderation-notes.pdf", kind: "pdf", sizeKb: 212 }, { id: "f2", name: "Marks-entry-template.xlsx", kind: "sheet", sizeKb: 64 }];

export default function StaffChatView({ role }: { role: Role }) {
  const actors = useActors();
  const viewer = staffViewerId(role === "institution" ? "institution" : "teacher", actors.teacherId);
  const qc = useQueryClient();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "unread" | "channels" | "direct">("all");
  const [q, setQ] = React.useState("");
  const [newOpen, setNewOpen] = React.useState(false);
  const [mobileDetail, setMobileDetail] = React.useState(false);

  const list = useQuery({ queryKey: ["staff-chat", "convs", viewer], queryFn: () => staffChatService.listConversations(viewer), refetchInterval: 2500 });
  const global = useQuery({ queryKey: ["staff-chat", "search", viewer, q], queryFn: () => staffChatService.search(viewer, q), enabled: q.trim().length > 1 });
  const refresh = () => qc.invalidateQueries({ queryKey: ["staff-chat"] });
  const convs = list.data ?? [];
  const shown = convs.filter((c) => (filter === "all" || (filter === "unread" && (c.unread > 0 || c.markedUnread)) || (filter === "channels" && c.kind !== "direct") || (filter === "direct" && c.kind === "direct")) && (!q.trim() || c.title.toLowerCase().includes(q.toLowerCase())));
  const active = convs.find((c) => c.id === activeId) ?? null;
  const unreadTotal = convs.reduce((a, c) => a + (c.muted ? 0 : c.unread), 0);
  const open = (id: string) => { setActiveId(id); setMobileDetail(true); };

  return (
    <div>
      <PageHeader title="Staff Chat" subtitle="Internal staff conversations. Never visible to students or parents; separate from student doubts and parent messages." eyebrow={<Badge tone="info" icon={<Lock size={12} />}>Staff only</Badge>}
        actions={<><Badge tone={unreadTotal ? "primary" : "neutral"}>{unreadTotal} unread</Badge><Button size="sm" onClick={() => setNewOpen(true)}><Plus size={16} />New chat</Button></>} />
      <div className="grid gap-3 lg:grid-cols-[320px_1fr]" style={{ minHeight: "68dvh" }}>
        <aside className={cn("rounded-2xl border border-border bg-surface p-3", mobileDetail && "hidden lg:block")} aria-label="Conversations">
          <div className="relative mb-2"><MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-2" /><input aria-label="Search conversations and messages" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats and messages" className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-8 text-sm" />{q && <button aria-label="Clear search" onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-2"><X size={14} /></button>}</div>
          <Segmented label="Chat filter" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "unread", label: "Unread" }, { value: "channels", label: "Channels" }, { value: "direct", label: "Direct" }]} className="mb-2" />
          {list.isLoading ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div> : list.isError ? <ErrorState onRetry={() => list.refetch()} /> : (
            <ul className="space-y-1">
              {shown.map((c) => <ConvRow key={c.id} c={c} viewer={viewer} active={c.id === activeId} onOpen={() => open(c.id)} />)}
              {!shown.length && <li className="py-6 text-center text-sm text-text-2">{filter === "unread" ? "You are all caught up." : "No conversations match."}</li>}
            </ul>
          )}
          {q.trim().length > 1 && (
            <div className="mt-3 border-t border-border pt-2"><p className="mb-1 text-xs font-semibold text-text-2">Messages matching “{q}” ({global.data?.length ?? 0})</p>
              <ul className="space-y-1">{global.data?.slice(0, 6).map((m) => { const c = convs.find((x) => x.id === m.conversationId); return <li key={m.id}><button onClick={() => open(m.conversationId)} className="w-full rounded-lg p-2 text-left text-xs hover:bg-surface-2"><span className="font-semibold">{c?.title}</span> · {staffById(m.authorId)?.name}<br /><span className="line-clamp-2 text-text-2">{m.text}</span></button></li>; })}</ul></div>
          )}
        </aside>
        <section className={cn("min-w-0 rounded-2xl border border-border bg-surface", !mobileDetail && "hidden lg:block")}>
          {active ? <Conversation key={active.id} c={active} viewer={viewer} onBack={() => setMobileDetail(false)} refresh={refresh} /> : <div className="p-6"><EmptyState icon={<EnvelopeSimple size={28} weight="duotone" />} title="Select a conversation" body="Pick a colleague, department channel or team to read messages. Staff announcements are posted by administrators and are not official circulars." /></div>}
        </section>
      </div>
      <NewChat open={newOpen} onOpenChange={setNewOpen} viewer={viewer} onCreated={(id) => { refresh(); open(id); }} />
    </div>
  );
}

function ConvRow({ c, viewer, active, onOpen }: { c: ConversationView; viewer: string; active: boolean; onOpen: () => void }) {
  const other = c.kind === "direct" ? staffById(c.memberIds.find((x) => x !== viewer) ?? "") : null;
  const Ic = KIND_ICON[c.kind];
  const unread = c.unread > 0 || c.markedUnread;
  return (
    <li><button onClick={onOpen} aria-current={active} className={cn("flex w-full items-center gap-2.5 rounded-xl p-2 text-left", active ? "bg-lilac" : "hover:bg-surface-2")}>
      {other ? <span className="relative"><Avatar name={other.name} color={other.color} size={34} /><span className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-surface"><Dot p={other.presence} /></span></span> : <span className="flex size-[34px] items-center justify-center rounded-xl bg-surface-2 text-text-2">{Ic && <Ic size={18} />}</span>}
      <span className="min-w-0 flex-1"><span className={cn("flex items-center gap-1 truncate text-sm", unread ? "font-bold" : "font-medium")}>{c.title}{c.muted && <BellSlash size={12} className="text-text-2" aria-label="Muted" />}</span>
        <span className="block truncate text-xs text-text-2">{c.lastMessage ? `${c.lastMessage.authorId === viewer ? "You" : staffById(c.lastMessage.authorId)?.name.split(" ").slice(-1)[0]}: ${c.lastMessage.text || "Attachment"}` : "No messages yet"}</span></span>
      <span className="flex shrink-0 flex-col items-end gap-1"><span className="text-[10px] text-text-2">{relTime(c.lastAt)}</span>{unread && <span className="tnum min-w-5 rounded-full bg-primary px-1.5 text-center text-[11px] font-bold text-primary-fg" aria-label={`${c.unread || 1} unread`}>{c.unread || "•"}</span>}</span>
    </button></li>
  );
}

function Conversation({ c, viewer, onBack, refresh }: { c: ConversationView; viewer: string; onBack: () => void; refresh: () => void }) {
  const msgs = useQuery({ queryKey: ["staff-chat", "msgs", c.id], queryFn: () => staffChatService.messages(c.id, viewer), refetchInterval: 2000 });
  const [thread, setThread] = React.useState<StaffMessage | null>(null);
  const [info, setInfo] = React.useState(false);
  const [find, setFind] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);
  const all = msgs.data ?? [];
  const top = all.filter((m) => !m.parentId && (!find.trim() || m.text.toLowerCase().includes(find.toLowerCase())));
  const lastId = all.at(-1)?.id;
  React.useEffect(() => { if (c.unread > 0 || c.markedUnread) staffChatService.markRead(c.id, viewer).then(refresh); }, [c.id, lastId, c.unread, c.markedUnread]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [lastId]);
  const act = useMutation({ mutationFn: async (fn: () => Promise<unknown>) => fn(), onSuccess: () => { refresh(); msgs.refetch(); } });
  const other = c.kind === "direct" ? staffById(c.memberIds.find((x) => x !== viewer) ?? "") : null;
  const pinned = all.filter((m) => c.pinnedMessageIds.includes(m.id));
  return (
    <div className="flex h-full min-h-[68dvh] flex-col">
      <header className="flex items-center gap-2 border-b border-border p-3">
        <Button variant="ghost" size="iconSm" className="lg:hidden" aria-label="Back to conversations" onClick={onBack}><ArrowLeft size={18} /></Button>
        <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{c.title}</h2><p className="truncate text-xs text-text-2">{other ? <><Dot p={other.presence} /> {PRES[other.presence].label} · {other.title}</> : `${c.memberIds.length} members${c.channel ? ` · ${c.channel.category}` : ""}`}</p></div>
        <input aria-label="Search in this conversation" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find in chat" className="hidden h-9 w-40 rounded-full border border-border bg-surface px-3 text-sm sm:block" />
        <Button variant="ghost" size="iconSm" aria-label="Mark as unread" title="Mark as unread" onClick={() => act.mutate(() => staffChatService.markUnread(c.id, viewer).then(() => toast.info("Marked unread")))}><EnvelopeSimple size={18} /></Button>
        <Button variant="ghost" size="iconSm" aria-label={c.muted ? "Unmute" : "Mute"} aria-pressed={c.muted} title={c.muted ? "Unmute" : "Mute"} onClick={() => act.mutate(() => staffChatService.setMuted(c.id, viewer, !c.muted).then(() => toast.success(c.muted ? "Unmuted" : "Muted")))}>{c.muted ? <BellSlash size={18} /> : <Bell size={18} />}</Button>
        <Button variant={info ? "soft" : "ghost"} size="iconSm" aria-label="Details and members" aria-pressed={info} onClick={() => setInfo(!info)}><Users size={18} /></Button>
      </header>
      {c.kind === "announcement" && <p className="flex items-center gap-2 bg-info-soft px-3 py-1.5 text-xs text-info"><Megaphone size={14} />Staff announcements channel. This is internal; it is not an official circular to students or parents.</p>}
      {pinned.length > 0 && <div className="flex items-start gap-2 border-b border-border bg-surface-2 px-3 py-1.5 text-xs"><PushPin size={14} className="mt-0.5 shrink-0 text-primary" /><div className="min-w-0"><span className="font-semibold">Pinned:</span> {pinned.map((p) => p.text.slice(0, 80)).join(" · ")}</div></div>}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto p-3" style={{ maxHeight: "54dvh" }} aria-live="polite" aria-label="Messages">
            {msgs.isLoading && <><Skeleton className="h-14" /><Skeleton className="h-14" /></>}
            {msgs.isError && <ErrorState onRetry={() => msgs.refetch()} />}
            {!msgs.isLoading && !top.length && <EmptyState title={find ? "No messages match" : "No messages yet"} body={find ? "Try a different word." : "Say hello to start the conversation."} />}
            {top.map((m) => <Message key={m.id} m={m} viewer={viewer} pinned={c.pinnedMessageIds.includes(m.id)} replies={all.filter((r) => r.parentId === m.id).length} onThread={() => setThread(m)}
              onReact={(e) => act.mutate(() => staffChatService.react(m.id, viewer, e))} onPin={() => act.mutate(() => staffChatService.togglePin(c.id, m.id).then(() => toast.success("Pin updated")))} />)}
            <div ref={endRef} />
          </div>
          <Composer c={c} viewer={viewer} onSent={() => { refresh(); msgs.refetch(); }} />
        </div>
        {thread && <ThreadPane root={thread} all={all} viewer={viewer} c={c} onClose={() => setThread(null)} onSent={() => { refresh(); msgs.refetch(); }} />}
        {info && <InfoPane c={c} viewer={viewer} onPrefs={(p) => act.mutate(() => staffChatService.setPrefs(c.id, viewer, p).then(() => toast.success("Notification preference saved")))} />}
      </div>
    </div>
  );
}

function renderText(t: string) {
  return t.split(/(@\w+|https?:\/\/\S+)/g).map((p, i) => p.startsWith("@") ? <span key={i} className="rounded bg-lilac px-1 font-semibold text-primary">{p}</span> : p.startsWith("http") ? <span key={i} className="text-primary underline">{p}</span> : p);
}
function Message({ m, viewer, pinned, replies, onThread, onReact, onPin, compact }: { m: StaffMessage; viewer: string; pinned?: boolean; replies?: number; onThread?: () => void; onReact?: (e: string) => void; onPin?: () => void; compact?: boolean }) {
  const a = staffById(m.authorId); const mine = m.authorId === viewer;
  return (
    <article className="group flex gap-2.5" aria-label={`Message from ${a?.name}`}>
      <Avatar name={a?.name ?? "?"} color={a?.color} size={32} />
      <div className="min-w-0 flex-1">
        <p className="text-xs"><span className="font-semibold">{mine ? "You" : a?.name}</span> <span className="text-text-2">{relTime(m.at)}</span>{m.simulated && <Badge className="ml-1" tone="neutral">Demo auto-reply</Badge>}{pinned && <PushPin size={12} className="ml-1 inline text-primary" aria-label="Pinned" />}</p>
        {m.text && <p className="whitespace-pre-wrap break-words text-sm">{renderText(m.text)}</p>}
        {m.link && <a href={m.link.url} onClick={(e) => e.preventDefault()} className="mt-1 flex max-w-sm items-center gap-2 rounded-lg border border-border p-2 text-xs"><LinkSimple size={16} className="text-primary" /><span><span className="font-semibold">{m.link.title}</span><br /><span className="text-text-2">{m.link.site} · preview (demo)</span></span></a>}
        {m.attachments.map((f) => <div key={f.id} className="mt-1 flex max-w-sm items-center gap-2 rounded-lg border border-border bg-surface-2 p-2 text-xs"><FilePdf size={18} className="text-primary" /><span className="min-w-0 flex-1 truncate font-medium">{f.name}</span><span className="tnum text-text-2">{f.sizeKb} KB</span></div>)}
        {m.card && <a href={m.card.href} className="mt-1 block max-w-sm rounded-xl border border-border bg-lilac/50 p-2.5 text-xs"><Badge tone="primary">{m.card.kind.replace("-", " ")}</Badge><p className="mt-1 text-sm font-semibold">{m.card.title}</p><p className="text-text-2">{m.card.subtitle}</p></a>}
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {m.reactions.map((r) => <button key={r.emoji} onClick={() => onReact?.(r.emoji)} aria-pressed={r.userIds.includes(viewer)} aria-label={`${r.emoji} ${r.userIds.length}`} className={cn("tnum rounded-full border px-2 py-0.5 text-xs", r.userIds.includes(viewer) ? "border-primary bg-lilac" : "border-border")}>{r.emoji} {r.userIds.length}</button>)}
          {!compact && <span className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {["👍", "✅", "🙏"].map((e) => <button key={e} onClick={() => onReact?.(e)} aria-label={`React ${e}`} className="rounded-full px-1.5 py-0.5 text-xs hover:bg-surface-2"><Smiley size={0} />{e}</button>)}
            <button onClick={onThread} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-text-2 hover:bg-surface-2"><ArrowBendUpLeft size={13} />Reply{replies ? ` (${replies})` : ""}</button>
            <button onClick={onPin} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-text-2 hover:bg-surface-2"><PushPin size={13} />{pinned ? "Unpin" : "Pin"}</button>
          </span>}
        </div>
      </div>
    </article>
  );
}

function Composer({ c, viewer, onSent, parentId }: { c: ConversationView; viewer: string; onSent: () => void; parentId?: string }) {
  const [text, setText] = React.useState("");
  const [files, setFiles] = React.useState<MessageAttachment[]>([]);
  const [card, setCard] = React.useState<ShareCard | undefined>();
  const [menu, setMenu] = React.useState(false);
  const send = useMutation({ mutationFn: () => staffChatService.send({ conversationId: c.id, viewer, text, parentId, attachments: files, card }), onSuccess: () => { setText(""); setFiles([]); setCard(undefined); onSent(); }, onError: (e: Error) => toast.error(e.message) });
  if (!c.canPost) return <div className="flex items-center gap-2 border-t border-border bg-surface-2 p-3 text-sm text-text-2"><Lock size={16} />This channel is read-only for you. Only administrators can post here.</div>;
  const members = c.memberIds.filter((x) => x !== viewer).map((x) => staffById(x)!).filter(Boolean);
  const canSend = (text.trim() || files.length || card) && !send.isPending;
  return (
    <div className="border-t border-border p-2.5">
      {(files.length > 0 || card) && <div className="mb-2 flex flex-wrap gap-1.5">{files.map((f) => <Badge key={f.id} tone="neutral">{f.name}<button aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((x) => x.id !== f.id))}><X size={11} /></button></Badge>)}{card && <Badge tone="primary">Card: {card.title}<button aria-label="Remove card" onClick={() => setCard(undefined)}><X size={11} /></button></Badge>}</div>}
      <div className="flex items-end gap-1.5">
        <div className="relative">
          <Button variant="ghost" size="iconSm" aria-label="Attach or share" aria-expanded={menu} onClick={() => setMenu(!menu)}><Paperclip size={18} /></Button>
          {menu && <div className="absolute bottom-11 left-0 z-20 w-64 rounded-xl border border-border bg-surface p-1.5 text-sm shadow-glow" role="menu">
            <p className="px-2 py-1 text-xs font-semibold text-text-2">Attach file (mock)</p>
            {MOCK_FILES.map((f) => <button role="menuitem" key={f.id} onClick={() => { if (!files.find((x) => x.id === f.id)) setFiles([...files, f]); setMenu(false); }} className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-surface-2">{f.name}</button>)}
            <p className="px-2 py-1 text-xs font-semibold text-text-2">Share card</p>
            {CARDS.map((x) => <button role="menuitem" key={x.kind} onClick={() => { setCard(x.card); setMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2">{x.icon}{x.label}</button>)}
          </div>}
        </div>
        <textarea aria-label={parentId ? "Reply" : "Message"} value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder={`Message ${c.title}. Use @name to mention`}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (canSend) send.mutate(); } }} className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-border bg-surface px-3 py-2 text-sm" />
        <Button size="icon" aria-label="Send message" disabled={!canSend} loading={send.isPending} onClick={() => send.mutate()}><PaperPlaneRight size={18} /></Button>
      </div>
      {members.length > 0 && c.kind !== "direct" && <p className="mt-1 flex flex-wrap gap-1 text-[11px] text-text-2">Mention: {members.slice(0, 5).map((s) => <button key={s.id} className="rounded bg-lilac px-1 font-semibold text-primary" onClick={() => setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}@${s.name.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s/, "").split(" ")[0]} `)}>@{s.name.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s/, "").split(" ")[0]}</button>)}</p>}
    </div>
  );
}

function ThreadPane({ root, all, viewer, c, onClose, onSent }: { root: StaffMessage; all: StaffMessage[]; viewer: string; c: ConversationView; onClose: () => void; onSent: () => void }) {
  const rs = all.filter((m) => m.parentId === root.id);
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l border-border md:flex" aria-label="Thread">
      <div className="flex items-center justify-between border-b border-border p-2.5"><h3 className="text-sm font-semibold">Thread ({rs.length})</h3><Button variant="ghost" size="iconSm" aria-label="Close thread" onClick={onClose}><X size={16} /></Button></div>
      <div className="flex-1 space-y-3 overflow-y-auto p-2.5" style={{ maxHeight: "44dvh" }}><Message m={root} viewer={viewer} compact />{rs.map((r) => <Message key={r.id} m={r} viewer={viewer} compact />)}</div>
      <Composer c={c} viewer={viewer} parentId={root.id} onSent={onSent} />
    </aside>
  );
}

function InfoPane({ c, viewer, onPrefs }: { c: ConversationView; viewer: string; onPrefs: (p: { level: "all" | "mentions" | "none"; digest: boolean }) => void }) {
  return (
    <aside className="w-64 shrink-0 space-y-4 overflow-y-auto border-l border-border p-3 text-sm" aria-label="Conversation details">
      {c.channel && <div><h3 className="text-xs font-semibold uppercase text-text-2">About</h3><p className="mt-1">{c.channel.description}</p><p className="mt-1 text-xs text-text-2">Posting: {c.channel.postPolicy === "admins-only" ? "administrators only" : "all members"}</p></div>}
      <div><h3 className="mb-1 text-xs font-semibold uppercase text-text-2">Members ({c.memberIds.length})</h3><ul className="space-y-1.5">{c.memberIds.map((id) => { const s = staffById(id); return s && <li key={id} className="flex items-center gap-2"><Avatar name={s.name} color={s.color} size={26} /><span className="min-w-0 flex-1 truncate">{s.name}{id === viewer && " (you)"}<br /><span className="text-xs text-text-2">{s.title}</span></span><Dot p={s.presence} /></li>; })}</ul></div>
      <div className="space-y-2"><h3 className="text-xs font-semibold uppercase text-text-2">Notifications</h3>
        <Field label="Notify me for" htmlFor="np"><Select id="np" value={c.prefs.level} onChange={(e) => onPrefs({ ...c.prefs, level: e.target.value as "all" })}><option value="all">All messages</option><option value="mentions">Mentions only</option><option value="none">Nothing</option></Select></Field>
        <Checkbox checked={c.prefs.digest} onChange={(v) => onPrefs({ ...c.prefs, digest: v })} label="Include in daily digest" /></div>
    </aside>
  );
}

function NewChat({ open, onOpenChange, viewer, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; viewer: string; onCreated: (id: string) => void }) {
  const staff = useQuery({ queryKey: ["staff-chat", "staff"], queryFn: staffChatService.staff });
  const [mode, setMode] = React.useState<"direct" | "group">("direct");
  const [sel, setSel] = React.useState<string[]>([]);
  const [name, setName] = React.useState(""); const [desc, setDesc] = React.useState("");
  const [err, setErr] = React.useState("");
  const others = (staff.data ?? []).filter((s) => s.id !== viewer);
  const go = useMutation({
    mutationFn: () => mode === "direct" ? staffChatService.createDirect(viewer, sel[0]) : staffChatService.createGroup(viewer, name, desc, sel),
    onSuccess: (id) => { toast.success(mode === "direct" ? "Conversation opened" : "Group created"); onCreated(id); onOpenChange(false); setSel([]); setName(""); setDesc(""); setErr(""); },
    onError: (e: Error) => setErr(e.message),
  });
  const submit = () => { if (!sel.length) return setErr("Choose at least one colleague."); if (mode === "direct" && sel.length > 1) return setErr("Direct chats are one-to-one."); setErr(""); go.mutate(); };
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New staff chat" description="Only staff colleagues are listed. Students and parents cannot be added."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button loading={go.isPending} onClick={submit}>{mode === "direct" ? "Open chat" : "Create group"}</Button></>}>
      <div className="space-y-3">
        <Segmented label="Chat type" value={mode} onChange={(v) => { setMode(v); setSel([]); setErr(""); }} options={[{ value: "direct", label: "One-to-one" }, { value: "group", label: "Project or committee group" }]} />
        {mode === "group" && <><Field label="Group name" required htmlFor="gn"><Input id="gn" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Science fair planning" /></Field><Field label="Description" optional htmlFor="gd"><Textarea id="gd" value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-16" /></Field></>}
        <fieldset><legend className="mb-1 text-sm font-semibold">{mode === "direct" ? "Colleague" : "Members"}</legend>
          <ul className="max-h-56 space-y-1 overflow-y-auto">{others.map((s) => <li key={s.id}><label className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 hover:bg-surface-2"><input type={mode === "direct" ? "radio" : "checkbox"} name="m" checked={sel.includes(s.id)} onChange={() => setSel(mode === "direct" ? [s.id] : sel.includes(s.id) ? sel.filter((x) => x !== s.id) : [...sel, s.id])} /><Avatar name={s.name} color={s.color} size={26} /><span className="text-sm">{s.name}<span className="text-xs text-text-2"> · {s.departmentName}</span></span><span className="ml-auto"><Dot p={s.presence} /></span></label></li>)}</ul></fieldset>
        {err && <p role="alert" className="text-sm font-medium text-danger">{err}</p>}
      </div>
    </Modal>
  );
}
