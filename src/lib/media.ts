// Local media library (public/media). Photos: Unsplash licence. Videos: flower.mp4 (CC0, MDN), sintel trailer (CC BY, Blender Foundation).
export const IMG = {
  math: "/media/math-board.jpg", mathNotes: "/media/math-notes.jpg", science: "/media/science-lab.jpg", classroom: "/media/classroom.jpg", books: "/media/books.jpg",
  students: "/media/students.jpg", earth: "/media/earth.jpg", forest: "/media/forest.jpg", code: "/media/code.jpg", circuit: "/media/circuit.jpg", reading: "/media/reading.jpg", art: "/media/art.jpg", sports: "/media/sports.jpg",
};
export const COURSE_IMAGE: Record<string, string> = {
  "crs-fractions": IMG.math, "crs-ecosystems": IMG.forest, "crs-storycraft": IMG.reading, "crs-ancient": IMG.earth, "crs-python": IMG.code, "crs-algebra-pro": IMG.mathNotes, "crs-hindi-kahani": IMG.books,
};
export const EVENT_IMAGE: Record<string, string> = { "evt-basketball": IMG.sports, "evt-drawing": IMG.art, "evt-science": IMG.science, "evt-quiz": IMG.students };
export const CLUB_IMAGE: Record<string, string> = { "club-robotics": IMG.circuit, "club-coding": IMG.code, "club-reading": IMG.reading, "club-arts": IMG.art, "club-maths": IMG.mathNotes };

export interface VideoAsset { src: string; poster: string; title: string; credit: string }
export const VIDEOS: VideoAsset[] = [
  { src: "/media/flower.mp4", poster: IMG.forest, title: "Time-lapse: a flower opens", credit: "CC0 · MDN" },
  { src: "/media/sintel.mp4", poster: IMG.classroom, title: "Story spark: animated short", credit: "CC BY · Blender Foundation" },
];
/** Deterministic: same activity always gets the same demo clip. */
export const videoFor = (activityId: string, courseId?: string): VideoAsset => {
  const h = [...(activityId + (courseId ?? ""))].reduce((a, c) => a + c.charCodeAt(0), 0);
  const v = VIDEOS[h % VIDEOS.length];
  return { ...v, poster: (courseId && COURSE_IMAGE[courseId]) || v.poster };
};
