"use client";
import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, CheckCircle, CaretLeft, MapPin, Medal, SealCheck, UploadSimple, Warning, XCircle, Hourglass, ShieldCheck } from "@phosphor-icons/react";
import { eventService, portfolioService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import type { ScreenProps } from "@/types/screens";
import { fmtDate, fmtTime, relTime } from "@/lib/format";
import { Badge, Button, Card, CardBody, Checkbox, ConfirmDialog, Cover, EmptyState, ErrorState, Field, Icon, Input, Modal, Progress, SectionHeader, Skeleton, Stepper, StatusBadge, toast } from "@/components/ui";
import { communityKeys } from "../community/keys";
import { useViewer } from "../community/useViewer";
import { CAT_LABEL, LEVEL_LABEL, REG_LABEL, STATUS_LABEL, canRegister, catOf, checkEligibility, needsConsent, useEventLocal } from "./shared";
import { cn } from "@/lib/utils";

const schemaFor = (team: boolean, size: number) => z.object({
  teamName: team ? z.string().trim().min(3, "Team name needs at least 3 characters.").max(30, "Keep the team name under 30 characters.") : z.string().optional(),
  members: z.array(z.string()),
  consent: z.boolean(),
  agree: z.boolean().refine((v) => v, "Please accept the event rules."),
}).superRefine((v, ctx) => {
  if (team && v.members.length < 1) ctx.addIssue({ code: "custom", path: ["members"], message: "Pick at least one teammate." });
  if (team && v.members.length > size - 1) ctx.addIssue({ code: "custom", path: ["members"], message: `A team has at most ${size} people including you.` });
});

function CertificateModal({ open, onOpenChange, title, name, rank, organiser }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; name: string; rank?: number; organiser: string }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Certificate preview" description="Demo preview — not an official certificate." className="sm:max-w-xl"
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button><Button onClick={() => toast.success("Download simulated", "A real file isn't created in this demo.")}>Download (demo)</Button></>}>
      <div className="rounded-2xl border-4 border-double border-primary/40 bg-lilac p-6 text-center">
        <Medal size={40} weight="duotone" className="mx-auto text-primary" />
        <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-text-2">Certificate of {rank ? "achievement" : "participation"}</p>
        <p className="mt-3 text-2xl font-bold">{name}</p>
        <p className="mt-2 text-sm text-text-2">{rank ? `secured rank ${rank} in` : "took part in"}</p>
        <p className="mt-1 font-semibold">{title}</p>
        <p className="mt-4 text-xs text-text-2">Organised by {organiser}</p>
        <Badge tone="highlight" className="mt-4">Demo · unofficial</Badge>
      </div>
    </Modal>
  );
}

export default function EventDetailScreen({ params }: ScreenProps) {
  const id = params.id;
  const qc = useQueryClient();
  const viewer = useViewer();
  const { studentId } = useActors();
  const local = useEventLocal();
  const [regOpen, setRegOpen] = React.useState(false);
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [certOpen, setCertOpen] = React.useState(false);
  const [workOpen, setWorkOpen] = React.useState(false);
  const q = useQuery({ queryKey: communityKeys.event(id), queryFn: () => eventService.get(id), retry: false });
  const mates = useQuery({ queryKey: ["classmates", studentId], queryFn: () => portfolioService.classmates(studentId) });
  const e = q.data;
  const inval = () => { qc.invalidateQueries({ queryKey: ["events"] }); qc.invalidateQueries({ queryKey: ["portfolio", studentId] }); qc.invalidateQueries({ queryKey: ["feed"] }); };
  const team = e?.registrationMode === "team";
  const size = e?.teamSize ?? 3;

  const cfg = React.useRef({ team: !!team, size });
  cfg.current = { team: !!team, size };
  const form = useForm<z.infer<ReturnType<typeof schemaFor>>>({ resolver: ((v: any, c: any, o: any) => zodResolver(schemaFor(cfg.current.team, cfg.current.size))(v, c, o)) as any, defaultValues: { teamName: "", members: [], consent: false, agree: false } });
  React.useEffect(() => { form.clearErrors(); }, [regOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const register = useMutation({
    mutationFn: (v: { teamName?: string; members?: string[]; consent?: boolean }) => eventService.register(id, v),
    onSuccess: (ev, v) => {
      inval(); setRegOpen(false);
      if (ev.myRegistration === "pending-consent") { local.setPending(id, { teamName: v.teamName, members: v.members }); toast.info("Almost there", "We've asked your guardian for consent."); }
      else { local.setPending(id, null); toast.success(ev.myRegistration === "waitlisted" ? "You're on the waitlist" : "You're registered", ev.title); }
    },
    onError: (err) => toast.error("Couldn't register", (err as Error).message),
  });
  const withdraw = useMutation({ mutationFn: () => eventService.withdraw(id), onSuccess: () => { inval(); local.setPending(id, null); toast.success("You've withdrawn", "No worries — you can register again while it's open."); } });

  if (q.isPending) return <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-40" /></div>;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!e) return <EmptyState title="We couldn't find that event" body="It may have been removed or the link is out of date." action={{ label: "Browse events", href: "/student/events" }} />;

  const reg = e.myRegistration;
  const checks = checkEligibility(e);
  const eligible = checks.every((c) => c.ok);
  const consent = needsConsent(e);
  const mine = e.results?.find((r) => r.name === viewer.name);
  const submission = local.submissions[id];
  const accepts = e.status === "registration-open" || e.status === "in-progress";
  const canSubmitWork = (e.venue.toLowerCase().includes("online submission") || e.category.includes("Photography") || e.category.includes("Exhibition")) && reg === "registered" && ["registration-open", "in-progress"].includes(e.status) && e.registrationMode !== "none";
  const steps = ["Registered", consent ? "Guardian consent" : "Confirmed", "Event day", "Results"];
  const stepIdx = reg === "pending-consent" ? 1 : reg === "waitlisted" ? 0 : reg === "registered" ? (e.status === "results-published" || e.status === "completed" ? 3 : e.status === "in-progress" || e.status === "judging" ? 2 : 1 + (consent ? 1 : 0)) : 0;

  const open = canRegister(e) && reg === "not-registered";
  const submitReg = form.handleSubmit((v) => {
    if (consent && !v.consent) { /* proceed -> pending-consent */ }
    register.mutate({ teamName: v.teamName, members: v.members, consent: v.consent });
  });

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/student/events" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-text-2 hover:text-text"><CaretLeft size={16} /> All events</Link>
      <Cover from={e.cover.from} to={e.cover.to} className="mb-5 h-44 sm:h-56" rounded="rounded-[1.75rem]" icon={<Icon name={e.cover.icon} size={84} weight="duotone" />}>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-5 text-white">
          <div className="mb-1 flex flex-wrap gap-1.5"><Badge className="bg-white/90 text-text">{LEVEL_LABEL[e.scope]} level</Badge><Badge className="bg-white/90 text-text">{CAT_LABEL[catOf(e)]}</Badge></div>
          <h1 className="text-display">{e.title}</h1>
        </div>
      </Cover>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card><CardBody className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={STATUS_LABEL[e.status]} /><span className="text-text-2">Organised by <b className="text-text">{e.organiser}</b></span></div>
            <p>{fmtDate(e.startAt, { weekday: "long", day: "numeric", month: "long" })} · {fmtTime(e.startAt)} – {fmtTime(e.endAt)}</p>
            <p className="flex items-center gap-1.5 text-text-2"><MapPin size={16} /> {e.venue}</p>
            {e.status === "cancelled" && <p role="alert" className="flex items-center gap-2 rounded-xl bg-danger-soft p-3 font-semibold text-danger"><XCircle size={18} /> This event was cancelled. {e.announcements[0]?.text}</p>}
          </CardBody></Card>

          <section aria-label="Eligibility"><SectionHeader title="Can I join?" />
            <Card><CardBody>
              <ul className="space-y-2.5">{checks.map((c) => <li key={c.label} className="flex items-start gap-2.5 text-sm">{c.ok ? <CheckCircle size={20} weight="fill" className="shrink-0 text-success" /> : <Warning size={20} weight="fill" className="shrink-0 text-danger" />}<span><b>{c.label}:</b> {c.note}{!c.ok && " — this event isn't open to your grade."}</span></li>)}</ul>
              <p className="mt-3 text-xs text-text-2">Eligibility: {e.eligibility}. Based on your school record (Grade 8B).</p>
            </CardBody></Card>
          </section>

          {e.schedule.length > 0 && <section aria-label="Schedule"><SectionHeader title="Schedule" /><Card><CardBody><ol className="space-y-2">{e.schedule.map((s) => <li key={s.time + s.label} className="flex gap-3 text-sm"><span className="tnum w-20 shrink-0 font-semibold text-primary">{s.time}</span>{s.label}</li>)}</ol></CardBody></Card></section>}
          <section aria-label="Rules"><SectionHeader title="Rules" /><Card><CardBody><ul className="list-disc space-y-1.5 pl-5 text-sm">{e.rules.map((r) => <li key={r}>{r}</li>)}</ul></CardBody></Card></section>

          {(e.judges.length > 0 || e.rubric.length > 0) && (
            <section aria-label="Judging"><SectionHeader title="Judges & scoring" /><Card><CardBody className="space-y-4">
              {e.judges.length > 0 && <ul className="grid gap-2 sm:grid-cols-2">{e.judges.map((j) => <li key={j.name} className="text-sm"><b>{j.name}</b><br /><span className="text-text-2">{j.role}</span></li>)}</ul>}
              <div className="space-y-2.5"><p className="text-sm font-semibold">Scoring rubric</p>{e.rubric.map((r) => <div key={r.criterion}><div className="flex justify-between text-sm"><span>{r.criterion}</span><span className="tnum font-semibold">{r.weight}%</span></div><Progress value={r.weight} size="sm" label={`${r.criterion} weight`} /></div>)}</div>
            </CardBody></Card></section>
          )}

          <section aria-label="Announcements"><SectionHeader title="Announcements" />
            {e.announcements.length === 0 ? <EmptyState title="No announcements yet" body="Organisers' updates will show up here." /> : <div className="space-y-2">{e.announcements.map((a) => <Card key={a.at} tone="plain" className="p-3 text-sm"><p>{a.text}</p><p className="mt-1 text-xs text-text-2">{relTime(a.at)}</p></Card>)}</div>}
          </section>

          {e.results && (
            <section aria-label="Results"><SectionHeader title="Results & winners" /><Card><CardBody>
              <ol className="space-y-2">{e.results.map((r) => <li key={r.rank} className={cn("flex items-center gap-3 rounded-xl p-2.5 text-sm", r.name === viewer.name && "bg-lilac")}><span className="tnum flex size-8 items-center justify-center rounded-full bg-surface-2 font-bold">{r.rank}</span><span className="flex-1 font-semibold">{r.name}{r.name === viewer.name && <Badge tone="primary" className="ml-2">You</Badge>}</span><span className="tnum text-text-2">Score {r.score}</span></li>)}</ol>
              {reg === "registered" && <Button className="mt-4" variant="soft" onClick={() => setCertOpen(true)}><SealCheck size={18} /> {mine ? "View my certificate" : "View participation certificate"}</Button>}
            </CardBody></Card></section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start" aria-label="Registration">
          <Card><CardBody className="space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Your registration</h2><Badge tone={reg === "registered" ? "success" : reg === "not-registered" ? "neutral" : "warning"}>{REG_LABEL[reg]}</Badge></div>
            <div aria-live="polite" className="space-y-3">
              {reg !== "not-registered" && reg !== "withdrawn" && <Stepper steps={steps} current={stepIdx} />}
              {reg === "registered" && <p className="flex items-start gap-2 text-sm"><CheckCircle size={18} weight="fill" className="mt-0.5 text-success" /> You're in. {e.myTeam && <>Team <b>{e.myTeam.name}</b> with {e.myTeam.members.join(", ")}.</>}</p>}
              {reg === "waitlisted" && <p className="flex items-start gap-2 text-sm"><Hourglass size={18} className="mt-0.5 text-warning" /> This event is full or closed. You're on the waitlist and we'll notify you if a spot opens.</p>}
              {reg === "pending-consent" && (
                <div className="space-y-2 rounded-xl bg-warning-soft p-3 text-sm"><p className="flex items-start gap-2"><ShieldCheck size={18} className="mt-0.5 shrink-0" /> Your guardian (Rohan Rao) has been asked to give consent. Your place is held until they respond.</p>
                  <Button size="sm" variant="outline" loading={register.isPending} onClick={() => register.mutate({ ...(local.pendingTeam[id] ?? {}), consent: true })}>Demo: guardian approves</Button></div>
              )}
              {reg === "not-registered" && !open && e.status !== "cancelled" && <p className="text-sm text-text-2">{e.status === "results-published" || e.status === "completed" ? "Registration for this event has ended." : e.status === "registration-open" ? "" : e.status === "published" ? "Registration hasn't opened yet. Check back soon." : "Registration isn't available at this stage."}</p>}
            </div>
            {open && <Button className="w-full" disabled={!eligible} onClick={() => setRegOpen(true)}>{e.status === "registration-closed" ? "Join the waitlist" : team ? "Register my team" : "Register"}</Button>}
            {open && !eligible && <p className="text-xs text-danger">You don't meet the eligibility rules for this event.</p>}
            {(reg === "registered" || reg === "waitlisted" || reg === "pending-consent") && e.status !== "results-published" && e.status !== "completed" && <Button variant="ghost" className="w-full" onClick={() => setWithdrawOpen(true)}>Withdraw</Button>}
            <Button variant="outline" className="w-full" aria-pressed={!!local.calendar[id]} onClick={() => { local.toggleCal(id); toast.success(local.calendar[id] ? "Removed from calendar" : "Added to calendar (demo)", e.title); }}><CalendarPlus size={18} /> {local.calendar[id] ? "In my calendar" : "Add to calendar"}</Button>
            <p className="tnum text-xs text-text-2">{e.registered}/{e.capacity} places taken</p>
            <Progress value={(e.registered / e.capacity) * 100} size="sm" label="Places taken" tone={e.registered >= e.capacity ? "warning" : "primary"} />
          </CardBody></Card>

          {(canSubmitWork || submission) && (
            <Card><CardBody className="space-y-2"><h2 className="font-semibold">Submit your work</h2>
              {submission ? <p className="text-sm"><CheckCircle size={16} weight="fill" className="mr-1 inline text-success" />Submitted “{submission.title}” ({submission.file}) {relTime(submission.at)}. You can replace it until the deadline.</p> : <p className="text-sm text-text-2">Entries are submitted online. Max 1 file, 10 MB.</p>}
              <Button variant="soft" className="w-full" onClick={() => setWorkOpen(true)}><UploadSimple size={18} /> {submission ? "Replace submission" : "Submit work"}</Button>
            </CardBody></Card>
          )}
          {!accepts && e.status === "judging" && <Card tone="plain" className="p-4 text-sm">Entries are closed and judges are scoring. Results are shared as soon as they're approved.</Card>}
        </aside>
      </div>

      <Modal open={regOpen} onOpenChange={setRegOpen} title={e.status === "registration-closed" ? "Join the waitlist" : team ? "Register your team" : "Register"} description={e.title}
        footer={<><Button variant="ghost" onClick={() => setRegOpen(false)}>Cancel</Button><Button loading={register.isPending} onClick={submitReg}>{e.status === "registration-closed" ? "Join waitlist" : "Confirm registration"}</Button></>}>
        <form onSubmit={submitReg} className="space-y-4" noValidate>
          {team && (<>
            <Field label="Team name" htmlFor="tn" error={form.formState.errors.teamName?.message}><Input id="tn" aria-invalid={!!form.formState.errors.teamName} placeholder="e.g. Court Kings" {...form.register("teamName")} /></Field>
            <p className="text-sm"><b>Captain:</b> {viewer.name} (you)</p>
            <fieldset><legend className="mb-1 text-sm font-semibold">Teammates (up to {size - 1})</legend>
              <div className="grid gap-1.5 sm:grid-cols-2">{(mates.data ?? []).map((m) => {
                const sel = form.watch("members") ?? [];
                return <Checkbox key={m.id} label={m.name} checked={sel.includes(m.name)} onChange={(c) => form.setValue("members", c ? [...sel, m.name] : sel.filter((x) => x !== m.name), { shouldValidate: true })} />;
              })}</div>
              {form.formState.errors.members && <p role="alert" className="mt-1 text-xs font-medium text-danger">Fix this: {form.formState.errors.members.message}</p>}
            </fieldset>
          </>)}
          {consent && <div className="space-y-2 rounded-xl bg-surface-2 p-3 text-sm"><p className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} className="text-primary" /> Guardian consent</p><p className="text-text-2">This event is outside your class. Your guardian must agree before your place is confirmed.</p>
            <Checkbox label="My guardian has already agreed (they'll confirm in the app)" checked={!!form.watch("consent")} onChange={(c) => form.setValue("consent", c)} />
            <p className="text-xs text-text-2">If unticked, we send a request and your status shows “Waiting for guardian consent”.</p></div>}
          <div><Checkbox label="I've read the rules and will play fair" checked={!!form.watch("agree")} onChange={(c) => form.setValue("agree", c, { shouldValidate: true })} />{form.formState.errors.agree && <p role="alert" className="mt-1 text-xs font-medium text-danger">Fix this: {form.formState.errors.agree.message}</p>}</div>
        </form>
      </Modal>
      <ConfirmDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} title="Withdraw from this event?" body="Your place (and your team's, if you're the captain) will be released." confirmLabel="Withdraw" destructive onConfirm={() => withdraw.mutate()} />
      <CertificateModal open={certOpen} onOpenChange={setCertOpen} title={e.title} name={viewer.name} rank={mine?.rank} organiser={e.organiser} />
      <WorkModal open={workOpen} onOpenChange={setWorkOpen} onSubmit={(v) => { local.submit(id, v); setWorkOpen(false); toast.success("Work submitted", v.title); }} />
    </div>
  );
}

function WorkModal({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (v: boolean) => void; onSubmit: (v: { title: string; file: string }) => void }) {
  const f = useForm<{ title: string; file: string }>({ resolver: zodResolver(z.object({ title: z.string().trim().min(3, "Give your work a title."), file: z.string().min(1, "Choose a file.") })), defaultValues: { title: "", file: "" } });
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Submit your work" description="Demo upload — no file leaves your device."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button loading={f.formState.isSubmitting} onClick={f.handleSubmit(onSubmit)}>Submit</Button></>}>
      <div className="space-y-4">
        <Field label="Title" htmlFor="wt" error={f.formState.errors.title?.message}><Input id="wt" {...f.register("title")} placeholder="Name your entry" /></Field>
        <Field label="File" htmlFor="wf" error={f.formState.errors.file?.message}><select id="wf" {...f.register("file")} className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"><option value="">Choose a demo file</option><option>entry-photo-1.jpg</option><option>project-poster.pdf</option><option>model-video.mp4</option></select></Field>
      </div>
    </Modal>
  );
}
