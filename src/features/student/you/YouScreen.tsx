"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Flame, Star, ArrowRight, Gear, Database, Brain, Folder } from "@phosphor-icons/react";
import { learningProfileService, portfolioService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { NAV } from "@/config/nav";
import { Avatar, Badge, Card, CardBody, ErrorState, Icon, PageHeader, SectionHeader, Skeleton, StatTile, Progress } from "@/components/ui";
import { communityKeys } from "../community/keys";

export default function YouScreen() {
  const { studentId } = useActors();
  const pf = useQuery({ queryKey: communityKeys.portfolio(studentId), queryFn: () => portfolioService.get(studentId), retry: false });
  const lp = useQuery({ queryKey: communityKeys.profile(studentId), queryFn: () => learningProfileService.get(studentId), retry: false });
  const groups = Object.entries(NAV.student.more.reduce<Record<string, typeof NAV.student.more>>((a, n) => { (a[n.group ?? "More"] ??= []).push(n); return a; }, {}));
  if (pf.isError) return <ErrorState onRetry={() => pf.refetch()} />;
  const p = pf.data?.profile;
  const prof = lp.data;
  return (
    <div>
      <PageHeader title="You" />
      {pf.isPending ? <Skeleton className="mb-6 h-40" /> : p && (
        <Card tone="lilac" className="mb-6"><CardBody className="flex flex-wrap items-center gap-4">
          <Avatar name={p.name} color={p.color} size={72} />
          <div className="min-w-0 flex-1"><h2 className="text-heading">{p.name}</h2><p className="text-sm text-text-2">{p.gradeLabel} · Section {p.className}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{p.interests.map((i) => <Badge key={i} tone="primary">{i}</Badge>)}{p.interests.length === 0 && <span className="text-sm text-text-2">Add interests in Settings.</span>}</div></div>
          {prof && <div className="flex gap-4"><div className="text-center"><p className="tnum text-3xl font-extrabold">{prof.level}</p><p className="text-xs text-text-2">Level</p></div><div className="text-center"><p className="tnum flex items-center justify-center gap-1 text-3xl font-extrabold"><Flame size={24} weight="fill" className="text-highlight" />{prof.streak.current}</p><p className="text-xs text-text-2">Day streak</p></div></div>}
        </CardBody></Card>
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Link href="/student/you/portfolio"><StatTile label="Digital portfolio" value={pf.data ? `${pf.data.items.length} items` : "…"} hint="Academic + extracurricular" icon={<Folder size={20} />} /></Link>
        <Link href="/student/you/learning-profile"><StatTile label="Learning profile" value={prof ? `${prof.points.toLocaleString("en-IN")} pts` : "…"} hint="How you're growing" icon={<Brain size={20} />} /></Link>
        <Link href="/student/you/settings"><StatTile label="Settings" value="Preferences" hint="Language, privacy, access" icon={<Gear size={20} />} /></Link>
      </div>

      <section className="mb-6"><SectionHeader title="Portfolio preview" action={<Link href="/student/you/portfolio" className="text-sm font-semibold text-primary">Open <ArrowRight size={14} className="inline" /></Link>} />
        {pf.isPending ? <Skeleton className="h-28" /> : (
          <Card><CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="mb-2 text-sm font-semibold">Subject progress</p><div className="space-y-2">{pf.data?.academic.slice(0, 4).map((a) => <div key={a.subjectId}><div className="flex justify-between text-xs"><span>{a.name}</span><span className="tnum">{a.mastery}%</span></div><Progress value={a.mastery} size="sm" label={a.name} /></div>)}{pf.data?.academic.length === 0 && <p className="text-sm text-text-2">Complete your baseline to see progress.</p>}</div></div>
              <div><p className="mb-2 text-sm font-semibold">Recent activities</p><ul className="space-y-1.5 text-sm">{pf.data?.items.filter((i) => ["competitions", "clubs", "talent", "awards", "sports"].includes(i.section)).slice(0, 4).map((i) => <li key={i.id} className="flex items-center gap-2"><Icon name={i.icon ?? "Star"} size={16} className="text-primary" /><span className="truncate">{i.title}</span></li>)}</ul></div>
            </div>
            <p className="mt-3 text-xs text-text-2">Student-generated portfolio — not an institution-certified transcript.</p>
          </CardBody></Card>
        )}
      </section>

      <section><SectionHeader title="More" subtitle="Everything else in one place" />
        <div className="space-y-5">{groups.map(([g, items]) => (
          <div key={g}><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-2">{g}</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{items.map((n) => <Link key={n.slug} href={`/student/${n.slug}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 hover:bg-surface-2"><span className="flex size-10 items-center justify-center rounded-xl bg-lilac text-primary"><Icon name={n.icon} size={20} /></span><span className="min-w-0"><span className="block text-sm font-semibold">{n.label}</span>{n.desc && <span className="block truncate text-xs text-text-2">{n.desc}</span>}</span></Link>)}</div></div>
        ))}</div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm"><Link className="font-semibold text-primary" href="/student/you/data"><Database size={14} className="mr-1 inline" />My data</Link><Link className="font-semibold text-primary" href="/student/you/settings">Settings</Link></div>
      </section>
    </div>
  );
}
