"use client";
import type { ScreenProps } from "@/types/screens";
import { useSubject, ChildContext } from "../shared";
import { TimetableView } from "../parts/TimetableView";

export default function TimetableScreen({ role }: ScreenProps) {
  const { studentId, student, classId, isParent } = useSubject(role);
  return <div key={studentId}>{isParent && <ChildContext name={student.displayName} what="timetable" />}<TimetableView studentId={studentId} classId={classId} className={student.className === "8B" ? "Grade 8 · B" : `Grade ${student.gradeLabel.replace("Grade ", "")} · ${student.className.slice(-1)}`} mode={isParent ? "parent" : "student"} /></div>;
}
