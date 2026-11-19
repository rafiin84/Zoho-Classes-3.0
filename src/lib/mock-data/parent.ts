import { inDays } from "@/lib/format";
export interface PortfolioItem { id: string; childId: string; kind: "certificate" | "portfolio" | "competition"; title: string; detail: string; at: string; visibility: "shared-with-parent" | "private" | "school"; }
export const ACHIEVEMENT_ITEMS: PortfolioItem[] = [
  { id: "ach-1", childId: "stu-ananya", kind: "certificate", title: "State Maths Quiz · 2nd place", detail: "Certificate issued by Karuvana State Education Dept. (demo)", at: inDays(-11), visibility: "shared-with-parent" },
  { id: "ach-2", childId: "stu-ananya", kind: "certificate", title: "Python for Curious Beginners · completion", detail: "Course certificate (demo)", at: inDays(-30), visibility: "shared-with-parent" },
  { id: "ach-3", childId: "stu-ananya", kind: "competition", title: "Colours of Karuvana drawing competition", detail: "Registered. Event on the 3rd of next month (demo date).", at: inDays(14), visibility: "school" },
  { id: "ach-4", childId: "stu-ananya", kind: "portfolio", title: "Robotics line-follower project", detail: "Photos and a short write-up from Robotics Club.", at: inDays(-20), visibility: "shared-with-parent" },
  { id: "ach-5", childId: "stu-ananya", kind: "portfolio", title: "Personal journal entries", detail: "Kept private by Ananya.", at: inDays(-5), visibility: "private" },
  { id: "ach-6", childId: "stu-vihaan", kind: "certificate", title: "Reading Challenge · Level 2", detail: "Library reading programme (demo)", at: inDays(-18), visibility: "shared-with-parent" },
  { id: "ach-7", childId: "stu-vihaan", kind: "competition", title: "Football Trials · Saturday 8 AM", detail: "Joined. Consent slip due Monday.", at: inDays(2), visibility: "shared-with-parent" },
  { id: "ach-8", childId: "stu-vihaan", kind: "portfolio", title: "My story: The Lost Kite", detail: "Illustrated story, shared with class.", at: inDays(-9), visibility: "school" },
];
