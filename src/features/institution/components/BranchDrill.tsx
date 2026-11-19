"use client";
import * as React from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { Button, Badge, SectionHeader } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { institutionService } from "@/lib/api/institutionService";
import { SUBJECTS } from "@/lib/mock-data/core";
import { useCtx, useQ, Q, DataTable, SevBadge, Meter, DemoNote } from "../kit";

/** branch -> class -> subject / learning-objective gaps. Reused by overview, workspace and analytics. */
export function BranchDrill({ branchId, branchName, onIntervene }: { branchId: string; branchName: string; onIntervene?: (ctx: { branchId: string; branchName: string; classId?: string; className?: string; gap?: string }) => void }) {
  const { ctx } = useCtx();
  const [cls, setCls] = React.useState<{ id: string; name: string } | null>(null);
  const bctx = { ...ctx, branch: branchId };
  const classes = useQ(["drill-classes", bctx.inst, branchId, ctx.year, ctx.declining], () => institutionService.classes(bctx));
  const subjects = useQ(["drill-subjects", branchId], () => institutionService.subjects(branchId));
  const gaps = useQ(["drill-gaps", branchId, cls?.id ?? "", ctx.year], () => institutionService.gaps(branchId, cls?.id));
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm">
        {cls && <Button size="sm" variant="ghost" onClick={() => setCls(null)}><ArrowLeft size={14} /> Branch</Button>}
        <Badge tone="primary">{branchName}</Badge>{cls && <Badge tone="info">{cls.name}</Badge>}
      </div>
      {!cls && <>
        <section aria-label="Classes"><SectionHeader title="Classes" subtitle="Select a class to see its objective gaps." />
          <Q q={classes}>{(rows) => <DataTable ariaLabel={`Classes in ${branchName}`} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setCls({ id: r.id, name: r.name })} pageSize={6} cols={[
            { key: "n", header: "Class", cell: (r) => <span className="font-semibold">{r.name}</span>, sort: (a, b) => a.name.localeCompare(b.name) },
            { key: "s", header: "Avg score", cell: (r) => <SevBadge v={r.score} />, sort: (a, b) => a.score - b.score },
            { key: "e", header: "Engagement", cell: (r) => <SevBadge v={r.engagement} />, sort: (a, b) => a.engagement - b.engagement },
            { key: "u", header: "Need support", cell: (r) => r.support, align: "right", sort: (a, b) => a.support - b.support },
          ]} />}</Q>
        </section>
        <section aria-label="Subjects"><SectionHeader title="Subject performance" subtitle="Average score by subject (demo data)." />
          <Q q={subjects} rows={1}>{(s) => <BarChart horizontal ariaLabel={`Subject scores in ${branchName}`} unit="%" max={100} data={Object.entries(s).map(([id, v]) => ({ label: SUBJECTS.find((x) => x.id === id)?.name ?? id, value: v, color: v < 62 ? "#C0262D" : undefined }))} />}</Q>
        </section>
      </>}
      <section aria-label="Learning objective gaps"><SectionHeader title={cls ? `Objective gaps · ${cls.name}` : "Learning-objective gaps"} subtitle="Lowest mastery first. Mastery is an estimate from assessments and activity." />
        <Q q={gaps}>{(g) => <ul className="space-y-3">{g.slice(0, cls ? 6 : 5).map((x) => <li key={x.objectiveId}><Meter label={`${x.label} · ${x.subject} · ~${x.students} students`} value={x.mastery} tone={x.mastery < 50 ? "danger" : x.mastery < 65 ? "warning" : "success"} /></li>)}</ul>}</Q>
        <DemoNote tone="info">Mastery figures are demo estimates. Low scores can have many causes — treat gaps as prompts for review, not conclusions.</DemoNote>
      </section>
      {onIntervene && <Button onClick={() => onIntervene({ branchId, branchName, classId: cls?.id, className: cls?.name, gap: gaps.data?.[0]?.label })}>Review intervention for {cls?.name ?? branchName}</Button>}
    </div>
  );
}
