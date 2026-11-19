"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActors } from "@/stores/app-store";
import { STUDENTS, TEACHERS, subjectById } from "@/lib/mock-data/core";
import { courseService, learningProfileService, notificationService } from "@/lib/api";
import { studentKeys } from "./keys";

export const TODAY_INDEX = 3; // Thursday in Mon-first week arrays (demo "now" is Thu 19 Nov 2026)

export function useStudentRecord() {
  const { studentId } = useActors();
  return STUDENTS.find((s) => s.id === studentId) ?? STUDENTS[0];
}
export function useProfile() {
  const { studentId } = useActors();
  return useQuery({ queryKey: studentKeys.profile(studentId), queryFn: () => learningProfileService.get(studentId) });
}
export function useMyCourses() {
  const { studentId } = useActors();
  return useQuery({ queryKey: studentKeys.courses(studentId), queryFn: () => courseService.list(studentId) });
}
export function useRemedial() {
  const { studentId } = useActors();
  return useQuery({ queryKey: studentKeys.remedial(studentId), queryFn: () => learningProfileService.remedialFor(studentId) });
}
export function useNotificationsFeed() {
  const { studentId } = useActors();
  return useQuery({ queryKey: [...studentKeys.notifications, studentId], queryFn: () => notificationService.list("student", { recipientId: studentId }) });
}
/** Invalidate every learning-related cache after a mutation so Home / Learn / Player all update. */
export function useInvalidateLearning() {
  const qc = useQueryClient();
  const { studentId } = useActors();
  return () => {
    qc.invalidateQueries({ queryKey: studentKeys.profile(studentId) });
    qc.invalidateQueries({ queryKey: studentKeys.courses(studentId) });
    qc.invalidateQueries({ queryKey: studentKeys.remedial(studentId) });
    qc.invalidateQueries({ queryKey: studentKeys.home(studentId) });
    qc.invalidateQueries({ queryKey: studentKeys.dailyDone(studentId) });
    qc.invalidateQueries({ queryKey: studentKeys.notifications });
  };
}
export const firstName = (n: string) => n.split(" ")[0];
export const teacherForSubject = (subjectId: string) => {
  const t = TEACHERS.find((x) => x.subjectIds.includes(subjectId) && x.status === "active") ?? TEACHERS[0];
  return t;
};
export const subjectMeta = subjectById;
