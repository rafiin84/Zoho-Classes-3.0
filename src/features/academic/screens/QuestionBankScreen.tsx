"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkle, UploadSimple, Funnel } from "@phosphor-icons/react";
import type { ScreenProps } from "@/types/screens";
import { Badge, Button, Card, CardBody, Drawer, EmptyState, ErrorState, ListToolbar, NoResults, PageHeader, Select, SkeletonCards, StatTile, toast, AIBadge } from "@/components/ui";
import { useActors } from "@/stores/app-store";
import { SUBJECTS, GRADES, OBJECTIVES, subjectById } from "@/lib/mock-data/core";
import { BLOOM, DIFFICULTY, QTYPES, qTypeLabel, type Question, type QuestionInput } from "@/types/questions";
import { questionBankService } from "@/lib/api/questionBankService";
import { BloomBadge, DiffBadge, QStatusBadge, LANGUAGES, shareLabel } from "../questions/shared";
import { QuestionFormModal } from "../questions/QuestionForm";
import { QuestionDetail } from "../questions/QuestionDetail";
import { AIGenerateModal } from "../questions/AIGenerateModal";
import { AddToPaperModal } from "../questions/AddToPaperModal";

const F0 = { subject: "", grade: "", chapter: "", objective: "", type: "", marks: "", difficulty: "", bloom: "", language: "", tag: "", author: "", status: "" };
type Filters = typeof F0;
const PAGE = 8;
const SORTS = { updated: "Recently updated", marks: "Marks (high first)", bloom: "Bloom level", difficulty: "Difficulty", usage: "Most used" } as const;
const marksOk = (m: number, f: string) => !f || (f === "1" ? m <= 1 : f === "2-3" ? m >= 2 && m <= 3 : f === "4-5" ? m >= 4 && m <= 5 : m > 5);

function FS({ f, set, k, label, children }: { f: Filters; set: (k: keyof Filters, v: string) => void; k: keyof Filters; label: string; children: React.ReactNode }) {
  return <Select aria-label={label} value={f[k]} onChange={(e) => set(k, e.target.value)} className="!h-10 !w-auto min-w-[8.5rem] !rounded-full text-xs"><option value="">{label}</option>{children}</Select>;
}

export default function QuestionBankScreen({ role }: ScreenProps) {
  const { teacherId } = useActors(); const qc = useQueryClient(); const inst = role === "institution";
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["qb", role, teacherId], queryFn: () => questionBankService.list(role, teacherId) });
  const [query, setQuery] = React.useState(""); const [f, setF] = React.useState<Filters>(F0); const [sort, setSort] = React.useState<keyof typeof SORTS>("updated"); const [page, setPage] = React.useState(0); const [showF, setShowF] = React.useState(false);
  const [sel, setSel] = React.useState<string | null>(null); const [form, setForm] = React.useState<{ open: boolean; q?: Question }>({ open: false }); const [ai, setAi] = React.useState(false); const [addTo, setAddTo] = React.useState<Question | null>(null);
  const set = (k: keyof Filters, v: string) => { setF((p) => ({ ...p, [k]: v, ...(k === "subject" ? { chapter: "", objective: "" } : {}), ...(k === "chapter" ? { objective: "" } : {}) })); setPage(0); };
  const clear = () => { setF(F0); setQuery(""); setPage(0); };
  const refresh = () => qc.invalidateQueries({ queryKey: ["qb"] });
  const all = data ?? []; const selected = all.find((q) => q.id === sel) ?? null;
  const tags = React.useMemo(() => [...new Set(all.flatMap((q) => q.tags))].sort(), [all]); const authors = React.useMemo(() => [...new Map(all.map((q) => [q.authorId, q.authorName])).entries()], [all]);
  const chapters = React.useMemo(() => [...new Map(OBJECTIVES.filter((o) => !f.subject || o.subjectId === f.subject).map((o) => [o.chapterId, o.chapter])).entries()], [f.subject]);
  const objs = OBJECTIVES.filter((o) => (!f.subject || o.subjectId === f.subject) && (!f.chapter || o.chapterId === f.chapter));
  const rows = React.useMemo(() => {
    const t = query.trim().toLowerCase();
    const r = all.filter((q) => (!t || q.stem.toLowerCase().includes(t) || q.tags.some((x) => x.includes(t)) || q.id.includes(t)) && (!f.subject || q.subjectId === f.subject) && (!f.grade || q.gradeId === f.grade) && (!f.chapter || q.chapterId === f.chapter) && (!f.objective || q.objectiveIds.includes(f.objective)) && (!f.type || q.type === f.type) && marksOk(q.marks, f.marks) && (!f.difficulty || q.difficulty === f.difficulty) && (!f.bloom || q.bloom === f.bloom) && (!f.language || q.language === f.language) && (!f.tag || q.tags.includes(f.tag)) && (!f.author || q.authorId === f.author) && (!f.status || q.status === f.status));
    const bi = (b: string) => BLOOM.indexOf(b as (typeof BLOOM)[number]), di = (d: string) => DIFFICULTY.indexOf(d as (typeof DIFFICULTY)[number]);
    return r.sort((a, b) => sort === "marks" ? b.marks - a.marks : sort === "bloom" ? bi(a.bloom) - bi(b.bloom) : sort === "difficulty" ? di(a.difficulty) - di(b.difficulty) : sort === "usage" ? b.usage.length - a.usage.length : b.updatedAt.localeCompare(a.updatedAt));
  }, [all, query, f, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE)); const cur = Math.min(page, pages - 1); const view = rows.slice(cur * PAGE, cur * PAGE + PAGE);
  const hasF = Object.values(f).some(Boolean);

  const run = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: refresh, onError: (e: Error) => toast.error(e.message) });
  const act = (fn: () => Promise<unknown>, msg: string) => run.mutate(fn, { onSuccess: () => toast.success(msg) });
  const submitForm = async (input: QuestionInput, note: string) => { if (form.q) await questionBankService.update(form.q.id, input, teacherId, note); else await questionBankService.create(input, teacherId, role); await refresh(); };
  const pending = all.filter((q) => q.status === "in-review").length, drafts = all.filter((q) => q.status === "draft").length;

  return (
    <div>
      <PageHeader title="Question Bank" subtitle={inst ? "Institution-wide repository. Review and approve questions, manage sharing tiers and licensed content." : "Your questions plus those shared by your department and institution."}
        actions={<><Button variant="outline" onClick={() => act(() => questionBankService.importMock(teacherId), "Imported 3 draft questions from the sample CSV (mock)")}><UploadSimple size={18} />Import (mock)</Button><Button variant="soft" onClick={() => setAi(true)}><Sparkle size={18} />Generate with AI</Button><Button onClick={() => setForm({ open: true })}><Plus size={18} />New question</Button></>} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><StatTile label="Questions" value={all.length} /><StatTile label="Approved" value={all.filter((q) => q.status === "approved").length} /><StatTile label={inst ? "Awaiting your review" : "In review"} value={pending} /><StatTile label="Drafts" value={drafts} hint="incl. AI drafts" /></div>
      <ListToolbar query={query} onQuery={(v) => { setQuery(v); setPage(0); }} placeholder="Search questions, tags or IDs" count={rows.length} onClear={clear} hasFilters={hasF}>
        <Select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)} className="!h-10 !w-auto !rounded-full text-xs">{Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>Sort: {l}</option>)}</Select>
        <Button variant="outline" size="sm" aria-expanded={showF} onClick={() => setShowF((s) => !s)}><Funnel size={16} />Filters{hasF ? " •" : ""}</Button>
      </ListToolbar>
      {showF && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Question filters">
          <FS f={f} set={set} k="subject" label="Subject">{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</FS>
          <FS f={f} set={set} k="grade" label="Grade">{GRADES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</FS>
          <FS f={f} set={set} k="chapter" label="Chapter">{chapters.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</FS>
          <FS f={f} set={set} k="objective" label="Learning objective">{objs.map((o) => <option key={o.id} value={o.id}>{o.code} {o.title.slice(0, 28)}</option>)}</FS>
          <FS f={f} set={set} k="type" label="Question type">{QTYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</FS>
          <FS f={f} set={set} k="marks" label="Marks"><option value="1">1</option><option value="2-3">2–3</option><option value="4-5">4–5</option><option value="6+">6+</option></FS>
          <FS f={f} set={set} k="difficulty" label="Difficulty">{DIFFICULTY.map((d) => <option key={d}>{d}</option>)}</FS>
          <FS f={f} set={set} k="bloom" label="Bloom level">{BLOOM.map((d) => <option key={d}>{d}</option>)}</FS>
          <FS f={f} set={set} k="language" label="Language">{LANGUAGES.map((d) => <option key={d}>{d}</option>)}</FS>
          <FS f={f} set={set} k="tag" label="Tag">{tags.map((d) => <option key={d}>{d}</option>)}</FS>
          <FS f={f} set={set} k="author" label="Author">{authors.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</FS>
          <FS f={f} set={set} k="status" label="Approval status"><option value="draft">Draft</option><option value="in-review">In review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="archived">Archived</option></FS>
        </div>
      )}
      {isLoading ? <SkeletonCards n={5} h="h-24" /> : isError ? <ErrorState onRetry={() => refetch()} /> : !all.length ? <EmptyState title="Your question bank is empty" body="Create a question, import a CSV or let AI draft some from your learning objectives." action={{ label: "New question", onClick: () => setForm({ open: true }) }} /> : !rows.length ? <NoResults onClear={clear} query={query} /> : (
        <>
          <ul className="space-y-2">
            {view.map((q) => (
              <li key={q.id}><Card className="transition-shadow hover:shadow-md"><CardBody className="!p-3.5">
                <button className="block w-full text-left" onClick={() => setSel(q.id)} aria-label={`Open question ${q.id}`}>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs"><span className="tnum font-semibold text-text-2">{q.id}</span><QStatusBadge s={q.status} /><Badge>{qTypeLabel(q.type)}</Badge><BloomBadge b={q.bloom} /><DiffBadge d={q.difficulty} /><Badge className="tnum">{q.marks} mark{q.marks === 1 ? "" : "s"}</Badge>{q.aiGenerated && <AIBadge label="AI draft · demo" />}</div>
                  <p className="mt-1.5 line-clamp-2 text-sm font-medium">{q.stem}</p>
                  <p className="mt-1 text-xs text-text-2">{subjectById(q.subjectId).name} · {OBJECTIVES.find((o) => o.id === q.objectiveIds[0])?.chapter ?? "Unmapped"} · {q.authorName} · {shareLabel(q.share)} · v{q.version} · used in {q.usage.length} paper{q.usage.length === 1 ? "" : "s"}</p>
                </button>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {q.status === "approved" && <Button size="sm" variant="soft" onClick={() => setAddTo(q)}>Add to paper</Button>}
                  <Button size="sm" variant="ghost" onClick={() => act(() => questionBankService.duplicate(q.id, teacherId), "Duplicated as a private draft")}>Duplicate</Button>
                  {inst && q.status === "in-review" && <Button size="sm" variant="success" onClick={() => act(() => questionBankService.review(q.id, "approved", "Approved from list", role), "Question approved")}>Approve</Button>}
                </div>
              </CardBody></Card></li>
            ))}
          </ul>
          <nav className="mt-4 flex items-center justify-between" aria-label="Pagination"><Button variant="outline" size="sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Previous</Button><span className="tnum text-sm text-text-2" aria-live="polite">Page {cur + 1} of {pages}</span><Button variant="outline" size="sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next</Button></nav>
        </>
      )}
      <Drawer open={!!selected} onOpenChange={(v) => !v && setSel(null)} title={selected ? `Question ${selected.id}` : "Question"} width="sm:max-w-xl">
        {selected && <QuestionDetail q={selected} role={role} mine={selected.authorId === teacherId} busy={run.isPending} actions={{
          onEdit: () => setForm({ open: true, q: selected }), onDuplicate: () => act(() => questionBankService.duplicate(selected.id, teacherId), "Duplicated as a private draft"), onArchive: () => act(() => questionBankService.archive(selected.id), "Question archived"),
          onAddToPaper: () => setAddTo(selected), onShare: (s) => act(() => questionBankService.setShare(selected.id, s, role), `Sharing set to ${shareLabel(s)}`), onSubmitReview: () => act(() => questionBankService.submitForReview(selected.id), "Submitted for review"),
          onReview: (d) => act(() => questionBankService.review(selected.id, d, d === "approved" ? "Approved by reviewer" : "Needs revision", role), d === "approved" ? "Approved" : "Rejected"),
          onApproveAI: () => act(() => questionBankService.approveAIDraft(selected.id), "Teacher-approved; sent to the review queue"), onRegenerate: () => act(() => questionBankService.regenerate(selected.id), "Regenerated as a new version"), onReject: () => act(() => questionBankService.setStatus(selected.id, "rejected"), "AI draft rejected"),
        }} />}
      </Drawer>
      <QuestionFormModal open={form.open} onOpenChange={(v) => setForm((p) => ({ ...p, open: v }))} question={form.q} onSubmit={submitForm} />
      <AIGenerateModal open={ai} onOpenChange={setAi} teacherId={teacherId} onDone={refresh} />
      <AddToPaperModal q={addTo} role={role} teacherId={teacherId} onClose={() => setAddTo(null)} />
    </div>
  );
}
