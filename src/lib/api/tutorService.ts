import type { TutorAttachment, TutorContextChip, TutorConversation, TutorMessage, TutorMode, TutorPreferences, TutorMcq, TutorSource } from "@/types/tutor";
import { DEFAULT_TUTOR_PREFS, HINDI_NOTES, PRACTICE_BANK, SEED_TUTOR_HISTORY } from "../mock-data/tutor";
import { simulate } from "./latency";
import { uid } from "../utils";
import { track } from "../analytics";
import { doubtService } from "./doubtService";
import { ago } from "../format";

/** Personal tutor preferences are per-person (not per-institution) and are never written to the school record. */
const prefs: Record<string, TutorPreferences> = {};
const conversations: TutorConversation[] = SEED_TUTOR_HISTORY.map((s) => ({
  id: s.id, studentId: s.studentId, title: s.title, updatedAt: s.at, mode: "ask" as TutorMode, context: [],
  messages: [
    { id: uid("tm"), role: "user", text: s.q, at: s.at },
    { id: uid("tm"), role: "tutor", at: s.at, text: s.title.includes("Food") ? "Energy flows one way: sun → producers → consumers, and only about 10% passes up each level." : "Dividing by a fraction asks “how many of these fit?” — and more small pieces fit than wholes, so the answer grows.", sources: [{ label: "Fractions & Decimals · Multiply & divide", kind: "course", href: "/student/courses/crs-fractions" }] },
  ],
}));

export type Topic = "fractions" | "divide" | "foodchain" | "linear" | "ratio" | "cell" | "photosynthesis" | "general";
export function detectTopic(text: string): Topic {
  const t = text.toLowerCase();
  if (/divid|÷|reciprocal/.test(t) && /fraction|1\/|3\/|\bby a\b/.test(t)) return "divide";
  if (/fraction|denominator|numerator|common denom|unlike|1\/4|2\/3|decimals?/.test(t)) return "fractions";
  if (/food chain|food web|energy flow|producer|consumer|ecosystem|trophic/.test(t)) return "foodchain";
  if (/equation|linear|solve for|2x|3x|\bx\b ?[=+-]/.test(t)) return "linear";
  if (/ratio|proportion/.test(t)) return "ratio";
  if (/cell|nucleus|mitochondria|chloroplast/.test(t)) return "cell";
  if (/photosynth/.test(t)) return "photosynthesis";
  return "general";
}

interface Pack { short: string; steps?: string[]; explanation: string; sources: TutorSource[]; practice?: keyof typeof PRACTICE_BANK; story?: string; example?: string; socratic?: string }
const PACKS: Record<Exclude<Topic, "general">, Pack> = {
  fractions: {
    short: "You can only add fractions once their pieces are the same size — so find a common denominator first. 1/4 + 2/3 = 11/12.",
    steps: ["Find a common denominator: the smallest number both 4 and 3 divide into is 12.", "Rewrite each fraction: 1/4 = 3/12 and 2/3 = 8/12.", "Add the numerators and keep the denominator: 3/12 + 8/12 = 11/12.", "Check if it simplifies: 11 and 12 share no factor, so 11/12 is done."],
    explanation: "Think of 1/4 and 2/3 as slices from differently-cut pizzas. You cannot say “3 slices” until every slice is the same size. The common denominator re-cuts both pizzas into twelfths so the slices match, and then counting is just addition.",
    story: "Imagine two friends sharing pizzas: one cut into 4 big slices, one into 3. To count the total fairly, they re-cut both into 12 equal slices first — now 3 slices + 8 slices = 11 slices out of 12.",
    example: "Example: 1/2 + 1/3 → LCD 6 → 3/6 + 2/6 = 5/6. Now you try 1/3 + 1/6 (hint: 6 works).",
    socratic: "What would the pieces look like if 1/4 and 2/3 were cut the same size? What number do 4 and 3 both fit into?",
    sources: [{ label: "Fractions & Decimals · Finding a common denominator", kind: "lesson", href: "/student/player/crs-fractions?activity=act-fr-4" }, { label: "Worked examples: 1/4 + 2/3", kind: "lesson", href: "/student/player/crs-fractions?activity=act-fr-5" }, { label: "Mrs. Nair’s answer: Why a common denominator?", kind: "doubt", href: "/student/doubts/dbt-1" }],
    practice: "fractions",
  },
  divide: {
    short: "Dividing by a fraction means “how many of these fit?” — so you flip it and multiply. 1/2 ÷ 1/4 = 1/2 × 4 = 2.",
    steps: ["Ask: how many 1/4s fit into 1/2?", "Flip the second fraction (its reciprocal): 1/4 becomes 4/1.", "Multiply: 1/2 × 4 = 2.", "Sanity check: two quarters make a half — yes, 2 fit."],
    explanation: "Dividing by a number smaller than 1 makes the answer larger because more small pieces fit than wholes. Multiplying by the reciprocal is a shortcut for counting those pieces.",
    story: "A baker has half a loaf and cuts quarter-loaf sandwiches. How many sandwiches? Two — and that is exactly 1/2 ÷ 1/4.",
    example: "Example: 3/4 ÷ 1/8 = 3/4 × 8 = 6. Try 1/2 ÷ 1/4 yourself.",
    socratic: "If you cut a half-loaf into quarter-loaf pieces, how many pieces would you get? Can you show that with multiplication?",
    sources: [{ label: "Fractions & Decimals · Multiplying fractions visually", kind: "lesson", href: "/student/player/crs-fractions?activity=act-fr-9" }],
    practice: "divide",
  },
  foodchain: {
    short: "Energy flows one way — sun to producers to consumers — and only about 10% passes up to the next level; the rest is used or lost as heat.",
    steps: ["Producers (plants) capture sunlight and make food.", "Primary consumers (herbivores) eat producers.", "Secondary consumers eat primary consumers.", "At each step roughly 10% of the energy moves up, so chains stay short."],
    explanation: "Because energy shrinks at every level, there is not enough left to support many levels — which is why most food chains have 4 or 5 links. Decomposers recycle matter, not energy.",
    story: "Picture a bucket of sunshine poured on the grass. The rabbit drinks a cupful, the fox a thimble, the eagle a drop — and the rest escapes as warmth along the way.",
    example: "Example: grass (10,000 units) → grasshopper (1,000) → frog (100) → snake (10).",
    socratic: "If a grasshopper only gets about a tenth of the grass’s energy, what happens to the energy by the time it reaches a snake?",
    sources: [{ label: "Ecosystems · Meet the food chain", kind: "lesson", href: "/student/player/crs-ecosystems?activity=act-eco-1" }],
    practice: "foodchain",
  },
  linear: {
    short: "Do the same thing to both sides until x is alone. For 2x + 3 = 11: subtract 3, then divide by 2 — x = 4.",
    steps: ["Start: 2x + 3 = 11.", "Subtract 3 from both sides: 2x = 8.", "Divide both sides by 2: x = 4.", "Check: 2(4) + 3 = 11 ✓."],
    explanation: "An equation is a balance scale. Whatever you do to one side you must do to the other, so the scale stays level. Undo operations in reverse order: first the +3, then the ×2.",
    story: "Two boxes of x marbles plus 3 loose marbles equal 11 marbles. Take the 3 loose ones away, and two equal boxes hold 8 — so each box has 4.",
    example: "Example: 3x − 5 = 10 → 3x = 15 → x = 5.",
    socratic: "What is the last thing that happened to x in 2x + 3? How could you undo it first?",
    sources: [{ label: "Linear equations practice set", kind: "practice", href: "/student/assignments/asg-linear" }],
    practice: "linear",
  },
  ratio: {
    short: "A ratio compares two quantities; a proportion says two ratios are equal. If 2 pencils cost ₹10, then 6 pencils cost ₹30.",
    steps: ["Write the ratio: 2 : 10 (pencils : rupees).", "Find the scale factor to the new amount: 6 ÷ 2 = 3.", "Apply it to the other side: 10 × 3 = ₹30."],
    explanation: "Equivalent ratios scale both parts by the same factor, like zooming a photo without stretching it.",
    story: "A recipe for 2 people uses 1 cup of rice. Cooking for 6 means everything triples — 3 cups.",
    example: "Example: 3 : 4 = 9 : 12 because both parts were multiplied by 3.",
    socratic: "What do you multiply 2 by to get 6? Should the cost change by the same factor?",
    sources: [{ label: "Ratio & proportion recap (live class)", kind: "lesson", href: "/student/live-classes" }],
  },
  cell: {
    short: "Plant and animal cells share a nucleus, cytoplasm and membrane — but plant cells also have a cell wall, chloroplasts and a large central vacuole.",
    steps: ["Shared: nucleus, cytoplasm, cell membrane, mitochondria.", "Plant only: rigid cell wall, chloroplasts (photosynthesis), large vacuole.", "Animal: usually round and flexible with small vacuoles."],
    explanation: "Plants make their own food and need structure without a skeleton, so their cells carry chloroplasts and a wall.",
    story: "Think of an animal cell as a flexible water balloon, and a plant cell as a small greenhouse with solar panels inside.",
    example: "Example: Onion peel cells look like neat rectangles because of the cell wall.",
    socratic: "Which structure would a leaf cell need that a muscle cell does not?",
    sources: [{ label: "Science Explorer · Cell Structure", kind: "book" }],
  },
  photosynthesis: {
    short: "Plants use sunlight, water and carbon dioxide to make glucose and oxygen: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂.",
    steps: ["Roots take in water; leaves take in carbon dioxide.", "Chlorophyll in chloroplasts absorbs sunlight.", "Light energy turns the water and CO₂ into glucose.", "Oxygen is released as a by-product."],
    explanation: "Photosynthesis stores light energy as chemical energy in glucose — the starting point of nearly every food chain.",
    story: "A leaf is a tiny kitchen: sunlight is the stove, water and air are the ingredients, and sugar is dinner.",
    example: "Example: A plant in the dark can’t photosynthesise, so its leaves turn pale over time.",
    socratic: "If a plant had water and air but no light, which step would stop?",
    sources: [{ label: "Ecosystems · Meet the food chain", kind: "lesson", href: "/student/player/crs-ecosystems?activity=act-eco-1" }],
  },
};

const toneOpen: Record<TutorPreferences["tone"], string> = {
  friendly: "Great question — let’s work it out together. ", patient: "No rush at all — one small step at a time. ", encouraging: "You’re closer than you think! ",
  playful: "Ooh, a juicy one — let’s crack it. ", formal: "Let us consider this carefully. ", direct: "",
};

export interface ReplyInput { prompt: string; context: TutorContextChip[]; prefs: TutorPreferences; attachments: TutorAttachment[]; mode: TutorMode; lastTopic?: Topic }
/** Deterministic mock reply generator. No model is called anywhere. */
export function generateReply(inp: ReplyInput): TutorMessage {
  const { prompt, context, prefs: p, attachments, mode } = inp;
  const base = { id: uid("tm"), role: "tutor" as const, at: new Date().toISOString(), lang: p.language };
  const open = toneOpen[p.tone];
  const hasDoc = context.some((c) => c.kind === "doc" || c.kind === "book");
  const topicText = `${prompt} ${context.map((c) => c.label).join(" ")}`;
  let topic = detectTopic(prompt);
  if (topic === "general") topic = detectTopic(topicText);
  const handwritten = attachments.find((a) => a.mock === "handwritten-maths") || mode === "handwritten";
  const page = attachments.find((a) => a.mock === "textbook-page") || mode === "textbook";

  if (handwritten) {
    return { ...base, text: `${open}I read your handwriting: 2x + 3 = 11, then “2x = 14 → x = 7”. The setup is right — the slip is in step 2.`, stepMode: true,
      steps: ["You wrote 2x + 3 = 11. ✓", "To remove +3, subtract 3 from both sides: 11 − 3 = 8, not 14. That’s the small slip.", "So 2x = 8.", "Divide by 2: x = 4.", "Check: 2(4) + 3 = 11 ✓"],
      explanation: "The method you used — isolate the x-term, then divide — is exactly right. Only the subtraction went the wrong way (adding 3 instead of subtracting). Mistakes like this are very common and easy to catch by checking the answer back in the equation.",
      sources: [{ label: "Linear equations practice set", kind: "practice", href: "/student/assignments/asg-linear" }], practice: PRACTICE_BANK.linear, suggestions: ["Give me 2 more like this", "Why do we subtract from both sides?"], offerTeacher: true };
  }
  if (page) {
    return { ...base, text: `${open}This textbook page is about adding and subtracting unlike fractions. In one line: match the denominators, then add the numerators.`,
      steps: ["Heading: “Adding unlike fractions” — introduces the LCD method.", "Worked example: 1/4 + 2/3 = 11/12.", "Margin note: always simplify the result.", "Exercise 3.2 asks for 6 questions — start with Q1–Q3."],
      explanation: "The page builds from a picture of pizza slices to the rule. If the rule feels abstract, redraw Example 1 with strips of paper.",
      sources: [{ label: "Textbook page 48 (your upload)", kind: "book" }, { label: "Fractions & Decimals · Worked examples", kind: "lesson", href: "/student/player/crs-fractions?activity=act-fr-5" }], practice: PRACTICE_BANK.fractions, suggestions: ["Summarise it in 3 bullets", "Quiz me on this page"] };
  }
  if (mode === "practice" || /practi[sc]e|quiz me|test me|more questions|give me .*questions?|2 more/.test(prompt.toLowerCase())) {
    const key: keyof typeof PRACTICE_BANK = topic === "divide" ? "divide" : topic === "foodchain" ? "foodchain" : topic === "linear" ? "linear" : "fractions";
    return { ...base, text: `${open}Here are ${PRACTICE_BANK[key].length} quick questions. Answer them one by one — I’ll check each and tell you what to revisit.`, practice: PRACTICE_BANK[key], sources: PACKS[key === "fractions" ? "fractions" : (key as Exclude<Topic, "general">)].sources, suggestions: ["Explain the last one", "Make it harder"] };
  }
  if (hasDoc && topic === "general") {
    const doc = context.find((c) => c.kind === "doc" || c.kind === "book")!;
    return { ...base, notFound: true, text: `I couldn’t find anything about that in “${doc.label}”. I’d rather not guess and risk teaching you something that isn’t in your selected source.`,
      explanation: "You can clear the source to let me answer from general knowledge (clearly labelled), or send this to your teacher who can check the exact material.", suggestions: ["Answer without the source", "Show what the document covers"], offerTeacher: true };
  }
  if (topic === "general") {
    return { ...base, text: `${open}I can help with that. I don’t have a ready-made walkthrough for it in this demo, so here’s a way to begin: say it in your own words, list what you know, and tell me where you got stuck.`,
      steps: ["Write what the question is asking in one sentence.", "List the facts or numbers you’re given.", "Tell me the very first step you’d try — even a guess is fine."],
      explanation: "In the real product I would draw on your course and school sources here. In this demo, try topics like fractions, food chains or linear equations to see the full experience.", suggestions: ["Explain fractions", "How do food chains work?", "Solve 2x + 3 = 11"], offerTeacher: true };
  }
  const k = PACKS[topic];
  const fraction = topic === "fractions" || topic === "divide";
  let text = open + k.short;
  if (p.style === "storytelling" && k.story) text = open + k.story;
  if (p.style === "examples" && k.example) text = open + k.short + " " + k.example;
  if (p.style === "socratic" && k.socratic) text = open + k.socratic;
  if (p.language === "Hindi") text = `${HINDI_NOTES[topic === "fractions" ? "fractions" : "default"]}`;
  const showSteps = fraction || topic === "linear" || topic === "foodchain" || p.style === "detailed";
  return { ...base, text, steps: showSteps ? k.steps : undefined, stepMode: topic === "linear" || fraction, explanation: k.explanation, sources: k.sources, practice: undefined,
    suggestions: [k.practice ? "Give me practice questions" : "Quiz me", "Explain it another way", ...(p.language === "English" ? ["Say it in Hindi"] : ["Switch back to English"])], offerTeacher: topic === "divide" || topic === "fractions" ? false : false };
}

export const tutorService = {
  preferences: (studentId: string) => simulate(() => prefs[studentId] ?? DEFAULT_TUTOR_PREFS, { ms: 60 }),
  savePreferences: (studentId: string, p: TutorPreferences) => simulate(() => { prefs[studentId] = p; track("tutor_opened", { personalised: true, tone: p.tone }); return p; }, { ms: 120 }),
  conversations: (studentId: string) => simulate(() => conversations.filter((c) => c.studentId === studentId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), { ms: 100 }),
  get: (id: string) => simulate(() => conversations.find((c) => c.id === id) ?? null, { ms: 60 }),
  create: (studentId: string, title: string, context: TutorContextChip[], mode: TutorMode) => simulate(() => {
    const c: TutorConversation = { id: uid("tc"), studentId, title, updatedAt: new Date().toISOString(), messages: [], context, mode }; conversations.unshift(c); return c;
  }, { ms: 40 }),
  save: (id: string, patch: Partial<Pick<TutorConversation, "title" | "messages" | "context" | "mode">>) => simulate(() => {
    const c = conversations.find((x) => x.id === id); if (!c) return null; Object.assign(c, patch); c.updatedAt = new Date().toISOString(); return c;
  }, { ms: 30 }),
  remove: (id: string) => simulate(() => { const i = conversations.findIndex((x) => x.id === id); if (i >= 0) conversations.splice(i, 1); return true; }, { ms: 60 }),
  /** Simulated think time then a deterministic reply. */
  reply: (inp: ReplyInput) => simulate(() => { track("tutor_question_asked", { topic: detectTopic(inp.prompt) }); return generateReply(inp); }, { ms: 900 }),
  /** Escalate to the human teacher: creates a contextual doubt thread (visible in the teacher inbox). */
  askTeacher: (p: { studentId: string; teacherId: string; subjectId: string; title: string; text: string; courseId?: string; lessonId?: string; context?: string; attachments?: TutorAttachment[] }) =>
    doubtService.create({ studentId: p.studentId, teacherId: p.teacherId, subjectId: p.subjectId, title: p.title, text: p.text, courseId: p.courseId, lessonId: p.lessonId, context: p.context ?? "Escalated from AI Tutor conversation",
      attachments: (p.attachments ?? []).map((a) => ({ name: a.name, kind: a.kind === "video" ? "doc" : a.kind })), escalatedFromTutor: true }),
};
export type { TutorMcq };
export const _ago = ago;
