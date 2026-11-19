import type { ScreenRegistry } from "@/types/screens";

const shared: ScreenRegistry = {
  "live-classes": () => import("./screens/LiveClassesScreen"),
  "live-classes/:id/room": () => import("../live/LiveRoomScreen"),
  "staff-chat": () => import("./screens/StaffChatScreen"),
  books: () => import("./screens/BookLibraryScreen"),
  grading: () => import("./screens/GradingScreen"),
  timetable: () => import("./screens/TimetableScreen"),
  workload: () => import("./screens/WorkloadScreen"),
  papers: () => import("./screens/PaperBankScreen"),
  "papers/new": () => import("./screens/PaperBuilderScreen"),
  "papers/:id": () => import("./screens/PaperBuilderScreen"),
};
export const teacherAcademicRoutes: ScreenRegistry = { ...shared, "question-bank": () => import("./screens/QuestionBankScreen"), results: () => import("./screens/ResultsScreen"), obe: () => import("./screens/ObeScreen") };
export const institutionAcademicRoutes: ScreenRegistry = {
  ...shared,
  "question-banks": () => import("./screens/QuestionBankScreen"),
  "question-bank": () => import("./screens/QuestionBankScreen"),
  obe: () => import("./screens/ObeScreen"),
  results: () => import("./screens/ResultsScreen"),
  attendance: () => import("../teacher/screens/AttendanceScreen"),
  allocation: () => import("./screens/AllocationScreen"),
  "timetable/allocation": () => import("./screens/AllocationScreen"),
  "ai-providers": () => import("../ai-platform/ProviderConfigScreen"),
};
