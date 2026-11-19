import type { MarketListing, Entitlement, Creator, Submission, ListingKind, LicenceType } from "@/types/institution";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { ago, inDays } from "../format";
import { recordAudit } from "./governanceService";

const L = (id: string, title: string, kind: ListingKind, creator: string, subject: string, grade: string, language: string, price: number, licence: LicenceType, rating: number, reviews: number, scope: "public" | "private" = "public", extra: Partial<MarketListing> = {}): MarketListing => ({
  id, title, kind, creator, creatorId: `cr-${creator.toLowerCase().replace(/\W+/g, "-")}`, scope, subject, grade, language, price, licence, rating, reviews, version: "1.2", status: "approved", summary: `${title} — curated for ${grade}, reviewed by the platform moderation team (demo).`, sales: reviews * 3, revenue: reviews * 3 * price, updatedAt: ago(9000), reviewList: reviews ? [{ who: "Teacher, Karuvana school", stars: Math.round(rating), text: "Clear structure and easy to adapt to our class." }, { who: "Department head", stars: Math.max(3, Math.round(rating) - 1), text: "Good coverage; would like more worked examples." }] : [], ...extra,
});
const listings: MarketListing[] = [
  L("mk-euler", "Euler — Maths AI Teacher", "AI Teacher", "Karuvana State Education Dept.", "Mathematics", "Grades 6–8", "English, Hindi", 0, "Government / bulk", 4.7, 312),
  L("mk-newton", "Newton — Science AI Teacher", "AI Teacher", "Greenfield International School", "Science", "Grades 7–9", "English", 0, "Institution licence", 4.6, 140, "private"),
  L("mk-gyan", "Gyan — Social Science AI Teacher", "AI Teacher", "Karuvana State Education Dept.", "Social Science", "Grades 6–8", "English, Hindi, Tamil", 0, "Government / bulk", 4.5, 88),
  L("mk-sahay", "Sahay — Writing coach AI Teacher", "AI Teacher", "Writers' Guild India", "English", "Grades 5–7", "English", 4999, "Subscription", 3.9, 21),
  L("mk-algebra", "Algebra Launchpad", "Course", "Meena Subramaniam", "Mathematics", "Grade 8", "English", 599, "One-time", 4.6, 214),
  L("mk-py", "Python for Curious Beginners", "Course", "Greenfield International School", "Computer Science", "Grades 8–9", "English", 0, "Free", 4.8, 96, "private"),
  L("mk-frac-less", "Fractions: 12 worked-example lessons", "Lesson", "Priya Nair", "Mathematics", "Grade 8", "English", 0, "Free", 4.7, 150),
  L("mk-hw-ratio", "Ratio & proportion homework pack", "Assignment", "Meena Subramaniam", "Mathematics", "Grade 8", "English", 199, "One-time", 4.2, 44),
  L("mk-paper-sci", "Science term paper bundle (3 papers + keys)", "Question paper", "Daniel Okafor", "Science", "Grade 8", "English", 349, "Institution licence", 4.4, 33),
  L("mk-mcq-eco", "Ecosystems MCQ bank (400 items)", "MCQ bank", "Daniel Okafor", "Science", "Grade 8", "English", 249, "Subscription", 4.5, 61),
  L("mk-vid-cell", "Cell structure explainer videos (captioned)", "Video", "BioBytes Studio", "Science", "Grades 7–9", "English, Hindi", 0, "Free", 4.3, 120),
  L("mk-pdf-hist", "River valley civilisations workbook", "PDF", "Arjun Menon", "Social Science", "Grade 7", "English", 0, "Free", 4.1, 38),
  L("mk-ppt-grammar", "Grammar in context slide decks", "Presentation", "Farah Siddiqui", "English", "Grades 7–8", "English", 99, "One-time", 4.0, 19),
  L("mk-notes-alg", "Linear equations revision notes", "Notes", "Meena Subramaniam", "Mathematics", "Grade 8", "English, Tamil", 0, "Free", 4.4, 77),
  L("mk-ebook-story", "Stories from the Kaveri (e-book)", "E-book", "Kaveri Readers", "English", "Grades 5–7", "English", 149, "One-time", 4.6, 52),
  L("mk-game-frac", "Fraction Tug-of-War (game)", "Game", "PlayLearn Labs", "Mathematics", "Grades 5–8", "English", 0, "Free", 4.8, 240),
  L("mk-sim-circ", "Simple circuits simulation", "Simulation", "PhysLab", "Science", "Grades 8–9", "English", 399, "Institution licence", 4.5, 29),
  L("mk-rubric-story", "Narrative writing rubric set", "Rubric", "Farah Siddiqui", "English", "Grades 6–8", "English", 0, "Free", 4.2, 24),
];
const entitlements: Entitlement[] = [
  { id: "ent-1", listingId: "mk-euler", title: "Euler — Maths AI Teacher", licence: "Government / bulk", seats: 2000, used: 1180, acquiredAt: ago(80000), status: "active", ref: "DEMO-LIC-GOV-0007", shared: [] },
  { id: "ent-2", listingId: "mk-paper-sci", title: "Science term paper bundle", licence: "Institution licence", seats: 40, used: 22, acquiredAt: ago(30000), expiresAt: inDays(200), status: "active", ref: "DEMO-LIC-4412", shared: [] },
  { id: "ent-3", listingId: "mk-mcq-eco", title: "Ecosystems MCQ bank", licence: "Subscription", seats: 25, used: 25, acquiredAt: ago(70000), expiresAt: inDays(-5), status: "expired", ref: "DEMO-LIC-3300", shared: [] },
];
const creators: Creator[] = [
  { id: "cr-meena-subramaniam", name: "Meena Subramaniam", bio: "Independent maths educator, 14 years in classrooms across Karuvana.", listings: 3, rating: 4.5, verified: true },
  { id: "cr-daniel-okafor", name: "Daniel Okafor", bio: "Science teacher and assessment designer.", listings: 2, rating: 4.5, verified: true },
  { id: "cr-playlearn-labs", name: "PlayLearn Labs", bio: "Small studio making curriculum-aligned learning games.", listings: 1, rating: 4.8, verified: false },
];
const submissions: Submission[] = [
  { id: "sub-1", kind: "ai-teacher", title: "Kavya — Hindi storytelling AI Teacher", status: "in-review", version: "0.3", submittedAt: ago(700), scope: "institution", notes: ["Received", "Safety checks passed", "Awaiting human reviewer"] },
  { id: "sub-2", kind: "content", title: "Grade 8 geometry pack", status: "changes-requested", version: "1.0", submittedAt: ago(3000), scope: "public", notes: ["Received", "Reviewer: add answer keys for Set B"] },
];
export interface ListingDraft { title: string; kind: ListingKind; subject: string; grade: string; language: string; summary: string; licence: LicenceType; price: number; scope: "private" | "institution" | "public"; teachingStyle?: string; outcomes?: string }

export const marketplaceService = {
  list: (o: { scope?: "public" | "private" } = {}) => simulate(() => listings.filter((l) => (!o.scope || l.scope === o.scope) && !["draft"].includes(l.status) || l.status === "draft"), { failKey: "marketplace" }),
  get: (id: string) => simulate(() => listings.find((l) => l.id === id) ?? null),
  creators: () => simulate(() => creators),
  entitlements: () => simulate(() => entitlements),
  /** Simulated procurement. No payment is taken. */
  purchase: (listingId: string, seats: number, licence: LicenceType) => simulate(() => {
    const l = listings.find((x) => x.id === listingId); if (!l) throw new ServiceError("Listing not found", "unavailable");
    if (l.status !== "approved") throw new ServiceError("This listing is not available for procurement.", "permission");
    if (seats < 1 || seats > 5000) throw new ServiceError("Seats must be between 1 and 5000.", "validation");
    if (entitlements.some((e) => e.listingId === listingId && e.status === "active")) throw new ServiceError("You already hold an active licence for this item.", "validation");
    const e: Entitlement = { id: uid("ent"), listingId, title: l.title, licence, seats, used: 0, acquiredAt: new Date().toISOString(), expiresAt: licence === "Subscription" ? inDays(365) : undefined, status: "active", ref: `DEMO-LIC-${Math.floor(1000 + Math.random() * 9000)}`, shared: [] };
    entitlements.unshift(e); l.sales += seats; l.revenue += seats * l.price;
    recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: "Simulated marketplace procurement", category: "Fee adjustment/payment status", target: `${l.title} · ${seats} seats`, context: "Marketplace (no real payment)" });
    return e;
  }, { ms: 800 }),
  setEntitlement: (id: string, status: Entitlement["status"]) => simulate(() => { const e = entitlements.find((x) => x.id === id)!; e.status = status; return e; }),
  shareEntitlement: (id: string, partner: string) => simulate(() => { if (!partner.trim()) throw new ServiceError("Choose a partner institution.", "validation"); const e = entitlements.find((x) => x.id === id)!; if (e.licence === "Free") throw new ServiceError("Free items need no sharing permission.", "validation"); if (!e.shared.includes(partner)) e.shared.push(partner); recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: "Shared licence with institution (explicit, permissioned)", category: "Data export", target: `${e.title} → ${partner}`, context: "Marketplace" }); return e; }),
  setStatus: (id: string, status: MarketListing["status"], reason?: string) => simulate(() => { const l = listings.find((x) => x.id === id)!; if (["suspended", "retired", "withdrawn"].includes(status) && !reason?.trim()) throw new ServiceError("A reason is required.", "validation"); l.status = status; recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: `Listing ${status}`, category: "AI Teacher publication", target: l.title, context: reason ?? "Marketplace" }); return l; }),
  mine: () => simulate(() => listings.filter((l) => ["Greenfield International School", "Priya Nair", "Farah Siddiqui", "Daniel Okafor", "Arjun Menon"].includes(l.creator) || l.status === "draft" || l.status === "in-review")),
  submissions: () => simulate(() => submissions),
  create: (d: ListingDraft, kind: "ai-teacher" | "content") => simulate(() => {
    if (d.title.trim().length < 4) throw new ServiceError("Title is too short.", "validation");
    const l: MarketListing = { id: uid("mk"), title: d.title, kind: d.kind, creator: "Greenfield International School", creatorId: "cr-greenfield", scope: d.scope === "public" ? "public" : "private", subject: d.subject, grade: d.grade, language: d.language, price: d.price, licence: d.licence, rating: 0, reviews: 0, version: "1.0", status: "in-review", summary: d.summary, sales: 0, revenue: 0, updatedAt: new Date().toISOString(), reviewList: [] };
    listings.unshift(l);
    submissions.unshift({ id: uid("sub"), kind, title: d.title, status: "in-review", version: "1.0", submittedAt: l.updatedAt, scope: d.scope, notes: ["Received", "Automated checks queued", "Human review required before listing"] });
    return l;
  }),
  /** Demo moderation: advances a submission one step. */
  advanceSubmission: (id: string) => simulate(() => { const s = submissions.find((x) => x.id === id)!; const l = listings.find((x) => x.title === s.title); if (s.status === "in-review") { s.status = "approved"; s.notes.push("Approved by moderator (demo)"); if (l) l.status = "approved"; } else if (s.status === "approved") { s.status = "published"; s.notes.push("Published"); } return s; }),
  withdrawSubmission: (id: string) => simulate(() => { const s = submissions.find((x) => x.id === id)!; s.status = "withdrawn"; const l = listings.find((x) => x.title === s.title); if (l) l.status = "withdrawn"; return s; }),
  publishVersion: (id: string) => simulate(() => { const l = listings.find((x) => x.id === id)!; const [a, b] = l.version.split(".").map(Number); l.version = `${a}.${b + 1}`; l.updatedAt = new Date().toISOString(); l.status = "in-review"; return l; }),
};
