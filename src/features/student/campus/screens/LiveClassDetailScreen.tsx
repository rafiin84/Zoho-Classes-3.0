"use client";
import type { ScreenProps } from "@/types/screens";
import { useSubject } from "../shared";
import { LiveClassDetailView } from "../parts/LiveClassesView";

export default function LiveClassDetailScreen({ role, params }: ScreenProps) {
  const { studentId, classId, isParent } = useSubject(role);
  return <LiveClassDetailView key={studentId + params.id} id={params.id} studentId={studentId} classId={classId} mode={isParent ? "parent" : "student"} />;
}
