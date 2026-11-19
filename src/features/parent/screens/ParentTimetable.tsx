"use client";
import type { ScreenProps } from "@/types/screens";
import Inner from "@/features/student/campus/screens/TimetableScreen";
import { AccessGate } from "../relationship";

export default function ParentTimetable(p: ScreenProps) { return <AccessGate need="basic"><Inner {...p} /></AccessGate>; }
