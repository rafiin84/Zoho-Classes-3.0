import type { TutorAvatarOption, TutorPreferences, TutorMcq } from "@/types/tutor";
import { ago } from "@/lib/format";

export const TUTOR_AVATARS: TutorAvatarOption[] = [
  { id: "spark", label: "Spark", color: "#7044D8", icon: "Sparkle" },
  { id: "owl", label: "Night owl", color: "#5146E5", icon: "Brain" },
  { id: "rocket", label: "Rocket", color: "#4338CA", icon: "Rocket" },
  { id: "leaf", label: "Sprout", color: "#12805C", icon: "Leaf" },
  { id: "star", label: "North star", color: "#9A5B00", icon: "Star" },
  { id: "atom", label: "Atom", color: "#1D6FB8", icon: "Atom" },
];
export const DEFAULT_TUTOR_PREFS: TutorPreferences = { name: "Sage", avatarId: "spark", tone: "friendly", style: "simple", language: "English", voice: false, pace: "steady" };
export const TUTOR_LANGUAGES = ["English", "Hindi", "Tamil", "Kannada", "Malayalam", "Telugu"];
export const TUTOR_TONES: { id: TutorPreferences["tone"]; label: string; sample: string }[] = [
  { id: "friendly", label: "Friendly", sample: "Nice question! Let's work it out together." },
  { id: "patient", label: "Patient", sample: "Take your time — we'll go one small step at a time." },
  { id: "encouraging", label: "Encouraging", sample: "You're closer than you think. Here's the next move." },
  { id: "playful", label: "Playful", sample: "Ooh, a tricky one! Let's crack it like a puzzle." },
  { id: "formal", label: "Formal", sample: "Let us consider the problem methodically." },
  { id: "direct", label: "Direct", sample: "Short answer first, then the reason." },
];
export const TUTOR_STYLES: { id: TutorPreferences["style"]; label: string; hint: string }[] = [
  { id: "simple", label: "Simple", hint: "Plain words, the key idea only" },
  { id: "detailed", label: "Detailed", hint: "Full reasoning with every step" },
  { id: "storytelling", label: "Storytelling", hint: "Explained through a short story" },
  { id: "examples", label: "Examples", hint: "Worked examples first" },
  { id: "socratic", label: "Socratic", hint: "Guiding questions that help you find it" },
];

/** Hindi snippets for the language-switching demo (deterministic). */
export const HINDI_NOTES: Record<string, string> = {
  fractions: "भिन्नों को जोड़ने के लिए पहले हर (denominator) को बराबर करें। 1/4 + 2/3 = 3/12 + 8/12 = 11/12।",
  default: "आइए इसे एक-एक कदम में समझते हैं। पहले मुख्य विचार, फिर उदाहरण।",
};

export const PRACTICE_BANK: Record<string, TutorMcq[]> = {
  fractions: [
    { id: "pq-f1", q: "What is 1/3 + 1/6?", options: ["2/9", "1/2", "2/6", "1/9"], answer: 1, explain: "LCD is 6: 2/6 + 1/6 = 3/6 = 1/2.", objectiveId: "lo-frac-add", label: "Add and subtract unlike fractions", subjectId: "sub-math" },
    { id: "pq-f2", q: "What is 3/4 − 1/8?", options: ["2/4", "5/8", "2/8", "3/8"], answer: 1, explain: "LCD is 8: 6/8 − 1/8 = 5/8.", objectiveId: "lo-frac-add", label: "Add and subtract unlike fractions", subjectId: "sub-math" },
    { id: "pq-f3", q: "What is 2/5 + 1/2?", options: ["3/7", "9/10", "3/10", "1/5"], answer: 1, explain: "LCD is 10: 4/10 + 5/10 = 9/10.", objectiveId: "lo-frac-add", label: "Add and subtract unlike fractions", subjectId: "sub-math" },
  ],
  divide: [
    { id: "pq-d1", q: "What is 1/2 ÷ 1/4?", options: ["1/8", "2", "1/2", "4"], answer: 1, explain: "Dividing by 1/4 is multiplying by 4/1: 1/2 × 4 = 2.", objectiveId: "lo-frac-mul", label: "Multiply and divide fractions", subjectId: "sub-math" },
    { id: "pq-d2", q: "What is 3/5 ÷ 3?", options: ["1/5", "9/5", "3/15", "5"], answer: 0, explain: "3/5 × 1/3 = 3/15 = 1/5.", objectiveId: "lo-frac-mul", label: "Multiply and divide fractions", subjectId: "sub-math" },
  ],
  foodchain: [
    { id: "pq-e1", q: "In grass → grasshopper → frog → snake, which is the secondary consumer?", options: ["Grass", "Grasshopper", "Frog", "Snake"], answer: 2, explain: "The grasshopper is primary; the frog eats it, so it is secondary.", objectiveId: "lo-eco-chain", label: "Trace energy flow in food chains", subjectId: "sub-sci" },
    { id: "pq-e2", q: "Roughly how much energy passes to the next trophic level?", options: ["90%", "50%", "10%", "1%"], answer: 2, explain: "About 10% moves up; the rest is used or lost as heat.", objectiveId: "lo-eco-chain", label: "Trace energy flow in food chains", subjectId: "sub-sci" },
  ],
  linear: [
    { id: "pq-l1", q: "Solve 2x + 3 = 11.", options: ["x = 3", "x = 4", "x = 7", "x = 5"], answer: 1, explain: "Subtract 3: 2x = 8, divide by 2: x = 4.", objectiveId: "lo-alg-lin", label: "Solve linear equations in one variable", subjectId: "sub-math" },
    { id: "pq-l2", q: "Solve 5x − 4 = 21.", options: ["x = 3", "x = 4", "x = 5", "x = 6"], answer: 2, explain: "Add 4: 5x = 25, divide by 5: x = 5.", objectiveId: "lo-alg-lin", label: "Solve linear equations in one variable", subjectId: "sub-math" },
  ],
};

export const SEED_TUTOR_HISTORY = [
  { id: "tc-seed-1", studentId: "stu-ananya", title: "Dividing by a fraction", at: ago(3200), q: "Why does dividing by a fraction make the number bigger?" },
  { id: "tc-seed-2", studentId: "stu-ananya", title: "Food chain energy", at: ago(8000), q: "Explain energy flow in a food chain" },
];
