"use client";
import type { ScreenProps } from "@/types/screens";
import { useSubject } from "../shared";
import { AssignmentsView } from "../parts/AssignmentsView";

export default function AssignmentsScreen({ role }: ScreenProps) { const { studentId } = useSubject(role); return <AssignmentsView key={studentId} studentId={studentId} />; }
