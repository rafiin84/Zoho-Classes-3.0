"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Role } from "@/types";
import { SCENARIOS, scenarioById } from "@/config/scenarios";

export type Theme = "light" | "dark" | "system";
interface AppState {
  role: Role;
  scenarioId: string;
  theme: Theme;
  highContrast: boolean;
  largeText: boolean;
  lastRoute: Partial<Record<Role, string>>;
  onboarded: Partial<Record<Role, boolean>>;
  childId: string; // parent's selected child
  institutionContext: string;
  branchContext: string;
  academicYear: string;
  classContext: string;
  unsavedWork: boolean;
  offlineBanner: boolean;
  panels: { notifications: boolean; search: boolean; more: boolean; scenarios: boolean; tutor: boolean };
  setRole: (r: Role) => void;
  setScenario: (id: string) => void;
  setTheme: (t: Theme) => void;
  setPref: (k: "highContrast" | "largeText", v: boolean) => void;
  setLastRoute: (r: Role, path: string) => void;
  completeOnboarding: (r: Role, done?: boolean) => void;
  setChild: (id: string) => void;
  setContext: (p: Partial<Pick<AppState, "institutionContext" | "branchContext" | "academicYear" | "classContext">>) => void;
  setUnsaved: (v: boolean) => void;
  setOffline: (v: boolean) => void;
  openPanel: (k: keyof AppState["panels"], v?: boolean) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      role: "student",
      scenarioId: "student-thriving",
      theme: "light",
      highContrast: false,
      largeText: false,
      lastRoute: {},
      onboarded: {},
      childId: "stu-ananya",
      institutionContext: "inst-greenfield",
      branchContext: "all",
      academicYear: "ay-2026-27",
      classContext: "cls-8b",
      unsavedWork: false,
      offlineBanner: false,
      panels: { notifications: false, search: false, more: false, scenarios: false, tutor: false },
      setRole: (role) => set({ role }),
      setScenario: (id) => {
        const s = scenarioById(id);
        set({ scenarioId: s.id, role: s.role, childId: s.childId });
      },
      setTheme: (theme) => set({ theme }),
      setPref: (k, v) => set({ [k]: v } as any),
      setLastRoute: (r, path) => set((st) => ({ lastRoute: { ...st.lastRoute, [r]: path } })),
      completeOnboarding: (r, done = true) => set((st) => ({ onboarded: { ...st.onboarded, [r]: done } })),
      setChild: (childId) => set({ childId }),
      setContext: (p) => set(p),
      setUnsaved: (unsavedWork) => set({ unsavedWork }),
      setOffline: (offlineBanner) => set({ offlineBanner }),
      openPanel: (k, v) => set((st) => ({ panels: { ...st.panels, [k]: v ?? !st.panels[k] } })),
    }),
    {
      name: "zc3-prefs",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ theme: s.theme, highContrast: s.highContrast, largeText: s.largeText, onboarded: s.onboarded, lastRoute: s.lastRoute }),
    }
  )
);

/** Scenario-derived actor ids. Components use these instead of hard-coding people. */
export function useActors() {
  const scenarioId = useApp((s) => s.scenarioId);
  const childId = useApp((s) => s.childId);
  const sc = scenarioById(scenarioId);
  return { studentId: sc.studentId, teacherId: sc.teacherId, institutionId: sc.institutionId, parentId: "par-rohan", childId, flags: sc.flags, scenario: sc };
}
export { SCENARIOS };
