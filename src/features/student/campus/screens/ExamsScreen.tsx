"use client";
import type { ScreenProps } from "@/types/screens";
import { useSubject } from "../shared";
import { ExamsView } from "../parts/ExamsView";

export default function ExamsScreen({ role }: ScreenProps) { const { studentId } = useSubject(role); return <ExamsView key={studentId} studentId={studentId} />; }
