"use client";
import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, XCircle, CaretLeft, Hourglass } from "@phosphor-icons/react";
import { Button, Card, Field, Input } from "@/components/ui";
import { useViewer } from "../community/useViewer";
import { connectTug, questionOf, TEAM_META, useTug } from "./tug-store";
import { AnswerGrid, Countdown, Rope } from "./tug-ui";

const schema = z.object({ code: z.string().trim().min(1, "Enter the code from the big screen.").transform((v) => v.toUpperCase()), name: z.string().trim().min(2, "Enter a name your team will recognise.").max(20) });

export default function TugJoinScreen() {
  const viewer = useViewer();
  const s = useTug((x) => x.session);
  const me = useTug((x) => x.me);
  const st = useTug();
  const [err, setErr] = React.useState<string | null>(null);
  const f = useForm<{ code: string; name: string }>({ resolver: zodResolver(schema) as any, defaultValues: { code: "", name: viewer.name.split(" ")[0] } });
  React.useEffect(() => connectTug(false), []);

  const submit = f.handleSubmit((v) => {
    setErr(null);
    if (!s || s.code !== v.code.toUpperCase()) { setErr("We couldn't find a game with that code. Check the screen, or open the host screen in another tab first."); return; }
    const r = st.join(v.name, "phone");
    if (!r.ok) setErr(r.reason ?? "Couldn't join");
  });
  const picked = s && me && s.phase !== "lobby" ? s.answers[me.team]?.choice ?? null : null;
  const last = s?.log[s.log.length - 1];
  const myRes = last && me ? (me.team === "A" ? last.a : last.b) : null;

  return (
    <div className="mx-auto max-w-md">
      <Link href="/student/play" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-text-2"><CaretLeft size={16} /> Play</Link>
      {!me || !s ? (
        <Card className="p-5">
          <h1 className="text-display">Join a game</h1>
          <p className="mt-1 text-sm text-text-2">Enter the code shown on the classroom screen.</p>
          <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
            <Field label="Game code" htmlFor="jc" error={f.formState.errors.code?.message}><Input id="jc" autoComplete="off" autoCapitalize="characters" placeholder="TUG-4721" className="h-14 text-center text-xl font-bold tracking-widest" {...f.register("code")} /></Field>
            <Field label="Your name" htmlFor="jn" error={f.formState.errors.name?.message}><Input id="jn" {...f.register("name")} /></Field>
            {err && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{err}</p>}
            <Button type="submit" size="lg" className="w-full">Join game</Button>
          </form>
          <p className="mt-4 text-xs text-text-2">Tip: open <Link className="underline" href="/student/play/tug-of-war" target="_blank">the host screen</Link> in another tab; this phone view syncs with it. Demo code: TUG-4721.</p>
        </Card>
      ) : (
        <div className="space-y-4 rounded-3xl bg-[#12102e] p-4 text-white" data-mode="tug-phone">
          <p className="rounded-xl px-3 py-2 text-center font-bold" style={{ background: TEAM_META[me.team].soft, color: TEAM_META[me.team].colour }}>You're on {TEAM_META[me.team].name}</p>
          {s.phase === "lobby" && <p role="status" className="flex items-center justify-center gap-2 py-10 text-lg font-semibold"><Hourglass size={24} /> You're in! Waiting for the host to start…</p>}
          {(s.phase === "question" || s.phase === "paused" || s.phase === "reveal") && (<>
            <Countdown s={s} />
            <Rope rope={s.rope} />
            <h2 className="text-2xl font-extrabold leading-snug">{questionOf(s).q}</h2>
            {s.phase === "paused" && <p role="status" className="rounded-xl bg-white/15 p-3 font-semibold">Paused by the host.</p>}
            <AnswerGrid s={s} picked={picked} disabled={s.phase !== "question" || picked !== null} onPick={(i) => st.answer(me.team, i)} />
            <div aria-live="polite" className="min-h-12 text-center font-semibold">
              {s.phase === "question" && picked !== null && "Locked in. Waiting for the other team…"}
              {s.phase === "reveal" && myRes === "correct" && <span className="inline-flex items-center gap-2 text-[#7CF0B0]"><CheckCircle size={22} weight="fill" /> Correct! Your team pulled.</span>}
              {s.phase === "reveal" && myRes === "wrong" && <span className="inline-flex items-center gap-2 text-[#FFB3B3]"><XCircle size={22} weight="fill" /> Not this time — {questionOf(s).why}</span>}
              {s.phase === "reveal" && myRes === "none" && <span>Time ran out on that one. {questionOf(s).why}</span>}
            </div>
          </>)}
          {s.phase === "finished" && <div className="space-y-3 py-6 text-center"><h2 className="text-3xl font-extrabold">{s.winner === "draw" ? "It's a draw!" : s.winner === me.team ? "Your team won!" : `${TEAM_META[s.winner!].name} won`}</h2><p className="tnum text-lg">{s.scores.A} – {s.scores.B}</p><p className="text-sm text-white/80">Good game. The result is saved in learning activity history from the host screen.</p><Button asChild variant="soft"><Link href="/student/play">Back to Play</Link></Button></div>}
        </div>
      )}
    </div>
  );
}
