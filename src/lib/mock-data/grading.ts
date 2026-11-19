// Fictional grading seed. All submissions are demo data; AI suggestions are simulated, not produced by a real model.
import type { GradingItem, ReviewPolicy, AuditEntry, RubricCriterion } from "@/types/grading";
import { ago } from "@/lib/format";

export const REVIEW_POLICY_SEED: ReviewPolicy = { confidenceThreshold: 0.75, bulkApprovalEnabled: true, requireReasonOnOverride: true, autoRelease: false, moderationSamplePct: 20, updatedBy: "Institution policy (demo)" };

const au = (id: string, kind: AuditEntry["kind"], actor: string, text: string, minsAgo: number, marks?: number): AuditEntry => ({ id, kind, actor, text, at: ago(minsAgo), marks });
const cr = (id: string, name: string, max: number, score: number, comment: string, quote?: string, matched?: string[]): RubricCriterion => ({ id, name, max, score, comment, quote, matched });
const base = { reEvalCount: 0, flags: [] as string[] };

export const GRADING_SEED: GradingItem[] = [
  // 1 MCQ auto-scored
  { ...base, id: "gi-1", assessmentId: "as-frac-quiz", assessmentTitle: "Fractions quick quiz (objective)", classId: "cls-8b", className: "Grade 8 · B", studentId: "stu-ananya", studentName: "Ananya Rao", teacherId: "tch-priya", subjectId: "sub-math",
    format: "mcq", maxMarks: 10, submittedAt: ago(60 * 20), status: "ai-drafted", autoMarks: 9, confidence: 0.99, suggestedFeedback: "Strong grasp of equivalent fractions. Revisit the common-denominator step in Q7.",
    evidence: { answers: [
      { q: "Q1 · 3/5 = ?/20", selected: "12", correct: "12", marks: 1, max: 1, explanation: "Multiply top and bottom by 4." }, { q: "Q2 · 1/2 + 1/3", selected: "5/6", correct: "5/6", marks: 1, max: 1, explanation: "LCD is 6: 3/6 + 2/6." },
      { q: "Q3 · Simplify 18/24", selected: "3/4", correct: "3/4", marks: 1, max: 1, explanation: "Divide both by 6." }, { q: "Q4 · 2/3 × 3/4", selected: "1/2", correct: "1/2", marks: 1, max: 1, explanation: "6/12 simplifies to 1/2." },
      { q: "Q5 · 5/6 − 1/4", selected: "7/12", correct: "7/12", marks: 1, max: 1, explanation: "10/12 − 3/12." }, { q: "Q6 · Larger fraction", selected: "5/8", correct: "5/8", marks: 1, max: 1, explanation: "5/8 = 0.625 > 3/5." },
      { q: "Q7 · 3/4 ÷ 1/2", selected: "3/8", correct: "3/2", marks: 0, max: 1, explanation: "Dividing by 1/2 means multiplying by 2." }, { q: "Q8 · Mixed number of 11/4", selected: "2 3/4", correct: "2 3/4", marks: 1, max: 1, explanation: "11 = 2×4 + 3." },
      { q: "Q9 · Select ALL fractions equal to 1/2 (multi-select)", selected: "2/4, 3/6", correct: "2/4, 3/6, 5/10", marks: 1, max: 2, partial: true, explanation: "Partial credit: 2 of 3 correct options chosen, none wrong." }] },
    audit: [au("a1", "auto-score", "Answer-key scorer", "Auto-scored 9/10 against the answer key (deterministic).", 60 * 20, 9)] },
  { ...base, id: "gi-2", assessmentId: "as-frac-quiz", assessmentTitle: "Fractions quick quiz (objective)", classId: "cls-8b", className: "Grade 8 · B", studentId: "stu-kabir", studentName: "Kabir Mehta", teacherId: "tch-priya", subjectId: "sub-math",
    format: "mcq", maxMarks: 10, submittedAt: ago(60 * 21), status: "ai-drafted", autoMarks: 5, confidence: 0.99, suggestedFeedback: "Fractions with unlike denominators need attention; a remedial path is already open in your profile.",
    evidence: { answers: [
      { q: "Q1 · 3/5 = ?/20", selected: "12", correct: "12", marks: 1, max: 1, explanation: "Multiply top and bottom by 4." }, { q: "Q2 · 1/2 + 1/3", selected: "2/5", correct: "5/6", marks: 0, max: 1, explanation: "Common error: adding numerators and denominators." },
      { q: "Q3 · Simplify 18/24", selected: "3/4", correct: "3/4", marks: 1, max: 1, explanation: "Divide both by 6." }, { q: "Q4 · 2/3 × 3/4", selected: "1/2", correct: "1/2", marks: 1, max: 1, explanation: "6/12 simplifies to 1/2." },
      { q: "Q5 · 5/6 − 1/4", selected: "4/2", correct: "7/12", marks: 0, max: 1, explanation: "Needs a common denominator first." }, { q: "Q6 · Larger fraction", selected: "5/8", correct: "5/8", marks: 1, max: 1, explanation: "5/8 = 0.625 > 3/5." },
      { q: "Q7 · 3/4 ÷ 1/2", selected: "3/8", correct: "3/2", marks: 0, max: 1, explanation: "Dividing by 1/2 means multiplying by 2." }, { q: "Q8 · Mixed number of 11/4", selected: "2 3/4", correct: "2 3/4", marks: 1, max: 1, explanation: "11 = 2×4 + 3." },
      { q: "Q9 · Select ALL fractions equal to 1/2 (multi-select)", selected: "2/4", correct: "2/4, 3/6, 5/10", marks: 0, max: 2, partial: true, explanation: "1 of 3 correct options chosen; the key awards partial credit only from 2 correct options." }] },
    audit: [au("a1", "auto-score", "Answer-key scorer", "Auto-scored 5/10 against the answer key (deterministic).", 60 * 21, 5)] },
  // 3 short answer
  { ...base, id: "gi-3", assessmentId: "as-eco-quiz", assessmentTitle: "Ecosystems short-answer test", classId: "cls-8b", className: "Grade 8 · B", studentId: "stu-zoya", studentName: "Zoya Khan", teacherId: "tch-daniel", subjectId: "sub-sci",
    format: "short", maxMarks: 6, submittedAt: ago(60 * 30), status: "ai-drafted", suggestedMarks: 5, confidence: 0.86, suggestedFeedback: "Clear explanation of energy loss. Name the decomposers' role to earn the final mark.",
    evidence: { studentText: "Energy decreases at each step of a food chain because organisms use most of it for movement and heat. Only around 10% reaches the next level, which is why food chains are short. Producers like grass are at the base.",
      modelAnswer: "Only about 10% of energy passes to the next trophic level; the rest is lost as heat and used in life processes, limiting chain length. Decomposers recycle nutrients from dead matter.",
      keyPoints: [{ point: "~10% of energy transferred", found: true }, { point: "Loss as heat / life processes", found: true }, { point: "Limits chain length", found: true }, { point: "Role of decomposers", found: false }],
      criteria: [cr("c1", "Energy transfer idea", 2, 2, "Correctly states ~10% transfer.", "Only around 10% reaches the next level"), cr("c2", "Reason for loss", 2, 2, "Movement and heat named.", "use most of it for movement and heat"), cr("c3", "Consequence / link to chain length", 1, 1, "Links to short chains.", "which is why food chains are short"), cr("c4", "Decomposers", 1, 0, "Not mentioned in the answer.")] },
    audit: [au("a1", "ai-suggestion", "AI grading (demo)", "Drafted 5/6 by comparing the answer to the model answer and rubric.", 60 * 29, 5)] },
  // 4 essay low confidence with assignment link
  { ...base, id: "gi-4", assessmentId: "asg-story", assessmentTitle: "Short story: A day the lights went out", classId: "cls-8b", className: "Grade 8 · B", studentId: "stu-kabir", studentName: "Kabir Mehta", teacherId: "tch-farah", subjectId: "sub-eng",
    format: "essay", maxMarks: 20, submittedAt: ago(60 * 24 * 3), status: "ai-drafted", suggestedMarks: 11, confidence: 0.52, flags: ["Low confidence", "Below word count (≈ 35 of 400 words)", "Possible incomplete submission"], assignmentSubmissionId: "sub-a3",
    suggestedFeedback: "You've started with a good hook. Please continue the story: add what happens when the lights go out, a turning point and an ending.",
    evidence: { studentText: "It was dark and then…", modelAnswer: "A 400–500 word narrative with a clear beginning, turning point and ending, consistent tense and sensory detail.",
      criteria: [cr("c1", "Structure (beginning, turning point, ending)", 6, 2, "Only an opening is present; no turning point or ending.", "It was dark and then…"), cr("c2", "Language & vocabulary", 5, 3, "Limited text to judge; sentence is grammatical.", undefined), cr("c3", "Creativity & voice", 5, 3, "Atmospheric opening but unfinished.", "It was dark"), cr("c4", "Length & completeness", 4, 3, "Far below the requested length. AI could not verify a full submission.", undefined)] },
    audit: [au("a1", "ai-suggestion", "AI grading (demo)", "Drafted 11/20 with low confidence (0.52): submission appears incomplete.", 60 * 24 * 3 - 5, 11)] },
  // 5 handwritten (not yet content reviewed)
  { ...base, id: "gi-5", assessmentId: "asg-linear", assessmentTitle: "Linear equations practice set", classId: "cls-8b", className: "Grade 8 · B", studentId: "stu-ananya", studentName: "Ananya Rao", teacherId: "tch-priya", subjectId: "sub-math",
    format: "handwritten", maxMarks: 30, submittedAt: ago(60 * 24 * 8), status: "ai-drafted", confidence: 0.61, flags: ["Handwriting extraction needs review", "OCR uncertainty on Q4 and Q9"], assignmentSubmissionId: "sub-a2",
    suggestedFeedback: "Methods are clear. Check sign handling when moving terms across the equals sign.",
    evidence: { imageLabel: "linear-set.jpg · 2 pages", ocrConfidence: 0.61, contentReviewed: false,
      transcription: "Q1 3x + 5 = 20 → 3x = 15 → x = 5\nQ2 2(x − 3) = 10 → x − 3 = 5 → x = 8\nQ3 5x − 7 = 3x + 9 → 2x = 16 → x = 8\nQ4 x/4 + 2 = 6 → x/4 = 4 → x = 9\nQ5 7 − 2x = 1 → −2x = −6 → x = 3",
      originalTranscription: "Q1 3x + 5 = 20 → 3x = 15 → x = 5\nQ2 2(x − 3) = 10 → x − 3 = 5 → x = 8\nQ3 5x − 7 = 3x + 9 → 2x = 16 → x = 8\nQ4 x/4 + 2 = 6 → x/4 = 4 → x = 9\nQ5 7 − 2x = 1 → −2x = −6 → x = 3",
      criteria: [cr("c1", "Correct answers", 15, 13, "Q4: transcription reads x = 9 but x/4 = 4 gives x = 16 (student may have written 16).", "x/4 = 4 → x = 9"), cr("c2", "Working shown", 10, 9, "Steps shown for every question."), cr("c3", "Presentation", 5, 4, "Legible with minor crossings-out.")] },
    audit: [au("a1", "ai-suggestion", "AI grading (demo)", "Transcription extracted (confidence 0.61). Marks are withheld until a teacher reviews the extracted content.", 60 * 24 * 8 - 3)] },
  // 6 numerical
  { ...base, id: "gi-6", assessmentId: "as-ratio-test", assessmentTitle: "Ratio & proportion worked problems", classId: "cls-8b", className: "Grade 8 · B", studentId: "stu-dev", studentName: "Dev Malhotra", teacherId: "tch-priya", subjectId: "sub-math",
    format: "numerical", maxMarks: 8, submittedAt: ago(60 * 40), status: "ai-drafted", suggestedMarks: 6, confidence: 0.82, flags: ["Arithmetic slip carried forward"], suggestedFeedback: "Correct method for proportion. A slip in step 3 carried through to the final answer; check multiplication.",
    evidence: { studentText: "Problem: 12 pencils cost ₹90. Find the cost of 20 pencils.", steps: [
      { n: 1, text: "Cost of 1 pencil = 90 ÷ 12 = 7.5", status: "correct", marks: 2, max: 2 }, { n: 2, text: "Cost of 20 pencils = 7.5 × 20", status: "method", marks: 2, max: 2 },
      { n: 3, text: "7.5 × 20 = 140", status: "error", marks: 0, max: 2, issue: "Arithmetic error: 7.5 × 20 = 150." }, { n: 4, text: "Answer: ₹140", status: "error", marks: 2, max: 2, issue: "Final answer wrong, but follow-through (method) marks awarded." }] },
    audit: [au("a1", "ai-suggestion", "AI grading (demo)", "Step-level check: 6/8 with method and follow-through marks.", 60 * 40 - 2, 6)] },
  // 7 PDF
  { ...base, id: "gi-7", assessmentId: "as-eco-report", assessmentTitle: "Pond ecosystem field report (PDF)", classId: "cls-8b", className: "Grade 8 · B", studentId: "stu-tara", studentName: "Tara Joseph", teacherId: "tch-daniel", subjectId: "sub-sci",
    format: "pdf", maxMarks: 20, submittedAt: ago(60 * 50), status: "ai-drafted", suggestedMarks: 16, confidence: 0.79, suggestedFeedback: "Well-organised report with good data. Strengthen the conclusion by linking back to the hypothesis.",
    evidence: { imageLabel: "pond-report.pdf · 6 pages", pages: [
      { page: 1, section: "Aim & hypothesis", extract: "We predicted that more species live near the pond edge than in open water." }, { page: 2, section: "Method", extract: "Five quadrats of 1 m² were placed along the edge and centre; species were counted for 10 minutes each." },
      { page: 4, section: "Results table", extract: "Edge: 14, 11, 16, 12, 13 species. Centre: 5, 7, 6, 4, 6.", note: "Data matches the table image on page 4." }, { page: 6, section: "Conclusion", extract: "Edge has more species. More research is needed.", note: "Conclusion does not explain why." }],
      criteria: [cr("c1", "Aim & hypothesis", 4, 4, "Clear and testable.", "We predicted that more species live near the pond edge"), cr("c2", "Method & data", 8, 7, "Replicated quadrats; units present.", "Five quadrats of 1 m²"), cr("c3", "Analysis & conclusion", 8, 5, "States result but no reasoning about habitat/food chains.", "More research is needed.")] },
    audit: [au("a1", "ai-suggestion", "AI grading (demo)", "Extracted 6 pages and sections; drafted 16/20.", 60 * 50 - 4, 16)] },
  // 8 diagram
  { ...base, id: "gi-8", assessmentId: "as-foodweb", assessmentTitle: "Food web diagram", classId: "cls-8b", className: "Grade 8 · B", studentId: "stu-isha", studentName: "Isha Nambiar", teacherId: "tch-daniel", subjectId: "sub-sci",
    format: "diagram", maxMarks: 10, submittedAt: ago(60 * 26), status: "ai-drafted", suggestedMarks: 7, confidence: 0.7, flags: ["Arrow direction unclear for 2 links"], suggestedFeedback: "Good variety of organisms. Make sure arrows point from the food to the eater.",
    evidence: { imageLabel: "foodweb-isha.png (labelled drawing, 14 organisms)", imageObservations: ["14 organisms labelled, 4 trophic levels visible", "Grass → grasshopper → frog → snake → hawk chain drawn correctly", "Arrows between fox and rabbit point from fox to rabbit (reversed)", "No decomposer shown"],
      criteria: [cr("c1", "Organisms & variety", 3, 3, "More than the required 10 organisms."), cr("c2", "Correct energy-flow arrows", 4, 2, "2 of 8 links reversed.", "fox → rabbit"), cr("c3", "Trophic levels & decomposers", 3, 2, "Decomposers missing.")] },
    audit: [au("a1", "ai-suggestion", "AI grading (demo)", "Image observations compared against rubric: 7/10.", 60 * 26 - 3, 7)] },
  // 9 audio/video
  { ...base, id: "gi-9", assessmentId: "as-oral", assessmentTitle: "Oral presentation: My favourite story", classId: "cls-8b", className: "Grade 8 · B", studentId: "stu-sana", studentName: "Sana Qureshi", teacherId: "tch-farah", subjectId: "sub-eng",
    format: "audio-video", maxMarks: 15, submittedAt: ago(60 * 33), status: "ai-drafted", suggestedMarks: 11, confidence: 0.64, flags: ["Subjective criteria: teacher judgement required"], suggestedFeedback: "Clear structure and well-chosen examples. Work on pacing in the middle section.",
    evidence: { mediaLabel: "sana-oral.mp4 · 3:12 (audio transcript only; delivery not assessed by AI)", segments: [
      { t: "0:00–0:40", text: "Introduces the story and why it matters to her; clear opening sentence." }, { t: "0:40–2:10", text: "Summarises three key scenes; two long pauses; uses 'and then' repeatedly." }, { t: "2:10–3:12", text: "Gives personal reflection and closes with a question to the audience." }],
      criteria: [cr("c1", "Content & structure (transcript evidence)", 6, 5, "Opening, scenes and conclusion present.", "clear opening sentence"), cr("c2", "Language use (transcript evidence)", 4, 3, "Repetition of 'and then'.", "uses 'and then' repeatedly"), cr("c3", "Delivery & engagement (teacher only)", 5, 3, "AI cannot objectively assess delivery. Placeholder score pending teacher viewing.")] },
    audit: [au("a1", "ai-suggestion", "AI grading (demo)", "Transcript-based draft 11/15; delivery criterion needs the teacher's judgement.", 60 * 33 - 2, 11)] },
  // 10 project
  { ...base, id: "gi-10", assessmentId: "as-robot", assessmentTitle: "Line-follower robot practical", classId: "cls-8b", className: "Grade 8 · B", studentId: "stu-rohit", studentName: "Rohit Das", teacherId: "tch-leela", subjectId: "sub-cs",
    format: "project", maxMarks: 25, submittedAt: ago(60 * 72), status: "ai-drafted", suggestedMarks: 20, confidence: 0.77, suggestedFeedback: "Reliable build and clear documentation. Include test results for sharp curves.",
    evidence: { artefacts: [{ name: "build-photos.zip", kind: "images", note: "6 photos of the chassis and sensor placement" }, { name: "circuit-diagram.pdf", kind: "document" }, { name: "run-log.csv", kind: "data", note: "5 test runs, 4 completed" }],
      evaluators: [{ name: "Dr. Leela Krishnan", role: "Lead evaluator", score: 21, feedback: "Excellent build quality; documentation thorough." }, { name: "Mr. Sameer Bhatt", role: "Second evaluator", score: 19, feedback: "Missing test on sharp curves." }],
      criteria: [cr("c1", "Design & build", 8, 7, "Neat build; sensors well placed."), cr("c2", "Testing & results", 8, 5, "4 of 5 runs completed; sharp curves untested.", "5 test runs, 4 completed"), cr("c3", "Documentation", 5, 5, "Circuit diagram and log present."), cr("c4", "Teamwork reflection", 4, 3, "Brief reflection submitted.")] },
    audit: [au("a1", "ai-suggestion", "AI grading (demo)", "Aggregated artefacts and two evaluator notes: 20/25.", 60 * 72 - 2, 20)] },
  // 11 coding
  { ...base, id: "gi-11", assessmentId: "as-py-loops", assessmentTitle: "Python loops lab", classId: "cls-8b", className: "Grade 8 · B", studentId: "stu-nikhil", studentName: "Nikhil Pillai", teacherId: "tch-leela", subjectId: "sub-cs",
    format: "coding", maxMarks: 10, submittedAt: ago(60 * 15), status: "ai-drafted", suggestedMarks: 8, confidence: 0.9, suggestedFeedback: "All core cases pass. Consider handling n = 0 explicitly.",
    evidence: { code: "def total(n):\n    s = 0\n    for i in range(1, n + 1):\n        s += i\n    return s\n", tests: [{ name: "total(5) = 15", passed: true }, { name: "total(1) = 1", passed: true }, { name: "total(10) = 55", passed: true }, { name: "total(0) = 0", passed: true }, { name: "total(-3) raises ValueError", passed: false, detail: "Returned 0; no input validation." }],
      criteria: [cr("c1", "Correctness (tests)", 6, 5, "4 of 5 tests pass."), cr("c2", "Style & readability", 2, 2, "Clear names and structure."), cr("c3", "Edge cases", 2, 1, "No validation for negative n.")] },
    audit: [au("a1", "ai-suggestion", "AI grading (demo)", "Ran 5 test cases (simulated) and rubric: 8/10.", 60 * 15 - 2, 8)] },
  // 12 overridden
  { ...base, id: "gi-12", assessmentId: "asg-story", assessmentTitle: "Short story: A day the lights went out", classId: "cls-8b", className: "Grade 8 · B", studentId: "stu-isha", studentName: "Isha Nambiar", teacherId: "tch-farah", subjectId: "sub-eng",
    format: "essay", maxMarks: 20, submittedAt: ago(60 * 24 * 3 + 40), status: "overridden", suggestedMarks: 14, finalMarks: 17, confidence: 0.81, moderated: true, moderationNote: "Sampled for moderation: teacher override documented.",
    overrideReason: "Voice and imagery are stronger than the rubric wording rewards; the turning point is subtle but present in paragraph 3.", suggestedFeedback: "Good ending; vary sentence length.", finalFeedback: "A haunting, well-paced story. The turning point in paragraph 3 is subtle and effective. Vary sentence length in the opening.",
    evidence: { studentText: "The generator coughed once and died. Mira counted the seconds in the dark until the street lamps blinked back as fireflies…", modelAnswer: "400–500 words, clear arc.", criteria: [cr("c1", "Structure", 6, 4, "Turning point not obvious to the model.", "the street lamps blinked back as fireflies"), cr("c2", "Language", 5, 4, "Rich imagery."), cr("c3", "Creativity & voice", 5, 4, "Distinct voice."), cr("c4", "Length", 4, 2, "≈ 380 words.")] },
    audit: [au("a1", "ai-suggestion", "AI grading (demo)", "Drafted 14/20.", 60 * 24 * 3 + 30, 14), au("a2", "override", "Ms. Farah Siddiqui", "Override 14 → 17. Reason recorded.", 60 * 20, 17), au("a3", "moderation", "Moderation sample", "Included in moderation sample; override reason reviewed.", 60 * 10)] },
  // 13 released
  { ...base, id: "gi-13", assessmentId: "asg-story", assessmentTitle: "Short story: A day the lights went out", classId: "cls-8b", className: "Grade 8 · B", studentId: "stu-ananya", studentName: "Ananya Rao", teacherId: "tch-farah", subjectId: "sub-eng",
    format: "essay", maxMarks: 20, submittedAt: ago(60 * 24 * 4), status: "released", suggestedMarks: 16, finalMarks: 17, confidence: 0.88, assignmentSubmissionId: "sub-a1", releasedAt: ago(60 * 24 * 2),
    suggestedFeedback: "Lovely turning point and a vivid ending.", finalFeedback: "Lovely turning point and a vivid ending. Work on varying sentence length.",
    evidence: { studentText: "The lights went out at 7:42 PM…", modelAnswer: "Clear arc, 400–500 words.", criteria: [cr("c1", "Structure", 6, 6, "Complete arc."), cr("c2", "Language", 5, 4, "Some repeated sentence patterns."), cr("c3", "Creativity & voice", 5, 4, "Vivid ending."), cr("c4", "Length", 4, 3, "Slightly under.")] },
    audit: [au("a1", "ai-suggestion", "AI grading (demo)", "Drafted 16/20.", 60 * 24 * 4 - 5, 16), au("a2", "approve", "Ms. Farah Siddiqui", "Approved with +1 mark adjustment (17).", 60 * 24 * 3, 17), au("a3", "release", "Ms. Farah Siddiqui", "Marks and feedback released to student.", 60 * 24 * 2, 17)] },
];
