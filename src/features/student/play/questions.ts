export type Topic = "fractions" | "ecosystems" | "ratios";
export interface Mcq { id: string; topic: Topic; objectiveId: string; q: string; options: [string, string, string, string]; answer: 0 | 1 | 2 | 3; why: string }
export const TOPIC_LABEL: Record<Topic, string> = { fractions: "Fractions", ecosystems: "Ecosystems", ratios: "Ratio & proportion" };
export const TOPIC_SUBJECT: Record<Topic, string> = { fractions: "sub-math", ecosystems: "sub-sci", ratios: "sub-math" };

/** Curriculum MCQs (Grade 8) — fictional demo content aligned to the demo curriculum objectives. */
export const QUESTIONS: Mcq[] = [
  { id: "q1", topic: "fractions", objectiveId: "lo-frac-add", q: "What is 1/2 + 1/3?", options: ["2/5", "5/6", "1/6", "3/5"], answer: 1, why: "Use a common denominator of 6: 3/6 + 2/6 = 5/6." },
  { id: "q2", topic: "ecosystems", objectiveId: "lo-eco-chain", q: "In a food chain, where does the energy ultimately come from?", options: ["Decomposers", "The Sun", "Herbivores", "Soil"], answer: 1, why: "Producers capture sunlight; every other link depends on that energy." },
  { id: "q3", topic: "ratios", objectiveId: "lo-ratio", q: "Paint is mixed in the ratio 2 : 3. How many litres of the second colour are needed with 8 litres of the first?", options: ["10", "12", "16", "9"], answer: 1, why: "8 is 4 times 2, so the second colour is 4 times 3 = 12 litres." },
  { id: "q4", topic: "fractions", objectiveId: "lo-frac-mul", q: "What is 3/4 ÷ 3/8?", options: ["1/2", "9/32", "2", "3/2"], answer: 2, why: "Divide by a fraction by multiplying by its reciprocal: 3/4 × 8/3 = 2." },
  { id: "q5", topic: "ecosystems", objectiveId: "lo-eco-chain", q: "Which organism is a primary consumer?", options: ["Grass", "Grasshopper", "Frog", "Eagle"], answer: 1, why: "Primary consumers eat producers; a grasshopper eats grass." },
  { id: "q6", topic: "ratios", objectiveId: "lo-ratio", q: "A map scale is 1 : 50,000. Two towns are 6 cm apart on the map. What is the real distance?", options: ["3 km", "30 km", "300 m", "0.3 km"], answer: 0, why: "6 × 50,000 = 300,000 cm = 3 km." },
  { id: "q7", topic: "fractions", objectiveId: "lo-frac-word", q: "Asha reads 2/5 of a book on Monday and 1/4 on Tuesday. What fraction is left?", options: ["13/20", "7/20", "3/9", "3/20"], answer: 1, why: "2/5 + 1/4 = 13/20 read, so 7/20 remains." },
  { id: "q8", topic: "ecosystems", objectiveId: "lo-eco-bal", q: "What usually happens to a pond if all the frogs disappear?", options: ["Nothing changes", "Insect numbers may boom", "Fish grow wings", "Algae stops growing"], answer: 1, why: "Frogs eat insects. Fewer frogs can mean more insects, which ripples through the food web." },
  { id: "q9", topic: "ratios", objectiveId: "lo-ratio", q: "If 5 pens cost ₹60, how much do 8 pens cost at the same rate?", options: ["₹84", "₹96", "₹90", "₹100"], answer: 1, why: "One pen is ₹12, so 8 pens are ₹96." },
  { id: "q10", topic: "fractions", objectiveId: "lo-frac-add", q: "Which fraction is the largest?", options: ["3/8", "5/12", "4/9", "7/16"], answer: 2, why: "Over 144: 54, 60, 64, 63 — so 4/9 is largest." },
  { id: "q11", topic: "ecosystems", objectiveId: "lo-eco-chain", q: "Roughly how much energy passes from one trophic level to the next?", options: ["About 90%", "About 50%", "About 10%", "About 1%"], answer: 2, why: "The 10% rule: most energy is used or lost as heat at each level." },
  { id: "q12", topic: "ratios", objectiveId: "lo-ratio", q: "The ratio of boys to girls is 3 : 4 in a class of 35. How many girls are there?", options: ["15", "20", "21", "12"], answer: 1, why: "35 ÷ 7 = 5 per part, so girls = 4 × 5 = 20." },
];
export const byTopic = (t: Topic | "mixed") => (t === "mixed" ? QUESTIONS : QUESTIONS.filter((q) => q.topic === t));
