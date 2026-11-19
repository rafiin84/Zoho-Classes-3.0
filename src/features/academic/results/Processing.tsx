"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardBody, Select, Input, Badge, StatusBadge, StatTile, Skeleton, ErrorState, EmptyState, toast, ConfirmDialog, Modal, Field, Textarea } from "@/components/ui";
import { marksheetService } from "@/lib/api/marksheetService";
import type { Marksheet } from "@/types/academic";
import { ACADEMIC_YEARS } from "@/lib/mock-data/core";
import { studentName } from "./common";

export default function Processing({ canApprove, by }: { canApprove: boolean; by: string }) {
  const qc = useQueryClient();
  const bq = useQuery({ queryKey: ["results", "batches"], queryFn: marksheetService.batches });
  const sq = useQuery({ queryKey: ["results", "schemes"], queryFn: marksheetService.schemes });
  const [bid, setBid] = React.useState("rb-t2"); const [ay, setAy] = React.useState("ay-2026-27");
  const sheets = useQuery({ queryKey: ["results", "sheets", bid], queryFn: () => marksheetService.batchSheets(bid), enabled: !!bq.data });
  const issues = useQuery({ queryKey: ["results", "issues", bid], queryFn: () => marksheetService.issues(bid), enabled: !!bq.data });
  const [confirm, setConfirm] = React.useState<"submit" | "approve" | "publish" | null>(null); const [ret, setRet] = React.useState(false); const [note, setNote] = React.useState("");
  const [corr, setCorr] = React.useState<{ m: Marksheet; subjectId: string } | null>(null); const [ci, setCi] = React.useState(0); const [ce, setCe] = React.useState(0); const [cn, setCn] = React.useState(""); const [wh, setWh] = React.useState<Marksheet | null>(null);
  const inv = () => qc.invalidateQueries({ queryKey: ["results"] });
  const onErr = (e: Error) => toast.error(e.message);
  const save = useMutation({ mutationFn: (v: { id: string; sub: string; p: { internal?: number; external?: number; status?: any } }) => marksheetService.saveSubject(v.id, v.sub, v.p, by), onSuccess: inv, onError: onErr });
  const act = useMutation({ mutationFn: async (k: string) => { if (k === "submit") return marksheetService.submitForApproval(bid, by); if (k === "approve") return marksheetService.review(bid, "approve", note, by); if (k === "return") return marksheetService.review(bid, "return", note, by); if (k === "publish") return marksheetService.publish(bid, by); return marksheetService.importMock(bid); }, onSuccess: (_d, k) => { toast.success(k === "publish" ? "Published. Students and parents have been notified." : k === "import" ? "Mock import filled missing marks." : `Batch ${k === "submit" ? "submitted for approval" : k === "approve" ? "approved" : "returned to draft"}.`); setRet(false); setNote(""); inv(); }, onError: onErr });
  const corrM = useMutation({ mutationFn: () => marksheetService.correct(corr!.m.id, corr!.subjectId, ci, ce, cn, by), onSuccess: () => { toast.success("Correction drafted as a new version. The published version stays live until the correction is published."); setCorr(null); setCn(""); inv(); }, onError: onErr });
  const whM = useMutation({ mutationFn: () => marksheetService.withhold(wh!.id, cn), onSuccess: () => { toast.success("Result withheld."); setWh(null); setCn(""); inv(); }, onError: onErr });
  const pubCorr = useMutation({ mutationFn: (id: string) => marksheetService.publishCorrection(id), onSuccess: () => { toast.success("Correction published and learners notified."); inv(); }, onError: onErr });
  const pend = useQuery({ queryKey: ["results", "pending"], queryFn: marksheetService.pendingCorrections });
  if (bq.isLoading || sq.isLoading) return <Skeleton className="h-72" />;
  if (bq.isError || !bq.data || !sq.data) return <ErrorState onRetry={() => { bq.refetch(); sq.refetch(); }} />;
  const batches = bq.data.filter((b) => b.academicYearId === ay); const b = bq.data.find((x) => x.id === bid) ?? batches[0];
  const scheme = sq.data.find((s) => s.id === b?.schemeId); const list = sheets.data ?? [];
  const editable = b?.status === "draft";
  const pass = list.filter((m) => m.result === "Pass").length, fail = list.filter((m) => m.result === "Fail").length, held = list.filter((m) => m.result === "Withheld").length;
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <Field label="Academic year" htmlFor="ay"><Select id="ay" value={ay} onChange={(e) => { setAy(e.target.value); }}>{ACADEMIC_YEARS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</Select></Field>
        <Field label="Exam / term" htmlFor="ex"><Select id="ex" value={b?.id ?? ""} onChange={(e) => setBid(e.target.value)}>{batches.length ? batches.map((x) => <option key={x.id} value={x.id}>{x.examLabel} · {x.classLabel}</option>) : <option value="">No exams</option>}</Select></Field>
        <Field label="Grading scheme" htmlFor="gs"><Select id="gs" disabled={!editable || !canApprove} value={b?.schemeId} onChange={(e) => marksheetService.setBatchScheme(bid, e.target.value).then(() => { toast.success("Scheme applied; grades recalculated."); inv(); }).catch(onErr)}>{sq.data.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <div className="flex items-end"><StatusBadge status={b?.status ?? "draft"} /></div>
      </div>
      {!b ? <EmptyState title="No result batches for this year" body="Pick another academic year or create the exam in the exam scheduler first." /> : <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><StatTile label="Students" value={list.length} /><StatTile label="Pass" value={pass} /><StatTile label="Fail" value={fail} /><StatTile label="Withheld or incomplete" value={held} /></div>
        {!!issues.data?.length && editable && <div role="alert" className="rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm"><b>{issues.data.length} validation issue{issues.data.length > 1 ? "s" : ""} block submission.</b><ul className="mt-1 list-disc pl-5 text-xs">{issues.data.slice(0, 6).map((i, k) => <li key={k}>{studentName(i.studentId)} · {i.message}</li>)}</ul></div>}
        <div className="flex flex-wrap gap-2">
          {editable && <Button variant="outline" size="sm" loading={act.isPending && act.variables === "import"} onClick={() => act.mutate("import")}>Import marks (mock)</Button>}
          {editable && <Button size="sm" onClick={() => setConfirm("submit")} disabled={!!issues.data?.length}>Submit for approval</Button>}
          {b.status === "in-review" && canApprove && <><Button size="sm" variant="success" onClick={() => setConfirm("approve")}>Approve</Button><Button size="sm" variant="outline" onClick={() => setRet(true)}>Return to draft</Button></>}
          {b.status === "in-review" && !canApprove && <Badge tone="warning">Awaiting exam controller review</Badge>}
          {b.status === "approved" && canApprove && <Button size="sm" onClick={() => setConfirm("publish")}>Publish results</Button>}
          {b.status === "approved" && !canApprove && <Badge tone="success">Approved. Exam office will publish.</Badge>}
        </div>
        {b.reviewNote && b.status === "draft" && <p className="text-xs text-warning">Reviewer note: {b.reviewNote}</p>}
        <Card><CardBody className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-text-2"><tr><th className="py-1">Student</th>{list[0]?.subjects.map((s) => <th key={s.subjectId} className="px-1">{s.subjectName.split(" ")[0]}<br /><span className="font-normal">int/{scheme?.internalMax} · ext/{scheme?.externalMax}</span></th>)}<th>Total</th><th>Result</th><th /></tr></thead>
            <tbody>{sheets.isLoading ? <tr><td colSpan={9}><Skeleton className="h-24" /></td></tr> : list.map((m) => (
              <tr key={m.id} className="border-t border-border align-top">
                <td className="py-1.5 pr-2 font-medium">{studentName(m.studentId)}<div className="text-xs font-normal text-text-2">v{m.version}</div></td>
                {m.subjects.map((s) => (
                  <td key={s.subjectId} className="px-1 py-1.5">
                    <div className="flex gap-1">
                      <Input aria-label={`${studentName(m.studentId)} ${s.subjectName} internal`} className="h-8 w-14 px-2 text-xs" type="number" disabled={!editable || s.status === "absent" || s.status === "exempt"} defaultValue={s.status === "incomplete" ? "" : s.internal} key={`i${s.internal}${s.status}`} onBlur={(e) => { const v = e.target.value; if (v === "") return; if (Number(v) !== s.internal) save.mutate({ id: m.id, sub: s.subjectId, p: { internal: Number(v) } }); }} />
                      <Input aria-label={`${studentName(m.studentId)} ${s.subjectName} external`} className="h-8 w-14 px-2 text-xs" type="number" disabled={!editable || s.status === "absent" || s.status === "exempt"} defaultValue={s.status === "incomplete" ? "" : s.external} key={`e${s.external}${s.status}`} onBlur={(e) => { const v = e.target.value; if (v === "") return; if (Number(v) !== s.external) save.mutate({ id: m.id, sub: s.subjectId, p: { external: Number(v) } }); }} />
                    </div>
                    <div className="mt-1 flex items-center gap-1"><Select aria-label={`${s.subjectName} status for ${studentName(m.studentId)}`} className="h-7 w-28 px-1.5 pr-6 text-[11px]" disabled={!editable} value={s.status === "fail" ? "pass" : s.status} onChange={(e) => save.mutate({ id: m.id, sub: s.subjectId, p: { status: e.target.value } })}><option value="pass">Marks entered</option><option value="absent">Absent</option><option value="exempt">Exempt</option><option value="withheld">Withheld</option><option value="incomplete">Incomplete</option></Select><span className="tnum text-xs font-semibold">{s.grade}</span></div>
                    {m.publicationStatus === "published" && canApprove && <button className="mt-1 text-[11px] font-semibold text-primary underline" onClick={() => { setCorr({ m, subjectId: s.subjectId }); setCi(s.internal); setCe(s.external); }}>Correct</button>}
                  </td>))}
                <td className="tnum whitespace-nowrap pr-2">{m.totalObtained}/{m.totalMax}<div className="text-xs text-text-2">{m.percentage}% · GPA {m.gpa ?? "–"}</div></td>
                <td><Badge tone={m.result === "Pass" ? "success" : m.result === "Fail" ? "danger" : "warning"}>{m.result}</Badge></td>
                <td>{canApprove && m.publicationStatus !== "withheld" && <Button size="sm" variant="ghost" onClick={() => setWh(m)}>Withhold</Button>}</td>
              </tr>))}</tbody>
          </table>
          {!editable && <p className="mt-2 text-xs text-text-2">Marks are locked while the batch is {b.status}.</p>}
        </CardBody></Card>
        {!!pend.data?.length && <Card><CardBody><p className="mb-2 text-sm font-semibold">Pending corrections</p>{pend.data.map((m) => <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2 text-sm first:border-0"><span>{studentName(m.studentId)} · {m.examLabel} v{m.version}<span className="block text-xs text-text-2">{m.correctionNote}</span></span>{canApprove && <Button size="sm" onClick={() => pubCorr.mutate(m.id)}>Approve and publish correction</Button>}</div>)}</CardBody></Card>}
        <Card><CardBody><p className="mb-1 text-sm font-semibold">Batch history</p><ul className="space-y-0.5 text-xs text-text-2">{[...b.history].reverse().slice(0, 6).map((h, i) => <li key={i}>{new Date(h.at).toLocaleString("en-IN")} · {h.by} · {h.text}</li>)}</ul></CardBody></Card>
      </>}
      <ConfirmDialog open={confirm === "submit"} onOpenChange={() => setConfirm(null)} title="Submit this batch for approval?" body="Marks lock until the exam controller approves or returns the batch." confirmLabel="Submit" onConfirm={() => act.mutate("submit")} />
      <ConfirmDialog open={confirm === "approve"} onOpenChange={() => setConfirm(null)} title="Approve results?" body="Approved results can then be published. Nothing is visible to students until publication." confirmLabel="Approve" onConfirm={() => act.mutate("approve")} />
      <ConfirmDialog open={confirm === "publish"} onOpenChange={() => setConfirm(null)} title="Publish results to students and parents?" body="Complete results become visible and each student and parent is notified. Withheld or incomplete ones stay hidden." confirmLabel="Publish" onConfirm={() => act.mutate("publish")} />
      <Modal open={ret} onOpenChange={setRet} title="Return to draft" footer={<><Button variant="ghost" onClick={() => setRet(false)}>Cancel</Button><Button onClick={() => act.mutate("return")}>Return</Button></>}><Field label="What needs fixing?" htmlFor="rn"><Textarea id="rn" value={note} onChange={(e) => setNote(e.target.value)} /></Field></Modal>
      <Modal open={!!corr} onOpenChange={(o) => !o && setCorr(null)} title="Correct published marks" description="Creates a new marksheet version. The current one stays live until the correction is approved and published." footer={<><Button variant="ghost" onClick={() => setCorr(null)}>Cancel</Button><Button loading={corrM.isPending} onClick={() => corrM.mutate()}>Create correction</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Internal" htmlFor="ci"><Input id="ci" type="number" value={ci} onChange={(e) => setCi(Number(e.target.value))} /></Field><Field label="External" htmlFor="ce"><Input id="ce" type="number" value={ce} onChange={(e) => setCe(Number(e.target.value))} /></Field></div>
        <Field className="mt-3" label="Reason for correction" htmlFor="cn"><Textarea id="cn" value={cn} onChange={(e) => setCn(e.target.value)} /></Field>
      </Modal>
      <Modal open={!!wh} onOpenChange={(o) => !o && setWh(null)} title="Withhold this result" footer={<><Button variant="ghost" onClick={() => setWh(null)}>Cancel</Button><Button variant="danger" loading={whM.isPending} onClick={() => whM.mutate()}>Withhold</Button></>}><Field label="Reason" htmlFor="wr"><Textarea id="wr" value={cn} onChange={(e) => setCn(e.target.value)} /></Field></Modal>
    </div>
  );
}
