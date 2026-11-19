"use client";
import type { ScreenProps } from "@/types/screens";
import { useSubject, ChildContext } from "../shared";
import { FeesView } from "../parts/FeesView";

export default function FeesScreen({ role }: ScreenProps) {
  const { studentId, student, isParent } = useSubject(role);
  return <div key={studentId}>{isParent && <ChildContext name={student.displayName} what="school fee account" />}<FeesView studentId={studentId} name={student.displayName} mode={isParent ? "parent" : "student"} /></div>;
}
