"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface ConsentShare { id: string; to: string; scope: string; status: "awaiting-acceptance" | "accepted" | "revoked"; at: string }
export interface Prefs {
  uiLanguage: string; contentLanguage: string; tutorStyle: string; notif: Record<string, boolean>; captionsDefault: boolean;
  defaultVisibility: "private" | "guardian" | "teachers" | "institution"; reducedMotionNote: boolean;
  membership: "active" | "alumni"; shares: ConsentShare[];
}
export const DEFAULT_PREFS: Prefs = {
  uiLanguage: "English", contentLanguage: "English", tutorStyle: "Step-by-step hints", notif: { academic: true, events: true, community: true, learning: true, live: true, fees: false },
  captionsDefault: true, defaultVisibility: "private", reducedMotionNote: true, membership: "active", shares: [],
};
interface S { prefs: Prefs; set: (p: Partial<Prefs>) => void; reset: () => void; addShare: (to: string, scope: string) => void; setShare: (id: string, status: ConsentShare["status"]) => void }
/** Personal preferences only (editable). Institution academic records are never stored or edited here. */
export const useSettings = create<S>()(persist((set) => ({
  prefs: DEFAULT_PREFS,
  set: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
  reset: () => set({ prefs: DEFAULT_PREFS }),
  addShare: (to, scope) => set((s) => ({ prefs: { ...s.prefs, shares: [{ id: Math.random().toString(36).slice(2, 8), to, scope, status: "awaiting-acceptance", at: new Date().toISOString() }, ...s.prefs.shares] } })),
  setShare: (id, status) => set((s) => ({ prefs: { ...s.prefs, shares: s.prefs.shares.map((x) => (x.id === id ? { ...x, status } : x)) } })),
}), { name: "zc3-student-settings", storage: createJSONStorage(() => localStorage), skipHydration: false }));
