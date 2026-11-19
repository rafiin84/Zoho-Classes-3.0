"use client";
import { useMemo } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

const COLORS = ["#5146E5", "#7044D8", "#B8B5FF", "#F5C66A", "#9A93F5", "#4338CA"];
/** Celebratory burst. Renders nothing when the user prefers reduced motion. Purely decorative (aria-hidden). */
export function Confetti({ show, count = 34, originY = "40%" }: { show: boolean; count?: number; originY?: string }) {
  const reduce = useReducedMotion();
  const pieces = useMemo(() => Array.from({ length: count }).map((_, i) => {
    const a = (i / count) * Math.PI * 2 + (i % 3) * 0.3; const r = 120 + ((i * 53) % 140);
    return { i, x: Math.cos(a) * r, y: Math.sin(a) * r - 60, rot: (i * 97) % 360, size: 6 + ((i * 7) % 7), color: COLORS[i % COLORS.length], round: i % 3 === 0 };
  }), [count]);
  if (reduce) return null;
  return (
    <AnimatePresence>
      {show && (
        <div aria-hidden className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center" style={{ top: originY }}>
          {pieces.map((p) => (
            <motion.span key={p.i} className="absolute block" style={{ width: p.size, height: p.round ? p.size : p.size * 0.5, background: p.color, borderRadius: p.round ? 999 : 2 }}
              initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 0.4 }} animate={{ opacity: [1, 1, 0], x: p.x, y: [0, p.y, p.y + 180], rotate: p.rot * 2, scale: 1 }}
              transition={{ duration: 1.7, ease: "easeOut", delay: (p.i % 6) * 0.02 }} />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
