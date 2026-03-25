---
phase: 04-e2e-discord-dev
plan: 02
subsystem: testing
tags: [vitest, discord.js, e2e, msw, discord-bots, github-actions]

# Dependency graph
requires:
  - phase: 04-e2e-discord-dev-01
    provides: clients.ts, setup.e2e.ts, waitForMessage, seedTestStudent, cleanupTestStudent, mswServer, globalSetup.e2e.ts

provides:
  - DM student flow E2E test (5 scenarios: text reply, mock content, multi-turn, URL, short message)
  - Exercise submission E2E test (4 scenarios: PDF upload, PNG image, URL extraction, text-only)
  - FAQ flow E2E test (5 scenarios: positive path, channel resolution, non-faq isolation, short message guard, D-04 mirror)
  - faq.ts test-mode bot-check bypass (NODE_ENV=test guard, single line)
  - Real CI e2e-tests job replacing placeholder (workflow_dispatch only, Supabase + secrets)

affects: [phase-04-e2e-discord-dev, future-discord-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Register waitForMessage listener BEFORE send to avoid reply-arrives-before-listener race
    - mswServer.use() in beforeEach after resetHandlers() to restore default mock per test
    - _clearStateForTesting() in beforeEach to prevent conversation state leak across tests
    - pdfHeader/pngBuffer as in-memory fixtures (no disk files) for attachment upload tests

key-files:
  created:
    - test/e2e/dm-student-flow.e2e.test.ts
    - test/e2e/exercise-submission.e2e.test.ts
    - test/e2e/faq-flow.e2e.test.ts
  modified:
    - packages/bot-discord/src/handlers/faq.ts
    - .github/workflows/test.yml

key-decisions:
  - "faq.ts bot-check bypass uses NODE_ENV=test only — production behavior unchanged, unit tests unaffected"
  - "In-memory Buffer fixtures for PDF/PNG attachments avoid disk I/O and make tests self-contained"
  - "FAQ test uses Object.values(CHANNELS) for D-04 mirror — enumerated over all 6 channels dynamically"
  - "Non-faq isolation test uses try/catch around waitForMessage with 3s timeout to assert no reply"

patterns-established:
  - "Pattern 1: Register waitForMessage BEFORE send in all E2E tests (pitfall 7 mitigation)"
  - "Pattern 2: beforeEach = _clearStateForTesting() + mswServer.resetHandlers() + mswServer.use(default mock)"
  - "Pattern 3: seedTestStudent in beforeAll, cleanupTestStudent in afterAll — per-suite DB lifecycle"
  - "Pattern 4: CI e2e job writes .env.test from GitHub secrets via heredoc, runs only on workflow_dispatch"

requirements-completed: [E2E-03, E2E-04, E2E-05]

# Metrics
duration: 20min
completed: 2026-03-25
---

# Phase 04 Plan 02: E2E Test Scenarios Summary

**Three Discord E2E test suites (DM flow, exercise submission, FAQ flow) with MSW mock + real bot wiring, plus faq.ts test-mode bypass and real CI e2e job replacing placeholder**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-25T11:30:00Z
- **Completed:** 2026-03-25T11:50:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Wrote 14 total E2E test cases across 3 test files covering the critical Discord bot flows
- Added safe test-mode bypass to faq.ts bot-check guard (NODE_ENV=test, single line) — 135 existing unit tests still pass
- Replaced CI placeholder with real e2e job: Supabase local, .env.test from secrets, pnpm test:e2e, workflow_dispatch only

## Task Commits

Each task was committed atomically:

1. **Task 1: DM student flow and exercise submission E2E tests** - `a16ee3f` (feat)
2. **Task 2: FAQ E2E tests, faq.ts test-mode bypass, real CI e2e job** - `862b54f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `test/e2e/dm-student-flow.e2e.test.ts` — 5 DM flow scenarios (text, mock content, multi-turn, URL, short message)
- `test/e2e/exercise-submission.e2e.test.ts` — 4 exercise submission scenarios (PDF, PNG, URL, text-only)
- `test/e2e/faq-flow.e2e.test.ts` — 5 FAQ flow scenarios (positive path, channel resolution, non-faq isolation, short message guard, D-04 mirror)
- `packages/bot-discord/src/handlers/faq.ts` — Single line change: bot-check guard bypassed when NODE_ENV=test
- `.github/workflows/test.yml` — Replaced placeholder e2e job with real Supabase+secrets+pnpm test:e2e job

## Decisions Made

- faq.ts bot-check bypass uses `process.env['NODE_ENV'] !== 'test'` guard — does not affect unit tests (they mock messageCreate directly) and never triggers in production
- In-memory Buffer fixtures (pdfHeader, pngBuffer) for attachment tests avoid disk I/O and make test files self-contained
- FAQ channel mirror test uses `Object.values(CHANNELS)` dynamically — automatically validates all 6 channels without hardcoding
- Non-faq isolation and short message guard tests use 3-second timeout with try/catch to assert absence of bot reply

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Discord dev bot tokens, guild ID, and test-user bot token must already be configured as GitHub repository secrets for the CI e2e job to run.

## Next Phase Readiness

- E2E test layer complete: all 3 flows (DM, exercise submission, FAQ) have thorough test coverage
- Phase 04 is now fully complete — all plans (04-01, 04-02) executed
- E2E tests are manual-only (workflow_dispatch) and require real Discord dev bot tokens to run

---
*Phase: 04-e2e-discord-dev*
*Completed: 2026-03-25*
