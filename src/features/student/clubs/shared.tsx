"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eventService } from "@/lib/api";
import { useActors } from "@/stores/app-store";
import { toast } from "@/components/ui";
import type { Club } from "@/types";

export const INTERESTS = ["Robotics", "Coding", "Maths", "Science", "Reading", "Arts", "Music", "Dance", "Entrepreneurship", "Innovation"];
export const STATUS_TEXT: Record<Club["myStatus"], string> = { none: "Not joined", pending: "Request pending", active: "Member", rejected: "Request not accepted" };

/** Join / request / leave with consistent invalidation (clubs list, detail, portfolio). */
export function useClubActions() {
  const qc = useQueryClient();
  const { studentId } = useActors();
  const inval = () => { qc.invalidateQueries({ queryKey: ["clubs"] }); qc.invalidateQueries({ queryKey: ["portfolio", studentId] }); };
  const join = useMutation({ mutationFn: (c: Club) => eventService.joinClub(c.id), onSuccess: (c) => { inval(); c.myStatus === "active" ? toast.success(`Welcome to ${c.name}`, "You're now a member.") : toast.info("Request sent", `${c.mentor} will review it. We'll let you know.`); }, onError: (e) => toast.error("Couldn't join", (e as Error).message) });
  const leave = useMutation({ mutationFn: (c: Club) => eventService.leaveClub(c.id), onSuccess: (c) => { inval(); toast.success(`You left ${c.name}`, "You can rejoin any time."); } });
  const decide = useMutation({ mutationFn: ({ c, ok }: { c: Club; ok: boolean }) => eventService.decideClubRequest(c.id, ok), onSuccess: (c) => { inval(); toast.success(c.myStatus === "active" ? "Request approved (demo)" : "Request declined (demo)"); } });
  return { join, leave, decide };
}
