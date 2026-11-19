"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-primary-hover shadow-soft",
        soft: "bg-lilac text-primary hover:bg-lavender/40",
        outline: "border border-border bg-surface text-text hover:bg-surface-2",
        ghost: "text-text-2 hover:bg-surface-2 hover:text-text",
        danger: "bg-danger text-white hover:opacity-90",
        success: "bg-success text-white hover:opacity-90",
        dark: "bg-text text-bg hover:opacity-90",
      },
      size: { sm: "h-9 px-3.5 text-sm", md: "h-11 px-5 text-sm", lg: "h-12 px-6 text-base", icon: "h-11 w-11", iconSm: "h-9 w-9" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; loading?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
  const cls = cn(buttonVariants({ variant, size }), className);
  if (asChild) return <Slot ref={ref as any} className={cls} {...props}>{children}</Slot>;
  return (
    <motion.button ref={ref as any} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...(props as any)}>
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </motion.button>
  );
});
Button.displayName = "Button";
