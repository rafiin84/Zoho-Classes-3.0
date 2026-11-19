import type { ID, ISODate } from "./index";

/** Fictional Meridian University B.Tech-style OBE demo data. Never official accreditation data. */
export interface ProgrammeOutcome { id: ID; code: string; kind: "PO" | "PSO"; title: string; description: string; descriptors: string[] }
export interface CourseOutcome { id: ID; courseId: ID; code: string; text: string; bloom: string }
export interface ObeCourse { id: ID; code: string; title: string; semester: number; credits: number; facultyId: string; facultyName: string; cohort: number }
export interface MappingScale { max: number; labels: string[]; note: string }
export interface MappingCell { coId: ID; poId: ID; value: number; rationale: string }
export type MappingStatus = "draft" | "in-review" | "approved";
export interface MappingVersion { version: number; at: ISODate; by: string; note: string }
export interface CourseMapping { courseId: ID; status: MappingStatus; version: number; cells: MappingCell[]; history: MappingVersion[] }
export type AssessmentCategory = "internal" | "external" | "assignment" | "practical";
export interface ObeAssessment { id: ID; courseId: ID; title: string; category: AssessmentCategory; maxMarks: number; items: { label: string; coId: ID; marks: number; kind: "question" | "rubric" }[]; scoresAvailable: boolean }
export type AttainmentMethod = "threshold" | "mean";
export interface AttainmentConfig {
  method: AttainmentMethod;
  targetScorePct: number; // student counts as attained when scoring >= this % in the CO
  levels: { l3: number; l2: number; l1: number }; // threshold method: % of students at/above target for level 3/2/1
  meanLevels: { l3: number; l2: number; l1: number }; // mean method: mean % for level 3/2/1
  weights: Record<AssessmentCategory, number>;
  targetLevel: number;
}
export interface COAttainment { coId: ID; code: string; courseId: ID; level: number; byCategory: Partial<Record<AssessmentCategory, { value: number; pctAttained: number; mean: number }>>; missing: AssessmentCategory[]; target: number }
export interface POAttainment { poId: ID; code: string; level: number; target: number; contributors: { coCode: string; weight: number; level: number }[] }
export interface AttainmentRun {
  id: ID; at: ISODate; by: string; calcVersion: string; academicYear: string; semester: string; config: AttainmentConfig; status: "draft" | "in-review" | "approved" | "published";
  co: COAttainment[]; po: POAttainment[]; coverage: { courseId: ID; code: string; complete: boolean; missing: string[] }[]; actionPlan: { id: ID; target: string; action: string; owner: string; due: string }[];
}
