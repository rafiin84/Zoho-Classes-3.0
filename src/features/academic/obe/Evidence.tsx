"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Select, Badge, Skeleton, ErrorState, toast } from "@/components/ui";
import { obeService } from "@/lib/api/obeService";

export default function Evidence({ courseIds, canEdit }: { courseIds: string[]; canEdit: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["obe", "outcomes"], queryFn: obeService.outcomes });
  const map = useMutation({ mutationFn: (v: { a: string; i: number; co: string }) => obeService.mapAssessmentItem(v.a, v.i, v.co), onSuccess: () => { toast.success("Evidence mapping updated."); qc.invalidateQueries({ queryKey: ["obe"] }); } });
  if (q.isLoading) return <Skeleton className="h-64" />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const courses = q.data.courses.filter((c) => courseIds.includes(c.id));
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-2">Every question or rubric criterion is mapped to a course outcome so attainment can be traced to its evidence.</p>
      {courses.map((c) => {
        const cos = q.data!.cos.filter((x) => x.courseId === c.id);
        return (
          <Card key={c.id}><CardBody>
            <p className="mb-2 font-semibold">{c.code} · {c.title}</p>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="text-xs text-text-2"><tr><th className="py-1 pr-3">Assessment</th><th className="pr-3">Category</th><th className="pr-3">Item</th><th className="pr-3">Marks</th><th>Mapped CO</th></tr></thead>
              <tbody>{q.data!.assessments.filter((a) => a.courseId === c.id).flatMap((a) => a.items.map((it, i) => (
                <tr key={a.id + i} className="border-t border-border">
                  <td className="py-1.5 pr-3">{i === 0 ? a.title : ""}{i === 0 && !a.scoresAvailable && <Badge tone="warning" className="ml-2">No scores yet</Badge>}</td>
                  <td className="pr-3 capitalize">{i === 0 ? a.category : ""}</td><td className="pr-3">{it.label} <span className="text-xs text-text-2">({it.kind})</span></td><td className="tnum pr-3">{it.marks}</td>
                  <td><Select aria-label={`CO for ${a.title} ${it.label}`} disabled={!canEdit} value={it.coId} onChange={(e) => map.mutate({ a: a.id, i, co: e.target.value })} className="h-9 w-40">{cos.map((co) => <option key={co.id} value={co.id}>{co.code.split(".")[1]}</option>)}</Select></td>
                </tr>)))}</tbody>
            </table></div>
          </CardBody></Card>
        );
      })}
    </div>
  );
}
