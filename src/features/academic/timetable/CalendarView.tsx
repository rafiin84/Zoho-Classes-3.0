"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button, Card, CardBody, SectionHeader, Badge, ErrorState, SkeletonCards, cn } from "@/components/ui";
import { timetableService } from "@/lib/api/timetableService";
import { PERIODS } from "./common";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function CalendarView() {
  const q = useQuery({ queryKey: ["academic", "tt", "calendar"], queryFn: timetableService.calendar });
  const [ym, setYm] = React.useState({ y: 2026, m: 10 });
  if (q.isLoading) return <SkeletonCards n={2} h="h-40" />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const cal = q.data;
  const first = new Date(Date.UTC(ym.y, ym.m, 1)), days = new Date(Date.UTC(ym.y, ym.m + 1, 0)).getUTCDate(), lead = (first.getUTCDay() + 6) % 7;
  const iso = (d: number) => `${ym.y}-${String(ym.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const hol = (d: number) => cal.holidays.find((h) => h.date === iso(d));
  const inTerm = (d: number) => cal.terms.find((t) => t.kind === "term" && t.start <= iso(d) && iso(d) <= t.end);
  const exam = (d: number) => cal.terms.find((t) => t.kind === "exam-window" && t.start <= iso(d) && iso(d) <= t.end);
  const shift = (n: number) => setYm(({ y, m }) => { const t = y * 12 + m + n; return { y: Math.floor(t / 12), m: t % 12 }; });
  const cells = [...Array(lead).fill(0), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <Card><CardBody>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-heading">{MONTHS[ym.m]} {ym.y}</h3><div className="flex gap-1"><Button size="iconSm" variant="outline" aria-label="Previous month" onClick={() => shift(-1)}><CaretLeft /></Button><Button size="iconSm" variant="outline" aria-label="Next month" onClick={() => shift(1)}><CaretRight /></Button></div></div>
        <div role="grid" aria-label={`${MONTHS[ym.m]} ${ym.y} academic calendar`} className="grid grid-cols-7 gap-1 text-center text-xs">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} role="columnheader" className="py-1 font-semibold text-text-2">{d}</div>)}
          {cells.map((d, i) => d === 0 ? <div key={i} /> : (
            <div key={i} role="gridcell" title={hol(d)?.label ?? exam(d)?.label} className={cn("tnum flex min-h-12 flex-col items-center justify-center rounded-lg border border-border p-1", ((lead + d - 1) % 7) > 4 && "bg-surface-2 text-text-2", hol(d) && "border-highlight bg-highlight-soft font-bold", exam(d) && "border-primary bg-lilac", !inTerm(d) && "opacity-60")}>
              {d}{hol(d) && <span className="text-[9px] leading-tight">Holiday</span>}{exam(d) && !hol(d) && <span className="text-[9px] leading-tight text-primary">Exams</span>}
            </div>))}
        </div>
        <p className="mt-3 text-xs text-text-2">Weekends are non-working. Holidays and examination windows are marked with a text label as well as colour.</p>
      </CardBody></Card>
      <div className="space-y-5">
        <Card><CardBody><SectionHeader title="Terms" /><ul className="space-y-2 text-sm">{cal.terms.map((t) => <li key={t.id} className="flex items-center justify-between gap-2"><span>{t.label}</span><span className="tnum text-xs text-text-2">{t.start} → {t.end}</span></li>)}</ul></CardBody></Card>
        <Card><CardBody><SectionHeader title="Holidays" /><ul className="space-y-1.5 text-sm">{cal.holidays.map((h) => <li key={h.id} className="flex justify-between"><span>{h.label}</span><span className="tnum text-xs text-text-2">{h.date}</span></li>)}</ul></CardBody></Card>
        <Card><CardBody><SectionHeader title="Period structure" subtitle="Working days: Monday to Friday" />
          <ul className="space-y-1 text-sm">{PERIODS.map((p) => <li key={p.id} className="flex justify-between"><span className={p.kind === "break" ? "text-text-2" : "font-medium"}>{p.label} {p.kind === "break" && <Badge>Break</Badge>}</span><span className="tnum text-xs text-text-2">{p.start}–{p.end}</span></li>)}</ul></CardBody></Card>
      </div>
    </div>
  );
}
