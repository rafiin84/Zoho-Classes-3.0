/** Shared TanStack Query key convention for Student screens. Invalidate these after mutations so other screens update. */
export const studentKeys = {
  profile: (id: string) => ["profile", id] as const,
  courses: (id: string) => ["courses", id] as const,
  doubts: (id: string) => ["doubts", id] as const,
  remedial: (id: string) => ["remedial", id] as const,
  notifications: ["notifications"] as const,
  // additional keys used by Learn screens
  home: (id: string) => ["home", id] as const,
  orders: (id: string) => ["orders", id] as const,
  structure: (courseId: string) => ["structure", courseId] as const,
  course: (courseId: string, id: string) => ["course", courseId, id] as const,
  tutorConversations: (id: string) => ["tutor-conversations", id] as const,
  tutorPrefs: ["tutor-prefs"] as const,
  dailyDone: (id: string) => ["daily-done", id] as const,
};
