"use client";
import type { ScreenProps } from "@/types/screens";
import { useSubject } from "../shared";
import { ExamDetailView } from "../parts/ExamDetailView";

export default function ExamDetailScreen({ role, params }: ScreenProps) { const { studentId } = useSubject(role); return <ExamDetailView key={studentId + params.id} id={params.id} studentId={studentId} readOnly={role === "parent"} />; }
