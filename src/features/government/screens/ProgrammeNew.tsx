"use client";
import * as React from "react";
import type { ScreenProps } from "@/types/screens";
import { PageHeader } from "@/components/ui";
import { ProgrammeWizard } from "../components/ProgrammeWizard";
import { DemoBanner } from "../components/shared";

export default function ProgrammeNew({ searchParams }: ScreenProps) {
  const pre = searchParams.objectives ? searchParams.objectives.split(",") : undefined;
  return (
    <div>
      <PageHeader title={searchParams.edit ? "Continue programme draft" : "Create learning programme"} subtitle="Ten-step workflow with draft saving. AI suggests; authorised officials and academic experts approve." />
      <DemoBanner />
      <ProgrammeWizard editId={searchParams.edit} prefillObjectives={pre} />
    </div>
  );
}
