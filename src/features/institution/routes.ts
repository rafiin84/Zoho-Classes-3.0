import type { ScreenRegistry } from "@/types/screens";

/** Institution screens. Shared slugs (live-classes, staff-chat, books, question-banks, grading, obe, results, timetable, attendance, notifications, ai-providers) are registered by the integrator. */
export const institutionRoutes: ScreenRegistry = {
  onboarding: () => import("./screens/onboarding"),
  overview: () => import("./screens/overview"),
  workspace: () => import("./screens/workspace"),
  academics: () => import("./screens/academics"),
  branches: () => import("./screens/branches"),
  people: () => import("./screens/people"),
  courses: () => import("./screens/courses"),
  ai: () => import("./screens/ai"),
  marketplace: () => import("./screens/marketplace"),
  studio: () => import("./screens/studio"),
  communication: () => import("./screens/communication"),
  analytics: () => import("./screens/analytics"),
  reports: () => import("./screens/reports"),
  fees: () => import("./screens/fees"),
  integrations: () => import("./screens/integrations"),
  governance: () => import("./screens/governance"),
  moderation: () => import("./screens/moderation"),
};
