---
phase: 04-e2e-discord-dev
plan: 01
subsystem: testing
tags: [vitest, discord.js, e2e, msw, supabase, dotenv]

# Dependency graph
requires:
  - phase: 03-integration-ci
    provides: test/globalSetup.ts (Supabase lifecycle), test/integration-helpers.ts (createTestClient, createTestRunId, cleanupTestData), test/msw-server.ts (mswServer, handlers)
provides:
  - Vitest e2e project (singleFork, 30s testTimeout, 60s hookTimeout) in vitest.config.ts
  - test/e2e/globalSetup.e2e.ts delegating Supabase lifecycle to existing globalSetup.ts
  - test/e2e/setup.e2e.ts setupFile connecting two Discord bots + MSW + handler wiring
  - test/e2e/clients.ts shared mutable devBot/testUserBot references with setters
  - test/e2e/helpers/env.ts loading and validating .env.test for all E2E tests
  - test/e2e/helpers/wait-for-message.ts event-driven message wait utility
  - test/e2e/helpers/seed-e2e.ts student seeding/cleanup backed by integration-helpers
  - .env.test.example template documenting all required E2E env vars
  - pnpm test:e2e script (vitest run --project e2e)
affects: [04-02-e2e-scenarios]

# Tech tracking
tech-stack:
  added: [dotenv (in e2e helpers), discord.js Client lifecycle in test context]
  patterns: [singleFork Vitest project for shared Discord bot state, setupFile over globalSetup for in-worker bot lifecycle, mutable module-level bot references populated by setupFile]

key-files:
  created:
    - test/e2e/helpers/env.ts
    - test/e2e/helpers/wait-for-message.ts
    - test/e2e/helpers/seed-e2e.ts
    - test/e2e/clients.ts
    - test/e2e/globalSetup.e2e.ts
    - test/e2e/setup.e2e.ts
    - .env.test.example
  modified:
    - vitest.config.ts
    - package.json
    - .gitignore

key-decisions:
  - "setupFile (setup.e2e.ts) handles Discord bot lifecycle, not globalSetup — globalSetup runs in main thread separate from fork context, bots must live in the test worker"
  - "singleFork: true ensures both bots are shared across all e2e test files without reconnecting per-file"
  - "clients.ts mutable let exports populated by setDevBot/setTestUserBot in setupFile — avoids circular imports while giving test files importable references"
  - "DO NOT call main() or registerSlashCommands — avoids REST API call to Discord that requires valid token during test setup"
  - "MSW mocks Claude API by default unless E2E_LIVE=true — keeps E2E tests hermetic for AI responses"
  - "loadE2eEnv() maps DISCORD_DEV_BOT_TOKEN to DISCORD_BOT_TOKEN so existing handlers reading process.env work without modification"

patterns-established:
  - "E2E test files match *.e2e.test.ts glob — excluded from unit and integration projects already"
  - "waitForMessage registers listener BEFORE message send — prevents race condition where reply arrives before listener"
  - "seedTestStudent/cleanupTestStudent wraps integration-helpers with E2E-specific student schema"

requirements-completed: [E2E-01, E2E-02]

# Metrics
duration: 3min
completed: 2026-03-25
---

# Phase 4 Plan 1: E2E Test Infrastructure Summary

**Vitest e2e project with two-bot Discord lifecycle (globalSetup + singleFork setupFile), waitForMessage helper, student seeding, env validation, and MSW-backed Claude mocking**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-25T04:30:53Z
- **Completed:** 2026-03-25T04:34:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- E2E Vitest project with singleFork, 30s test timeout, 60s hook timeout — all e2e test files isolated from unit/integration runs
- Two-bot Discord lifecycle in setupFile: devBot (with DM/FAQ/admin handlers wired) + testUserBot (simulates students), both connected before any test runs
- Helper utilities: waitForMessage (race-condition-safe), seedTestStudent/cleanupTestStudent (Supabase-backed), loadE2eEnv (validates required vars from .env.test)
- .env.test.example template documents all 8 required env vars; .env.test gitignored

## Task Commits

Each task was committed atomically:

1. **Task 1: E2E helper utilities and env template** - `6d96277` (feat)
2. **Task 2: Vitest E2E project, globalSetup, setupFile, clients module, test:e2e script** - `8894297` (feat)

## Files Created/Modified

- `test/e2e/helpers/env.ts` - loadE2eEnv() validates DISCORD_DEV_BOT_TOKEN, DISCORD_DEV_CLIENT_ID, DISCORD_TEST_USER_BOT_TOKEN, DISCORD_TEST_GUILD_ID, SUPABASE vars; maps dev bot vars to standard names
- `test/e2e/helpers/wait-for-message.ts` - waitForMessage() registers listener before caller sends message, clears on resolve and timeout
- `test/e2e/helpers/seed-e2e.ts` - seedTestStudent(discordUserId) inserts student row; cleanupTestStudent(runId) deletes by name prefix
- `test/e2e/clients.ts` - mutable devBot/testUserBot references with setDevBot/setTestUserBot setters
- `test/e2e/globalSetup.e2e.ts` - delegates Supabase start+reset to test/globalSetup.ts; teardown is no-op
- `test/e2e/setup.e2e.ts` - beforeAll: loadE2eEnv, MSW start, devBot login + handler wiring, testUserBot login, student-role verification; afterAll: MSW close + bot destroy
- `.env.test.example` - template with all 8 required E2E env vars documented
- `vitest.config.ts` - added e2e project (5th project) with singleFork, globalSetup, setupFiles, testTimeout, hookTimeout
- `package.json` - added test:e2e script
- `.gitignore` - added .env.test

## Decisions Made

- setupFile handles bot lifecycle (not globalSetup): Vitest globalSetup runs in the main thread — bots must live in the same fork as test files to share the Client instance.
- singleFork: true: ensures all e2e test files share one fork process, meaning bots connect once and stay connected for all tests.
- clients.ts mutable exports: avoids circular imports while giving test files a stable import path for bot references that are populated at beforeAll time.
- No main() or registerSlashCommands call: avoids outbound REST API call during test setup that would require valid bot token even before Discord connection is established.
- MSW default mock for Claude API: E2E tests are hermetic by default; set E2E_LIVE=true to hit real APIs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External Discord services require manual configuration before running E2E tests.** See `.env.test.example` for the full variable list. Required steps:

- Create two Discord bot applications (dev bot + test-user bot) in Discord Developer Portal
- Enable Privileged Gateway Intents (Message Content, Server Members) on dev bot
- Create a dedicated test Discord server
- Invite both bots to the test server
- Assign @student role to test-user bot in the test server
- Create channels mirroring production (faq, объявления, сессии, чат, админ, победы)
- Copy .env.test.example to .env.test and fill in all values

## Next Phase Readiness

- E2E infrastructure complete — Plan 02 can write *.e2e.test.ts scenarios importing from test/e2e/clients.ts, test/e2e/helpers/
- No blockers: all 8 verification checks pass, 135 unit tests unaffected

---
*Phase: 04-e2e-discord-dev*
*Completed: 2026-03-25*
