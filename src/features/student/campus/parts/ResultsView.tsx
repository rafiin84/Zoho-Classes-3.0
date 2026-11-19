"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Certificate, Printer, ArrowsClockwise, Info, Seal } from "@phosphor-icons/react";
import { marksheetService } from "@/lib/api";
import { revaluationService } from "@/lib/api/revaluationService";
import { Badge, Button, Card, CardBody, EmptyState, Field, Modal, PageHeader, SectionHeader, Skeleton, StatTile, StatusBadge, Textarea, toast, Segmented } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import type { Marksheet } from "@/types/academic";
import { ck } from "../keys";
import { Boundary } from "../shared";

const SCALE = [["A+", "90–100", "Outstanding"], ["A", "80–89", "Excellent"], ["B+", "70–79", "Very good"], ["B", "60–69", "Good"], ["C", "50–59", "Satisfactory"], ["D", "40–49", "Needs support"], ["F", "Below 40", "Not yet passed"]];

function Sheet({ m, name, forPrint }: { m: Marksheet; name: string; forPrint?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 text-sm">
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="-rotate-[24deg] select-none text-center text-3xl font-extrabold tracking-widest text-primary/10 sm:text-5xl">DEMO · unofficial</span></div>
      <div className="relative space-y-4">
        <div className="text-center"><p className="text-xs font-semibold uppercase tracking-wider text-text-2">Greenfield International School</p><h3 className="text-heading">{m.examLabel} · Marksheet</h3><p className="text-text-2">{name} · {m.classLabel} · {m.academicYearId.replace("ay-", "")}</p></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Subject-wise marks</caption><thead><tr className="border-b border-border text-left text-xs text-text-2"><th className="py-2">Subject</th><th className="py-2 text-right">Internal</th><th className="py-2 text-right">External</th><th className="py-2 text-right">Total</th><th className="py-2 text-right">Max</th><th className="py-2 text-right">Grade</th><th className="py-2 text-right">Status</th></tr></thead>
          <tbody>{m.subjects.map((s) => <tr key={s.subjectId} className="border-b border-border/60"><td className="py-2 font-medium">{s.subjectName}</td><td className="tnum py-2 text-right">{s.internal}</td><td className="tnum py-2 text-right">{s.external}</td><td className="tnum py-2 text-right font-semibold">{s.total}</td><td className="tnum py-2 text-right text-text-2">{s.maxMarks}</td><td className="py-2 text-right font-bold text-primary">{s.grade}</td><td className="py-2 text-right capitalize">{s.status}</td></tr>)}</tbody></table></div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div><dt className="text-xs text-text-2">Total</dt><dd className="tnum font-bold">{m.totalObtained}/{m.totalMax}</dd></div><div><dt className="text-xs text-text-2">Percentage</dt><dd className="tnum font-bold">{m.percentage}%</dd></div><div><dt className="text-xs text-text-2">GPA</dt><dd className="tnum font-bold">{m.gpa ?? "–"}</dd></div><div><dt className="text-xs text-text-2">Result</dt><dd className="font-bold">{m.result}</dd></div></dl>
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3 text-xs text-text-2"><div><p>Issued {m.publishedAt ? fmtDate(m.publishedAt) : "–"} · v{m.version}</p><p className="font-mono">Ref {m.reference}</p>{m.correctionNote && <p className="text-warning">Correction: {m.correctionNote}</p>}</div><div className="text-center"><div className="mb-1 h-8 w-36 border-b border-dashed border-text-2" /><p>Principal&apos;s signature (placeholder)</p></div></div>
        {forPrint && <p className="text-center text-xs text-text-2">Unofficial demo copy. Not valid for admission, scholarship or legal use.</p>}
      </div>
    </div>
  );
}

export function ResultsView({ studentId, name, mode }: { studentId: string; name: string; mode: "student" | "parent" }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ck.results(studentId), queryFn: () => marksheetService.forStudent(studentId) });
  const rq = useQuery({ queryKey: [...ck.results(studentId), "reval"], queryFn: () => revaluationService.forStudent(studentId) });
  const [sel, setSel] = useState<string | null>(null); const [preview, setPreview] = useState<Marksheet | null>(null); const [rv, setRv] = useState<{ m: Marksheet; subjectId: string } | null>(null); const [reason, setReason] = useState("");
  const req = useMutation({ mutationFn: () => revaluationService.request({ studentId, marksheetId: rv!.m.id, subjectId: rv!.subjectId, subjectName: rv!.m.subjects.find((s) => s.subjectId === rv!.subjectId)!.subjectName, reason }), onSuccess: () => { toast.success("Recheck request sent to the examination office."); setRv(null); setReason(""); qc.invalidateQueries({ queryKey: ck.results(studentId) }); }, onError: (e) => toast.error((e as Error).message) });
  const who = mode === "parent" ? `${name}'s` : "Your";
  return (
    <div>
      <PageHeader title="Results & Marksheets" subtitle={`${who} published marksheets only. Draft or unreleased results are never shown.`} />
      <Boundary q={q} skeleton={<div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-72" /></div>} isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon={<Certificate size={28} weight="duotone" />} title="Results aren't published yet" body="Your school publishes marksheets after moderation and approval. Nothing is wrong. You'll be notified the moment they are released." />}>
        {(sheets) => {
          const m = sheets.find((s) => s.id === sel) ?? sheets[0]; const mine = (rq.data ?? []).filter((r) => r.marksheetId === m.id);
          return (
            <div className="space-y-5">
              {sheets.length > 1 && <Segmented label="Marksheet" value={m.id} onChange={setSel} options={sheets.map((s) => ({ value: s.id, label: s.examLabel }))} />}
              <div className="grid gap-3 sm:grid-cols-4"><StatTile label="Percentage" value={`${m.percentage}%`} tone="lilac" /><StatTile label="Total" value={`${m.totalObtained}/${m.totalMax}`} /><StatTile label="GPA" value={m.gpa ?? "–"} /><StatTile label="Result" value={m.result} hint={`Published ${m.publishedAt ? fmtDate(m.publishedAt) : ""}`} /></div>
              <Card><CardBody><SectionHeader title="Subjects" action={<Button variant="outline" size="sm" onClick={() => setPreview(m)}><Printer size={16} />Download / print preview</Button>} />
                <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Subject results</caption><thead><tr className="border-b border-border text-left text-xs text-text-2"><th className="py-2">Subject</th><th className="py-2 text-right">Internal</th><th className="py-2 text-right">External</th><th className="py-2 text-right">Total / Max</th><th className="py-2 text-right">Grade</th><th className="py-2 text-right">Status</th><th /></tr></thead>
                  <tbody>{m.subjects.map((s) => { const r = mine.find((x) => x.subjectId === s.subjectId); return <tr key={s.subjectId} className="border-b border-border/60"><td className="py-2.5 font-medium">{s.subjectName}</td><td className="tnum py-2.5 text-right">{s.internal}</td><td className="tnum py-2.5 text-right">{s.external}</td><td className="tnum py-2.5 text-right">{s.total} / {s.maxMarks}</td><td className="py-2.5 text-right font-bold text-primary">{s.grade}</td><td className="py-2.5 text-right"><StatusBadge status={s.status === "pass" ? "passed" : s.status} label={s.status === "pass" ? "Pass" : s.status} /></td><td className="py-2.5 text-right">{r ? <Badge tone={r.status === "completed" ? "success" : "warning"}>Recheck: {r.status.replace("-", " ")}</Badge> : <Button size="sm" variant="ghost" onClick={() => setRv({ m, subjectId: s.subjectId })}><ArrowsClockwise size={14} />Request recheck</Button>}</td></tr>; })}</tbody></table></div>
                <p className="mt-3 text-sm text-text-2">Remarks: {m.subjects.find((s) => s.remarks)?.remarks ?? "Steady progress across subjects. Keep building on the strengths shown here."}</p>
                {m.correctionNote && <p className="mt-2 rounded-xl bg-warning-soft p-3 text-sm text-warning">Corrected version v{m.version}: {m.correctionNote}</p>}
                {mine.length > 0 && <ul className="mt-3 space-y-1 text-sm">{mine.map((r) => <li key={r.id} className="rounded-xl bg-surface-2 px-3 py-2">Recheck for <strong>{r.subjectName}</strong> sent {fmtDate(r.createdAt)} · status <strong>{r.status.replace("-", " ")}</strong>{r.outcome ? ` · ${r.outcome}` : ""}</li>)}</ul>}</CardBody></Card>
              <div className="grid gap-5 lg:grid-cols-2">
                <Card><CardBody><SectionHeader title="Grading scale" /><table className="w-full text-sm"><caption className="sr-only">Grading scale</caption><tbody>{SCALE.map(([g, r, d]) => <tr key={g} className="border-b border-border/60"><td className="py-1.5 font-bold text-primary">{g}</td><td className="tnum py-1.5">{r}</td><td className="py-1.5 text-text-2">{d}</td></tr>)}</tbody></table></CardBody></Card>
                <Card><CardBody className="space-y-2 text-sm"><SectionHeader title="About this marksheet" /><p className="flex items-center gap-2"><Seal size={18} className="text-primary" />Reference <span className="font-mono">{m.reference}</span> · version {m.version}</p><p className="flex items-start gap-2 text-text-2"><Info size={18} className="mt-0.5 shrink-0" />This is a prototype copy. Printed versions are watermarked &ldquo;DEMO · unofficial&rdquo;.</p></CardBody></Card>
              </div>
            </div>
          );
        }}
      </Boundary>
      <Modal open={!!preview} onOpenChange={(o) => !o && setPreview(null)} title="Marksheet preview" description="Watermarked demo copy" className="sm:max-w-2xl" footer={<><Button variant="ghost" onClick={() => setPreview(null)}>Close</Button><Button onClick={() => { window.print(); }}><Printer size={16} />Print</Button></>}>{preview && <Sheet m={preview} name={name} forPrint />}</Modal>
      <Modal open={!!rv} onOpenChange={(o) => !o && setRv(null)} title="Request a recheck" description={rv ? `${rv.m.subjects.find((s) => s.subjectId === rv.subjectId)?.subjectName} · ${rv.m.examLabel}` : ""} footer={<><Button variant="ghost" onClick={() => setRv(null)}>Cancel</Button><Button loading={req.isPending} disabled={reason.trim().length < 10} onClick={() => req.mutate()}>Send request</Button></>}>
        <Field label="Why would you like a recheck?" htmlFor="rv-reason" hint="At least 10 characters. The examination office reviews every request."><Textarea id="rv-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: I think question 4 in the external paper was not totalled." /></Field>
      </Modal>
    </div>
  );
}
