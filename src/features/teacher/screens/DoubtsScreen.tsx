"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PaperPlaneRight, Microphone, VideoCamera, PencilSimple, TextB, TextItalic, ListBullets, Paperclip, ArrowsLeftRight, CheckCircle, ArrowLeft } from "@phosphor-icons/react";
import { PageHeader, Segmented, Card, CardBody, Badge, StatusBadge, ListToolbar, NoResults, EmptyState, Avatar, Button, Select, Textarea, Modal, ConfirmDialog, Field, toast, SkeletonCards, ErrorState } from "@/components/ui";
import type { ScreenProps } from "@/types/screens";
import type { DoubtMessage, DoubtStatus, DoubtThread } from "@/types";
import { doubtService } from "@/lib/api";
import { nameOf } from "@/lib/api/teacherInsightService";
import { TEACHERS, STUDENTS, subjectById, teacherName } from "@/lib/mock-data/core";
import { relTime, fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTeacher, KEYS, errMsg, tHref } from "../components/common";

const FILTERS: { value: "all" | DoubtStatus; label: string }[] = [{ value: "all", label: "All" }, { value: "open", label: "Open" }, { value: "answered", label: "Answered" }, { value: "follow-up", label: "Follow-up required" }, { value: "resolved", label: "Resolved" }];
const STATUS_LABEL: Record<DoubtStatus, string> = { open: "Open", answered: "Answered", "follow-up": "Follow-up required", resolved: "Resolved" };
type Mode = DoubtMessage["kind"];

export default function DoubtsScreen({ searchParams }: ScreenProps) {
  const t = useTeacher(); const qc = useQueryClient();
  const [filter, setFilter] = React.useState<"all" | DoubtStatus>("all"); const [q, setQ] = React.useState(""); const [sel, setSel] = React.useState<string | null>(searchParams.open ?? null);
  const list = useQuery({ queryKey: [...KEYS.doubts, t.id], queryFn: () => doubtService.forTeacher(t.id) });
  const inv = () => { qc.invalidateQueries({ queryKey: [...KEYS.doubts] }); qc.invalidateQueries({ queryKey: ["student"] }); };
  const rows = (list.data ?? []).filter((d) => (filter === "all" || d.status === filter) && (`${d.title} ${nameOf(d.studentId)}`).toLowerCase().includes(q.toLowerCase()));
  const counts = (s: "all" | DoubtStatus) => (list.data ?? []).filter((d) => s === "all" || d.status === s).length;
  const current = (list.data ?? []).find((d) => d.id === sel) ?? null;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Doubts & Messages" subtitle="Student doubts you own. Parent messages are a separate inbox." actions={<Button asChild variant="outline" size="sm"><Link href={tHref("parent-messages")}>Parent messages</Link></Button>} />
      <div className="mb-3"><Segmented label="Doubt status" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ ...f, count: list.data ? counts(f.value) : undefined }))} /></div>
      <ListToolbar query={q} onQuery={setQ} placeholder="Search by student or topic" count={rows.length} hasFilters={filter !== "all"} onClear={() => { setQ(""); setFilter("all"); }} />
      {list.isLoading ? <SkeletonCards n={4} h="h-16" /> : list.isError ? <ErrorState onRetry={() => list.refetch()} /> : !list.data?.length ? <EmptyState title="No doubts assigned to you" body="When students ask a question in a lesson or from their AI Tutor, it lands here." /> : (
        <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
          <div className={cn(current && "hidden lg:block")}>
            {!rows.length ? <NoResults query={q} onClear={() => { setQ(""); setFilter("all"); }} /> : (
              <ul className="space-y-2">{rows.map((d) => { const s = STUDENTS.find((x) => x.id === d.studentId); return (
                <li key={d.id}><button onClick={() => setSel(d.id)} className={cn("flex w-full items-start gap-3 rounded-2xl border p-3 text-left", sel === d.id ? "border-primary bg-lilac/50" : "border-border bg-surface hover:border-primary/50")}>
                  <Avatar name={nameOf(d.studentId)} color={s?.avatarColor} size={36} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{d.title}</span><span className="block truncate text-xs text-text-2">{nameOf(d.studentId)} · {subjectById(d.subjectId).name} · {relTime(d.updatedAt)}</span></span><StatusBadge status={d.status} label={STATUS_LABEL[d.status]} /></button></li>); })}</ul>
            )}
          </div>
          <div className={cn(!current && "hidden lg:block")}>
            {current ? <Thread key={current.id} d={current} onBack={() => setSel(null)} onChanged={inv} teacherId={t.id} /> : <EmptyState title="Select a doubt" body="Choose a thread to see context, history and reply." />}
          </div>
        </div>
      )}
    </div>
  );
}

function Thread({ d, onBack, onChanged, teacherId }: { d: DoubtThread; onBack: () => void; onChanged: () => void; teacherId: string }) {
  const [text, setText] = React.useState(""); const [mode, setMode] = React.useState<Mode>("text"); const [att, setAtt] = React.useState<DoubtMessage["attachments"]>([]);
  const [route, setRoute] = React.useState(false); const [to, setTo] = React.useState(""); const [resolve, setResolve] = React.useState(false);
  const done = d.status === "resolved";
  const reply = useMutation({ mutationFn: () => { if (!text.trim() && mode === "text") throw new Error("Write a reply first."); return doubtService.reply(d.id, "teacher", teacherId, text.trim() || `(${mode} reply)`, mode, att); },
    onSuccess: () => { toast.success("Reply sent — the student is notified"); setText(""); setAtt([]); setMode("text"); onChanged(); }, onError: (e) => toast.error(errMsg(e)) });
  const status = useMutation({ mutationFn: (s: DoubtStatus) => doubtService.setStatus(d.id, s), onSuccess: (_, s) => { toast.success(`Marked ${STATUS_LABEL[s].toLowerCase()}`); onChanged(); } });
  const reassign = useMutation({ mutationFn: () => { if (!to) throw new Error("Choose a teacher."); return doubtService.reassign(d.id, to); }, onSuccess: () => { toast.success("Doubt routed — it leaves your inbox"); setRoute(false); onBack(); onChanged(); }, onError: (e) => toast.error(errMsg(e)) });
  const format = (w: string) => setText((x) => `${x}${w}`);
  const mk = (kind: Mode, name: string, ak: "audio" | "image" | "doc"): void => { setMode(kind); setAtt((a) => [...a, { name, kind: ak }]); toast.info(`${name} attached (demo — no recording is made)`); };
  return (
    <Card><CardBody className="space-y-4">
      <div className="flex flex-wrap items-start gap-2"><Button variant="ghost" size="iconSm" className="lg:hidden" aria-label="Back to list" onClick={onBack}><ArrowLeft size={16} /></Button><div className="min-w-0 flex-1"><h2 className="text-heading">{d.title}</h2><p className="text-xs text-text-2">{nameOf(d.studentId)} · {subjectById(d.subjectId).name} · opened {fmtDateTime(d.createdAt)}</p></div><StatusBadge status={d.status} label={STATUS_LABEL[d.status]} /></div>
      {(d.context || d.courseId || d.escalatedFromTutor) && <div className="rounded-xl bg-surface-2 p-3 text-sm"><p className="text-xs font-bold text-text-2">Context</p>{d.context && <p>{d.context}</p>}{d.courseId && <p className="text-xs text-text-2">Course: {d.courseId}{d.lessonId ? ` · Lesson ${d.lessonId}` : ""}{d.questionId ? ` · Question ${d.questionId}` : ""}</p>}{d.escalatedFromTutor && <Badge tone="info" className="mt-1">Escalated from the student's AI Tutor</Badge>}</div>}
      <ol className="space-y-3" aria-label="Conversation history">{d.messages.map((m) => <li key={m.id} className={cn("max-w-[90%] rounded-2xl p-3 text-sm", m.authorRole === "teacher" ? "ml-auto bg-lilac" : "bg-surface-2")}><p className="mb-0.5 text-xs font-semibold text-text-2">{m.authorRole === "teacher" ? teacherName(m.authorId) : nameOf(m.authorId)} · {relTime(m.at)}{m.kind !== "text" && ` · ${m.kind} reply`}</p><p className="whitespace-pre-line">{m.text}</p>{m.attachments.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{m.attachments.map((a) => <Badge key={a.name} icon={<Paperclip size={12} />}>{a.name}</Badge>)}</div>}</li>)}</ol>
      {done ? <div className="flex items-center justify-between rounded-xl bg-success-soft p-3 text-sm text-success"><span className="flex items-center gap-2"><CheckCircle size={18} weight="fill" />Resolved. Reopen to reply.</span><Button size="sm" variant="outline" onClick={() => status.mutate("follow-up")}>Reopen</Button></div> : (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Reply tools">
            <Button size="iconSm" variant="ghost" aria-label="Bold" onClick={() => format("**bold**")}><TextB size={16} /></Button><Button size="iconSm" variant="ghost" aria-label="Italic" onClick={() => format("_italic_")}><TextItalic size={16} /></Button><Button size="iconSm" variant="ghost" aria-label="Bulleted list" onClick={() => format("\n• ")}><ListBullets size={16} /></Button>
            <span className="mx-1 h-5 w-px bg-border" />
            <Button size="sm" variant={mode === "voice" ? "soft" : "ghost"} onClick={() => mk("voice", "voice-note-0:42.m4a", "audio")}><Microphone size={16} />Voice note</Button>
            <Button size="sm" variant={mode === "video" ? "soft" : "ghost"} onClick={() => mk("video", "explainer-1:10.mp4", "doc")}><VideoCamera size={16} />Video</Button>
            <Button size="sm" variant={mode === "annotated" ? "soft" : "ghost"} onClick={() => mk("annotated", "annotated-working.png", "image")}><PencilSimple size={16} />Annotate</Button>
          </div>
          {att.length > 0 && <div className="flex flex-wrap gap-1">{att.map((a) => <Badge key={a.name} icon={<Paperclip size={12} />}>{a.name}<button aria-label={`Remove ${a.name}`} className="ml-1" onClick={() => { setAtt((x) => x.filter((y) => y.name !== a.name)); if (att.length === 1) setMode("text"); }}>×</button></Badge>)}</div>}
          <label htmlFor="reply" className="sr-only">Your reply</label><Textarea id="reply" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a clear, encouraging reply…" maxLength={1500} />
          <div className="flex flex-wrap gap-2"><Button size="sm" loading={reply.isPending} onClick={() => reply.mutate()}><PaperPlaneRight size={16} />Send reply</Button><Button size="sm" variant="outline" onClick={() => status.mutate("follow-up")}>Needs follow-up</Button><Button size="sm" variant="outline" onClick={() => setResolve(true)}><CheckCircle size={16} />Resolve</Button><Button size="sm" variant="ghost" onClick={() => setRoute(true)}><ArrowsLeftRight size={16} />Route to teacher</Button></div>
        </div>
      )}
      <Modal open={route} onOpenChange={setRoute} title="Route to another teacher" description="They will own this thread. The student sees the conversation continue." footer={<><Button variant="ghost" onClick={() => setRoute(false)}>Cancel</Button><Button loading={reassign.isPending} onClick={() => reassign.mutate()}>Route doubt</Button></>}>
        <Field label="Teacher" required htmlFor="route-to"><Select id="route-to" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Choose…</option>{TEACHERS.filter((x) => x.id !== teacherId && x.status === "active").map((x) => <option key={x.id} value={x.id}>{teacherName(x.id)} · {x.departmentName}</option>)}</Select></Field>
      </Modal>
      <ConfirmDialog open={resolve} onOpenChange={setResolve} title="Mark as resolved?" body="The student is notified that this doubt is closed. They can reopen it with a follow-up." confirmLabel="Resolve" onConfirm={() => status.mutate("resolved")} />
    </CardBody></Card>
  );
}
