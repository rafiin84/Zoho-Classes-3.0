import type { ScreenRegistry } from "@/types/screens";

/** Screens identical for every role (data is role/scope-filtered inside). */
export const sharedRoutes: ScreenRegistry = {
  notifications: () => import("./NotificationsScreen"),
};
