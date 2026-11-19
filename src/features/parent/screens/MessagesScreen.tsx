"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PaperPlaneTilt, Paperclip, Plus, X, Lock, ChatCircleDots, Info } from "@phosphor-icons/react";
import { parentMessageService } from "@/lib/api/parentMessageService";
import { Avatar, Badge, Button, Card, CardBody, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Skeleton, Textarea, toast } from "@/components/ui";
import { TEACHERS } from "@/lib/mock-data/core";
import { cn } from "@/lib/utils";
import { fmtDateTime, relTime } from "@/lib/format";
import type { ParentConversation } from "@/types/parentMessages";
import { useChild } from "../useChild";
import { AccessGate } from "../relationship";
import { pk } from "../data";

const schema = z.object({ teacherId: z.string().min(1, "Choose who you're writing to"), topic: z.string().max(80).optional(), text: z.string().trim().min(10, "Write at least a sentence (10+ characters)").max(1500, "Keep it under 1,500 characters") });
type F = z.infer<typeof schema>;
type Att = { name: string; kind: "doc" | "image" };

function Attach({ atts, setAtts }: { atts: Att[]; setAtts: (a: Att[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return <div><input ref={ref} type="file" accept=".pdf,.doc,.docx,image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { const f = e.target.files?.[0]; if (f && atts.length < 3) setAtts([...atts, { name: f.name, kind: f.type.startsWith("image") ? "image" : "doc" }]); e.target.value = ""; }} />
    <Button type="button" size="sm" variant="ghost" disabled={atts.length >= 3} onClick={() => ref.current?.click()}><Paperclip size={16} />Attach (PDF, document or image · max 3)</Button>
    {atts.length > 0 && <ul className="mt-1 flex flex-wrap gap-1.5">{atts.map((a, i) => <li key={i} className="flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs">{a.name}<button type="button" aria-label={`Remove ${a.name}`} onClick={() => setAtts(atts.filter((_, j) => j !== i))}><X size={12} /></button></li>)}</ul>}</div>;
}

function NewMessage({ open, onClose, childId, parentId, first, onSent }: { open: boolean; onClose: () => void; childId: string; parentId: string; first: string; onSent: (c: ParentConversation) => void }) {
  const rq = useQuery({ queryKey: pk("recipients", childId), queryFn: () => parentMessageService.recipientsFor(childId), enabled: open });
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<F>({ resolver: zodResolver(schema), defaultValues: { teacherId: "", topic: "", text: "" } });
  const [atts, setAtts] = useState<Att[]>([]); const [confirm, setConfirm] = useState<F | null>(null);
  const send = useMutation({ mutationFn: (v: F) => parentMessageService.send({ parentId, childId, teacherId: v.teacherId, topic: v.topic, text: v.text, attachments: atts }), onSuccess: (c) => { toast.success("Message sent. You'll be notified when the teacher replies."); onSent(c); reset(); setAtts([]); setConfirm(null); onClose(); }, onError: (e) => toast.error((e as Error).message) });
  const sel = rq.data?.find((r) => r.teacherId === watch("teacherId"));
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={`New message about ${first}`} description="Only teachers of this child can be messaged." className="sm:max-w-lg">
      <form onSubmit={handleSubmit((v) => setConfirm(v))} className="space-y-4" noValidate>
        <Field label="To" htmlFor="pm-to" error={errors.teacherId?.message} required><Select id="pm-to" {...register("teacherId")} aria-invalid={!!errors.teacherId}><option value="">Choose a teacher…</option>{(rq.data ?? []).map((r) => <option key={r.teacherId} value={r.teacherId} disabled={!r.permitted}>{r.name} · {r.role}{r.permitted ? "" : " (not available)"}</option>)}</Select></Field>
        {sel && <p className="rounded-xl bg-lilac p-3 text-xs text-primary">Writing to <strong>{sel.name}</strong>, {sel.role}. Only this teacher and the school can read it.</p>}
        {(rq.data ?? []).some((r) => !r.permitted) && <details className="rounded-xl bg-surface-2 p-3 text-xs text-text-2"><summary className="cursor-pointer font-semibold"><Lock size={12} className="mr-1 inline" />Why can&apos;t I message everyone?</summary><ul className="mt-2 space-y-1">{rq.data!.filter((r) => !r.permitted).map((r) => <li key={r.teacherId}><strong>{r.name}:</strong> {r.reason}</li>)}</ul></details>}
        <Field label="Subject" htmlFor="pm-topic" optional><Input id="pm-topic" {...register("topic")} placeholder="For example: Homework support" /></Field>
        <Field label="Message" htmlFor="pm-text" error={errors.text?.message} required hint={`${watch("text").length}/1500`}><Textarea id="pm-text" rows={6} {...register("text")} aria-invalid={!!errors.text} placeholder="Share what you'd like to ask or tell the teacher." /></Field>
        <Attach atts={atts} setAtts={setAtts} />
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" loading={send.isPending}><PaperPlaneTilt size={16} />Review &amp; send</Button></div>
      </form>
      <Modal open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Send this message?" description={`To ${rq.data?.find((r) => r.teacherId === confirm?.teacherId)?.name ?? ""} about ${first}`} footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Edit</Button><Button loading={send.isPending} onClick={() => confirm && send.mutate(confirm)}>Send</Button></>}><p className="whitespace-pre-line rounded-xl bg-surface-2 p-3 text-sm">{confirm?.text}</p></Modal>
    </Modal>
  );
}

function Body() {
  const { childId, parentId, parent, first } = useChild(); const qc = useQueryClient();
  const q = useQuery({ queryKey: pk("convs", childId), queryFn: () => parentMessageService.forParent(parentId, childId) });
  const [sel, setSel] = useState<string | null>(null); const [composing, setComposing] = useState(false); const [reply, setReply] = useState(""); const [atts, setAtts] = useState<Att[]>([]);
  const convs = q.data ?? []; const cur = convs.find((c) => c.id === sel) ?? null;
  useEffect(() => { if (!cur && convs.length && window.matchMedia("(min-width:1024px)").matches) setSel(convs[0].id); }, [convs, cur]);
  useEffect(() => { if (cur && cur.messages.some((m) => m.authorRole === "teacher" && !m.readByParent)) { parentMessageService.markRead(cur.id, "parent").then(() => { qc.invalidateQueries({ queryKey: pk("convs", childId) }); qc.invalidateQueries({ queryKey: pk("unread", childId) }); }); } }, [cur, childId, qc]);
  const send = useMutation({ mutationFn: () => parentMessageService.send({ parentId, childId, teacherId: cur!.teacherId, conversationId: cur!.id, text: reply, attachments: atts, authorName: parent.displayName }), onSuccess: () => { setReply(""); setAtts([]); toast.success("Sent"); qc.invalidateQueries({ queryKey: pk("convs", childId) }); }, onError: (e) => toast.error((e as Error).message) });
  const refresh = () => qc.invalidateQueries({ queryKey: pk("convs", childId) });
  return (
    <>
      <p className="mb-4 flex items-start gap-2 rounded-2xl bg-surface-2 p-3 text-xs text-text-2"><Info size={16} className="mt-0.5 shrink-0" />This is parent–teacher messaging only. It&apos;s separate from your child&apos;s doubts and from staff chat, and only {first}&apos;s teachers can be reached.</p>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className={cn(cur && "hidden lg:block")}>
          <Button className="mb-3 w-full" onClick={() => setComposing(true)}><Plus size={16} />New message</Button>
          {q.isLoading ? <div className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : convs.length === 0 ? <EmptyState icon={<ChatCircleDots size={28} weight="duotone" />} title="No conversations yet" body={`Start one with ${first}'s class teacher or a subject teacher.`} action={{ label: "Write a message", onClick: () => setComposing(true) }} /> :
            <ul className="space-y-2">{convs.map((c) => { const unread = c.messages.filter((m) => m.authorRole === "teacher" && !m.readByParent).length; const last = c.messages[c.messages.length - 1]; return <li key={c.id}><button onClick={() => setSel(c.id)} className={cn("flex w-full items-start gap-3 rounded-2xl border p-3 text-left", sel === c.id ? "border-primary bg-lilac" : "border-border bg-surface hover:bg-surface-2")}><Avatar name={c.teacherName} color={TEACHERS.find((t) => t.id === c.teacherId)?.avatarColor} size={40} /><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{c.teacherName}</span>{unread > 0 && <Badge tone="primary">{unread} new</Badge>}</span><span className="block truncate text-xs text-text-2">{c.teacherRole}</span><span className="block truncate text-sm">{c.topic}</span><span className="block truncate text-xs text-text-2">{last.authorRole === "parent" ? "You: " : ""}{last.text} · {relTime(last.at)}</span></span></button></li>; })}</ul>}
        </div>
        <div className={cn(!cur && "hidden lg:block")}>
          {!cur ? <EmptyState icon={<ChatCircleDots size={28} weight="duotone" />} title="Select a conversation" body="Pick one from the list to read the history and reply." /> : (
            <Card><CardBody className="space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-3"><Button size="sm" variant="ghost" className="lg:hidden" onClick={() => setSel(null)}>← Back</Button><Avatar name={cur.teacherName} color={TEACHERS.find((t) => t.id === cur.teacherId)?.avatarColor} size={44} /><div><p className="font-semibold">{cur.teacherName}</p><p className="text-xs text-text-2">{cur.teacherRole} · about {first} · {cur.topic}</p></div></div>
              <ul className="max-h-[50dvh] space-y-3 overflow-y-auto" aria-live="polite">{cur.messages.map((m) => <li key={m.id} className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", m.authorRole === "parent" ? "ml-auto rounded-br-md bg-primary text-primary-fg" : "rounded-bl-md bg-surface-2")}><span className={cn("mb-0.5 block text-[11px] font-semibold", m.authorRole === "parent" ? "text-primary-fg/80" : "text-text-2")}>{m.authorName} · {m.authorRole === "teacher" ? "Teacher" : "Parent"} · {fmtDateTime(m.at)}</span>{m.text}{m.attachments.length > 0 && <span className="mt-1 flex flex-wrap gap-1">{m.attachments.map((a, i) => <span key={i} className="rounded-full bg-black/10 px-2 py-0.5 text-xs"><Paperclip size={10} className="mr-0.5 inline" />{a.name}</span>)}</span>}{m.authorRole === "parent" && <span className="mt-0.5 block text-right text-[10px] text-primary-fg/70">{m.readByTeacher ? "Read" : "Delivered"}</span>}</li>)}</ul>
              <form onSubmit={(e) => { e.preventDefault(); if (reply.trim().length >= 2) send.mutate(); }} className="space-y-2 border-t border-border pt-3"><label htmlFor="pm-reply" className="sr-only">Reply to {cur.teacherName}</label><Textarea id="pm-reply" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${cur.teacherName.split(" ").slice(-1)[0]}…`} /><div className="flex flex-wrap items-center justify-between gap-2"><Attach atts={atts} setAtts={setAtts} /><Button type="submit" loading={send.isPending} disabled={reply.trim().length < 2}><PaperPlaneTilt size={16} />Send</Button></div></form>
            </CardBody></Card>
          )}
        </div>
      </div>
      <NewMessage key={childId} open={composing} onClose={() => setComposing(false)} childId={childId} parentId={parentId} first={first} onSent={(c) => { setSel(c.id); refresh(); }} />
    </>
  );
}
export default function ParentMessages() {
  const { childId, first } = useChild();
  return <div><PageHeader title="Messages" subtitle={`Talk with ${first}'s teachers. Replies arrive here and in your notifications.`} /><AccessGate need="full"><Body key={childId} /></AccessGate></div>;
}
