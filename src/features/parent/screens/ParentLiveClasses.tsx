"use client";
import type { ScreenProps } from "@/types/screens";
import Inner from "@/features/student/campus/screens/LiveClassesScreen";
import { AccessGate } from "../relationship";

export default function ParentLiveClasses(p: ScreenProps) { return <AccessGate need="basic"><Inner {...p} /></AccessGate>; }
