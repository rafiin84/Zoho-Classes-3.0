"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, Storefront, Buildings } from "@phosphor-icons/react";
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, ListToolbar, Modal, NoResults, PageHeader, Segmented, Skeleton, StatusBadge } from "@/components/ui";
import { courseService, type CourseWithState } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { GRADES, SUBJECTS, subjectById } from "@/lib/mock-data/core";
import { fmtMoney, fmtDate } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { studentKeys } from "../keys";
import { useMyCourses } from "../hooks";
import { ContentCard } from "../components/ContentCard";
import { RailSection } from "../components/RailSection";
import { ReceiptPreview } from "../courses/Checkout";

const sel = "h-11 rounded-full border border-border bg-surface px-4 text-sm";
export const courseCard = (c: CourseWithState) => (
  <ContentCard key={c.id} href={`/student/courses/${c.id}`} cover={c.cover} eyebrow={`${subjectById(c.subjectId).name} · ${c.kind === "marketplace" ? "Marketplace" : "School"}`} title={c.title}
    meta={`${c.priceType === "free" ? "Free" : fmtMoney(c.price)} · ${c.rating ? `${c.rating} ★` : "New"} · ${c.language}`}
    badge={c.enrolled ? { label: "Enrolled", tone: "success" } : c.priceType === "paid" ? { label: "Paid", tone: "highlight" } : c.labels.includes("trending") ? { label: "Trending", tone: "highlight" } : undefined} progress={c.enrolled ? c.progressPct : undefined} />
);

function Orders() {
  const { studentId } = useActors(); const [rc, setRc] = useState<string | null>(null);
  const orders = useQuery({ queryKey: studentKeys.orders(studentId), queryFn: () => courseService.orders(studentId) });
  const courses = useMyCourses();
  if (orders.isLoading) return <Skeleton className="h-40" />;
  if (orders.isError) return <ErrorState onRetry={() => orders.refetch()} />;
  if (!orders.data?.length) return <EmptyState icon={<Receipt size={28} weight="duotone" />} title="No course purchases yet" body="Paid marketplace courses you buy will appear here with their receipts. School fees are separate and live under Fees." action={{ label: "Browse paid courses", href: "/student/courses?price=paid" }} />;
  const order = orders.data.find((o) => o.id === rc);
  return (
    <div className="space-y-3"><p className="text-sm text-text-2">Course orders only — separate from school fees.</p>
      <ul className="space-y-2">{orders.data.map((o) => { const c = courses.data?.find((x) => x.id === o.courseId); return (
        <li key={o.id}><Card><CardBody className="flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1"><p className="font-semibold">{c?.title ?? o.courseId}</p><p className="tnum text-xs text-text-2">{o.receiptReference} · {fmtDate(o.at)} · {fmtMoney(o.amount)} · {o.licenceType}</p></div><StatusBadge status={o.status} /><Badge tone={o.entitlementStatus === "active" ? "success" : "neutral"}>{o.entitlementStatus === "active" ? "Access active" : "No access"}</Badge><Button size="sm" variant="outline" onClick={() => setRc(o.id)}>Receipt</Button></CardBody></Card></li>); })}</ul>
      <Modal open={!!order} onOpenChange={(v) => !v && setRc(null)} title="Receipt preview">{order && <ReceiptPreview order={order} course={courses.data?.find((x) => x.id === order.courseId)} />}</Modal>
    </div>
  );
}

export default function CoursesScreen({ searchParams }: ScreenProps) {
  const [tab, setTab] = useState<"browse" | "orders">(searchParams.tab === "orders" ? "orders" : "browse");
  const [q, setQ] = useState(""); const [subject, setSubject] = useState(""); const [grade, setGrade] = useState(""); const [lang, setLang] = useState("");
  const [price, setPrice] = useState(searchParams.price ?? ""); const [source, setSource] = useState(""); const [sort, setSort] = useState("relevance");
  const { data, isLoading, isError, refetch } = useMyCourses();
  const published = useMemo(() => (data ?? []).filter((c) => c.status === "published"), [data]);
  const filtered = useMemo(() => {
    const r = published.filter((c) => (!q || (c.title + c.description + c.creatorName).toLowerCase().includes(q.toLowerCase())) && (!subject || c.subjectId === subject) && (!grade || c.gradeIds.includes(grade)) && (!lang || c.language === lang) && (!price || c.priceType === price) && (!source || c.kind === source));
    const by: Record<string, (a: CourseWithState, b: CourseWithState) => number> = { rating: (a, b) => b.rating - a.rating, "price-asc": (a, b) => a.price - b.price, "price-desc": (a, b) => b.price - a.price, duration: (a, b) => a.durationMinutes - b.durationMinutes, popular: (a, b) => b.ratings - a.ratings };
    return by[sort] ? [...r].sort(by[sort]) : r;
  }, [published, q, subject, grade, lang, price, source, sort]);
  const has = !!(q || subject || grade || lang || price || source || sort !== "relevance");
  const clear = () => { setQ(""); setSubject(""); setGrade(""); setLang(""); setPrice(""); setSource(""); setSort("relevance"); };
  const langs = [...new Set(published.map((c) => c.language))];

  return (
    <div className="space-y-6">
      <PageHeader title="Courses" subtitle="Your school’s courses and a marketplace of creators. Free to enrol, or buy once and keep access." />
      <Segmented label="Courses view" value={tab} onChange={setTab} options={[{ value: "browse", label: "Browse" }, { value: "orders", label: "My orders" }]} />
      {tab === "orders" ? <Orders /> : isLoading ? <div className="space-y-3"><Skeleton className="h-11" /><Skeleton className="h-52" /></div> : isError ? <ErrorState onRetry={() => refetch()} /> : <>
        <ListToolbar query={q} onQuery={setQ} placeholder="Search courses, topics, creators" count={filtered.length} onClear={clear} hasFilters={has}>
          <select aria-label="Subject" className={sel} value={subject} onChange={(e) => setSubject(e.target.value)}><option value="">All subjects</option>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select aria-label="Grade" className={sel} value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">All grades</option>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select>
          <select aria-label="Language" className={sel} value={lang} onChange={(e) => setLang(e.target.value)}><option value="">Any language</option>{langs.map((l) => <option key={l}>{l}</option>)}</select>
          <select aria-label="Price" className={sel} value={price} onChange={(e) => setPrice(e.target.value)}><option value="">Free & paid</option><option value="free">Free</option><option value="paid">Paid</option></select>
          <select aria-label="Source" className={sel} value={source} onChange={(e) => setSource(e.target.value)}><option value="">School & marketplace</option><option value="institution">My school</option><option value="marketplace">Marketplace</option></select>
          <select aria-label="Sort" className={sel} value={sort} onChange={(e) => setSort(e.target.value)}><option value="relevance">Sort: Relevance</option><option value="rating">Top rated</option><option value="popular">Most reviewed</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="duration">Shortest first</option></select>
        </ListToolbar>
        {published.length === 0 ? <EmptyState title="No courses are published yet" body="When your school or creators publish courses they’ll show up here." /> : !has ? <>
          <RailSection id="feat" title="Featured" subtitle="Hand-picked this week">{published.filter((c) => c.labels.includes("featured")).map(courseCard)}</RailSection>
          <RailSection id="trend" title="Trending" subtitle="Popular with students like you">{published.filter((c) => c.labels.includes("trending")).map(courseCard)}</RailSection>
          <RailSection id="rec" title="Recommended for you" subtitle="Based on your grade, interests and progress">{published.filter((c) => c.labels.includes("ai-recommended")).map(courseCard)}</RailSection>
          <section className="space-y-2"><h2 className="text-heading">All courses</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{published.map((c) => <div key={c.id} className="[&>div>*]:!w-full">{courseCard(c)}</div>)}</div></section>
          <div className="grid gap-3 sm:grid-cols-2"><Card tone="lilac"><CardBody className="flex items-center gap-3"><Buildings size={26} weight="duotone" className="text-primary" /><p className="text-sm"><span className="font-semibold">School courses</span> are free and assigned by your teachers.</p></CardBody></Card><Card tone="lilac"><CardBody className="flex items-center gap-3"><Storefront size={26} weight="duotone" className="text-primary" /><p className="text-sm"><span className="font-semibold">Marketplace courses</span> are made by independent creators and bought separately.</p></CardBody></Card></div></> :
          filtered.length === 0 ? <NoResults query={q} onClear={clear} /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{filtered.map((c) => <div key={c.id} className="[&>div>*]:!w-full">{courseCard(c)}</div>)}</div>}
      </>}
    </div>
  );
}
