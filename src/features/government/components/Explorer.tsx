"use client";
import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge, Button, Modal, Field, Textarea, Segmented, Select, toast, cn, Skeleton, EmptyState } from "@/components/ui";
import { Warning, ArrowRight } from "@phosphor-icons/react";
import type { District, MetricKey } from "@/types/government";
import { governmentService, METRICS } from "@/lib/api/governmentService";
import { Crumbs, StudentGate, errMsg, G, Async, toneFor, Src } from "./shared";
import { SRC } from "@/lib/mock-data/government";
import { fmtCompact } from "@/lib/format";

const RANGE: Record<MetricKey, [number, number]> = { baselineCoverage: [35, 95], mathsProficiency: [45, 80], engagement: [42, 80], improvement: [2, 12] };
const shade = (m: MetricKey, v: number) => { const [lo, hi] = RANGE[m]; return Math.round(14 + Math.max(0, Math.min(1, (v - lo) / (hi - lo))) * 76); };

/** Stylised tile cartogram of 12 fictional districts. Clickable; an accessible list alternative is one toggle away. */
export function DistrictMap({ districts, metric, selected, onSelect, view }: { districts: District[]; metric: MetricKey; selected?: string; onSelect: (id: string) => void; view?: "map" | "list" }) {
  const meta = METRICS.find((m) => m.key === metric)!;
  const W = 118, H = 92;
  if (view === "list")
    return (
      <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Districts by {meta.label}</caption>
        <thead><tr className="text-left text-xs text-text-2"><th className="py-2 pr-2">District</th><th className="pr-2">Region</th><th className="pr-2 text-right">{meta.label}</th><th className="text-right">Data</th></tr></thead>
        <tbody>{[...districts].sort((a, b) => meta.get(a) - meta.get(b)).map((d) => (
          <tr key={d.id} className={cn("border-t border-border", selected === d.id && "bg-lilac/60")}>
            <td className="py-2 pr-2"><button className="min-h-9 text-left font-semibold text-primary hover:underline" onClick={() => onSelect(d.id)}>{d.name}</button></td><td className="pr-2 text-text-2">{d.region}</td>
            <td className="tnum pr-2 text-right font-semibold">{meta.get(d)}{meta.unit}</td><td className="text-right"><Badge tone={d.dataStatus === "partial" ? "warning" : "success"}>{d.dataStatus === "partial" ? "Partial data" : "Complete"}</Badge></td>
          </tr>))}</tbody></table></div>
    );
  return (
    <div>
      <svg viewBox={`0 0 ${W * 4 + 60} ${H * 3 + 8}`} className="w-full" role="group" aria-label={`District tile map coloured by ${meta.label}. Use the list view for a text alternative.`}>
        {districts.map((d) => {
          const v = meta.get(d), s = shade(metric, v), x = d.col * W + (d.row % 2 ? 30 : 0), y = d.row * H, flagged = d.baselineCoverage < 45;
          return (
            <g key={d.id} role="button" tabIndex={0} aria-label={`${d.name}: ${meta.label} ${v}${meta.unit}${d.dataStatus === "partial" ? ", partial data" : ""}${flagged ? ", low baseline coverage" : ""}`} aria-pressed={selected === d.id}
              onClick={() => onSelect(d.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(d.id); } }} className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[var(--primary)] [&:focus-visible>rect]:stroke-[3]">
              <rect x={x + 3} y={y + 3} width={W - 8} height={H - 8} rx={16} fill={`color-mix(in srgb, var(--primary) ${s}%, var(--surface))`} stroke={selected === d.id ? "var(--text)" : flagged ? "var(--danger)" : "var(--border)"} strokeWidth={selected === d.id || flagged ? 3 : 1} strokeDasharray={d.dataStatus === "partial" ? "5 4" : undefined} />
              <text x={x + W / 2 - 1} y={y + 38} textAnchor="middle" fontSize="12.5" fontWeight="700" fill={s > 55 ? "#fff" : "var(--text)"}>{d.name.length > 14 ? d.name.split(" ")[0] : d.name}</text>
              {d.name.length > 14 && <text x={x + W / 2 - 1} y={y + 52} textAnchor="middle" fontSize="11" fontWeight="600" fill={s > 55 ? "#fff" : "var(--text)"}>{d.name.split(" ").slice(1).join(" ")}</text>}
              <text x={x + W / 2 - 1} y={y + (d.name.length > 14 ? 72 : 62)} textAnchor="middle" fontSize="15" fontWeight="800" fill={s > 55 ? "#fff" : "var(--text)"} className="tnum">{v}{meta.unit.trim() === "pts" ? "" : meta.unit}</text>
              {flagged && <text x={x + W - 14} y={y + 22} fontSize="14" fill={s > 55 ? "#fff" : "var(--danger)"} aria-hidden>!</text>}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-2">
        <span className="flex items-center gap-1.5">Low<span className="h-2.5 w-24 rounded-full" style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--primary) 14%, var(--surface)), var(--primary))" }} />High</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-4 rounded border border-dashed border-text-2" />Dashed = partial data</span>
        <span className="flex items-center gap-1"><Warning size={12} className="text-danger" />Red outline / "!" = coverage below 45%</span>
      </div>
    </div>
  );
}

export function DistrictSummary({ d, metricKey }: { d: District; metricKey?: MetricKey }) {
  const rows: [string, string][] = [["Students (demo scale)", fmtCompact(d.students)], ["Institutions", d.institutions.toLocaleString("en-IN")], ["Baseline coverage", `${d.baselineCoverage}%`], ["Maths: baseline → follow-up", `${d.mathsBaseline}% → ${d.mathsFollowUp}%`], ["Engagement (30d)", `${d.engagement}% (was ${d.engagementPrev}%)`], ["Follow-up", d.followUp.replace("-", " ")]];
  return (
    <div className="rounded-2xl bg-surface-2 p-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{d.name} <span className="text-xs font-normal text-text-2">· {d.region}</span></h3>{d.dataStatus === "partial" && <Badge tone="warning">Partial data ({d.completeness}% complete)</Badge>}</div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">{rows.map(([k, v]) => <div key={k}><dt className="text-xs text-text-2">{k}</dt><dd className="tnum font-semibold">{v}</dd></div>)}</dl>
      <Button asChild size="sm" className="mt-3"><Link href={G(`districts/${d.id}`)}>Open district <ArrowRight size={14} /></Link></Button>
      <Src text={`${SRC.baseline}${metricKey ? "" : ""}`} />
    </div>
  );
}

export function RequestAccessModal({ open, onOpenChange, scope }: { open: boolean; onOpenChange: (v: boolean) => void; scope: string }) {
  const [purpose, setPurpose] = React.useState(""); const [err, setErr] = React.useState("");
  const m = useMutation({ mutationFn: () => governmentService.requestStudentAccess(scope, purpose), onSuccess: () => { toast.success("Access request sent", "The institution will see it. Nothing is unlocked until it grants access."); onOpenChange(false); setPurpose(""); }, onError: (e) => setErr(errMsg(e)) });
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Request scoped student-level access" description={`Scope: ${scope}`} footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button loading={m.isPending} onClick={() => { setErr(""); m.mutate(); }}>Send request</Button></>}>
      <Field label="Purpose" required error={err} htmlFor="acc-purpose" hint="Stated purpose is shown to the institution and logged."><Textarea id="acc-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="For example: verify remedial participation of Grade 8 students flagged in the fractions gap analysis." aria-invalid={!!err} /></Field>
    </Modal>
  );
}

/** Breadcrumb drill-down: State > District > Institution > Grade/class > Subject/objective > student (only if authorised). */
export function DrillDown({ districts, initialDistrict, low }: { districts: District[]; initialDistrict?: string; low: boolean }) {
  const [path, setPath] = React.useState<{ d?: string; i?: string; c?: string; o?: string }>({ d: initialDistrict });
  const [ask, setAsk] = React.useState(false);
  const d = districts.find((x) => x.id === path.d);
  const insts = useQuery({ queryKey: ["gov", "institutions", path.d], queryFn: () => governmentService.institutions(path.d!), enabled: !!path.d && !path.i });
  const inst = useQuery({ queryKey: ["gov", "institution", path.i], queryFn: () => governmentService.institution(path.i!), enabled: !!path.i });
  const classes = useQuery({ queryKey: ["gov", "classes", path.i], queryFn: () => governmentService.classes(path.i!), enabled: !!path.i && !path.c });
  const klass = (classes.data ?? []).find((c) => c.id === path.c);
  const objs = useQuery({ queryKey: ["gov", "objectives", path.c], queryFn: () => governmentService.objectives(path.c!, klass?.proficiency ?? 55), enabled: !!path.c && !!classes.data });
  const obj = objs.data?.find((o) => o.id === path.o);
  const crumbs = [
    { label: "Karuvana State", onClick: () => setPath({}) },
    ...(d ? [{ label: d.name, onClick: () => setPath({ d: d.id }) }] : []),
    ...(path.i ? [{ label: inst.data?.name ?? "Institution", onClick: () => setPath({ d: path.d, i: path.i }) }] : []),
    ...(path.c ? [{ label: klass?.name ?? "Class", onClick: () => setPath({ d: path.d, i: path.i, c: path.c }) }] : []),
    ...(path.o ? [{ label: obj?.code ?? "Objective", onClick: () => setPath({ ...path }) }] : []),
  ];
  if (path.o) crumbs.push({ label: "Students", onClick: () => undefined });
  const th = "py-2 pr-3 text-left text-xs font-semibold text-text-2";
  const Row = ({ onClick, label, sub, vals, tone }: { onClick: () => void; label: string; sub?: string; vals: React.ReactNode[]; tone?: "success" | "warning" | "danger" }) => (
    <tr className="border-t border-border"><td className="py-2 pr-3"><button className="min-h-9 text-left font-semibold text-primary hover:underline" onClick={onClick}>{label}</button>{sub && <div className="text-xs text-text-2">{sub}</div>}</td>{vals.map((v, i) => <td key={i} className="tnum pr-3 text-right">{v}</td>)}<td className="text-right">{tone && <Badge tone={tone}>{tone === "success" ? "On track" : tone === "warning" ? "Watch" : "Gap"}</Badge>}</td></tr>
  );
  const Table = ({ heads, children }: { heads: string[]; children: React.ReactNode }) => <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className={th}>{heads[0]}</th>{heads.slice(1).map((h) => <th key={h} className={cn(th, "text-right")}>{h}</th>)}<th className={cn(th, "text-right")}>Status</th></tr></thead><tbody>{children}</tbody></table></div>;
  return (
    <div>
      <Crumbs items={crumbs} />
      {!path.d && <Table heads={["District", "Students (demo)", "Baseline coverage", "Maths follow-up"]}>{districts.map((x) => <Row key={x.id} onClick={() => setPath({ d: x.id })} label={x.name} sub={x.dataStatus === "partial" ? "Partial data" : undefined} vals={[fmtCompact(x.students), `${x.baselineCoverage}%`, `${x.mathsFollowUp}%`]} tone={toneFor(x.baselineCoverage, 75, 60)} />)}</Table>}
      {path.d && !path.i && <Async q={insts} skeleton={<Skeleton className="h-40 w-full" />}>{(list) => <Table heads={["Institution", "Students", "Baseline coverage", "Maths proficiency"]}>{list.map((x) => <Row key={x.id} onClick={() => setPath({ d: path.d, i: x.id })} label={x.name} sub={`${x.branches.length} branch${x.branches.length > 1 ? "es" : ""}${x.dataStatus === "partial" ? " · partial data" : ""}`} vals={[x.students.toLocaleString("en-IN"), `${x.baselineCoverage}%`, `${x.mathsProficiency}%`]} tone={toneFor(x.baselineCoverage, 80, 60)} />)}</Table>}</Async>}
      {path.i && !path.c && <Async q={classes} skeleton={<Skeleton className="h-40 w-full" />}>{(list) => (
        <>{inst.data && <p className="mb-2 text-xs text-text-2">Branches: {inst.data.branches.map((b) => `${b.name} (${b.students.toLocaleString("en-IN")})`).join(" · ")}</p>}
          <Table heads={["Grade · section", "Students", "Baseline coverage", "Proficiency"]}>{list.map((x) => <Row key={x.id} onClick={() => setPath({ d: path.d, i: path.i, c: x.id })} label={x.name} vals={[x.students, `${x.baselineCoverage}%`, `${x.proficiency}%`]} tone={toneFor(x.proficiency, 62, 48)} />)}</Table></>)}</Async>}
      {path.c && !path.o && <Async q={objs} skeleton={<Skeleton className="h-40 w-full" />}>{(list) => <Table heads={["Objective", "Baseline mastery", "Current mastery"]}>{list.map((x) => <Row key={x.id} onClick={() => setPath({ ...path, o: x.id })} label={`${x.code} ${x.title}`} sub={x.subject} vals={[`${x.baselineMastery}%`, `${x.mastery}%`]} tone={toneFor(x.mastery, 62, 45)} />)}</Table>}</Async>}
      {path.o && <StudentGate scope={`${klass?.name ?? "class"} · ${obj?.code ?? "objective"}`} onRequest={() => setAsk(true)} />}
      {!path.d && low && <p className="mt-3 flex items-center gap-1.5 text-xs text-danger"><Warning size={14} />Scenario: Nilgiri Hills has 41% baseline coverage. Open it to see which institutions are behind.</p>}
      {path.d && !path.i && <Src text={SRC.baseline} />}
      <RequestAccessModal open={ask} onOpenChange={setAsk} scope={`${d?.name ?? "State"} / ${klass?.name ?? ""} / ${obj?.code ?? ""}`} />
    </div>
  );
}

/** Two-district or two-period comparison. */
export function CompareMode({ districts }: { districts: District[] }) {
  const [mode, setMode] = React.useState<"districts" | "periods">("districts");
  const [a, setA] = React.useState("kaveri-delta"); const [b, setB] = React.useState("nilgiri-hills");
  const [p1, setP1] = React.useState("baseline"); const [p2, setP2] = React.useState("follow1");
  const A = districts.find((d) => d.id === a)!, B = districts.find((d) => d.id === b)!;
  const same = a === b || p1 === p2;
  const period = (d: District, p: string) => ({ baseline: { cov: d.baselineCoverage, maths: d.mathsBaseline, eng: d.engagementPrev }, follow1: { cov: Math.min(100, d.baselineCoverage + 4), maths: d.mathsFollowUp, eng: d.engagement } }[p as "baseline"]);
  const rows: { label: string; x: number; y: number; unit: string }[] = mode === "districts"
    ? [{ label: "Baseline coverage", x: A.baselineCoverage, y: B.baselineCoverage, unit: "%" }, { label: "Maths baseline", x: A.mathsBaseline, y: B.mathsBaseline, unit: "%" }, { label: "Maths follow-up 1", x: A.mathsFollowUp, y: B.mathsFollowUp, unit: "%" }, { label: "Engagement", x: A.engagement, y: B.engagement, unit: "%" }, { label: "Improvement", x: A.improvement, y: B.improvement, unit: " pts" }]
    : [{ label: "Baseline coverage", x: period(A, p1).cov, y: period(A, p2).cov, unit: "%" }, { label: "Maths proficiency", x: period(A, p1).maths, y: period(A, p2).maths, unit: "%" }, { label: "Engagement", x: period(A, p1).eng, y: period(A, p2).eng, unit: "%" }];
  const pl = (p: string) => (p === "baseline" ? "Baseline (Aug 2026)" : "Follow-up 1 (Nov 2026)");
  const head = mode === "districts" ? [A.name, B.name] : [pl(p1), pl(p2)];
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented<"districts" | "periods"> label="Compare" value={mode} onChange={setMode} options={[{ value: "districts", label: "Two districts" }, { value: "periods", label: "Two periods" }]} />
        {mode === "districts" ? <>
          <Select aria-label="First district" className="w-auto" value={a} onChange={(e) => setA(e.target.value)}>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
          <span className="text-sm text-text-2">vs</span>
          <Select aria-label="Second district" className="w-auto" value={b} onChange={(e) => setB(e.target.value)}>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></> : <>
          <Select aria-label="District" className="w-auto" value={a} onChange={(e) => setA(e.target.value)}>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
          <Select aria-label="First period" className="w-auto" value={p1} onChange={(e) => setP1(e.target.value)}><option value="baseline">Baseline (Aug 2026)</option><option value="follow1">Follow-up 1 (Nov 2026)</option></Select>
          <span className="text-sm text-text-2">vs</span>
          <Select aria-label="Second period" className="w-auto" value={p2} onChange={(e) => setP2(e.target.value)}><option value="baseline">Baseline (Aug 2026)</option><option value="follow1">Follow-up 1 (Nov 2026)</option></Select></>}
      </div>
      {same ? <EmptyState title="Choose two different options" body={mode === "districts" ? "Pick two different districts to compare." : "Pick two different periods. The baseline is never overwritten, so it is always available as a reference."} /> : (
        <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Comparison</caption><thead><tr className="text-xs text-text-2"><th className="py-2 text-left">Metric</th><th className="text-right">{head[0]}</th><th className="text-right">{head[1]}</th><th className="text-right">Difference</th></tr></thead>
          <tbody>{rows.map((r) => { const diff = r.y - r.x; return <tr key={r.label} className="border-t border-border"><td className="py-2 font-medium">{r.label}</td><td className="tnum text-right">{r.x}{r.unit}</td><td className="tnum text-right">{r.y}{r.unit}</td><td className={cn("tnum text-right font-semibold", diff > 0 ? "text-success" : diff < 0 ? "text-danger" : "")}>{diff > 0 ? "▲ +" : diff < 0 ? "▼ " : ""}{diff}{r.unit}</td></tr>; })}</tbody></table></div>)}
      <Src text={`${SRC.followUp}. Differences are descriptive, not causal.`} />
    </div>
  );
}
