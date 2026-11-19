"use client";
import type { ScreenProps } from "@/types/screens";
import { useSubject } from "../shared";
import { AssignmentDetailView } from "../parts/AssignmentDetailView";

export default function AssignmentDetailScreen({ role, params }: ScreenProps) { const { studentId } = useSubject(role); return <AssignmentDetailView key={studentId + params.id} id={params.id} studentId={studentId} />; }
