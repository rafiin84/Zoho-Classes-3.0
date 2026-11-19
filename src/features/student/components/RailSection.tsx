"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { Rail, EmptyState } from "@/components/ui";

/** Titled horizontal rail. Pass `empty` to show a friendly empty state instead of an empty rail. */
export function RailSection({ title, subtitle, action, children, empty, id }: { title: string; subtitle?: string; action?: { label: string; href: string }; children?: React.ReactNode; empty?: { title: string; body: string; action?: { label: string; href?: string } }; id?: string }) {
  const hasKids = React.Children.toArray(children).length > 0;
  return (
    <section aria-labelledby={id ? `${id}-h` : undefined} className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div><h2 id={id ? `${id}-h` : undefined} className="text-heading">{title}</h2>{subtitle && <p className="text-sm text-text-2">{subtitle}</p>}</div>
        {action && <Link href={action.href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{action.label}<ArrowRight size={14} weight="bold" /></Link>}
      </div>
      {hasKids ? <Rail>{children}</Rail> : empty ? <EmptyState title={empty.title} body={empty.body} action={empty.action} /> : null}
    </section>
  );
}
