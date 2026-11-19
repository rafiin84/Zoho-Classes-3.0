import type { ScreenRegistry } from "@/types/screens";

/** Government (state) screens. `ai-providers` and `notifications` are registered by the integrator / shared routes. */
export const governmentRoutes: ScreenRegistry = {
  onboarding: () => import("./screens/Onboarding"),
  overview: () => import("./screens/Overview"),
  "command-centre": () => import("./screens/CommandCentre"),
  programmes: () => import("./screens/Programmes"),
  "programmes/new": () => import("./screens/ProgrammeNew"),
  "programmes/:id": () => import("./screens/ProgrammeDetail"),
  distribution: () => import("./screens/Distribution"),
  assessments: () => import("./screens/Assessments"),
  "learning-gaps": () => import("./screens/LearningGaps"),
  districts: () => import("./screens/Districts"),
  "districts/:id": () => import("./screens/DistrictDetail"),
  ai: () => import("./screens/AIScreen"),
  reports: () => import("./screens/Reports"),
  governance: () => import("./screens/Governance"),
  "knowledge-graph": () => import("./screens/KnowledgeGraph"),
};
