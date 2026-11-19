"use client";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "@phosphor-icons/react";
import { PageHeader, Segmented, Button, Badge, StatusBadge, Modal, Field, Select, Textarea, Avatar, Drawer, ListToolbar, NoResults, EmptyState, toast, Input } from "@/components/ui";
import { institutionService } from "@/lib/api/institutionService";
import { ROLE_MATRIX, ROLE_MATRIX_AREAS } from "@/lib/api/governanceService";
import type { DirectoryPerson, PersonKind } from "@/types/institution";
import { fmtDate } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { useCtx, useQ, Q, DataTable, DemoNote, onErr, Panel } from "../kit";

const KINDS: { value: PersonKind | "matrix"; label: string }[] = [{ value: "student", label: "Students" }, { value: "teacher", label: "Teachers" }, { value: "staff", label: "Staff" }, { value: "parent", label: "Parents" }, { value: "matrix", label: "Roles & access" }];
const ROLES = ["Student", "Teacher", "Faculty", "Institution admin", "Branch admin", "Registrar / exam office", "Finance staff", "Parent / guardian", "Counsellor", "Librarian"];

export default function PeopleScreen(_: ScreenProps) {
  const { ctx, instName } = useCtx(); const qc = useQueryClient();
  const [kind, setKind] = React.useState<PersonKind | "matrix">("student");
  const [q, setQ] = React.useState(""); const [status, setStatus] = React.useState(""); const [unit, setUnit] = React.useState(""); const [sel, setSel] = React.useState<DirectoryPerson | null>(null); const [inv, setInv] = React.useState(false);
  const [emails, setEmails] = React.useState(""); const [role, setRole] = React.useState("Teacher"); const [group, setGroup] = React.useState("");
  const list = useQ(["people", ctx.inst], () => institutionService.people(ctx.inst));
  const mem = useQ(["memberships", sel?.id ?? ""], () => institutionService.memberships(sel?.id));
  const inval = () => { qc.invalidateQueries({ queryKey: ["inst", "people"] }); qc.invalidateQueries({ queryKey: ["inst", "audit"] }); };
  const setR = useMutation({ mutationFn: (v: { id: string; role: string }) => institutionService.setRole(v.id, v.role), onSuccess: (p) => { toast.success(`Role changed to ${p.role}.`); setSel(p); inval(); }, onError: onErr });
  const verify = useMutation({ mutationFn: (v: { id: string; s: "verified" | "limited" | "pending-verification" }) => institutionService.verifyParent(v.id, v.s), onSuccess: (p) => { toast.success("Relationship state updated (prototype)."); setSel(p); inval(); }, onError: onErr });
  const alum = useMutation({ mutationFn: (v: { id: string; a: boolean }) => institutionService.setAlumni(v.id, v.a), onSuccess: (p) => { toast.success(p.status === "alumni" ? "Marked as alumni." : "Reinstated as active."); setSel(p); inval(); }, onError: onErr });
  const enrol = useMutation({ mutationFn: (p: DirectoryPerson) => institutionService.addMembership({ personId: p.id, personName: p.name, groupId: `lg-${group.toLowerCase().replace(/\W+/g, "-")}`, groupName: group, kind: "learning-group", start: "2026-11-19" }), onSuccess: () => { toast.success("Enrolled with an effective start date."); setGroup(""); qc.invalidateQueries({ queryKey: ["inst", "memberships"] }); }, onError: onErr });
  const invite = useMutation({ mutationFn: () => institutionService.invite(emails.split(/[\s,;]+/).filter(Boolean), role, ctx.inst), onSuccess: (r) => { if (r.invalid.length) toast.warning(`${r.sent} invited. Skipped invalid: ${r.invalid.join(", ")}`); else toast.success(`${r.sent} invitation(s) queued (mock — no email sent).`); if (r.sent) { setInv(false); setEmails(""); inval(); } }, onError: onErr });

  const rows = (list.data ?? []).filter((p) => p.kind === kind && (!q || `${p.name} ${p.email} ${p.unit}`.toLowerCase().includes(q.toLowerCase())) && (!status || p.status === status) && (!unit || p.unit === unit));
  const units = [...new Set((list.data ?? []).filter((p) => p.kind === kind).map((p) => p.unit))].slice(0, 20);
  const clear = () => { setQ(""); setStatus(""); setUnit(""); };
  return (
    <div>
      <PageHeader title="People & Enrolments" subtitle={`${instName} · directories, roles, enrolments and alumni.`} actions={<Button onClick={() => setInv(true)}><UserPlus size={16} /> Bulk invite</Button>} />
      <div className="mb-4 overflow-x-auto"><Segmented label="Directory" value={kind} onChange={(v) => { setKind(v); clear(); }} options={KINDS} /></div>
      {kind === "matrix" ? (
        <Panel title="Role-based access matrix"><DemoNote>Prototype-only illustration of permissions. Not production access control.</DemoNote>
          <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm" aria-label="Role access matrix"><thead><tr className="text-left text-xs text-text-2"><th className="p-2">Area</th>{ROLE_MATRIX.map((r) => <th key={r.id} className="p-2">{r.label}</th>)}</tr></thead><tbody>{ROLE_MATRIX_AREAS.map((a) => <tr key={a} className="border-t border-border"><th scope="row" className="p-2 text-left font-medium">{a}</th>{ROLE_MATRIX.map((r) => <td key={r.id} className="p-2"><Badge tone={r.permissions[a] === "full" ? "success" : r.permissions[a] === "none" ? "danger" : r.permissions[a] === "scoped" ? "info" : "neutral"}>{r.permissions[a]}</Badge></td>)}</tr>)}</tbody></table></div></Panel>
      ) : (
        <Q q={list} rows={4} h="h-12">{() => (
          <div>
            <ListToolbar query={q} onQuery={setQ} placeholder={`Search ${kind}s by name, email or class`} count={rows.length} hasFilters={!!(status || unit)} onClear={clear}>
              <Select aria-label="Status" className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option>{["active", "alumni", "on-leave", "invited", "verified", "pending-verification", "limited"].map((s) => <option key={s}>{s}</option>)}</Select>
              <Select aria-label="Unit" className="w-auto max-w-44" value={unit} onChange={(e) => setUnit(e.target.value)}><option value="">All {kind === "student" ? "classes" : "units"}</option>{units.map((u) => <option key={u}>{u}</option>)}</Select>
            </ListToolbar>
            {!rows.length ? ((list.data ?? []).some((p) => p.kind === kind) ? <NoResults query={q} onClear={clear} /> : <EmptyState title={`No ${kind}s yet`} body="Invite people to populate this directory." action={{ label: "Bulk invite", onClick: () => setInv(true) }} />) :
              <DataTable ariaLabel={`${kind} directory`} rows={rows} rowKey={(p) => p.id} onRowClick={setSel} cols={[
                { key: "n", header: "Name", cell: (p) => <span className="flex items-center gap-2"><Avatar name={p.name} size={28} /><span className="font-semibold">{p.name}</span></span>, sort: (a, b) => a.name.localeCompare(b.name) },
                { key: "u", header: kind === "student" ? "Class" : "Unit", cell: (p) => p.unit, sort: (a, b) => a.unit.localeCompare(b.unit) }, { key: "r", header: "Role", cell: (p) => p.role },
                { key: "s", header: "Status", cell: (p) => <StatusBadge status={p.status} />, sort: (a, b) => a.status.localeCompare(b.status) }, { key: "j", header: "Joined", cell: (p) => fmtDate(p.joined), sort: (a, b) => a.joined.localeCompare(b.joined) }]} />}
          </div>)}</Q>)}

      <Drawer open={!!sel} onOpenChange={(v) => !v && setSel(null)} title={sel?.name ?? ""} width="sm:max-w-lg">
        {sel && <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2"><Badge tone="primary">{sel.role}</Badge><StatusBadge status={sel.status} /></div>
          <p className="text-text-2">{sel.email} · {sel.unit}</p>
          <Field label="Role" htmlFor="pr"><Select id="pr" value={ROLES.includes(sel.role) ? sel.role : ""} onChange={(e) => setR.mutate({ id: sel.id, role: e.target.value })} disabled={setR.isPending}>{!ROLES.includes(sel.role) && <option value="">{sel.role}</option>}{ROLES.map((r) => <option key={r}>{r}</option>)}</Select></Field>
          {sel.kind === "parent" && <Panel title="Relationship verification (prototype)"><p className="mb-2 text-xs text-text-2">Verified guardians see their child's records. Limited guardians see only public updates.</p><div className="flex flex-wrap gap-2">{(["verified", "limited", "pending-verification"] as const).map((s) => <Button key={s} size="sm" variant={sel.status === s ? "primary" : "outline"} onClick={() => verify.mutate({ id: sel.id, s })}>{s.replace("-", " ")}</Button>)}</div></Panel>}
          {sel.kind === "student" && <>
            <Panel title="Enrol in a class or group"><div className="flex gap-2"><Input aria-label="Group name" placeholder="e.g. Chess ladder" value={group} onChange={(e) => setGroup(e.target.value)} /><Button disabled={group.trim().length < 3} loading={enrol.isPending} onClick={() => enrol.mutate(sel)}>Enrol</Button></div></Panel>
            <Panel title="Membership timeline"><Q q={mem} rows={1} h="h-16">{(m) => !m.length ? <p className="text-text-2">No recorded memberships.</p> : <ul className="space-y-1.5">{m.map((x) => <li key={x.id} className="flex justify-between gap-2"><span>{x.groupName}<span className="block text-xs text-text-2">{fmtDate(x.start)} → {x.end ? fmtDate(x.end) : "open"}</span></span><StatusBadge status={x.state === "ended" ? "removed" : x.state} label={x.state} /></li>)}</ul>}</Q></Panel>
            <Button variant="outline" onClick={() => alum.mutate({ id: sel.id, a: sel.status !== "alumni" })}>{sel.status === "alumni" ? "Reinstate as active" : "Mark as alumni"}</Button></>}
        </div>}
      </Drawer>
      <Modal open={inv} onOpenChange={setInv} title="Bulk invite (mock)" footer={<><Button variant="ghost" onClick={() => setInv(false)}>Cancel</Button><Button loading={invite.isPending} disabled={!emails.trim()} onClick={() => invite.mutate()}>Send invitations</Button></>}>
        <div className="space-y-3"><Field label="Role" htmlFor="iv-r"><Select id="iv-r" value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</Select></Field><Field label="Emails (comma, space or line separated)" htmlFor="iv-e" hint="No email is sent."><Textarea id="iv-e" value={emails} onChange={(e) => setEmails(e.target.value)} /></Field></div>
      </Modal>
    </div>
  );
}
