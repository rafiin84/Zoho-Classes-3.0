"use client";
import { useState } from "react";
import { Bell, QrCode, Camera, Sparkle } from "@phosphor-icons/react";
import { Avatar, Button, Field, Input, Modal, toast } from "@/components/ui";
import { useApp } from "@/stores/app-store";
import type { Student } from "@/types";

/** Greeting header: avatar, name, grade/class, notifications bell (opens the shell panel) and a scan/QR utility. */
export function StudentHeader({ student, unread, greeting, subtitle }: { student: Student; unread: number; greeting: string; subtitle?: string }) {
  const openPanel = useApp((s) => s.openPanel);
  const [scan, setScan] = useState(false); const [code, setCode] = useState(""); const [err, setErr] = useState("");
  const join = () => {
    if (!/^[A-Za-z0-9-]{4,12}$/.test(code.trim())) { setErr("Codes are 4–12 letters or numbers, like ROBO-24."); return; }
    setErr(""); toast.success(`Code ${code.trim().toUpperCase()} accepted (demo) — we’d open the class, club or event now`); setScan(false); setCode("");
  };
  return (
    <header className="flex items-center gap-3">
      <Avatar name={student.displayName} color={student.avatarColor} size={52} className="shadow-card ring-2 ring-surface" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-2">{greeting}</p>
        <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{student.displayName.split(" ")[0]}</h1>
        <p className="truncate text-xs font-medium text-text-2">{subtitle ?? `${student.gradeLabel} · Class ${student.className}`}</p>
      </div>
      <Button variant="outline" size="icon" aria-label="Scan or enter a code" onClick={() => setScan(true)}><QrCode size={20} /></Button>
      <Button variant="outline" size="icon" className="relative" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} onClick={() => openPanel("notifications", true)}>
        <Bell size={20} />{unread > 0 && <span className="tnum absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-fg">{unread}</span>}
      </Button>
      <Modal open={scan} onOpenChange={setScan} title="Scan or enter a code" description="Join a class, club or event with a QR code or a short code from your teacher."
        footer={<><Button variant="ghost" onClick={() => setScan(false)}>Cancel</Button><Button onClick={join}>Join</Button></>}>
        <div className="space-y-4">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-[#14152e] text-white/70">
            <Camera size={36} weight="duotone" /><span className="absolute inset-6 rounded-2xl border-2 border-dashed border-white/40" /><p className="absolute bottom-2 text-xs">Camera preview is a demo placeholder</p>
          </div>
          <Field label="Or type the code" htmlFor="scan-code" error={err}><Input id="scan-code" aria-invalid={!!err} placeholder="e.g. ROBO-24" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && join()} /></Field>
          <p className="flex items-center gap-1.5 text-xs text-text-2"><Sparkle size={14} />Only join with codes shared by your school or teachers.</p>
        </div>
      </Modal>
    </header>
  );
}
