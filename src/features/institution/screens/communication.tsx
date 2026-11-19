"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "@phosphor-icons/react";
import { PageHeader, Segmented, Card, Button, Badge, StatusBadge, Modal, Field, Input, Select, Textarea, ListToolbar, NoResults, EmptyState, ConfirmDialog, toast } from "@/components/ui";
import { circularService, AUDIENCES } from "@/lib/api/circularService";
import { eventService } from "@/lib/api/eventService";
import type { EventStatus } from "@/types";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { useQ, Q, DataTable, DemoNote, onErr } from "../kit";

const cSchema = z.object({ title: z.string().min(5, "Title needs 5+ characters"), body: z.string().min(20, "Write at least 20 characters"), audience: z.string().min(1), kind: z.enum(["circular", "announcement"]), when: z.string().optional() });
const eSchema = z.object({ title: z.string().min(5, "Title needs 5+ characters"), category: z.string().min(3, "Enter a category"), venue: z.string().min(3, "Enter a venue"), startAt: z.string().min(1, "Choose a date"), capacity: z.coerce.number().min(1, "At least 1").max(5000), scope: z.enum(["class", "school", "inter-school", "district", "state"]) });
const NEXT: Partial<Record<EventStatus, EventStatus>> = { draft: "published", published: "registration-open", "registration-open": "registration-closed", "registration-closed": "in-progress", "in-progress": "judging", judging: "results-published", "results-published": "completed" };
type Tab = "circulars" | "events" | "calendar";

export default function CommunicationScreen(_: ScreenProps) {
  const [tab, setTab] = React.useState<Tab>("circulars");
  return (
    <div>
      <PageHeader title="Communication & Events" subtitle="Official circulars and announcements, events and competitions. Staff chat is separate (Staff Communication)." />
      <div className="mb-5"><Segmented label="Sections" value={tab} onChange={setTab} options={[{ value: "circulars", label: "Circulars & announcements" }, { value: "events", label: "Events & competitions" }, { value: "calendar", label: "Calendar" }]} /></div>
      {tab === "circulars" && <Circulars />}{tab === "events" && <Events />}{tab === "calendar" && <Calendar />}
    </div>
  );
}

function Circulars() {
  const qc = useQueryClient(); const [q, setQ] = React.useState(""); const [st, setSt] = React.useState(""); const [open, setOpen] = React.useState(false); const [del, setDel] = React.useState<string | null>(null);
  const list = useQ(["circulars"], () => circularService.list());
  const f = useForm<z.input<typeof cSchema>>({ resolver: zodResolver(cSchema) as never, defaultValues: { title: "", body: "", audience: AUDIENCES[0], kind: "circular", when: "" } });
  const inv = () => { qc.invalidateQueries({ queryKey: ["inst", "circulars"] }); qc.invalidateQueries({ queryKey: ["inst", "audit"] }); };
  const m = useMutation({ mutationFn: async (v: { d: z.input<typeof cSchema>; mode: "draft" | "publish" | "schedule" }) => { const c = await circularService.create({ title: v.d.title, body: v.d.body, audience: v.d.audience, kind: v.d.kind, mode: v.mode === "publish" ? "draft" : v.mode, scheduledFor: v.d.when ? new Date(v.d.when).toISOString() : undefined }); return v.mode === "publish" ? circularService.publish(c.id) : c; }, onSuccess: (c) => { toast.success(c.status === "published" ? "Published to the school feed." : c.status === "scheduled" ? "Scheduled." : "Draft saved."); f.reset(); setOpen(false); inv(); }, onError: onErr });
  const pub = useMutation({ mutationFn: (id: string) => circularService.publish(id), onSuccess: () => { toast.success("Published to the school feed."); inv(); }, onError: onErr });
  const rm = useMutation({ mutationFn: (id: string) => circularService.remove(id), onSuccess: () => { toast.success("Deleted."); inv(); setDel(null); }, onError: onErr });
  const e = f.formState.errors; const kind = f.watch("kind");
  return (
    <div>
      <ListToolbar query={q} onQuery={setQ} placeholder="Search circulars" hasFilters={!!st} onClear={() => { setQ(""); setSt(""); }}>
        <Select aria-label="Status" className="w-auto" value={st} onChange={(e) => setSt(e.target.value)}><option value="">Any status</option><option>draft</option><option>scheduled</option><option>published</option></Select>
        <Button onClick={() => setOpen(true)}><Plus size={14} /> Compose</Button>
      </ListToolbar>
      <Q q={list}>{(all) => { const rows = all.filter((c) => (!q || `${c.title} ${c.body}`.toLowerCase().includes(q.toLowerCase())) && (!st || c.status === st));
        return !all.length ? <EmptyState title="No communications yet" body="Compose an official circular or announcement." action={{ label: "Compose", onClick: () => setOpen(true) }} /> : !rows.length ? <NoResults query={q} onClear={() => { setQ(""); setSt(""); }} /> :
          <ul className="space-y-3">{rows.map((c) => <li key={c.id}><Card className="p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="mb-1 flex flex-wrap gap-1.5"><Badge tone={c.kind === "circular" ? "primary" : "info"}>{c.kind === "circular" ? "Official circular" : "Announcement"}</Badge><StatusBadge status={c.status} />{c.scheduledFor && <Badge>Sends {fmtDateTime(c.scheduledFor)}</Badge>}</div><h3 className="font-semibold">{c.title}</h3><p className="text-sm text-text-2">{c.body}</p><p className="mt-1 text-xs text-text-2">To {c.audience} · {c.author}{c.status === "published" && ` · ${c.reads} read`}</p></div>
            <div className="flex gap-2">{c.status !== "published" && <Button size="sm" loading={pub.isPending && pub.variables === c.id} onClick={() => pub.mutate(c.id)}>{c.status === "scheduled" ? "Send now" : "Publish"}</Button>}<Button size="sm" variant="ghost" onClick={() => setDel(c.id)}>Delete</Button></div></div></Card></li>)}</ul>; }}</Q>
      <Modal open={open} onOpenChange={setOpen} title="Compose communication" className="sm:max-w-xl" footer={<><Button variant="ghost" onClick={() => f.handleSubmit((d) => m.mutate({ d, mode: "draft" }))()}>Save draft</Button><Button variant="outline" loading={m.isPending} onClick={f.handleSubmit((d) => m.mutate({ d, mode: "schedule" }))}>Schedule</Button><Button loading={m.isPending} onClick={f.handleSubmit((d) => m.mutate({ d, mode: "publish" }))}>Publish now</Button></>}>
        <form className="space-y-3" onSubmit={(ev) => ev.preventDefault()}>
          <Field label="Type" htmlFor="cm-k"><Select id="cm-k" {...f.register("kind")}><option value="circular">Official circular</option><option value="announcement">Announcement</option></Select></Field>
          <Field label="Title" error={e.title?.message} required htmlFor="cm-t"><Input id="cm-t" aria-invalid={!!e.title} {...f.register("title")} /></Field>
          <Field label="Message" error={e.body?.message} required htmlFor="cm-b"><Textarea id="cm-b" aria-invalid={!!e.body} {...f.register("body")} /></Field>
          <Field label="Audience" htmlFor="cm-a"><Select id="cm-a" {...f.register("audience")}>{AUDIENCES.map((a) => <option key={a}>{a}</option>)}</Select></Field>
          <Field label="Schedule for (only when scheduling)" htmlFor="cm-w" optional><Input id="cm-w" type="datetime-local" {...f.register("when")} /></Field>
          {kind === "circular" && <DemoNote tone="info">Official circulars are recorded and audited; they are not staff chat messages.</DemoNote>}
        </form>
      </Modal>
      <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)} destructive title="Delete this communication?" body="Already-published posts stay in the feed; use Feed Moderation to hide them." confirmLabel="Delete" onConfirm={() => del && rm.mutate(del)} />
    </div>
  );
}

function Events() {
  const qc = useQueryClient(); const [open, setOpen] = React.useState(false); const list = useQ(["events-mgmt"], () => eventService.list());
  const f = useForm<z.input<typeof eSchema>>({ resolver: zodResolver(eSchema) as never, defaultValues: { title: "", category: "", venue: "", startAt: "", capacity: 100, scope: "school" } });
  const inv = () => { qc.invalidateQueries({ queryKey: ["inst", "events-mgmt"] }); qc.invalidateQueries({ queryKey: ["inst", "events"] }); qc.invalidateQueries({ queryKey: ["events"] }); };
  const add = useMutation({ mutationFn: (d: z.input<typeof eSchema>) => eventService.create({ title: d.title, category: d.category, venue: d.venue, startAt: new Date(d.startAt).toISOString(), endAt: new Date(d.startAt).toISOString(), capacity: Number(d.capacity), scope: d.scope, organiser: "Greenfield International School" }), onSuccess: () => { toast.success("Event created as a draft."); setOpen(false); f.reset(); inv(); }, onError: onErr });
  const adv = useMutation({ mutationFn: (v: { id: string; s: EventStatus }) => eventService.setStatus(v.id, v.s), onSuccess: (e) => { toast.success(`Event is now ${e.status.replace(/-/g, " ")}.`); inv(); }, onError: onErr });
  const e = f.formState.errors;
  return (
    <div><div className="mb-3 flex justify-end"><Button onClick={() => setOpen(true)}><Plus size={14} /> Create event</Button></div>
      <Q q={list}>{(rows) => !rows.length ? <EmptyState title="No events" body="Create the first event or competition." action={{ label: "Create event", onClick: () => setOpen(true) }} /> : <DataTable ariaLabel="Events" rows={rows} rowKey={(x) => x.id} cols={[{ key: "t", header: "Event", cell: (x) => <span><b>{x.title}</b><span className="block text-xs text-text-2">{x.category} · {x.scope} · {x.venue}</span></span>, sort: (a, b) => a.title.localeCompare(b.title) }, { key: "d", header: "Date", cell: (x) => fmtDate(x.startAt), sort: (a, b) => a.startAt.localeCompare(b.startAt) }, { key: "r", header: "Registrations", cell: (x) => `${x.registered}/${x.capacity}`, align: "right", sort: (a, b) => a.registered - b.registered }, { key: "s", header: "Lifecycle", cell: (x) => <StatusBadge status={x.status} label={x.status.replace(/-/g, " ")} /> }, { key: "a", header: "", cell: (x) => <div className="flex gap-1">{NEXT[x.status] && <Button size="sm" variant="outline" loading={adv.isPending && adv.variables?.id === x.id} onClick={() => adv.mutate({ id: x.id, s: NEXT[x.status]! })}>Move to {NEXT[x.status]!.replace(/-/g, " ")}</Button>}{!["completed", "cancelled"].includes(x.status) && <Button size="sm" variant="ghost" onClick={() => adv.mutate({ id: x.id, s: "cancelled" })}>Cancel</Button>}</div> }]} />}</Q>
      <Modal open={open} onOpenChange={setOpen} title="Create event" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button loading={add.isPending} onClick={f.handleSubmit((d) => add.mutate(d))}>Create</Button></>}>
        <form className="space-y-3" onSubmit={f.handleSubmit((d) => add.mutate(d))}>
          <Field label="Title" error={e.title?.message} required htmlFor="ev-t"><Input id="ev-t" aria-invalid={!!e.title} {...f.register("title")} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Category" error={e.category?.message} htmlFor="ev-c"><Input id="ev-c" placeholder="Sports · Chess" {...f.register("category")} /></Field><Field label="Scope" htmlFor="ev-s"><Select id="ev-s" {...f.register("scope")}>{["class", "school", "inter-school", "district", "state"].map((s) => <option key={s}>{s}</option>)}</Select></Field></div>
          <Field label="Venue" error={e.venue?.message} htmlFor="ev-v"><Input id="ev-v" {...f.register("venue")} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Starts" error={e.startAt?.message} htmlFor="ev-d"><Input id="ev-d" type="datetime-local" {...f.register("startAt")} /></Field><Field label="Capacity" error={e.capacity?.message} htmlFor="ev-p"><Input id="ev-p" type="number" {...f.register("capacity")} /></Field></div><button type="submit" className="sr-only">Create</button>
        </form></Modal>
    </div>
  );
}

function Calendar() {
  const list = useQ(["events-mgmt"], () => eventService.list()); const circ = useQ(["circulars"], () => circularService.list());
  return <Q q={list}>{(ev) => {
    const items = [...ev.filter((x) => x.status !== "cancelled").map((x) => ({ at: x.startAt, label: x.title, kind: "Event" })), ...(circ.data ?? []).filter((c) => c.scheduledFor).map((c) => ({ at: c.scheduledFor!, label: `Send: ${c.title}`, kind: "Scheduled communication" }))].sort((a, b) => a.at.localeCompare(b.at));
    const byMonth = items.reduce<Record<string, typeof items>>((a, i) => { const k = new Date(i.at).toLocaleString("en-IN", { month: "long", year: "numeric" }); (a[k] ??= []).push(i); return a; }, {});
    return !items.length ? <EmptyState title="Nothing scheduled" body="Events and scheduled communications appear here." /> : <div className="space-y-4">{Object.entries(byMonth).map(([m, xs]) => <section key={m}><h3 className="mb-2 text-sm font-bold">{m}</h3><ul className="space-y-1.5">{xs.map((i, k) => <li key={k} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-sm"><span className="tnum w-16 shrink-0 font-bold">{fmtDate(i.at, { day: "numeric", month: "short" })}</span><span className="flex-1">{i.label}</span><Badge tone={i.kind === "Event" ? "primary" : "info"}>{i.kind}</Badge></li>)}</ul></section>)}</div>; }}</Q>;
}
