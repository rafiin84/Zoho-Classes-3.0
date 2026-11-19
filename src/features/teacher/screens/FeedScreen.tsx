"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, PaperPlaneRight, Trophy, Gavel, CalendarBlank, ChatCircle, Heart } from "@phosphor-icons/react";
import { PageHeader, Segmented, Card, CardBody, Badge, StatusBadge, Button, Modal, Field, Input, Textarea, Select, EmptyState, ConfirmDialog, SkeletonCards, Avatar, toast, Progress } from "@/components/ui";
import type { EventItem, EventStatus, AudienceType } from "@/types";
import { feedService, eventService, notificationService } from "@/lib/api";
import { STUDENTS } from "@/lib/mock-data/core";
import { fmtDateTime, relTime } from "@/lib/format";
import { useTeacher, Q, errMsg, KEYS } from "../components/common";

type Tab = "feed" | "events" | "judging";
export default function FeedScreen() {
  const [tab, setTab] = React.useState<Tab>("feed");
  return (
    <div className="mx-auto max-w-5xl"><PageHeader title="Feed & Events" subtitle="Post to your class feeds and run events from registration to results." />
      <div className="mb-4"><Segmented label="Feed sections" value={tab} onChange={setTab} options={[{ value: "feed", label: "Class feed" }, { value: "events", label: "Events" }, { value: "judging", label: "Judging" }]} /></div>
      {tab === "feed" && <ClassFeed />}{tab === "events" && <Events />}{tab === "judging" && <Judging />}
    </div>
  );
}

const postSchema = z.object({ text: z.string().trim().min(5, "Write at least 5 characters").max(500, "Keep it under 500 characters"), audience: z.string().min(1) });
const AUDIENCES: { v: string; label: string; type: AudienceType }[] = [{ v: "Grade 8B", label: "Grade 8 · B", type: "class" }, { v: "Grade 8A", label: "Grade 8 · A", type: "class" }, { v: "Grade 7A", label: "Grade 7 · A", type: "class" }];
function ClassFeed() {
  const t = useTeacher(); const qc = useQueryClient();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<z.infer<typeof postSchema>>({ resolver: zodResolver(postSchema), defaultValues: { text: "", audience: "Grade 8B" } });
  const feed = useQuery({ queryKey: [...KEYS.feed, t.id], queryFn: () => feedService.list({ role: "teacher", id: t.id }, { filter: "class", size: 20 }) });
  const post = useMutation({ mutationFn: (v: z.infer<typeof postSchema>) => { const a = AUDIENCES.find((x) => x.v === v.audience)!; return feedService.teacherPost({ authorId: t.id, authorName: t.name, text: v.text, audienceLabel: v.audience, audienceType: a.type }); },
    onSuccess: () => { toast.success("Posted to the class feed"); reset({ text: "", audience: watch("audience") }); qc.invalidateQueries({ queryKey: [...KEYS.feed] }); qc.invalidateQueries({ queryKey: ["student"] }); }, onError: (e) => toast.error(errMsg(e)) });
  return (<div className="space-y-4">
    <Card><CardBody><form onSubmit={handleSubmit((v) => post.mutate(v))} className="space-y-2" noValidate>
      <Field label="Post to class feed" required error={errors.text?.message} htmlFor="fp-text"><Textarea id="fp-text" placeholder="Share an update, resource or reminder…" {...register("text")} /></Field>
      <div className="flex flex-wrap items-center gap-2"><label htmlFor="fp-aud" className="sr-only">Audience</label><Select id="fp-aud" className="!w-auto" {...register("audience")}>{AUDIENCES.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}</Select><span className="text-xs text-text-2">Visible to students and parents of that class.</span><Button type="submit" className="ml-auto" loading={post.isPending}><PaperPlaneRight size={16} />Post</Button></div></form></CardBody></Card>
    <Q q={feed} skeleton={<SkeletonCards n={3} h="h-24" />} isEmpty={(d) => !d.items.length} empty={<EmptyState title="Nothing posted yet" body="Your class feed is empty. Share the first update above." />}>
      {(d) => <ul className="space-y-3">{d.items.map((p) => <li key={p.id}><Card><CardBody className="space-y-2"><div className="flex items-center gap-2"><Avatar name={p.authorName} color={p.authorColor} size={32} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{p.authorName}</p><p className="text-xs text-text-2">{p.audienceLabel} · {p.contextLabel} · {relTime(p.createdAt)}</p></div><Badge>{p.moderationStatus}</Badge></div><p className="whitespace-pre-line text-sm">{p.text}</p><p className="flex gap-3 text-xs text-text-2"><span className="flex items-center gap-1"><Heart size={14} />{p.reactionCount}</span><span className="flex items-center gap-1"><ChatCircle size={14} />{p.commentCount}{p.commentsDisabled ? " (off)" : ""}</span></p></CardBody></Card></li>)}</ul>}
    </Q></div>);
}

const NEXT: Partial<Record<EventStatus, { to: EventStatus; label: string }>> = { draft: { to: "published", label: "Publish" }, published: { to: "registration-open", label: "Open registration" }, "registration-open": { to: "registration-closed", label: "Close registration" }, "registration-closed": { to: "in-progress", label: "Start event" }, "in-progress": { to: "judging", label: "Move to judging" }, judging: { to: "results-published", label: "Publish results" }, "results-published": { to: "completed", label: "Mark completed" } };
const evSchema = z.object({ title: z.string().trim().min(4, "Title needs 4+ characters"), category: z.string().min(2), venue: z.string().trim().min(2, "Add a venue"), startAt: z.string().min(1, "Choose a start"), endAt: z.string().min(1, "Choose an end"), capacity: z.coerce.number().int().min(1, "At least 1").max(1000), eligibility: z.string().trim().min(3, "Say who can join") }).refine((v) => v.endAt > v.startAt, { path: ["endAt"], message: "End must be after start" });
function Events() {
  const qc = useQueryClient(); const q = useQuery({ queryKey: [...KEYS.events], queryFn: () => eventService.list() });
  const [open, setOpen] = React.useState(false); const [reg, setReg] = React.useState<EventItem | null>(null); const [adv, setAdv] = React.useState<{ e: EventItem; n: NonNullable<(typeof NEXT)[EventStatus]> } | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof evSchema>>({ resolver: zodResolver(evSchema) as any, defaultValues: { title: "", category: "Academic · Quiz", venue: "", startAt: "", endAt: "", capacity: 60, eligibility: "Grade 8" } });
  const inv = () => { qc.invalidateQueries({ queryKey: [...KEYS.events] }); qc.invalidateQueries({ queryKey: ["student"] }); };
  const create = useMutation({ mutationFn: (v: z.infer<typeof evSchema>) => eventService.create({ title: v.title, category: v.category, venue: v.venue, startAt: new Date(v.startAt).toISOString(), endAt: new Date(v.endAt).toISOString(), capacity: v.capacity, eligibility: v.eligibility, scope: "class", organiser: "Greenfield · Mathematics" }), onSuccess: () => { toast.success("Event created as a draft"); inv(); reset(); setOpen(false); }, onError: (e) => toast.error(errMsg(e)) });
  const advance = useMutation({ mutationFn: ({ e, n }: { e: EventItem; n: { to: EventStatus } }) => eventService.setStatus(e.id, n.to), onSuccess: (_, v) => { toast.success(`Status: ${v.n.to.replace(/-/g, " ")}`); inv(); } });
  const cancel = useMutation({ mutationFn: (id: string) => eventService.setStatus(id, "cancelled"), onSuccess: () => { toast.info("Event cancelled"); inv(); } });
  const [cx, setCx] = React.useState<EventItem | null>(null);
  return (<>
    <div className="mb-3 flex justify-end"><Button onClick={() => setOpen(true)}><Plus size={16} />Create event</Button></div>
    <Q q={q} isEmpty={(d) => !d.length} empty={<EmptyState title="No events" body="Create an event to open registrations." action={{ label: "Create event", onClick: () => setOpen(true) }} />}>
      {(d) => <ul className="space-y-2">{d.map((e) => { const n = NEXT[e.status]; return <li key={e.id}><Card><CardBody className="flex flex-wrap items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-lilac text-primary"><CalendarBlank size={20} /></span><div className="min-w-0 flex-1"><p className="font-semibold">{e.title}</p><p className="text-xs text-text-2">{fmtDateTime(e.startAt)} · {e.venue} · <span className="tnum">{e.registered}/{e.capacity}</span> registered</p></div><StatusBadge status={e.status} label={e.status.replace(/-/g, " ")} />
        <Button size="sm" variant="ghost" onClick={() => setReg(e)}>Registrations</Button>{n && <Button size="sm" variant="soft" onClick={() => setAdv({ e, n })}>{n.label}</Button>}{!["cancelled", "completed", "results-published"].includes(e.status) && <Button size="sm" variant="ghost" onClick={() => setCx(e)}>Cancel</Button>}</CardBody></Card></li>; })}</ul>}
    </Q>
    <Modal open={open} onOpenChange={setOpen} title="Create event" className="sm:max-w-xl"><form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3" noValidate>
      <Field label="Title" required error={errors.title?.message} htmlFor="ev-t"><Input id="ev-t" {...register("title")} /></Field>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Category" htmlFor="ev-c"><Input id="ev-c" {...register("category")} /></Field><Field label="Venue" required error={errors.venue?.message} htmlFor="ev-v"><Input id="ev-v" {...register("venue")} /></Field><Field label="Starts" required error={errors.startAt?.message} htmlFor="ev-s"><Input id="ev-s" type="datetime-local" {...register("startAt")} /></Field><Field label="Ends" required error={errors.endAt?.message} htmlFor="ev-e"><Input id="ev-e" type="datetime-local" {...register("endAt")} /></Field><Field label="Capacity" required error={errors.capacity?.message} htmlFor="ev-cap"><Input id="ev-cap" type="number" {...register("capacity")} /></Field><Field label="Eligibility" required error={errors.eligibility?.message} htmlFor="ev-el"><Input id="ev-el" {...register("eligibility")} /></Field></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create draft</Button></div></form></Modal>
    <Registrations e={reg} onClose={() => setReg(null)} />
    <ConfirmDialog open={!!adv} onOpenChange={(v) => !v && setAdv(null)} title={adv?.n.label ?? ""} body={`“${adv?.e.title}” moves to “${adv?.n.to.replace(/-/g, " ")}”. Students will see the new status.`} confirmLabel="Confirm" onConfirm={() => adv && advance.mutate(adv)} />
    <ConfirmDialog open={!!cx} onOpenChange={(v) => !v && setCx(null)} destructive title="Cancel this event?" body={`“${cx?.title}” is marked cancelled for everyone registered.`} confirmLabel="Cancel event" onConfirm={() => cx && cancel.mutate(cx.id)} />
  </>);
}
function Registrations({ e, onClose }: { e: EventItem | null; onClose: () => void }) {
  const [state, setState] = React.useState<Record<string, "registered" | "waitlisted" | "removed">>({});
  const people = e ? STUDENTS.filter((s) => s.classId === "cls-8b").slice(0, Math.min(8, Math.max(e.registered, 0))) : [];
  return <Modal open={!!e} onOpenChange={(v) => !v && onClose()} title="Registrations" description={e ? `${e.title} · ${e.registered} registered of ${e.capacity}` : ""}>{!people.length ? <EmptyState title="No registrations yet" body="Students appear here after registration opens." /> : <ul className="space-y-2">{people.map((p) => <li key={p.id} className="flex items-center gap-2 text-sm"><Avatar name={p.displayName} color={p.avatarColor} size={28} /><span className="flex-1">{p.displayName}</span><Select aria-label={`Status for ${p.displayName}`} className="!h-9 !w-auto" value={state[p.id] ?? "registered"} onChange={(ev) => { setState((s) => ({ ...s, [p.id]: ev.target.value as any })); toast.success(`${p.displayName}: ${ev.target.value}`); }}><option value="registered">Registered</option><option value="waitlisted">Waitlisted</option><option value="removed">Removed</option></Select></li>)}</ul>}</Modal>;
}

/* ---------------- Judging ---------------- */
interface JState { judges: { name: string; coi: boolean; note: string; assigned: boolean }[]; weights: { criterion: string; weight: number }[]; scores: Record<string, Record<string, number>>; comments: Record<string, string>; approved: boolean }
const jStore: Record<string, JState> = {};
const CAND = STUDENTS.filter((s) => s.classId === "cls-8b").slice(0, 5);
function Judging() {
  const t = useTeacher(); const qc = useQueryClient();
  const q = useQuery({ queryKey: [...KEYS.events], queryFn: () => eventService.list() });
  const [id, setId] = React.useState(""); const [, force] = React.useReducer((x: number) => x + 1, 0); const [confirm, setConfirm] = React.useState(false);
  const ev = q.data?.find((e) => e.id === id) ?? null;
  const st = ev ? (jStore[ev.id] ??= { judges: [{ name: t.plain, coi: false, note: "", assigned: true }, { name: "Daniel Okafor", coi: false, note: "", assigned: false }, { name: "Leela Krishnan", coi: false, note: "", assigned: false }], weights: (ev.rubric.length ? ev.rubric : [{ criterion: "Accuracy", weight: 50 }, { criterion: "Creativity", weight: 30 }, { criterion: "Presentation", weight: 20 }]).map((r) => ({ ...r })), scores: {}, comments: {}, approved: false }) : null;
  const wTotal = st?.weights.reduce((a, w) => a + w.weight, 0) ?? 0;
  const myJ = st?.judges.find((j) => j.name === t.plain);
  const total = (sid: string) => st ? Math.round(st.weights.reduce((a, w) => a + ((st.scores[sid]?.[w.criterion] ?? 0) * w.weight) / 100, 0) * 10) / 10 : 0;
  const ranked = st ? [...CAND].map((s) => ({ s, total: total(s.id) })).sort((a, b) => b.total - a.total) : [];
  const scored = st ? CAND.every((s) => st.weights.every((w) => st.scores[s.id]?.[w.criterion] !== undefined)) : false;
  const publish = useMutation({ mutationFn: async () => { const top = ranked.slice(0, 3); await eventService.setStatus(ev!.id, "results-published");
    await feedService.teacherPost({ authorId: t.id, authorName: t.name, text: `Results: ${ev!.title}. Winners — ${top.map((x, i) => `${i + 1}. ${x.s.displayName} (${x.total})`).join(", ")}. Congratulations to everyone who took part! Certificates will be available in your profile.`, audienceLabel: "Whole school", audienceType: "school", postType: "achievement" });
    top.forEach((x) => notificationService.push({ role: "student", recipientId: x.s.id, category: "events", title: `Certificate ready: ${ev!.title}`, body: `You placed ${top.indexOf(x) + 1}`, href: "/student/certificates" })); },
    onSuccess: () => { st!.approved = true; toast.success("Results approved, announced and certificates issued"); qc.invalidateQueries({ queryKey: [...KEYS.events] }); qc.invalidateQueries({ queryKey: [...KEYS.feed] }); qc.invalidateQueries({ queryKey: ["student"] }); force(); }, onError: (e) => toast.error(errMsg(e)) });
  const judgable = (q.data ?? []).filter((e) => ["in-progress", "judging", "results-published"].includes(e.status) || e.rubric.length);
  return (<Q q={q} isEmpty={() => !judgable.length} empty={<EmptyState title="No events to judge" body="Events appear here once they are in progress or judging." />}>
    {() => (<div className="space-y-4">
      <Field label="Event" htmlFor="j-ev"><Select id="j-ev" value={id} onChange={(e) => setId(e.target.value)}><option value="">Choose an event…</option>{judgable.map((e) => <option key={e.id} value={e.id}>{e.title} ({e.status.replace(/-/g, " ")})</option>)}</Select></Field>
      {!ev || !st ? <EmptyState title="Select an event" body="Choose an event to assign judges, set criteria and enter scores." icon={<Gavel size={28} />} /> : (<>
        <Card><CardBody className="space-y-2"><h2 className="text-sm font-bold">Judges & conflict-of-interest declaration</h2>
          {st.judges.map((j, i) => <div key={j.name} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 p-2.5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--primary)]" checked={j.assigned} disabled={st.approved} onChange={(e) => { st.judges[i].assigned = e.target.checked; force(); }} />{j.name}</label>{j.assigned && <><label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={j.coi} disabled={st.approved} onChange={(e) => { st.judges[i].coi = e.target.checked; force(); }} className="accent-[var(--primary)]" />I have a conflict of interest</label>{j.coi && <Input aria-label={`Conflict details for ${j.name}`} className="!h-9 flex-1" placeholder="Describe the relationship (required)" value={j.note} onChange={(e) => { st.judges[i].note = e.target.value; force(); }} />}</>}{j.coi && !j.note.trim() && j.assigned && <span role="alert" className="text-xs font-medium text-danger">Details required</span>}</div>)}
          {myJ?.coi && <p className="rounded-xl bg-warning-soft p-2 text-xs">You declared a conflict, so you cannot score. Another judge must score and approve.</p>}</CardBody></Card>
        <Card><CardBody className="space-y-2"><h2 className="text-sm font-bold">Scoring criteria & weights</h2>{st.weights.map((w, i) => <div key={w.criterion} className="flex items-center gap-2 text-sm"><span className="flex-1">{w.criterion}</span><Input aria-label={`${w.criterion} weight`} type="number" min={0} max={100} className="!w-24" disabled={st.approved} value={w.weight} onChange={(e) => { st.weights[i].weight = Number(e.target.value); force(); }} />%</div>)}<p role="status" className={wTotal === 100 ? "text-xs font-semibold text-success" : "text-xs font-semibold text-danger"}>Weights total {wTotal}%{wTotal === 100 ? "" : " — must be 100%"}</p></CardBody></Card>
        <Card><CardBody className="space-y-3"><h2 className="text-sm font-bold">Score entry (0–10 per criterion)</h2>
          {CAND.map((s) => <div key={s.id} className="rounded-xl border border-border p-3"><div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold">{s.displayName}</span><Badge tone="primary">Weighted {total(s.id)}</Badge></div><div className="grid gap-2 sm:grid-cols-3">{st.weights.map((w) => <Field key={w.criterion} label={w.criterion} htmlFor={`sc-${s.id}-${w.criterion}`} error={(st.scores[s.id]?.[w.criterion] ?? 0) > 10 ? "Max 10" : undefined}><Input id={`sc-${s.id}-${w.criterion}`} type="number" min={0} max={10} step={0.5} disabled={st.approved || !!myJ?.coi} value={st.scores[s.id]?.[w.criterion] ?? ""} onChange={(e) => { (st.scores[s.id] ??= {})[w.criterion] = Math.max(0, Math.min(10, Number(e.target.value))); force(); }} /></Field>)}</div><Input aria-label={`Comment for ${s.displayName}`} className="mt-2" placeholder="Comment for the participant" disabled={st.approved} value={st.comments[s.id] ?? ""} onChange={(e) => { st.comments[s.id] = e.target.value; force(); }} /></div>)}</CardBody></Card>
        <Card><CardBody className="space-y-2"><h2 className="flex items-center gap-2 text-sm font-bold"><Trophy size={16} />Provisional ranking</h2>{!scored ? <p className="text-sm text-text-2">Enter every score to see the ranking.</p> : <ol className="space-y-1 text-sm">{ranked.map((r, i) => <li key={r.s.id} className="flex items-center gap-2"><Badge tone={i < 3 ? "highlight" : "neutral"}>#{i + 1}</Badge><span className="flex-1">{r.s.displayName}</span><span className="tnum font-semibold">{r.total}</span></li>)}</ol>}
          {st.approved || ev.status === "results-published" ? <p role="status" className="rounded-xl bg-success-soft p-2 text-sm text-success">Results approved and announced. Certificates issued to winners.</p> : <Button disabled={!scored || wTotal !== 100 || !!myJ?.coi || st.judges.some((j) => j.assigned && j.coi && !j.note.trim())} loading={publish.isPending} onClick={() => setConfirm(true)}>Approve final results & announce</Button>}</CardBody></Card>
      </>)}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Approve final results?" body="Winners are announced to the whole school, certificates are issued and scores lock. This can't be undone in the prototype." confirmLabel="Approve & announce" onConfirm={() => publish.mutate()} />
    </div>)}
  </Q>);
}
