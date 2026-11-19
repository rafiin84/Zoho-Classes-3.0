"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader, Stepper, Card, Button, Field, Input, Select, Switch, Badge, Checkbox, toast, DemoTag, Textarea } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { useApp } from "@/stores/app-store";
import type { ScreenProps } from "@/types/screens";
import { DemoNote, useCtx } from "../kit";

const schema = z.object({
  name: z.string().min(3, "Enter the institution's full name"), type: z.enum(["school", "university"]), board: z.string().min(2, "Name the board or affiliation"),
  email: z.string().email("Enter a valid contact email"), language: z.string().min(1),
  yearLabel: z.string().regex(/^\d{4}[–-]\d{2,4}$/, "Use a format like 2026–27"), start: z.string().min(1, "Choose a start date"), end: z.string().min(1, "Choose an end date"), terms: z.coerce.number().min(1, "At least 1").max(6, "At most 6"),
}).refine((d) => !d.start || !d.end || d.end > d.start, { path: ["end"], message: "End date must be after the start date" });
type F = z.input<typeof schema>;
const STEPS = ["Institution profile", "Academic year", "Branches & departments", "Invite & roles", "Governance defaults", "AI provider policy", "Readiness"];

export default function OnboardingScreen(_: ScreenProps) {
  const router = useRouter(); const { completeOnboarding } = useApp(); const { instName, isUniversity } = useCtx();
  const [step, setStep] = React.useState(0);
  const f = useForm<F>({ resolver: zodResolver(schema) as never, mode: "onTouched", defaultValues: { name: instName, type: isUniversity ? "university" : "school", board: isUniversity ? "State University Act" : "State Board (Karuvana)", email: "office@greenfield.example", language: "English", yearLabel: "2026–27", start: "2026-06-01", end: "2027-03-31", terms: 3 } });
  const [branches, setBranches] = React.useState(isUniversity ? ["Main Campus"] : ["North Campus", "Lakeside Campus"]);
  const [newBranch, setNewBranch] = React.useState("");
  const [invites, setInvites] = React.useState("principal@greenfield.example\nregistrar@greenfield.example"); const [inviteRole, setInviteRole] = React.useState("Institution admin"); const [sent, setSent] = React.useState<number | null>(null);
  const [gov, setGov] = React.useState({ approvals: true, parentConsent: true, auditRetention: true, aiHumanReview: true });
  const [ai, setAi] = React.useState({ byok: true, personal: false, student: false, ceiling: "assist" });
  const [done, setDone] = React.useState(false);
  const checks = [
    { l: "Institution profile complete", ok: !Object.keys(f.formState.errors).length && !!f.getValues("name") },
    { l: "Academic year defined", ok: !!f.getValues("yearLabel") && !!f.getValues("start") },
    { l: "At least one branch", ok: branches.length > 0 }, { l: "Admin invitations sent", ok: sent !== null && sent > 0 },
    { l: "Human approval required for publishing & grading", ok: gov.approvals && gov.aiHumanReview }, { l: "AI provider policy chosen (BYOK, no Zoho model)", ok: ai.byok },
  ];
  const next = async () => {
    if (step === 0 && !(await f.trigger(["name", "board", "email", "language"]))) return toast.error("Fix the highlighted fields to continue.");
    if (step === 1 && !(await f.trigger(["yearLabel", "start", "end", "terms"]))) return toast.error("Fix the highlighted fields to continue.");
    if (step === 2 && !branches.length) return toast.error("Add at least one branch, or keep Main Campus.");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const finish = () => { completeOnboarding("institution"); toast.success("Onboarding complete. Welcome to your overview."); router.push("/institution/overview"); };
  const sendInvites = () => { const emails = invites.split(/[\s,;]+/).filter(Boolean); const bad = emails.filter((e) => !/^\S+@\S+\.\S+$/.test(e)); if (!emails.length) return toast.error("Enter at least one email."); if (bad.length) return toast.error(`Not valid: ${bad.join(", ")}`); setSent(emails.length); toast.success(`${emails.length} invitation(s) simulated — no email is sent.`); };
  const { register, formState: { errors } } = f;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Set up your institution" subtitle="A guided mock set-up. Nothing is saved to a real tenant." actions={<><DemoTag /><Button variant="ghost" onClick={() => { completeOnboarding("institution"); toast.info("Skipped. Replay any time from Governance → Tenant settings."); router.push("/institution/overview"); }}>Skip for now</Button></>} />
      <div className="mb-5"><Stepper steps={STEPS} current={step} /></div>
      <Card className="p-5">
        {step === 0 && <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Institution name" error={errors.name?.message} required htmlFor="o-name" className="sm:col-span-2"><Input id="o-name" aria-invalid={!!errors.name} {...register("name")} /></Field>
          <Field label="Type" htmlFor="o-type"><Select id="o-type" {...register("type")}><option value="school">School (grades & sections)</option><option value="university">University (programmes & departments)</option></Select></Field>
          <Field label="Board / affiliation" error={errors.board?.message} required htmlFor="o-board"><Input id="o-board" aria-invalid={!!errors.board} {...register("board")} /></Field>
          <Field label="Contact email" error={errors.email?.message} required htmlFor="o-email"><Input id="o-email" type="email" aria-invalid={!!errors.email} {...register("email")} /></Field>
          <Field label="Default language" htmlFor="o-lang"><Select id="o-lang" {...register("language")}>{["English", "Hindi", "Tamil"].map((l) => <option key={l}>{l}</option>)}</Select></Field>
        </div>}
        {step === 1 && <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Academic year label" error={errors.yearLabel?.message} required htmlFor="o-y"><Input id="o-y" aria-invalid={!!errors.yearLabel} {...register("yearLabel")} /></Field>
          <Field label="Terms / semesters" error={errors.terms?.message} htmlFor="o-t"><Input id="o-t" type="number" aria-invalid={!!errors.terms} {...register("terms")} /></Field>
          <Field label="Starts" error={errors.start?.message} htmlFor="o-s"><Input id="o-s" type="date" aria-invalid={!!errors.start} {...register("start")} /></Field>
          <Field label="Ends" error={errors.end?.message} htmlFor="o-e"><Input id="o-e" type="date" aria-invalid={!!errors.end} {...register("end")} /></Field>
        </div>}
        {step === 2 && <div className="space-y-4">
          <p className="text-sm text-text-2">Preview of your hierarchy. Settings are inherited from the institution by default.</p>
          <ul className="rounded-xl bg-surface-2 p-3 text-sm"><li className="font-bold">{f.getValues("name")}</li>{branches.map((b) => <li key={b} className="ml-4 flex items-center justify-between border-l border-border py-1 pl-3"><span>{b}<span className="ml-2 text-xs text-text-2">→ Departments → {isUniversity ? "Programmes → Years" : "Grades → Sections"}</span></span><Button size="sm" variant="ghost" onClick={() => setBranches(branches.filter((x) => x !== b))} aria-label={`Remove ${b}`}>Remove</Button></li>)}{!branches.length && <li className="ml-4 text-text-2">No branch — a single-site institution works without one.</li>}</ul>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = newBranch.trim(); if (n.length < 3) return toast.error("Branch name needs at least 3 characters."); if (branches.includes(n)) return toast.error("That branch already exists."); setBranches([...branches, n]); setNewBranch(""); }}><Input aria-label="New branch name" value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder="Add a branch, e.g. East Campus" /><Button type="submit" variant="soft">Add</Button></form>
        </div>}
        {step === 3 && <div className="space-y-3">
          <Field label="Role to assign" htmlFor="o-role"><Select id="o-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>{["Institution admin", "Branch admin", "Registrar / exam office", "Finance staff", "Teacher"].map((r) => <option key={r}>{r}</option>)}</Select></Field>
          <Field label="Emails (one per line)" htmlFor="o-inv" hint="Invitations are simulated."><Textarea id="o-inv" value={invites} onChange={(e) => { setInvites(e.target.value); setSent(null); }} /></Field>
          <Button onClick={sendInvites} variant="soft">Send invitations (mock)</Button>{sent !== null && <p role="status" className="text-sm text-success">{sent} invitation(s) queued as {inviteRole}.</p>}
        </div>}
        {step === 4 && <div className="space-y-3">{([["approvals", "Require approval before publishing marks, circulars to parents and AI Teachers"], ["parentConsent", "Require guardian consent for under-18 AI features"], ["auditRetention", "Keep audit trail for 3 years"], ["aiHumanReview", "Human review for AI grading and generated content"]] as const).map(([k, l]) => <div key={k} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><span className="text-sm">{l}</span><Switch checked={gov[k]} onChange={(v) => setGov({ ...gov, [k]: v })} label={l} /></div>)}</div>}
        {step === 5 && <div className="space-y-3">
          <DemoNote tone="info">Zoho Classes brings no proprietary AI model. You bring your own provider key (BYOK); configure keys later under AI Providers. These are demo defaults only.</DemoNote>
          {([["byok", "Use institution-level BYOK provider (recommended)"], ["personal", "Allow teachers to use a personal key"], ["student", "Allow students personal keys (needs age, guardian consent and policy)"]] as const).map(([k, l]) => <div key={k} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><span className="text-sm">{l}</span><Switch checked={ai[k]} onChange={(v) => setAi({ ...ai, [k]: v })} label={l} /></div>)}
          <Field label="Agent autonomy ceiling" htmlFor="o-aut"><Select id="o-aut" value={ai.ceiling} onChange={(e) => setAi({ ...ai, ceiling: e.target.value })}><option value="suggest">Suggest only</option><option value="assist">Assist (human approves)</option><option value="autonomous">Autonomous (low-risk only)</option></Select></Field>
        </div>}
        {step === 6 && <div className="space-y-4">
          <ul className="space-y-1.5" aria-label="Readiness checklist">{checks.map((c) => <li key={c.l} className="flex items-center gap-2 text-sm"><Badge tone={c.ok ? "success" : "warning"}>{c.ok ? "Ready" : "To do"}</Badge>{c.l}</li>)}</ul>
          <div><p className="mb-2 text-sm font-semibold">Sample dashboard preview</p><BarChart ariaLabel="Sample dashboard" horizontal unit="%" max={100} data={[{ label: "Attendance", value: 93 }, { label: "Engagement", value: 74 }, { label: "Course completion", value: 66 }]} /><p className="mt-1 text-xs text-text-2">Illustrative values; real figures appear once students and courses are added.</p></div>
          <Checkbox checked={done} onChange={setDone} label="I understand this is a prototype and nothing is stored." />
        </div>}
      </Card>
      <div className="mt-4 flex justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        {step < STEPS.length - 1 ? <Button onClick={next}>Continue</Button> : <Button disabled={!done} onClick={finish}>Finish set-up</Button>}
      </div>
      <p className="mt-3 text-center text-xs text-text-2"><button className="underline" onClick={() => { setStep(0); toast.info("Replaying from the start."); }}>Replay from the beginning</button></p>
    </div>
  );
}
