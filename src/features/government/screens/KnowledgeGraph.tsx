"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, Drawer, ListToolbar, NoResults, PageHeader, Segmented, Select, Skeleton } from "@/components/ui";
import type { ScreenProps } from "@/types/screens";
import type { KgObjective } from "@/types/government";
import { governmentService } from "@/lib/api/governmentService";
import { CURRICULUM, GRADES, SUBJECTS, subjectById } from "@/lib/mock-data/core";
import { Async, DemoBanner, Src, Panel } from "../components/shared";

export default function KnowledgeGraph(_: ScreenProps) {
  const q = useQuery({ queryKey: ["gov", "kg"], queryFn: () => governmentService.kgObjectives() });
  const [mode, setMode] = React.useState<"list" | "graph">("list"); const [query, setQuery] = React.useState(""); const [grade, setGrade] = React.useState(""); const [subject, setSubject] = React.useState(""); const [lang, setLang] = React.useState(""); const [ver, setVer] = React.useState(CURRICULUM.version);
  const [open, setOpen] = React.useState<string | null>(null);
  const dq = useQuery({ queryKey: ["gov", "kg-detail", open], queryFn: () => governmentService.objectiveDetail(open!), enabled: !!open });
  const clear = () => { setQuery(""); setGrade(""); setSubject(""); setLang(""); };
  return (
    <div>
      <PageHeader title="Curriculum Knowledge Graph" subtitle="Curriculum, subject, grade, chapter, learning objective, and everything mapped to it." />
      <DemoBanner />
      <div className="mb-4"><Segmented<"list" | "graph"> label="Graph mode" value={mode} onChange={setMode} options={[{ value: "list", label: "List" }, { value: "graph", label: "Graph" }]} /></div>
      <Async q={q} skeleton={<Skeleton className="h-96" />}>{(all) => {
        const list = all.filter((o) => (!grade || o.gradeId === grade) && (!subject || o.subjectId === subject) && (!lang || o.language === lang) && `${o.code} ${o.title} ${o.chapter}`.toLowerCase().includes(query.toLowerCase()));
        const subjects = [...new Set(list.map((o) => o.subjectId))];
        return (
          <>
            <ListToolbar query={query} onQuery={setQuery} placeholder="Search objectives or chapters" count={list.length} hasFilters={!!(grade || subject || lang)} onClear={clear}>
              <Select aria-label="Curriculum version" className="w-auto" value={ver} onChange={(e) => setVer(e.target.value)}><option value={CURRICULUM.version}>{CURRICULUM.name} v{CURRICULUM.version}</option><option value="2025.2">v2025.2 (archived)</option></Select>
              <Select aria-label="Grade" className="w-auto" value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">All grades</option>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</Select>
              <Select aria-label="Subject" className="w-auto" value={subject} onChange={(e) => setSubject(e.target.value)}><option value="">All subjects</option>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
              <Select aria-label="Language" className="w-auto" value={lang} onChange={(e) => setLang(e.target.value)}><option value="">All languages</option><option>English</option><option>Hindi</option></Select>
            </ListToolbar>
            {ver !== CURRICULUM.version ? <Panel title="Archived curriculum version"><p className="text-sm text-text-2">v{ver} is archived in this prototype and has no seeded nodes. Switch back to the current version.</p></Panel>
              : list.length === 0 ? <NoResults query={query} onClear={clear} />
              : mode === "list" ? (
                <div className="space-y-4">{subjects.map((sid) => { const items = list.filter((o) => o.subjectId === sid); const chapters = [...new Set(items.map((o) => o.chapter))]; return (
                  <Panel key={sid} title={subjectById(sid).name} subtitle={`${CURRICULUM.name} › ${subjectById(sid).name}`}>{chapters.map((c) => <div key={c} className="mb-3"><p className="text-sm font-semibold">{c} <span className="text-xs font-normal text-text-2">· {GRADES.find((g) => g.id === items.find((o) => o.chapter === c)!.gradeId)?.label}</span></p><ul className="mt-1 space-y-1">{items.filter((o) => o.chapter === c).map((o) => <li key={o.id}><button className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-surface-2 px-3 text-left text-sm hover:bg-lilac" onClick={() => setOpen(o.id)}><Badge tone="primary">{o.code}</Badge>{o.title}<span className="ml-auto text-xs text-text-2">{o.competency}</span></button></li>)}</ul></div>)}</Panel>); })}</div>
              ) : <Graph items={list} onOpen={setOpen} />}
            <Src text="Source: state curriculum mapping (demo data)." />
          </>);
      }}</Async>
      <Drawer open={!!open} onOpenChange={(o) => !o && setOpen(null)} title="Learning objective" width="sm:max-w-lg">
        {dq.isLoading && <Skeleton className="h-64" />}{dq.data && (
          <div className="space-y-4 text-sm">
            <div><Badge tone="primary">{dq.data.objective.code}</Badge><h3 className="mt-1 text-heading">{dq.data.objective.title}</h3><p className="text-text-2">{dq.data.objective.chapter} · {subjectById(dq.data.objective.subjectId).name} · competency: {dq.data.competency}</p></div>
            <Sec title={`Mapped resources (${dq.data.resources.length})`}>{dq.data.resources.length ? dq.data.resources.map((r) => <li key={r.id}>{r.title} <Badge tone="neutral">{r.type}</Badge></li>) : <li className="text-text-2">No resources mapped. This is a mapping gap.</li>}</Sec>
            <Sec title="Courses and activities">{dq.data.courses.length ? dq.data.courses.map((c) => <li key={c.id}>{c.title} ({c.activityCount} activities)</li>) : <li className="text-text-2">No course activity references this objective yet.</li>}{dq.data.activities.map((a) => <li key={a.id} className="text-text-2">· {a.title} ({a.type})</li>)}</Sec>
            <Sec title="Questions and assessments">{dq.data.assessments.map((a) => <li key={a.id}>{a.title} <Badge tone="neutral">{a.kind}</Badge> {a.questions} questions</li>)}</Sec>
            <Sec title="Mastery descriptors">{dq.data.descriptors.map((d) => <li key={d.level}><strong>{d.level}:</strong> {d.text}</li>)}</Sec>
            <Sec title="Remedial resources">{dq.data.remedial.map((r) => <li key={r.id}>{r.title} <Badge tone="neutral">{r.kind}</Badge></li>)}</Sec>
          </div>)}
      </Drawer>
    </div>
  );
}
const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => <section><h4 className="mb-1 font-semibold">{title}</h4><ul className="list-disc space-y-1 pl-5">{children}</ul></section>;

/** Layered graph for the selected subject set: subject > chapter > objective. Filter first to keep it readable. */
function Graph({ items, onOpen }: { items: KgObjective[]; onOpen: (id: string) => void }) {
  const [sid, setSid] = React.useState(items[0]?.subjectId ?? "");
  const subs = [...new Set(items.map((o) => o.subjectId))];
  const cur = subs.includes(sid) ? sid : subs[0];
  const sel = items.filter((o) => o.subjectId === cur); const chapters = [...new Set(sel.map((o) => o.chapter))];
  const rowH = 44, H = Math.max(sel.length, chapters.length) * rowH + 20;
  const oy = (i: number) => 20 + i * rowH; const cy = (c: string) => { const idx = sel.filter((o) => o.chapter === c).map((o) => sel.indexOf(o)); return oy(idx.reduce((a, b) => a + b, 0) / idx.length); };
  return (
    <Panel title="Graph view" subtitle="One subject at a time to stay readable. Select an objective node for details.">
      <div className="mb-3"><Segmented value={cur} onChange={setSid} label="Subject" options={subs.map((s) => ({ value: s, label: subjectById(s).name }))} /></div>
      <div className="overflow-x-auto"><svg viewBox={`0 0 760 ${H}`} className="min-w-[640px] w-full" role="group" aria-label="Curriculum graph">
        <g><rect x={6} y={H / 2 - 20} width={150} height={40} rx={12} fill="var(--primary)" /><text x={81} y={H / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{subjectById(cur).name}</text></g>
        {chapters.map((c) => <g key={c}><path d={`M156 ${H / 2} C 200 ${H / 2}, 190 ${cy(c)}, 240 ${cy(c)}`} stroke="var(--border)" fill="none" strokeWidth={2} /><rect x={240} y={cy(c) - 17} width={170} height={34} rx={10} fill="var(--lilac)" stroke="var(--primary)" /><text x={325} y={cy(c) + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)">{c.slice(0, 24)}</text></g>)}
        {sel.map((o, i) => <g key={o.id} role="button" tabIndex={0} aria-label={`${o.code} ${o.title}`} className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[3]" onClick={() => onOpen(o.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(o.id); } }}><path d={`M410 ${cy(o.chapter)} C 440 ${cy(o.chapter)}, 440 ${oy(i)}, 470 ${oy(i)}`} stroke="var(--border)" fill="none" strokeWidth={2} /><rect x={470} y={oy(i) - 16} width={284} height={32} rx={10} fill="var(--surface)" stroke="var(--primary)" /><text x={480} y={oy(i) + 4} fontSize="11" fill="var(--text)"><tspan fontWeight="700">{o.code}</tspan> {o.title.slice(0, 36)}</text></g>)}
      </svg></div>
    </Panel>
  );
}
