import type { Role } from "@/types";
import { COURSES } from "@/lib/mock-data/content";
import { EVENTS, CLUBS, FEED } from "@/lib/mock-data/engagement";
import { STUDENTS, TEACHERS, BRANCHES, AI_TEACHERS } from "@/lib/mock-data/core";
import { NAV } from "@/config/nav";

export interface SearchItem { id: string; type: string; title: string; sub?: string; href: string }
const nav = (r: Role): SearchItem[] => [...NAV[r].primary, ...NAV[r].more].map((n) => ({ id: `nav-${n.slug}`, type: "Go to", title: n.label, href: `/${r}/${n.slug}` }));

export function searchIndex(role: Role, childId: string): SearchItem[] {
  switch (role) {
    case "student":
      return [
        ...nav("student"),
        ...COURSES.filter((c) => c.status === "published").map((c) => ({ id: c.id, type: "Courses", title: c.title, sub: c.creatorName, href: `/student/courses/${c.id}` })),
        ...EVENTS.map((e) => ({ id: e.id, type: "Events", title: e.title, sub: e.category, href: `/student/events/${e.id}` })),
        ...CLUBS.map((c) => ({ id: c.id, type: "Clubs", title: c.name, sub: c.category, href: `/student/clubs/${c.id}` })),
        ...FEED.filter((p) => p.moderationStatus === "published").slice(0, 6).map((p) => ({ id: p.id, type: "Feed posts", title: p.text.slice(0, 60), sub: p.authorName, href: "/student/feed" })),
        { id: "g1", type: "Games", title: "Tug-of-war quiz", sub: "Team game", href: "/student/play" },
        { id: "g2", type: "Lessons", title: "Adding unlike fractions", sub: "Fractions & Decimals", href: "/student/learn" },
        { id: "g3", type: "Subjects", title: "Mathematics", href: "/student/learn" },
      ];
    case "teacher":
      return [
        ...nav("teacher"),
        ...STUDENTS.filter((s) => s.classId === "cls-8b").map((s) => ({ id: s.id, type: "Students", title: s.displayName, sub: `Grade ${s.className}`, href: "/teacher/classes/cls-8b" })),
        { id: "c1", type: "Classes", title: "Grade 8 · B", sub: "Mathematics", href: "/teacher/classes/cls-8b" },
        ...COURSES.slice(0, 4).map((c) => ({ id: c.id, type: "Courses", title: c.title, href: `/teacher/courses/${c.id}` })),
        { id: "d1", type: "Doubts", title: "Checkpoint answer confusing — 11/12?", sub: "Kabir Mehta · Open", href: "/teacher/doubts" },
        { id: "r1", type: "Reports", title: "Fractions mastery by class", href: "/teacher/reports" },
        { id: "q1", type: "Questions", title: "Fractions question bank", href: "/teacher/question-bank" },
      ];
    case "institution":
      return [...nav("institution"), ...BRANCHES.map((b) => ({ id: b.id, type: "Branches", title: b.name, sub: b.city, href: "/institution/branches" })), ...TEACHERS.map((t) => ({ id: t.id, type: "People", title: `${t.title} ${t.displayName}`, sub: t.departmentName, href: "/institution/people" })), ...AI_TEACHERS.map((a) => ({ id: a.id, type: "AI Teachers", title: a.name, sub: a.subject, href: "/institution/ai" })), { id: "rep", type: "Reports", title: "Engagement by branch", href: "/institution/reports" }];
    case "government":
      return [...nav("government"), ...["Nilgiri Hills", "Kaveri Delta", "Coastal Karuvana", "Western Ghats", "Central Plains", "Highland Plateau"].map((d) => ({ id: d, type: "Districts", title: d, href: "/government/districts" })), { id: "p1", type: "Programmes", title: "Mission Maths Mastery", href: "/government/programmes" }, { id: "o1", type: "Learning objectives", title: "Add and subtract unlike fractions", sub: "M8.3.1", href: "/government/learning-gaps" }];
    case "parent":
      return [...nav("parent"), ...EVENTS.slice(0, 3).map((e) => ({ id: e.id, type: "Events", title: e.title, href: "/parent/feed" })), { id: "h1", type: "Help", title: "How do I pay a fee installment?", href: "/parent/fees" }, { id: "h2", type: "Help", title: "Who can see my child's data?", href: "/parent/home" }, { id: childId, type: "Resources", title: "Child's learning report", href: "/parent/learning" }];
  }
}

export interface CommandProposal { action: string; scope: string; audience: string; approval: string; href: string; kind: "answer" | "action" }
export function interpretCommand(role: Role, text: string): CommandProposal {
  const t = text.toLowerCase();
  const hit = (...w: string[]) => w.some((x) => t.includes(x));
  if (role === "student") {
    if (hit("revise", "practice", "practise")) return { kind: "answer", action: "Show a personalised revision plan", scope: "Your mastery profile", audience: "Only you", approval: "None — answer only", href: "/student/tutor" };
    return { kind: "answer", action: "Ask your AI Tutor", scope: "Your selected course", audience: "Only you", approval: "None — answer only", href: "/student/tutor" };
  }
  if (role === "teacher") {
    if (hit("mcq", "question", "paper")) return { kind: "action", action: "Generate draft questions in the Question Bank", scope: "Selected chapter & Bloom levels", audience: "Draft — visible only to you", approval: "Teacher approval before saving to bank", href: "/teacher/question-bank" };
    if (hit("struggl", "fraction", "attention")) return { kind: "answer", action: "Summarise students struggling", scope: "Grade 8B · Mathematics", audience: "Only you", approval: "None — answer only", href: "/teacher/workspace" };
    if (hit("grade", "evaluate")) return { kind: "action", action: "Prepare AI grading suggestions", scope: "Selected submissions", audience: "Draft marks hidden from students", approval: "Teacher must approve before release", href: "/teacher/grading" };
    return { kind: "answer", action: "Open AI Workspace with this prompt", scope: "Your classes", audience: "Only you", approval: "None — answer only", href: "/teacher/workspace" };
  }
  if (role === "institution") return { kind: "answer", action: "Analyse across branches", scope: "Greenfield (all branches)", audience: "Institution leaders", approval: "None — answer only", href: "/institution/workspace" };
  if (role === "government") {
    if (hit("prepare", "create", "launch")) return { kind: "action", action: "Draft a statewide programme", scope: "Selected districts & grades", audience: "Draft — visible to your office", approval: "Academic expert + official approval before launch", href: "/government/programmes/new" };
    return { kind: "answer", action: "Analyse learning outcomes", scope: "State · all districts", audience: "Authorised officials", approval: "None — answer only", href: "/government/command-centre" };
  }
  return { kind: "answer", action: "Ask the Parent AI Assistant", scope: "Selected child only", audience: "Only you", approval: "None — answer only", href: "/parent/assistant" };
}
