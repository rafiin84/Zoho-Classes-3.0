"use client";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Card, Button, Badge, Modal, Field, Input, Textarea, Switch, ConfirmDialog, Icon, toast, DemoTag, ListToolbar, NoResults } from "@/components/ui";
import { integrationService } from "@/lib/api/integrationService";
import type { Connector } from "@/types/institution";
import { relTime } from "@/lib/format";
import type { ScreenProps } from "@/types/screens";
import { useQ, Q, DemoNote, onErr } from "../kit";

const FIELDS: Record<string, { k: string; l: string; ph?: string; area?: boolean }[]> = {
  saml: [{ k: "entityId", l: "Entity ID", ph: "https://idp.school.example/entity" }, { k: "ssoUrl", l: "SSO URL (https)", ph: "https://idp.school.example/sso" }, { k: "metadataUrl", l: "Metadata URL", ph: "https://idp.school.example/metadata.xml" }, { k: "metadataXml", l: "…or paste metadata XML", area: true }, { k: "emailAttr", l: "Attribute → email" }, { k: "nameAttr", l: "Attribute → display name" }, { k: "roleAttr", l: "Attribute → role" }],
};
const tone = (s: Connector["state"]) => (s === "Connected (demo)" ? "success" : s === "Demo" ? "highlight" : "neutral") as "success" | "highlight" | "neutral";

export default function IntegrationsScreen(_: ScreenProps) {
  const qc = useQueryClient(); const list = useQ(["integrations"], () => integrationService.list()); const [q, setQ] = React.useState(""); const [cfg, setCfg] = React.useState<Connector | null>(null); const [disc, setDisc] = React.useState<Connector | null>(null);
  const inv = () => { qc.invalidateQueries({ queryKey: ["inst", "integrations"] }); qc.invalidateQueries({ queryKey: ["inst", "audit"] }); };
  const con = useMutation({ mutationFn: (id: string) => integrationService.connect(id), onSuccess: (c) => { toast.success(`${c.name}: connected in demo mode. No real connection exists.`); inv(); }, onError: onErr });
  const dc = useMutation({ mutationFn: (id: string) => integrationService.disconnect(id), onSuccess: () => { toast.success("Disconnected."); setDisc(null); inv(); }, onError: onErr });
  const sync = useMutation({ mutationFn: (id: string) => integrationService.sync(id), onSuccess: () => { toast.success("Sync simulated."); inv(); }, onError: onErr });
  const test = useMutation({ mutationFn: (v: { id: string; o: "success" | "failure" }) => integrationService.test(v.id, v.o), onSuccess: (r) => { (r.ok ? toast.success : toast.error)(r.msg); inv(); }, onError: onErr });
  return (
    <div>
      <PageHeader title="Integrations" subtitle="Connect Zoho apps, identity, government and learning systems." actions={<DemoTag label="All connections simulated" />} />
      <DemoNote>Every connector here is a simulation. “Connected (demo)” never means a real external connection, and tests are scripted outcomes.</DemoNote>
      <ListToolbar query={q} onQuery={setQ} placeholder="Search connectors" onClear={() => setQ("")} />
      <Q q={list} rows={4}>{(all) => { const rows = all.filter((c) => !q || `${c.name} ${c.purpose}`.toLowerCase().includes(q.toLowerCase())); return !rows.length ? <NoResults query={q} onClear={() => setQ("")} /> : (
        <div className="grid gap-3 md:grid-cols-2">{rows.map((c) => (
          <Card key={c.id} className="p-4"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lilac text-primary"><Icon name={c.icon} size={22} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{c.name}</h3><Badge tone={tone(c.state)}>{c.state}</Badge></div><p className="mt-1 text-sm text-text-2">{c.purpose}</p><p className="mt-1 text-xs text-text-2">Scope: {c.scope} · Last sync: {c.lastSync ? relTime(c.lastSync) : "never"}</p></div></div>
            <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setCfg(c)}>Configure</Button><Button size="sm" variant="outline" loading={test.isPending && test.variables?.id === c.id} onClick={() => test.mutate({ id: c.id, o: "success" })}>Test</Button>
              {c.state === "Connected (demo)" ? <><Button size="sm" variant="ghost" onClick={() => sync.mutate(c.id)}>Sync now</Button><Button size="sm" variant="ghost" onClick={() => setDisc(c)}>Disconnect</Button></> : <Button size="sm" onClick={() => con.mutate(c.id)} loading={con.isPending && con.variables === c.id}>Connect (demo)</Button>}</div></Card>))}</div>); }}</Q>
      <Config c={cfg} onClose={() => setCfg(null)} onDone={inv} onTest={(id, o) => test.mutate({ id, o })} />
      <ConfirmDialog open={!!disc} onOpenChange={(v) => !v && setDisc(null)} destructive title={`Disconnect ${disc?.name}?`} body="Syncing stops. Existing data stays in place." confirmLabel="Disconnect" onConfirm={() => disc && dc.mutate(disc.id)} />
    </div>
  );
}

function Config({ c, onClose, onDone, onTest }: { c: Connector | null; onClose: () => void; onDone: () => void; onTest: (id: string, o: "success" | "failure") => void }) {
  const [v, setV] = React.useState<Record<string, string>>({}); const [fail, setFail] = React.useState(false); const [err, setErr] = React.useState("");
  React.useEffect(() => { setV(c?.config ?? {}); setErr(""); setFail(false); }, [c]);
  const fields = c ? FIELDS[c.id] ?? Object.keys(c.config).map((k) => ({ k, l: k.replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase()) })) : [];
  const save = useMutation({ mutationFn: () => integrationService.saveConfig(c!.id, v), onSuccess: () => { toast.success("Configuration saved (demo)."); setErr(""); onDone(); }, onError: (e) => setErr(e instanceof Error ? e.message : "Invalid") });
  return (
    <Modal open={!!c} onOpenChange={(x) => !x && onClose()} className="sm:max-w-xl" title={`Configure ${c?.name ?? ""}`} description="Simulated set-up — nothing is transmitted."
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="outline" onClick={() => c && onTest(c.id, fail ? "failure" : "success")}>Run test</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-3">{err && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}
        {fields.length === 0 && <p className="text-sm text-text-2">No settings for this connector yet.</p>}
        {fields.map((f) => <Field key={f.k} label={f.l} htmlFor={`cf-${f.k}`}>{f.area ? <Textarea id={`cf-${f.k}`} value={v[f.k] ?? ""} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} /> : <Input id={`cf-${f.k}`} placeholder={f.ph} value={v[f.k] ?? ""} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} />}</Field>)}
        <div className="flex items-center justify-between rounded-xl border border-border p-3 text-sm"><span>Make the next test fail (to see the error path)</span><Switch checked={fail} onChange={setFail} label="Simulate test failure" /></div>
        {c && c.testLog.length > 0 && <ul className="space-y-1 text-xs" aria-label="Test log">{c.testLog.slice(0, 4).map((t, i) => <li key={i} className={t.ok ? "text-success" : "text-danger"}>{relTime(t.at)} · {t.msg}</li>)}</ul>}</div>
    </Modal>
  );
}
