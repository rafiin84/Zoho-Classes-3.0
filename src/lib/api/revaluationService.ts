import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { notificationService } from "./notificationService";

export interface RevaluationRequest { id: string; studentId: string; marksheetId: string; subjectId: string; subjectName: string; reason: string; status: "requested" | "in-review" | "completed"; createdAt: string; outcome?: string }
const reqs: RevaluationRequest[] = [];
/** Student/parent revaluation (recheck) requests: separate from marksheet publication so Academic Ops can read and progress them. */
export const revaluationService = {
  forStudent: (studentId: string) => simulate(() => reqs.filter((r) => r.studentId === studentId)),
  all: () => simulate(() => reqs),
  request: (p: { studentId: string; marksheetId: string; subjectId: string; subjectName: string; reason: string }) => simulate(() => {
    if (reqs.some((r) => r.marksheetId === p.marksheetId && r.subjectId === p.subjectId && r.status !== "completed")) throw new ServiceError("A recheck request for this subject is already open.", "validation");
    const r: RevaluationRequest = { ...p, id: uid("reval"), status: "requested", createdAt: new Date().toISOString() }; reqs.unshift(r);
    notificationService.push({ role: "institution", category: "academic", title: "Revaluation requested", body: `${p.subjectName} · ${p.marksheetId}`, href: "/institution/results" });
    return r;
  }),
  setStatus: (id: string, status: RevaluationRequest["status"], outcome?: string) => simulate(() => { const r = reqs.find((x) => x.id === id); if (r) { r.status = status; r.outcome = outcome; } return r ?? null; }),
};
