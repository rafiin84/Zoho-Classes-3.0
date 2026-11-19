"use client";
import type { ScreenProps } from "@/types/screens";
import Inner from "@/features/student/campus/screens/AttendanceScreen";
import { AccessGate } from "../relationship";

export default function ParentAttendance(p: ScreenProps) { return <AccessGate need="basic"><Inner {...p} /></AccessGate>; }
