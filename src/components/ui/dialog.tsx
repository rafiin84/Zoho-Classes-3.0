"use client";
import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ModalProps { open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode; className?: string }

/** Centered dialog on ≥sm, bottom sheet on phones. */
export function Modal({ open, onOpenChange, title, description, children, footer, className }: ModalProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-[#0b0c1f]/50 backdrop-blur-[2px]" />
        <D.Content aria-describedby={description ? undefined : undefined}
          className={cn("fixed z-[61] flex max-h-[90dvh] w-full flex-col bg-surface shadow-glow focus:outline-none inset-x-0 bottom-0 rounded-t-3xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl", className)}>
          <div className="flex items-start justify-between gap-4 p-5 pb-2">
            <div><D.Title className="text-heading">{title}</D.Title>{description ? <D.Description className="mt-1 text-sm text-text-2">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}</div>
            <D.Close asChild><Button variant="ghost" size="iconSm" aria-label="Close"><X size={18} /></Button></D.Close>
          </div>
          <div className="overflow-y-auto px-5 pb-5 pt-2">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border p-4 pb-safe">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Side/bottom drawer for detail views. */
export function Drawer({ open, onOpenChange, title, children, width = "sm:max-w-md" }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; children: React.ReactNode; width?: string }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-[#0b0c1f]/40" />
        <D.Content className={cn("fixed z-[61] flex max-h-[92dvh] flex-col bg-surface shadow-glow focus:outline-none inset-x-0 bottom-0 rounded-t-3xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:rounded-none sm:rounded-l-3xl", width)}>
          <div className="flex items-center justify-between border-b border-border p-4">
            <D.Title className="text-heading">{title}</D.Title>
            <D.Description className="sr-only">{title}</D.Description>
            <D.Close asChild><Button variant="ghost" size="iconSm" aria-label="Close"><X size={18} /></Button></D.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel = "Confirm", destructive, onConfirm }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; body: string; confirmLabel?: string; destructive?: boolean; onConfirm: () => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={body}
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant={destructive ? "danger" : "primary"} onClick={() => { onConfirm(); onOpenChange(false); }}>{confirmLabel}</Button></>}>
      <motion.div initial={false} />
    </Modal>
  );
}
