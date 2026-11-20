"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "@phosphor-icons/react";
import { PageHeader, Card, CardBody, Badge, StatusBadge, ListToolbar, NoResults, EmptyState, Cover, Button, Select, Icon } from "@/components/ui";
import { courseService } from "@/lib/api";
import { subjectById } from "@/lib/mock-data/core";
import { useTeacher, Q, tHref, KEYS } from "../components/common";

export default function CoursesScreen() {
  const t = useTeacher();
  const [q, setQ] = React.useState(""); const [status, setStatus] = React.useState("all");
  const query = useQuery({ queryKey: [...KEYS.courses, t.id], queryFn: async () => (await courseService.list("stu-ananya")).filter((c) => c.creatorKind === "teacher" && c.creatorName === t.plain) });
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Courses" subtitle="Courses you author. Students see the saved sequence in their Course Player." actions={<Button asChild><Link href={tHref("courses/new")}><Plus size={16} />New course</Link></Button>} />
      <Q q={query} isEmpty={(d) => !d.length} empty={<EmptyState title="You haven't created a course yet" body="Start from a blank course and add modules and activities." action={{ label: "Create a course", href: tHref("courses/new") }} />}>
        {(d) => {
          const list = d.filter((c) => (status === "all" || c.status === status) && c.title.toLowerCase().includes(q.toLowerCase()));
          return (<>
            <ListToolbar query={q} onQuery={setQ} placeholder="Search courses" count={list.length} hasFilters={status !== "all"} onClear={() => { setQ(""); setStatus("all"); }}>
              <Select aria-label="Status filter" className="!w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></Select>
            </ListToolbar>
            {!list.length ? <NoResults query={q} onClear={() => { setQ(""); setStatus("all"); }} /> : (
              <ul className="grid gap-3 sm:grid-cols-2">{list.map((c) => (
                <li key={c.id}><Link href={tHref(`courses/${c.id}`)}><Card className="overflow-hidden transition-shadow hover:shadow-md"><Cover from={c.cover.from} to={c.cover.to} image={(c.cover as any).image} className="h-20" rounded="rounded-none" icon={<Icon name={c.cover.icon} size={32} />} />
                  <CardBody className="space-y-2"><div className="flex items-start justify-between gap-2"><h2 className="font-semibold leading-snug">{c.title}</h2><StatusBadge status={c.status} /></div>
                    <p className="text-xs text-text-2">{subjectById(c.subjectId).name} · {c.moduleCount} modules · {c.lessonCount} activities · v{c.version}</p></CardBody></Card></Link></li>))}</ul>
            )}
          </>);
        }}
      </Q>
    </div>
  );
}
