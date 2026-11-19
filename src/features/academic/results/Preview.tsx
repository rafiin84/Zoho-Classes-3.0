"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, CardBody, Select, Field, Segmented, Skeleton, ErrorState, EmptyState, Badge } from "@/components/ui";
import { marksheetService } from "@/lib/api/marksheetService";
import { STUDENTS, ACADEMIC_YEARS } from "@/lib/mock-data/core";
import { fmtDate } from "@/lib/format";

export default function Preview() {
  const q = useQuery({ queryKey: ["results", "all"], queryFn: marksheetService.allStaff });
  const [sid, setSid] = React.useState("stu-ananya"); const [mode, setMode] = React.useState<"marksheet" | "transcript">("marksheet"); const [eid, setEid] = React.useState("t1");
  if (q.isLoading) return <Skeleton className="h-72" />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const mine = q.data.filter((m) => m.studentId === sid); const st = STUDENTS.find((s) => s.id === sid)!;
  const sheet = mine.find((m) => m.examId === eid) ?? mine[0];
  const published = mine.filter((m) => m.publicationStatus === "published");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <Field label="Student" htmlFor="ps"><Select id="ps" value={sid} onChange={(e) => setSid(e.target.value)}>{STUDENTS.filter((s) => q.data!.some((m) => m.studentId === s.id)).map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}</Select></Field>
        <Segmented<"marksheet" | "transcript"> label="Document" value={mode} onChange={setMode} options={[{ value: "marksheet", label: "Marksheet" }, { value: "transcript", label: "Transcript" }]} />
        {mode === "marksheet" && <Field label="Exam" htmlFor="pe"><Select id="pe" value={sheet?.examId} onChange={(e) => setEid(e.target.value)}>{mine.map((m) => <option key={m.id} value={m.examId}>{m.examLabel} ({m.publicationStatus})</option>)}</Select></Field>}
        <Button variant="outline" onClick={() => window.print()}>Print or save as PDF</Button>
      </div>
      <p className="text-xs text-text-2 print:hidden">Staff preview shows drafts too. Students and parents only ever see published versions. Alumni keep access to their own published historical records only; current status: {st.status === "alumni" ? "alumni" : "current student"}.</p>
      {!sheet ? <EmptyState title="No marksheet" body="This student has no result record yet." /> : (
        <Card className="relative overflow-hidden"><CardBody className="relative p-6 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="-rotate-[25deg] select-none text-5xl font-black uppercase tracking-widest text-text/10 sm:text-7xl">DEMO · unofficial</span></div>
          <div className="relative">
            <div className="border-b border-border pb-3 text-center"><p className="text-lg font-bold">Greenfield International School</p><p className="text-xs text-text-2">North Campus, Kaveripuram · Fictional institution</p><p className="mt-1 text-sm font-semibold">{mode === "marksheet" ? sheet.examLabel : "Academic transcript"} · AY {ACADEMIC_YEARS.find((a) => a.id === sheet.academicYearId)?.label}</p></div>
            <dl className="my-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><div><dt className="text-xs text-text-2">Student</dt><dd className="font-semibold">{st.displayName}</dd></div><div><dt className="text-xs text-text-2">Student ID</dt><dd className="tnum">{st.id.toUpperCase()}</dd></div><div><dt className="text-xs text-text-2">Class</dt><dd>{sheet.classLabel}</dd></div><div><dt className="text-xs text-text-2">Status</dt><dd><Badge tone={sheet.publicationStatus === "published" ? "success" : "warning"}>{sheet.publicationStatus}</Badge></dd></div></dl>
            {(mode === "marksheet" ? [sheet] : published.length ? published : [sheet]).map((m) => (
              <div key={m.id} className="mb-4">
                {mode === "transcript" && <p className="mb-1 text-sm font-semibold">{m.examLabel} · {m.result}</p>}
                <table className="w-full text-left text-sm"><thead className="text-xs text-text-2"><tr><th className="py-1">Subject</th><th>Internal</th><th>External</th><th>Total</th><th>Grade</th><th>Status</th></tr></thead><tbody>{m.subjects.map((s) => <tr key={s.subjectId} className="border-t border-border"><td className="py-1">{s.subjectName}</td><td className="tnum">{s.internal}</td><td className="tnum">{s.external}</td><td className="tnum">{s.total}/{s.maxMarks}</td><td className="font-semibold">{s.grade}</td><td className="capitalize">{s.status}</td></tr>)}</tbody></table>
                <p className="tnum mt-2 text-sm font-semibold">Total {m.totalObtained}/{m.totalMax} · {m.percentage}% · GPA {m.gpa ?? "–"} · {m.result}</p>
                {m.correctionNote && <p className="text-xs text-warning">Version {m.version}. {m.correctionNote}</p>}
              </div>))}
            <div className="flex flex-wrap items-end justify-between gap-2 border-t border-border pt-3 text-xs text-text-2"><span>Reference {sheet.reference}-V{sheet.version} · Verification: QR / registrar link placeholder (not functional)</span><span>{sheet.publishedAt ? `Published ${fmtDate(sheet.publishedAt)}` : "Not published"}</span></div>
            <p className="mt-1 text-[11px] text-text-2">Fictional demo document. Not a valid certificate or transcript.</p>
          </div>
        </CardBody></Card>
      )}
    </div>
  );
}
