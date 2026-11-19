"use client";
import * as React from "react";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react";
import { ListToolbar, NoResults, PageHeader, Segmented, Select } from "@/components/ui";
import { GAMES } from "./games";
import { GameCard } from "./GameCard";

export default function GamesCatalogueScreen() {
  const [q, setQ] = React.useState("");
  const [subject, setSubject] = React.useState("all");
  const [topic, setTopic] = React.useState("all");
  const [mode, setMode] = React.useState<"all" | "solo" | "multiplayer">("all");
  const [comp, setComp] = React.useState("all");
  const topics = [...new Set(GAMES.map((g) => g.topic))];
  const list = GAMES.filter((g) => (subject === "all" || g.subjectId === subject) && (topic === "all" || g.topic === topic) && (mode === "all" || g.mode === mode) && (comp === "all" || g.competition === comp) && (!q || (g.title + g.blurb + g.topic).toLowerCase().includes(q.toLowerCase())));
  const has = subject !== "all" || topic !== "all" || mode !== "all" || comp !== "all";
  const clear = () => { setQ(""); setSubject("all"); setTopic("all"); setMode("all"); setComp("all"); };
  return (
    <div>
      <Link href="/student/play" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-text-2"><CaretLeft size={16} /> Play</Link>
      <PageHeader title="All games" subtitle="Filter by subject, topic or how you like to play." />
      <div className="mb-3 overflow-x-auto"><Segmented label="mode" value={mode} onChange={setMode} options={[{ value: "all", label: "Any mode" }, { value: "solo", label: "Solo" }, { value: "multiplayer", label: "Multiplayer" }]} /></div>
      <ListToolbar query={q} onQuery={setQ} placeholder="Search games" count={list.length} onClear={clear} hasFilters={has}>
        <Select aria-label="Subject" className="w-auto" value={subject} onChange={(e) => setSubject(e.target.value)}><option value="all">All subjects</option><option value="sub-math">Mathematics</option><option value="sub-sci">Science</option></Select>
        <Select aria-label="Topic" className="w-auto" value={topic} onChange={(e) => setTopic(e.target.value)}><option value="all">All topics</option>{topics.map((t) => <option key={t}>{t}</option>)}</Select>
        <Select aria-label="Competition" className="w-auto" value={comp} onChange={(e) => setComp(e.target.value)}><option value="all">Individual or team</option><option value="individual">Individual</option><option value="team">Team</option></Select>
      </ListToolbar>
      {list.length === 0 ? <NoResults onClear={clear} query={q} /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((g) => <GameCard key={g.id} g={g} />)}</div>}
    </div>
  );
}
