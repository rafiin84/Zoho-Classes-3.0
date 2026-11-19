import type { Question, QType, Bloom, Difficulty, QStatus, ShareTier, Blueprint, Paper } from "@/types/questions";
import { OBJECTIVES, TEACHERS, teacherName } from "./core";
import { ago } from "../format";

const lo = (id: string) => OBJECTIVES.find((o) => o.id === id)!;
interface X { options?: string[]; rubric?: Question["rubric"]; status?: QStatus; share?: ShareTier; author?: string; tags?: string[]; source?: string; ai?: boolean; flags?: string[]; language?: string; expl?: string; usage?: number }
let n = 0;
const Q = (loId: string, type: QType, stem: string, answer: string, marks: number, difficulty: Difficulty, bloom: Bloom, x: X = {}): Question => {
  const o = lo(loId); n++; const author = x.author ?? TEACHERS.find((t) => t.subjectIds.includes(o.subjectId))?.id ?? "tch-priya"; const t = TEACHERS.find((y) => y.id === author)!;
  const at = ago(60 * 24 * (40 - n));
  return {
    id: `q-${String(n).padStart(3, "0")}`, subjectId: o.subjectId, gradeId: o.gradeId, chapterId: o.chapterId, objectiveIds: [loId], type, stem, options: x.options, answer,
    explanation: x.expl ?? "Worked reasoning is shown in the answer key.", rubric: x.rubric, marks, difficulty, bloom, language: x.language ?? "English", tags: x.tags ?? [o.chapter.toLowerCase()],
    authorId: author, authorName: teacherName(author), departmentId: t.departmentId, status: x.status ?? "approved", share: x.share ?? "institution", source: x.source ?? "Teacher-authored", aiGenerated: !!x.ai,
    ambiguityFlags: x.flags, version: 1, versions: [{ v: 1, at, by: teacherName(author), note: "Created", stem, marks }],
    usage: x.usage ? Array.from({ length: x.usage }, (_, i) => ({ paperId: `qp-seed-${i}`, paperTitle: ["Unit Test 1", "Term 1 Examination", "Weekly check"][i % 3], at: ago(60 * 24 * (20 + i * 9)) })) : [], createdAt: at, updatedAt: at,
  };
};
const R = (a: [string, number][]) => a.map(([criterion, marks]) => ({ criterion, marks }));
export const QUESTIONS_SEED: Question[] = [
  Q("lo-frac-add", "mcq", "What is 3/4 + 1/6?", "2", 1, "Easy", "Remember", { options: ["4/10", "7/12", "11/12", "10/24"], expl: "LCM of 4 and 6 is 12: 9/12 + 2/12 = 11/12.", usage: 2, tags: ["fractions", "unlike"] }),
  Q("lo-frac-add", "mcq", "Which step is needed FIRST to add 2/5 and 3/8?", "1", 1, "Easy", "Understand", { options: ["Add the numerators", "Find a common denominator", "Multiply the fractions", "Convert to decimals"], usage: 1 }),
  Q("lo-frac-add", "fill", "5/6 − 1/4 = ____ (simplest form)", "7/12", 2, "Medium", "Apply", { expl: "10/12 − 3/12 = 7/12.", tags: ["fractions", "subtraction"] }),
  Q("lo-frac-add", "short", "Arjun says 1/2 + 1/3 = 2/5. Explain the error and give the correct sum.", "He added numerators and denominators separately. Correct: 3/6 + 2/6 = 5/6.", 3, "Medium", "Analyse", { rubric: R([["Identifies the misconception", 1], ["Finds common denominator", 1], ["Correct sum 5/6", 1]]) }),
  Q("lo-frac-mul", "tf", "Dividing a number by 1/2 gives a result smaller than the number.", "false", 1, "Easy", "Understand", { expl: "Dividing by 1/2 is multiplying by 2, so the result doubles." }),
  Q("lo-frac-mul", "mcq", "2 2/3 × 3/4 equals", "1", 2, "Medium", "Apply", { options: ["1 1/2", "2", "2 1/4", "6/12"], expl: "8/3 × 3/4 = 2." }),
  Q("lo-frac-mul", "match", "Match each operation with its result: (a) 1/2×1/4 (b) 1/2÷1/4 (c) 1/2+1/4 (d) 1/2−1/4", "a→1/8; b→2; c→3/4; d→1/4", 4, "Medium", "Understand", { options: ["1/8", "2", "3/4", "1/4"] }),
  Q("lo-frac-word", "structured", "A recipe needs 3/4 cup of sugar for 12 cookies. (a) How much for 30 cookies? (b) Sugar left from a 5-cup bag? (c) Suggest one way to reduce waste.", "(a) 1 7/8 cups (b) 3 1/8 cups (c) Any reasoned suggestion such as buying a smaller pack.", 6, "Medium", "Apply", { rubric: R([["Part (a) with method", 2], ["Part (b) with method", 2], ["Reasoned suggestion in (c)", 2]]), usage: 1 }),
  Q("lo-frac-word", "long", "Design a three-step plan to share 7/8 of a pizza among 5 friends so each gets an equal fraction, and justify why your plan is fair.", "Each gets 7/40 of the pizza; 7/8 ÷ 5. Justification: equal parts of the same whole.", 5, "Hard", "Create", { rubric: R([["Correct division 7/40", 2], ["Clear three steps", 2], ["Fairness justification", 1]]), status: "in-review" }),
  Q("lo-frac-word", "essay", "Evaluate whether estimating before calculating is a useful habit in fraction word problems. Use two examples.", "Strong answers compare estimation to checking reasonableness, cite examples, and note limits.", 8, "Hard", "Evaluate", { rubric: R([["Clear judgement", 2], ["Two relevant examples", 3], ["Counter-argument or limits", 2], ["Clarity", 1]]) }),
  Q("lo-alg-lin", "mcq", "Solve: 3x + 5 = 20", "1", 1, "Easy", "Apply", { options: ["x = 3", "x = 5", "x = 8", "x = 25/3"], expl: "3x = 15 so x = 5.", usage: 3, tags: ["linear", "one-step"] }),
  Q("lo-alg-lin", "multi", "Select ALL equations whose solution is x = 4.", "0,2", 2, "Medium", "Analyse", { options: ["2x + 1 = 9", "x − 3 = 2", "5x = 20", "x/2 = 8"], expl: "2(4)+1=9 and 5(4)=20." }),
  Q("lo-alg-lin", "short", "Write a linear equation for: a taxi charges ₹40 plus ₹12 per km; total ₹112. Solve it.", "40 + 12x = 112, x = 6 km", 3, "Medium", "Apply", { rubric: R([["Forms equation", 1], ["Solves correctly", 1], ["States units", 1]]) }),
  Q("lo-alg-lin", "diagram", "The balance scale picture shows 2 bags and 3 weights on the left and 11 weights on the right. Write and solve the equation shown.", "2x + 3 = 11, x = 4", 3, "Medium", "Understand", { rubric: R([["Equation from image", 1], ["Solves", 1], ["Checks answer", 1]]), tags: ["image", "balance"] }),
  Q("lo-ratio", "mcq", "If 3 pens cost ₹45, the cost of 7 pens is", "2", 2, "Medium", "Apply", { options: ["₹95", "₹100", "₹105", "₹115"], expl: "₹15 per pen × 7 = ₹105.", language: "English" }),
  Q("lo-ratio", "fill", "The ratio 18 : 24 in simplest form is ____ : ____", "3 : 4", 1, "Easy", "Remember", {}),
  Q("lo-ratio", "long", "Two paint mixes: A is red:white = 2:3, B is 3:5. Which is redder? Justify with calculations.", "A has 2/5 = 0.40 red, B has 3/8 = 0.375, so A is redder.", 4, "Hard", "Evaluate", { rubric: R([["Converts to fractions", 2], ["Correct comparison", 1], ["Justification", 1]]), status: "draft" }),
  Q("lo-eco-chain", "mcq", "In a food chain, energy generally", "1", 1, "Easy", "Remember", { options: ["Increases at each level", "Decreases at each level", "Stays constant", "Moves only upward"], usage: 2, tags: ["food chain"] }),
  Q("lo-eco-chain", "tf", "Decomposers are not part of energy flow in an ecosystem.", "false", 1, "Medium", "Understand", { expl: "Decomposers recycle nutrients and release energy from dead matter." }),
  Q("lo-eco-chain", "short", "Draw (describe) a four-link food chain for a pond and state which organism has the least available energy.", "Algae → tadpole → fish → heron; the heron.", 3, "Medium", "Apply", { rubric: R([["Valid four links", 2], ["Identifies top consumer", 1]]) }),
  Q("lo-eco-chain", "diagram", "Study the food web diagram. If the frog population falls, predict two effects and explain.", "Insects increase; snakes/herons decline. Reasoning via predator-prey links.", 4, "Hard", "Analyse", { rubric: R([["Two valid effects", 2], ["Reasoning through links", 2]]), tags: ["food web", "image"] }),
  Q("lo-eco-bal", "essay", "Propose a plan to restore ecological balance in a lake affected by invasive water hyacinth.", "Plan with manual removal, biological control, monitoring, community role, trade-offs.", 8, "Hard", "Create", { rubric: R([["Feasible actions", 3], ["Scientific reasoning", 3], ["Monitoring and risks", 2]]), flags: ["Open-ended: moderation of marking recommended"] }),
  Q("lo-eco-bal", "long", "Explain how removing top predators can lead to loss of plant cover.", "Predators control herbivores; herbivore boom overgrazes plants.", 4, "Medium", "Understand", { rubric: R([["Cause chain", 2], ["Use of terms", 1], ["Example", 1]]), usage: 1 }),
  Q("lo-cell", "mcq", "Which structure is found in plant cells but NOT animal cells?", "2", 1, "Easy", "Remember", { options: ["Nucleus", "Mitochondria", "Cell wall", "Cytoplasm"], usage: 2 }),
  Q("lo-cell", "match", "Match organelle to function: chloroplast, mitochondria, nucleus, vacuole", "chloroplast→photosynthesis; mitochondria→respiration; nucleus→control; vacuole→storage", 4, "Easy", "Remember", { options: ["Photosynthesis", "Respiration", "Control centre", "Storage"] }),
  Q("lo-cell", "structured", "(a) Name two differences between plant and animal cells. (b) Why do plants need a cell wall? (c) Judge: is a red blood cell a typical animal cell? Why?", "(a) cell wall, chloroplasts, large vacuole (b) support (c) no nucleus; specialised.", 6, "Hard", "Evaluate", { rubric: R([["Two differences", 2], ["Function of cell wall", 2], ["Reasoned judgement", 2]]), tags: ["cell", "structured"] }),
  Q("lo-story", "essay", "Write a 400-word story that begins: 'The bell rang, but nobody moved.' Include a clear turning point.", "Rubric-led marking: arc, voice, language control.", 10, "Medium", "Create", { rubric: R([["Narrative arc", 4], ["Voice and imagery", 3], ["Language control", 3]]), author: "tch-farah" }),
  Q("lo-story", "short", "Identify the turning point in a story of your choice and say why it matters.", "A named event with justification of change in direction.", 3, "Medium", "Analyse", { author: "tch-farah", source: "Storycraft Course, Unit 2" }),
  Q("lo-anc", "tf", "The Indus Valley civilisation was located along the Nile.", "false", 1, "Easy", "Remember", { expl: "It flourished along the Indus and nearby rivers." }),
  Q("lo-anc", "long", "Compare how two river-valley civilisations used their river for trade and farming.", "Comparison of Nile and Indus: flood irrigation, boat trade, planning.", 5, "Medium", "Analyse", { rubric: R([["Accurate facts", 2], ["Comparison structure", 2], ["Conclusion", 1]]) }),
  Q("lo-py-loop", "mcq", "How many times does print run? for i in range(4): print(i)", "2", 1, "Easy", "Remember", { options: ["3", "5", "4", "0"], expl: "range(4) yields 0..3." }),
  Q("lo-py-loop", "short", "Write a loop that prints the first ten even numbers.", "for i in range(2, 21, 2): print(i)", 3, "Medium", "Apply", { rubric: R([["Loop construct", 1], ["Correct range", 1], ["Prints output", 1]]), share: "department" }),
  Q("lo-py-loop", "structured", "Review this loop for a bug and explain the fix: for i in range(1,5): total = i", "Should be total += i with total initialised to 0.", 4, "Hard", "Analyse", { share: "private", status: "draft", author: "tch-leela" }),
  Q("lo-frac-add", "mcq", "Which AI-drafted item: What is 2/3 + 3/4?", "2", 1, "Medium", "Apply", { options: ["5/7", "6/7", "17/12", "5/12"], ai: true, status: "draft", source: "AI-generated (demo) from M8.3.1", flags: ["Distractor 6/7 may be defensible; check"], share: "private" }),
  Q("lo-frac-add", "tf", "1/2 + 1/2 = 2/4.", "false", 1, "Easy", "Remember", { tags: ["fractions", "unlike"], status: "archived" }),
];
const bm = (r: number, u: number, a: number, an: number, e: number, c: number) => ({ Remember: r, Understand: u, Apply: a, Analyse: an, Evaluate: e, Create: c });
export const BLUEPRINT_SEED: Blueprint[] = [
  { id: "bp-unit-test", name: "Unit test · 25 marks", totalMarks: 25, bloomMarks: bm(5, 5, 8, 4, 2, 1), difficultyPct: { Easy: 40, Medium: 40, Hard: 20 }, typeMix: { mcq: 5, short: 3, structured: 1 }, language: "English", accessibility: "Standard print", builtIn: true },
  { id: "bp-term", name: "Term exam · 50 marks", totalMarks: 50, bloomMarks: bm(8, 10, 14, 8, 6, 4), difficultyPct: { Easy: 30, Medium: 50, Hard: 20 }, typeMix: { mcq: 8, short: 4, long: 2, structured: 1 }, language: "English", accessibility: "Standard print; large-print on request", builtIn: true },
];
const snap = (ids: string[]) => ids.map((id, i) => { const q = QUESTIONS_SEED.find((x) => x.id === id)!; return { qid: id, section: q.marks <= 2 ? "Section A" : q.marks <= 4 ? "Section B" : "Section C", marks: q.marks, snapshot: structuredClone(q) }; });
export const PAPERS_SEED: Paper[] = [
  { id: "qp-001", title: "Fractions Unit Test", subjectId: "sub-math", gradeId: "g8", chapterIds: ["ch-m8-frac"], objectiveIds: ["lo-frac-add", "lo-frac-mul", "lo-frac-word"], totalMarks: 19, durationMin: 45, academicYearId: "ay-2026-27", term: "Term 2", examType: "Unit test", instructions: "Answer all questions. Show working. Calculators are not allowed.",
    blueprint: { ...BLUEPRINT_SEED[0], totalMarks: 19, bloomMarks: bm(1, 5, 10, 3, 0, 0) }, mode: "bank", questions: snap(["q-001", "q-002", "q-003", "q-004", "q-006", "q-007", "q-008"]), status: "published", ownerId: "tch-priya", ownerName: teacherName("tch-priya"), version: 2,
    versions: [{ v: 1, at: ago(60 * 24 * 12), by: teacherName("tch-priya"), note: "Initial draft", questionIds: ["q-001", "q-002", "q-003", "q-004"] }, { v: 2, at: ago(60 * 24 * 9), by: teacherName("tch-priya"), note: "Added word problem", questionIds: ["q-001", "q-002", "q-003", "q-004", "q-006", "q-007", "q-008"] }],
    restrictedTo: "institution", createdAt: ago(60 * 24 * 12), updatedAt: ago(60 * 24 * 9), approvedBy: "Institution Reviewer", publishedAt: ago(60 * 24 * 8) },
  { id: "qp-002", title: "Ecosystems Check-in (draft)", subjectId: "sub-sci", gradeId: "g8", chapterIds: ["ch-s8-eco"], objectiveIds: ["lo-eco-chain", "lo-eco-bal"], totalMarks: 25, durationMin: 40, academicYearId: "ay-2026-27", term: "Term 2", examType: "Weekly check", instructions: "Answer all questions.",
    blueprint: BLUEPRINT_SEED[0], mode: "manual", questions: snap(["q-018", "q-019", "q-020"]), status: "in-review", ownerId: "tch-daniel", ownerName: teacherName("tch-daniel"), version: 1, versions: [{ v: 1, at: ago(60 * 20), by: teacherName("tch-daniel"), note: "Initial draft", questionIds: ["q-018", "q-019", "q-020"] }], restrictedTo: "department", createdAt: ago(60 * 20), updatedAt: ago(60 * 20) },
];
