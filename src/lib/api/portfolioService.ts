import type { PortfolioData, PortfolioItem, PortfolioVisibility, PortfolioSection, StudentCertificate, ExportRequest, ExportKind, ExportStatus } from "@/types/portfolio";
import { STUDENTS, SUBJECTS } from "../mock-data/core";
import { simulate, ServiceError } from "./latency";
import { eventService } from "./eventService";
import { feedService } from "./feedService";
import { learningProfileService } from "./learningProfileService";
import { uid } from "../utils";
import { ago } from "../format";

/** Visibility overrides by `${studentId}:${itemId}`. */
const overrides: Record<string, { visibility: PortfolioVisibility; approval: PortfolioItem["approval"] }> = {};
const manual: Record<string, PortfolioItem[]> = {
  "stu-ananya": [
    { id: "man-proj-1", section: "projects", title: "Smart plant watering prototype", subtitle: "Arduino + soil sensor · built with Robotics Club", date: ago(20000), source: "manual", visibility: "institution", approval: "published", icon: "Cpu", institutionRecord: false },
    { id: "man-sport-1", section: "sports", title: "Grade 8 basketball house team", subtitle: "Point guard · 2026 season", date: ago(30000), source: "manual", visibility: "teachers", approval: "none", icon: "Basketball", institutionRecord: false },
  ],
};
const exportsStore: ExportRequest[] = [
  { id: "exp-seed-ready", studentId: "stu-ananya", kind: "pdf", label: "Portfolio PDF (student-generated)", scope: ["profile", "competitions", "talent", "clubs"], createdAt: ago(60 * 24), readyAt: ago(60 * 24 - 1), expiresAt: new Date(Date.now() + 6 * 864e5).toISOString() },
  { id: "exp-seed-old", studentId: "stu-ananya", kind: "data", label: "Structured data export (JSON)", scope: ["profile", "learning-history"], createdAt: ago(60 * 24 * 12), readyAt: ago(60 * 24 * 12 - 1), expiresAt: ago(60 * 24 * 5) },
];
export const exportStatus = (r: ExportRequest, now = Date.now()): ExportStatus => (now < +new Date(r.readyAt) ? "pending" : now > +new Date(r.expiresAt) ? "expired" : "ready");

const defaultVis = (aud: string): PortfolioVisibility => (aud === "private" ? "private" : aud === "class" ? "teachers" : aud === "school" ? "institution" : aud === "wider" ? "wider" : "teachers");

async function build(studentId: string): Promise<PortfolioData> {
  const st = STUDENTS.find((s) => s.id === studentId) ?? STUDENTS[0];
  const [events, clubs, feed, prof] = await Promise.all([eventService.list(), eventService.clubs(), feedService.list({ role: "student", id: studentId }, { size: 200 }), learningProfileService.get(studentId)]);
  const items: PortfolioItem[] = [];
  const nm = st.displayName.toLowerCase();
  for (const e of events) {
    if (e.myRegistration === "not-registered" || e.myRegistration === "withdrawn") continue;
    const mine = e.results?.find((r) => r.name.toLowerCase() === nm);
    const sports = e.category.startsWith("Sports");
    const status = e.myRegistration === "registered" ? (mine ? `Rank ${mine.rank}` : "Registered") : e.myRegistration === "waitlisted" ? "Waitlisted" : "Awaiting guardian consent";
    items.push({ id: `evt-${e.id}`, section: sports ? "sports" : "competitions", title: e.title, subtitle: `${e.category} · ${e.scope} level`, date: e.startAt, source: "events", visibility: "institution", approval: "none", href: `/student/events/${e.id}`, icon: e.cover.icon, status, institutionRecord: false });
    if (mine && mine.rank <= 3) items.push({ id: `award-${e.id}`, section: "awards", title: `${mine.rank === 1 ? "1st" : mine.rank === 2 ? "2nd" : "3rd"} place · ${e.title}`, subtitle: `Score ${mine.score}`, date: e.endAt, source: "events", visibility: "institution", approval: "none", href: `/student/events/${e.id}`, icon: "Trophy", institutionRecord: true });
  }
  for (const c of clubs) {
    if (c.myStatus === "active" || c.myStatus === "pending") items.push({ id: `club-${c.id}`, section: "clubs", title: c.name, subtitle: c.myStatus === "pending" ? "Membership request pending" : `Member · mentor ${c.mentor}`, source: "clubs", visibility: "institution", approval: "none", href: `/student/clubs/${c.id}`, icon: c.cover.icon, status: c.myStatus === "pending" ? "Pending" : "Member", institutionRecord: false });
  }
  for (const p of feed.items.filter((x) => x.authorId === studentId && x.postType === "talent")) {
    const live = p.moderationStatus === "published" || p.moderationStatus === "approved";
    const pending = p.moderationStatus === "submitted";
    items.push({ id: `talent-${p.id}`, section: "talent", title: p.text.length > 60 ? p.text.slice(0, 57) + "…" : p.text, subtitle: `${p.category ?? "Talent"} · ${p.audienceLabel}`, date: p.createdAt, source: "talent", visibility: defaultVis(p.audienceType), approval: live ? (p.audienceType === "private" ? "none" : "published") : pending ? "pending" : "none", href: "/student/talent", icon: p.media?.icon ?? "PaintBrush", status: live ? "Published" : pending ? "Awaiting approval" : p.moderationStatus, institutionRecord: false });
  }
  for (const b of prof?.badges ?? []) items.push({ id: `badge-${b.id}`, section: "awards", title: b.label, subtitle: "Learning badge", date: b.earnedAt, source: "badges", visibility: "institution", approval: "none", icon: b.icon, institutionRecord: false });
  for (const h of prof?.history ?? []) {
    if (h.kind === "course" || h.kind === "assessment") items.push({ id: `hist-${h.id}`, section: "courses", title: h.title, subtitle: h.result, date: h.at, source: "learning", visibility: "teachers", approval: "none", icon: "BookOpen", institutionRecord: h.kind === "assessment" });
    if (h.kind === "game" || h.kind === "challenge") items.push({ id: `ms-${h.id}`, section: "milestones", title: h.title, subtitle: h.result, date: h.at, source: "learning", visibility: "private", approval: "none", icon: h.kind === "game" ? "GameController" : "Lightning", institutionRecord: false });
  }
  for (const o of prof?.objectives ?? []) items.push({ id: `skill-${o.objectiveId}`, section: "skills", title: o.label, subtitle: `Mastery ${o.mastery}% · ${o.evidence}`, source: "learning", visibility: "teachers", approval: "none", icon: "Target", institutionRecord: false });
  items.push(...(manual[studentId] ?? []));
  for (const it of items) { const o = overrides[`${studentId}:${it.id}`]; if (o) { it.visibility = o.visibility; it.approval = o.approval; } }
  const academic = Object.entries(prof?.subjectMastery ?? {}).map(([subjectId, mastery]) => ({ subjectId, name: SUBJECTS.find((s) => s.id === subjectId)?.name ?? subjectId, mastery }));
  return { studentId, profile: { name: st.displayName, gradeLabel: st.gradeLabel, className: st.className, interests: st.interests, color: st.avatarColor, status: st.status }, academic, items, updatedAt: new Date().toISOString() };
}

export const portfolioService = {
  /** Classmates available as teammates (names + initials only; no private data). */
  classmates: (studentId: string) => simulate(() => STUDENTS.filter((x) => x.id !== studentId && x.classId === (STUDENTS.find((y) => y.id === studentId)?.classId ?? "cls-8b")).map((x) => ({ id: x.id, name: x.displayName, color: x.avatarColor })), { ms: 60 }),
  get: async (studentId: string) => { const d = await build(studentId); return simulate(() => d, { ms: 40, failKey: "portfolio" }); },
  setVisibility: (studentId: string, itemId: string, visibility: PortfolioVisibility) => simulate(() => {
    if (visibility === "wider") { overrides[`${studentId}:${itemId}`] = { visibility, approval: "pending" }; return { approval: "pending" as const }; }
    overrides[`${studentId}:${itemId}`] = { visibility, approval: "none" }; return { approval: "none" as const };
  }, { ms: 100 }),
  /** Demo helper: simulates teacher + guardian approval for the wider audience. */
  simulateApproval: (studentId: string, itemId: string) => simulate(() => { const k = `${studentId}:${itemId}`; if (overrides[k]) overrides[k].approval = "published"; return true; }, { ms: 100 }),
  addItem: (studentId: string, item: { section: PortfolioSection; title: string; subtitle?: string }) => simulate(() => {
    const n: PortfolioItem = { id: uid("man"), source: "manual", visibility: "private", approval: "none", institutionRecord: false, date: new Date().toISOString(), icon: "Star", ...item };
    (manual[studentId] ??= []).unshift(n); return n;
  }, { ms: 100 }),
  certificates: async (studentId: string) => {
    const st = STUDENTS.find((s) => s.id === studentId) ?? STUDENTS[0];
    const [events, clubs, prof] = await Promise.all([eventService.list(), eventService.clubs(), learningProfileService.get(studentId)]);
    const out: StudentCertificate[] = [];
    for (const e of events) {
      if (e.myRegistration !== "registered") continue;
      const mine = e.results?.find((r) => r.name === st.displayName);
      if (e.status === "results-published" || e.status === "completed") out.push({ id: `cert-${e.id}`, title: mine ? `Rank ${mine.rank} · ${e.title}` : `Participation · ${e.title}`, issuer: e.organiser, date: e.endAt, kind: mine ? "achievement" : "participation", official: false, href: `/student/events/${e.id}`, detail: mine ? `Score ${mine.score}` : "Participation recorded" });
    }
    for (const c of clubs) if (c.myStatus === "active") for (const a of c.achievements) out.push({ id: `cert-${c.id}-${a.length}`, title: a, issuer: c.name, date: ago(9000), kind: "achievement", official: false, href: `/student/clubs/${c.id}`, detail: `Club achievement · ${c.name}` });
    for (const b of prof?.badges ?? []) out.push({ id: `cert-b-${b.id}`, title: `${b.label} badge`, issuer: "Zoho Classes learning badges", date: b.earnedAt, kind: "badge", official: false, detail: "Earned through learning activity" });
    if (studentId === "stu-ananya") out.push({ id: "cert-crs-eco", title: "Course completion · Ecosystems & Energy Flow", issuer: "Greenfield School", date: ago(7000), kind: "course", official: false, href: "/student/courses/crs-ecosystems", detail: "Completed all modules" });
    const sorted = out.sort((a, b) => b.date.localeCompare(a.date));
    return simulate(() => sorted, { ms: 40 });
  },
  exports: (studentId: string) => simulate(() => exportsStore.filter((x) => x.studentId === studentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
  requestExport: (studentId: string, p: { kind: ExportKind; label: string; scope: string[]; note?: string }) => simulate(() => {
    if (p.scope.length === 0) throw new ServiceError("Choose at least one section to include.", "validation");
    const now = Date.now();
    const r: ExportRequest = { id: uid("exp"), studentId, ...p, createdAt: new Date(now).toISOString(), readyAt: new Date(now + (p.kind === "verified-request" ? 12000 : 3500)).toISOString(), expiresAt: new Date(now + 7 * 864e5).toISOString() };
    exportsStore.unshift(r); return r;
  }, { ms: 200 }),
  /** Demo helper to show the expired state. */
  expireNow: (id: string) => simulate(() => { const r = exportsStore.find((x) => x.id === id); if (r) { r.readyAt = ago(5); r.expiresAt = ago(1); } return true; }, { ms: 60 }),
};
export { exportStatus as getExportStatus };
