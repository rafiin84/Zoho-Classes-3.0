"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Microphone, VideoCamera, PencilSimpleLine, Image as ImageIcon, FileText, PaperPlaneRight, Sparkle, MusicNote, Play } from "@phosphor-icons/react";
import { Avatar, Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, ErrorState, SkeletonCards, Textarea, toast } from "@/components/ui";
import { doubtService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { TEACHERS, subjectById, teacherName } from "@/lib/mock-data/core";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ScreenProps } from "@/types/screens";
import type { DoubtMessage } from "@/types";
import { studentKeys } from "../keys";
import { DOUBT_STATUS } from "./DoubtsScreen";
import { VoiceRecorder } from "../components/VoiceRecorder";

const KIND = { text: null, voice: { icon: Microphone, label: "Voice note" }, video: { icon: VideoCamera, label: "Video explanation" }, annotated: { icon: PencilSimpleLine, label: "Annotated explanation" } } as const;

function Attachment({ a }: { a: DoubtMessage["attachments"][number] }) {
  const Ic = a.kind === "image" ? ImageIcon : a.kind === "audio" ? MusicNote : FileText;
  return <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2 px-2.5 py-1.5 text-xs font-medium"><Ic size={14} />{a.name}</span>;
}
function Bubble({ m, who }: { m: DoubtMessage; who: { name: string; color?: string } }) {
  const mine = m.authorRole === "student"; const k = KIND[m.kind];
  return (
    <motion.li initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
      <Avatar name={mine ? "You" : who.name} color={mine ? "#5146E5" : who.color} size={34} />
      <div className={cn("max-w-[85%] space-y-2 rounded-2xl px-4 py-3", mine ? "rounded-tr-md bg-primary text-primary-fg" : "rounded-tl-md bg-surface-2")}>
        <p className={cn("text-xs font-semibold", mine ? "text-primary-fg/80" : "text-text-2")}>{mine ? "You" : who.name} · {fmtDateTime(m.at)}</p>
        {k && <p className="inline-flex items-center gap-1.5 text-xs font-semibold"><k.icon size={14} weight="fill" />{k.label}</p>}
        {m.kind === "voice" && <div className={cn("flex items-center gap-2 rounded-xl px-2.5 py-2", mine ? "bg-white/15" : "bg-surface")}><Play size={14} weight="fill" /><span className="flex flex-1 items-end gap-0.5" aria-hidden>{Array.from({ length: 24 }).map((_, i) => <span key={i} className="w-0.5 rounded-full bg-current opacity-60" style={{ height: 4 + ((i * 5) % 12) }} />)}</span><span className="tnum text-xs">0:24</span></div>}
        {m.kind === "annotated" && <div className="rounded-xl bg-gradient-to-br from-highlight-soft to-lilac p-3 text-xs text-text-2"><PencilSimpleLine size={16} className="mb-1 text-primary" />Annotated image — your working with the teacher’s pen marks on it.</div>}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
        {m.attachments.length > 0 && <div className="flex flex-wrap gap-1.5 text-text">{m.attachments.map((a) => <Attachment key={a.name} a={a} />)}</div>}
      </div>
    </motion.li>
  );
}

export default function DoubtThreadScreen({ params }: ScreenProps) {
  const { studentId } = useActors();
  const qc = useQueryClient();
  const [reply, setReply] = useState(""); const [confirm, setConfirm] = useState(false); const [rec, setRec] = useState(false);
  const { data: t, isLoading, isError, refetch } = useQuery({ queryKey: [...studentKeys.doubts(studentId), params.id], queryFn: () => doubtService.get(params.id), refetchInterval: 8000 });
  const refresh = () => { qc.invalidateQueries({ queryKey: studentKeys.doubts(studentId) }); qc.invalidateQueries({ queryKey: studentKeys.notifications }); };
  const send = useMutation({ mutationFn: (p: { text: string; kind?: DoubtMessage["kind"]; atts?: DoubtMessage["attachments"] }) => doubtService.reply(params.id, "student", studentId, p.text, p.kind, p.atts), onSuccess: () => { setReply(""); refresh(); toast.success("Follow-up sent"); }, onError: () => toast.error("Couldn't send. Try again.") });
  const resolve = useMutation({ mutationFn: () => doubtService.setStatus(params.id, "resolved"), onSuccess: () => { refresh(); toast.success("Marked as resolved. Glad it clicked!"); } });
  const reopen = useMutation({ mutationFn: () => doubtService.setStatus(params.id, "follow-up"), onSuccess: () => { refresh(); toast.info("Reopened for a follow-up"); } });

  if (isLoading) return <SkeletonCards n={3} h="h-28" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!t || t.studentId !== studentId) return <EmptyState title="We couldn’t find that doubt" body="It may belong to someone else or may have been removed." action={{ label: "Back to your doubts", href: "/student/doubts" }} />;
  const teacher = TEACHERS.find((x) => x.id === t.teacherId); const st = DOUBT_STATUS[t.status]; const sub = subjectById(t.subjectId);
  const resolved = t.status === "resolved";
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/student/doubts" className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-2 hover:text-text"><ArrowLeft size={16} />All doubts</Link>
      <Card><CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><div className="mb-1 flex flex-wrap items-center gap-2"><Badge tone={st.tone}><span aria-live="polite">{st.label}</span></Badge><Badge>{sub.name}</Badge>{t.escalatedFromTutor && <Badge tone="ai">Escalated from AI Tutor</Badge>}</div><h1 className="text-2xl font-bold tracking-tight">{t.title}</h1></div>
          {!resolved ? <Button variant="soft" onClick={() => setConfirm(true)}><CheckCircle size={18} weight="fill" />Mark resolved</Button> : <Button variant="outline" loading={reopen.isPending} onClick={() => reopen.mutate()}>Still unsure? Reopen</Button>}
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3"><Avatar name={teacher?.displayName ?? "Teacher"} color={teacher?.avatarColor} size={40} /><div className="text-sm"><p className="font-semibold">{teacherName(t.teacherId)}</p><p className="text-text-2">{teacher?.departmentName} teacher · a real person will reply</p></div></div>
        {t.context && <p className="text-xs text-primary">Context: {t.context}</p>}
        {t.courseId && <div className="flex flex-wrap gap-2 text-sm"><Link className="font-semibold text-primary hover:underline" href={`/student/courses/${t.courseId}`}>Open the course</Link>{t.lessonId && <Link className="font-semibold text-primary hover:underline" href={`/student/player/${t.courseId}?activity=${t.lessonId}`}>Back to the lesson</Link>}</div>}
      </CardBody></Card>
      <ul className="space-y-4" aria-label="Messages">{t.messages.map((m) => <Bubble key={m.id} m={m} who={{ name: m.authorRole === "teacher" ? teacherName(m.authorId) : "You", color: teacher?.avatarColor }} />)}</ul>
      {t.status === "open" && <p role="status" className="rounded-2xl bg-info-soft p-3 text-sm text-info">Waiting for your teacher. Most doubts get a reply within a school day — you can add more detail below.</p>}
      {!resolved ? (
        <Card><CardBody className="space-y-3">
          <label htmlFor="reply" className="text-sm font-semibold">{t.status === "answered" ? "Reply or ask a follow-up" : "Add more detail"}</label>
          {rec ? <VoiceRecorder onCancel={() => setRec(false)} onDone={(s) => { setRec(false); send.mutate({ text: `Voice follow-up (${s}s)`, kind: "voice", atts: [{ name: `voice-${s}s.m4a`, kind: "audio" }] }); }} /> :
            <Textarea id="reply" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="e.g. I tried it again with 12 as the denominator, can you check?" />}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => setRec(true)} disabled={rec}><Microphone size={16} />Voice</Button><Button size="sm" variant="ghost" asChild><Link href={`/student/tutor?q=${encodeURIComponent(t.title)}`}><Sparkle size={16} />Ask AI Tutor meanwhile</Link></Button></div>
            <Button disabled={!reply.trim()} loading={send.isPending} onClick={() => send.mutate({ text: reply.trim() })}><PaperPlaneRight size={16} weight="fill" />Send follow-up</Button>
          </div>
        </CardBody></Card>
      ) : <p role="status" className="rounded-2xl bg-success-soft p-3 text-sm text-success">Resolved. You can still reopen this if something comes up later.</p>}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Mark this doubt as resolved?" body="You can reopen it anytime if you need another explanation." confirmLabel="Yes, it’s resolved" onConfirm={() => resolve.mutate()} />
    </div>
  );
}
