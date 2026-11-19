"use client";
import type { ScreenProps } from "@/types/screens";
import { useSubject } from "@/features/student/campus/shared";
import { BookChat } from "./BookChat";

export default function BookChatScreen({ role, params }: ScreenProps) { const { classId, studentId } = useSubject(role); return <BookChat key={studentId + params.id} bookId={params.id} studentId={studentId} classId={classId} />; }
