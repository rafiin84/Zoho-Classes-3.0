import type { Course } from "@/types";

export interface QualityCheck { key: string; label: string; state: "pass" | "warn" | "fail" | "pending"; note: string }
const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
/** Deterministic mock quality checks. Human review status is always explicit. */
export function qualityChecks(c: Pick<Course, "id" | "title" | "outcomes" | "lessonCount" | "language" | "status">, dup = false): QualityCheck[] {
  const n = h(c.id), pick = (i: number, p = 3) => (n >> i) % p;
  const S = (i: number, pass: string, bad: string, fail = false): { state: QualityCheck["state"]; note: string } => (pick(i) === 0 ? { state: fail ? "fail" : "warn", note: bad } : { state: "pass", note: pass });
  return [
    { key: "meta", label: "Metadata completeness", ...S(1, "Title, subject, grade, language set", "Add a cover description and tags") },
    { key: "align", label: "Curriculum alignment", ...(c.outcomes.length ? { state: "pass" as const, note: `${c.outcomes.length} outcomes mapped to ${"2026.1"}` } : { state: "fail" as const, note: "No outcomes mapped" }) },
    { key: "obj", label: "Objective coverage", ...S(2, "All mapped objectives have an activity", "1 objective has no assessment") },
    { key: "dup", label: "Duplicate warning", ...(dup ? { state: "warn" as const, note: "Similar title already in catalogue" } : { state: "pass" as const, note: "No near-duplicates found" }) },
    { key: "key", label: "Answer-key & rubric completeness", ...S(3, "Keys and rubrics present", "2 questions lack answer keys", true) },
    { key: "a11y", label: "Accessibility & language review", ...S(4, `Captions and ${c.language} review done`, "Alt text missing on 3 images") },
    { key: "rights", label: "Rights declaration", ...S(5, "Creator declared ownership", "Declaration not signed", true) },
    { key: "human", label: "Human review", state: c.status === "published" ? "pass" : "pending", note: c.status === "published" ? "Reviewed by a teacher" : "Required before publishing" },
  ];
}
export const checkTone = (s: QualityCheck["state"]) => (s === "pass" ? "success" : s === "fail" ? "danger" : s === "warn" ? "warning" : "neutral") as "success" | "danger" | "warning" | "neutral";
