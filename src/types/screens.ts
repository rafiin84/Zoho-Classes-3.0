import type { ComponentType } from "react";
import type { Role } from "@/types";

/** Props every routed screen receives. `slug` is the matched path segments; `params` holds `:name` captures. */
export interface ScreenProps { role: Role; slug: string[]; params: Record<string, string>; searchParams: Record<string, string> }
export type ScreenLoader = () => Promise<{ default: ComponentType<ScreenProps> }>;
/** Keys are slug paths like "home", "courses/:id", "play/tug-of-war". Longest/most specific match wins. */
export type ScreenRegistry = Record<string, ScreenLoader>;
