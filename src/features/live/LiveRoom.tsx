"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Microphone, MicrophoneSlash, VideoCamera, VideoCameraSlash, MonitorArrowUp, Hand, ChatCircleText, UsersThree, ClosedCaptioning, SignOut, Lock, LockOpen, Info, PaperPlaneTilt, Crown, ShieldCheck, Prohibit, Check, Gear, FilePdf } from "@phosphor-icons/react";
import { liveClassService } from "@/lib/api";
import { attendanceService } from "@/lib/api/attendanceService";
import { Avatar, Button, Card, CardBody, Badge, ConfirmDialog, Input, Skeleton, ErrorState, EmptyState, Switch, toast, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import { fmtDateTime } from "@/lib/format";
import type { LiveClass } from "@/types";
import { PreJoin } from "./PreJoin";
import { liveLabel, type RoomActor } from "./status";
export { PreJoin } from "./PreJoin";

type Part = LiveClass["participants"][number];
type Stage = "prejoin" | "room" | "summary";
type Panel = "chat" | "people" | "host" | null;
interface Chat { id: number; from: string; text: string; mine?: boolean; at: string }
const SLIDES = ["Today: unlike fractions", "Step 1: find the common denominator", "Step 2: rewrite and add", "Common mistake: adding the bottoms", "Your turn: try 3/5 + 1/4"];
const CAPTIONS = ["Let's start with what a common denominator really is.", "Both fractions need pieces of the same size.", "Twelve works for fourths and thirds, so rewrite each one.", "Now add the numerators and keep the denominator.", "Does the answer look bigger than each fraction we began with?"];
const nowT = () => new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Simulated meeting room (Phase 1): no WebRTC, camera or microphone. `mode="host"` mounts host controls. */
export function LiveRoom({ meetingId, mode, actor, exitHref }: { meetingId: string; mode: "student" | "host"; actor: RoomActor; exitHref?: string }) {
  const qc = useQueryClient(); const host = mode === "host";
  const [stage, setStage] = useState<Stage>("prejoin"); const [joining, setJoining] = useState(false);
  const [mic, setMic] = useState(false); const [cam, setCam] = useState(false); const [hand, setHand] = useState(false); const [captions, setCaptions] = useState(false); const [capIdx, setCapIdx] = useState(0);
  const [panel, setPanel] = useState<Panel>(host ? "host" : "chat"); const [chat, setChat] = useState<Chat[]>([]); const [draft, setDraft] = useState("");
  const [speaker, setSpeaker] = useState<string | null>(null); const [elapsed, setElapsed] = useState(0); const [slide, setSlide] = useState(0);
  const [confirmLeave, setConfirmLeave] = useState(false); const [confirmEnd, setConfirmEnd] = useState(false); const [endedBy, setEndedBy] = useState<"me" | "host" | "left" | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]); const chatId = useRef(0);
  const q = useQuery({ queryKey: ["live", "room", meetingId], queryFn: () => liveClassService.get(meetingId), refetchInterval: stage === "room" ? 1200 : false });
  const rq = useQuery({ queryKey: ["live", "roomstate", meetingId], queryFn: () => liveClassService.roomState(meetingId), refetchInterval: stage === "room" ? 1200 : false, enabled: stage === "room" });
  const m = q.data; const room = rq.data;
  const refresh = useCallback(() => { qc.invalidateQueries({ queryKey: ["live"] }); }, [qc]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const say = useCallback((from: string, text: string, mine = false) => setChat((c) => [...c, { id: ++chatId.current, from, text, mine, at: nowT() }]), []);

  const me = m?.participants.find((p) => p.id === actor.id);
  const joined = (m?.participants ?? []).filter((p) => p.state === "joined"); const waiting = (m?.participants ?? []).filter((p) => p.state === "waiting");
  const iAmIn = me?.state === "joined"; const removed = me?.state === "removed";

  const doJoin = async (s: { camera: boolean; mic: boolean }) => {
    if (!m) return; setJoining(true);
    try {
      if (m.status === "Cancelled" || m.status === "Completed") { toast.error(`This class is ${m.status.toLowerCase()}.`); return; }
      const rs = await liveClassService.roomState(meetingId);
      if (rs.locked && !host) { toast.error("The host has locked this room. Ask them to let you in."); return; }
      liveClassService.markJoinTime(meetingId, actor.id);
      if (!host && m.status !== "Live") { await liveClassService.join(meetingId, { id: m.hostId, name: m.hostName, role: "teacher" }); liveClassService.markJoinTime(meetingId, m.hostId); await liveClassService.hostAction(meetingId, m.hostId, "unmute"); toast.info(`${m.hostName} started the class (demo: host auto-starts).`); }
      await liveClassService.join(meetingId, actor);
      if (host) await liveClassService.hostAction(meetingId, actor.id, s.mic ? "unmute" : "mute");
      else if (s.mic) await liveClassService.hostAction(meetingId, actor.id, "unmute");
      setMic(s.mic); setCam(s.camera); setStage("room"); say("System", host ? "You started the class. Students will appear in the waiting room." : "You joined. The host can admit you from the waiting room.");
      refresh();
      if (host) {
        const roster = await attendanceService.roster(m.classIds[0] ?? "cls-8b"); const arrivals = roster.filter((r) => r.id !== actor.id).slice(0, 5);
        arrivals.forEach((r, i) => later(async () => { const cur = await liveClassService.roomState(meetingId); if (cur.locked) { say("System", `${r.name} tried to join, but the room is locked.`); return; } await liveClassService.join(meetingId, { id: r.id, name: r.name, role: "student" }); liveClassService.markJoinTime(meetingId, r.id); if (i === 1) say(r.name, "Good morning ma'am!"); refresh(); }, 1800 + i * 1700));
      } else {
        const roster = await attendanceService.roster(m.classIds[0] ?? "cls-8b");
        roster.filter((r) => r.id !== actor.id).slice(0, 4).forEach((r, i) => later(async () => { await liveClassService.join(meetingId, { id: r.id, name: r.name, role: "student" }); await liveClassService.hostAction(meetingId, r.id, "admit"); liveClassService.markJoinTime(meetingId, r.id); refresh(); }, 1200 + i * 1500));
        if (m.waitingRoom) later(async () => { await liveClassService.hostAction(meetingId, actor.id, "admit"); say("System", `${m.hostName} admitted you.`); refresh(); }, 2600);
        later(() => say(m.hostName, "Welcome everyone. We'll start in a minute."), 3500);
      }
    } catch (e) { toast.error((e as Error).message || "Couldn't join. Try again."); } finally { setJoining(false); }
  };

  // timers: elapsed, speaker, captions, simulated chat
  useEffect(() => { if (stage !== "room") return; const t = setInterval(() => setElapsed((e) => e + 1), 1000); return () => clearInterval(t); }, [stage]);
  useEffect(() => { if (stage !== "room") return; const t = setInterval(() => { const cands = joined.filter((p) => !p.muted || p.role === "teacher"); setSpeaker(cands.length ? cands[Math.floor(Math.random() * cands.length)].id : null); }, 2400); return () => clearInterval(t); });
  useEffect(() => { if (!captions) return; const t = setInterval(() => setCapIdx((i) => (i + 1) % CAPTIONS.length), 4000); return () => clearInterval(t); }, [captions]);
  useEffect(() => { if (stage !== "room" || host) return; later(() => say("Kabir Mehta", "Can you show the example again?"), 9000); }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps
  // end/removal detection for students
  useEffect(() => { if (stage === "room" && !host && m?.status === "Completed") { setEndedBy("host"); setStage("summary"); } }, [m?.status, stage, host]);
  useEffect(() => { if (stage === "room" && removed) { setEndedBy("left"); setStage("summary"); } }, [removed, stage]);

  const toggleMic = async () => { if (!host && room && !room.studentsMaySpeak && !mic) { toast.error("The host has muted participants for now."); return; } const v = !mic; setMic(v); await liveClassService.hostAction(meetingId, actor.id, v ? "unmute" : "mute"); };
  const toggleHand = async () => { const v = !hand; setHand(v); await liveClassService.raiseHand(meetingId, actor.id, v); if (v) say("System", "You raised your hand."); refresh(); };
  const sharing = room?.screenSharerId; const iShare = sharing === actor.id; const canShare = host || room?.studentsMayShare;
  const toggleShare = async () => { if (!canShare) { toast.info("Only the host can share unless they allow it."); return; } await liveClassService.setRoom(meetingId, { screenSharerId: iShare ? undefined : actor.id }); refresh(); };
  const send = () => { const t = draft.trim(); if (!t) return; say(actor.name, t, true); setDraft(""); };
  const leave = async () => { await liveClassService.leave(meetingId, actor.id); setEndedBy("left"); setStage("summary"); refresh(); };
  const endAll = async () => { await liveClassService.endForAll(meetingId); setEndedBy("me"); setStage("summary"); refresh(); toast.success("Class ended for everyone. Attendance saved."); };
  const hostAct = async (id: string, a: "admit" | "remove" | "mute" | "unmute") => { await liveClassService.hostAction(meetingId, id, a); refresh(); };
  const admitAll = async () => { for (const p of waiting) await liveClassService.hostAction(meetingId, p.id, "admit"); refresh(); toast.success(`Admitted ${waiting.length}`); };
  const muteAll = async () => { for (const p of joined.filter((x) => x.role !== "teacher")) await liveClassService.hostAction(meetingId, p.id, "mute"); refresh(); toast.success("Everyone muted"); };

  if (q.isLoading) return <div className="space-y-3"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-96" /></div>;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!m) return <EmptyState title="Class not found" body="This live class doesn't exist or you don't have access." action={{ label: "Back to live classes", href: exitHref ?? "/student/live-classes" }} />;
  const back = exitHref ?? (host ? "/teacher/live-classes" : "/student/live-classes");

  if (stage === "prejoin") return <div className="py-2">{m.status === "Cancelled" || m.status === "Completed" ? <EmptyState title={`This class is ${m.status.toLowerCase()}`} body="You can't join a class that has ended or been cancelled." action={{ label: "Back to live classes", href: back }} /> : <PreJoin title={m.title} hostName={m.hostName} actor={actor} joining={joining} onJoin={doJoin} onCancel={() => { window.location.href = back; }} />}</div>;
  if (stage === "summary") return <Summary m={m} actor={actor} host={host} endedBy={endedBy} elapsed={elapsed} back={back} onResource={async (n) => { await liveClassService.addResource(meetingId, n); refresh(); }} />;

  const tiles = joined;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#1d1b4b] px-4 py-2.5 text-white">
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{m.title}</p><p className="text-xs text-white/70">{liveLabel(m)} · {mmss(elapsed)} · {joined.length} in room</p></div>
        <div className="flex flex-wrap items-center gap-2 text-xs"><Badge tone="highlight" icon={<Info size={12} />}>Phase 1 simulation: no camera or microphone is used</Badge><Badge tone="neutral">Not recorded</Badge>{room?.locked && <Badge tone="warning" icon={<Lock size={12} />}>Locked</Badge>}</div>
      </div>
      {!iAmIn && !host && <div role="status" className="rounded-2xl bg-warning-soft p-4 text-sm text-warning">Waiting for the host to let you in… (demo: this takes a few seconds)</div>}
      <div className={cn("grid gap-3", panel ? "lg:grid-cols-[1fr_340px]" : "")}>
        <div className="space-y-3">
          {sharing ? (
            <div className="relative aspect-video overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-violet p-6 text-white"><Badge tone="highlight">{joined.find((p) => p.id === sharing)?.name ?? "Host"} is sharing their screen (simulated)</Badge><div className="flex h-full flex-col items-center justify-center text-center"><p className="text-sm text-white/70">Slide {slide + 1} of {SLIDES.length}</p><p className="mt-2 max-w-md text-2xl font-bold sm:text-4xl">{SLIDES[slide]}</p></div>{(host || iShare) && <div className="absolute bottom-3 right-3 flex gap-2"><Button size="sm" variant="outline" disabled={slide === 0} onClick={() => setSlide(slide - 1)}>Prev</Button><Button size="sm" variant="outline" disabled={slide === SLIDES.length - 1} onClick={() => setSlide(slide + 1)}>Next</Button></div>}</div>
          ) : null}
          <div className={cn("grid gap-3", sharing ? "grid-cols-3 sm:grid-cols-4" : tiles.length <= 2 ? "sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-3")} role="list" aria-label="Participants">
            {tiles.map((p) => <Tile key={p.id} p={p} self={p.id === actor.id} speaking={speaker === p.id} cam={p.id === actor.id && cam} mic={p.id === actor.id ? mic : !p.muted} small={!!sharing} sharing={sharing === p.id} />)}
            {tiles.length === 0 && <div className="col-span-full"><EmptyState title="Nobody's here yet" body="Participants appear as they join." /></div>}
          </div>
          {captions && <div className="rounded-2xl bg-black/80 px-4 py-3 text-center text-sm text-white" aria-live="polite"><span className="mr-2 text-xs text-white/60">Simulated captions · {m.hostName}</span>{CAPTIONS[capIdx]}</div>}
          <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-center gap-2 rounded-full border border-border bg-surface/95 p-2 shadow-card backdrop-blur" role="toolbar" aria-label="Meeting controls">
            <Ctl on={mic} label={mic ? "Mute" : "Unmute"} onClick={toggleMic} icon={mic ? <Microphone size={20} weight="fill" /> : <MicrophoneSlash size={20} />} off={!mic} />
            <Ctl on={cam} label={cam ? "Turn camera off" : "Turn camera on"} onClick={() => setCam(!cam)} icon={cam ? <VideoCamera size={20} weight="fill" /> : <VideoCameraSlash size={20} />} off={!cam} />
            <Ctl on={iShare} label={iShare ? "Stop sharing" : "Share screen"} onClick={toggleShare} icon={<MonitorArrowUp size={20} />} disabled={!canShare} />
            {!host && <Ctl on={hand} label={hand ? "Lower hand" : "Raise hand"} onClick={toggleHand} icon={<Hand size={20} weight={hand ? "fill" : "regular"} />} />}
            <Ctl on={captions} label="Captions" onClick={() => setCaptions(!captions)} icon={<ClosedCaptioning size={20} />} />
            <Ctl on={panel === "chat"} label="Chat" onClick={() => setPanel(panel === "chat" ? null : "chat")} icon={<ChatCircleText size={20} />} />
            <Ctl on={panel === "people"} label="People" onClick={() => setPanel(panel === "people" ? null : "people")} icon={<UsersThree size={20} />} badge={waiting.length && host ? waiting.length : undefined} />
            {host && <Ctl on={panel === "host"} label="Host controls" onClick={() => setPanel(panel === "host" ? null : "host")} icon={<Gear size={20} />} />}
            {host ? <Button variant="danger" onClick={() => setConfirmEnd(true)}><SignOut size={18} />End for all</Button> : <Button variant="danger" onClick={() => setConfirmLeave(true)}><SignOut size={18} />Leave</Button>}
          </div>
        </div>
        {panel && (
          <Card className="h-fit lg:sticky lg:top-20"><CardBody className="space-y-3">
            {panel === "chat" && <><h2 className="text-sm font-semibold">Chat <span className="font-normal text-text-2">(local to this room)</span></h2><ul className="max-h-72 space-y-2 overflow-y-auto" aria-live="polite">{chat.length === 0 && <li className="text-sm text-text-2">No messages yet.</li>}{chat.map((c) => <li key={c.id} className={cn("rounded-xl px-3 py-2 text-sm", c.mine ? "bg-lilac" : c.from === "System" ? "bg-surface-2 text-text-2" : "bg-surface-2")}><span className="block text-xs font-semibold text-text-2">{c.from} · {c.at}</span>{c.text}</li>)}</ul><form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2"><Input aria-label="Chat message" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message everyone" /><Button type="submit" size="icon" aria-label="Send"><PaperPlaneTilt size={18} /></Button></form></>}
            {panel === "people" && <><h2 className="text-sm font-semibold">People ({joined.length})</h2><People list={joined} actor={actor} host={host} onAct={hostAct} />{waiting.length > 0 && <><h3 className="pt-1 text-xs font-semibold text-text-2">Waiting room ({waiting.length})</h3><ul className="space-y-1.5">{waiting.map((p) => <li key={p.id} className="flex items-center justify-between rounded-xl bg-warning-soft px-3 py-2 text-sm"><span>{p.name}</span>{host ? <span className="flex gap-1"><Button size="sm" onClick={() => hostAct(p.id, "admit")}>Admit</Button><Button size="sm" variant="ghost" onClick={() => hostAct(p.id, "remove")}>Deny</Button></span> : <Badge tone="warning">Waiting</Badge>}</li>)}</ul></>}</>}
            {panel === "host" && host && <HostPanel m={m} room={room} joined={joined} waiting={waiting} onAdmitAll={admitAll} onMuteAll={muteAll} onAct={hostAct} onLock={async (v) => { await liveClassService.setRoom(meetingId, { locked: v }); refresh(); toast.info(v ? "Room locked. No one new can join." : "Room unlocked."); }} onSpeak={async (v) => { await liveClassService.setRoom(meetingId, { studentsMaySpeak: v }); refresh(); }} onShare={async (v) => { await liveClassService.setRoom(meetingId, { studentsMayShare: v, ...(v ? {} : { screenSharerId: iShare ? actor.id : undefined }) }); refresh(); }} />}
          </CardBody></Card>
        )}
      </div>
      <ConfirmDialog open={confirmLeave} onOpenChange={setConfirmLeave} title="Leave this class?" body="You can rejoin while the class is live. Your time in class counts towards attendance." confirmLabel="Leave" onConfirm={leave} />
      <ConfirmDialog open={confirmEnd} onOpenChange={setConfirmEnd} title="End class for everyone?" body="Everyone is removed, the class is marked Completed and an attendance snapshot is saved for your register." confirmLabel="End for all" destructive onConfirm={endAll} />
    </div>
  );
}

function Ctl({ on, off, label, onClick, icon, disabled, badge }: { on?: boolean; off?: boolean; label: string; onClick: () => void; icon: React.ReactNode; disabled?: boolean; badge?: number }) {
  return <button onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={on} title={label} className={cn("relative flex size-11 items-center justify-center rounded-full transition-colors disabled:opacity-40", off ? "bg-danger-soft text-danger" : on ? "bg-primary text-primary-fg" : "bg-surface-2 text-text hover:bg-border")}>{icon}{badge ? <span className="tnum absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">{badge}</span> : null}</button>;
}
function Tile({ p, self, speaking, cam, mic, small, sharing }: { p: Part; self: boolean; speaking: boolean; cam: boolean; mic: boolean; small?: boolean; sharing?: boolean }) {
  return (
    <div role="listitem" aria-label={`${p.name}${self ? " (you)" : ""}${mic ? "" : ", muted"}${speaking ? ", speaking" : ""}`} className={cn("relative flex items-center justify-center overflow-hidden rounded-2xl bg-[#26245a] transition-shadow", small ? "aspect-square" : "aspect-video", speaking && "ring-4 ring-success/80", cam && "bg-gradient-to-br from-primary/70 to-violet/70")}>
      <Avatar name={p.name} size={small ? 40 : 72} color={p.role === "teacher" ? "#7044D8" : "#5146E5"} />
      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 text-white"><span className="flex min-w-0 items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs">{p.role === "teacher" && <Crown size={12} weight="fill" />}<span className="truncate">{p.name}{self ? " (you)" : ""}</span></span><span className="flex gap-1">{sharing && <span className="rounded-full bg-black/55 p-1"><MonitorArrowUp size={12} /></span>}{p.handRaised && <span className="rounded-full bg-highlight p-1 text-black" aria-label="Hand raised"><Hand size={12} weight="fill" /></span>}<span className={cn("rounded-full p-1", mic ? "bg-black/55" : "bg-danger")}>{mic ? <Microphone size={12} /> : <MicrophoneSlash size={12} />}</span></span></div>
    </div>
  );
}
function People({ list, actor, host, onAct }: { list: Part[]; actor: RoomActor; host: boolean; onAct: (id: string, a: "remove" | "mute" | "unmute") => void }) {
  return <ul className="max-h-72 space-y-1.5 overflow-y-auto">{list.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm"><span className="flex min-w-0 items-center gap-2"><Avatar name={p.name} size={28} /><span className="truncate">{p.name}{p.id === actor.id ? " (you)" : ""}</span>{p.handRaised && <Hand size={14} weight="fill" className="text-warning" aria-label="Hand raised" />}</span>
    <span className="flex items-center gap-1">{p.muted ? <MicrophoneSlash size={14} className="text-danger" aria-label="Muted" /> : <Microphone size={14} className="text-success" aria-label="Unmuted" />}{host && p.id !== actor.id && p.role !== "teacher" && <><Button size="iconSm" variant="ghost" aria-label={`${p.muted ? "Unmute" : "Mute"} ${p.name}`} onClick={() => onAct(p.id, p.muted ? "unmute" : "mute")}>{p.muted ? <Microphone size={14} /> : <MicrophoneSlash size={14} />}</Button><Button size="iconSm" variant="ghost" aria-label={`Remove ${p.name}`} onClick={() => onAct(p.id, "remove")}><Prohibit size={14} /></Button></>}</span></li>)}</ul>;
}
function HostPanel({ m, room, joined, waiting, onAdmitAll, onMuteAll, onAct, onLock, onSpeak, onShare }: { m: LiveClass; room?: { locked: boolean; studentsMaySpeak: boolean; studentsMayShare: boolean }; joined: Part[]; waiting: Part[]; onAdmitAll: () => void; onMuteAll: () => void; onAct: (id: string, a: "admit" | "remove" | "mute" | "unmute") => void; onLock: (v: boolean) => void; onSpeak: (v: boolean) => void; onShare: (v: boolean) => void }) {
  const students = m.participants.filter((p) => p.role === "student"); const hands = joined.filter((p) => p.handRaised);
  return <div className="space-y-4 text-sm"><h2 className="flex items-center gap-1.5 font-semibold"><ShieldCheck size={16} />Host controls</h2>
    <div className="space-y-2"><div className="flex items-center justify-between"><span className="flex items-center gap-1.5">{room?.locked ? <Lock size={16} /> : <LockOpen size={16} />}Lock room</span><Switch checked={!!room?.locked} onChange={onLock} label="Lock room" /></div><div className="flex items-center justify-between"><span>Students may unmute</span><Switch checked={room?.studentsMaySpeak ?? true} onChange={onSpeak} label="Students may unmute" /></div><div className="flex items-center justify-between"><span>Students may share screen</span><Switch checked={!!room?.studentsMayShare} onChange={onShare} label="Students may share screen" /></div></div>
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="soft" onClick={onAdmitAll} disabled={!waiting.length}><Check size={14} />Admit all ({waiting.length})</Button><Button size="sm" variant="outline" onClick={onMuteAll} disabled={!joined.length}>Mute everyone</Button></div>
    {waiting.length > 0 && <div><p className="mb-1 text-xs font-semibold text-text-2">Waiting room</p><ul className="space-y-1.5">{waiting.map((p) => <li key={p.id} className="flex items-center justify-between rounded-xl bg-warning-soft px-3 py-2"><span>{p.name}</span><span className="flex gap-1"><Button size="sm" onClick={() => onAct(p.id, "admit")}>Admit</Button><Button size="sm" variant="ghost" onClick={() => onAct(p.id, "remove")}>Deny</Button></span></li>)}</ul></div>}
    {hands.length > 0 && <p className="rounded-xl bg-highlight-soft p-2 text-warning"><Hand size={14} weight="fill" className="mr-1 inline" />{hands.map((h) => h.name).join(", ")} raised a hand</p>}
    <div><p className="mb-1 text-xs font-semibold text-text-2">Attendance snapshot</p><p className="tnum mb-1.5 text-sm font-semibold">{joined.filter((p) => p.role === "student").length} of {Math.max(students.length, joined.length)} students present</p><ul className="space-y-1">{students.map((p) => <li key={p.id} className="flex justify-between rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs"><span>{p.name}</span><Badge tone={p.state === "joined" ? "success" : p.state === "waiting" ? "warning" : p.state === "removed" ? "danger" : "neutral"}>{p.state}</Badge></li>)}</ul></div></div>;
}
function Summary({ m, actor, host, endedBy, elapsed, back, onResource }: { m: LiveClass; actor: RoomActor; host: boolean; endedBy: "me" | "host" | "left" | null; elapsed: number; back: string; onResource: (n: string) => void }) {
  const students = m.participants.filter((p) => p.role === "student"); const attended = students.filter((p) => (p.durationMin ?? 0) > 0 || p.state === "joined");
  const mine = m.participants.find((p) => p.id === actor.id); const stillLive = m.status === "Live";
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={endedBy === "host" ? "The host ended the class" : stillLive ? "You left the class" : "Class summary"} subtitle={`${m.title} · ${fmtDateTime(m.startAt)}`} />
      <div className="grid gap-3 sm:grid-cols-3"><Card className="p-4"><p className="text-xs font-semibold text-text-2">{host ? "Duration" : "Your time in class"}</p><p className="tnum text-2xl font-bold">{host ? mmss(elapsed) : `${mine?.durationMin ?? Math.max(1, Math.round(elapsed / 60))} min`}</p></Card><Card className="p-4"><p className="text-xs font-semibold text-text-2">Attendance</p><p className="tnum text-2xl font-bold">{attended.length}/{students.length || attended.length}</p><p className="text-xs text-text-2">{host ? "Saved to your register" : "Visible to your teacher and parents"}</p></Card><Card className="p-4"><p className="text-xs font-semibold text-text-2">Recording</p><p className="text-2xl font-bold">Not recorded</p><p className="text-xs text-text-2">Recording is off by default and needs consent.</p></Card></div>
      <Card><CardBody><h2 className="mb-2 text-heading">Shared resources</h2>{m.resources.length === 0 ? <p className="text-sm text-text-2">No resources were shared in this class.</p> : <ul className="space-y-1.5">{m.resources.map((r) => <li key={r.name} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm"><FilePdf size={16} />{r.name}</li>)}</ul>}{host && <Button className="mt-3" size="sm" variant="soft" onClick={() => onResource(`Class notes ${m.resources.length + 1}.pdf`)}>Attach class notes (demo)</Button>}</CardBody></Card>
      {host && <Card><CardBody><h2 className="mb-2 text-heading">Who was there</h2><ul className="grid gap-1.5 sm:grid-cols-2">{students.map((p) => <li key={p.id} className="flex justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm"><span>{p.name}</span><span className="tnum text-text-2">{p.durationMin ? `${p.durationMin} min` : p.state}</span></li>)}</ul></CardBody></Card>}
      <Card tone="lilac"><CardBody><h2 className="mb-1 text-heading">Follow-up</h2><p className="mb-3 text-sm text-text-2">{host ? "Keep the momentum going after class." : "Questions after class? Your teacher can help."}</p><div className="flex flex-wrap gap-2">{host ? <Button onClick={() => toast.success("Follow-up note posted to the class feed (demo).")}>Post follow-up to class</Button> : <><Button asChild><Link href="/student/doubts">Ask a doubt</Link></Button><Button asChild variant="outline"><Link href="/student/assignments">See assignments</Link></Button></>}<Button asChild variant="ghost"><Link href={back}>Back to live classes</Link></Button></div></CardBody></Card>
    </div>
  );
}
