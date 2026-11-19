"use client";
import { Fire, Check } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TODAY_INDEX } from "../hooks";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Streak + weekly calendar. Positive framing: a quiet day is just a quiet day. */
export function WeekDots({ weekDays, className }: { weekDays: boolean[]; className?: string }) {
  return (
    <ul className={cn("flex items-center gap-1.5", className)} aria-label="This week">
      {DAYS.map((d, i) => {
        const done = !!weekDays[i]; const today = i === TODAY_INDEX; const future = i > TODAY_INDEX;
        return (
          <li key={i} className="flex flex-col items-center gap-1" aria-label={`${DAY_NAMES[i]}: ${done ? "learned" : future ? "upcoming" : today ? "today" : "rest day"}`}>
            <motion.span initial={false} animate={{ scale: done ? 1 : 0.95 }} className={cn("flex size-7 items-center justify-center rounded-full text-[11px] font-bold", done ? "bg-primary text-primary-fg" : today ? "border-2 border-primary text-primary" : "bg-surface-2 text-text-2", future && "opacity-60")}>
              {done ? <Check size={14} weight="bold" /> : d}
            </motion.span>
            <span className={cn("text-[10px] font-semibold", today ? "text-primary" : "text-text-2")}>{today ? "Today" : d}</span>
          </li>
        );
      })}
    </ul>
  );
}
export function StreakFlame({ streak, size = 56, glow }: { streak: number; size?: number; glow?: boolean }) {
  return (
    <div className="relative flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-highlight to-[#f08a5d]/80 text-[#5b3b00]" style={{ width: size, height: size }}>
      {glow && <motion.span aria-hidden className="absolute inset-0 rounded-2xl bg-highlight/50" animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.18, 1] }} transition={{ duration: 2.4, repeat: Infinity }} />}
      <div className="relative flex flex-col items-center leading-none"><Fire size={size * 0.38} weight="fill" /><span className="tnum mt-0.5 text-sm font-extrabold">{streak}</span></div>
    </div>
  );
}
