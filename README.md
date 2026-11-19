# Zoho Classes 3.0 — Phase 1 frontend prototype

AI-native Academic OS prototype. **Frontend only** — no backend, real auth, payments, AI or conferencing. All people, institutions and figures are fictional demo data.

## Run
```bash
npm install
npm run dev        # http://localhost:3000  (redirects to /student/home)
npm run build && npm start
npm run typecheck && npm run lint
```
Use the **Role** switcher (top bar) for Student / Teacher / Institution / Government / Parent, the profile menu → **Demo scenarios** for coherent named scenarios (and a simulated outage), and ⌘K for search / command entry.

## Layout
See `ARCHITECTURE.md`. Screens are registered per role in `src/features/<role>/routes.ts` (+ `features/academic/routes.ts` for teacher/institution shared screens); services in `src/lib/api`, seed data in `src/lib/mock-data`, nav in `src/config/nav.ts`.

## Main routes
- Student: `/student/{home,learn,feed,play,you}` + more (tutor, courses, player, micro, doubts, assignments, exams, books, fees, live-classes, timetable, results, events, clubs, talent, syllabus, attendance, certificates)
- Teacher: `/teacher/{overview,workspace,classes,courses,assessments,doubts,ai-teachers,agents,feed,reports,question-bank,papers,grading,timetable,workload,staff-chat,live-classes,books,moderation}`
- Institution: `/institution/{overview,workspace,academics,branches,people,courses,ai,marketplace,communication,analytics,integrations,governance,fees,studio,question-banks,grading,obe,results,timetable,ai-providers,reports…}`
- Government: `/government/{overview,command-centre,programmes,distribution,assessments,learning-gaps,districts,ai,reports,governance,ai-providers,knowledge-graph}`
- Parent: `/parent/{home,learning,feed,achievements,messages,assistant,fees,results,timetable,live-classes}`

## Limitations / future seams
In-memory mock services reset on full reload. Payments, conferencing, RAG, OCR/grading models, SAML, EMIS and AI providers are simulated behind service modules (`feeService`, `liveClassService`, `bookService`, `gradingService`, `aiProviderService`, …) and are replaceable. Frontend permission checks are illustrative only — production enforcement belongs on the backend.
