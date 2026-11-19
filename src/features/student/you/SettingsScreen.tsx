"use client";
import * as React from "react";
import Link from "next/link";
import { Info, Sparkle, GraduationCap, ShareNetwork, Lock } from "@phosphor-icons/react";
import { useApp, useActors } from "@/stores/app-store";
import { Badge, Button, Card, CardBody, ConfirmDialog, Field, Input, Modal, PageHeader, SectionHeader, Segmented, Select, Switch, toast } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { useSettings } from "./settings-store";

const UI_LANGS = ["English", "हिन्दी (Hindi)", "தமிழ் (Tamil)", "ಕನ್ನಡ (Kannada)"];
const CONTENT_AVAIL: Record<string, string> = { English: "All 12 of your courses", "हिन्दी (Hindi)": "4 of 12 courses have Hindi content", "தமிழ் (Tamil)": "2 of 12 courses have Tamil content", "ಕನ್ನಡ (Kannada)": "No courses are available in Kannada yet" };
const NOTIFS: [string, string, string][] = [["academic", "Academic", "Marks released, assignments due"], ["events", "Events & competitions", "Registrations, results"], ["community", "Community", "Feed replies, club news"], ["learning", "Learning", "Streaks, tutor, challenges"], ["live", "Live classes", "Reminders before class"], ["fees", "Fees", "Due dates (also sent to guardian)"]];

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p>{desc && <p className="text-xs text-text-2">{desc}</p>}</div>{children}</div>;
}

export default function SettingsScreen() {
  const app = useApp();
  const { prefs, set, reset, addShare, setShare } = useSettings();
  const { studentId } = useActors();
  const [resetOpen, setResetOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [to, setTo] = React.useState("");
  const [scope, setScope] = React.useState("Learning profile summary");
  const [authorise, setAuthorise] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [style, setStyle] = React.useState(prefs.tutorStyle);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title="Settings" subtitle="Make Zoho Classes feel like yours. Changes save automatically on this device." />

      <section aria-label="Language"><SectionHeader title="Language" />
        <Card><CardBody className="divide-y divide-border !py-2">
          <Row title="App language" desc="Menus, buttons and messages."><Select aria-label="App language" className="w-52" value={prefs.uiLanguage} onChange={(e) => { set({ uiLanguage: e.target.value }); toast.info("Saved", e.target.value === "English" ? undefined : "This demo shows the interface in English; the choice is remembered.") }}>{UI_LANGS.map((l) => <option key={l}>{l}</option>)}</Select></Row>
          <Row title="Content language" desc="Lessons and videos, when a translation exists."><Select aria-label="Content language" className="w-52" value={prefs.contentLanguage} onChange={(e) => set({ contentLanguage: e.target.value })}>{UI_LANGS.map((l) => <option key={l}>{l}</option>)}</Select></Row>
          <p className="flex items-start gap-2 py-3 text-xs text-text-2" role="status"><Info size={14} className="mt-0.5 shrink-0" /> {CONTENT_AVAIL[prefs.contentLanguage]}. {prefs.contentLanguage !== "English" && "Where a translation isn't available we show the English original — we don't machine-translate silently."}</p>
        </CardBody></Card></section>

      <section aria-label="Tutor"><SectionHeader title="AI Tutor personalisation" />
        <Card><CardBody className="flex flex-wrap items-center gap-3"><Sparkle size={22} className="text-primary" /><div className="flex-1"><p className="text-sm font-semibold">Style: {prefs.tutorStyle}</p><p className="text-xs text-text-2">Your tutor preferences stay with you, even as an alumnus.</p></div><Button asChild variant="soft"><Link href="/student/tutor">Open tutor settings</Link></Button></CardBody></Card></section>

      <section aria-label="Notifications"><SectionHeader title="Notifications" />
        <Card><CardBody className="divide-y divide-border !py-2">{NOTIFS.map(([k, t, d]) => <Row key={k} title={t} desc={d}><Switch label={`${t} notifications`} checked={!!prefs.notif[k]} onChange={(v) => set({ notif: { ...prefs.notif, [k]: v } })} /></Row>)}</CardBody></Card></section>

      <section aria-label="Accessibility and theme"><SectionHeader title="Accessibility & theme" />
        <Card><CardBody className="divide-y divide-border !py-2">
          <Row title="High contrast" desc="Stronger borders and text."><Switch label="High contrast" checked={app.highContrast} onChange={(v) => app.setPref("highContrast", v)} /></Row>
          <Row title="Larger text" desc="Increases text size across the app."><Switch label="Larger text" checked={app.largeText} onChange={(v) => app.setPref("largeText", v)} /></Row>
          <Row title="Captions on by default" desc="For videos and live classes."><Switch label="Captions default" checked={prefs.captionsDefault} onChange={(v) => set({ captionsDefault: v })} /></Row>
          <Row title="Reduced motion" desc="Follows your device setting. Turn on 'Reduce motion' in your system accessibility options; animations here then switch off."><Badge>System setting</Badge></Row>
          <Row title="Theme"><Segmented label="theme" value={app.theme} onChange={app.setTheme} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "System" }]} /></Row>
        </CardBody></Card></section>

      <section aria-label="Privacy"><SectionHeader title="Privacy & visibility defaults" />
        <Card><CardBody className="divide-y divide-border !py-2">
          <Row title="New portfolio items are visible to" desc="You can change each item later."><Select aria-label="Default visibility" className="w-52" value={prefs.defaultVisibility} onChange={(e) => set({ defaultVisibility: e.target.value as any })}><option value="private">Only me</option><option value="guardian">Parent / guardian</option><option value="teachers">My teachers</option><option value="institution">Whole institution</option></Select></Row>
          <p className="flex items-start gap-2 py-3 text-xs text-text-2"><Lock size={14} className="mt-0.5" /> Posting beyond your school always needs teacher and guardian approval, whatever this default says.</p>
        </CardBody></Card></section>

      <section aria-label="Preferences versus records"><SectionHeader title="My preferences vs school records" subtitle="You control the first. Your institution controls the second." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Card><CardBody className="space-y-2"><Badge tone="primary">Personal · you can edit</Badge><p className="text-sm">Language, tutor style, notifications, accessibility, privacy defaults.</p>
            {editing ? <div className="space-y-2"><Field label="Tutor style" htmlFor="ts"><Select id="ts" value={style} onChange={(e) => setStyle(e.target.value)}><option>Step-by-step hints</option><option>Short and direct</option><option>Examples first</option><option>Socratic questions</option></Select></Field><div className="flex gap-2"><Button size="sm" onClick={() => { set({ tutorStyle: style }); setEditing(false); toast.success("Preferences saved"); }}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button></div></div> : <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => setResetOpen(true)}>Reset all</Button></div>}</CardBody></Card>
          <Card tone="plain"><CardBody className="space-y-2"><Badge icon={<Lock size={11} />}>School record · view only</Badge><p className="text-sm">Grade, class, attendance, marks, official results.</p><p className="text-xs text-text-2">Only your school can change these. Spot a mistake? Ask your class teacher.</p><Button asChild size="sm" variant="outline"><Link href="/student/results">View results</Link></Button></CardBody></Card>
        </div></section>

      <section aria-label="Identity and alumni"><SectionHeader title="Identity & alumni" />
        <Card><CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-3"><GraduationCap size={26} className="text-primary" /><div className="flex-1"><p className="text-sm font-semibold">Membership: <Badge tone={prefs.membership === "alumni" ? "highlight" : "success"}>{prefs.membership === "alumni" ? "Alumni" : "Active student"}</Badge></p><p className="text-xs text-text-2">Your account ({studentId}) belongs to you. The alumni account is free and permanent.</p></div>
            <Button size="sm" variant="outline" onClick={() => set({ membership: prefs.membership === "active" ? "alumni" : "active" })}>Demo: {prefs.membership === "active" ? "preview alumni state" : "back to active"}</Button></div>
          {prefs.membership === "alumni" && <p role="status" className="rounded-xl bg-highlight-soft p-3 text-sm">As an alumnus your learning record is retained, and you keep access independent of your former institution's subscription. Your personal AI Tutor preferences stay with you; the academic context of your old school does not transfer.</p>}
          <ul className="list-disc space-y-1 pl-5 text-xs text-text-2"><li>Retained record status: <b>Kept</b> — portfolio and learning profile remain available.</li><li>Access doesn't depend on any institution's plan.</li><li>Moving institutions? Records are shared only with your explicit permission and the receiving school's acceptance.</li></ul>
          <div><div className="mb-2 flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-semibold"><ShareNetwork size={16} /> Consent-based record sharing</p><Button size="sm" onClick={() => setShareOpen(true)}>Share my records</Button></div>
            {prefs.shares.length === 0 ? <p className="text-sm text-text-2">You haven't shared anything. Nothing leaves your account without your approval.</p> : <ul className="space-y-2">{prefs.shares.map((s) => <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 p-3 text-sm"><span className="flex-1"><b>{s.to}</b> · {s.scope}<br /><span className="text-xs text-text-2">Authorised {fmtDate(s.at)}</span></span><Badge tone={s.status === "accepted" ? "success" : s.status === "revoked" ? "danger" : "warning"}>{s.status === "awaiting-acceptance" ? "Awaiting receiving school" : s.status === "accepted" ? "Accepted" : "Revoked"}</Badge>{s.status === "awaiting-acceptance" && <Button size="sm" variant="ghost" onClick={() => setShare(s.id, "accepted")}>Demo: school accepts</Button>}{s.status !== "revoked" && <Button size="sm" variant="ghost" onClick={() => { setShare(s.id, "revoked"); toast.info("Sharing revoked"); }}>Revoke</Button>}</li>)}</ul>}</div>
        </CardBody></Card></section>

      <ConfirmDialog open={resetOpen} onOpenChange={setResetOpen} title="Reset personal preferences?" body="Language, notifications, tutor style and privacy defaults return to standard. School records are not affected." confirmLabel="Reset" destructive onConfirm={() => { reset(); setStyle("Step-by-step hints"); toast.success("Preferences reset"); }} />
      <Modal open={shareOpen} onOpenChange={setShareOpen} title="Share records with another institution" description="They only see what you choose, after they accept." footer={<><Button variant="ghost" onClick={() => setShareOpen(false)}>Cancel</Button><Button onClick={() => { if (to.trim().length < 3) return setErr("Enter the receiving institution's name."); if (!authorise) return setErr("Please confirm you authorise this share."); addShare(to.trim(), scope); setShareOpen(false); setTo(""); setAuthorise(false); setErr(""); toast.success("Request sent", "The receiving institution must accept before they can see anything."); }}>Authorise and send</Button></>}>
        <div className="space-y-4"><Field label="Receiving institution" htmlFor="rs" error={err && !authorise && to.trim().length >= 3 ? undefined : err}><Input id="rs" value={to} onChange={(e) => setTo(e.target.value)} placeholder="e.g. Lakeside International School" /></Field>
          <Field label="What to share" htmlFor="sc"><Select id="sc" value={scope} onChange={(e) => setScope(e.target.value)}><option>Learning profile summary</option><option>Portfolio (items visible to institutions)</option><option>Certificates list</option></Select></Field>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={authorise} onChange={(e) => setAuthorise(e.target.checked)} className="mt-0.5 size-5 accent-[var(--primary)]" /> I authorise sharing this with the institution named above. I can revoke it any time.</label>
          {err && authorise && <p role="alert" className="text-xs text-danger">Fix this: {err}</p>}</div>
      </Modal>
    </div>
  );
}
