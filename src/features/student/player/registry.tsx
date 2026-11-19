"use client";
import type * as React from "react";
import type { ActivityType, Course, LearningActivity } from "@/types";

export interface RendererProps {
  activity: LearningActivity; course: Course; done: boolean;
  /** Mark the activity complete (progress updates everywhere). */
  onComplete: () => void;
  /** Record a mastery signal (correct/incorrect) against the activity's objective. */
  onMastery: (correct: boolean, objectiveId?: string) => void;
  goTo: (activityId: string) => void;
  nextActivityId?: string; prevActivityId?: string;
  /** All activities in sequence — lets checkpoints recommend a specific earlier lesson. */
  all: LearningActivity[];
}
export type ActivityRenderer = (p: RendererProps) => React.ReactElement;

/** Extensible, typed registry: add or override a renderer with `registerRenderer("poll", MyPoll)`. */
const registry = new Map<ActivityType, ActivityRenderer>();
export const registerRenderer = (t: ActivityType, r: ActivityRenderer) => { registry.set(t, r); };
export const getRenderer = (t: ActivityType) => registry.get(t);
export const registeredTypes = () => [...registry.keys()];
export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  video: "Video", lesson: "Lesson", reading: "Reading", mcq: "Quick check", quiz: "Quiz", game: "Game", assignment: "Assignment", discussion: "Discussion", document: "Document",
  "teacher-checkpoint": "Teacher checkpoint", "ai-checkpoint": "Adaptive checkpoint", assessment: "Assessment", "live-class": "Live class", poll: "Poll", simulation: "Simulation",
};
