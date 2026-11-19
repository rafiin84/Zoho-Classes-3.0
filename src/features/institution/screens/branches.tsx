"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "@phosphor-icons/react";
import { PageHeader, Segmented, Button, Card, Badge, StatusBadge, Modal, Field, Input, Select, Switch, ConfirmDialog, EmptyState, toast, ListToolbar, NoResults } from "@/components/ui";
import { institutionService } from "@/lib/api/institutionService";
import type { BranchRecord, DepartmentRecord } from "@/types/institution";
import type { ScreenProps } from "@/types/screens";
import { useCtx, useQ, Q, DataTable, DemoNote, onErr, Panel } from "../kit";

const bSchema = z.object({ name: z.string().min(3, "Branch name needs at least 3 characters").max(60), city: z.string().min(2, "Enter a city"), head: z.string().min(3, "Name the branch head"), code: z.string().min(2, "2–5 letters").max(5, "2–5 letters") });
const dSchema = z.object({ name: z.string().min(2, "Department name is too short"), head: z.string().min(3, "Name the department head"), branchId: z.string().min(1), programmes: z.coerce.number().min(0, "Cannot be negative").max(50) });
const INHERIT: { k: keyof BranchRecord["inherit"]; l: string }[] = [{ k: "grading", l: "Grading scale" }, { k: "calendar", l: "Academic calendar" }, { k: "feePolicy", l: "Fee policy" }, { k: "aiPolicy", l: "AI provider policy" }];

export default function BranchesScreen(_: ScreenProps) {
  const { ctx, instName, isUniversity } = useCtx(); const qc = useQueryClient();
  const [tab, setTab] = React.useState<"branches" | "departments">("branches");
  const [q, setQ] = React.useState(""); const [edit, setEdit] = React.useState<Partial<BranchRecord> | null>(null); const [dEdit, setDEdit] = React.useState<Partial<DepartmentRecord> | null>(null);
  const [del, setDel] = React.useState<{ kind: "b" | "d"; id: string; name: string } | null>(null); const [arch, setArch] = React.useState<BranchRecord | null>(null);
  const br = useQ(["branches", ctx.inst], () => institutionService.branches(ctx.inst)); const dp = useQ(["departments", ctx.inst], () => institutionService.departments(ctx.inst));
  const inv = () => { ["branches", "departments", "overview", "hierarchy"].forEach((k) => qc.invalidateQueries({ queryKey: ["inst", k] })); };
  const archive = useMutation({ mutationFn: (b: BranchRecord) => institutionService.archiveBranch(b.id, b.status === "active"), onSuccess: () => { toast.success("Branch status updated."); inv(); setArch(null); }, onError: onErr });
  const remove = useMutation({ mutationFn: (d: { kind: "b" | "d"; id: string }) => d.kind === "b" ? institutionService.removeBranch(d.id) : institutionService.removeDepartment(d.id), onSuccess: () => { toast.success("Removed."); inv(); setDel(null); }, onError: (e) => { onErr(e); setDel(null); } });
  const unit = isUniversity ? "campus" : "branch";

  return (
    <div>
      <PageHeader title="Branches & Departments" subtitle={`${instName} · create and manage ${unit}es and departments. Settings are inherited from the institution unless overridden.`} actions={<Button onClick={() => tab === "branches" ? setEdit({}) : setDEdit({ branchId: "all" })}><Plus size={16} /> {tab === "branches" ? "Add branch" : "Add department"}</Button>} />
      <div className="mb-4"><Segmented label="View" value={tab} onChange={setTab} options={[{ value: "branches", label: "Branches" }, { value: "departments", label: "Departments" }]} /></div>
      {tab === "branches" && <Q q={br}>{(rows) => {
        const active = rows.filter((b) => b.status === "active");
        const f = rows.filter((b) => !q || `${b.name} ${b.city} ${b.head}`.toLowerCase().includes(q.toLowerCase()));
        return <div className="space-y-4">
          {rows.length === 0 ? <EmptyState title="Single-site institution (no branches)" body="This institution runs without branches: all classes, staff and fees sit directly under the institution. Add a branch only if you operate more than one site." action={{ label: "Add first branch", onClick: () => setEdit({}) }} />
            : <><DemoNote tone="info">{active.length > 1 ? `Multi-branch: ${active.length} active branches. Branch admins only see their own branch; the institution admin sees all.` : "One active branch. Branch filters stay simple until you add another."}</DemoNote>
              <ListToolbar query={q} onQuery={setQ} placeholder="Search branches" count={f.length} onClear={() => setQ("")} />
              {!f.length ? <NoResults query={q} onClear={() => setQ("")} /> : <div className="grid gap-3 md:grid-cols-2">{f.map((b) => (
                <Card key={b.id} className="p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-bold">{b.name}</h3><p className="text-xs text-text-2">{b.city} · code {b.code} · head {b.head}</p></div><StatusBadge status={b.status === "active" ? "active" : "archived"} label={b.status} /></div>
                  <p className="tnum mt-2 text-sm">{b.students.toLocaleString("en-IN")} students · {b.teachers} teachers</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{INHERIT.map((i) => <Badge key={i.k} tone={b.inherit[i.k] ? "neutral" : "warning"}>{i.l}: {b.inherit[i.k] ? "inherited" : "overridden"}</Badge>)}</div>
                  <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setEdit(b)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => setArch(b)}>{b.status === "active" ? "Archive" : "Restore"}</Button><Button size="sm" variant="ghost" onClick={() => setDel({ kind: "b", id: b.id, name: b.name })}>Delete</Button></div></Card>))}</div>}</>}
        </div>; }}</Q>}
      {tab === "departments" && <Q q={dp}>{(rows) => {
        const f = rows.filter((d) => !q || `${d.name} ${d.head}`.toLowerCase().includes(q.toLowerCase()));
        return <div><ListToolbar query={q} onQuery={setQ} placeholder="Search departments" count={f.length} onClear={() => setQ("")} />
          {!rows.length ? <EmptyState title="No departments yet" body="Departments group teachers and programmes. Add one to organise timetables and reporting." action={{ label: "Add department", onClick: () => setDEdit({ branchId: "all" }) }} /> : !f.length ? <NoResults query={q} onClear={() => setQ("")} /> :
            <DataTable ariaLabel="Departments" rows={f} rowKey={(d) => d.id} cols={[
              { key: "n", header: "Department", cell: (d) => <b>{d.name}</b>, sort: (a, b) => a.name.localeCompare(b.name) },
              { key: "b", header: "Branch", cell: (d) => d.branchId === "all" ? <Badge>All branches</Badge> : (br.data?.find((x) => x.id === d.branchId)?.name ?? d.branchId) },
              { key: "h", header: "Head", cell: (d) => d.head }, { key: "p", header: isUniversity ? "Programmes" : "Programmes / grades", cell: (d) => d.programmes, align: "right", sort: (a, b) => a.programmes - b.programmes },
              { key: "a", header: "", cell: (d) => <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setDEdit(d)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => setDel({ kind: "d", id: d.id, name: d.name })}>Delete</Button></div> },
            ]} />}</div>; }}</Q>}

      <BranchModal value={edit} onClose={() => setEdit(null)} inst={ctx.inst} onSaved={inv} />
      <DeptModal value={dEdit} onClose={() => setDEdit(null)} inst={ctx.inst} branches={br.data ?? []} onSaved={inv} />
      <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)} destructive title={`Delete ${del?.name}?`} body="This cannot be undone. A branch that still has students must be archived instead." confirmLabel="Delete" onConfirm={() => del && remove.mutate(del)} />
      <ConfirmDialog open={!!arch} onOpenChange={(v) => !v && setArch(null)} destructive={arch?.status === "active"} title={arch?.status === "active" ? `Archive ${arch?.name}?` : `Restore ${arch?.name}?`} body={arch?.status === "active" ? "Archived branches disappear from filters but keep their records and audit history." : "The branch returns to filters and dashboards."} confirmLabel={arch?.status === "active" ? "Archive" : "Restore"} onConfirm={() => arch && archive.mutate(arch)} />
    </div>
  );
}

function BranchModal({ value, onClose, inst, onSaved }: { value: Partial<BranchRecord> | null; onClose: () => void; inst: string; onSaved: () => void }) {
  const f = useForm<z.input<typeof bSchema>>({ resolver: zodResolver(bSchema) as never, values: { name: value?.name ?? "", city: value?.city ?? "", head: value?.head && value.head !== "Unassigned" ? value.head : "", code: value?.code ?? "" } });
  const [inh, setInh] = React.useState<BranchRecord["inherit"]>({ grading: true, calendar: true, feePolicy: true, aiPolicy: true });
  React.useEffect(() => { setInh(value?.inherit ?? { grading: true, calendar: true, feePolicy: true, aiPolicy: true }); }, [value]);
  const m = useMutation({ mutationFn: (d: z.input<typeof bSchema>) => institutionService.saveBranch({ ...value, ...d, institutionId: inst, inherit: inh }), onSuccess: () => { toast.success(value?.id ? "Branch updated." : "Branch created."); onSaved(); onClose(); }, onError: onErr });
  const e = f.formState.errors;
  return (
    <Modal open={!!value} onOpenChange={(v) => !v && onClose()} title={value?.id ? "Edit branch" : "Add branch"} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={f.handleSubmit((d) => m.mutate(d))}>Save branch</Button></>}>
      <form className="space-y-3" onSubmit={f.handleSubmit((d) => m.mutate(d))}>
        <Field label="Name" error={e.name?.message} required htmlFor="b-n"><Input id="b-n" aria-invalid={!!e.name} {...f.register("name")} /></Field>
        <div className="grid grid-cols-3 gap-3"><Field label="City" error={e.city?.message} required htmlFor="b-c" className="col-span-2"><Input id="b-c" aria-invalid={!!e.city} {...f.register("city")} /></Field><Field label="Code" error={e.code?.message} required htmlFor="b-k"><Input id="b-k" aria-invalid={!!e.code} {...f.register("code")} /></Field></div>
        <Field label="Branch head" error={e.head?.message} required htmlFor="b-h"><Input id="b-h" aria-invalid={!!e.head} {...f.register("head")} /></Field>
        <fieldset className="space-y-2"><legend className="text-sm font-semibold">Inherit from institution</legend>{INHERIT.map((i) => <div key={i.k} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"><span>{i.l}</span><Switch checked={inh[i.k]} onChange={(v) => setInh({ ...inh, [i.k]: v })} label={`Inherit ${i.l}`} /></div>)}</fieldset>
        <button type="submit" className="sr-only">Save</button>
      </form>
    </Modal>
  );
}
function DeptModal({ value, onClose, inst, branches, onSaved }: { value: Partial<DepartmentRecord> | null; onClose: () => void; inst: string; branches: BranchRecord[]; onSaved: () => void }) {
  const f = useForm<z.input<typeof dSchema>>({ resolver: zodResolver(dSchema) as never, values: { name: value?.name ?? "", head: value?.head && value.head !== "Unassigned" ? value.head : "", branchId: value?.branchId ?? "all", programmes: value?.programmes ?? 0 } });
  const m = useMutation({ mutationFn: (d: z.input<typeof dSchema>) => institutionService.saveDepartment({ ...value, name: d.name, head: d.head, branchId: d.branchId, programmes: Number(d.programmes), institutionId: inst }), onSuccess: () => { toast.success(value?.id ? "Department updated." : "Department created."); onSaved(); onClose(); }, onError: onErr });
  const e = f.formState.errors;
  return (
    <Modal open={!!value} onOpenChange={(v) => !v && onClose()} title={value?.id ? "Edit department" : "Add department"} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={f.handleSubmit((d) => m.mutate(d))}>Save department</Button></>}>
      <form className="space-y-3" onSubmit={f.handleSubmit((d) => m.mutate(d))}>
        <Field label="Name" error={e.name?.message} required htmlFor="d-n"><Input id="d-n" aria-invalid={!!e.name} {...f.register("name")} /></Field>
        <Field label="Head of department" error={e.head?.message} required htmlFor="d-h"><Input id="d-h" aria-invalid={!!e.head} {...f.register("head")} /></Field>
        <Field label="Branch" htmlFor="d-b"><Select id="d-b" {...f.register("branchId")}><option value="all">All branches (shared)</option>{branches.filter((b) => b.status === "active").map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
        <Field label="Programmes / grades" error={e.programmes?.message} htmlFor="d-p"><Input id="d-p" type="number" aria-invalid={!!e.programmes} {...f.register("programmes")} /></Field>
        <button type="submit" className="sr-only">Save</button>
      </form>
    </Modal>
  );
}
