"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardBody, PageHeader, Select, Field, Stepper } from "@/components/ui";
import { ArrowLeft, ArrowRight, TreeStructure, LockKey, FlagBanner, ChartLineUp } from "@phosphor-icons/react";
import type { ScreenProps } from "@/types/screens";
import { useApp } from "@/stores/app-store";
import { REGIONS } from "@/lib/mock-data/government";
import { G, DemoBanner } from "../components/shared";

const STEPS = ["Context", "Hierarchy", "Drill-down", "Programme workflow", "Baseline loop"];
const HIER = ["State", "District / Regional Administration", "Institution", "Branch / Campus", "Department / Programme", "Grade / Class / Section", "Group / Learning Community"];

export default function Onboarding(_: ScreenProps) {
  const router = useRouter(); const { completeOnboarding } = useApp();
  const [step, setStep] = React.useState(0); const [region, setRegion] = React.useState("all");
  const finish = (skip = false) => { completeOnboarding("government", true); try { localStorage.setItem("zc3-gov-region", region); } catch { /* ignore */ } router.push(G("overview")); void skip; };
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Welcome to the State Command Centre" subtitle="A one-minute orientation for state education officials." actions={<Button variant="ghost" onClick={() => finish(true)}>Skip tour</Button>} />
      <DemoBanner extra="Karuvana State is fictional." />
      <div className="mb-4"><Stepper steps={STEPS} current={step} /></div>
      <Card><CardBody className="space-y-4">
        {step === 0 && <>
          <h2 className="text-heading">Choose your context</h2>
          <Field label="State" htmlFor="ob-state"><Select id="ob-state" defaultValue="k"><option value="k">Karuvana State (fictional demo)</option></Select></Field>
          <Field label="Region focus" htmlFor="ob-region" hint="You can change this any time. State-wide numbers always remain available."><Select id="ob-region" value={region} onChange={(e) => setRegion(e.target.value)}><option value="all">Whole state (12 districts)</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
          <p className="text-sm text-text-2">Demo scale: 62 lakh students, 3.5 lakh teachers, 38,000 institutions. Illustrative, not real.</p></>}
        {step === 1 && <>
          <h2 className="flex items-center gap-2 text-heading"><TreeStructure size={22} className="text-primary" />The hierarchy</h2>
          <ol className="space-y-1.5">{HIER.map((h, i) => <li key={h} className="rounded-xl bg-surface-2 px-3 py-2 text-sm" style={{ marginLeft: i * 12 }}><span className="tnum mr-2 font-bold text-primary">{i + 1}</span>{h}</li>)}</ol></>}
        {step === 2 && <>
          <h2 className="flex items-center gap-2 text-heading"><LockKey size={22} className="text-primary" />Permission-aware drill-down</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-text-2"><li>Drill down from state to district, institution, class and objective.</li><li>Student-level detail only appears where an institution has authorised it. Otherwise you see "Permission prevents student-level drill-down".</li><li>Government never automatically accesses private student conversations.</li><li>Drill-down never erases institutional data ownership.</li></ul>
          <p className="text-xs text-text-2">Prototype permissions are illustrative, not production security.</p></>}
        {step === 3 && <>
          <h2 className="flex items-center gap-2 text-heading"><FlagBanner size={22} className="text-primary" />Programme creation workflow</h2>
          <ol className="grid gap-1.5 text-sm sm:grid-cols-2">{["Define objective", "Select curriculum objectives", "Select resources", "Configure baseline", "Select districts", "Create interventions", "Assign AI Teachers", "Schedule and targets", "Preview and submit", "Track outcomes"].map((s, i) => <li key={s} className="rounded-xl bg-surface-2 px-3 py-2"><span className="tnum mr-2 font-bold text-primary">{i + 1}</span>{s}</li>)}</ol>
          <p className="text-sm text-text-2">AI suggests; authorised officials approve. Statewide launches need explicit human approval.</p></>}
        {step === 4 && <>
          <h2 className="flex items-center gap-2 text-heading"><ChartLineUp size={22} className="text-primary" />Baseline, continuous and follow-up</h2>
          <div className="grid gap-3 sm:grid-cols-3">{[["Baseline", "Mandatory at each student's first login. Locked; never overwritten."], ["Continuous", "Class teacher assessments, course MCQs, games, microlearning, assignments."], ["Follow-up", "Periodic progress checks compared to the ORIGINAL baseline."]].map(([t, b]) => <div key={t} className="rounded-xl bg-lilac/50 p-3"><Badge tone="primary">{t}</Badge><p className="mt-2 text-sm">{b}</p></div>)}</div>
          <p className="text-sm text-text-2">The loop: distribute, baseline, find gaps, plan remedies, deliver, follow up, compare, repeat.</p></>}
        <div className="flex justify-between border-t border-border pt-4">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} />Back</Button>
          <div className="flex gap-2">{step > 0 && <Button variant="outline" onClick={() => setStep(0)}>Replay from start</Button>}{step < STEPS.length - 1 ? <Button onClick={() => setStep(step + 1)}>Next<ArrowRight size={16} /></Button> : <Button onClick={() => finish()}>Open command centre</Button>}</div>
        </div>
      </CardBody></Card>
    </div>
  );
}
