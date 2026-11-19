"use client";
import type { ScreenProps } from "@/types/screens";
import Inner from "@/features/student/campus/screens/LiveClassDetailScreen";
import { AccessGate } from "../relationship";

export default function ParentLiveClassDetail(p: ScreenProps) { return <AccessGate need="basic"><Inner {...p} /></AccessGate>; }
