"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, Button, Field, Input, Select, Checkbox, toast } from "@/components/ui";
import { bookService } from "@/lib/api/bookService";
import { SUBJECTS, GRADES, CLASSROOMS } from "@/lib/mock-data/core";
import { libraryExtras } from "./extras";

const schema = z.object({
  title: z.string().trim().min(3, "Enter the book title"), author: z.string().trim().min(2, "Enter the author"), publisher: z.string().trim().min(2, "Enter the publisher"),
  edition: z.string().trim().min(1, "Edition or version is required"), isbn: z.string().trim().regex(/^$|^[0-9Xx-]{10,17}$|^DEMO-[0-9-]+$/, "Use a 10 or 13 digit ISBN, or leave blank"),
  subjectId: z.string().min(1), gradeLabel: z.string().min(1), language: z.string().min(1), fileName: z.string().trim().min(3, "Choose a file or use the sample").regex(/\.(pdf|epub|docx)$/i, "Use a PDF, EPUB or DOCX file"),
  pages: z.number({ message: "Enter page count" }).int().min(1, "At least 1 page").max(2000), licenceType: z.enum(["Institution licence", "Open educational resource", "Teacher-owned upload"]),
  classIds: z.array(z.string()), rights: z.literal(true, { message: "Confirm your rights to upload this book" }),
});
type V = z.infer<typeof schema>;

export function UploadDialog({ open, onOpenChange, uploader, classOptions }: { open: boolean; onOpenChange: (v: boolean) => void; uploader: string; classOptions: string[] }) {
  const qc = useQueryClient();
  const f = useForm<V>({ resolver: zodResolver(schema), defaultValues: { title: "", author: "", publisher: "", edition: "1st edition", isbn: "", subjectId: "sub-math", gradeLabel: "Grade 8", language: "English", fileName: "", pages: 24, licenceType: "Institution licence", classIds: [], rights: false as unknown as true } });
  React.useEffect(() => { if (open) f.reset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = useMutation({
    mutationFn: async (v: V) => {
      const b = await bookService.upload({ title: v.title, subjectId: v.subjectId, gradeLabel: v.gradeLabel, fileName: v.fileName, pages: v.pages, licenceType: v.licenceType, uploadedBy: uploader, classIds: v.classIds, author: v.author, publisher: v.publisher });
      await libraryExtras.update(b.id, { language: v.language, isbnOverride: v.isbn || undefined });
      return b;
    },
    onSuccess: (b) => { toast.success(`“${b.title}” uploaded. Processing has started.`); qc.invalidateQueries({ queryKey: ["library"] }); onOpenChange(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });
  const err = f.formState.errors;
  const ids = f.watch("classIds");
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Upload a book" className="sm:max-w-2xl" description="Add a book for indexing. Tip: file names containing “scan” or “fail” simulate processing problems."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="upload-form" loading={m.isPending}>Upload and process</Button></>}>
      <form id="upload-form" onSubmit={f.handleSubmit((v) => m.mutate(v))} noValidate className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" htmlFor="b-title" error={err.title?.message} required className="sm:col-span-2"><Input id="b-title" aria-invalid={!!err.title} {...f.register("title")} /></Field>
        <Field label="Author" htmlFor="b-auth" error={err.author?.message} required><Input id="b-auth" {...f.register("author")} /></Field>
        <Field label="Publisher" htmlFor="b-pub" error={err.publisher?.message} required><Input id="b-pub" {...f.register("publisher")} /></Field>
        <Field label="Edition / version" htmlFor="b-ed" error={err.edition?.message} required><Input id="b-ed" {...f.register("edition")} /></Field>
        <Field label="ISBN" htmlFor="b-isbn" error={err.isbn?.message} optional><Input id="b-isbn" placeholder="978-…" {...f.register("isbn")} /></Field>
        <Field label="Subject" htmlFor="b-sub"><Select id="b-sub" {...f.register("subjectId")}>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Grade" htmlFor="b-gr"><Select id="b-gr" {...f.register("gradeLabel")}>{GRADES.map((g) => <option key={g.id}>{g.label}</option>)}</Select></Field>
        <Field label="Language" htmlFor="b-lang"><Select id="b-lang" {...f.register("language")}>{["English", "Hindi", "Tamil", "Bilingual"].map((l) => <option key={l}>{l}</option>)}</Select></Field>
        <Field label="Page count" htmlFor="b-pg" error={err.pages?.message}><Input id="b-pg" type="number" {...f.register("pages", { valueAsNumber: true })} /></Field>
        <Field label="File" htmlFor="b-file" error={err.fileName?.message} required className="sm:col-span-2" hint="No file is actually sent. Only the name is used in this prototype.">
          <div className="flex flex-wrap gap-2"><input type="file" accept=".pdf,.epub,.docx" aria-label="Choose book file" className="text-sm" onChange={(e) => { const n = e.target.files?.[0]?.name; if (n) f.setValue("fileName", n, { shouldValidate: true }); }} />
            <Input id="b-file" className="min-w-48 flex-1" placeholder="file-name.pdf" aria-invalid={!!err.fileName} {...f.register("fileName")} />
            <Button type="button" size="sm" variant="soft" onClick={() => f.setValue("fileName", "sample-textbook-ch1.pdf", { shouldValidate: true })}>Use sample</Button></div>
        </Field>
        <Field label="Licence / copyright status" htmlFor="b-lic" className="sm:col-span-2"><Select id="b-lic" {...f.register("licenceType")}><option>Institution licence</option><option>Open educational resource</option><option>Teacher-owned upload</option></Select></Field>
        <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-semibold">Audience: assign to classes</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">{CLASSROOMS.filter((c) => classOptions.includes(c.id)).map((c) => <Checkbox key={c.id} label={c.name} checked={ids.includes(c.id)} onChange={(v) => f.setValue("classIds", v ? [...ids, c.id] : ids.filter((x) => x !== c.id))} />)}</div>
          <p className="mt-1 text-xs text-text-2">Leave empty to keep the book private until you assign it.</p></fieldset>
        <div className="rounded-xl bg-warning-soft p-3 text-sm sm:col-span-2">
          <p className="font-semibold text-warning">Uploading does not grant redistribution rights.</p>
          <p className="text-text-2">The book is indexed only for your institution tenant. Students get in-app, citation-linked access; downloads stay off unless the licence allows them.</p>
          <div className="mt-2"><Controller control={f.control} name="rights" render={({ field }) => <Checkbox checked={!!field.value} onChange={field.onChange} label="I confirm I am entitled to use this book for the selected audience." />} /></div>
          {err.rights && <p role="alert" className="mt-1 text-xs font-medium text-danger">Fix this: {err.rights.message}</p>}
        </div>
      </form>
    </Modal>
  );
}
