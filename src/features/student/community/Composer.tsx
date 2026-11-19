"use client";
/**
 * Composer — student post composer (RHF + Zod). Never publishes directly: non-private posts go to moderation via feedService.createPost.
 *
 * Props
 *  - viewer:          { id, name, role, color }
 *  - onPosted:        optional (post) => void — called after a successful submit (caller should refetch / close)
 *  - onCancel:        optional; shows a Cancel button
 *  - initial:         optional { text, category, audience, replaceId } to edit an earlier post (replaceId is withdrawn on submit)
 *  - categories:      optional string[] of categories (defaults to feed categories)
 *  - postType:        optional FeedPost["postType"] (default "talent")
 *  - context:         optional context label e.g. "Talent Corner"
 *  - onSaveDraft:     optional; shows a "Save draft" button that hands the unsent values to the caller
 */
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, UsersThree, Buildings, GlobeHemisphereWest, Paperclip, ShieldCheck, CheckCircle, X } from "@phosphor-icons/react";
import type { AudienceType, FeedPost } from "@/types";
import { feedService } from "@/lib/api";
import { Button, Card, Field, Select, Textarea, Badge, toast, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useApp } from "@/stores/app-store";
import type { Viewer } from "./useViewer";

export const FEED_CATEGORIES = ["Learning", "Achievement", "Drawing", "Painting", "Music & singing", "Dance & performance", "Photography", "Stories & poetry", "Crafts & DIY", "Science projects", "Other achievements"];
type Aud = Extract<AudienceType, "private" | "class" | "school" | "wider">;
const AUDIENCES: { v: Aud; label: string; desc: string; icon: React.ReactNode; approval: string }[] = [
  { v: "private", label: "Only me", desc: "Saved to your portfolio. Nobody else sees it.", icon: <Lock size={18} />, approval: "No approval needed" },
  { v: "class", label: "My class", desc: "Grade 8B classmates and teachers.", icon: <UsersThree size={18} />, approval: "Teacher approval needed" },
  { v: "school", label: "Whole school", desc: "Students and teachers at Greenfield.", icon: <Buildings size={18} />, approval: "Teacher approval needed" },
  { v: "wider", label: "Approved wider community", desc: "Inter-school showcases. Needs teacher and guardian approval.", icon: <GlobeHemisphereWest size={18} />, approval: "Teacher + guardian approval needed" },
];
const schema = z.object({
  text: z.string().trim().min(8, "Write at least a few words so others know what this is.").max(500, "Keep it under 500 characters."),
  category: z.string().min(1, "Pick a category."),
  audience: z.enum(["private", "class", "school", "wider"]),
  attachment: z.string(),
  confirm: z.boolean().refine((v) => v, "Please confirm this is your own work and has no private details."),
});
type Values = z.infer<typeof schema>;

export function Composer({ viewer, onPosted, onCancel, initial, categories = FEED_CATEGORIES, postType = "talent", context = "Talent Corner", onSaveDraft }: {
  viewer: Viewer; onSaveDraft?: (d: { text: string; category: string; audience: AudienceType }) => void; onPosted?: (p: FeedPost) => void; onCancel?: () => void; initial?: { text?: string; category?: string; audience?: AudienceType; replaceId?: string }; categories?: string[]; postType?: FeedPost["postType"]; context?: string;
}) {
  const qc = useQueryClient();
  const setUnsaved = useApp((s) => s.setUnsaved);
  const [done, setDone] = React.useState<FeedPost | null>(null);
  const { register, handleSubmit, watch, getValues, setValue, reset, formState: { errors, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema), mode: "onTouched",
    defaultValues: { text: initial?.text ?? "", category: initial?.category ?? categories[0], audience: (["private", "class", "school", "wider"].includes(initial?.audience ?? "") ? initial!.audience : "private") as Aud, attachment: "none", confirm: false },
  });
  React.useEffect(() => { setUnsaved(isDirty); return () => setUnsaved(false); }, [isDirty, setUnsaved]);
  const audience = watch("audience"); const attachment = watch("attachment"); const text = watch("text") ?? "";
  const aud = AUDIENCES.find((a) => a.v === audience)!;

  const submit = useMutation({
    mutationFn: async (v: Values) => {
      if (initial?.replaceId) await feedService.withdraw(initial.replaceId);
      return feedService.createPost({ authorId: viewer.id, authorName: viewer.name, authorColor: viewer.color, text: v.text, audienceType: v.audience, category: v.category, postType, context: `${context} · ${v.category}` });
    },
    onSuccess: (p) => {
      setDone(p); reset({ text: "", category: categories[0], audience: "private", attachment: "none", confirm: false });
      qc.invalidateQueries({ queryKey: ["feed"] }); qc.invalidateQueries({ queryKey: ["portfolio", viewer.id] });
      toast.success(p.moderationStatus === "published" ? "Saved privately" : "Sent for approval", p.moderationStatus === "published" ? "It's in your portfolio — only you can see it." : "A teacher will review it. You'll get a notification.");
      onPosted?.(p);
    },
    onError: (e) => toast.error("Couldn't submit", (e as Error).message),
  });

  if (done) {
    return (
      <Card className="p-5 text-center" role="status">
        <CheckCircle size={40} weight="duotone" className="mx-auto text-success" />
        <h3 className="mt-2 text-heading">{done.moderationStatus === "published" ? "Saved to your private portfolio" : "Sent for approval"}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-text-2">{done.moderationStatus === "published" ? "Only you can see this." : `It stays hidden from everyone else until it's approved for: ${done.audienceLabel}. You can edit or withdraw it any time while it waits.`}</p>
        <div className="mt-4 flex justify-center gap-2"><Button variant="soft" onClick={() => setDone(null)}>Write another</Button>{onCancel && <Button variant="ghost" onClick={onCancel}>Close</Button>}</div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => submit.mutate(v))} noValidate aria-label="Create a post" className="space-y-4">
      <Field label="What do you want to share?" htmlFor="cmp-text" error={errors.text?.message} hint={`${text.length}/500 · Please don't include phone numbers, addresses or other private details.`}>
        <Textarea id="cmp-text" aria-invalid={!!errors.text} placeholder="Tell your story, share a result, or show a project…" {...register("text")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="cmp-cat" error={errors.category?.message}>
          <Select id="cmp-cat" {...register("category")}>{categories.map((c) => <option key={c}>{c}</option>)}</Select>
        </Field>
        <Field label="Attachment" htmlFor="cmp-att" optional hint="Demo only — no file is uploaded.">
          <div className="flex gap-2">
            <Select id="cmp-att" {...register("attachment")}><option value="none">No attachment</option><option>Photo · artwork.jpg</option><option>Video · performance.mp4</option><option>Audio · recital.m4a</option><option>Document · project-notes.pdf</option></Select>
            {attachment !== "none" && <Button type="button" variant="ghost" size="icon" aria-label="Remove attachment" onClick={() => setValue("attachment", "none")}><X size={16} /></Button>}
          </div>
        </Field>
      </div>
      {attachment !== "none" && <p className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm"><Paperclip size={16} /> {attachment}</p>}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Who can see this?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {AUDIENCES.map((a) => (
            <label key={a.v} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors focus-within:outline-2", audience === a.v ? "border-primary bg-lilac" : "border-border bg-surface hover:bg-surface-2")}>
              <input type="radio" value={a.v} {...register("audience")} className="mt-1 accent-[var(--primary)]" />
              <span className="min-w-0"><span className="flex items-center gap-1.5 text-sm font-semibold">{a.icon}{a.label}</span><span className="block text-xs text-text-2">{a.desc}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-2xl bg-surface-2 p-3 text-sm" aria-live="polite">
        <p className="flex flex-wrap items-center gap-2"><ShieldCheck size={18} className="text-primary" /><b>Visibility:</b> {aud.label} <Badge tone={audience === "private" ? "success" : "warning"}>{aud.approval}</Badge></p>
        {audience !== "private" && (
          <ul className="mt-2 space-y-1 text-xs text-text-2">
            <li>Teacher approval: <b>Mrs. Priya Nair</b> reviews your post first — status will show "Awaiting approval".</li>
            {audience === "wider" && <li>Guardian approval: a message goes to your guardian before it can be shown outside school.</li>}
            <li>Until approved, only you can see it. You can edit or withdraw it any time.</li>
          </ul>
        )}
      </div>

      <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" {...register("confirm")} className="mt-0.5 size-5 accent-[var(--primary)]" /> <span>This is my own work and doesn't show private details about me or others.</span></label>
      {errors.confirm && <p role="alert" className="-mt-2 text-xs font-medium text-danger">Fix this: {errors.confirm.message}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        {onSaveDraft && <Button type="button" variant="outline" onClick={() => { const v = getValues(); onSaveDraft({ text: v.text, category: v.category, audience: v.audience }); }}>Save draft</Button>}
        <Button type="submit" loading={submit.isPending}>{audience === "private" ? "Save privately" : "Submit for approval"}</Button>
      </div>
    </form>
  );
}

export default Composer;
