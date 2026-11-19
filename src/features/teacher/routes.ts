import type { ScreenRegistry } from "@/types/screens";

/** Teacher workspace. Shared slugs (question-bank, papers, grading, timetable, workload, staff-chat, live-classes, books, notifications) are registered by the integrator. */
export const teacherRoutes: ScreenRegistry = {
  onboarding: () => import("./screens/OnboardingScreen"),
  overview: () => import("./screens/OverviewScreen"),
  workspace: () => import("./screens/WorkspaceScreen"),
  classes: () => import("./screens/ClassesScreen"),
  "classes/:id": () => import("./screens/ClassDetailScreen"),
  courses: () => import("./screens/CoursesScreen"),
  "courses/new": () => import("./screens/CourseNewScreen"),
  "courses/:id": () => import("./screens/CourseBuilderScreen"),
  assessments: () => import("./screens/AssessmentsScreen"),
  doubts: () => import("./screens/DoubtsScreen"),
  "parent-messages": () => import("./screens/ParentMessagesScreen"),
  "ai-teachers": () => import("./screens/AITeachersScreen"),
  agents: () => import("./screens/AgentsScreen"),
  feed: () => import("./screens/FeedScreen"),
  moderation: () => import("./screens/ModerationScreen"),
  attendance: () => import("./screens/AttendanceScreen"),
  reports: () => import("./screens/ReportsScreen"),
};
