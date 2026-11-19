import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, tone = "surface", ...p }: React.HTMLAttributes<HTMLDivElement> & { tone?: "surface" | "lilac" | "plain" | "dark" }) {
  return (
    <div
      className={cn(
        "rounded-[1.25rem] border",
        tone === "surface" && "bg-surface border-border shadow-soft",
        tone === "lilac" && "bg-lilac border-transparent",
        tone === "plain" && "bg-surface-2 border-transparent",
        tone === "dark" && "bg-[#1d1b4b] text-white border-transparent",
        className
      )}
      {...p}
    />
  );
}
export const CardBody = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("p-4 sm:p-5", className)} {...p} />;
