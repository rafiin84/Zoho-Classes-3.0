"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkle, PaperPlaneTilt, Lightbulb, CheckCircle, ArrowSquareOut, ChatCircleDots, Info } from "@phosphor-icons/react";
import { Avatar, Badge, Button, Card, CardBody, Input, PageHeader, Skeleton } from "@/components/ui";
import { feeService, learningProfileService, doubtService, eventService } from "@/lib/api";
import { subjectById } from "@/lib/mock-data/core";
import { ACHIEVEMENT_ITEMS } from "@/lib/mock-data/parent";
import { fmtDate, fmtMoney, fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChild } from "../useChild";
import { AccessGate, useRelationship } from "../relationship";

interface Fact { text: string; src: { label: string; date?: string; href: string } }
interface Answer { id: number; q: string; facts: Fact[]; suggestions: string[]; insufficient?: string; teacherAction?: boolean }
const SUGGESTED = ["How is my child doing in mathematics?", "What topics need more practice?", "What can we do together this weekend?", "Has the teacher responded to the doubt?", "What competitions are coming up?", "Explain the fee notice"];
const intent = (q: string) => { const s = q.toLowerCase(); return /fee|installment|payment|due|pay/.test(s) ? "fee" : /doubt|respond|repl|teacher said/.test(s) ? "doubt" : /competition|event|contest|quiz/.test(s) ? "events" : /weekend|together|home|activity|activities/.test(s) ? "weekend" : /practi|topic|weak|struggl|improve|gap/.test(s) ? "gaps" : /math|doing|progress|score|science|english|subject/.test(s) ? "progress" : "unknown"; };

async function respond(q: string, childId: string, first: string, interests: string[], full: boolean): Promise<Omit<Answer, "id" | "q">> {
  const kind = intent(q);
  if (kind === "progress") {
    const p = await learningProfileService.get(childId); if (!p || !Object.keys(p.subjectMastery).length) return { facts: [], suggestions: [], insufficient: `I don't have enough recorded activity for ${first} to describe progress yet.`, teacherAction: true };
    const sid = /science/i.test(q) ? "sub-sci" : /english/i.test(q) ? "sub-eng" : "sub-math"; const v = p.subjectMastery[sid]; const objs = p.objectives.filter((o) => o.subjectId === sid);
    if (v === undefined) return { facts: [], suggestions: [], insufficient: `There's no ${subjectById(sid).name} progress recorded for ${first} yet.`, teacherAction: true };
    return { facts: [{ text: `${first}'s ${subjectById(sid).name} progress is ${v}%.`, src: { label: "Learning profile", date: fmtDate(p.updatedAt), href: "/parent/learning" } }, ...objs.slice(0, 2).map((o) => ({ text: `${o.label}: ${o.mastery}% (${o.evidence}).`, src: { label: "Recorded checkpoint results", date: fmtDate(p.updatedAt), href: "/parent/learning" } }))], suggestions: [`Ask ${first} to explain one worked example aloud. Teaching it back is a strong way to learn.`] };
  }
  if (kind === "gaps") { const p = await learningProfileService.get(childId); if (!p) return { facts: [], suggestions: [], insufficient: "No learning data yet.", teacherAction: true }; if (!p.gaps.length) return { facts: [{ text: `No topics are currently flagged for extra practice for ${first}.`, src: { label: "Learning profile", date: fmtDate(p.updatedAt), href: "/parent/learning" } }], suggestions: ["Keep the routine going; short, regular practice works well."] };
    return { facts: p.gaps.map((g) => ({ text: `${g.label} (${subjectById(g.subjectId).name}): ${g.derivedFrom}.`, src: { label: "Recorded quiz results", date: fmtDate(p.updatedAt), href: "/parent/learning" } })), suggestions: ["Ten minutes, two or three times this week is usually enough.", "This isn't a judgement. These topics are simply where a little more practice helps."], teacherAction: true }; }
  if (kind === "weekend") { const p = await learningProfileService.get(childId); const gap = p?.gaps[0]; return { facts: gap ? [{ text: `${gap.label} is one topic flagged for practice.`, src: { label: "Learning profile", date: p ? fmtDate(p.updatedAt) : undefined, href: "/parent/learning" } }] : [], suggestions: [`Cook or bake together and let ${first} scale the recipe${gap ? ", which is a gentle way to practise fractions" : ""}.`, `Pick something from ${first}'s interests (${interests.slice(0, 2).join(", ")}) and do it as a 20-minute family challenge.`, "A short walk with one 'what do you notice?' question builds curiosity for science."] }; }
  if (kind === "doubt") { if (!full) return { facts: [], suggestions: [], insufficient: "Doubt threads need full access, which isn't available in the current relationship state." }; const d = await doubtService.forStudent(childId); if (!d.length) return { facts: [], suggestions: [], insufficient: `${first} hasn't asked any doubts yet.` };
    return { facts: d.slice(0, 2).map((x) => ({ text: `“${x.title}” is ${x.status}${x.status === "answered" ? `; the teacher replied ${fmtDateTime(x.updatedAt)}` : ""}.`, src: { label: "Doubt thread", date: fmtDate(x.updatedAt), href: "/parent/messages" } })), suggestions: ["You can read the teacher's reply together and ask them what they found clearer."], teacherAction: true }; }
  if (kind === "events") { const ev = childId === "stu-ananya" ? await eventService.list() : []; const up = ev.filter((e) => new Date(e.startAt) > new Date("2026-11-19") && e.myRegistration === "registered"); const items = ACHIEVEMENT_ITEMS.filter((a) => a.childId === childId && a.kind === "competition");
    const facts: Fact[] = [...up.map((e) => ({ text: `${first} is registered for ${e.title} on ${fmtDate(e.startAt)}.`, src: { label: "Events register", date: fmtDate(e.startAt), href: "/parent/feed" } })), ...items.filter((i) => !up.some((e) => i.title.includes(e.title.slice(0, 12)))).map((i) => ({ text: `${i.title}: ${i.detail}`, src: { label: "Achievements", date: fmtDate(i.at), href: "/parent/achievements" } }))];
    return facts.length ? { facts, suggestions: ["Talk about what they're hoping to enjoy rather than win."] } : { facts: [], suggestions: [], insufficient: `${first} isn't registered for any upcoming competition.` }; }
  if (kind === "fee") { if (!full) return { facts: [], suggestions: [], insufficient: "Fee details need full access. Relationship verification is still limited." }; const a = await feeService.account(childId); if (!a || !a.feesEnabled) return { facts: [], suggestions: [], insufficient: "School fees aren't collected online for this child." };
    const due = a.installments.find((i) => i.status === "due" || i.status === "overdue" || i.status === "partially-paid"); if (!due) return { facts: [{ text: `No fees are due for ${first}. All installments are paid.`, src: { label: "Fee account", href: "/parent/fees" } }], suggestions: [] };
    return { facts: [{ text: `${due.label} installment of ${fmtMoney(due.amount - due.paid)} is due on ${fmtDate(due.dueDate)}.`, src: { label: "Fee account", date: fmtDate(due.dueDate), href: "/parent/fees" } }, { text: `Total balance for the year is ${fmtMoney(a.balance)} after concessions of ${fmtMoney(a.concessionTotal)}.`, src: { label: "Fee account", href: "/parent/fees" } }], suggestions: ["You can pay now from Fees, or contact the finance office for a clarification."] }; }
  return { facts: [], suggestions: [], insufficient: "I can only answer from the records shown to you, and I don't have anything that answers this. Try one of the suggested questions, or ask the teacher directly.", teacherAction: true };
}

function Body() {
  const { childId, child, first } = useChild(); const full = useRelationship((s) => s.status === "verified");
  const [log, setLog] = useState<Answer[]>([]); const [input, setInput] = useState(""); const [busy, setBusy] = useState(false); const end = useRef<HTMLDivElement>(null); const n = useRef(0); const qc = useQueryClient();
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [log.length, busy]);
  const ask = async (q: string) => { const t = q.trim(); if (!t || busy) return; setInput(""); setBusy(true); const id = ++n.current; setLog((l) => [...l, { id, q: t, facts: [], suggestions: [] }]); try { const r = await respond(t, childId, first, child.interests, full); await new Promise((ok) => setTimeout(ok, 500)); setLog((l) => l.map((a) => (a.id === id ? { ...a, ...r } : a))); } catch { setLog((l) => l.map((a) => (a.id === id ? { ...a, insufficient: "I couldn't load the records just now. Please try again." } : a))); } finally { setBusy(false); qc.invalidateQueries({ queryKey: ["parent", "assistant"] }); } };
  return (
    <div className="mx-auto max-w-3xl">
      <Card tone="lilac" className="mb-4"><CardBody className="flex flex-wrap items-center gap-3 !py-3"><Avatar name={child.displayName} color={child.avatarColor} size={40} /><div className="flex-1"><p className="text-xs font-semibold text-text-2">Answering only about</p><p className="font-semibold">{child.displayName} · {child.gradeLabel} {child.className.slice(-1)}</p></div><Badge tone="ai">AI-generated · demo</Badge></CardBody></Card>
      <p className="mb-4 flex items-start gap-2 rounded-2xl bg-highlight-soft p-3 text-xs text-warning"><Info size={16} className="mt-0.5 shrink-0" />Demo assistant: no AI model runs. Answers are assembled from {first}&apos;s school records, shown with where each fact came from. It doesn&apos;t give medical or psychological assessments.</p>
      <div className="space-y-4" aria-live="polite">
        {log.length === 0 && <div className="rounded-[1.25rem] border border-dashed border-border bg-surface p-6 text-center"><Sparkle size={32} weight="duotone" className="mx-auto text-primary" /><h2 className="mt-2 font-semibold">What would you like to know about {first}?</h2><div className="mt-3 flex flex-wrap justify-center gap-2">{SUGGESTED.map((s) => <button key={s} className="rounded-full bg-lilac px-3 py-1.5 text-sm font-medium text-primary hover:bg-lavender/40" onClick={() => ask(s)}>{s}</button>)}</div></div>}
        {log.map((a, i) => <div key={a.id} className="space-y-2"><div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-fg">{a.q}</div>
          {busy && i === log.length - 1 && !a.facts.length && !a.insufficient ? <div className="max-w-[60%] rounded-2xl border border-border bg-surface p-4" role="status"><Skeleton className="h-4 w-40" /><span className="sr-only">Looking at {first}&apos;s records</span></div> : (
            <div className="max-w-[95%] space-y-3 rounded-2xl rounded-bl-md border border-border bg-surface p-4 shadow-soft">
              {a.insufficient && <div className="rounded-xl bg-warning-soft p-3 text-sm text-warning"><p className="font-semibold">Not enough data</p><p>{a.insufficient}</p></div>}
              {a.facts.length > 0 && <div><p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-text-2"><CheckCircle size={14} weight="fill" className="text-success" />Recorded facts</p><ul className="space-y-2">{a.facts.map((f, j) => <li key={j} className="rounded-xl bg-surface-2 p-3 text-sm">{f.text}<Link href={f.src.href} className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Source: {f.src.label}{f.src.date ? ` · ${f.src.date}` : ""}<ArrowSquareOut size={12} /></Link></li>)}</ul></div>}
              {a.suggestions.length > 0 && <div><p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-text-2"><Lightbulb size={14} weight="fill" className="text-warning" />Suggestions (not recorded facts)</p><ul className="list-disc space-y-1 pl-5 text-sm">{a.suggestions.map((s, j) => <li key={j}>{s}</li>)}</ul></div>}
              {a.teacherAction && <Button asChild size="sm" variant="soft"><Link href="/parent/messages"><ChatCircleDots size={16} />Ask the teacher about this</Link></Button>}
            </div>)}</div>)}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className={cn("sticky bottom-2 mt-4 flex gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-card backdrop-blur")}><Input aria-label={`Ask about ${first}`} value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Ask about ${first}…`} /><Button type="submit" size="icon" aria-label="Send" disabled={!input.trim() || busy}><PaperPlaneTilt size={18} weight="fill" /></Button></form>
      {log.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{SUGGESTED.map((s) => <button key={s} className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-lilac" onClick={() => ask(s)}>{s}</button>)}</div>}
    </div>
  );
}
export default function ParentAssistant() {
  const { childId } = useChild();
  return <div><PageHeader title="Parent AI Assistant" subtitle="Plain answers about your child, with the record behind each one." /><AccessGate need="basic"><Body key={childId} /></AccessGate></div>;
}
