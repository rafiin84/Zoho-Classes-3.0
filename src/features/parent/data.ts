"use client";
import { useQuery } from "@tanstack/react-query";
import { learningProfileService, assignmentService, feeService, notificationService, marksheetService, eventService, doubtService } from "@/lib/api";
import { attendanceService } from "@/lib/api/attendanceService";
import { examService } from "@/lib/api/examService";
import { parentMessageService } from "@/lib/api/parentMessageService";

/** Every hook is keyed by childId, so switching child always refetches and never shows the previous child's data. */
export const pk = (name: string, childId: string) => ["parent", name, childId] as const;
export const useChildProfile = (c: string) => useQuery({ queryKey: pk("profile", c), queryFn: () => learningProfileService.get(c) });
export const useChildRemedial = (c: string) => useQuery({ queryKey: pk("remedial", c), queryFn: () => learningProfileService.remedialFor(c) });
export const useChildAttendance = (c: string) => useQuery({ queryKey: pk("attendance", c), queryFn: () => attendanceService.forStudent(c, "2026-11") });
export const useChildAssignments = (c: string) => useQuery({ queryKey: pk("assignments", c), queryFn: () => assignmentService.forStudent(c) });
export const useChildExams = (c: string) => useQuery({ queryKey: pk("exams", c), queryFn: () => examService.forStudent(c) });
export const useChildFees = (c: string) => useQuery({ queryKey: pk("fees", c), queryFn: () => feeService.account(c) });
export const useChildNotifications = (c: string) => useQuery({ queryKey: pk("notifs", c), queryFn: () => notificationService.list("parent", { childId: c }) });
export const useChildMarks = (c: string) => useQuery({ queryKey: pk("marks", c), queryFn: async () => { const [pub, all] = await Promise.all([marksheetService.forStudent(c), marksheetService.all()]); return { published: pub, unreleased: all.filter((m) => m.studentId === c && m.publicationStatus !== "published").length }; } });
export const useChildDoubts = (c: string) => useQuery({ queryKey: pk("doubts", c), queryFn: () => doubtService.forStudent(c) });
export const useEvents = () => useQuery({ queryKey: ["parent", "events"], queryFn: () => eventService.list() });
export const useUnread = (c: string) => useQuery({ queryKey: pk("unread", c), queryFn: () => parentMessageService.unreadForParent(c) });
