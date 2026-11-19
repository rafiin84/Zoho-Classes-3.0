"use client";
import type { ScreenProps } from "@/types/screens";
import { useActors } from "@/stores/app-store";
import { STUDENTS, TEACHERS, teacherName } from "@/lib/mock-data/core";
import { EmptyState } from "@/components/ui";
import { LiveRoom } from "./LiveRoom";

/** Thin route wrapper: student/live-classes/:id/room (student) and teacher/live-classes/:id/room (host). */
export default function LiveRoomScreen({ role, params }: ScreenProps) {
  const a = useActors();
  if (role === "parent") return <EmptyState title="Parents can't join class rooms" body="You can see the live-class schedule and reminders, but class rooms are for students and teachers." action={{ label: "Back to live classes", href: "/parent/live-classes" }} />;
  if (role === "teacher" || role === "institution") {
    const t = TEACHERS.find((x) => x.id === a.teacherId) ?? TEACHERS[0];
    return <LiveRoom key={params.id} meetingId={params.id} mode="host" actor={{ id: t.id, name: teacherName(t.id), role: "teacher" }} exitHref={`/${role}/live-classes`} />;
  }
  const s = STUDENTS.find((x) => x.id === a.studentId) ?? STUDENTS[0];
  return <LiveRoom key={params.id + s.id} meetingId={params.id} mode="student" actor={{ id: s.id, name: s.displayName, role: "student" }} />;
}
