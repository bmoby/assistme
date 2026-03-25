---
phase: 03-integration-ci
plan: 01
subsystem: testing
tags: [vitest, msw, supabase, integration-tests, test-infrastructure]

# Dependency graph
requires:
  - phase: 02-mocks-unit-tests
    provides: Vitest config with unit projects (core, bot-discord), ESM-compatible test setup
provides:
  - Vitest integration projects (core-integration, bot-discord-integration) with Supabase lifecycle
  - MSW v2 server with reusable Anthropic and Supabase handler factories
  - Test data isolation utilities (createTestClient, createTestRunId, cleanupTestData)
  - test/globalSetup.ts that manages supabase start + db reset lifecycle
affects:
  - 03-02-PLAN.md
  - 03-03-PLAN.md
  - 03-04-PLAN.md

# Tech tracking
tech-stack:
  added: [msw v2 (already in devDeps), supabase-js in test helpers]
  patterns: [globalSetup for external service lifecycle, test data prefixing for isolation, MSW handler factories for reusable HTTP mocks]

key-files:
  created:
    - test/globalSetup.ts
    - test/msw-server.ts
    - test/integration-helpers.ts
  modified:
    - vitest.config.ts
    - package.json

key-decisions:
  - "Integration projects use 127.0.0.1:54321 (not localhost) - consistent with Supabase CLI local default"
  - "Real Supabase local service role key committed to vitest.config.ts - safe for localhost-only key"
  - "globalSetup teardown is a no-op (keep Supabase running for dev speed, stop manually)"
  - "test:integration script no longer needs || exit 0 - integration projects now defined in config"
  - "test:coverage targets only unit projects (core + bot-discord) to exclude integration test files"

patterns-established:
  - "Test isolation: createTestRunId() prefix + cleanupTestData() in afterAll() prevents data leakage"
  - "MSW handler factories: handlers.anthropicSuccess(text), handlers.anthropicToolUse(name, input) for reuse"
  - "Integration Supabase client: createClient with persistSession:false to prevent auth state bleed"

requirements-completed: [INTG-01, INTG-05, MOCK-03]

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 3 Plan 1: Integration Test Infrastructure Summary

**Vitest integration projects with Supabase local lifecycle (globalSetup), MSW v2 handler factories, and test data isolation helpers — enabling *.integration.test.ts files across core and bot-discord packages**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-25T02:34:39Z
- **Completed:** 2026-03-25T02:36:15Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created test/globalSetup.ts: supabase start (idempotent, catches already-running error) + supabase db reset before integration runs
- Created test/msw-server.ts: MSW v2 setupServer with anthropicSuccess, anthropicToolUse, and supabaseSelect handler factories
- Created test/integration-helpers.ts: createTestClient (persistSession:false), createTestRunId, cleanupTestData for data isolation
- Added core-integration and bot-discord-integration Vitest projects (testTimeout:30s, hookTimeout:120s, real Supabase key)
- Removed || exit 0 workaround from test:integration; updated test:coverage to target unit projects only

## Task Commits

1. **Task 1: Create test/ directory with globalSetup, MSW server, and integration helpers** - `3894f79` (feat)
2. **Task 2: Add Vitest integration projects and coverage thresholds to vitest.config.ts** - `d33cbf4` (feat)

## Files Created/Modified

- `test/globalSetup.ts` - Supabase lifecycle: start (idempotent) + db reset + silent teardown
- `test/msw-server.ts` - MSW v2 Node.js server with anthropicSuccess, anthropicToolUse, supabaseSelect handler factories
- `test/integration-helpers.ts` - createTestClient (bypass RLS, no session bleed), createTestRunId, cleanupTestData
- `vitest.config.ts` - Added core-integration + bot-discord-integration projects; expanded coverage.exclude
- `package.json` - Fixed test:integration (no || exit 0), fixed test:coverage (unit projects only)

## Decisions Made

- Real Supabase local service role key committed directly to vitest.config.ts — this key only works against localhost:54321 and is the standard Supabase CLI demo key, safe to version control.
- globalSetup teardown is intentionally a no-op to keep the Supabase container warm between runs (dev speed optimization). Developers stop with `supabase stop` manually.
- Both integration projects use pool: forks (same as unit projects) for ESM native module stability — consistent with Phase 1 decision.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The integration projects use the standard Supabase local Docker service role key that is included directly in the config.

## Next Phase Readiness

- Integration test infrastructure complete. Plans 02, 03, 04 of phase 03 can now write *.integration.test.ts files targeting core-integration and bot-discord-integration projects.
- Supabase local Docker must be running before `pnpm test:integration` executes (globalSetup handles start, but Docker itself must be available).
- MSW v2 handlers are available for import from test/msw-server.ts in any integration test.

---
*Phase: 03-integration-ci*
*Completed: 2026-03-25*
