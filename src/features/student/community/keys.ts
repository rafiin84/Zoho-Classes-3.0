/** Query keys used by the community / play / profile features. Shared keys (`['events']`, `['portfolio', id]`) are invalidated across screens. */
export const communityKeys = {
  feed: ["feed"] as const,
  feedList: (viewerId: string, filter: string, q: string, saved: boolean) => ["feed", viewerId, filter, q, saved] as const,
  talent: ["feed", "talent"] as const,
  events: ["events"] as const,
  event: (id: string) => ["events", id] as const,
  clubs: ["clubs"] as const,
  club: (id: string) => ["clubs", id] as const,
  portfolio: (studentId: string) => ["portfolio", studentId] as const,
  profile: (studentId: string) => ["learning-profile", studentId] as const,
};
