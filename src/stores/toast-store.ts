"use client";
import { create } from "zustand";
import { uid } from "@/lib/utils";

export interface Toast { id: string; title: string; description?: string; tone: "success" | "error" | "info" | "warning"; action?: { label: string; onClick: () => void } }
interface ToastState { toasts: Toast[]; push: (t: Omit<Toast, "id">) => string; dismiss: (id: string) => void }
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = uid("t");
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => get().dismiss(id), 4800);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
export const toast = {
  success: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: "success" }),
  error: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: "error" }),
  info: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: "info" }),
  warning: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: "warning" }),
};
