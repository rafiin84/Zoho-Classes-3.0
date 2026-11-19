import type { Interpretation, ReportAnswer, WorkspaceActionId, WorkspaceField, WorkspaceResult } from "@/types/teacher";
import type { LearningActivity, CourseModule } from "@/types";
import { simulate, ServiceError } from "./latency";
import { simulateAsync } from "./teacherSim";
import { uid } from "../utils";
import { inDays, DEMO_NOW } from "../format";
import { courseService } from "./courseService";
import { feedService } from "./feedService";
import { learningProfileService } from "./learningProfileService";
import { assignmentService } from "./assignmentService";
import { doubtService } from "./doubtService";
import { notificationService } from "./notificationService";
import { aiTeacherService } from "./aiTeacherService";
import { teacherInsightService, nameOf } from "./teacherInsightService";

/* Everything generated here is a DEMO draft. Nothing real is called; nothing publishes or grades until a person approves. */
export interface ActionParam { key: string; label: string; options?: { value: string; label: string }[]; placeholder?: string; defaultValue?: string }
export interface WorkspaceAction { id: WorkspaceActionId; label: string; description: string; icon: string; params: ActionParam[] }
const CLASS_OPTS = [{ value: "cls-8b", label: "Grade 8 · B" }, { value: "cls-8a", label: "Grade 8 · A" }, { value: "cls-7a", label: "Grade 7 · A" }];
const CHAPTERS = [{ value: "Fractions & Decimals", label: "Fractions & Decimals" }, { value: "Linear Equations", label: "Linear Equations" }, { value: "Ratio & Proportion", label: "Ratio & Proportion" }];
export const WORKSPACE_ACTIONS: WorkspaceAction[] = [
  { id: "lesson", label: "Prepare tomorrow's lesson", description: "Objectives, activities and an exit ticket for Friday's period.", icon: "BookOpenText", params: [{ key: "classId", label: "Class", options: CLASS_OPTS }, { key: "topic", label: "Topic", options: CHAPTERS }] },
  { id: "mcqs", label: "Generate MCQs for a chapter", description: "Five objective-tagged questions with explanations.", icon: "ClipboardText", params: [{ key: "topic", label: "Chapter", options: CHAPTERS }] },
  { id: "paper", label: "Create question paper & answer key", description: "Sectioned paper, marking scheme and answer key (draft).", icon: "FileText", params: [{ key: "topic", label: "Chapter", options: CHAPTERS }, { key: "marks", label: "Total marks", options: [{ value: "20", label: "20" }, { value: "40", label: "40" }] }] },
  { id: "evaluate", label: "Evaluate submitted work", description: "Draft marks and feedback for submissions awaiting review.", icon: "CheckCircle", params: [] },
  { id: "struggling", label: "Identify students struggling with fractions", description: "Evidence-based list from learning profiles.", icon: "Target", params: [{ key: "topic", label: "Topic", options: [{ value: "fractions", label: "Fractions" }, { value: "all", label: "Any topic" }] }] },
  { id: "remedial", label: "Create remedial path", description: "Short lesson, worked example, practice and re-check.", icon: "Path", params: [] },
  { id: "parent-update", label: "Draft parent update", description: "A supportive, factual note about one student's progress.", icon: "Envelope", params: [{ key: "studentId", label: "Student", options: [{ value: "stu-kabir", label: "Kabir Mehta" }, { value: "stu-ananya", label: "Ananya Rao" }, { value: "stu-zoya", label: "Zoya Khan" }, { value: "stu-meera", label: "Meera Iyer" }] }] },
  { id: "ai-teacher", label: "Create AI Teacher", description: "Draft an AI Teacher; it needs institution approval before use.", icon: "Robot", params: [{ key: "topic", label: "Subject focus", options: [{ value: "Mathematics", label: "Mathematics" }, { value: "Science", label: "Science" }] }] },
  { id: "weekly-test", label: "Schedule weekly practice test", description: "A recurring low-stakes check, created as an assignment.", icon: "CalendarBlank", params: [{ key: "classId", label: "Class", options: CLASS_OPTS }, { key: "topic", label: "Chapter", options: CHAPTERS }] },
];
const classLabel = (id?: string) => CLASS_OPTS.find((c) => c.value === id)?.label ?? "Grade 8 · B";
const F = (key: string, label: string, value: string, multiline = false): WorkspaceField => ({ key, label, value, multiline });
const base = (actionId: WorkspaceActionId, title: string, summary: string, fields: WorkspaceField[], meta: WorkspaceResult["meta"], consequences: string[]): WorkspaceResult =>
  ({ id: uid("wr"), actionId, title, summary, generatedAt: new Date().toISOString(), fields, meta, status: "pending", consequences });

const MCQ_BANK: Record<string, string[]> = {
  "Fractions & Decimals": [
    "What is 2/3 + 1/6?\nA) 3/9\nB) 5/6\nC) 1/2\nD) 3/6\nAnswer: B\nWhy: LCD is 6, so 4/6 + 1/6 = 5/6.",
    "Which fraction is greatest?\nA) 3/5\nB) 5/8\nC) 2/3\nD) 4/7\nAnswer: C\nWhy: Compare with a common denominator of 840 — 2/3 = 560/840 is largest.",
    "What is 3/4 ÷ 1/2?\nA) 3/8\nB) 1 1/2\nC) 2/3\nD) 3/2 × 1/2\nAnswer: B\nWhy: Dividing by 1/2 is multiplying by 2: 3/4 × 2 = 3/2.",
    "Write 0.375 as a fraction in simplest form.\nA) 3/8\nB) 375/100\nC) 3/75\nD) 37/100\nAnswer: A\nWhy: 375/1000 simplifies by 125 to 3/8.",
    "A recipe needs 2/3 cup sugar. How much for 1/2 of the recipe?\nA) 1/3 cup\nB) 1/6 cup\nC) 4/3 cup\nD) 2/5 cup\nAnswer: A\nWhy: 1/2 × 2/3 = 2/6 = 1/3.",
  ],
  "Linear Equations": [
    "Solve: 3x + 5 = 20\nA) x = 5\nB) x = 25/3\nC) x = 15\nD) x = 8\nAnswer: A\nWhy: 3x = 15, so x = 5.",
    "Solve: 2(x − 3) = 10\nA) x = 2\nB) x = 8\nC) x = 13\nD) x = 5\nAnswer: B\nWhy: x − 3 = 5, so x = 8.",
    "If 4x − 7 = x + 8, then x =\nA) 5\nB) 1\nC) 3\nD) 15/5\nAnswer: A\nWhy: 3x = 15.",
    "Sum of three consecutive integers is 48. The smallest is\nA) 15\nB) 16\nC) 17\nD) 14\nAnswer: A\nWhy: 3n + 3 = 48 → n = 15.",
    "x/3 + 2 = 6 gives x =\nA) 12\nB) 8\nC) 24\nD) 4/3\nAnswer: A\nWhy: x/3 = 4 → x = 12.",
  ],
  "Ratio & Proportion": [
    "Divide ₹150 in the ratio 2 : 3. The smaller share is\nA) ₹60\nB) ₹50\nC) ₹90\nD) ₹75\nAnswer: A\nWhy: 150 × 2/5 = 60.",
    "If 4 pens cost ₹30, 10 pens cost\nA) ₹75\nB) ₹70\nC) ₹80\nD) ₹60\nAnswer: A\nWhy: ₹7.5 per pen × 10.",
    "Which pair is in proportion?\nA) 2:3 and 4:6\nB) 2:3 and 3:4\nC) 1:2 and 2:5\nD) 5:6 and 6:7\nAnswer: A\nWhy: Both simplify to 2:3.",
    "A map scale is 1 : 50,000. 4 cm on the map is\nA) 2 km\nB) 20 km\nC) 200 m\nD) 0.2 km\nAnswer: A\nWhy: 4 × 50,000 cm = 200,000 cm = 2 km.",
    "The ratio of boys to girls is 3:4 with 28 students. Girls =\nA) 16\nB) 12\nC) 21\nD) 14\nAnswer: A\nWhy: 28 × 4/7 = 16.",
  ],
};

export const parentUpdateLog: { id: string; studentId: string; subject: string; body: string; at: string }[] = [];

export const teacherWorkspaceService = {
  actions: () => WORKSPACE_ACTIONS,
  generate: (actionId: WorkspaceActionId, params: Record<string, string>, teacherId: string) => simulateAsync(async (): Promise<WorkspaceResult> => {
    const topic = params.topic ?? "Fractions & Decimals";
    switch (actionId) {
      case "lesson": return base("lesson", `Lesson plan: ${topic} — ${classLabel(params.classId)}`, "A 45-minute plan built from your course outline and recent class gaps (demo).", [
        F("title", "Lesson title", `${topic}: unlike fractions in everyday contexts`), F("objectives", "Learning objectives", "• Add and subtract unlike fractions using a common denominator\n• Explain why denominators must match", true),
        F("warmup", "Warm-up (5 min)", "Show 1/2 and 1/3 of a chocolate bar — can we add them as they are?", true), F("main", "Main activity (25 min)", "Worked examples 1/4 + 2/3 and 3/5 − 1/4, then pairs build equivalent fractions with strips.", true),
        F("practice", "Practice (10 min)", "6 guided questions; Kabir and two others get the scaffolded set.", true), F("exit", "Exit ticket (5 min)", "What is 2/5 + 1/3? Show your common denominator.", true)],
        { classId: params.classId ?? "cls-8b", topic, courseId: "crs-fractions" },
        ["Adds a lesson module (lesson + checkpoint + exit ticket) to the course 'Fractions & Decimals, Made Friendly'", `Posts a preview to the ${classLabel(params.classId)} class feed`, "Students see it in their course journey and feed"]);
      case "mcqs": return base("mcqs", `5 MCQs: ${topic}`, "Objective-tagged questions with explanations (demo).", (MCQ_BANK[topic] ?? MCQ_BANK["Fractions & Decimals"]).map((q, i) => F(`q${i + 1}`, `Question ${i + 1}`, q, true)), { topic, courseId: "crs-fractions" },
        ["Adds a 'Practice: " + topic + "' module with 5 MCQ activities to the course", "Students will see these in the Course Player"]);
      case "paper": { const marks = params.marks ?? "20"; return base("paper", `Question paper: ${topic} (${marks} marks)`, "Draft only — publishing is done in the Question Paper Builder.", [
        F("title", "Paper title", `${topic} — Unit Test (${marks} marks)`), F("secA", "Section A — MCQ", `${Number(marks) / 4} × 1 mark. Questions drawn from the generated MCQ set.`, true), F("secB", "Section B — Short answer", `${Number(marks) / 4} × 2 marks. Include one word problem and one 'explain why' question.`, true),
        F("key", "Answer key", "A1: B, A2: C, A3: B, A4: A, A5: A. Section B marking: 1 mark method, 1 mark accuracy.", true), F("scheme", "Marking scheme", "Method marks are awarded even when the final answer is wrong.", true)], { topic, marks },
        ["Saves a draft paper (not published, not scheduled)", "You review and publish it from the Question Paper Builder"]); }
      case "evaluate": {
        const q = await teacherInsightService.gradingQueue(teacherId);
        if (!q.length) throw new ServiceError("No submissions are awaiting review right now.", "validation");
        return base("evaluate", `Draft evaluation: ${q.length} submission${q.length > 1 ? "s" : ""}`, "AI-suggested marks for your review. Marks stay unreleased until you release them.", q.flatMap(({ submission: s, assignment: a, studentName }) => [
          F(`m-${s.id}`, `${studentName} · ${a.title} — marks (out of ${a.totalMarks})`, String(s.draftAiMarks ?? Math.round(a.totalMarks * 0.7))), F(`f-${s.id}`, `${studentName} — feedback`, "Clear working in the first half. Check the common denominator in questions 7–9, then re-try them.", true)]),
          { subIds: q.map((x) => x.submission.id) }, ["Saves marks and feedback to each submission as returned-but-unreleased", "Students do NOT see marks until you release them in Assessments"]);
      }
      case "struggling": {
        const profiles = await learningProfileService.all(); const rows = (await teacherInsightService.attention(teacherId)).filter((a) => params.topic === "all" || /fraction|denominator/i.test(a.gapLabel ?? a.reasons.join(" ")));
        if (!rows.length) throw new ServiceError("No students currently show a fractions gap in their learning profiles.", "validation");
        return base("struggling", `${rows.length} student${rows.length > 1 ? "s" : ""} to check in on`, "Based on recent checkpoint and quiz evidence; a signal, not a diagnosis.", rows.map((r) => {
          const p = profiles.find((x) => x.studentId === r.studentId); const o = p?.objectives.find((x) => x.objectiveId === "lo-frac-add");
          return F(`s-${r.studentId}`, `${r.name} (${r.severity})`, `${r.reasons.join("; ")}${o ? ` — Add/subtract unlike fractions mastery ${o.mastery}%, trend ${o.trend}` : ""}`, true);
        }), { studentIds: rows.map((r) => r.studentId), gapIds: rows.map((r) => r.gapId ?? "") }, ["Creates a proposed remedial path for each student with a gap and no existing path", "Students see a supportive 'Practice plan' once you approve"]);
      }
      case "remedial": {
        const att = (await teacherInsightService.attention(teacherId)).filter((a) => a.gapId && a.gapLabel);
        const pick = att[0]; if (!pick) throw new ServiceError("No student with an open learning gap to build a path for.", "validation");
        return base("remedial", `Remedial path for ${pick.name}: ${pick.gapLabel}`, "Short lesson, worked example, practice and reassessment (demo).", [
          F("title", "Path title", `${pick.gapLabel}, step by step`), F("steps", "Steps", "1. Mini-lesson (5 min)\n2. Worked example (6 min)\n3. Guided practice, 8 questions (10 min)\n4. Re-check, 6 questions (8 min)", true),
          F("message", "Message shown to the student", "Let's build this skill together — a few short steps, at your pace. Nothing here affects your marks.", true)], { studentId: pick.studentId, gapId: pick.gapId!, name: pick.name },
          ["Creates a remedial path linked to the learning gap", "Student sees it under 'Your practice plan'"]);
      }
      case "parent-update": {
        const s = params.studentId ?? "stu-kabir"; const n = nameOf(s);
        return base("parent-update", `Parent update: ${n}`, "A factual, supportive draft — review the tone before sending.", [
          F("subject", "Subject", `${n}'s progress in fractions`), F("body", "Message", `Dear parent,\n\n${n} has been working on adding fractions with different denominators. Recent checkpoints show this is still a tricky area, and we have prepared a short practice plan (about 30 minutes this week). A few minutes of practice at home — for example scaling a recipe — would help.\n\nHappy to talk any time.\nMrs. Priya Nair`, true)], { studentId: s },
          ["Sends a private message to the student's parent (parent view only)", "Not visible to other families"]);
      }
      case "ai-teacher": return base("ai-teacher", `AI Teacher draft: ${topic} coach`, "A draft persona. It cannot be used by students until your institution approves it.", [
        F("name", "Name", topic === "Science" ? "Curie" : "Ramanujan Coach"), F("personality", "Personality", "Patient, asks a guiding question before giving the answer, uses visual models.", true), F("sources", "Approved sources", topic === "Science" ? "Science Explorer Grade 8" : "Fractions & Decimals, Made Friendly (course)", true)],
        { topic }, ["Creates an AI Teacher in DRAFT status", "It stays unavailable to students until submitted and approved by the institution"]);
      case "weekly-test": return base("weekly-test", `Weekly practice test: ${topic} — ${classLabel(params.classId)}`, "Ten low-stakes questions, due next Friday.", [
        F("title", "Test title", `Weekly practice: ${topic}`), F("instructions", "Instructions", "10 questions, about 15 minutes. Low stakes — it helps us see what to revisit.", true), F("marks", "Total marks", "10")], { classId: params.classId ?? "cls-8b", topic },
        ["Creates an assignment visible to students in the selected class", "Due next Friday at 5:00 PM"]);
    }
  }),

  approve: (r: WorkspaceResult, teacher: { id: string; name: string }) => simulateAsync(async (): Promise<WorkspaceResult> => {
    if (r.status !== "pending") throw new ServiceError("This result was already decided.", "validation");
    const f = (k: string) => r.fields.find((x) => x.key === k)?.value ?? ""; let outcome = "";
    switch (r.actionId) {
      case "lesson": {
        const courseId = String(r.meta.courseId); const st = await courseService.structure(courseId); const modId = uid("mod");
        const mk = (type: LearningActivity["type"], title: string, seq: number, min: number, extra: Partial<LearningActivity> = {}): LearningActivity => ({ id: uid("act"), courseId, moduleId: modId, type, title, sequence: seq, estimatedMinutes: min, mandatory: true, learningObjectiveIds: ["lo-frac-add"], ...extra });
        const acts = [mk("lesson", f("title"), 1, 25, { instructions: `${f("objectives")}\n\n${f("main")}` }), mk("teacher-checkpoint", "Pause & reflect", 2, 3, { mandatory: false, checkpointMode: "popup", instructions: f("warmup") }), mk("mcq", "Exit ticket", 3, 5, { payload: { q: f("exit"), options: ["11/15", "7/8", "3/8", "7/15"], answer: 0, explain: "LCD 15: 6/15 + 5/15 = 11/15." } })];
        const mod: CourseModule = { id: modId, courseId, title: `Lesson: ${f("title")}`, sequence: st.modules.length + 1, activityIds: acts.map((a) => a.id) };
        await courseService.saveStructure(courseId, [...st.modules, mod], [...st.activities, ...acts]);
        await feedService.teacherPost({ authorId: teacher.id, authorName: teacher.name, text: `Tomorrow's lesson: ${f("title")}. A new module is waiting in your Fractions course.`, audienceLabel: classLabel(String(r.meta.classId)), audienceType: "class", postType: "class" });
        outcome = "Lesson added to the Fractions course and announced in the class feed."; break;
      }
      case "mcqs": {
        const courseId = String(r.meta.courseId); const st = await courseService.structure(courseId); const modId = uid("mod");
        const acts: LearningActivity[] = r.fields.map((q, i) => { const lines = q.value.split("\n"); const opts = lines.filter((l) => /^[A-D]\)/.test(l)).map((l) => l.slice(3).trim()); const ans = "ABCD".indexOf((lines.find((l) => l.startsWith("Answer:")) ?? "Answer: A").slice(8, 9));
          return { id: uid("act"), courseId, moduleId: modId, type: "mcq", title: `Practice Q${i + 1}`, sequence: i + 1, estimatedMinutes: 2, mandatory: false, learningObjectiveIds: ["lo-frac-add"], payload: { q: lines[0], options: opts, answer: Math.max(0, ans), explain: (lines.find((l) => l.startsWith("Why:")) ?? "").slice(5) } }; });
        const mod: CourseModule = { id: modId, courseId, title: `Practice: ${r.meta.topic}`, sequence: st.modules.length + 1, activityIds: acts.map((a) => a.id) };
        await courseService.saveStructure(courseId, [...st.modules, mod], [...st.activities, ...acts]); outcome = "5 MCQs added to the course as an optional practice module."; break;
      }
      case "paper": generatedPapers.unshift({ id: uid("paper"), title: f("title"), topic: String(r.meta.topic), marks: Number(r.meta.marks), at: new Date().toISOString(), status: "draft" }); outcome = "Saved as a draft paper. Open the Question Paper Builder to review and publish."; break;
      case "evaluate": {
        for (const id of r.meta.subIds as string[]) { const m = Number(f(`m-${id}`)); if (Number.isNaN(m) || m < 0) throw new ServiceError("Marks must be a non-negative number.", "validation"); await assignmentService.grade(id, m, f(`f-${id}`), false); }
        outcome = "Marks saved as unreleased. Release them from Assessments when you are happy."; break;
      }
      case "struggling": {
        const profiles = await learningProfileService.all(); const rem = await learningProfileService.allRemedial(); let n = 0;
        for (const sid of r.meta.studentIds as string[]) { const g = profiles.find((p) => p.studentId === sid)?.gaps.find((x) => x.severity !== "low"); if (g && !rem.some((x) => x.studentId === sid && x.gapId === g.id && x.status !== "completed")) { const p = await learningProfileService.proposeRemedial(sid, g.id, `${g.label}, step by step`, "ai"); await learningProfileService.approveRemedial(p.id); n++; } }
        outcome = n ? `${n} remedial path${n > 1 ? "s" : ""} created and approved.` : "No new remedial paths were needed — affected students already have one."; break;
      }
      case "remedial": {
        const p = await learningProfileService.proposeRemedial(String(r.meta.studentId), String(r.meta.gapId), f("title"), "ai"); await learningProfileService.approveRemedial(p.id);
        notificationService.push({ role: "student", recipientId: String(r.meta.studentId), category: "learning", title: "A practice plan is ready for you", body: f("message").slice(0, 80), href: "/student/path" });
        outcome = `Remedial path approved for ${r.meta.name}.`; break;
      }
      case "parent-update": {
        parentUpdateLog.unshift({ id: uid("pu"), studentId: String(r.meta.studentId), subject: f("subject"), body: f("body"), at: new Date().toISOString() });
        notificationService.push({ role: "parent", childId: String(r.meta.studentId), category: "communication", title: f("subject"), body: f("body").slice(0, 90), href: "/parent/messages", private: true });
        outcome = "Parent update sent privately."; break;
      }
      case "ai-teacher": { await aiTeacherService.create({ name: f("name"), subject: String(r.meta.topic), grade: "Grade 8", languages: ["English"], personality: f("personality"), avatarColor: "#7044D8", sources: f("sources").split(",").map((s) => s.trim()).filter(Boolean), tools: ["Answer questions", "Teach"], owner: teacher.name, ownerType: "teacher", ownerId: teacher.id }); outcome = "AI Teacher saved as a draft. Submit it for institution approval from AI Teachers."; break; }
      case "weekly-test": {
        await assignmentService.create({ title: f("title"), courseId: "crs-fractions", courseTitle: "Fractions & Decimals, Made Friendly", subjectId: "sub-math", teacherId: teacher.id, teacherName: teacher.name, classIds: [String(r.meta.classId)], dueAt: inDays(8, 17), instructions: f("instructions"), submissionTypes: ["text"], resources: [], totalMarks: Number(f("marks")) || 10, learningObjectiveIds: ["lo-frac-add"] });
        outcome = "Practice test created for next Friday."; break;
      }
    }
    return { ...r, status: "approved", outcome };
  }),

  /** Mock interpretation of a typed command. Questions are answered; commands become a proposed action needing confirmation. */
  interpret: (text: string, teacherId: string) => simulateAsync(async (): Promise<Interpretation> => {
    const t = text.toLowerCase().trim();
    if (/^(how many|what|which|who|show|list|when)\b/.test(t) || t.endsWith("?")) {
      if (/doubt/.test(t)) { const d = (await doubtService.forTeacher(teacherId)).filter((x) => x.status === "open" || x.status === "follow-up"); return { kind: "answer", headline: "Answer (read-only, nothing changed)", answer: `You have ${d.length} doubt${d.length === 1 ? "" : "s"} needing a reply: ${d.map((x) => `“${x.title}” from ${nameOf(x.studentId)}`).join("; ") || "none"}.` }; }
      if (/grad|submission|review/.test(t)) { const q = await teacherInsightService.gradingQueue(teacherId); return { kind: "answer", headline: "Answer (read-only, nothing changed)", answer: `${q.length} submission${q.length === 1 ? " is" : "s are"} awaiting your review${q.length ? `: ${q.map((x) => `${x.studentName} (${x.assignment.title})`).join(", ")}` : ""}.` }; }
      if (/struggl|attention|risk|gap/.test(t)) { const a = await teacherInsightService.attention(teacherId); return { kind: "answer", headline: "Answer (read-only, nothing changed)", answer: `${a.length} student${a.length === 1 ? "" : "s"} need attention: ${a.map((x) => `${x.name} (${x.reasons[0]})`).join("; ")}.` }; }
      return { kind: "answer", headline: "Answer (read-only, nothing changed)", answer: "I can answer questions about your doubts, grading queue and students needing attention. For anything else, try a report query on the Reports page." };
    }
    const map: [RegExp, WorkspaceActionId, string, string, string][] = [
      [/lesson/, "lesson", "Prepare a lesson plan", "Grade 8 · B (your class)", "Add to course + class feed after you approve"],
      [/mcq|question(s)?\b.*chapter|quiz/, "mcqs", "Generate MCQs", "Course 'Fractions & Decimals'", "Added to the course only after you approve"],
      [/paper|answer key/, "paper", "Create a question paper and answer key", "Draft only", "Saved as draft; publishing is a separate step"],
      [/evaluat|grade|mark/, "evaluate", "Draft marks for submitted work", `${(await teacherInsightService.gradingQueue(teacherId)).length} submission(s)`, "Marks stay unreleased until you release them"],
      [/remedial|support path/, "remedial", "Create a remedial path", "One student with a learning gap", "Student sees it only after you approve"],
      [/parent/, "parent-update", "Draft a parent update", "One parent (private)", "Sent only after you approve"],
      [/ai teacher/, "ai-teacher", "Create an AI Teacher draft", "Draft only", "Needs institution approval before any student use"],
      [/test|practice|weekly/, "weekly-test", "Schedule a weekly practice test", "Grade 8 · B", "Visible to students after you approve"],
      [/struggl|fraction|attention/, "struggling", "Identify students struggling", "Your classes", "Read-only until you approve any follow-up"],
    ];
    const hit = map.find(([re]) => re.test(t));
    if (!hit) return { kind: "answer", headline: "I couldn't turn that into an action", answer: "Try: “Prepare tomorrow's lesson on fractions”, “Generate MCQs for Linear Equations”, or “Draft a parent update for Kabir”. You can also pick a suggested action above." };
    return { kind: "action", headline: "Proposed action — nothing has happened yet", actionId: hit[1], action: hit[2], scope: hit[3], audience: /parent/.test(t) ? "One parent" : hit[1] === "paper" || hit[1] === "ai-teacher" || hit[1] === "struggling" ? "Only you (draft)" : "Students in the selected class", approval: hit[4] };
  }),

  /** Natural-language report query -> mock summary + chart + drill-down with honesty notes. */
  reportQuery: (text: string, teacherId: string) => simulateAsync(async (): Promise<ReportAnswer> => {
    const t = text.toLowerCase(); const roster = await teacherInsightService.roster("cls-8b"); const sourceAt = new Date(DEMO_NOW.getTime() - 20 * 60000).toISOString();
    const note = "Patterns shown here are correlations in demo data and do not prove cause — use them as prompts for a conversation, not conclusions.";
    if (/complet|assignment|submit/.test(t)) {
      const asgs = (await assignmentService.list()).filter((a) => a.teacherId === teacherId); const subs = await assignmentService.allSubmissions();
      const rows = asgs.map((a) => { const s = subs.filter((x) => x.assignmentId === a.id); const done = s.filter((x) => ["submitted", "graded", "returned"].includes(x.status)).length; return { label: a.title, value: Math.round((done / Math.max(1, roster.length)) * 100), sub: `${done} of ${roster.length} students` }; });
      return { title: "Assignment completion — Grade 8 · B", summary: `Completion ranges from ${Math.min(...rows.map((r) => r.value), 100)}% to ${Math.max(...rows.map((r) => r.value), 0)}% across your assignments.`, metric: "Completion = students with a submitted, returned or graded submission ÷ students on the class roster.", dateRange: "Term 2 to date (1 Oct – 19 Nov 2026)", filters: ["Class: Grade 8 · B", "Teacher: Priya Nair"], sourceAt, chart: rows, unit: "%", drill: rows.map((r) => ({ label: r.label, detail: r.sub ?? "" })), incomplete: "Only 2 submissions per assignment are recorded in this demo, so percentages are low and illustrative.", note };
    }
    if (/engag|minutes|streak|active/.test(t)) {
      const rows = roster.map((r) => ({ label: r.name.split(" ")[0], value: Math.round((r.weeklyMinutes / r.weeklyGoal) * 100), sub: `${r.weeklyMinutes} of ${r.weeklyGoal} min`, studentId: r.studentId }));
      return { title: "Weekly learning time vs goal — Grade 8 · B", summary: `${rows.filter((r) => r.value >= 100).length} of ${rows.length} students met their weekly goal.`, metric: "Weekly minutes in learning activities ÷ the student's weekly goal.", dateRange: "This week (16–19 Nov 2026, partial)", filters: ["Class: Grade 8 · B"], sourceAt, chart: rows, unit: "%", drill: rows.map((r) => ({ label: r.label, detail: r.sub ?? "", studentId: r.studentId })), incomplete: "Time is only tracked inside the platform; offline practice is not counted. Some students have estimated values.", note };
    }
    const rows = roster.map((r) => { const o = r.mastery["sub-math"]; return { label: r.name.split(" ")[0], value: o ?? 0, sub: r.estimated ? "estimated, no full profile" : `Maths mastery ${o}%`, studentId: r.studentId }; }).sort((a, b) => a.value - b.value);
    const low = rows.filter((r) => r.value < 60);
    return { title: "Mathematics mastery — Grade 8 · B", summary: `${low.length} of ${rows.length} students are below 60% mastery in Mathematics; the lowest are ${low.slice(0, 3).map((r) => r.label).join(", ") || "none"}.`, metric: "Mastery = rolling weighted score across Maths learning objectives from checkpoints, quizzes and assessments (0–100).", dateRange: "Last 30 days (20 Oct – 19 Nov 2026)", filters: ["Class: Grade 8 · B", "Subject: Mathematics"], sourceAt, chart: rows, unit: "%", drill: rows.map((r) => ({ label: r.label, detail: r.sub ?? "", studentId: r.studentId })), incomplete: roster.some((r) => r.estimated) ? `${roster.filter((r) => r.estimated).length} students have no full learning profile yet, so their values are estimates; Meera Iyer has not completed the baseline.` : undefined, note };
  }),
};
export const generatedPapers: { id: string; title: string; topic: string; marks: number; at: string; status: "draft" }[] = [];
