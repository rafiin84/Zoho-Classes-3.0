"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardBody, Field, Input, Select, Badge, StatusBadge, SectionHeader, Skeleton, ErrorState, toast, Switch, EmptyState } from "@/components/ui";
import { obeService } from "@/lib/api/obeService";
import type { AttainmentConfig, AssessmentCategory } from "@/types/obe";
import { LevelBadge } from "./shared";

const CATS: AssessmentCategory[] = ["internal", "external", "assignment", "practical"];

export default function Attainment({ courseIds, canEdit, by }: { courseIds: string[]; canEdit: boolean; by: string }) {
  const qc = useQueryClient();
  const cq = useQuery({ queryKey: ["obe", "config"], queryFn: obeService.config });
  const [cfg, setCfg] = React.useState<AttainmentConfig | null>(null);
  React.useEffect(() => { if (cq.data && !cfg) setCfg(cq.data); }, [cq.data, cfg]);
  const cov = useQuery({ queryKey: ["obe", "cov", cfg], queryFn: () => obeService.preview(cfg!), enabled: !!cfg });
  const save = useMutation({ mutationFn: () => obeService.saveConfig(cfg!), onSuccess: () => { toast.success("Method saved."); qc.invalidateQueries({ queryKey: ["obe"] }); }, onError: (e: Error) => toast.error(e.message) });
  const calc = useMutation({ mutationFn: async () => { await obeService.saveConfig(cfg!); return obeService.calculate(by, "Semester 3, 5, 7 (all)"); }, onSuccess: () => { toast.success("Mock attainment calculated as a draft run."); qc.invalidateQueries({ queryKey: ["obe"] }); }, onError: (e: Error) => toast.error(e.message) });
  if (cq.isLoading || !cfg) return <Skeleton className="h-64" />;
  if (cq.isError) return <ErrorState onRetry={() => cq.refetch()} />;
  const wsum = Math.round(Object.values(cfg.weights).reduce((a, b) => a + b, 0) * 100);
  const lv = cfg.method === "threshold" ? cfg.levels : cfg.meanLevels;
  const setLv = (k: "l1" | "l2" | "l3", v: number) => setCfg({ ...cfg, [cfg.method === "threshold" ? "levels" : "meanLevels"]: { ...lv, [k]: v } } as AttainmentConfig);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardBody className="space-y-3">
        <SectionHeader title="Attainment method" subtitle="No single formula is assumed. Pick and tune the method your accreditation body expects." />
        <Field label="Method" htmlFor="am"><Select id="am" disabled={!canEdit} value={cfg.method} onChange={(e) => setCfg({ ...cfg, method: e.target.value as AttainmentConfig["method"] })}>
          <option value="threshold">Threshold: percent of students at or above target score</option><option value="mean">Mean score: cohort mean percentage</option></Select></Field>
        <p className="rounded-lg bg-surface-2 p-2 text-xs text-text-2">{cfg.method === "threshold" ? `A student attains a CO when scoring at least ${cfg.targetScorePct}%. Level is set by the share of students who attain it.` : "Level is set by the cohort mean percentage on the CO's mapped items."}</p>
        {cfg.method === "threshold" && <Field label="Target score per student (%)" htmlFor="ts"><Input id="ts" type="number" disabled={!canEdit} value={cfg.targetScorePct} onChange={(e) => setCfg({ ...cfg, targetScorePct: Number(e.target.value) })} /></Field>}
        <div className="grid grid-cols-3 gap-2">{(["l3", "l2", "l1"] as const).map((k) => <Field key={k} label={`Level ${k[1]} at ≥ (%)`} htmlFor={`lv-${k}`}><Input id={`lv-${k}`} type="number" disabled={!canEdit} value={lv[k]} onChange={(e) => setLv(k, Number(e.target.value))} /></Field>)}</div>
        <Field label="Target attainment level (0–3)" htmlFor="tl"><Input id="tl" type="number" step="0.1" disabled={!canEdit} value={cfg.targetLevel} onChange={(e) => setCfg({ ...cfg, targetLevel: Number(e.target.value) })} /></Field>
        <p className="text-sm font-semibold">Assessment weightage <span className={wsum === 100 ? "text-success" : "text-danger"}>({wsum}%)</span></p>
        <div className="grid grid-cols-2 gap-2">{CATS.map((c) => <Field key={c} label={`${c[0].toUpperCase()}${c.slice(1)} (%)`} htmlFor={`w-${c}`}><Input id={`w-${c}`} type="number" disabled={!canEdit} value={Math.round(cfg.weights[c] * 100)} onChange={(e) => setCfg({ ...cfg, weights: { ...cfg.weights, [c]: Number(e.target.value) / 100 } })} /></Field>)}</div>
        {wsum !== 100 && <p role="alert" className="text-xs font-medium text-danger">Weightages must total 100%.</p>}
        {canEdit && <div className="flex gap-2"><Button variant="outline" onClick={() => save.mutate()} loading={save.isPending}>Save method</Button><Button onClick={() => calc.mutate()} loading={calc.isPending}>Calculate mock attainment</Button></div>}
      </CardBody></Card>
      <Card><CardBody>
        <SectionHeader title="Data coverage" subtitle="Missing evidence is excluded from the weighted result and flagged." />
        {cov.isLoading ? <Skeleton className="h-32" /> : (
          <ul className="space-y-2 text-sm">{cov.data?.filter((c) => courseIds.includes(c.courseId)).map((c) => (
            <li key={c.courseId} className="rounded-lg border border-border p-2"><div className="flex items-center justify-between"><span className="font-semibold">{c.code}</span><Badge tone={c.complete ? "success" : "warning"}>{c.complete ? "Complete" : `${c.missing.length} gap${c.missing.length > 1 ? "s" : ""}`}</Badge></div>
              {c.missing.map((m) => <p key={m} className="text-xs text-text-2">{m}</p>)}</li>))}</ul>
        )}
      </CardBody></Card>
    </div>
  );
}
