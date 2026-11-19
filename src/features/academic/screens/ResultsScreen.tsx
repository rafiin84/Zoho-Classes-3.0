"use client";
import * as React from "react";
import type { ScreenProps } from "@/types/screens";
import { PageHeader, Segmented, DemoTag } from "@/components/ui";
import { useActors } from "@/stores/app-store";
import Processing from "../results/Processing";
import Scheme from "../results/Scheme";
import Reval from "../results/Reval";
import Preview from "../results/Preview";

type Tab = "process" | "scheme" | "reval" | "preview";
export default function ResultsScreen({ role }: ScreenProps) {
  const { teacherId } = useActors();
  const inst = role === "institution";
  const [tab, setTab] = React.useState<Tab>("process");
  return (
    <div>
      <PageHeader title="Results & Marksheets" eyebrow={<DemoTag />} subtitle={inst ? "Exam office: process, approve and publish results. Students and parents see only published marksheets." : "Enter marks for your classes and track approval. Publishing is controlled by the exam office."} />
      <Segmented<Tab> label="Results sections" className="mb-4" value={tab} onChange={setTab} options={[{ value: "process", label: "Result processing" }, { value: "scheme", label: "Grading scheme" }, { value: "reval", label: "Revaluation & corrections" }, { value: "preview", label: "Marksheet & transcript" }]} />
      {tab === "process" && <Processing canApprove={inst} by={inst ? "Exam controller" : teacherId} />}
      {tab === "scheme" && <Scheme canEdit={inst} />}
      {tab === "reval" && <Reval canDecide={inst} />}
      {tab === "preview" && <Preview />}
    </div>
  );
}
