export interface MicroQ { id: string; topic: MicroTopicId; difficulty: 1 | 2 | 3; q: string; options: string[]; answer: number; explain: string; objectiveId: string; label: string; subjectId: string }
export type MicroTopicId = "fractions" | "divide" | "foodchain" | "linear";
export const MICRO_TOPICS: { id: MicroTopicId; label: string; hint: string; objectiveId: string; subjectId: string; icon: string; from: string; to: string }[] = [
  { id: "fractions", label: "Unlike fractions", hint: "Add & subtract with common denominators", objectiveId: "lo-frac-add", subjectId: "sub-math", icon: "MathOperations", from: "#5146E5", to: "#9A93F5" },
  { id: "divide", label: "Dividing fractions", hint: "Flip, multiply, sanity-check", objectiveId: "lo-frac-mul", subjectId: "sub-math", icon: "Function", from: "#4338CA", to: "#B8B5FF" },
  { id: "linear", label: "Linear equations", hint: "Balance both sides to find x", objectiveId: "lo-alg-lin", subjectId: "sub-math", icon: "Target", from: "#7044D8", to: "#F5C66A" },
  { id: "foodchain", label: "Food chains", hint: "Who eats whom, and where energy goes", objectiveId: "lo-eco-chain", subjectId: "sub-sci", icon: "Leaf", from: "#1D6FB8", to: "#7044D8" },
];
const Q = (id: string, topic: MicroTopicId, difficulty: 1 | 2 | 3, q: string, options: string[], answer: number, explain: string): MicroQ => {
  const t = MICRO_TOPICS.find((x) => x.id === topic)!; return { id, topic, difficulty, q, options, answer, explain, objectiveId: t.objectiveId, label: t.label, subjectId: t.subjectId };
};
export const MICRO_BANK: MicroQ[] = [
  Q("m-f1", "fractions", 1, "What is 1/2 + 1/4?", ["2/6", "3/4", "1/6", "2/4"], 1, "Make halves into quarters: 2/4 + 1/4 = 3/4."),
  Q("m-f2", "fractions", 1, "Which common denominator works for 1/3 and 1/6?", ["3", "6", "9", "12"], 1, "6 is a multiple of both 3 and 6, so it is the smallest."),
  Q("m-f3", "fractions", 2, "What is 1/4 + 2/3?", ["3/7", "11/12", "3/12", "2/12"], 1, "LCD 12: 3/12 + 8/12 = 11/12."),
  Q("m-f4", "fractions", 2, "What is 5/6 − 1/4?", ["4/2", "7/12", "4/12", "1/2"], 1, "LCD 12: 10/12 − 3/12 = 7/12."),
  Q("m-f5", "fractions", 3, "What is 2/3 + 3/4 − 1/6?", ["5/4", "4/3", "1/2", "17/12"], 0, "LCD 12: 8/12 + 9/12 − 2/12 = 15/12, which simplifies to 5/4."),
  Q("m-f6", "fractions", 3, "A recipe needs 3/4 cup sugar; you have used 1/3 cup. How much is left?", ["2/1", "5/12", "1/2", "4/7"], 1, "LCD 12: 9/12 − 4/12 = 5/12."),
  Q("m-d1", "divide", 1, "What is 1/2 × 1/2?", ["1/4", "1", "1/2", "2/4"], 0, "Multiply tops and bottoms: 1×1 over 2×2 = 1/4."),
  Q("m-d2", "divide", 1, "What is the reciprocal of 3/5?", ["5/3", "3/5", "−3/5", "1/15"], 0, "Flip it: 5/3."),
  Q("m-d3", "divide", 2, "What is 1/2 ÷ 1/4?", ["1/8", "2", "1/2", "4"], 1, "Multiply by the reciprocal: 1/2 × 4 = 2."),
  Q("m-d4", "divide", 2, "What is 3/5 ÷ 3?", ["1/5", "9/5", "3/15", "5"], 0, "3/5 × 1/3 = 1/5."),
  Q("m-d5", "divide", 3, "What is 2 1/2 ÷ 5/6?", ["3", "2 1/12", "5/12", "1/3"], 0, "5/2 × 6/5 = 30/10 = 3."),
  Q("m-d6", "divide", 3, "How many 3/4-metre ribbons can you cut from 6 metres?", ["8", "4 1/2", "6 3/4", "2"], 0, "6 ÷ 3/4 = 6 × 4/3 = 8."),
  Q("m-l1", "linear", 1, "Solve x + 5 = 9.", ["x = 4", "x = 14", "x = 5", "x = 45"], 0, "Subtract 5 from both sides: x = 4."),
  Q("m-l2", "linear", 1, "Solve 3x = 12.", ["x = 4", "x = 9", "x = 15", "x = 36"], 0, "Divide both sides by 3."),
  Q("m-l3", "linear", 2, "Solve 2x + 3 = 11.", ["x = 3", "x = 4", "x = 7", "x = 5"], 1, "2x = 8, so x = 4."),
  Q("m-l4", "linear", 2, "Solve 5x − 4 = 21.", ["x = 3", "x = 4", "x = 5", "x = 6"], 2, "5x = 25, so x = 5."),
  Q("m-l5", "linear", 3, "Solve 3(x − 2) = 2x + 1.", ["x = 5", "x = 7", "x = 3", "x = 9"], 1, "3x − 6 = 2x + 1 → x = 7."),
  Q("m-l6", "linear", 3, "Solve (x + 4)/3 = 5.", ["x = 11", "x = 19", "x = 1", "x = 9"], 0, "Multiply by 3: x + 4 = 15, so x = 11."),
  Q("m-e1", "foodchain", 1, "Which organism is a producer?", ["Grass", "Rabbit", "Fox", "Eagle"], 0, "Producers make their own food using sunlight."),
  Q("m-e2", "foodchain", 1, "What does a herbivore eat?", ["Plants", "Meat", "Both", "Rocks"], 0, "Herbivores eat plants."),
  Q("m-e3", "foodchain", 2, "In grass → grasshopper → frog → snake, the frog is a…", ["Producer", "Primary consumer", "Secondary consumer", "Decomposer"], 2, "It eats the primary consumer (grasshopper)."),
  Q("m-e4", "foodchain", 2, "About how much energy passes to the next level?", ["90%", "50%", "10%", "1%"], 2, "Roughly 10% moves up; the rest is used or lost as heat."),
  Q("m-e5", "foodchain", 3, "If most frogs disappeared, what is a likely first effect?", ["Grasshoppers increase", "Grass increases", "Snakes increase", "Nothing changes"], 0, "Fewer frogs eat grasshoppers, so grasshoppers grow in number."),
  Q("m-e6", "foodchain", 3, "Why are food chains rarely longer than 5 links?", ["Too little energy remains", "Animals are too small", "Plants run out", "Decomposers stop"], 0, "Energy drops at each level, so little is left at the top."),
];
