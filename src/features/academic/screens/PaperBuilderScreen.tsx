"use client";
import * as React from "react";
import type { ScreenProps } from "@/types/screens";
import { PaperBuilder } from "../questions/PaperBuilder";

/** Standalone builder. Opens a new paper, or an existing one via ?id=… or a `:id` route param. */
export default function PaperBuilderScreen({ role, params, searchParams }: ScreenProps) {
  const [id, setId] = React.useState<string | undefined>(params.id ?? searchParams.id);
  return <PaperBuilder paperId={id && id !== "new" ? id : undefined} role={role} onClose={() => { if (typeof window !== "undefined") window.history.back(); }} onOpen={setId} />;
}
