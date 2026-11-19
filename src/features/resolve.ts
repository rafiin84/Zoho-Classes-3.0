import type { Role } from "@/types";
import type { ScreenLoader, ScreenRegistry } from "@/types/screens";
import { studentRoutes } from "./student/routes";
import { teacherRoutes } from "./teacher/routes";
import { institutionRoutes } from "./institution/routes";
import { governmentRoutes } from "./government/routes";
import { parentRoutes } from "./parent/routes";
import { teacherAcademicRoutes, institutionAcademicRoutes } from "./academic/routes";
import { sharedRoutes } from "./shared/routes";

const registries: Record<Role, ScreenRegistry> = {
  student: { ...sharedRoutes, ...studentRoutes },
  teacher: { ...sharedRoutes, ...teacherAcademicRoutes, ...teacherRoutes },
  institution: { ...sharedRoutes, ...institutionAcademicRoutes, ...institutionRoutes },
  government: { ...sharedRoutes, "ai-providers": () => import("./ai-platform/ProviderConfigScreen"), ...governmentRoutes },
  parent: { ...sharedRoutes, ...parentRoutes },
};

/** Match slug segments against keys like "courses/:id". Literal segments beat params; returns captures. */
export function resolveScreen(role: Role, slug: string[]): { loader: ScreenLoader; params: Record<string, string>; key: string } | null {
  const reg = registries[role];
  let best: { key: string; score: number; params: Record<string, string> } | null = null;
  for (const key of Object.keys(reg)) {
    const parts = key.split("/");
    if (parts.length !== slug.length) continue;
    const params: Record<string, string> = {};
    let score = 0, ok = true;
    parts.forEach((p, i) => {
      if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(slug[i]);
      else if (p === slug[i]) score += 2;
      else ok = false;
    });
    if (ok && (!best || score > best.score)) best = { key, score, params };
  }
  return best ? { loader: reg[best.key], params: best.params, key: best.key } : null;
}
export const routeKeys = (role: Role) => Object.keys(registries[role]);
