"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users, Warning, ArrowRight } from "@phosphor-icons/react";
import { PageHeader, Card, CardBody, Badge, ListToolbar, NoResults, EmptyState, Progress, Icon } from "@/components/ui";
import { teacherInsightService } from "@/lib/api/teacherInsightService";
import { useTeacher, Q, tHref, KEYS } from "../components/common";

export default function ClassesScreen() {
  const { id } = useTeacher();
  const [q, setQ] = React.useState("");
  const query = useQuery({ queryKey: [...KEYS.classes, id], queryFn: () => teacherInsightService.classes(id) });
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="My Classes" subtitle="Rosters, subject mapping and learning snapshots for the classes you teach." />
      <ListToolbar query={q} onQuery={setQ} placeholder="Search classes" count={query.data?.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).length} onClear={() => setQ("")} />
      <Q q={query} isEmpty={(d) => !d.length} empty={<EmptyState title="No classes assigned" body="Once the institution assigns you classes in the timetable, they appear here." />}>
        {(d) => {
          const list = d.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
          if (!list.length) return <NoResults query={q} onClear={() => setQ("")} />;
          return (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <li key={c.id}>
                  <Link href={tHref(`classes/${c.id}`)} className="block h-full"><Card className="h-full transition-shadow hover:shadow-md"><CardBody className="space-y-3">
                    <div className="flex items-start justify-between"><div><h2 className="text-heading">{c.name}</h2><p className="text-xs text-text-2">{c.subjects.map((s) => s.name).join(" · ")}</p></div><ArrowRight size={18} className="text-text-2" /></div>
                    <div className="flex flex-wrap gap-2 text-xs"><Badge icon={<Users size={12} />}>{c.studentCount} students</Badge>{c.attentionCount > 0 && <Badge tone="warning" icon={<Warning size={12} />}>{c.attentionCount} need attention</Badge>}{c.courseIds.length > 0 && <Badge tone="primary" icon={<Icon name="BookBookmark" size={12} />}>{c.courseIds.length} course</Badge>}</div>
                    <div><div className="mb-1 flex justify-between text-xs text-text-2"><span>Average Maths mastery</span><span className="tnum font-semibold text-text">{c.avgMath}%</span></div><Progress value={c.avgMath} tone={c.avgMath >= 70 ? "success" : c.avgMath >= 55 ? "warning" : "danger"} label="Average mastery" /></div>
                  </CardBody></Card></Link>
                </li>
              ))}
            </ul>
          );
        }}
      </Q>
    </div>
  );
}
