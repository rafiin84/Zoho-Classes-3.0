"use client";
import type { ScreenProps } from "@/types/screens";
import { useSubject, ChildContext } from "../shared";
import { LiveClassesView } from "../parts/LiveClassesView";

export default function LiveClassesScreen({ role }: ScreenProps) {
  const { studentId, student, classId, isParent } = useSubject(role);
  return <div key={studentId}>{isParent && <ChildContext name={student.displayName} what="live class schedule" />}<LiveClassesView studentId={studentId} classId={classId} name={student.displayName} mode={isParent ? "parent" : "student"} /></div>;
}
