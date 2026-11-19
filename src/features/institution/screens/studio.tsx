"use client";
import * as React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Stepper, Card, Button, Badge, AIBadge, Field, Input, Select, Textarea, Checkbox, Progress, toast, DemoTag } from "@/components/ui";
import { courseService } from "@/lib/api/courseService";
import { marketplaceService } from "@/lib/api/marketplaceService";
import { governanceService } from "@/lib/api/governanceService";
import { OBJECTIVES, SUBJECTS, GRADES } from "@/lib/mock-data/core";
import type { LicenceType } from "@/types/institution";
import type { ScreenProps } from "@/types/screens";
import { qualityChecks, checkTone } from "../quality";
import { DemoNote, onErr, Panel, ACTOR } from "../kit";

const STEPS = ["Source", "Parameters", "Generate", "Course & lessons", "Assessments", "Rubrics & games", "AI Teacher", "Approve & publish"];
type Source = { name: string; size: number; p: number } | null;

export default function StudioScreen(_: ScreenProps) {
  const qc = useQueryClient();
  const [step, setStep] = React.useState(0); const [err, setErr] = React.useState("");
  const [kind, setKind] = React.useState("Textbook"); const [src, setSrc] = React.useState<Source>(null); const [instr, setInstr] = React.useState("");
  const [grade, setGrade] = React.useState("g8"); const [subject, setSubject] = React.useState("sub-math"); const [lang, setLang] = React.useState("English"); const [objs, setObjs] = React.useState<string[]>([]);
  const [gen, setGen] = React.useState<number | null>(null); const [rev, setRev] = React.useState({ course: false, assess: false, rubric: false }); const [aiT, setAiT] = React.useState(true);
  const [scope, setScope] = React.useState<"private" | "institution" | "marketplace">("institution"); const [licence, setLicence] = React.useState<LicenceType>("Free"); const [version, setVersion] = React.useState("1.0"); const [rights, setRights] = React.useState(false); const [done, setDone] = React.useState<string | null>(null);
  const subj = SUBJECTS.find((s) => s.id === subject)!; const avail = OBJECTIVES.filter((o) => o.subjectId === subject && o.gradeId === grade);
  const title = `${subj.name} · ${avail.find((o) => objs.includes(o.id))?.chapter ?? "Custom pack"} (AI-assisted)`;
  const modules = Math.max(2, objs.length); const lessons = modules * 4;

  const upload = (f?: File) => {
    if (!f) return; if (!/\.(pdf|docx?|txt|pptx?)$/i.test(f.name)) return setErr("Unsupported file type. Use PDF, DOCX, PPTX or TXT."); if (f.size > 20 * 1024 * 1024) return setErr("File is larger than 20 MB.");
    setErr(""); setSrc({ name: f.name, size: f.size, p: 0 }); let p = 0; const t = setInterval(() => { p += 20; setSrc((s) => (s ? { ...s, p: Math.min(100, p) } : s)); if (p >= 100) clearInterval(t); }, 250);
  };
  const generate = () => { setGen(0); let p = 0; const t = setInterval(() => { p += 12; setGen(Math.min(100, p)); if (p >= 100) { clearInterval(t); toast.success("Draft package generated. Review everything before use."); } }, 300); };
  const pub = useMutation({
    mutationFn: async () => {
      const c = await courseService.create({ title, subjectId: subject, gradeIds: [grade], language: lang, outcomes: avail.filter((o) => objs.includes(o.id)).map((o) => o.title), moduleCount: modules, lessonCount: lessons, creatorName: "Greenfield International School", creatorKind: "institution", priceType: licence === "Free" ? "free" : "paid", price: 0, description: `AI-assisted draft generated from ${src?.name ?? "instructions"}; human reviewed by ${ACTOR}.` });
      if (scope === "marketplace") await marketplaceService.create({ title, kind: "Course", subject: subj.name, grade: GRADES.find((g) => g.id === grade)!.label, language: lang, summary: "AI-assisted course reviewed by the institution.", licence, price: 0, scope: "public" }, "content");
      governanceService.record({ actor: ACTOR, actorRole: "Institution admin", action: `Published AI Studio package (${scope})`, category: "Content publication", target: title, context: `v${version} · human review complete` });
      return c;
    },
    onSuccess: (c) => { setDone(c.id); toast.success("Published. A draft course now exists in Courses & Content."); qc.invalidateQueries({ queryKey: ["inst", "courses"] }); qc.invalidateQueries({ queryKey: ["courses"] }); }, onError: onErr,
  });
  const checks = qualityChecks({ id: `studio-${objs.length}-${subject}`, title, outcomes: objs, lessonCount: lessons, language: lang, status: "draft" });
  const next = () => {
    if (step === 0 && !src && instr.trim().length < 20) return setErr("Upload a source file or write instructions of at least 20 characters.");
    if (step === 0 && src && src.p < 100) return setErr("Wait for the upload to finish.");
    if (step === 1 && !objs.length) return setErr("Choose at least one learning objective.");
    if (step === 2 && gen !== 100) return setErr("Generate the package first.");
    if (step === 3 && !rev.course) return setErr("Confirm you reviewed the course and lessons.");
    if (step === 4 && !rev.assess) return setErr("Confirm you reviewed MCQs, assignments, papers and answer keys.");
    if (step === 5 && !rev.rubric) return setErr("Confirm you reviewed rubrics and games.");
    setErr(""); setStep(step + 1);
  };
  if (done) return <div className="mx-auto max-w-xl"><PageHeader title="Package published" /><Card className="space-y-3 p-5"><p role="status">“{title}” was published as <b>{scope}</b> and a draft course was added.</p><div className="flex gap-2"><Button asChild><Link href="/institution/courses">Open Courses & Content</Link></Button><Button variant="outline" onClick={() => { setDone(null); setStep(0); setGen(null); setSrc(null); setObjs([]); setRev({ course: false, assess: false, rubric: false }); setRights(false); }}>Create another</Button></div></Card></div>;
  return (
    <div>
      <PageHeader title="AI Content Creation Studio" subtitle="Turn a syllabus, textbook or instructions into a reviewable course package. You own what you publish." actions={<><AIBadge /><DemoTag /></>} />
      <DemoNote>Prototype: generation is simulated from your choices; no AI model runs. AI-generated content is labelled and needs human review before anyone uses it.</DemoNote>
      <div className="mb-4"><Stepper steps={STEPS} current={step} /></div>
      {err && <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}
      <Card className="space-y-4 p-5">
        {step === 0 && <><Field label="Source type" htmlFor="st-k"><Select id="st-k" value={kind} onChange={(e) => setKind(e.target.value)}>{["Syllabus", "Textbook", "Document", "Instruction only"].map((k) => <option key={k}>{k}</option>)}</Select></Field>
          <Field label="Upload (mock)" htmlFor="st-f" hint="PDF, DOCX, PPTX or TXT · up to 20 MB. The file stays in your browser."><Input id="st-f" type="file" onChange={(e) => upload(e.target.files?.[0])} /></Field>
          {src && <div className="text-sm"><div className="mb-1 flex justify-between"><span>{src.name} ({(src.size / 1024).toFixed(0)} KB)</span><span className="tnum">{src.p}%</span></div><Progress value={src.p} label="Upload progress" size="sm" /></div>}
          <Field label="Instructions" htmlFor="st-i" optional><Textarea id="st-i" value={instr} onChange={(e) => setInstr(e.target.value)} placeholder="e.g. Four modules, worked examples first, mixed-ability class" /></Field></>}
        {step === 1 && <><div className="grid gap-3 sm:grid-cols-3"><Field label="Grade" htmlFor="sp-g"><Select id="sp-g" value={grade} onChange={(e) => { setGrade(e.target.value); setObjs([]); }}>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</Select></Field><Field label="Subject" htmlFor="sp-s"><Select id="sp-s" value={subject} onChange={(e) => { setSubject(e.target.value); setObjs([]); }}>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field><Field label="Language" htmlFor="sp-l"><Select id="sp-l" value={lang} onChange={(e) => setLang(e.target.value)}>{["English", "Hindi", "Tamil"].map((l) => <option key={l}>{l}</option>)}</Select></Field></div>
          <fieldset className="space-y-2"><legend className="text-sm font-semibold">Learning objectives</legend>{avail.length ? avail.map((o) => <Checkbox key={o.id} label={`${o.code} · ${o.title}`} checked={objs.includes(o.id)} onChange={(v) => setObjs(v ? [...objs, o.id] : objs.filter((x) => x !== o.id))} />) : <p className="text-sm text-text-2">No objectives for this grade/subject in the curriculum. Pick Grade 8 or another subject.</p>}</fieldset></>}
        {step === 2 && <div className="space-y-3"><p className="text-sm">Package: <b>{modules} modules · {lessons} lessons · {modules * 6} MCQs · {modules} assignments · 1 paper with answer key</b> in {lang}.</p>
          {gen === null ? <Button onClick={generate}>Generate package</Button> : <div><div className="mb-1 flex justify-between text-sm" aria-live="polite"><span>{gen < 100 ? "Generating draft…" : "Draft ready"}</span><span className="tnum">{gen}%</span></div><Progress value={gen} label="Generation progress" /></div>}</div>}
        {step === 3 && <><AIBadge /><ol className="list-decimal space-y-1 pl-5 text-sm">{Array.from({ length: modules }, (_, i) => <li key={i}><b>Module {i + 1}:</b> {avail.filter((o) => objs.includes(o.id))[i]?.title ?? "Practice & revision"} <span className="text-text-2">· 4 lessons</span></li>)}</ol><Checkbox label="I reviewed the course structure and lesson text (human review)" checked={rev.course} onChange={(v) => setRev({ ...rev, course: v })} /></>}
        {step === 4 && <><AIBadge /><ul className="space-y-1 text-sm"><li><b>{modules * 6} MCQs</b> with answer keys and rationale</li><li><b>{modules} assignments</b> with marking guidance</li><li><b>1 question paper</b> (40 marks) + answer key</li></ul><Checkbox label="I reviewed the questions and answer keys (human review)" checked={rev.assess} onChange={(v) => setRev({ ...rev, assess: v })} /></>}
        {step === 5 && <><AIBadge /><ul className="space-y-1 text-sm"><li><b>Rubric:</b> 4 criteria × 4 levels</li><li><b>Game:</b> “Match the objective” drag-and-match</li></ul><Checkbox label="I reviewed rubrics and games (human review)" checked={rev.rubric} onChange={(v) => setRev({ ...rev, rubric: v })} /></>}
        {step === 6 && <><p className="text-sm">Suggested AI Teacher: <b>{subject === "sub-math" ? "Euler" : subject === "sub-sci" ? "Newton" : "None matching"}</b> <Badge tone="ai">AI Teacher</Badge></p><Checkbox label="Recommend this AI Teacher alongside the course (it still needs institution approval before deployment)" checked={aiT} onChange={setAiT} /></>}
        {step === 7 && <div className="space-y-4"><Panel title="Quality checks"><ul className="space-y-1.5">{checks.map((c) => <li key={c.key} className="flex items-center justify-between gap-2 text-sm"><span>{c.label}<span className="block text-xs text-text-2">{c.note}</span></span><Badge tone={checkTone(c.key === "human" ? "pass" : c.state)}>{c.key === "human" ? "done above" : c.state}</Badge></li>)}</ul></Panel>
          <div className="grid gap-3 sm:grid-cols-3"><Field label="Publish to" htmlFor="pb-s"><Select id="pb-s" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}><option value="private">Privately (only me)</option><option value="institution">Institution-wide</option><option value="marketplace">Marketplace (moderated)</option></Select></Field><Field label="Licence" htmlFor="pb-l"><Select id="pb-l" value={licence} onChange={(e) => setLicence(e.target.value as LicenceType)}>{["Free", "One-time", "Subscription", "Institution licence"].map((l) => <option key={l}>{l}</option>)}</Select></Field><Field label="Version" htmlFor="pb-v"><Input id="pb-v" value={version} onChange={(e) => setVersion(e.target.value)} /></Field></div>
          <Checkbox label="I own or have rights to publish this content and accept responsibility for it." checked={rights} onChange={setRights} />
          <Button disabled={!rights || !/^\d+\.\d+$/.test(version)} loading={pub.isPending} onClick={() => pub.mutate()}>Approve & publish</Button></div>}
      </Card>
      <div className="mt-4 flex justify-between"><Button variant="ghost" disabled={step === 0} onClick={() => { setErr(""); setStep(step - 1); }}>Back</Button>{step < STEPS.length - 1 && <Button onClick={next}>Continue</Button>}</div>
    </div>
  );
}
