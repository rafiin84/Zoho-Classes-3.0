"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

const base = "w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-text placeholder:text-text-2/70 focus-visible:outline-2 disabled:opacity-60 aria-[invalid=true]:border-danger";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => <input ref={ref} className={cn(base, "h-11", className)} {...p} />);
Input.displayName = "Input";
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => <textarea ref={ref} className={cn(base, "min-h-24 py-3 resize-y", className)} {...p} />);
Textarea.displayName = "Textarea";
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...p }, ref) => (
  <select ref={ref} className={cn(base, "h-11 pr-8 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 256 256%22 fill=%22%23888%22><path d=%22M213.66 101.66l-80 80a8 8 0 01-11.32 0l-80-80a8 8 0 0111.32-11.32L128 164.69l74.34-74.35a8 8 0 0111.32 11.32z%22/></svg>')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat", className)} {...p}>{children}</select>
));
Select.displayName = "Select";

export function Field({ label, hint, error, required, optional, children, htmlFor, className }: { label: string; hint?: string; error?: string; required?: boolean; optional?: boolean; children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-semibold text-text">
        {label}
        {required && <span className="text-danger" aria-hidden>*</span>}
        {optional && <span className="text-xs font-normal text-text-2">Optional</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-text-2">{hint}</p>}
      {error && <p role="alert" className="text-xs font-medium text-danger">Fix this: {error}</p>}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; id?: string }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-primary" : "bg-border")}>
      <span className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 rounded accent-[var(--primary)]" />
      {label}
    </label>
  );
}
export function Slider({ value, onChange, min = 0, max = 100, label, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string; step?: number }) {
  return <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--primary)]" />;
}
