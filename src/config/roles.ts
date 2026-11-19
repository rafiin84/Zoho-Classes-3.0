import type { Role } from "@/types";

export interface RoleMeta { id: Role; label: string; tagline: string; home: string; accent: string; actorLabel: string }
export const ROLES: RoleMeta[] = [
  { id: "student", label: "Student", tagline: "Learn, play, belong", home: "home", accent: "#5146E5", actorLabel: "Ananya Rao · Grade 8B" },
  { id: "teacher", label: "Teacher", tagline: "Teach with an AI co-pilot", home: "overview", accent: "#7044D8", actorLabel: "Priya Nair · Mathematics" },
  { id: "institution", label: "Institution", tagline: "Run academics intelligently", home: "overview", accent: "#4338CA", actorLabel: "Greenfield International School" },
  { id: "government", label: "Government", tagline: "State learning improvement", home: "overview", accent: "#3B3AA8", actorLabel: "Karuvana State Education Dept." },
  { id: "parent", label: "Parent", tagline: "Stay close to progress", home: "home", accent: "#6D5BE0", actorLabel: "Rohan Rao · Parent" },
];
export const roleMeta = (r: Role) => ROLES.find((x) => x.id === r)!;
export const isRole = (s: string): s is Role => ROLES.some((r) => r.id === s);
