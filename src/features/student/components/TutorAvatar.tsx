"use client";
import { motion } from "framer-motion";
import { Icon, cn } from "@/components/ui";
import { TUTOR_AVATARS } from "@/lib/mock-data/tutor";

/** Illustrated tutor mascot: gradient blob, expressive eyes that blink, little accessory icon. */
export function TutorAvatar({ avatarId, size = 44, className, ring }: { avatarId: string; size?: number; className?: string; ring?: boolean }) {
  const a = TUTOR_AVATARS.find((x) => x.id === avatarId) ?? TUTOR_AVATARS[0];
  const e = size * 0.11;
  return (
    <span role="img" aria-label={`${a.label} avatar`} className={cn("relative inline-flex shrink-0 items-center justify-center rounded-[34%]", ring && "ring-2 ring-white/70", className)}
      style={{ width: size, height: size, background: `radial-gradient(circle at 30% 25%, color-mix(in srgb, ${a.color} 40%, white), ${a.color} 70%)`, boxShadow: `0 ${size * 0.08}px ${size * 0.2}px -${size * 0.06}px ${a.color}` }}>
      <span aria-hidden className="absolute left-[16%] top-[12%] h-[16%] w-[26%] rotate-[-25deg] rounded-full bg-white/45" />
      <span aria-hidden className="absolute flex gap-[22%]" style={{ top: "38%", width: "46%" }}>
        {[0, 1].map((i) => (
          <motion.span key={i} className="block flex-1 rounded-full bg-white" style={{ height: e * 2.2, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.04)" }} animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.94, 0.97, 1] }}>
            <span className="absolute rounded-full bg-[#202333]" style={{ width: e * 1.1, height: e * 1.1, bottom: e * 0.4, left: "50%", marginLeft: -e * 0.55 }} />
          </motion.span>
        ))}
      </span>
      <span aria-hidden className="absolute rounded-b-full border-b-2 border-white/90" style={{ top: "64%", width: "24%", height: "11%" }} />
      <span aria-hidden className="absolute -right-[6%] -top-[6%] flex items-center justify-center rounded-full bg-white text-primary shadow-soft" style={{ width: size * 0.34, height: size * 0.34 }}><Icon name={a.icon} size={size * 0.2} weight="fill" /></span>
    </span>
  );
}
