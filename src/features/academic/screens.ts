import type { ScreenLoader } from "@/types/screens";

/**
 * Role-aware shared Academic Operations screens. Registration is done by the integrator (this file registers nothing).
 * Every module default-exports a client component taking `ScreenProps`; behaviour adapts to `props.role`.
 */
export interface AcademicScreenDoc { file: string; load: ScreenLoader; teacherSlug?: string; institutionSlug?: string; notes?: string }
export const academicScreens: Record<string, AcademicScreenDoc> = {
  QuestionBank: { file: "screens/QuestionBankScreen.tsx", load: () => import("./screens/QuestionBankScreen"), teacherSlug: "question-bank", institutionSlug: "question-banks" },
  PaperBank: { file: "screens/PaperBankScreen.tsx", load: () => import("./screens/PaperBankScreen"), teacherSlug: "papers", institutionSlug: "papers", notes: "Opens the builder in place" },
  PaperBuilder: { file: "screens/PaperBuilderScreen.tsx", load: () => import("./screens/PaperBuilderScreen"), teacherSlug: "papers/new | papers/:id", institutionSlug: "papers/new | papers/:id" },
  Grading: { file: "screens/GradingScreen.tsx", load: () => import("./screens/GradingScreen"), teacherSlug: "grading", institutionSlug: "grading" },
  Timetable: { file: "screens/TimetableScreen.tsx", load: () => import("./screens/TimetableScreen"), teacherSlug: "timetable", institutionSlug: "timetable" },
  Workload: { file: "screens/WorkloadScreen.tsx", load: () => import("./screens/WorkloadScreen"), teacherSlug: "workload", institutionSlug: "workload" },
  Allocation: { file: "screens/AllocationScreen.tsx", load: () => import("./screens/AllocationScreen"), teacherSlug: "timetable/allocation (optional)", institutionSlug: "allocation | timetable/allocation" },
  StaffChat: { file: "screens/StaffChatScreen.tsx", load: () => import("./screens/StaffChatScreen"), teacherSlug: "staff-chat", institutionSlug: "staff-chat" },
  LiveClasses: { file: "screens/LiveClassesScreen.tsx", load: () => import("./screens/LiveClassesScreen"), teacherSlug: "live-classes", institutionSlug: "live-classes" },
  BookLibrary: { file: "screens/BookLibraryScreen.tsx", load: () => import("./screens/BookLibraryScreen"), teacherSlug: "books", institutionSlug: "books" },
  Obe: { file: "screens/ObeScreen.tsx", load: () => import("./screens/ObeScreen"), teacherSlug: "obe", institutionSlug: "obe" },
  Results: { file: "screens/ResultsScreen.tsx", load: () => import("./screens/ResultsScreen"), teacherSlug: "results", institutionSlug: "results" },
};
