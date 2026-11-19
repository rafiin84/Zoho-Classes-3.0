"use client";
import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Info, Plus, ShieldWarning, Clock, CheckCircle, FilePdf, Database, Certificate, SealQuestion } from "@phosphor-icons/react";
import { portfolioService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import type { PortfolioItem, PortfolioSection, PortfolioVisibility } from "@/types/portfolio";
import { Avatar, Badge, Button, Card, CardBody, EmptyState, ErrorState, Field, Icon, Input, Modal, PageHeader, Progress, SectionHeader, Select, Skeleton, toast } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { communityKeys } from "../community/keys";
import { ExportList, NOT_TRANSCRIPT, useExports } from "./exports";

const SECTIONS: { key: PortfolioSection; title: string; empty: string; note?: string }[] = [
  { key: "profile", title: "Profile & interests", empty: "" },
  { key: "academic", title: "Academic progress", empty: "", note: "From your learning profile. Kept separate from extracurricular activity." },
  { key: "courses", title: "Courses & assessments", empty: "Completed courses and assessments will appear here." },
  { key: "skills", title: "Skills & competencies", empty: "Skills appear as you demonstrate mastery." },
  { key: "sports", title: "Sports participation", empty: "Register for a sports event to add it here." },
  { key: "competitions", title: "Competitions & rankings", empty: "Competitions you register for show up here." },
  { key: "awards", title: "Awards & certificates", empty: "Awards and badges will collect here." },
  { key: "projects", title: "Projects & inventions", empty: "Add a project you're proud of." },
  { key: "talent", title: "Talent Corner gallery", empty: "Share your work in Talent Corner to add it." },
  { key: "clubs", title: "Clubs", empty: "Join a club to add it." },
  { key: "milestones", title: "Learning milestones", empty: "Games and daily challenges you complete appear here." },
];
const VIS: { v: PortfolioVisibility; label: string }[] = [{ v: "private", label: "Only me" }, { v: "guardian", label: "Parent / guardian" }, { v: "teachers", label: "My teachers" }, { v: "institution", label: "Whole institution" }, { v: "wider", label: "Approved wider audience" }];

function ItemRow({ it, onVis, onApprove, busy }: { it: PortfolioItem; onVis: (v: PortfolioVisibility) => void; onApprove: () => void; busy: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lilac text-primary"><Icon name={it.icon ?? "Star"} size={20} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{it.href ? <Link href={it.href} className="hover:underline">{it.title}</Link> : it.title}</p>
        <p className="truncate text-xs text-text-2">{[it.subtitle, it.date && fmtDate(it.date)].filter(Boolean).join(" · ")}</p>
        <div className="mt-1 flex flex-wrap gap-1">{it.status && <Badge>{it.status}</Badge>}{it.institutionRecord ? <Badge tone="info">From school record</Badge> : <Badge>Student-added</Badge>}
          {it.approval === "pending" && <Badge tone="warning" icon={<Clock size={11} />}>Pending approval</Badge>}{it.approval === "published" && <Badge tone="success" icon={<CheckCircle size={11} />}>Published</Badge>}</div>
      </div>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`v-${it.id}`}>Visibility for {it.title}</label>
        <Select id={`v-${it.id}`} value={it.visibility} disabled={busy} onChange={(e) => onVis(e.target.value as PortfolioVisibility)} className="h-10 w-auto text-xs"><>{VIS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}</></Select>
        {it.approval === "pending" && <Button size="sm" variant="ghost" onClick={onApprove}>Demo: approve</Button>}
      </div>
    </li>
  );
}

export default function PortfolioScreen() {
  const { studentId } = useActors();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: communityKeys.portfolio(studentId), queryFn: () => portfolioService.get(studentId), retry: false });
  const inval = () => qc.invalidateQueries({ queryKey: communityKeys.portfolio(studentId) });
  const setVis = useMutation({ mutationFn: (p: { id: string; v: PortfolioVisibility }) => portfolioService.setVisibility(studentId, p.id, p.v), onSuccess: (r, p) => { inval(); r.approval === "pending" ? toast.info("Sent for approval", "A teacher and your guardian approve anything shown to a wider audience.") : toast.success("Visibility updated", VIS.find((o) => o.v === p.v)?.label); } });
  const approve = useMutation({ mutationFn: (id: string) => portfolioService.simulateApproval(studentId, id), onSuccess: () => { inval(); toast.success("Approved (demo)"); } });
  const [addOpen, setAddOpen] = React.useState(false);
  const [add, setAdd] = React.useState({ title: "", subtitle: "", section: "projects" as PortfolioSection });
  const [addErr, setAddErr] = React.useState("");
  const addItem = useMutation({ mutationFn: () => portfolioService.addItem(studentId, add), onSuccess: () => { inval(); setAddOpen(false); setAdd({ title: "", subtitle: "", section: "projects" }); toast.success("Added — only you can see it"); } });
  const { request } = useExports();
  const [verifyOpen, setVerifyOpen] = React.useState(false);

  if (q.isPending) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-60" /></div>;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const d = q.data;
  const by = (s: PortfolioSection) => d.items.filter((i) => i.section === s);
  const exportAll = (kind: "pdf" | "data", label: string) => request.mutate({ kind, label, scope: ["profile", "academic", "competitions", "clubs", "talent", "awards"] });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Digital portfolio" subtitle="Your academic journey and everything else you do, in one place. You decide who sees each item." actions={<Button onClick={() => setAddOpen(true)}><Plus size={18} /> Add item</Button>} />
      <Card tone="plain" className="mb-5 p-4 text-sm"><p className="flex items-start gap-2"><ShieldWarning size={20} className="mt-0.5 shrink-0 text-warning" /><span>{NOT_TRANSCRIPT} Extracurricular activity is never mixed into academic grades.</span></p></Card>

      <div className="space-y-8">
        <section aria-labelledby="s-profile"><SectionHeader title="Profile & interests" />
          <Card><CardBody className="flex flex-wrap items-center gap-4"><Avatar name={d.profile.name} color={d.profile.color} size={56} /><div><p className="font-semibold">{d.profile.name}</p><p className="text-sm text-text-2">{d.profile.gradeLabel} · Section {d.profile.className}</p></div><div className="flex flex-wrap gap-1.5">{d.profile.interests.map((i) => <Badge key={i} tone="primary">{i}</Badge>)}</div></CardBody></Card></section>

        <section aria-label="Academic progress"><SectionHeader title="Academic progress" subtitle="From your learning profile. Kept separate from extracurricular activity." action={<Badge tone="info">School record</Badge>} />
          {d.academic.length === 0 ? <EmptyState title="No academic data yet" body="Finish your baseline and a few lessons to see progress by subject." action={{ label: "Go to Learn", href: "/student/learn" }} /> : <Card><CardBody className="space-y-3">{d.academic.map((a) => <div key={a.subjectId}><div className="flex justify-between text-sm"><span>{a.name}</span><span className="tnum font-semibold">{a.mastery}% mastery</span></div><Progress value={a.mastery} label={`${a.name} mastery`} /></div>)}</CardBody></Card>}</section>

        {SECTIONS.filter((s) => !["profile", "academic"].includes(s.key)).map((s) => (
          <section key={s.key} aria-label={s.title}><SectionHeader title={s.title} />
            {by(s.key).length === 0 ? <EmptyState title="Nothing here yet" body={s.empty} icon={<Eye size={26} />} /> : <ul className="space-y-2">{by(s.key).map((it) => <ItemRow key={it.id} it={it} busy={setVis.isPending} onVis={(v) => setVis.mutate({ id: it.id, v })} onApprove={() => approve.mutate(it.id)} />)}</ul>}
          </section>
        ))}

        <section aria-label="Export"><SectionHeader title="Export & verification" />
          <Card><CardBody className="space-y-4">
            <p className="flex items-start gap-2 text-sm"><Info size={18} className="mt-0.5 shrink-0 text-info" />{NOT_TRANSCRIPT}</p>
            <div className="flex flex-wrap gap-2">
              <Button loading={request.isPending} onClick={() => exportAll("pdf", "Portfolio PDF (student-generated)")}><FilePdf size={18} /> Export PDF</Button>
              <Button variant="outline" onClick={() => exportAll("data", "Structured data export (JSON)")}><Database size={18} /> Structured data</Button>
              <Button asChild variant="outline"><Link href="/student/certificates"><Certificate size={18} /> Certificates</Link></Button>
              <Button variant="soft" onClick={() => setVerifyOpen(true)}><SealQuestion size={18} /> Request verified record</Button>
            </div>
            <ExportList />
          </CardBody></Card>
        </section>
      </div>

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add to your portfolio" description="Items you add are private until you change their visibility." footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button><Button loading={addItem.isPending} onClick={() => { if (add.title.trim().length < 3) { setAddErr("Give it a title of at least 3 characters."); return; } setAddErr(""); addItem.mutate(); }}>Add</Button></>}>
        <div className="space-y-4">
          <Field label="Section" htmlFor="as"><Select id="as" value={add.section} onChange={(e) => setAdd({ ...add, section: e.target.value as PortfolioSection })}>{["projects", "sports", "awards", "skills", "milestones"].map((k) => <option key={k} value={k}>{SECTIONS.find((s) => s.key === k)!.title}</option>)}</Select></Field>
          <Field label="Title" htmlFor="at" error={addErr}><Input id="at" value={add.title} onChange={(e) => setAdd({ ...add, title: e.target.value })} aria-invalid={!!addErr} /></Field>
          <Field label="Details" htmlFor="ad" optional><Input id="ad" value={add.subtitle} onChange={(e) => setAdd({ ...add, subtitle: e.target.value })} /></Field>
        </div>
      </Modal>
      <Modal open={verifyOpen} onOpenChange={setVerifyOpen} title="Request a verified record" description="Only your institution can verify records." footer={<><Button variant="ghost" onClick={() => setVerifyOpen(false)}>Close</Button><Button loading={request.isPending} onClick={() => { request.mutate({ kind: "verified-request", label: "Verified-record request to school office", scope: ["academic"], note: "Awaiting school office" }); setVerifyOpen(false); }}>Send request</Button></>}>
        <p className="text-sm">This sends a request to your school office. They decide whether to issue an official transcript. Nothing in this demo is certified, and a portfolio export never implies verified credentials.</p>
      </Modal>
    </div>
  );
}
