import type { Question, AnswerValue } from "@/types/exams";

export interface QScore { got: number; max: number; correct: boolean | "partial" | "manual" }
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const arrEq = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Auto-score one question. Short/long/file answers need a teacher (returns "manual"). */
export function scoreQuestion(q: Question, a: AnswerValue | undefined): QScore {
  const max = q.marks; const none: QScore = { got: 0, max, correct: false };
  if (a === undefined || a === "" || (Array.isArray(a) && a.length === 0)) return q.type === "short" || q.type === "long" || q.type === "file" ? { got: 0, max, correct: "manual" } : none;
  switch (q.type) {
    case "mcq": return q.answer === a ? { got: max, max, correct: true } : none;
    case "tf": return q.answer === a ? { got: max, max, correct: true } : none;
    case "multi": { const given = [...(a as number[])].sort(); const want = [...(q.answer ?? [])].sort(); if (arrEq(given, want)) return { got: max, max, correct: true }; const right = given.filter((x) => want.includes(x)).length, wrong = given.length - right; const got = Math.max(0, Math.round(((right - wrong) / want.length) * max * 10) / 10); return { got, max, correct: got > 0 ? "partial" : false }; }
    case "fill": { const given = a as string[]; const want = q.answer ?? []; const ok = want.filter((acc, i) => acc.map(norm).includes(norm(given[i] ?? ""))).length; return { got: Math.round((ok / want.length) * max * 10) / 10, max, correct: ok === want.length ? true : ok > 0 ? "partial" : false }; }
    case "matching": { const given = a as Record<string, string>; const ok = q.pairs.filter((p) => given[p.left] === p.right).length; return { got: Math.round((ok / q.pairs.length) * max * 10) / 10, max, correct: ok === q.pairs.length ? true : ok > 0 ? "partial" : false }; }
    case "ordering": { const ok = arrEq(a as string[], q.items); return ok ? { got: max, max, correct: true } : none; }
    case "numerical": { const v = parseFloat(String(a)); const ok = !Number.isNaN(v) && q.answer !== undefined && Math.abs(v - q.answer) <= (q.tolerance ?? 0); return ok ? { got: max, max, correct: true } : none; }
    default: return { got: 0, max, correct: "manual" };
  }
}
export const hasAnswer = (a: AnswerValue | undefined) => !(a === undefined || a === "" || (Array.isArray(a) && a.length === 0) || (Array.isArray(a) && a.every((x) => x === "")) || (typeof a === "object" && !Array.isArray(a) && Object.keys(a as object).length === 0));
/** Deterministic shuffle so the same question looks the same across renders. */
export function stableShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const out = [...arr]; for (let i = out.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  if (out.length > 1 && out.every((x, i) => x === arr[i])) out.push(out.shift() as T);
  return out;
}
