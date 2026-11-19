"use client";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Info, WarningCircle, XCircle, X } from "@phosphor-icons/react";
import { useToastStore } from "@/stores/toast-store";
import { cn } from "@/lib/utils";

const icons = { success: CheckCircle, error: XCircle, info: Info, warning: WarningCircle };
const tint = { success: "text-success", error: "text-danger", info: "text-info", warning: "text-warning" };
export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:right-auto sm:items-start lg:left-auto lg:right-6 lg:bottom-24" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => {
          const I = icons[t.tone];
          return (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-card" role="status">
              <I size={22} weight="fill" className={cn("mt-0.5 shrink-0", tint[t.tone])} />
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{t.title}</p>{t.description && <p className="text-xs text-text-2">{t.description}</p>}</div>
              {t.action && <button className="text-xs font-bold text-primary" onClick={t.action.onClick}>{t.action.label}</button>}
              <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-text-2"><X size={14} /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
