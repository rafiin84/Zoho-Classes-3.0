"use client";
import { create } from "zustand";
import { uid } from "@/lib/utils";
import type { AudienceType } from "@/types";

export interface TalentDraft { id: string; text: string; category: string; audience: AudienceType; savedAt: string }
interface S { drafts: TalentDraft[]; save: (d: Omit<TalentDraft, "id" | "savedAt">, id?: string) => void; remove: (id: string) => void }
/** Local (per-session) drafts for Talent Corner — drafts are never visible to anyone else. */
export const useTalentDrafts = create<S>((set) => ({
  drafts: [],
  save: (d, id) => set((s) => ({ drafts: [{ ...d, id: id ?? uid("draft"), savedAt: new Date().toISOString() }, ...s.drafts.filter((x) => x.id !== id)] })),
  remove: (id) => set((s) => ({ drafts: s.drafts.filter((x) => x.id !== id) })),
}));
