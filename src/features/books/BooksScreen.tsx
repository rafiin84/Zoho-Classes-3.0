"use client";
import type { ScreenProps } from "@/types/screens";
import { useSubject } from "@/features/student/campus/shared";
import { BooksList } from "./BooksList";

export default function BooksScreen({ role }: ScreenProps) { const { classId, studentId } = useSubject(role); return <BooksList key={studentId} classId={classId} />; }
