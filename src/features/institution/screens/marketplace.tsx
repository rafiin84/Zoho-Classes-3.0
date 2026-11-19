"use client";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Plus } from "@phosphor-icons/react";
import { PageHeader, Segmented, Card, Button, Badge, StatusBadge, Drawer, Modal, Field, Input, Select, ListToolbar, NoResults, EmptyState, ConfirmDialog, toast, StatTile, Cover, Icon, Avatar, DemoTag } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { marketplaceService } from "@/lib/api/marketplaceService";
import { fmtMoney, fmtDate, relTime } from "@/lib/format";
import type { MarketListing, LicenceType, ListingKind } from "@/types/institution";
import type { ScreenProps } from "@/types/screens";
import { useQ, Q, DataTable, DemoNote, onErr, Panel, ReasonModal } from "../kit";
import { CreatorWizard } from "../components/CreatorWizard";

const KINDS: ("All" | ListingKind)[] = ["All", "AI Teacher", "Course", "Lesson", "Assignment", "Question paper", "MCQ bank", "Video", "PDF", "Presentation", "Notes", "E-book", "Game", "Simulation", "Rubric"];
const LICENCES: LicenceType[] = ["Free", "One-time", "Subscription", "Institution licence", "Government / bulk"];
type Tab = "browse" | "licences" | "creator" | "creators";
const stars = (n: number) => <span className="inline-flex items-center gap-0.5 tnum text-xs" aria-label={`${n} out of 5`}><Star size={13} weight="fill" className="text-highlight" />{n ? n.toFixed(1) : "New"}</span>;

export default function MarketplaceScreen(_: ScreenProps) {
  const [tab, setTab] = React.useState<Tab>("browse");
  return (
    <div>
      <PageHeader title="Education Marketplace" subtitle="Unified marketplace for AI Teachers, courses and learning content — public curated and private institutional catalogues." actions={<DemoTag label="Simulated procurement" />} />
      <DemoNote>No real payments happen here. Licences, receipts and revenue are demo values. Cross-institution sharing is explicit and permissioned.</DemoNote>
      <div className="mb-5 overflow-x-auto"><Segmented label="Marketplace sections" value={tab} onChange={setTab} options={[{ value: "browse", label: "Browse" }, { value: "licences", label: "Entitlements & licences" }, { value: "creator", label: "Creator studio" }, { value: "creators", label: "Creators" }]} /></div>
      {tab === "browse" && <Browse />}{tab === "licences" && <Licences />}{tab === "creator" && <Creator />}{tab === "creators" && <Creators />}
    </div>
  );
}

function Browse() {
  const qc = useQueryClient(); const [cat, setCat] = React.useState<"public" | "private">("public"); const [kind, setKind] = React.useState<(typeof KINDS)[number]>("All");
  const [q, setQ] = React.useState(""); const [f, setF] = React.useState({ subject: "", grade: "", language: "", price: "", licence: "" }); const [sel, setSel] = React.useState<MarketListing | null>(null); const [buy, setBuy] = React.useState<MarketListing | null>(null);
  const [seats, setSeats] = React.useState(25); const [lic, setLic] = React.useState<LicenceType>("Institution licence");
  const list = useQ(["mk-list"], () => marketplaceService.list());
  const ents = useQ(["mk-ents"], () => marketplaceService.entitlements());
  const pur = useMutation({ mutationFn: () => marketplaceService.purchase(buy!.id, seats, lic), onSuccess: (e) => { toast.success(`Simulated procurement complete. Licence ${e.ref} added (no payment taken).`); qc.invalidateQueries({ queryKey: ["inst", "mk-ents"] }); qc.invalidateQueries({ queryKey: ["inst", "mk-list"] }); setBuy(null); setSel(null); }, onError: onErr });
  const all = list.data ?? [];
  const opts = (k: "subject" | "grade" | "language") => [...new Set(all.map((l) => l[k]))];
  const rows = all.filter((l) => l.scope === cat && ["approved", "suspended"].includes(l.status) && (kind === "All" || l.kind === kind) && (!q || `${l.title} ${l.creator}`.toLowerCase().includes(q.toLowerCase())) && (!f.subject || l.subject === f.subject) && (!f.grade || l.grade === f.grade) && (!f.language || l.language === f.language) && (!f.licence || l.licence === f.licence) && (!f.price || (f.price === "free" ? l.price === 0 : l.price > 0)));
  const clear = () => { setQ(""); setKind("All"); setF({ subject: "", grade: "", language: "", price: "", licence: "" }); };
  const owned = (id: string) => ents.data?.some((e) => e.listingId === id && e.status === "active");
  return (
    <div>
      <div className="mb-3"><Segmented label="Catalogue" value={cat} onChange={setCat} options={[{ value: "public", label: "Public curated" }, { value: "private", label: "Private (our institution)" }]} /></div>
      <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto" role="group" aria-label="Category">{KINDS.map((k) => <Button key={k} size="sm" variant={kind === k ? "primary" : "outline"} onClick={() => setKind(k)}>{k}</Button>)}</div>
      <ListToolbar query={q} onQuery={setQ} placeholder="Search marketplace" count={rows.length} hasFilters={kind !== "All" || Object.values(f).some(Boolean)} onClear={clear}>
        {([["subject", "Subject", opts("subject")], ["grade", "Grade", opts("grade")], ["language", "Language", opts("language")], ["licence", "Licence", LICENCES as string[]]] as const).map(([k, l, o]) => <Select key={k} aria-label={l} className="w-auto max-w-36" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}><option value="">{l}</option>{o.map((x) => <option key={x}>{x}</option>)}</Select>)}
        <Select aria-label="Price" className="w-auto" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })}><option value="">Price</option><option value="free">Free</option><option value="paid">Paid</option></Select>
      </ListToolbar>
      <Q q={list}>{() => !rows.length ? (all.some((l) => l.scope === cat) ? <NoResults query={q} onClear={clear} /> : <EmptyState title="Nothing in this catalogue" body="Publish a package privately from the Creator studio." />) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map((l) => (
          <Card key={l.id} className="overflow-hidden"><Cover from={l.kind === "AI Teacher" ? "#5146E5" : "#1D6FB8"} to={l.kind === "AI Teacher" ? "#B8B5FF" : "#7044D8"} className="h-16" rounded="rounded-none" icon={<Icon name={l.kind === "AI Teacher" ? "Robot" : "BookBookmark"} size={26} />} />
            <div className="space-y-2 p-4"><div className="flex flex-wrap gap-1.5"><Badge tone={l.kind === "AI Teacher" ? "ai" : "primary"}>{l.kind}</Badge><Badge>{l.licence}</Badge>{l.status === "suspended" && <Badge tone="danger">Suspended</Badge>}</div>
              <h3 className="font-semibold leading-snug">{l.title}</h3><p className="text-xs text-text-2">{l.creator} · {l.subject} · {l.grade} · {l.language}</p>
              <div className="flex items-center justify-between">{stars(l.rating)}<span className="tnum text-sm font-bold">{l.price ? fmtMoney(l.price) : "Free"}</span></div>
              <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSel(l)}>Details</Button>{owned(l.id) ? <Badge tone="success">Licensed</Badge> : <Button size="sm" disabled={l.status !== "approved"} onClick={() => { setBuy(l); setLic(l.licence === "Free" ? "Free" : l.licence); setSeats(25); }}>{l.licence === "Free" ? "Add" : "Procure"}</Button>}</div></div></Card>))}</div>)}</Q>
      <Drawer open={!!sel} onOpenChange={(v) => !v && setSel(null)} title={sel?.title ?? ""} width="sm:max-w-lg">
        {sel && <div className="space-y-4 text-sm"><div className="flex flex-wrap gap-2"><Badge tone={sel.kind === "AI Teacher" ? "ai" : "primary"}>{sel.kind}</Badge><StatusBadge status={sel.status} /><Badge>v{sel.version}</Badge></div><p>{sel.summary}</p>
          <dl className="grid grid-cols-2 gap-2 text-xs"><div><dt className="font-semibold">Creator</dt><dd>{sel.creator}</dd></div><div><dt className="font-semibold">Licence</dt><dd>{sel.licence}</dd></div><div><dt className="font-semibold">Updated</dt><dd>{relTime(sel.updatedAt)}</dd></div><div><dt className="font-semibold">Rating</dt><dd>{sel.rating || "n/a"} ({sel.reviews} reviews)</dd></div></dl>
          <Panel title="Reviews (demo)">{sel.reviewList.length ? <ul className="space-y-2">{sel.reviewList.map((r, i) => <li key={i}><b>{r.stars}/5</b> · {r.who}<span className="block text-xs text-text-2">{r.text}</span></li>)}</ul> : <p className="text-text-2">No reviews yet.</p>}</Panel>
          {sel.kind === "AI Teacher" && <DemoNote tone="info">AI Teachers must be approved by your institution before students can use them, even after purchase.</DemoNote>}
          <Button onClick={() => { setBuy(sel); setLic(sel.licence); setSeats(25); }} disabled={sel.status !== "approved" || owned(sel.id)}>{owned(sel.id) ? "Already licensed" : "Procure (simulated)"}</Button></div>}
      </Drawer>
      <Modal open={!!buy} onOpenChange={(v) => !v && setBuy(null)} title={`Procure “${buy?.title}”`} description="Simulated checkout — no real payment."
        footer={<><Button variant="ghost" onClick={() => setBuy(null)}>Cancel</Button><Button loading={pur.isPending} onClick={() => pur.mutate()}>Confirm procurement</Button></>}>
        <div className="space-y-3"><Field label="Licence" htmlFor="pc-l"><Select id="pc-l" value={lic} onChange={(e) => setLic(e.target.value as LicenceType)}>{LICENCES.map((l) => <option key={l}>{l}</option>)}</Select></Field><Field label="Seats" htmlFor="pc-s"><Input id="pc-s" type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))} /></Field>
          <p className="tnum text-sm">Total (demo): <b>{fmtMoney((buy?.price ?? 0) * (lic === "Institution licence" || lic === "Government / bulk" ? 1 : seats))}</b></p></div>
      </Modal>
    </div>
  );
}

function Licences() {
  const qc = useQueryClient(); const l = useQ(["mk-ents"], () => marketplaceService.entitlements()); const [share, setShare] = React.useState<string | null>(null); const [partner, setPartner] = React.useState("Meridian University");
  const inv = () => { qc.invalidateQueries({ queryKey: ["inst", "mk-ents"] }); qc.invalidateQueries({ queryKey: ["inst", "audit"] }); };
  const set = useMutation({ mutationFn: (v: { id: string; s: "active" | "revoked" }) => marketplaceService.setEntitlement(v.id, v.s), onSuccess: () => { toast.success("Licence updated."); inv(); }, onError: onErr });
  const sh = useMutation({ mutationFn: () => marketplaceService.shareEntitlement(share!, partner), onSuccess: () => { toast.success(`Shared with ${partner} (audited).`); setShare(null); inv(); }, onError: onErr });
  return (
    <Q q={l}>{(rows) => !rows.length ? <EmptyState title="No licences yet" body="Procure items from Browse to see entitlements here." /> : (
      <div><DataTable ariaLabel="Entitlements" rows={rows} rowKey={(e) => e.id} cols={[{ key: "t", header: "Item", cell: (e) => <span><b>{e.title}</b><span className="block text-xs text-text-2">{e.ref} · {e.licence}</span></span> }, { key: "s", header: "Seats", cell: (e) => `${e.used}/${e.seats}`, align: "right" }, { key: "ex", header: "Expires", cell: (e) => (e.expiresAt ? fmtDate(e.expiresAt) : "No expiry") }, { key: "sh", header: "Shared with", cell: (e) => (e.shared.length ? e.shared.join(", ") : "—") }, { key: "st", header: "Status", cell: (e) => <StatusBadge status={e.status} /> },
        { key: "a", header: "", cell: (e) => <div className="flex gap-1">{e.status === "active" && <><Button size="sm" variant="outline" onClick={() => setShare(e.id)}>Share</Button><Button size="sm" variant="ghost" onClick={() => set.mutate({ id: e.id, s: "revoked" })}>Revoke</Button></>}{e.status !== "active" && <Button size="sm" variant="outline" onClick={() => set.mutate({ id: e.id, s: "active" })}>Renew (demo)</Button>}</div> }]} />
        <Modal open={!!share} onOpenChange={(v) => !v && setShare(null)} title="Share licence with another institution" description="Explicit, permissioned and audited." footer={<><Button variant="ghost" onClick={() => setShare(null)}>Cancel</Button><Button loading={sh.isPending} onClick={() => sh.mutate()}>Share</Button></>}><Field label="Partner institution" htmlFor="sh-p"><Select id="sh-p" value={partner} onChange={(e) => setPartner(e.target.value)}><option>Meridian University</option><option>Nilgiri Public School</option></Select></Field><p className="mt-2 text-xs text-text-2">Allowed only where the licence terms permit sharing, and an active data-sharing policy exists.</p></Modal></div>)}</Q>
  );
}

function Creator() {
  const qc = useQueryClient(); const [wiz, setWiz] = React.useState<"ai-teacher" | "content" | null>(null); const [wd, setWd] = React.useState<{ id: string; title: string } | null>(null);
  const mine = useQ(["mk-mine"], () => marketplaceService.mine()); const subs = useQ(["mk-subs"], () => marketplaceService.submissions());
  const inv = () => { ["mk-mine", "mk-subs", "mk-list"].forEach((k) => qc.invalidateQueries({ queryKey: ["inst", k] })); };
  const adv = useMutation({ mutationFn: (id: string) => marketplaceService.advanceSubmission(id), onSuccess: () => { toast.success("Moderator step simulated."); inv(); }, onError: onErr });
  const wdr = useMutation({ mutationFn: (id: string) => marketplaceService.withdrawSubmission(id), onSuccess: () => { toast.success("Withdrawn."); inv(); setWd(null); }, onError: onErr });
  const ver = useMutation({ mutationFn: (id: string) => marketplaceService.publishVersion(id), onSuccess: (l) => { toast.success(`Version ${l.version} submitted for review.`); inv(); }, onError: onErr });
  const own = mine.data ?? [];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2"><Button onClick={() => setWiz("ai-teacher")}><Plus size={14} /> List an AI Teacher</Button><Button variant="outline" onClick={() => setWiz("content")}><Plus size={14} /> Create content package</Button></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><StatTile label="Listings" value={own.length} /><StatTile label="Sales (demo)" value={own.reduce((s, l) => s + l.sales, 0)} /><StatTile label="Revenue (demo)" value={fmtMoney(own.reduce((s, l) => s + l.revenue, 0))} /><StatTile label="Avg rating" value={(own.filter((l) => l.rating).reduce((s, l) => s + l.rating, 0) / Math.max(1, own.filter((l) => l.rating).length)).toFixed(1)} /></div>
      <Panel title="My listings & analytics"><Q q={mine} rows={2}>{(rows) => !rows.length ? <EmptyState title="No listings yet" body="Start a creator journey above." /> : <>
        <BarChart horizontal ariaLabel="Revenue by listing (demo)" unit=" ₹" data={rows.slice(0, 6).map((l) => ({ label: l.title.slice(0, 32), value: l.revenue }))} />
        <div className="mt-4"><DataTable ariaLabel="My listings" rows={rows} rowKey={(l) => l.id} pageSize={5} cols={[{ key: "t", header: "Listing", cell: (l) => <b>{l.title}</b> }, { key: "k", header: "Type", cell: (l) => l.kind }, { key: "v", header: "Version", cell: (l) => `v${l.version}` }, { key: "s", header: "Status", cell: (l) => <StatusBadge status={l.status} /> }, { key: "r", header: "Rev.", cell: (l) => fmtMoney(l.revenue), align: "right" }, { key: "a", header: "", cell: (l) => <Button size="sm" variant="outline" disabled={l.status !== "approved"} onClick={() => ver.mutate(l.id)}>New version</Button> }]} /></div></>}</Q></Panel>
      <Panel title="Submissions & approval tracking"><Q q={subs} rows={2}>{(rows) => !rows.length ? <p className="text-sm text-text-2">No submissions.</p> : <ul className="space-y-2">{rows.map((s) => <li key={s.id} className="rounded-xl border border-border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span><b>{s.title}</b> <Badge>{s.kind}</Badge> <StatusBadge status={s.status} /></span><span className="flex gap-1">{["in-review", "approved"].includes(s.status) && <Button size="sm" variant="outline" onClick={() => adv.mutate(s.id)}>Simulate moderator {s.status === "in-review" ? "approval" : "publish"}</Button>}{!["withdrawn", "published"].includes(s.status) && <Button size="sm" variant="ghost" onClick={() => setWd({ id: s.id, title: s.title })}>Withdraw</Button>}</span></div><p className="mt-1 text-xs text-text-2">v{s.version} · {s.scope} · {s.notes.join(" → ")}</p></li>)}</ul>}</Q></Panel>
      {wiz && <CreatorWizard mode={wiz} open onClose={() => setWiz(null)} />}
      <ConfirmDialog open={!!wd} onOpenChange={(v) => !v && setWd(null)} destructive title={`Withdraw “${wd?.title}”?`} body="The listing is removed from the marketplace. Existing licence holders keep access." confirmLabel="Withdraw" onConfirm={() => wd && wdr.mutate(wd.id)} />
    </div>
  );
}

function Creators() {
  const c = useQ(["mk-creators"], () => marketplaceService.creators()); const l = useQ(["mk-list"], () => marketplaceService.list()); const [sus, setSus] = React.useState<MarketListing | null>(null); const qc = useQueryClient();
  const m = useMutation({ mutationFn: (v: { l: MarketListing; reason: string }) => marketplaceService.setStatus(v.l.id, "suspended", v.reason), onSuccess: () => { toast.success("Listing suspended."); qc.invalidateQueries({ queryKey: ["inst", "mk-list"] }); setSus(null); }, onError: onErr });
  const re = useMutation({ mutationFn: (l: MarketListing) => marketplaceService.setStatus(l.id, "approved"), onSuccess: () => { toast.success("Listing restored."); qc.invalidateQueries({ queryKey: ["inst", "mk-list"] }); }, onError: onErr });
  return (
    <div className="space-y-5"><Q q={c} rows={2}>{(rows) => <div className="grid gap-3 md:grid-cols-3">{rows.map((x) => <Card key={x.id} className="p-4"><div className="flex items-center gap-3"><Avatar name={x.name} size={40} /><div><p className="font-bold">{x.name}</p><p className="text-xs text-text-2">{x.listings} listings · {stars(x.rating)}</p></div>{x.verified && <Badge tone="success" className="ml-auto">Verified</Badge>}</div><p className="mt-2 text-sm text-text-2">{x.bio}</p></Card>)}</div>}</Q>
      <Panel title="Moderate listings (approval, suspension, retirement)"><Q q={l} rows={2}>{(rows) => <DataTable ariaLabel="Listings moderation" rows={rows.filter((x) => x.status !== "draft")} rowKey={(x) => x.id} pageSize={6} cols={[{ key: "t", header: "Listing", cell: (x) => <b>{x.title}</b> }, { key: "c", header: "Creator", cell: (x) => x.creator }, { key: "s", header: "Status", cell: (x) => <StatusBadge status={x.status} /> }, { key: "a", header: "", cell: (x) => x.status === "suspended" ? <Button size="sm" variant="outline" onClick={() => re.mutate(x)}>Restore</Button> : x.status === "approved" ? <Button size="sm" variant="ghost" onClick={() => setSus(x)}>Suspend</Button> : null }]} />}</Q></Panel>
      <ReasonModal open={!!sus} onOpenChange={(v) => !v && setSus(null)} title={`Suspend ${sus?.title}`} confirmLabel="Suspend" busy={m.isPending} onSubmit={(reason) => sus && m.mutate({ l: sus, reason })} /></div>
  );
}
