"use client";
import * as React from "react";
import Link from "next/link";
import { Info, ShieldCheck } from "@phosphor-icons/react";
import { Button, Card, CardBody, Checkbox, PageHeader, SectionHeader, Segmented } from "@/components/ui";
import { ExportList, NOT_TRANSCRIPT, useExports } from "./exports";

const RECORDS: { key: string; label: string; desc: string; count: string; group?: boolean }[] = [
  { key: "profile", label: "Profile & interests", desc: "Name, class, interests", count: "1 record" },
  { key: "learning-history", label: "Learning activity history", desc: "Games, challenges, tutor sessions", count: "Your activity" },
  { key: "assessments", label: "Assessment results (released)", desc: "Only marks your teacher has released", count: "Released only" },
  { key: "assignments", label: "Assignments & feedback", desc: "Your own submissions and teacher feedback", count: "Your work" },
  { key: "portfolio", label: "Portfolio items", desc: "Competitions, clubs, awards, Talent Corner", count: "Your items" },
  { key: "group-work", label: "Group work contributions", desc: "Only your own parts of shared work", count: "Your parts only", group: true },
];

export default function DataScreen() {
  const [sel, setSel] = React.useState<string[]>(["profile", "learning-history", "portfolio"]);
  const [fmt, setFmt] = React.useState<"data" | "full-data">("data");
  const { request } = useExports();
  const toggle = (k: string, v: boolean) => setSel((s) => (v ? [...s, k] : s.filter((x) => x !== k)));
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="My data" subtitle="Download a copy of your own information. You choose what's included." />
      <Card tone="plain" className="p-4 text-sm"><p className="flex items-start gap-2"><Info size={18} className="mt-0.5 shrink-0 text-info" /><span><b>Data export vs official transcript.</b> {NOT_TRANSCRIPT} For a verified record, request one from your school in <Link href="/student/you/portfolio" className="font-semibold text-primary underline">Portfolio</Link>.</span></p></Card>
      <section aria-label="Select records"><SectionHeader title="What to include" />
        <Card><CardBody className="space-y-3">{RECORDS.map((r) => (
          <div key={r.key} className="flex items-start gap-3"><div className="pt-0.5"><Checkbox label="" checked={sel.includes(r.key)} onChange={(v) => toggle(r.key, v)} /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{r.label}</p><p className="text-xs text-text-2">{r.desc} · {r.count}</p>{r.group && <p className="mt-1 flex items-center gap-1 text-xs text-success"><ShieldCheck size={13} /> Other students' names and work are removed from group-work exports.</p>}</div></div>
        ))}</CardBody></Card></section>
      <section aria-label="Preview"><SectionHeader title="Export preview" />
        <Card><CardBody className="space-y-3" aria-live="polite">
          <Segmented label="fmt" value={fmt} onChange={setFmt} options={[{ value: "data", label: "Structured (JSON)" }, { value: "full-data", label: "Full archive (ZIP)" }]} />
          {sel.length === 0 ? <p role="alert" className="text-sm text-danger">Choose at least one record type.</p> : <ul className="list-disc pl-5 text-sm">{sel.map((k) => <li key={k}>{RECORDS.find((r) => r.key === k)!.label}</li>)}</ul>}
          <p className="text-xs text-text-2">Your guardian's details, other students' information and staff-only notes are never included.</p>
          <Button disabled={sel.length === 0} loading={request.isPending} onClick={() => request.mutate({ kind: fmt, label: fmt === "data" ? "Structured data export (JSON)" : "Full data archive (ZIP)", scope: sel })}>Request export</Button>
        </CardBody></Card></section>
      <section aria-label="Requests"><SectionHeader title="Your requests" /><ExportList /></section>
    </div>
  );
}
