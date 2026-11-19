"use client";
import * as React from "react";
import type { ScreenProps } from "@/types/screens";
import { PageHeader, Segmented, DemoTag } from "@/components/ui";
import { useActors } from "@/stores/app-store";
import { OBE_COURSES, OBE_PROGRAMME } from "@/lib/mock-data/obe";
import Outcomes from "../obe/Outcomes";
import Matrix from "../obe/Matrix";
import Evidence from "../obe/Evidence";
import Attainment from "../obe/Attainment";
import Reports from "../obe/Reports";
import { DemoBanner } from "../obe/shared";

type Tab = "outcomes" | "matrix" | "evidence" | "attainment" | "reports";
export default function ObeScreen({ role }: ScreenProps) {
  const { teacherId } = useActors();
  const inst = role === "institution";
  const courseIds = inst ? OBE_COURSES.map((c) => c.id) : OBE_COURSES.filter((c) => c.facultyId === teacherId).map((c) => c.id);
  const [tab, setTab] = React.useState<Tab>("outcomes");
  const by = inst ? "OBE committee" : teacherId;
  return (
    <div>
      <PageHeader title="Outcome-Based Education" eyebrow={<DemoTag label="Fictional data" />} subtitle={`${OBE_PROGRAMME.name} · ${OBE_PROGRAMME.institution} · AY ${OBE_PROGRAMME.academicYear}${inst ? "" : " · your courses, view only for mappings and reports"}`} />
      <DemoBanner />
      {!courseIds.length ? <p className="rounded-xl border border-dashed border-border p-6 text-sm text-text-2">No OBE courses are assigned to you in this demo programme. Switch to Dr. Leela Krishnan or the institution role to explore.</p> : <>
        <Segmented<Tab> label="OBE sections" className="mb-4" value={tab} onChange={setTab} options={[{ value: "outcomes", label: "Outcomes" }, { value: "matrix", label: "CO-PO mapping" }, { value: "evidence", label: "Evidence" }, { value: "attainment", label: "Attainment" }, { value: "reports", label: "Reports" }]} />
        {tab === "outcomes" && <Outcomes courseIds={courseIds} canEdit={inst} />}
        {tab === "matrix" && <Matrix courseIds={courseIds} canEdit={inst} by={by} />}
        {tab === "evidence" && <Evidence courseIds={courseIds} canEdit={inst} />}
        {tab === "attainment" && <Attainment courseIds={courseIds} canEdit={inst} by={by} />}
        {tab === "reports" && <Reports courseIds={courseIds} canApprove={inst} />}
      </>}
    </div>
  );
}
