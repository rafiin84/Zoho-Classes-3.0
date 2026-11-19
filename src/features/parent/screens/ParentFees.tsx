"use client";
import type { ScreenProps } from "@/types/screens";
import Inner from "@/features/student/campus/screens/FeesScreen";
import { AccessGate } from "../relationship";

export default function ParentFees(p: ScreenProps) { return <AccessGate need="full"><Inner {...p} /></AccessGate>; }
