"use client";
import type { ScreenProps } from "@/types/screens";
import Inner from "@/features/student/campus/screens/ResultsScreen";
import { AccessGate } from "../relationship";

export default function ParentResults(p: ScreenProps) { return <AccessGate need="full"><Inner {...p} /></AccessGate>; }
