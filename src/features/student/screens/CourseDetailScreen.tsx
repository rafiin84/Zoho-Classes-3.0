"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Clock, Globe, Lock, PlayCircle, Robot, Star, Wheelchair, Certificate, Receipt } from "@phosphor-icons/react";
import { AIBadge, Badge, Button, Card, CardBody, EmptyState, ErrorState, Icon, Modal, Skeleton, toast } from "@/components/ui";
import { courseService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { OBJECTIVES, subjectById } from "@/lib/mock-data/core";
import { fmtMoney } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { studentKeys } from "../keys";
import { CheckoutModal } from "../courses/Checkout";

export default function CourseDetailScreen({ params }: ScreenProps) {
  const { studentId } = useActors(); const qc = useQueryClient();
  const [buy, setBuy] = useState(false); const [preview, setPreview] = useState(false);
  const c = useQuery({ queryKey: studentKeys.course(params.id, studentId), queryFn: () => courseService.get(params.id, studentId) });
  const st = useQuery({ queryKey: studentKeys.structure(params.id), queryFn: () => courseService.structure(params.id) });
  const orders = useQuery({ queryKey: studentKeys.orders(studentId), queryFn: () => courseService.orders(studentId) });
  const refresh = () => { qc.invalidateQueries({ queryKey: studentKeys.course(params.id, studentId) }); qc.invalidateQueries({ queryKey: studentKeys.courses(studentId) }); qc.invalidateQueries({ queryKey: studentKeys.home(studentId) }); qc.invalidateQueries({ queryKey: studentKeys.orders(studentId) }); };
  const enrol = useMutation({ mutationFn: () => courseService.enrol(studentId, params.id), onSuccess: () => { refresh(); toast.success("You’re enrolled — have fun!"); }, onError: (e: Error) => toast.error(e.message) });
  const check = useMutation({ mutationFn: (id: string) => courseService.refreshOrder(id), onSuccess: () => { refresh(); toast.success("Payment confirmed — course unlocked"); } });

  if (c.isLoading) return <div className="space-y-4"><Skeleton className="h-56" /><Skeleton className="h-40" /></div>;
  if (c.isError || !c.data) return c.isError ? <ErrorState title="Course not found" body="It may have been removed or isn’t available to you." onRetry={() => c.refetch()} /> : <EmptyState title="Course not found" body="Try the catalogue." action={{ label: "Browse courses", href: "/student/courses" }} />;
  const course = c.data; const mods = st.data?.modules ?? []; const acts = st.data?.activities ?? [];
  const paid = course.priceType === "paid"; const myOrders = (orders.data ?? []).filter((o) => o.courseId === course.id); const pending = myOrders.find((o) => o.status === "Pending");
  const lastFailed = !pending && !course.owned && myOrders[0]?.status === "Failed";
  const objs = [...new Set(acts.flatMap((a) => a.learningObjectiveIds))].map((id) => OBJECTIVES.find((o) => o.id === id)).filter(Boolean);
  const sample = acts.find((a) => a.type === "video" || a.type === "lesson");
  const minutes = acts.reduce((a, x) => a + x.estimatedMinutes, 0) || course.durationMinutes;
  const ai = course.creatorKind === "ai-teacher";

  const cta = course.enrolled ? <Button size="lg" asChild><Link href={`/student/player/${course.id}${course.nextActivityId ? `?activity=${course.nextActivityId}` : ""}`}><PlayCircle size={20} weight="fill" />{course.completedCount ? "Continue" : "Start learning"}</Link></Button>
    : pending ? <Button size="lg" variant="outline" loading={check.isPending} onClick={() => check.mutate(pending.id)}><Clock size={18} />Check payment status</Button>
    : paid ? <Button size="lg" onClick={() => setBuy(true)}>{lastFailed ? "Try payment again" : `Buy for ${fmtMoney(course.price)}`}</Button>
    : <Button size="lg" loading={enrol.isPending} onClick={() => enrol.mutate()}>Enrol for free</Button>;

  return (
    <div className="space-y-6">
      <Link href="/student/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-2 hover:text-text"><ArrowLeft size={16} />Courses</Link>
      <div className="relative overflow-hidden rounded-[1.75rem] p-6 text-white shadow-glow sm:p-8" style={{ background: `linear-gradient(135deg, ${course.cover.from}, ${course.cover.to})` }}>
        <span aria-hidden className="absolute -right-10 -top-10 size-56 rounded-full bg-white/15" /><Icon name={course.cover.icon} size={120} weight="duotone" className="absolute -bottom-6 right-4 text-white/25" />
        <div className="relative max-w-2xl space-y-3"><div className="flex flex-wrap gap-2"><Badge className="bg-white/90 text-text">{subjectById(course.subjectId).name}</Badge><Badge className="bg-white/90 text-text">{course.kind === "marketplace" ? "Marketplace" : "From your school"}</Badge>{ai && <AIBadge label="AI Teacher" />}{course.enrolled && <Badge tone="success">Enrolled</Badge>}</div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{course.title}</h1><p className="text-white/90">{course.description}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90"><span className="inline-flex items-center gap-1"><Star size={14} weight="fill" />{course.rating ? `${course.rating} (${course.ratings})` : "New"}</span><span className="tnum inline-flex items-center gap-1"><Clock size={14} />{Math.round(minutes / 60 * 10) / 10}h · {course.moduleCount || mods.length} modules</span><span className="inline-flex items-center gap-1"><Globe size={14} />{course.language}</span></p></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card><CardBody className="space-y-3"><h2 className="text-heading">What you’ll learn</h2><ul className="grid gap-2 sm:grid-cols-2">{course.outcomes.map((o) => <li key={o} className="flex items-start gap-2 text-sm"><Check size={18} weight="bold" className="mt-0.5 shrink-0 text-success" />{o}</li>)}</ul></CardBody></Card>
          <Card><CardBody className="space-y-2"><h2 className="text-heading">Before you start</h2><p className="text-sm text-text-2">{course.subjectId === "sub-cs" ? "No prior coding needed. Comfort with Grade 7 maths helps." : course.subjectId === "sub-math" ? "Comfort with multiplication tables and basic fractions." : "No special prerequisites — just curiosity."}</p>
            <h3 className="pt-2 font-semibold">Taught by</h3><p className="flex items-center gap-2 text-sm">{ai ? <Robot size={18} className="text-primary" /> : null}{course.creatorName}<Badge tone={ai ? "ai" : "primary"}>{ai ? "AI Teacher · school approved" : course.creatorKind === "creator" ? "Independent creator" : "Teacher at your school"}</Badge></p></CardBody></Card>
          <Card><CardBody className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-heading">Course content</h2><span className="tnum text-sm text-text-2">{acts.length} activities</span></div>
            {st.isLoading ? <Skeleton className="h-32" /> : mods.length === 0 ? <p className="text-sm text-text-2">The detailed outline for this course is being finalised.</p> : <ol className="space-y-3">{mods.map((m) => <li key={m.id} className="rounded-2xl bg-surface-2 p-3"><p className="font-semibold"><span className="tnum mr-1.5 text-text-2">{m.sequence}.</span>{m.title}</p><ul className="mt-2 space-y-1">{acts.filter((a) => a.moduleId === m.id).map((a) => <li key={a.id} className="flex items-center gap-2 text-sm"><span className="text-primary">{course.enrolled ? <PlayCircle size={16} /> : <Lock size={14} />}</span><span className="min-w-0 flex-1 truncate">{a.title}</span><span className="text-xs capitalize text-text-2">{a.type.replace("-", " ")}</span><span className="tnum text-xs text-text-2">{a.estimatedMinutes}m</span></li>)}</ul></li>)}</ol>}
            {sample && <Button variant="soft" onClick={() => setPreview(true)}><PlayCircle size={16} weight="fill" />Preview a sample lesson</Button>}</CardBody></Card>
          <Card><CardBody className="space-y-2"><h2 className="text-heading">Curriculum mapping</h2>{objs.length === 0 ? <p className="text-sm text-text-2">Mapping to the {`Karuvana State Curriculum`} will appear once objectives are tagged.</p> : <ul className="space-y-1.5">{objs.map((o) => <li key={o!.id} className="flex items-center gap-2 text-sm"><Badge tone="primary">{o!.code}</Badge>{o!.title}<span className="text-xs text-text-2">· {o!.chapter}</span></li>)}</ul>}</CardBody></Card>
          <Card><CardBody className="grid gap-4 sm:grid-cols-2"><div><h3 className="font-semibold">How you’re assessed</h3><p className="mt-1 text-sm text-text-2">Short quizzes and adaptive checkpoints along the way{acts.some((a) => a.type === "assessment") ? ", plus a chapter assessment" : ""}. {acts.some((a) => a.type === "assignment") ? "Assignments are reviewed by a teacher. " : ""}Checkpoints guide you — they’re not high-stakes.</p></div><div><h3 className="flex items-center gap-1.5 font-semibold"><Wheelchair size={16} />Language & accessibility</h3><p className="mt-1 text-sm text-text-2">{course.language}. Captions on videos, adjustable playback speed, keyboard-friendly activities and your AI Tutor in six languages.</p></div></CardBody></Card>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start"><Card><CardBody className="space-y-4">
          <div><p className="tnum text-3xl font-extrabold">{paid ? fmtMoney(course.price) : "Free"}</p><p className="text-sm text-text-2">{paid ? `One-time · ${course.accessDays ?? 365} days access` : course.kind === "institution" ? "Included with your school" : "No payment needed"}</p></div>
          {cta}
          {lastFailed && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">Your last payment didn’t go through and nothing was charged.</p>}
          {pending && <p role="status" className="rounded-xl bg-warning-soft p-3 text-sm text-warning">Payment pending — the course unlocks when it’s confirmed.</p>}
          {paid && !course.owned && !pending && <p className="flex items-start gap-2 text-xs text-text-2"><Lock size={14} className="mt-0.5 shrink-0" />Purchase to unlock the lessons. Previews are free.</p>}
          <ul className="space-y-2 border-t border-border pt-3 text-sm"><li className="flex items-center gap-2"><Certificate size={16} className="text-primary" />Certificate on completion</li><li className="flex items-center gap-2"><Clock size={16} className="text-primary" />Learn at your own pace</li>{paid && <li className="flex items-center gap-2"><Receipt size={16} className="text-primary" />Receipt & order history under Courses</li>}</ul>
          {paid && course.owned && myOrders[0] && <p className="text-xs text-text-2">Entitlement active · {myOrders[0].licenceType} · {myOrders[0].receiptReference}</p>}
          {paid && <Link href="/student/courses?tab=orders" className="text-sm font-semibold text-primary">View my orders</Link>}
        </CardBody></Card></aside>
      </div>
      {paid && <CheckoutModal course={course} open={buy} onOpenChange={setBuy} />}
      <Modal open={preview} onOpenChange={setPreview} title={`Sample: ${sample?.title ?? ""}`} description="A free preview of the teaching style.">
        <div className="space-y-3"><div className="flex aspect-video items-center justify-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${course.cover.from}, ${course.cover.to})` }}><PlayCircle size={56} weight="fill" /></div><p className="text-sm text-text-2">Demo preview — a short clip with captions and speed control. Full lessons unlock {paid ? "after purchase" : "once you enrol"}.</p></div>
      </Modal>
    </div>
  );
}
