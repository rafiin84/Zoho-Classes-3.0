"use client";
import type { ScreenProps } from "@/types/screens";
import { useSubject, ChildContext } from "../shared";
import { AttendanceView } from "../parts/AttendanceView";

export default function AttendanceScreen({ role }: ScreenProps) {
  const { studentId, student, isParent } = useSubject(role);
  return <div key={studentId}>{isParent && <ChildContext name={student.displayName} what="attendance" />}<AttendanceView studentId={studentId} name={student.displayName} mode={isParent ? "parent" : "student"} /></div>;
}
