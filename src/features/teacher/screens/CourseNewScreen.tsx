"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Card, CardBody, Field, Input, Textarea, Select, Button, toast } from "@/components/ui";
import { courseService } from "@/lib/api";
import { SUBJECTS, GRADES } from "@/lib/mock-data/core";
import { KEYS, errMsg, tHref, useTeacher } from "../components/common";

const schema = z.object({ title: z.string().trim().min(3, "Title needs at least 3 characters").max(80, "Keep the title under 80 characters"), subjectId: z.string().min(1, "Choose a subject"), gradeId: z.string().min(1, "Choose a grade"), language: z.string().min(1), description: z.string().trim().min(20, "Describe the course in at least 20 characters").max(400) });
type V = z.infer<typeof schema>;
export default function CourseNewScreen() {
  const router = useRouter(); const qc = useQueryClient(); const t = useTeacher();
  const { register, handleSubmit, formState: { errors } } = useForm<V>({ resolver: zodResolver(schema), defaultValues: { title: "", subjectId: t.teacher.subjectIds[0], gradeId: "g8", language: "English", description: "" } });
  const create = useMutation({ mutationFn: (v: V) => courseService.create({ title: v.title, subjectId: v.subjectId, gradeIds: [v.gradeId], language: v.language, description: v.description, creatorName: t.plain }),
    onSuccess: (c) => { qc.invalidateQueries({ queryKey: [...KEYS.courses] }); toast.success("Draft course created"); router.push(tHref(`courses/${c.id}`)); }, onError: (e) => toast.error(errMsg(e)) });
  return (
    <div className="mx-auto max-w-2xl"><PageHeader title="New course" subtitle="Start with the basics; build the modules next." />
      <Card><CardBody><form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4" noValidate>
        <Field label="Course title" required error={errors.title?.message} htmlFor="c-title"><Input id="c-title" aria-invalid={!!errors.title} {...register("title")} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Subject" required error={errors.subjectId?.message} htmlFor="c-sub"><Select id="c-sub" {...register("subjectId")}>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Grade" required error={errors.gradeId?.message} htmlFor="c-gr"><Select id="c-gr" {...register("gradeId")}>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</Select></Field>
          <Field label="Language" htmlFor="c-lang"><Select id="c-lang" {...register("language")}><option>English</option><option>Hindi</option><option>Tamil</option></Select></Field>
        </div>
        <Field label="Description" required error={errors.description?.message} htmlFor="c-desc"><Textarea id="c-desc" aria-invalid={!!errors.description} {...register("description")} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => router.push(tHref("courses"))}>Cancel</Button><Button type="submit" loading={create.isPending}>Create draft</Button></div>
      </form></CardBody></Card></div>
  );
}
