"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardBody, Field, Input, Textarea, Select, Modal, Badge, SectionHeader, Skeleton, ErrorState, toast } from "@/components/ui";
import { obeService } from "@/lib/api/obeService";
import type { CourseOutcome } from "@/types/obe";

const schema = z.object({ text: z.string().min(10, "Describe the outcome in at least 10 characters"), bloom: z.string().min(1) });
type F = z.infer<typeof schema>;
const BLOOMS = ["Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create"];

export default function Outcomes({ courseIds, canEdit }: { courseIds: string[]; canEdit: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["obe", "outcomes"], queryFn: obeService.outcomes });
  const [edit, setEdit] = React.useState<{ courseId: string; co?: CourseOutcome } | null>(null);
  const form = useForm<F>({ resolver: zodResolver(schema), defaultValues: { text: "", bloom: "Apply" } });
  React.useEffect(() => { if (edit) form.reset({ text: edit.co?.text ?? "", bloom: edit.co?.bloom ?? "Apply" }); }, [edit, form]);
  const save = useMutation({
    mutationFn: (v: F) => { const c = q.data!.courses.find((x) => x.id === edit!.courseId)!; const n = q.data!.cos.filter((x) => x.courseId === c.id).length + 1; return obeService.saveCO({ id: edit!.co?.id, courseId: c.id, code: edit!.co?.code ?? `${c.code}.CO${n}`, ...v }); },
    onSuccess: () => { toast.success("Course outcome saved. Mapping needs re-review."); setEdit(null); qc.invalidateQueries({ queryKey: ["obe"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (q.isLoading) return <Skeleton className="h-64" />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const courses = q.data.courses.filter((c) => courseIds.includes(c.id));
  return (
    <div className="space-y-6">
      <section>
        <SectionHeader title="Programme outcomes and PSOs" subtitle="Hover or focus a code for its description; expand for descriptors." />
        <div className="grid gap-2 md:grid-cols-2">
          {q.data.pos.map((p) => (
            <details key={p.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
              <summary className="cursor-pointer font-semibold" title={p.description}><Badge tone={p.kind === "PSO" ? "info" : "primary"}>{p.code}</Badge> <span className="ml-1">{p.title}</span></summary>
              <p className="mt-2 text-text-2">{p.description}</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-text-2">{p.descriptors.map((d) => <li key={d}>{d}</li>)}</ul>
            </details>
          ))}
        </div>
      </section>
      <section>
        <SectionHeader title="Course outcomes" />
        {!courses.length ? <p className="text-sm text-text-2">No courses in scope for you.</p> : courses.map((c) => (
          <Card key={c.id} className="mb-3"><CardBody>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold">{c.code} · {c.title}</p><p className="text-xs text-text-2">Semester {c.semester} · {c.credits} credits · {c.facultyName} · {c.cohort} students</p></div>
              {canEdit && <Button size="sm" variant="soft" onClick={() => setEdit({ courseId: c.id })}>Add outcome</Button>}
            </div>
            <ul className="divide-y divide-border">
              {q.data!.cos.filter((x) => x.courseId === c.id).map((co) => (
                <li key={co.id} className="flex items-start gap-3 py-2 text-sm"><Badge tone="primary">{co.code.split(".")[1]}</Badge><span className="flex-1">{co.text}</span><Badge>{co.bloom}</Badge>{canEdit && <Button size="sm" variant="ghost" onClick={() => setEdit({ courseId: c.id, co })}>Edit</Button>}</li>
              ))}
            </ul>
          </CardBody></Card>
        ))}
      </section>
      <Modal open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit?.co ? `Edit ${edit.co.code}` : "New course outcome"}
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button loading={save.isPending} onClick={form.handleSubmit((v) => save.mutate(v))}>Save outcome</Button></>}>
        <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
          <Field label="Outcome statement" htmlFor="co-text" error={form.formState.errors.text?.message} required><Textarea id="co-text" {...form.register("text")} /></Field>
          <Field label="Cognitive level" htmlFor="co-bloom"><Select id="co-bloom" {...form.register("bloom")}>{BLOOMS.map((b) => <option key={b}>{b}</option>)}</Select></Field>
        </form>
      </Modal>
    </div>
  );
}
