import type { ScreenRegistry } from "@/types/screens";

export const parentRoutes: ScreenRegistry = {
  "onboarding": () => import("./screens/OnboardingScreen"),
  "home": () => import("./screens/HomeScreen"),
  "learning": () => import("./screens/LearningScreen"),
  "feed": () => import("./screens/FeedScreen"),
  "achievements": () => import("./screens/AchievementsScreen"),
  "messages": () => import("./screens/MessagesScreen"),
  "assistant": () => import("./screens/AssistantScreen"),
  "fees": () => import("./screens/ParentFees"),
  "live-classes": () => import("./screens/ParentLiveClasses"),
  "live-classes/:id": () => import("./screens/ParentLiveClassDetail"),
  "results": () => import("./screens/ParentResults"),
  "timetable": () => import("./screens/ParentTimetable"),
  "attendance": () => import("./screens/ParentAttendance"),
};
