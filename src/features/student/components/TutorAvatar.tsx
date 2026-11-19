"use client";
import { Icon, cn } from "@/components/ui";
import { TUTOR_AVATARS } from "@/lib/mock-data/tutor";

/** Ready-made illustrated tutor avatar (gradient tile + Phosphor icon). */
export function TutorAvatar({ avatarId, size = 44, className, ring }: { avatarId: string; size?: number; className?: string; ring?: boolean }) {
  const a = TUTOR_AVATARS.find((x) => x.id === avatarId) ?? TUTOR_AVATARS[0];
  return (
    <span role="img" aria-label={`${a.label} avatar`} className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[32%] text-white", ring && "ring-2 ring-white/60", className)}
      style={{ width: size, height: size, background: `linear-gradient(145deg, ${a.color}, color-mix(in srgb, ${a.color} 40%, #b8b5ff))` }}>
      <span aria-hidden className="absolute -right-2 -top-2 size-1/2 rounded-full bg-white/25" />
      <Icon name={a.icon} size={size * 0.52} weight="fill" className="relative" />
    </span>
  );
}
