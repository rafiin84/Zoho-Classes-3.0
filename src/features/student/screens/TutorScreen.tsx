"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ClockCounterClockwise, Sliders, UserCircle, PaperPlaneRight, Paperclip, Microphone, Image as ImageIcon, FileText, Camera, MusicNotes, X, Plus, NotePencil, BookOpenText, Sparkle, Notebook, Lightning, CaretLeft } from "@phosphor-icons/react";
import { AIBadge, Badge, Button, Drawer, ErrorState, Skeleton, Segmented, cn, toast } from "@/components/ui";
import { courseService, tutorService } from "@/lib/api";
import type { ReplyInput } from "@/lib/api/tutorService";
import { detectTopic } from "@/lib/api/tutorService";
import { useActors } from "@/stores/app-store";
import { DEFAULT_TUTOR_PREFS } from "@/lib/mock-data/tutor";
import { uid } from "@/lib/utils";
import type { ScreenProps } from "@/types/screens";
import type { TutorAttachment, TutorContextChip, TutorConversation, TutorMessage, TutorMode, TutorPreferences } from "@/types/tutor";
import { studentKeys } from "../keys";
import { TutorAvatar } from "../components/TutorAvatar";
import { VoiceRecorder } from "../components/VoiceRecorder";
import { UserBubble, TutorBubble } from "../tutor/MessageView";
import { PersonaliseSheet } from "../tutor/PersonaliseSheet";
import { HistoryList } from "../tutor/HistoryList";
import { AskDoubtSheet } from "../doubts/AskDoubtSheet";

const MODES: { value: TutorMode; label: string; placeholder: string }[] = [
  { value: "ask", label: "Ask", placeholder: "Ask anything you’re curious or stuck on…" },
  { value: "photo", label: "Explain a photo", placeholder: "Add a photo, then tell me what to explain…" },
  { value: "homework", label: "Homework help", placeholder: "Paste the homework question — I’ll guide, not just answer…" },
  { value: "practice", label: "Practise", placeholder: "Which topic should we practise?" },
];
const PROMPTS = ["Explain how to add 1/4 + 2/3", "Why does dividing by a fraction give a bigger number?", "How does energy flow in a food chain?", "Solve 2x + 3 = 11 step by step"];
const PRACTICE_TOPICS = ["Adding unlike fractions", "Dividing fractions", "Food chains", "Linear equations"];
const SUGGESTED_CONTEXT: TutorContextChip[] = [
  { id: "crs-fractions", kind: "course", label: "Fractions & Decimals, Made Friendly" },
  { id: "act-fr-5", kind: "lesson", label: "Worked examples: 1/4 + 2/3" },
  { id: "book-sci8", kind: "book", label: "Science Explorer · Grade 8" },
  { id: "doc-notes", kind: "doc", label: "class-notes.pdf (uploaded)" },
  { id: "fb-linear", kind: "feedback", label: "Mrs. Nair’s feedback · Linear set" },
  { id: "topic-ratio", kind: "topic", label: "Topic · Ratio & proportion" },
];

export default function TutorScreen({ searchParams }: ScreenProps) {
  const { studentId } = useActors();
  const qc = useQueryClient(); const router = useRouter();
  const prefsQ = useQuery({ queryKey: [...studentKeys.tutorPrefs, studentId], queryFn: () => tutorService.preferences(studentId) });
  const convsQ = useQuery({ queryKey: studentKeys.tutorConversations(studentId), queryFn: () => tutorService.conversations(studentId) });
  const basePrefs: TutorPreferences = prefsQ.data ?? DEFAULT_TUTOR_PREFS;
  const [langOverride, setLangOverride] = useState<string | null>(null);
  const prefs = useMemo(() => ({ ...basePrefs, language: langOverride ?? basePrefs.language }), [basePrefs, langOverride]);

  const [conv, setConv] = useState<TutorConversation | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [ctx, setCtx] = useState<TutorContextChip[]>([]);
  const [mode, setMode] = useState<TutorMode>((["ask", "photo", "homework", "practice"].includes(searchParams.mode) ? searchParams.mode : "ask") as TutorMode);
  const [input, setInput] = useState(""); const [pending, setPending] = useState<TutorAttachment[]>([]);
  const [thinking, setThinking] = useState(false); const [recording, setRecording] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false); const [ctxOpen, setCtxOpen] = useState(false);
  const [history, setHistory] = useState(false); const [persona, setPersona] = useState(false); const [teacher, setTeacher] = useState(false);
  const endRef = useRef<HTMLDivElement>(null); const msgsRef = useRef<TutorMessage[]>([]); const convRef = useRef<TutorConversation | null>(null);
  msgsRef.current = messages; convRef.current = conv;
  const prefsRef = useRef(prefs); prefsRef.current = prefs;

  // contextual chips from the launching screen (player/lesson) via query params
  const courseId = searchParams.course; const lessonId = searchParams.lesson;
  const courseQ = useQuery({ queryKey: ["tutor-ctx", courseId], queryFn: async () => ({ course: await courseService.get(courseId!, studentId), st: await courseService.structure(courseId!) }), enabled: !!courseId });
  const ctxSeeded = useRef(false);
  useEffect(() => {
    if (ctxSeeded.current || !courseId || !courseQ.data) return; ctxSeeded.current = true;
    const chips: TutorContextChip[] = [{ id: courseId, kind: "course", label: courseQ.data.course.title }];
    const act = courseQ.data.st.activities.find((a) => a.id === lessonId); if (act) chips.push({ id: act.id, kind: "lesson", label: act.title });
    setCtx((c) => [...chips, ...c.filter((x) => !chips.some((y) => y.kind === x.kind))]);
  }, [courseQ.data, courseId, lessonId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, thinking]);

  const persist = useCallback((c: TutorConversation, msgs: TutorMessage[], title?: string) => {
    tutorService.save(c.id, { messages: msgs, context: ctx, mode, ...(title ? { title } : {}) }).then(() => qc.invalidateQueries({ queryKey: studentKeys.tutorConversations(studentId) }));
  }, [ctx, mode, qc, studentId]);

  const send = useCallback(async (text: string, opts?: { attachments?: TutorAttachment[]; mode?: TutorMode }) => {
    const atts = opts?.attachments ?? pending; const m = opts?.mode ?? mode;
    const t = text.trim(); if ((!t && atts.length === 0) || thinking) return;
    const userMsg: TutorMessage = { id: uid("tm"), role: "user", text: t || "Please explain what’s in this attachment.", at: new Date().toISOString(), attachments: atts };
    let c = convRef.current;
    if (!c) { c = await tutorService.create(studentId, (t || atts[0]?.name || "New chat").slice(0, 48), ctx, m); setConv(c); convRef.current = c; }
    const next = [...msgsRef.current, userMsg]; setMessages(next); setInput(""); setPending([]); setThinking(true); setAttachOpen(false);
    try {
      const input: ReplyInput = { prompt: userMsg.text, context: ctx, prefs: prefsRef.current, attachments: atts, mode: m };
      const reply = await tutorService.reply(input);
      const all = [...next, reply]; setMessages(all); persist(c, all, c.title);
    } catch { toast.error("Your tutor lost the thread for a moment. Your message is saved — try again."); persist(c, next); }
    finally { setThinking(false); }
  }, [pending, mode, thinking, studentId, ctx, prefs, persist]);

  // auto-send ?q= once (from the floating launcher, Home, player, doubts)
  const sentQ = useRef(false);
  useEffect(() => {
    if (sentQ.current || !searchParams.q || !prefsQ.data) return;
    if (courseId && !courseQ.data && !courseQ.isError) return;
    sentQ.current = true; send(searchParams.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsQ.data, courseQ.data, courseQ.isError]);

  const openConv = async (id: string) => { const c = await tutorService.get(id); if (!c) return; setConv(c); setMessages(c.messages); setCtx(c.context); setMode(c.mode); setHistory(false); };
  const newChat = () => { setConv(null); setMessages([]); setPending([]); setInput(""); setHistory(false); sentQ.current = true; router.replace("/student/tutor"); };
  const removeConv = async (id: string) => { await tutorService.remove(id); qc.invalidateQueries({ queryKey: studentKeys.tutorConversations(studentId) }); if (conv?.id === id) newChat(); toast.success("Conversation deleted"); };

  const addAtt = (a: Omit<TutorAttachment, "id">) => { setPending((p) => [...p, { ...a, id: uid("att") }]); setAttachOpen(false); };
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const topic = detectTopic(lastUser?.text ?? "");
  const modeCfg = MODES.find((m) => m.value === mode)!;
  const empty = messages.length === 0;

  const submit = (e: React.FormEvent) => { e.preventDefault(); send(input); };
  const handleLang = (l: string) => { setLangOverride(l); const base = lastUser?.text ?? "adding fractions"; setTimeout(() => send(l === "Hindi" ? `Explain again in Hindi: ${base}` : `Back in English: ${base}`), 0); };

  return (
    <div className="mx-auto flex h-[calc(100dvh-12.5rem)] min-h-[520px] max-w-6xl gap-4 lg:h-[calc(100dvh-8.5rem)]">
      <aside className="hidden w-72 shrink-0 overflow-y-auto rounded-[1.25rem] border border-border bg-surface p-3.5 lg:block" aria-label="Conversation history">
        <h2 className="mb-3 px-1 text-sm font-bold">Your conversations</h2>
        {convsQ.isLoading ? <Skeleton className="h-40" /> : <HistoryList items={convsQ.data ?? []} activeId={conv?.id} onOpen={openConv} onNew={newChat} onDelete={removeConv} />}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-border bg-surface shadow-soft" aria-label="AI Tutor chat">
        {/* identity header */}
        <header className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-lilac to-surface px-3.5 py-3 sm:px-4">
          <Button asChild variant="ghost" size="iconSm" className="sm:hidden"><Link href="/student/home" aria-label="Back to Home"><CaretLeft size={18} /></Link></Button>
          <TutorAvatar avatarId={prefs.avatarId} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5"><h1 className="truncate text-base font-bold leading-tight">{prefs.name}</h1><AIBadge label="Your AI Tutor" /></div>
            <p className="truncate text-xs text-text-2">Personal tutor · separate from your school’s AI Teachers · {prefs.language}</p>
          </div>
          <Button variant="ghost" size="iconSm" className="lg:hidden" aria-label="Conversation history" onClick={() => setHistory(true)}><ClockCounterClockwise size={20} /></Button>
          <Button variant="outline" size="sm" onClick={() => setPersona(true)}><Sliders size={16} /><span className="hidden sm:inline">Personalise</span></Button>
          <Button variant="soft" size="sm" onClick={() => setTeacher(true)}><UserCircle size={16} weight="fill" /><span className="hidden sm:inline">Ask my teacher</span></Button>
        </header>

        {/* messages */}
        <div className="flex-1 space-y-5 overflow-y-auto px-3.5 py-4 sm:px-5" aria-live="polite" aria-busy={thinking}>
          {prefsQ.isError && <ErrorState onRetry={() => prefsQ.refetch()} title="Couldn’t load your tutor" />}
          {empty && !thinking && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl space-y-5 py-4 text-center">
              <TutorAvatar avatarId={prefs.avatarId} size={72} className="mx-auto" />
              <div><h2 className="text-2xl font-bold tracking-tight">What would you like to figure out today?</h2><p className="mt-1 text-sm text-text-2">I’m {prefs.name}. Ask me anything — I’ll give the short answer first, and you can open the full explanation when you want it.</p></div>
              {mode === "photo" && <div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" className="h-auto flex-col items-start gap-1 rounded-2xl p-3.5 text-left" onClick={() => send("Can you check my working?", { attachments: [{ id: uid("att"), kind: "image", name: "my-handwritten-working.jpg", mock: "handwritten-maths" }], mode: "photo" })}><NotePencil size={22} className="text-primary" /><span className="font-semibold">Explain handwritten maths</span><span className="whitespace-normal text-xs font-normal text-text-2">Uses a sample photo of a worked equation</span></Button><Button variant="outline" className="h-auto flex-col items-start gap-1 rounded-2xl p-3.5 text-left" onClick={() => send("Explain this page", { attachments: [{ id: uid("att"), kind: "image", name: "textbook-page-48.jpg", mock: "textbook-page" }], mode: "photo" })}><BookOpenText size={22} className="text-primary" /><span className="font-semibold">Explain a textbook page</span><span className="whitespace-normal text-xs font-normal text-text-2">Uses a sample page on unlike fractions</span></Button></div>}
              {mode === "practice" && <div className="flex flex-wrap justify-center gap-2">{PRACTICE_TOPICS.map((t) => <Button key={t} variant="soft" size="sm" onClick={() => send(`Practise: ${t}`, { mode: "practice" })}><Lightning size={14} weight="fill" />{t}</Button>)}</div>}
              {mode === "homework" && <p className="rounded-2xl bg-lilac p-3 text-sm text-text-2">I’ll guide you to the answer step by step so you learn it — and I’ll point you to your teacher for anything graded.</p>}
              <div className="flex flex-wrap justify-center gap-2">{PROMPTS.map((p) => <button key={p} type="button" onClick={() => send(p)} className="min-h-10 rounded-full border border-border bg-surface px-3.5 text-sm font-medium text-text-2 hover:border-primary hover:text-primary">{p}</button>)}</div>
            </motion.div>
          )}
          {messages.map((m) => m.role === "user" ? <UserBubble key={m.id} m={m} /> : <TutorBubble key={m.id} m={m} prefs={prefs} onSuggest={(s) => send(s, { mode: /practice|quiz/i.test(s) ? "practice" : mode })} onAskTeacher={() => setTeacher(true)} onLang={handleLang} />)}
          {thinking && <div className="flex gap-2.5" role="status" aria-label={`${prefs.name} is thinking`}><TutorAvatar avatarId={prefs.avatarId} size={34} /><div className="flex items-center gap-1.5 rounded-3xl rounded-tl-lg border border-border bg-surface px-4 py-3">{[0, 1, 2].map((i) => <motion.span key={i} className="size-2 rounded-full bg-primary" animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />)}</div></div>}
          <div ref={endRef} />
        </div>

        {/* composer */}
        <div className="space-y-2 border-t border-border bg-surface px-3 pb-3 pt-2.5 sm:px-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Segmented<TutorMode> label="Tutor mode" value={mode} onChange={setMode} options={MODES.map((m) => ({ value: m.value, label: m.label }))} className="!p-0.5" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Context">
            {ctx.map((c) => <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-lilac py-1 pl-2.5 pr-1 text-xs font-semibold text-primary"><span className="max-w-[180px] truncate">{c.kind === "course" ? "Course" : c.kind === "lesson" ? "Lesson" : c.kind === "book" ? "Book" : c.kind === "doc" ? "Document" : c.kind === "feedback" ? "Feedback" : "Topic"}: {c.label}</span><button type="button" aria-label={`Clear ${c.label}`} onClick={() => setCtx((x) => x.filter((y) => y.id !== c.id))} className="rounded-full p-1 hover:bg-primary/10"><X size={11} weight="bold" /></button></span>)}
            <div className="relative">
              <button type="button" onClick={() => setCtxOpen((v) => !v)} aria-expanded={ctxOpen} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-dashed border-border px-2.5 text-xs font-semibold text-text-2 hover:border-primary hover:text-primary"><Plus size={12} weight="bold" />{ctx.length ? "Change context" : "Add context"}</button>
              <AnimatePresence>{ctxOpen && <motion.ul initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-2xl border border-border bg-surface p-1.5 shadow-glow">
                {SUGGESTED_CONTEXT.map((c) => { const on = ctx.some((x) => x.id === c.id); return <li key={c.id}><button type="button" onClick={() => { setCtx((x) => on ? x.filter((y) => y.id !== c.id) : [...x.filter((y) => y.kind !== c.kind || c.kind === "doc"), c]); setCtxOpen(false); }} className={cn("flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-surface-2", on && "bg-lilac")}>{c.kind === "doc" ? <FileText size={16} /> : c.kind === "book" ? <BookOpenText size={16} /> : c.kind === "feedback" ? <Notebook size={16} /> : <Sparkle size={16} />}<span className="min-w-0 flex-1 truncate">{c.label}</span>{on && <Badge tone="primary">On</Badge>}</button></li>; })}
              </motion.ul>}</AnimatePresence>
            </div>
          </div>
          {pending.length > 0 && <ul className="flex flex-wrap gap-1.5" aria-label="Attachments to send">{pending.map((a) => <li key={a.id} className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2 py-1 pl-2.5 pr-1 text-xs font-medium"><Paperclip size={12} />{a.name}<button type="button" aria-label={`Remove ${a.name}`} onClick={() => setPending((p) => p.filter((x) => x.id !== a.id))} className="rounded-full p-1 hover:bg-border"><X size={10} weight="bold" /></button></li>)}</ul>}
          {recording ? <VoiceRecorder label="Listening" onCancel={() => setRecording(false)} onDone={() => { setRecording(false); setInput("How do I add 1/4 and 2/3?"); toast.info("Voice transcribed (demo) — edit or send"); }} /> : (
            <form onSubmit={submit} className="relative flex items-end gap-2">
              <div className="relative">
                <Button type="button" variant="ghost" size="icon" aria-label="Attach" aria-expanded={attachOpen} onClick={() => setAttachOpen((v) => !v)}><Paperclip size={20} /></Button>
                <AnimatePresence>{attachOpen && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-2xl border border-border bg-surface p-1.5 shadow-glow">
                  {[{ i: Camera, l: "Photo of my handwritten work", f: () => addAtt({ kind: "image", name: "my-handwritten-working.jpg", mock: "handwritten-maths" }) }, { i: ImageIcon, l: "Textbook page photo", f: () => addAtt({ kind: "image", name: "textbook-page-48.jpg", mock: "textbook-page" }) }, { i: FileText, l: "Document or PDF", f: () => { addAtt({ kind: "doc", name: "class-notes.pdf" }); setCtx((x) => x.some((y) => y.id === "doc-notes") ? x : [...x, SUGGESTED_CONTEXT[3]]); } }, { i: MusicNotes, l: "Audio clip", f: () => addAtt({ kind: "audio", name: "lecture-clip.m4a" }) }].map((o) => <button key={o.l} type="button" onClick={o.f} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm hover:bg-surface-2"><o.i size={18} className="text-primary" />{o.l}</button>)}
                </motion.div>}</AnimatePresence>
              </div>
              <label htmlFor="tutor-input" className="sr-only">Message your tutor</label>
              <textarea id="tutor-input" rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} placeholder={modeCfg.placeholder} className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-border bg-surface-2 px-4 py-2.5 text-sm placeholder:text-text-2/70" />
              <Button type="button" variant="ghost" size="icon" aria-label="Voice input" onClick={() => setRecording(true)}><Microphone size={20} /></Button>
              <Button type="submit" size="icon" aria-label="Send" disabled={thinking || (!input.trim() && pending.length === 0)}><PaperPlaneRight size={18} weight="fill" /></Button>
            </form>
          )}
          <p className="text-center text-[11px] text-text-2">AI Tutor answers are labelled and can be wrong — check with your teacher for anything graded. Demo: no real AI model is called.</p>
        </div>
      </section>

      <Drawer open={history} onOpenChange={setHistory} title="Your conversations"><HistoryList items={convsQ.data ?? []} activeId={conv?.id} onOpen={openConv} onNew={newChat} onDelete={removeConv} /></Drawer>
      <PersonaliseSheet open={persona} onOpenChange={setPersona} prefs={basePrefs} />
      <AskDoubtSheet open={teacher} onOpenChange={setTeacher}
        context={{ courseId: ctx.find((c) => c.kind === "course")?.id, lessonId: ctx.find((c) => c.kind === "lesson")?.id, lessonTitle: ctx.find((c) => c.kind === "lesson")?.label, q: lastUser?.text, fromTutor: true, subjectId: topic === "foodchain" || topic === "cell" || topic === "photosynthesis" ? "sub-sci" : "sub-math" }}
        onCreated={(t) => { const note: TutorMessage = { id: uid("tm"), role: "tutor", at: new Date().toISOString(), text: "I’ve passed this to your teacher with our conversation as context. They’ll reply in your doubt thread — you can keep chatting with me in the meantime.", sources: [{ label: `Open doubt thread: ${t.title}`, kind: "doubt", href: `/student/doubts/${t.id}` }] }; const all = [...msgsRef.current, note]; setMessages(all); if (convRef.current) persist(convRef.current, all); }} />
    </div>
  );
}
