"use client";
import type { ScreenProps } from "@/types/screens";
import { useSubject, ChildContext } from "../shared";
import { ResultsView } from "../parts/ResultsView";

export default function ResultsScreen({ role }: ScreenProps) {
  const { studentId, student, isParent } = useSubject(role);
  return <div key={studentId}>{isParent && <ChildContext name={student.displayName} what="published results" />}<ResultsView studentId={studentId} name={student.displayName} mode={isParent ? "parent" : "student"} /></div>;
}
