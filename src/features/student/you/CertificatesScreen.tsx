"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Medal } from "@phosphor-icons/react";
import { portfolioService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import type { StudentCertificate } from "@/types/portfolio";
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, ListToolbar, Modal, NoResults, PageHeader, SkeletonCards, toast } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { communityKeys } from "../community/keys";

export default function CertificatesScreen() {
  const { studentId } = useActors();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState<StudentCertificate | null>(null);
  const query = useQuery({ queryKey: [...communityKeys.portfolio(studentId), "certificates"], queryFn: () => portfolioService.certificates(studentId), retry: false });
  const list = (query.data ?? []).filter((c) => !q || (c.title + c.issuer).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Certificates" subtitle="Everything you've earned in one place. Previews here are demo and unofficial." />
      <ListToolbar query={q} onQuery={setQ} placeholder="Search certificates" count={query.isSuccess ? list.length : undefined} onClear={() => setQ("")} />
      {query.isPending && <SkeletonCards n={3} h="h-24" />}
      {query.isError && <ErrorState onRetry={() => query.refetch()} />}
      {query.isSuccess && (query.data.length === 0 ? <EmptyState title="No certificates yet" body="Take part in an event or finish a course and your certificate appears here." action={{ label: "Browse events", href: "/student/events" }} /> : list.length === 0 ? <NoResults onClear={() => setQ("")} query={q} /> : (
        <ul className="space-y-3">{list.map((c) => (
          <li key={c.id}><Card><CardBody className="flex flex-wrap items-center gap-3 !p-4"><span className="flex size-12 items-center justify-center rounded-2xl bg-lilac text-primary"><Medal size={26} weight="duotone" /></span>
            <div className="min-w-0 flex-1"><p className="font-semibold">{c.title}</p><p className="text-xs text-text-2">{c.issuer} · {fmtDate(c.date)}</p><Badge className="mt-1" tone="highlight">Demo · unofficial</Badge></div>
            <Button variant="soft" size="sm" onClick={() => setOpen(c)}>Preview</Button></CardBody></Card></li>
        ))}</ul>
      ))}
      <p className="mt-4 text-xs text-text-2">These are not institution-certified credentials. For an official record, <Link className="underline" href="/student/you/portfolio">request one from your school</Link>.</p>
      <Modal open={!!open} onOpenChange={(o) => !o && setOpen(null)} title="Certificate preview" description="Demo preview — not an official certificate." footer={<><Button variant="ghost" onClick={() => setOpen(null)}>Close</Button><Button onClick={() => toast.success("Download simulated", "No real file is created in this demo.")}>Download (demo)</Button></>}>
        {open && <div className="rounded-2xl border-4 border-double border-primary/40 bg-lilac p-6 text-center"><Medal size={40} weight="duotone" className="mx-auto text-primary" /><p className="mt-2 text-xs font-semibold uppercase tracking-widest text-text-2">Certificate of {open.kind === "participation" ? "participation" : open.kind === "course" ? "completion" : "achievement"}</p><p className="mt-3 text-xl font-bold">{open.title}</p><p className="mt-2 text-sm text-text-2">{open.detail}</p><p className="mt-3 text-xs text-text-2">Issued by {open.issuer} · {fmtDate(open.date)}</p><Badge tone="highlight" className="mt-3">Demo · unofficial</Badge></div>}
      </Modal>
    </div>
  );
}
