"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, MagnifyingGlass, Moon, Sun, SquaresFour, CaretDown, Flask, List, SignOut, Question, Sliders, X, WifiSlash, Info, Check, Sparkle, ArrowRight, PaperPlaneTilt } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useApp, useActors, SCENARIOS } from "@/stores/app-store";
import { NAV, type NavItem } from "@/config/nav";
import { ROLES, roleMeta } from "@/config/roles";
import { cn, initials } from "@/lib/utils";
import { Avatar, Badge, Button, ConfirmDialog, Drawer, Modal, Switch, toast, Icon, Select } from "@/components/ui";
import { NotificationsList, useNotifications } from "@/features/shared/NotificationsView";
import { setDemoFailure } from "@/lib/api/latency";
import { STUDENTS, BRANCHES, CLASSROOMS, ACADEMIC_YEARS, INSTITUTIONS } from "@/lib/mock-data/core";
import { searchIndex, interpretCommand } from "./search-index";
import type { Role } from "@/types";

function useRoleBase() {
  const role = useApp((s) => s.role);
  return { role, base: `/${role}` };
}

/* ───────── Role switcher ───────── */
function RoleSwitcher({ compact }: { compact?: boolean }) {
  const { role, setRole, lastRoute } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const meta = roleMeta(role);
  const go = (r: Role) => {
    setRole(r); setOpen(false);
    router.push(lastRoute[r] ?? `/${r}/${roleMeta(r).home}`);
    toast.info(`Switched to ${roleMeta(r).label} experience`, "Demo roles reset visible data context.");
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface pl-3 pr-2.5 text-sm font-semibold shadow-soft">
        <span className="size-2 rounded-full" style={{ background: meta.accent }} />
        {!compact && <span className="hidden sm:inline">Role:</span>}{meta.label}<CaretDown size={14} />
      </button>
      <AnimatePresence>
        {open && (<>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-border bg-surface p-1.5 shadow-card">
            <p className="text-label px-3 py-2 text-text-2">Demo role switcher</p>
            {ROLES.map((r) => (
              <button key={r.id} role="menuitemradio" aria-checked={r.id === role} onClick={() => go(r.id)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2", r.id === role && "bg-lilac")}>
                <span className="flex size-9 items-center justify-center rounded-xl text-white" style={{ background: r.accent }}><Icon name={{ student: "Student", teacher: "Chalkboard", institution: "BuildingOffice", government: "MapTrifold", parent: "Heart" }[r.id]} size={18} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{r.label}</span><span className="block truncate text-xs text-text-2">{r.actorLabel}</span></span>
                {r.id === role && <Check size={16} className="text-primary" />}
              </button>
            ))}
          </motion.div>
        </>)}
      </AnimatePresence>
    </div>
  );
}

/* ───────── Context selector ───────── */
function ContextBar() {
  const { role, childId, setChild, academicYear, branchContext, classContext, setContext, unsavedWork, setUnsaved } = useApp();
  const qc = useQueryClient();
  const [pending, setPending] = useState<null | (() => void)>(null);
  const [loading, setLoading] = useState(false);
  const change = (fn: () => void, label: string) => {
    const run = () => { setLoading(true); fn(); qc.invalidateQueries(); setTimeout(() => { setLoading(false); toast.success(`Context updated`, label); }, 450); };
    if (unsavedWork) setPending(() => run); else run();
  };
  if (role === "parent") {
    const kids = STUDENTS.filter((s) => s.parentIds.includes("par-rohan"));
    return (
      <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1" role="radiogroup" aria-label="Select child">
        {kids.map((k) => (
          <button key={k.id} role="radio" aria-checked={childId === k.id} onClick={() => k.id !== childId && change(() => setChild(k.id), `Showing ${k.displayName}'s records only`)} className={cn("flex h-8 items-center gap-1.5 rounded-full pl-1 pr-3 text-sm font-semibold", childId === k.id ? "bg-surface text-primary shadow-soft" : "text-text-2")}>
            <Avatar name={k.displayName} color={k.avatarColor} size={24} />{k.displayName.split(" ")[0]}
          </button>
        ))}
        <ConfirmUnsaved pending={pending} setPending={setPending} setUnsaved={setUnsaved} />
      </div>
    );
  }
  if (role === "student") return null;
  const inst = INSTITUTIONS[0];
  return (
    <div className="hidden items-center gap-2 text-sm md:flex">
      <span className={cn("rounded-full bg-surface-2 px-3 py-1.5 font-semibold", loading && "animate-pulse")} title="Institution (tenant)">{role === "government" ? "Karuvana State" : inst.name}</span>
      {role !== "government" && (
        <>
          <Select aria-label="Branch" className="h-9 w-auto rounded-full text-xs" value={branchContext} onChange={(e) => change(() => setContext({ branchContext: e.target.value }), `Branch: ${e.target.selectedOptions[0].text}`)}>
            <option value="all">All branches</option>{BRANCHES.filter((b) => b.institutionId === inst.id).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Select aria-label="Academic year" className="h-9 w-auto rounded-full text-xs" value={academicYear} onChange={(e) => change(() => setContext({ academicYear: e.target.value }), `Academic year ${e.target.selectedOptions[0].text}`)}>
            {ACADEMIC_YEARS.map((y) => <option key={y.id} value={y.id}>AY {y.label}</option>)}
          </Select>
          {role === "teacher" && <Select aria-label="Class" className="h-9 w-auto rounded-full text-xs" value={classContext} onChange={(e) => change(() => setContext({ classContext: e.target.value }), `Class: ${e.target.selectedOptions[0].text}`)}>{CLASSROOMS.slice(0, 4).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}
        </>
      )}
      <ConfirmUnsaved pending={pending} setPending={setPending} setUnsaved={setUnsaved} />
    </div>
  );
}
function ConfirmUnsaved({ pending, setPending, setUnsaved }: { pending: null | (() => void); setPending: (v: null) => void; setUnsaved: (v: boolean) => void }) {
  return <ConfirmDialog open={!!pending} onOpenChange={(v) => !v && setPending(null)} title="Switch context?" body="You have unsaved work. Switching context will discard it." confirmLabel="Discard & switch" destructive onConfirm={() => { setUnsaved(false); pending?.(); setPending(null); }} />;
}

/* ───────── Search & command palette ───────── */
function SearchPalette() {
  const { panels, openPanel, role, childId } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");
  const [recent, setRecent] = useState<string[]>([]);
  const [proposal, setProposal] = useState<ReturnType<typeof interpretCommand> | null>(null);
  const items = useMemo(() => searchIndex(role, childId), [role, childId]);
  const results = useMemo(() => q.trim() ? items.filter((i) => (i.title + " " + (i.sub ?? "") + i.type).toLowerCase().includes(q.toLowerCase())) : [], [q, items]);
  const types = ["All", ...Array.from(new Set(results.map((r) => r.type)))];
  const shown = results.filter((r) => type === "All" || r.type === type);
  const grouped = shown.reduce<Record<string, typeof shown>>((a, r) => ((a[r.type] ??= []).push(r), a), {});
  const suggestions: Record<Role, string[]> = { student: ["What should I revise today?", "fractions", "robotics", "basketball"], teacher: ["Generate 10 MCQs on fractions", "Which students are struggling with fractions?", "doubts"], institution: ["Compare student engagement across branches this month", "Lakeside", "governance"], government: ["Which districts show declining mathematics outcomes?", "Prepare a state-wide mathematics improvement programme", "baseline"], parent: ["What are the three topics my child should practise?", "fee installment", "events"] };
  useEffect(() => { if (!panels.search) { setQ(""); setProposal(null); setType("All"); } }, [panels.search]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPanel("search", true); } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [openPanel]);
  const go = (href: string, label?: string) => { if (label) setRecent((r) => [label, ...r.filter((x) => x !== label)].slice(0, 5)); openPanel("search", false); router.push(href); };
  const isCommand = q.trim().split(/\s+/).length >= 3 || q.trim().endsWith("?");
  return (
    <Modal open={panels.search} onOpenChange={(v) => openPanel("search", v)} title="Search & ask" className="sm:max-w-xl" description={role === "parent" ? "Searches only your selected child's resources." : "Search anything, or describe what you want in plain language."}>
      <div className="relative mb-3">
        <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-2" />
        <input autoFocus aria-label="Search" value={q} onChange={(e) => { setQ(e.target.value); setProposal(null); }} placeholder="Search or type a request…" className="h-12 w-full rounded-2xl border border-border bg-surface-2 pl-10 pr-4 text-sm" />
      </div>
      {proposal ? (
        <div className="rounded-2xl border border-primary/30 bg-lilac p-4" role="region" aria-label="Proposed action">
          <div className="mb-2 flex items-center gap-2"><Badge tone="ai">AI interpretation (demo)</Badge><Badge tone={proposal.kind === "action" ? "warning" : "success"}>{proposal.kind === "action" ? "Proposed action" : "Answer only"}</Badge></div>
          <dl className="space-y-1.5 text-sm">
            <div><dt className="inline font-semibold">Action: </dt><dd className="inline">{proposal.action}</dd></div>
            <div><dt className="inline font-semibold">Scope: </dt><dd className="inline">{proposal.scope}</dd></div>
            <div><dt className="inline font-semibold">Affected audience: </dt><dd className="inline">{proposal.audience}</dd></div>
            <div><dt className="inline font-semibold">Approval: </dt><dd className="inline">{proposal.approval}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-text-2">“{q}”. Nothing runs until you confirm. High-impact actions still need approval on the next screen.</p>
          <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => go(proposal.href, q)}>Confirm</Button><Button size="sm" variant="outline" onClick={() => setProposal(null)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => { setProposal(null); setQ(""); }}>Cancel</Button></div>
        </div>
      ) : q.trim() === "" ? (
        <div>
          {recent.length > 0 && <><p className="text-label mb-1.5 text-text-2">Recent</p><div className="mb-3 flex flex-wrap gap-2">{recent.map((r) => <button key={r} onClick={() => setQ(r)} className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium">{r}</button>)}</div></>}
          <p className="text-label mb-1.5 text-text-2">Try</p>
          <div className="flex flex-wrap gap-2">{suggestions[role].map((s) => <button key={s} onClick={() => setQ(s)} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2">{s}</button>)}</div>
        </div>
      ) : (
        <div>
          {isCommand && <button onClick={() => setProposal(interpretCommand(role, q))} className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-lilac p-3 text-left"><Sparkle size={20} weight="fill" className="text-primary" /><span className="flex-1 text-sm"><span className="font-semibold">Interpret “{q.length > 48 ? q.slice(0, 48) + "…" : q}”</span><span className="block text-xs text-text-2">See what would happen before anything runs</span></span><ArrowRight size={16} /></button>}
          {results.length > 0 && <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">{types.map((t) => <button key={t} onClick={() => setType(t)} aria-pressed={type === t} className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", type === t ? "bg-primary text-primary-fg" : "bg-surface-2 text-text-2")}>{t}</button>)}</div>}
          {shown.length === 0 ? (
            <div className="py-8 text-center"><p className="font-semibold">No matches for “{q}”</p><p className="text-sm text-text-2">Try a shorter word{type !== "All" ? ", or clear the type filter" : ""}.</p>{type !== "All" && <Button variant="soft" size="sm" className="mt-3" onClick={() => setType("All")}>Clear filter</Button>}</div>
          ) : Object.entries(grouped).map(([g, rs]) => (
            <div key={g} className="mb-2"><p className="text-label mb-1 mt-2 text-text-2">{g}</p>
              {rs.slice(0, 6).map((r) => <button key={r.id + r.href} onClick={() => go(r.href, r.title)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-surface-2"><span className="min-w-0"><span className="block truncate text-sm font-medium">{r.title}</span>{r.sub && <span className="block truncate text-xs text-text-2">{r.sub}</span>}</span><ArrowRight size={14} className="shrink-0 text-text-2" /></button>)}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ───────── Profile / preferences / scenarios ───────── */
function ProfileMenu() {
  const { role, theme, setTheme, highContrast, largeText, setPref, completeOnboarding, openPanel } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const meta = roleMeta(role);
  const actorName = meta.actorLabel.split(" · ")[0];
  return (
    <>
      <button onClick={() => setOpen((v) => !v)} aria-label="Profile menu" aria-expanded={open} className="rounded-full"><Avatar name={actorName} color={meta.accent} size={40} /></button>
      <AnimatePresence>
        {open && (<>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <motion.div role="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-3 top-14 z-50 w-64 rounded-2xl border border-border bg-surface p-1.5 shadow-card">
            <div className="px-3 py-2"><p className="text-sm font-semibold">{actorName}</p><p className="text-xs text-text-2">{meta.actorLabel.split(" · ")[1] ?? meta.label}</p></div>
            {[
              { l: "Preferences", i: Sliders, f: () => setPrefs(true) },
              { l: "Replay product tour", i: Sparkle, f: () => { completeOnboarding(role, false); router.push(`/${role}/onboarding`); } },
              { l: "Demo scenarios", i: Flask, f: () => openPanel("scenarios", true) },
              { l: "Help & about this prototype", i: Question, f: () => toast.info("Zoho Classes 3.0 — Phase 1 prototype", "Frontend only. All people, schools and numbers are fictional demo data.") },
              { l: "Sign out (simulated)", i: SignOut, f: () => toast.success("Signed out (simulated)", "There is no real authentication in this prototype.") },
            ].map((m) => <button key={m.l} role="menuitem" onClick={() => { setOpen(false); m.f(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-surface-2"><m.i size={18} className="text-text-2" />{m.l}</button>)}
          </motion.div>
        </>)}
      </AnimatePresence>
      <Modal open={prefs} onOpenChange={setPrefs} title="Preferences" description="Saved on this device only.">
        <div className="space-y-4">
          <div><p className="mb-2 text-sm font-semibold">Theme</p><div className="flex gap-2">{(["light", "dark", "system"] as const).map((t) => <Button key={t} variant={theme === t ? "primary" : "outline"} size="sm" onClick={() => setTheme(t)}>{t[0].toUpperCase() + t.slice(1)}</Button>)}</div></div>
          <div className="flex items-center justify-between"><span className="text-sm">High contrast</span><Switch label="High contrast" checked={highContrast} onChange={(v) => setPref("highContrast", v)} /></div>
          <div className="flex items-center justify-between"><span className="text-sm">Larger text</span><Switch label="Larger text" checked={largeText} onChange={(v) => setPref("largeText", v)} /></div>
          <p className="text-xs text-text-2">Reduced motion follows your device setting automatically.</p>
        </div>
      </Modal>
    </>
  );
}

function ScenarioMenu() {
  const { panels, openPanel, scenarioId, setScenario, offlineBanner, setOffline } = useApp();
  const router = useRouter();
  const qc = useQueryClient();
  const apply = (id: string) => { setScenario(id); qc.invalidateQueries(); openPanel("scenarios", false); const s = SCENARIOS.find((x) => x.id === id)!; router.push(`/${s.role}/${s.startSlug}`); toast.success("Scenario loaded", s.label); };
  return (
    <Drawer open={panels.scenarios} onOpenChange={(v) => openPanel("scenarios", v)} title="Demo scenarios">
      <p className="mb-3 text-sm text-text-2">Pick a named scenario to load coherent mock records across screens. Developer/demo tooling only.</p>
      <ul className="space-y-2">
        {SCENARIOS.map((s) => (
          <li key={s.id}><button onClick={() => apply(s.id)} className={cn("w-full rounded-2xl border p-3 text-left hover:bg-surface-2", scenarioId === s.id ? "border-primary bg-lilac" : "border-border")}>
            <span className="flex items-center justify-between"><span className="text-sm font-semibold">{s.label}</span>{scenarioId === s.id && <Badge tone="primary">Active</Badge>}</span><span className="text-xs text-text-2">{s.description}</span></button></li>
        ))}
      </ul>
      <div className="mt-5 flex items-center justify-between rounded-2xl border border-border p-3"><div><p className="text-sm font-semibold">Simulate service outage</p><p className="text-xs text-text-2">Shows the offline banner and fails feed/events/courses calls.</p></div>
        <Switch label="Simulate outage" checked={offlineBanner} onChange={(v) => { setOffline(v); ["feed", "events", "courses"].forEach((k) => setDemoFailure(k, v)); qc.invalidateQueries(); }} /></div>
    </Drawer>
  );
}

/* ───────── Nav ───────── */
function useActive() {
  const pathname = usePathname();
  const { role } = useRoleBase();
  const rest = pathname.split("/").filter(Boolean).slice(1);
  return { rest, isActive: (slug: string) => rest[0] === slug, role };
}
const NavLink = ({ item, role, active, onClick }: { item: NavItem; role: Role; active: boolean; onClick?: () => void }) => (
  <Link href={`/${role}/${item.slug}`} onClick={onClick} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-lilac text-primary" : "text-text-2 hover:bg-surface-2 hover:text-text")}>
    <Icon name={item.icon} size={20} weight={active ? "fill" : "regular"} />{item.label}
  </Link>
);

function Sidebar() {
  const { role, isActive } = useActive();
  const nav = NAV[role];
  const groups = nav.more.reduce<Record<string, NavItem[]>>((a, n) => ((a[n.group ?? "More"] ??= []).push(n), a), {});
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface px-3 py-4 lg:flex" aria-label="Primary">
      <Brand />
      <nav className="mt-4 space-y-0.5">{nav.primary.map((n) => <NavLink key={n.slug} item={n} role={role} active={isActive(n.slug)} />)}</nav>
      {Object.entries(groups).map(([g, items]) => (
        <div key={g} className="mt-4"><p className="text-label px-3 pb-1 text-text-2">{g}</p><nav className="space-y-0.5">{items.map((n) => <NavLink key={n.slug} item={n} role={role} active={isActive(n.slug)} />)}</nav></div>
      ))}
      <div className="mt-auto pt-6"><Badge tone="highlight" className="w-full justify-center py-1.5"><Flask size={14} />Prototype · demo data</Badge></div>
    </aside>
  );
}
function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet text-lg font-extrabold text-white">Z</span>
      <span className="leading-tight"><span className="block text-sm font-bold tracking-tight">Zoho Classes</span><span className="block text-[11px] font-semibold text-primary">3.0 · Academic OS</span></span>
    </Link>
  );
}

function MoreDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { role, isActive } = useActive();
  const nav = NAV[role];
  const all = role === "student" ? nav.more : [...nav.primary, ...nav.more];
  const groups = all.reduce<Record<string, NavItem[]>>((a, n) => ((a[n.group ?? "Menu"] ??= []).push(n), a), {});
  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()} title={role === "student" ? "More" : "Menu"}>
      {Object.entries(groups).map(([g, items]) => (
        <div key={g} className="mb-4"><p className="text-label mb-2 text-text-2">{g}</p>
          <div className="grid grid-cols-2 gap-2">{items.map((n) => <Link key={n.slug} href={`/${role}/${n.slug}`} onClick={onClose} aria-current={isActive(n.slug) ? "page" : undefined} className={cn("flex min-h-14 items-center gap-2.5 rounded-2xl border border-border p-3 text-sm font-medium", isActive(n.slug) && "border-primary bg-lilac text-primary")}><Icon name={n.icon} size={20} weight="duotone" className="shrink-0" /><span className="leading-tight">{n.label}</span></Link>)}</div>
        </div>
      ))}
    </Drawer>
  );
}

function BottomNav({ onMore }: { onMore: () => void }) {
  const { role, isActive } = useActive();
  const items = role === "student" ? NAV.student.primary : NAV[role].primary.slice(0, 4);
  return (
    <nav aria-label="Primary" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 px-2 pt-1.5 backdrop-blur-xl lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((n) => { const a = isActive(n.slug); return (
          <li key={n.slug} className="flex-1"><Link href={`/${role}/${n.slug}`} aria-current={a ? "page" : undefined} className="relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold">
            {a && <motion.span layoutId="bn-pill" className="absolute inset-x-3 top-0 h-1 rounded-full bg-primary" />}
            <Icon name={n.icon} size={24} weight={a ? "fill" : "regular"} className={a ? "text-primary" : "text-text-2"} /><span className={a ? "text-primary" : "text-text-2"}>{n.label}</span>
          </Link></li>); })}
        {role !== "student" && <li className="flex-1"><button onClick={onMore} className="flex min-h-12 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-text-2"><List size={24} />Menu</button></li>}
      </ul>
    </nav>
  );
}

/* ───────── Tutor dock (student) ───────── */
function TutorDock() {
  const { role, panels, openPanel } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  if (role !== "student" || pathname.includes("/tutor") || pathname.includes("/play/tug") || pathname.includes("/room") || pathname.includes("/onboarding")) return null;
  const send = (text: string) => { openPanel("tutor", false); router.push(`/student/tutor?q=${encodeURIComponent(text)}`); setQ(""); };
  return (
    <>
      <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.6 }} onClick={() => openPanel("tutor")} aria-label="Open your AI Tutor" aria-expanded={panels.tutor}
        className="fixed bottom-[calc(5.2rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-gradient-to-br from-primary to-violet pl-4 pr-5 font-semibold text-white shadow-glow lg:bottom-6 lg:right-6">
        <Sparkle size={22} weight="fill" /><span className="hidden sm:inline">Ask Tutor</span>
      </motion.button>
      <AnimatePresence>
        {panels.tutor && (<>
          <div className="fixed inset-0 z-30" onClick={() => openPanel("tutor", false)} />
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] right-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-3xl border border-border bg-surface p-4 shadow-glow lg:bottom-24 lg:right-6" role="dialog" aria-label="Quick tutor">
            <div className="mb-3 flex items-center gap-3"><Avatar name="Sage" color="#7044D8" size={44} ai /><div><p className="font-semibold">Sage · your AI Tutor</p><p className="text-xs text-text-2">What would you like to figure out today?</p></div></div>
            <div className="mb-3 flex flex-wrap gap-2">{["Explain 1/4 + 2/3", "Quiz me on fractions", "Help with homework"].map((s) => <button key={s} onClick={() => send(s)} className="rounded-full bg-lilac px-3 py-1.5 text-xs font-semibold text-primary">{s}</button>)}</div>
            <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) send(q); }} className="flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Ask your tutor" placeholder="Type a question…" className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface-2 px-4 text-sm" /><Button size="icon" aria-label="Send" type="submit"><PaperPlaneTilt size={18} weight="fill" /></Button></form>
          </motion.div>
        </>)}
      </AnimatePresence>
    </>
  );
}

/* ───────── Top bar ───────── */
function TopBar({ onMenu }: { onMenu: () => void }) {
  const { role, openPanel } = useApp();
  const { unread } = useNotifications();
  const isStudent = role === "student";
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-4 sm:gap-3">
        <div className="lg:hidden"><Link href="/" aria-label="Zoho Classes 3.0 home" className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet text-lg font-extrabold text-white">Z</Link></div>
        <div className="hidden md:block"><ContextBar /></div>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button onClick={() => openPanel("search", true)} className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm text-text-2 shadow-soft" aria-label="Search">
            <MagnifyingGlass size={18} /><span className="hidden w-32 text-left md:inline">Search…</span><kbd className="hidden rounded bg-surface-2 px-1.5 text-[10px] font-semibold md:inline">⌘K</kbd>
          </button>
          <span className="hidden sm:block"><ThemeToggle /></span>
          <button onClick={() => openPanel("notifications", true)} aria-label={`Notifications, ${unread} unread`} className="relative flex size-10 items-center justify-center rounded-full border border-border bg-surface shadow-soft">
            <Bell size={20} />{unread > 0 && <span className="tnum absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-fg">{unread}</span>}
          </button>
          {isStudent && <button onClick={onMenu} aria-label="More destinations" className="flex size-10 items-center justify-center rounded-full border border-border bg-surface shadow-soft"><SquaresFour size={20} /></button>}
          <RoleSwitcher compact />
          <div className="relative"><ProfileMenu /></div>
        </div>
      </div>
      {role === "parent" && <div className="border-t border-border px-4 py-1.5 md:hidden"><ContextBar /></div>}
    </header>
  );
}
function ThemeToggle() {
  const { theme, setTheme } = useApp();
  const dark = theme === "dark" || (theme === "system" && typeof document !== "undefined" && document.documentElement.dataset.theme === "dark");
  return <button onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} className="flex size-10 items-center justify-center rounded-full border border-border bg-surface shadow-soft">{dark ? <Sun size={20} /> : <Moon size={20} />}</button>;
}

function NotificationsDrawer() {
  const { panels, openPanel } = useApp();
  return <Drawer open={panels.notifications} onOpenChange={(v) => openPanel("notifications", v)} title="Notifications"><NotificationsList compact onNavigate={() => openPanel("notifications", false)} /></Drawer>;
}

function OnboardingNudge() {
  const { role, onboarded, completeOnboarding } = useApp();
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  if (onboarded[role] || hidden || role === "student" || pathname.includes("/onboarding")) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-lilac px-4 py-3 text-sm">
      <Sparkle size={20} weight="fill" className="text-primary" />
      <span className="flex-1 font-medium">New here? Take a 1-minute tour of the {roleMeta(role).label.toLowerCase()} experience.</span>
      <Button asChild size="sm"><Link href={`/${role}/onboarding`}>Start tour</Link></Button>
      <Button size="sm" variant="ghost" onClick={() => { setHidden(true); completeOnboarding(role, true); }}>Skip</Button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, offlineBanner, setLastRoute } = useApp();
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  useEffect(() => { const seg = pathname.split("/").filter(Boolean)[0]; if (seg === role) setLastRoute(role, pathname); }, [pathname, role, setLastRoute]);
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="bg-[#1d1b4b] px-4 py-1.5 text-center text-xs font-medium text-white" role="note">Zoho Classes 3.0 · Phase 1 prototype · fictional demo data · permissions shown are illustrative, not production security</div>
        {offlineBanner && <div role="alert" className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-xs font-semibold text-warning"><WifiSlash size={16} />Demo service unavailable (simulated). Some lists will show a retry state.</div>}
        <TopBar onMenu={() => setMore(true)} />
        <main id="main" className={cn("mx-auto w-full max-w-[1400px] flex-1 px-4 pb-32 pt-5 lg:pb-12", role === "student" && "max-w-6xl")}>
          <OnboardingNudge />
          {children}
        </main>
      </div>
      <BottomNav onMore={() => setMore(true)} />
      <MoreDrawer open={more} onClose={() => setMore(false)} />
      <NotificationsDrawer />
      <SearchPalette />
      <ScenarioMenu />
      <TutorDock />
    </div>
  );
}
