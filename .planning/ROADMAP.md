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

### 🚧 v2.0 Exercise Submission Flow (In Progress)

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
**Plans**: TBD

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
**Plans**: TBD
**UI hint**: yes

### Phase 7: Admin Review UX + Test Coverage
**Goal**: Admins review re-submissions in the same thread without duplicates, and the full submission state machine is covered by integration and E2E tests
**Depends on**: Phase 6
**Requirements**: ADM-01, ADM-02, ADM-03, TST-01
**Success Criteria** (what must be TRUE):
  1. A re-submitted exercise opens the original review thread (unarchived) instead of creating a new thread
  2. Double-clicking "Ouvrir review" creates exactly one thread — the second click is a no-op
  3. The AI review message in the thread updates in place when the review is complete — the "en cours..." placeholder is replaced, not appended
  4. `pnpm test:unit` and `pnpm test:integration` pass covering the full state machine: accumulate → preview → confirm → submitted → review → revision → re-submit → thread reuse
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 1/1 | Complete | 2026-03-24 |
| 2. Mocks + Unit Tests | v1.0 | 5/5 | Complete | 2026-03-25 |
| 3. Integration + CI | v1.0 | 4/4 | Complete | 2026-03-25 |
| 4. E2E Discord Dev | v1.0 | 2/2 | Complete | 2026-03-25 |
| 5. DB Foundation + Core Hardening | v2.0 | 0/? | Not started | - |
| 6. Submission Handler Correctness + Student UX | v2.0 | 0/? | Not started | - |
| 7. Admin Review UX + Test Coverage | v2.0 | 0/? | Not started | - |
