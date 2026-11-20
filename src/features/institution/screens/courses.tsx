"use client";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Segmented, Button, Badge, StatusBadge, Drawer, Modal, Checkbox, ListToolbar, Select, NoResults, EmptyState, toast, ConfirmDialog, StatTile, Cover, Icon } from "@/components/ui";
import { courseService, type CourseWithState } from "@/lib/api/courseService";
import { governanceService } from "@/lib/api/governanceService";
import { subjectById } from "@/lib/mock-data/core";
import { fmtMoney, fmtDate } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { qualityChecks, checkTone } from "../quality";
import { useQ, Q, DataTable, DemoNote, onErr, Panel, useCtx } from "../kit";

const CLASSES = ["Grade 8 · A", "Grade 8 · B", "Grade 7 · A", "Grade 5 · A", "Grade 9 · C"];
export default function CoursesScreen(_: ScreenProps) {
  const { instName } = useCtx(); const qc = useQueryClient();
  const [tab, setTab] = React.useState<"catalogue" | "sales">("catalogue");
  const [q, setQ] = React.useState(""); const [status, setStatus] = React.useState(""); const [price, setPrice] = React.useState("");
  const [sel, setSel] = React.useState<CourseWithState | null>(null); const [dist, setDist] = React.useState<CourseWithState | null>(null); const [dc, setDc] = React.useState<string[]>([]); const [arch, setArch] = React.useState<CourseWithState | null>(null);
  const list = useQ(["courses"], () => courseService.list("stu-ananya")); const orders = useQ(["orders"], () => courseService.allOrders());
  const inval = () => { qc.invalidateQueries({ queryKey: ["inst", "courses"] }); qc.invalidateQueries({ queryKey: ["courses"] }); };
  const setSt = useMutation({ mutationFn: (v: { c: CourseWithState; s: "published" | "archived" | "draft" }) => courseService.setStatus(v.c.id, v.s), onSuccess: (c) => { toast.success(`“${c.title}” is now ${c.status}.`); governanceService.record({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: `Course ${c.status}`, category: "Content publication", target: c.title, context: "Courses & Content" }); inval(); setSel(null); setArch(null); }, onError: onErr });
  const own = (list.data ?? []).filter((c) => c.institutionId === "inst-greenfield" || c.kind === "marketplace");
  const rows = own.filter((c) => (!q || c.title.toLowerCase().includes(q.toLowerCase())) && (!status || c.status === status) && (!price || c.priceType === price));
  const clear = () => { setQ(""); setStatus(""); setPrice(""); };
  const publish = (c: CourseWithState) => { const bad = qualityChecks(c).filter((x) => x.state === "fail"); if (bad.length) return toast.error(`Fix before publishing: ${bad.map((b) => b.label).join(", ")}.`); setSt.mutate({ c, s: "published" }); };
  const paid = (orders.data ?? []);
  return (
    <div>
      <PageHeader title="Courses & Content" subtitle={`${instName} · catalogue, distribution, quality review and paid-course sales.`} />
      <div className="mb-4"><Segmented label="View" value={tab} onChange={setTab} options={[{ value: "catalogue", label: "Catalogue" }, { value: "sales", label: "Paid-course sales" }]} /></div>
      {tab === "catalogue" && <Q q={list}>{() => (
        <div>
          <ListToolbar query={q} onQuery={setQ} placeholder="Search courses" count={rows.length} hasFilters={!!(status || price)} onClear={clear}>
            <Select aria-label="Status" className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option><option>published</option><option>draft</option><option>archived</option></Select>
            <Select aria-label="Price" className="w-auto" value={price} onChange={(e) => setPrice(e.target.value)}><option value="">Free & paid</option><option value="free">Free</option><option value="paid">Paid</option></Select>
          </ListToolbar>
          {!own.length ? <EmptyState title="No courses yet" body="Create one in the AI Content Studio or buy from the Marketplace." action={{ label: "Open AI Content Studio", href: "/institution/studio" }} /> : !rows.length ? <NoResults query={q} onClear={clear} /> :
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-[1.25rem] border border-border bg-surface shadow-soft">
                <Cover from={c.cover.from} to={c.cover.to} image={(c.cover as any).image} className="h-20" icon={<Icon name={c.cover.icon} size={32} />} rounded="rounded-none" />
                <div className="space-y-2 p-4"><div className="flex flex-wrap gap-1.5"><StatusBadge status={c.status} /><Badge>{subjectById(c.subjectId).name}</Badge><Badge tone={c.priceType === "paid" ? "highlight" : "neutral"}>{c.priceType === "paid" ? fmtMoney(c.price) : "Free"}</Badge></div>
                  <h3 className="font-semibold leading-snug">{c.title}</h3><p className="text-xs text-text-2">v{c.version} · {c.moduleCount} modules · {c.lessonCount} lessons · by {c.creatorName}</p>
                  <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setSel(c)}>Quality checks</Button><Button size="sm" variant="outline" disabled={c.status !== "published"} onClick={() => { setDist(c); setDc([]); }}>Distribute</Button>
                    {c.status === "published" ? <Button size="sm" variant="ghost" onClick={() => setArch(c)}>Archive</Button> : c.status === "archived" ? <Button size="sm" variant="ghost" onClick={() => setSt.mutate({ c, s: "draft" })}>Restore draft</Button> : <Button size="sm" onClick={() => publish(c)} loading={setSt.isPending && setSt.variables?.c.id === c.id}>Publish</Button>}</div></div>
              </div>))}</div>}
        </div>)}</Q>}
      {tab === "sales" && <Q q={orders}>{() => (
        <div className="space-y-4"><DemoNote>Paid-course sales are separate from institutional fees (see Fees & Finance). Amounts and revenue share are illustrative; no real payments.</DemoNote>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><StatTile label="Orders" value={paid.length} /><StatTile label="Gross" value={fmtMoney(paid.filter((o) => o.status === "Successful").reduce((s, o) => s + o.amount, 0))} /><StatTile label="Platform fees (10%)" value={fmtMoney(Math.round(paid.filter((o) => o.status === "Successful").reduce((s, o) => s + o.amount, 0) * 0.1))} /><StatTile label="Creator/institution share" value={fmtMoney(Math.round(paid.filter((o) => o.status === "Successful").reduce((s, o) => s + o.amount, 0) * 0.9))} /></div>
          {!paid.length ? <EmptyState title="No paid-course sales yet" body="When students buy paid courses, orders appear here." /> : <DataTable ariaLabel="Course orders" rows={paid} rowKey={(o) => o.id} cols={[
            { key: "c", header: "Course", cell: (o) => <span><b>{list.data?.find((c) => c.id === o.courseId)?.title ?? o.courseId}</b><span className="block text-xs text-text-2">Seller: {o.sellerName}</span></span> }, { key: "s", header: "Buyer", cell: (o) => o.studentId },
            { key: "g", header: "Gross", cell: (o) => fmtMoney(o.amount), align: "right", sort: (a, b) => a.amount - b.amount }, { key: "f", header: "Fee", cell: (o) => fmtMoney(Math.round(o.amount * 0.1)), align: "right" }, { key: "r", header: "Share", cell: (o) => fmtMoney(Math.round(o.amount * 0.9)), align: "right" },
            { key: "st", header: "Status", cell: (o) => <StatusBadge status={o.status} /> }, { key: "e", header: "Enrolment", cell: (o) => <StatusBadge status={o.entitlementStatus === "active" ? "active" : "pending"} label={o.entitlementStatus === "active" ? "Enrolled" : "Not enrolled"} /> },
            { key: "rf", header: "Refund", cell: (o) => <Badge>{o.status === "Refunded" ? "Refunded" : "None requested"}</Badge> }, { key: "d", header: "Date", cell: (o) => fmtDate(o.at) }]} />}
        </div>)}</Q>}

      <Drawer open={!!sel} onOpenChange={(v) => !v && setSel(null)} title={sel?.title ?? ""}>
        {sel && <div className="space-y-3"><DemoNote tone="info">Automated checks are a guide. A human reviewer must confirm before publishing.</DemoNote>
          <ul className="space-y-2">{qualityChecks(sel, (list.data ?? []).filter((c) => c.title.split(":")[0] === sel.title.split(":")[0]).length > 1).map((c) => <li key={c.key} className="flex items-start justify-between gap-2 rounded-xl border border-border p-3 text-sm"><span><b>{c.label}</b><span className="block text-xs text-text-2">{c.note}</span></span><Badge tone={checkTone(c.state)}>{c.state}</Badge></li>)}</ul>
          {sel.status !== "published" && <Button className="w-full" onClick={() => publish(sel)}>Approve as reviewer & publish</Button>}</div>}
      </Drawer>
      <Modal open={!!dist} onOpenChange={(v) => !v && setDist(null)} title={`Distribute “${dist?.title}”`} footer={<><Button variant="ghost" onClick={() => setDist(null)}>Cancel</Button><Button disabled={!dc.length} onClick={() => { toast.success(`Assigned to ${dc.join(", ")}. Students now see it under Courses.`); governanceService.record({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: "Distributed course", category: "Content publication", target: `${dist?.title} → ${dc.join(", ")}`, context: "Courses & Content" }); setDist(null); }}>Distribute</Button></>}>
        <div className="space-y-2">{CLASSES.map((c) => <Checkbox key={c} label={c} checked={dc.includes(c)} onChange={(v) => setDc(v ? [...dc, c] : dc.filter((x) => x !== c))} />)}</div>
      </Modal>
      <ConfirmDialog open={!!arch} onOpenChange={(v) => !v && setArch(null)} destructive title="Archive this course?" body="Enrolled students keep read-only access; new enrolment stops." confirmLabel="Archive" onConfirm={() => arch && setSt.mutate({ c: arch, s: "archived" })} />
    </div>
  );
}
