# Zoho Classes 3.0 — Phase 1 prototype: architecture & contributor rules

**Frontend only. No backend, no real auth/payments/AI/conferencing. All people, schools and figures are fictional demo data.**
Stack: Next.js 15 App Router · React 19 · TypeScript · Tailwind v4 (tokens in `src/app/globals.css`) · Framer Motion · Phosphor Icons · Zustand · TanStack Query · React Hook Form + Zod.

## How routing works
`src/app/(app)/[role]/[[...slug]]/page.tsx` → `ScreenHost` → `features/resolve.ts` looks the slug up in per-role registries:
`src/features/<role>/routes.ts` (student | teacher | institution | government | parent) + `features/shared/routes.ts`.
A registry key is a slug path (`"home"`, `"courses/:id"`, `"play/tug-of-war"`); the value is a lazy loader `() => import("./screens/X")` whose **default export** is a client component taking `ScreenProps` (`{ role, slug, params, searchParams }` from `@/types/screens`). Literal segments beat `:params`. Nav destinations live in `src/config/nav.ts`; **every nav slug must resolve to a real screen**.

## Foundation you can rely on (do not rewrite; extend additively only if essential)
- `components/ui` (import from `@/components/ui`): Button, Card/CardBody, Badge/StatusBadge/AIBadge/DemoTag, Input/Textarea/Select/Field/Switch/Checkbox/Slider, Progress, Avatar, Skeleton/SkeletonCards, EmptyState/NoResults/ErrorState, PageHeader/SectionHeader/StatTile, Cover (gradient cover), Rail, Segmented (tabs), ListToolbar, Stepper, Modal/Drawer/ConfirmDialog, `toast.success/error/info/warning`, Icon (string-name map), `cn`.
- `components/charts`: ProgressRing, BarChart, LineChart, Donut, Heatmap (colour-safe, numeric labels), Sparkline, StackedBar, Legend, CHART_COLORS.
- Stores: `useApp()` (role, scenario, theme, child, context, panels) and `useActors()` (→ `studentId`, `teacherId`, `childId`, `institutionId`, `flags`, `scenario`) from `@/stores/app-store`. Use `useActors()` instead of hard-coding the current person.
- Types: `@/types` (core), `@/types/academic` (periods, timetable, marksheets). Add your own domain types in `src/types/<domain>.ts`.
- Mock data: `@/lib/mock-data/{core,content,engagement,finance,academic}.ts` — shared people/IDs (students `stu-ananya|stu-kabir|stu-meera|stu-vihaan|…`, teachers `tch-priya|daniel|farah|arjun|leela|sameer`, classes `cls-8b…`, courses `crs-fractions|ecosystems|…`, subjects, curriculum objectives, events, clubs, feed, doubts, notifications, live classes, learning profiles, fees). **Reuse these IDs so records stay consistent across roles.** Demo "now" is Thu 19 Nov 2026 10:30 IST (`DEMO_NOW`, `inDays()`, `ago()` in `@/lib/format`).
- Services (`@/lib/api`): courseService (incl. paid-course purchase/entitlements, progress), assignmentService, doubtService, notificationService, feedService (moderation), eventService (+clubs), feeService (institutional fees, simulated payments), liveClassService, learningProfileService (streak/mastery/remedial), timetableService, marksheetService. Services hold module-level mutable state, simulate latency via `simulate()`, return clones. **Services are the only place that touches mock data; components call them through TanStack Query (`useQuery`/`useMutation`) and invalidate related query keys after mutations so other screens update.**
- Formatting: `@/lib/format` (fmtDate/fmtTime/fmtMoney/fmtCompact/relTime…); analytics placeholder `track()` in `@/lib/analytics`.

## Rules for every screen
1. Design tokens only (Tailwind classes like `bg-surface text-text-2 border-border text-primary`); no hard-coded colours except gradient cover pairs/data; light + dark must both work.
2. Phosphor icons only — **no emoji as UI icons** (emoji allowed inside user-authored content). No Lorem Ipsum; real, specific copy. Tabular numerals (`tnum`) for metrics.
3. Every screen handles loading (skeleton matching layout), empty (explains why + next action), error (`ErrorState` with retry), success (toast/inline) and confirmation for destructive actions. Every visible control must work (no inert buttons/filters). Lists: search, filters, sort, count, clear.
4. Forms: React Hook Form + Zod, inline errors, preserve values, disable duplicate submit.
5. Responsive: mobile-first, 44px touch targets, no horizontal page overflow, bottom sheets (`Modal`) on phones. Student screens expressive and playful but not childish; other roles focused/dense.
6. A11y: semantic HTML, labels, visible focus, `aria-live` for status, charts have text alternatives, never colour alone. Respect reduced motion (Framer `MotionConfig` is global).
7. AI honesty: AI output is labelled (`AIBadge`), never claims a real model ran, always has human approval for consequential grading/publishing/launching. BYOK only — no Zoho-owned AI provider, keys are masked demo values.
8. Keep components small; feature code in `src/features/<area>/…` (screens in `screens/`, parts in `components/`), services in `src/lib/api/<x>Service.ts`, seed data in `src/lib/mock-data/<x>.ts`.
9. Staff chat ≠ student doubts ≠ parent–teacher messaging: separate types, services and entry points.
10. Cross-role effects: teacher actions must change what student/parent see (and vice versa) through shared services.

## Verification
`npx tsc --noEmit` (fix errors in YOUR files; ignore transient errors in other agents' in-progress files). Do **not** run `next build` or start a dev server (shared `.next` dir, multiple agents work concurrently). The integrator runs the full build/QA.
