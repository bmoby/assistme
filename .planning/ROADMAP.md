# Roadmap: Dev Environment & Automated Tests — Bot Discord

## Milestones

- ✅ **v1.0 Test Infrastructure** - Phases 1-4 (shipped 2026-03-25)
- 🚧 **v2.0 Exercise Submission Flow** - Phases 5-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 Test Infrastructure (Phases 1-4) - SHIPPED 2026-03-25</summary>

### Phase 1: Foundation
**Goal**: The test infrastructure runs without errors — any test file can be executed without import-time crashes, env var explosions, or module resolution failures
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05
**Success Criteria** (what must be TRUE):
  1. `pnpm test:unit` runs an empty suite and exits 0 with no error output
  2. `pnpm test`, `pnpm test:unit`, `pnpm test:integration` are all defined and executable in package.json
  3. `pnpm test:watch` starts in watch mode and responds to file changes
  4. `@assistme/core` imported in a test file resolves to source TypeScript (not stale `dist/`)
  5. A test file that imports any handler does not throw at import time even when `SUPABASE_URL` and `DISCORD_TOKEN` are absent
**Plans:** 1/1 plans complete

Plans:
- [x] 01-01-PLAN.md — Install Vitest, create root config with projects API, add test scripts, create smoke tests

### Phase 2: Mocks + Unit Tests
**Goal**: Every Discord handler and AI agent can be tested in isolation — no real DB, no real Discord, no real Claude API required to run the full unit suite
**Depends on**: Phase 1
**Requirements**: MOCK-01, MOCK-02, MOCK-04, UNIT-01, UNIT-02, UNIT-03, UNIT-04, UNIT-05, UNIT-06, UNIT-07
**Note**: MOCK-03 (MSW v2 handlers) deferred to Phase 3 per decision D-04 (vi.mock() only in Phase 2).
**Success Criteria** (what must be TRUE):
  1. `pnpm test:unit` runs all handler tests in under 5 seconds with zero external service calls
  2. A test can construct a fake Discord Message, Interaction, and GuildMember using factory functions without touching discord.js constructors
  3. A test can drive the DM Agent through a multi-turn tool-use sequence with a deterministic fixture response — same input always produces same output
  4. All four handlers (dm-handler, admin-handler, FAQ, review-buttons) and slash commands have at least one passing test covering their primary routing logic
  5. Module-level Discord client singleton does not bleed state between test files
**Plans:** 5/5 plans complete

Plans:
- [x] 02-01-PLAN.md — Discord.js builders, Anthropic SDK mock helper, handler state isolation exports
- [x] 02-05-PLAN.md — Claude API JSON fixtures and domain fixture factories
- [x] 02-02-PLAN.md — Unit tests for FAQ handler and all 9 slash commands
- [x] 02-03-PLAN.md — Unit tests for DM handler, admin handler, and review-buttons
- [x] 02-04-PLAN.md — Unit tests for DM Agent, FAQ Agent, and Tsarag Agent tool routing logic

### Phase 3: Integration + CI
**Goal**: DB correctness is validated against a real local Postgres+pgvector instance, and every push automatically runs the unit suite while every PR runs the integration suite
**Depends on**: Phase 2
**Requirements**: MOCK-03, INTG-01, INTG-02, INTG-03, INTG-04, INTG-05, CI-01, CI-02, CI-03, CI-04
**Success Criteria** (what must be TRUE):
  1. `pnpm test:integration` starts a local Supabase instance, runs all migrations, executes DB tests, and tears down cleanly
  2. `search_formation_knowledge()` RPC and pgvector hybrid search return correct results verified by an integration test
  3. An agent integration test queries real Supabase data while Claude API is mocked — DB path is exercised end-to-end
  4. A GitHub Actions run on push executes unit tests without Docker and without any secret env vars
  5. A GitHub Actions run on PR executes integration tests in a separate job with Supabase local Docker
  6. Coverage thresholds are enforced on handlers and agents packages (failing if below threshold)
**Plans:** 4/4 plans complete

Plans:
- [x] 03-01-PLAN.md — Integration test infrastructure: Vitest projects, globalSetup, MSW server, test isolation helpers
- [x] 03-04-PLAN.md — GitHub Actions CI pipeline: unit on push, integration on PR, E2E placeholder
- [x] 03-02-PLAN.md — DB layer integration tests: students CRUD and knowledge search (BM25 + pgvector)
- [x] 03-03-PLAN.md — Agent integration test (DM Agent + real DB) and coverage thresholds

### Phase 4: E2E Discord Dev
**Goal**: Critical bot flows can be smoke-tested against a real Discord server using a dedicated dev bot — without touching production channels or production data
**Depends on**: Phase 3
**Requirements**: E2E-01, E2E-02, E2E-03, E2E-04, E2E-05
**Success Criteria** (what must be TRUE):
  1. `pnpm test:e2e` connects a real dev bot (separate token) to a dedicated test Discord server and runs scenarios end-to-end
  2. The E2E suite never runs in default CI and is not triggered by push or PR — only by manual `workflow_dispatch`
  3. A full DM student flow (user sends message, bot invokes DM Agent, user receives formatted response) passes as an E2E test
  4. An exercise submission flow (file upload to channel, review bot processes it, feedback posted) passes as an E2E test
  5. The test Discord server channels mirror the production server structure so E2E tests reflect real usage conditions
**Plans:** 2/2 plans complete

Plans:
- [x] 04-01-PLAN.md — E2E infrastructure: Vitest e2e project, two-bot lifecycle, helper utilities, env template
- [x] 04-02-PLAN.md — E2E scenarios: DM student flow, exercise submission, FAQ flow, CI workflow update

</details>

### v2.0 Exercise Submission Flow (In Progress)

**Milestone Goal:** Solidifier le flow complet de soumission d'exercices — unicite par session garantie en DB, guards d'etat dans les handlers, apercu-confirmation fiable, et UX formateur sans doublons de threads.

## Phase Details

### Phase 5: DB Foundation + Core Hardening
**Goal**: The schema and DB functions are correct — duplicate submissions are impossible at the database level and session_id is written atomically in a single INSERT
**Depends on**: Phase 4
**Requirements**: SUB-01, SUB-03
**Success Criteria** (what must be TRUE):
  1. Inserting two exercises for the same student and session returns a Postgres `23505` unique violation, not a silent duplicate row
  2. A submitted exercise record always contains `session_id` immediately after insertion — no window where it is NULL
  3. `getExerciseByStudentAndSession()` returns the exercise or null using a single targeted query, not a linear scan
  4. `pnpm typecheck` passes clean with `review_thread_id` and `review_thread_ai_message_id` as `string | null` on `StudentExercise`
**Plans:** 2 plans

Plans:
- [x] 05-01-PLAN.md — Migration 017 + types + exercises.ts functions + dm-agent.ts caller update
- [x] 05-02-PLAN.md — Integration tests for exercise DB layer (23505, atomic session_id, lookups)

### Phase 6: Submission Handler Correctness + Student UX
**Goal**: Students can submit exercises with confidence — empty submissions are blocked, sessions are validated, re-submission works cleanly, and the preview-then-confirm flow is reliable
**Depends on**: Phase 5
**Requirements**: SUB-02, SUB-04, UX-01, UX-02, UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. Sending a submit command with no attached content receives an immediate rejection message — no DB write occurs
  2. Specifying a session number that does not exist in the DB produces an error message before any exercise record is created
  3. Student sees a summary embed (text, files, links) with "Soumettre" and "Annuler" buttons before the submission is committed
  4. Typing "annuler" or clicking Cancel at any point clears all accumulated content and confirms cancellation to the student
  5. After receiving feedback, a student can re-submit and the new submission replaces the old one via the same flow
  6. An error during submission clears `pendingAttachments` so the next submission attempt starts from a clean state
**Plans:** 1/2 plans executed

Plans:
- [x] 06-01-PLAN.md — DM agent submission intent return + handler preview-confirm flow with buttons
- [x] 06-02-PLAN.md — Unit tests for all Phase 6 submission handler behaviors

### Phase 7: Admin Review UX + Test Coverage
**Goal**: Admins review re-submissions in the same thread without duplicates, and the full submission state machine is covered by integration and E2E tests
**Depends on**: Phase 6
**Requirements**: ADM-01, ADM-02, ADM-03, TST-01
**Success Criteria** (what must be TRUE):
  1. A re-submitted exercise opens the original review thread (unarchived) instead of creating a new thread
  2. Double-clicking "Ouvrir review" creates exactly one thread — the second click is a no-op
  3. The AI review message in the thread updates in place when the review is complete — the "en cours..." placeholder is replaced, not appended
  4. `pnpm test:unit` and `pnpm test:integration` pass covering the full state machine: accumulate → preview → confirm → submitted → review → revision → re-submit → thread reuse
**Plans**: 2/2 complete

Plans:
- [x] 07-01-PLAN.md — Thread reuse, AI message in-place edit, resubmitExercise fix
- [x] 07-02-PLAN.md — Test coverage for admin review UX (review-buttons, dm-handler, thread ID persistence)

### Phase 8: Infrastructure (Quiz System Data Foundation)
**Goal**: The four quiz tables exist in Supabase with correct columns, constraints, and indexes. Quiz types and DB CRUD functions are exported from @assistme/core. closeExpiredQuizSessions implements 48h automatic expiration.
**Depends on**: Phase 7
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07
**Success Criteria** (what must be TRUE):
  1. Migration 018 creates quizzes, quiz_questions, student_quiz_sessions, student_quiz_answers tables with CHECK constraints and FK references
  2. Quiz, QuizQuestion, StudentQuizSession, StudentQuizAnswer types exported from @assistme/core
  3. CRUD functions available for all 4 tables via @assistme/core
  4. closeExpiredQuizSessions() closes active quizzes older than 48h and sets in-progress sessions to expired_incomplete with partial score
**Plans:** 1/2 complete

Plans:
- [x] 08-01-PLAN.md — Migration 018 + quiz types + core DB CRUD module
- [x] 08-02-PLAN.md — bot-discord-quiz package scaffold (Tasks 1-2 done; Task 3 awaiting Discord bot creation)

### Phase 9: Quiz Creation
**Goal**: Admin can upload a TXT file via `/quiz-create`, see a structured preview of all parsed questions, confirm it, and have the quiz dispatched immediately to all active students in DM — the complete admin creation loop in one command.
**Depends on**: Phase 8
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06
**Success Criteria** (what must be TRUE):
  1. Admin runs `/quiz-create {session_number}` with a TXT attachment and receives a preview embed showing all questions with their type (QCM/V-F/Ouverte), choices, and correct answers — before any student is contacted
  2. After clicking Confirm, every active student receives a DM from the quiz bot with the quiz title, session reference, and a "Начать" button within 30 seconds
  3. The parsed quiz and all its questions are stored correctly in `quizzes` and `quiz_questions` with the original TXT file preserved in storage
  4. Admin can run `/quiz-status {session_number}` and see which students have completed, started, or not begun — with scores for completions
  5. Admin can run `/quiz-close {session_number}` and the quiz is marked closed; all in-progress student sessions become `expired_incomplete`
**Plans**: TBD
**UI hint**: yes

### Phase 10: Student Quiz Experience
**Goal**: A student can take a quiz end-to-end in DM — QCM via buttons, Vrai/Faux via buttons, open questions via text — pause and resume freely — and receive a complete question-by-question feedback with their total score, entirely in Russian.
**Depends on**: Phase 9
**Requirements**: QUIZ-01, QUIZ-02, QUIZ-03, QUIZ-04, QUIZ-05, QUIZ-06, QUIZ-07, QUIZ-08, EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05, EVAL-06
**Success Criteria** (what must be TRUE):
  1. Student clicks "Начать" and receives questions one by one in order — QCM shows A/B/C/D buttons, Vrai/Faux shows "Правда"/"Ложь" buttons, open questions prompt text input in the DM
  2. Student closes the DM mid-quiz and returns hours later; the bot resumes from the exact question where they stopped with no data loss
  3. When a new quiz arrives while an existing one is in progress, the old session closes automatically with status `expired_incomplete` and a partial score based on answers submitted so far
  4. At quiz completion, the student receives a question-by-question feedback (correct/incorrect + explanation from the TXT) followed by a total score in percentage — all text in Russian
  5. One-shot enforcement holds: a completed quiz cannot be retaken; the "Начать" button on a closed or completed quiz produces a graceful Russian-language message
**Plans**: 3 plans

Plans:
- [x] 10-01-PLAN.md — Core DB getQuestionsByQuiz + pure utility functions (quiz-messages, quiz-eval, quiz-flow)
- [ ] 10-02-PLAN.md — Handler infrastructure + button handlers + DM text handler + entry point wiring
- [ ] 10-03-PLAN.md — Unit tests for all handlers and utilities (30+ tests covering QUIZ-01..08 + EVAL-01..06)
**UI hint**: yes

### Phase 11: Admin Notifications & Digest
**Goal**: Admin is proactively informed of low scorers and overall quiz participation through automatic alerts and a structured digest — no need to manually poll `/quiz-status`.
**Depends on**: Phase 10
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03
**Success Criteria** (what must be TRUE):
  1. When a student completes a quiz with a score below 60%, an alert embed is automatically posted in the admin quiz channel within seconds of completion
  2. A digest is posted in the dedicated channel listing: students who completed (with scores), students who have not started, students currently in progress, and students with expired/incomplete sessions
  3. Expired-incomplete sessions are visually flagged in the digest as dropout signals, distinct from "not started" entries
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 1/1 | Complete | 2026-03-24 |
| 2. Mocks + Unit Tests | v1.0 | 5/5 | Complete | 2026-03-25 |
| 3. Integration + CI | v1.0 | 4/4 | Complete | 2026-03-25 |
| 4. E2E Discord Dev | v1.0 | 2/2 | Complete | 2026-03-25 |
| 5. DB Foundation + Core Hardening | v2.0 | 2/2 | Complete | 2026-03-25 |
| 6. Submission Handler Correctness + Student UX | v2.0 | 2/2 | Complete | 2026-03-25 |
| 7. Admin Review UX + Test Coverage | v2.0 | 2/2 | Complete | 2026-03-25 |
| 8. Infrastructure (Quiz System) | v3.0 | 2/2 | Checkpoint (human-action) | - |
| 9. Quiz Creation | v3.0 | 0/TBD | Not started | - |
| 10. Student Quiz Experience | v3.0 | 1/3 | In Progress|  |
| 11. Admin Notifications & Digest | v3.0 | 0/TBD | Not started | - |
