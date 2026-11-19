"use client";
import { useEffect, useState } from "react";
import { Camera, Microphone, SpeakerHigh, WifiHigh, CheckCircle, WarningCircle, VideoCameraSlash, MicrophoneSlash, Info } from "@phosphor-icons/react";
import { Avatar, Button, Card, CardBody, Switch, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { RoomActor } from "./status";

type Perm = "granted" | "prompt" | "denied";
const PERM: Record<Perm, { label: string; tone: "success" | "warning" | "danger" }> = { granted: { label: "Allowed (simulated)", tone: "success" }, prompt: { label: "Would ask your browser", tone: "warning" }, denied: { label: "Blocked (simulated)", tone: "danger" } };

/** Pre-join device check. Everything here is simulated UI: no real camera, microphone or speaker is ever requested. */
export function PreJoin({ title, actor, hostName, onJoin, onCancel, joining }: { title: string; actor: RoomActor; hostName: string; onJoin: (s: { camera: boolean; mic: boolean }) => void; onCancel?: () => void; joining?: boolean }) {
  const [cam, setCam] = useState(false); const [mic, setMic] = useState(false);
  const [camPerm, setCamPerm] = useState<Perm>("prompt"); const [micPerm, setMicPerm] = useState<Perm>("prompt");
  const [level, setLevel] = useState(0); const [net, setNet] = useState<"checking" | "good">("checking"); const [spk, setSpk] = useState<"idle" | "played">("idle");
  useEffect(() => { const t = setTimeout(() => setNet("good"), 1400); return () => clearTimeout(t); }, []);
  useEffect(() => { if (!mic || micPerm !== "granted") { setLevel(0); return; } const t = setInterval(() => setLevel(Math.round(15 + Math.random() * 70)), 220); return () => clearInterval(t); }, [mic, micPerm]);
  const toggleCam = (v: boolean) => { if (v && camPerm === "prompt") setCamPerm("granted"); if (camPerm === "denied" && v) return; setCam(v); };
  const toggleMic = (v: boolean) => { if (v && micPerm === "prompt") setMicPerm("granted"); if (micPerm === "denied" && v) return; setMic(v); };
  return (
    <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-[1.2fr_1fr]">
      <div>
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-3xl bg-[#1d1b4b]" aria-label="Self preview (simulated)">
          {cam && camPerm === "granted" ? <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/60 to-violet/60"><Avatar name={actor.name} size={96} /><span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white">Camera preview (simulated, no camera in use)</span></div> : <div className="text-center text-white/80"><VideoCameraSlash size={44} /><p className="mt-2 text-sm">Camera is off</p></div>}
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <Button variant={cam ? "primary" : "outline"} onClick={() => toggleCam(!cam)} aria-pressed={cam}><Camera size={18} />{cam ? "Camera on" : "Camera off"}</Button>
          <Button variant={mic ? "primary" : "outline"} onClick={() => toggleMic(!mic)} aria-pressed={mic}><Microphone size={18} />{mic ? "Mic on" : "Mic off"}</Button>
        </div>
      </div>
      <Card><CardBody className="space-y-4">
        <div><h1 className="text-heading">{title}</h1><p className="text-sm text-text-2">Hosted by {hostName}. Joining as <strong>{actor.name}</strong>.</p></div>
        <p className="flex items-start gap-2 rounded-xl bg-highlight-soft p-3 text-xs text-warning"><Info size={16} className="mt-0.5 shrink-0" />Phase 1 simulation: no camera or microphone is used, and nothing is recorded.</p>
        <ul className="space-y-2.5 text-sm">
          <li className="flex items-center justify-between"><span className="flex items-center gap-2"><Camera size={18} />Camera</span><Badge tone={PERM[camPerm].tone}>{PERM[camPerm].label}</Badge></li>
          <li className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><Microphone size={18} />Microphone</span><span className="flex items-center gap-2"><div className="h-2 w-16 overflow-hidden rounded-full bg-surface-2" role="meter" aria-label="Microphone level (simulated)" aria-valuenow={level} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-success transition-all" style={{ width: `${level}%` }} /></div><Badge tone={PERM[micPerm].tone}>{PERM[micPerm].label}</Badge></span></li>
          <li className="flex items-center justify-between"><span className="flex items-center gap-2"><SpeakerHigh size={18} />Speaker</span><Button size="sm" variant="soft" onClick={() => setSpk("played")}>{spk === "played" ? "Heard it? Play again" : "Play test sound"}</Button></li>
          <li className="flex items-center justify-between"><span className="flex items-center gap-2"><WifiHigh size={18} />Network</span>{net === "checking" ? <span className="text-xs text-text-2" aria-live="polite">Checking…</span> : <span className="flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle size={14} weight="fill" />Good · 24 ms (simulated)</span>}</li>
        </ul>
        <div className="rounded-xl bg-surface-2 p-3 text-xs"><p className="mb-2 font-semibold">Demo: browser permission states</p><div className="flex flex-wrap gap-1.5">{(["prompt", "granted", "denied"] as Perm[]).map((p) => <button key={p} className={cn("rounded-full px-2.5 py-1 font-semibold", camPerm === p && micPerm === p ? "bg-primary text-primary-fg" : "bg-surface")} onClick={() => { setCamPerm(p); setMicPerm(p); if (p === "denied") { setCam(false); setMic(false); } }}>{p}</button>)}</div>{(camPerm === "denied" || micPerm === "denied") && <p className="mt-2 flex items-start gap-1.5 text-danger"><WarningCircle size={14} className="mt-0.5" /><span>Blocked devices: you can still join and listen. In a real browser you&apos;d allow access from the address bar.</span></p>}</div>
        <div className="flex items-center justify-between gap-2 text-sm"><span>Join with mic muted</span><Switch checked={!mic} onChange={(v) => toggleMic(!v)} label="Join muted" /></div>
        <div className="flex gap-2">{onCancel && <Button variant="ghost" onClick={onCancel}>Back</Button>}<Button className="flex-1" size="lg" loading={joining} disabled={net === "checking"} onClick={() => onJoin({ camera: cam && camPerm === "granted", mic: mic && micPerm === "granted" })}>{actor.role === "teacher" ? "Start class" : "Join class"}</Button></div>
        {micPerm === "denied" && <p className="flex items-center gap-1 text-xs text-text-2"><MicrophoneSlash size={14} />You&apos;ll join muted.</p>}
      </CardBody></Card>
    </div>
  );
}
