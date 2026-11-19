"use client";
import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Cover, Icon, Progress, Badge, cn } from "@/components/ui";
import type { Tone } from "@/components/ui";

export interface ContentCardProps {
  href?: string; onClick?: () => void;
  cover: { from: string; to: string; icon: string };
  eyebrow?: string; title: string; meta?: React.ReactNode; badge?: { label: string; tone?: Tone; icon?: React.ReactNode };
  progress?: number; progressLabel?: string;
  /** "rail" = fixed-width card for horizontal rails; "wide" = editorial full-width; "row" = compact list row */
  variant?: "rail" | "wide" | "row"; footer?: React.ReactNode; overlay?: React.ReactNode; className?: string; ariaLabel?: string;
}
/** Stable generic content card used by every discovery rail. Cover + text + optional progress/actions. */
export function ContentCard({ href, onClick, cover, eyebrow, title, meta, badge, progress, progressLabel, variant = "rail", footer, overlay, className, ariaLabel }: ContentCardProps) {
  const inner = (
    <>
      <Cover from={cover.from} to={cover.to} rounded={variant === "row" ? "rounded-xl" : "rounded-t-[1.25rem] rounded-b-none"}
        className={cn(variant === "row" ? "size-16 shrink-0" : variant === "wide" ? "h-40 w-full sm:h-48" : "h-28 w-full")}
        icon={<Icon name={cover.icon} size={variant === "row" ? 26 : variant === "wide" ? 52 : 38} weight="duotone" />}>
        {badge && variant !== "row" && <Badge tone={badge.tone ?? "neutral"} icon={badge.icon} className="absolute left-3 top-3 bg-surface/90 backdrop-blur">{badge.label}</Badge>}
      </Cover>
      <div className={cn("min-w-0", variant === "row" ? "flex-1" : "p-3.5")}>
        {eyebrow && <p className="text-label truncate text-text-2">{eyebrow}</p>}
        <h3 className={cn("line-clamp-2 font-semibold leading-snug tracking-tight", variant === "wide" ? "text-lg" : "text-[15px]")}>{title}</h3>
        {meta && <div className="mt-1 text-xs text-text-2">{meta}</div>}
        {progress !== undefined && <div className="mt-2.5"><Progress value={progress} size="sm" label={progressLabel ?? "Progress"} /><p className="tnum mt-1 text-[11px] font-medium text-text-2">{progress}% complete</p></div>}
        {badge && variant === "row" && <Badge tone={badge.tone ?? "neutral"} icon={badge.icon} className="mt-1.5">{badge.label}</Badge>}
        {footer && <div className="mt-2.5">{footer}</div>}
      </div>
    </>
  );
  const cls = cn("group relative block overflow-hidden rounded-[1.25rem] border border-border bg-surface text-left shadow-soft transition-shadow hover:shadow-card focus-visible:outline-2",
    variant === "rail" && "w-[220px] shrink-0 sm:w-[240px]", variant === "row" && "flex items-center gap-3 p-2.5", className);
  const body = href ? <Link href={href} aria-label={ariaLabel} className={cn(cls, "block")}>{inner}</Link> : onClick ? <button type="button" onClick={onClick} aria-label={ariaLabel} className={cn(cls, "w-full")}>{inner}</button> : <div className={cls}>{inner}</div>;
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} className={cn("relative", variant === "rail" && "shrink-0")}>
      {body}
      {overlay && <div className="absolute right-2 top-2 z-10 flex gap-1">{overlay}</div>}
    </motion.div>
  );
}
