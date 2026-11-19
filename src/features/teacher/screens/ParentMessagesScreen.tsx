"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PaperPlaneRight, ArrowLeft, LockKey } from "@phosphor-icons/react";
import { PageHeader, Segmented, Card, CardBody, Badge, ListToolbar, NoResults, EmptyState, Avatar, Button, Textarea, ErrorState, SkeletonCards, toast } from "@/components/ui";
import type { ParentConversation } from "@/types/parentMessages";
import { parentMessageService } from "@/lib/api/parentMessageService";
import { STUDENTS, PARENTS } from "@/lib/mock-data/core";
import { relTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTeacher, errMsg, tHref } from "../components/common";

type F = "all" | "unread" | "open" | "closed";
export default function ParentMessagesScreen() {
  const t = useTeacher(); const qc = useQueryClient();
  const [f, setF] = React.useState<F>("all"); const [q, setQ] = React.useState(""); const [sel, setSel] = React.useState<string | null>(null);
  const list = useQuery({ queryKey: ["t", "parent-msgs", t.id], queryFn: () => parentMessageService.forTeacher(t.id) });
  const inv = () => { qc.invalidateQueries({ queryKey: ["t", "parent-msgs"] }); qc.invalidateQueries({ queryKey: ["parent"] }); };
  const unread = (c: ParentConversation) => c.messages.filter((m) => m.authorRole === "parent" && !m.readByTeacher).length;
  const childName = (id: string) => STUDENTS.find((s) => s.id === id)?.displayName ?? id; const parentName = (id: string) => PARENTS.find((p) => p.id === id)?.displayName ?? "Parent";
  const rows = (list.data ?? []).filter((c) => (f === "all" || (f === "unread" ? unread(c) > 0 : c.status === f)) && `${c.topic} ${childName(c.childId)} ${parentName(c.parentId)}`.toLowerCase().includes(q.toLowerCase()));
  const cur = (list.data ?? []).find((c) => c.id === sel) ?? null;
  const open = (c: ParentConversation) => { setSel(c.id); if (unread(c)) parentMessageService.markRead(c.id, "teacher").then(inv); };
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Parent Messages" subtitle="Private conversations with parents about their own child. Separate from student doubts and staff chat." actions={<Button asChild variant="outline" size="sm"><Link href={tHref("doubts")}>Student doubts</Link></Button>} />
      <p className="mb-3 flex items-center gap-1.5 rounded-xl bg-surface-2 px-3 py-2 text-xs text-text-2"><LockKey size={14} />Each family only sees their own thread. Do not share other students' information.</p>
      <div className="mb-3"><Segmented label="Message filter" value={f} onChange={setF} options={[{ value: "all", label: "All" }, { value: "unread", label: "Unread" }, { value: "open", label: "Open" }, { value: "closed", label: "Closed" }]} /></div>
      <ListToolbar query={q} onQuery={setQ} placeholder="Search by parent, child or topic" count={rows.length} hasFilters={f !== "all"} onClear={() => { setQ(""); setF("all"); }} />
      {list.isLoading ? <SkeletonCards n={3} h="h-16" /> : list.isError ? <ErrorState onRetry={() => list.refetch()} /> : !list.data?.length ? <EmptyState title="No parent messages" body="When a parent writes to you about their child, it appears here." /> : (
        <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
          <div className={cn(cur && "hidden lg:block")}>{!rows.length ? <NoResults query={q} onClear={() => { setQ(""); setF("all"); }} /> : <ul className="space-y-2">{rows.map((c) => <li key={c.id}><button onClick={() => open(c)} className={cn("flex w-full items-start gap-3 rounded-2xl border p-3 text-left", sel === c.id ? "border-primary bg-lilac/50" : "border-border bg-surface")}><Avatar name={parentName(c.parentId)} size={36} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{c.topic}</span><span className="block truncate text-xs text-text-2">{parentName(c.parentId)} · re: {childName(c.childId)} · {relTime(c.updatedAt)}</span></span>{unread(c) > 0 ? <Badge tone="primary">{unread(c)} new</Badge> : c.status === "closed" ? <Badge>Closed</Badge> : null}</button></li>)}</ul>}</div>
          <div className={cn(!cur && "hidden lg:block")}>{cur ? <Conv key={cur.id} c={cur} teacherId={t.id} child={childName(cur.childId)} parent={parentName(cur.parentId)} onBack={() => setSel(null)} onChanged={inv} /> : <EmptyState title="Select a conversation" body="Pick a thread to read and reply." />}</div>
        </div>
      )}
    </div>
  );
}
function Conv({ c, teacherId, child, parent, onBack, onChanged }: { c: ParentConversation; teacherId: string; child: string; parent: string; onBack: () => void; onChanged: () => void }) {
  const [text, setText] = React.useState("");
  const reply = useMutation({ mutationFn: () => { if (!text.trim()) throw new Error("Write a reply first."); return parentMessageService.reply(c.id, teacherId, text.trim()); }, onSuccess: () => { toast.success("Reply sent to the parent"); setText(""); onChanged(); }, onError: (e) => toast.error(errMsg(e)) });
  const st = useMutation({ mutationFn: (s: "open" | "closed") => parentMessageService.setStatus(c.id, s), onSuccess: () => { toast.success("Conversation updated"); onChanged(); } });
  return (
    <Card><CardBody className="space-y-3">
      <div className="flex items-start gap-2"><Button variant="ghost" size="iconSm" className="lg:hidden" aria-label="Back" onClick={onBack}><ArrowLeft size={16} /></Button><div className="flex-1"><h2 className="text-heading">{c.topic}</h2><p className="text-xs text-text-2">{parent} · about {child} · {c.teacherRole}</p></div><Badge tone={c.status === "open" ? "success" : "neutral"}>{c.status === "open" ? "Open" : "Closed"}</Badge></div>
      <ol className="space-y-2" aria-label="Messages">{c.messages.map((m) => <li key={m.id} className={cn("max-w-[90%] rounded-2xl p-3 text-sm", m.authorRole === "teacher" ? "ml-auto bg-lilac" : "bg-surface-2")}><p className="mb-0.5 text-xs font-semibold text-text-2">{m.authorName} · {relTime(m.at)}</p><p className="whitespace-pre-line">{m.text}</p></li>)}</ol>
      {c.status === "closed" ? <Button variant="outline" size="sm" onClick={() => st.mutate("open")}>Reopen conversation</Button> : (<div className="space-y-2 border-t border-border pt-3"><label htmlFor="pm-reply" className="sr-only">Reply to parent</label><Textarea id="pm-reply" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a clear, respectful reply…" maxLength={1500} /><div className="flex gap-2"><Button size="sm" loading={reply.isPending} onClick={() => reply.mutate()}><PaperPlaneRight size={16} />Send</Button><Button size="sm" variant="ghost" onClick={() => st.mutate("closed")}>Close conversation</Button></div></div>)}
    </CardBody></Card>
  );
}
