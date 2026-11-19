"use client";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, Stepper, Button, Field, Input, Select, Textarea, Checkbox, Badge, toast, Progress } from "@/components/ui";
import { marketplaceService, type ListingDraft } from "@/lib/api/marketplaceService";
import type { LicenceType, ListingKind } from "@/types/institution";
import { onErr, DemoNote } from "../kit";

const LICENCES: LicenceType[] = ["Free", "One-time", "Subscription", "Institution licence", "Government / bulk"];
const KINDS: ListingKind[] = ["Course", "Lesson", "Assignment", "Question paper", "MCQ bank", "Video", "PDF", "Presentation", "Notes", "E-book", "Game", "Simulation", "Rubric"];
const CHECKS = ["Metadata complete", "Mapped to curriculum objectives", "Answer keys & rubrics included", "Accessibility reviewed (captions, alt text)", "I own or have rights to this content"];

/** Creator journeys for AI Teacher listings and content packages (simulated). */
export function CreatorWizard({ mode, open, onClose }: { mode: "ai-teacher" | "content"; open: boolean; onClose: () => void }) {
  const qc = useQueryClient(); const ai = mode === "ai-teacher";
  const steps = ai ? ["Metadata", "Teaching style", "Licence & scope", "Review & submit"] : ["Creator & metadata", "Assets & mapping", "Quality checklist", "Licence & scope", "Submit"];
  const [step, setStep] = React.useState(0); const [err, setErr] = React.useState("");
  const [d, setD] = React.useState<ListingDraft>({ title: "", kind: ai ? "AI Teacher" : "Course", subject: "Mathematics", grade: "Grade 8", language: "English", summary: "", licence: "Free", price: 0, scope: "private", teachingStyle: "", outcomes: "" });
  const [creator, setCreator] = React.useState(false); const [files, setFiles] = React.useState<{ name: string; p: number }[]>([]); const [checks, setChecks] = React.useState<boolean[]>(CHECKS.map(() => false)); const [obj, setObj] = React.useState("");
  React.useEffect(() => { if (open) { setStep(0); setErr(""); setFiles([]); setChecks(CHECKS.map(() => false)); } }, [open]);
  const set = (p: Partial<ListingDraft>) => setD((x) => ({ ...x, ...p }));
  const addFile = (f: File | undefined) => {
    if (!f) return; if (!/\.(pdf|docx?|pptx?|mp4|zip|epub)$/i.test(f.name)) return setErr("Unsupported file type. Use PDF, DOCX, PPTX, MP4, EPUB or ZIP.");
    if (f.size > 25 * 1024 * 1024) return setErr("File is larger than 25 MB."); setErr("");
    const idx = files.length; setFiles((x) => [...x, { name: f.name, p: 0 }]);
    let p = 0; const t = setInterval(() => { p += 25; setFiles((x) => x.map((y, i) => (i === idx ? { ...y, p: Math.min(100, p) } : y))); if (p >= 100) clearInterval(t); }, 250);
  };
  const m = useMutation({ mutationFn: () => marketplaceService.create(d, mode), onSuccess: (l) => { toast.success(`“${l.title}” submitted. Track it under Creator → Submissions.`); qc.invalidateQueries({ queryKey: ["inst", "mk-mine"] }); qc.invalidateQueries({ queryKey: ["inst", "mk-subs"] }); onClose(); }, onError: onErr });
  const next = () => {
    const s = steps[step];
    if (s === "Creator & metadata" && !creator) return setErr("Confirm creator onboarding to continue.");
    if (/metadata/i.test(s) && (d.title.trim().length < 4 || d.summary.trim().length < 20)) return setErr("Add a title (4+ characters) and a summary of at least 20 characters.");
    if (s === "Teaching style" && (d.teachingStyle ?? "").trim().length < 10) return setErr("Describe the teaching style in at least 10 characters.");
    if (s === "Assets & mapping" && (!files.length || files.some((f) => f.p < 100) || !obj.trim())) return setErr("Upload at least one asset (wait for completion) and map at least one objective.");
    if (s === "Quality checklist" && checks.some((c) => !c)) return setErr("Complete every item in the checklist.");
    if (s === "Licence & scope" && d.licence !== "Free" && d.price <= 0) return setErr("Set a price above zero for a paid licence.");
    setErr(""); setStep(step + 1);
  };
  const last = step === steps.length - 1;
  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()} className="sm:max-w-2xl" title={ai ? "List an AI Teacher" : "Create a content package"} description="Simulated creator journey — nothing is published without human review."
      footer={<><Button variant="ghost" disabled={step === 0} onClick={() => { setErr(""); setStep(step - 1); }}>Back</Button>{last ? <Button loading={m.isPending} onClick={() => m.mutate()}>Submit for review</Button> : <Button onClick={next}>Continue</Button>}</>}>
      <div className="space-y-4"><Stepper steps={steps} current={step} />
        {err && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}
        {steps[step] === "Creator & metadata" && <DemoNote tone="info"><Checkbox checked={creator} onChange={setCreator} label="Set up my creator profile as Greenfield International School (mock onboarding)" /></DemoNote>}
        {/metadata/i.test(steps[step]) && <div className="space-y-3">
          <Field label="Title" htmlFor="cw-t" required><Input id="cw-t" value={d.title} onChange={(e) => set({ title: e.target.value })} /></Field>
          {!ai && <Field label="Content type" htmlFor="cw-k"><Select id="cw-k" value={d.kind} onChange={(e) => set({ kind: e.target.value as ListingKind })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</Select></Field>}
          <div className="grid grid-cols-3 gap-2"><Field label="Subject" htmlFor="cw-s"><Select id="cw-s" value={d.subject} onChange={(e) => set({ subject: e.target.value })}>{["Mathematics", "Science", "English", "Hindi", "Social Science", "Computer Science"].map((s) => <option key={s}>{s}</option>)}</Select></Field><Field label="Grade" htmlFor="cw-g"><Input id="cw-g" value={d.grade} onChange={(e) => set({ grade: e.target.value })} /></Field><Field label="Language" htmlFor="cw-l"><Input id="cw-l" value={d.language} onChange={(e) => set({ language: e.target.value })} /></Field></div>
          <Field label="Summary" htmlFor="cw-sum" required><Textarea id="cw-sum" value={d.summary} onChange={(e) => set({ summary: e.target.value })} /></Field></div>}
        {steps[step] === "Teaching style" && <div className="space-y-3"><Field label="Teaching style" htmlFor="cw-ts" required><Textarea id="cw-ts" value={d.teachingStyle} onChange={(e) => set({ teachingStyle: e.target.value })} placeholder="e.g. Socratic, asks a question before giving a hint" /></Field><Field label="Supported learning outcomes" htmlFor="cw-o"><Textarea id="cw-o" value={d.outcomes} onChange={(e) => set({ outcomes: e.target.value })} /></Field>
          <div className="rounded-xl bg-lilac p-3 text-sm"><p className="mb-1 font-semibold text-primary">Learner-experience preview (simulated)</p><p><b>Student:</b> I don't get {d.subject.toLowerCase()} homework.</p><p><b>{d.title || "AI Teacher"} (AI Teacher):</b> Let's start small. {d.teachingStyle ? `(${d.teachingStyle.slice(0, 60)})` : ""} What have you tried so far?</p></div></div>}
        {steps[step] === "Assets & mapping" && <div className="space-y-3"><Field label="Upload assets (mock)" htmlFor="cw-f" hint="PDF, DOCX, PPTX, MP4, EPUB, ZIP · max 25 MB"><Input id="cw-f" type="file" onChange={(e) => { addFile(e.target.files?.[0]); e.target.value = ""; }} /></Field>
          <ul className="space-y-2">{files.map((f, i) => <li key={i} className="text-sm"><div className="mb-1 flex justify-between"><span>{f.name}</span><span className="tnum">{f.p}%</span></div><Progress value={f.p} size="sm" label={`Upload ${f.name}`} /></li>)}</ul>
          <Field label="Curriculum mapping" htmlFor="cw-m" hint="Objective codes, e.g. M8.3.1, M8.3.2" required><Input id="cw-m" value={obj} onChange={(e) => setObj(e.target.value)} /></Field></div>}
        {steps[step] === "Quality checklist" && <div className="space-y-2">{CHECKS.map((c, i) => <Checkbox key={c} label={c} checked={checks[i]} onChange={(v) => setChecks(checks.map((x, j) => (j === i ? v : x)))} />)}</div>}
        {steps[step] === "Licence & scope" && <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><Field label="Licence" htmlFor="cw-li"><Select id="cw-li" value={d.licence} onChange={(e) => set({ licence: e.target.value as LicenceType, price: e.target.value === "Free" ? 0 : d.price })}>{LICENCES.map((l) => <option key={l}>{l}</option>)}</Select></Field><Field label="Price (₹, demo)" htmlFor="cw-p"><Input id="cw-p" type="number" min={0} value={d.price} disabled={d.licence === "Free"} onChange={(e) => set({ price: Number(e.target.value) })} /></Field></div>
          <Field label="Distribution scope" htmlFor="cw-sc"><Select id="cw-sc" value={d.scope} onChange={(e) => set({ scope: e.target.value as ListingDraft["scope"] })}><option value="private">Private (only me)</option><option value="institution">Institution-wide</option><option value="public">Public marketplace (needs moderation)</option></Select></Field></div>}
        {last && <div className="space-y-2 text-sm"><p className="font-semibold">Review</p><div className="flex flex-wrap gap-2"><Badge tone="primary">{ai ? "AI Teacher" : d.kind}</Badge><Badge>{d.subject}</Badge><Badge>{d.grade}</Badge><Badge>{d.licence}{d.price ? ` · ₹${d.price}` : ""}</Badge><Badge tone="info">{d.scope}</Badge></div><p><b>{d.title}</b> — {d.summary}</p><DemoNote>Submitting starts review and moderation. You can withdraw, publish new versions and watch sales analytics afterwards.</DemoNote></div>}
      </div>
    </Modal>
  );
}
