// Locale-aware formatting utilities (UI language kept separate from content language).
export const LOCALE = "en-IN";
// Fixed "demo now" so deterministic mock dates stay coherent: Thu 19 Nov 2026, 10:30 IST.
export const DEMO_NOW = new Date("2026-11-19T10:30:00+05:30");
export const TZ_LABEL = "IST (UTC+5:30)";

export const fmtDate = (d: string | Date, o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: "Asia/Kolkata", ...o }).format(new Date(d));
export const fmtTime = (d: string | Date) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d));
export const fmtDateTime = (d: string | Date) => `${fmtDate(d, { day: "numeric", month: "short" })}, ${fmtTime(d)} IST`;
export const fmtNum = (n: number) => new Intl.NumberFormat(LOCALE).format(n);
export const fmtCompact = (n: number) => new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 }).format(n);
export const fmtPct = (n: number, digits = 0) => `${n.toFixed(digits)}%`;
export const fmtMoney = (n: number, currency = "INR") =>
  new Intl.NumberFormat(LOCALE, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
export const fmtLakh = (n: number) => (n >= 100000 ? `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} lakh` : fmtNum(n));

export function relTime(d: string | Date, now: Date = DEMO_NOW) {
  const diff = (new Date(d).getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return fmtDate(d);
}
// helper to build ISO dates relative to demo-now
export const inDays = (days: number, hour = 10, minute = 0) => {
  const d = new Date(DEMO_NOW);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
export const ago = (minutes: number) => new Date(DEMO_NOW.getTime() - minutes * 60000).toISOString();
