---
phase: 08-infrastructure
plan: 02
subsystem: bot-discord-quiz
tags: [discord, quiz-bot, scaffold, cron, vitest, typescript]
dependency_graph:
  requires: [08-01]
  provides: [packages/bot-discord-quiz, bot-discord-quiz vitest project]
  affects: [vitest.config.ts, package.json, .env.example]
tech_stack:
  added: [packages/bot-discord-quiz]
  patterns: [bot entry point pattern, cron registration pattern, workspace package pattern]
key_files:
  created:
    - packages/bot-discord-quiz/package.json
    - packages/bot-discord-quiz/tsconfig.json
    - packages/bot-discord-quiz/src/index.ts
    - packages/bot-discord-quiz/src/config.ts
    - packages/bot-discord-quiz/src/handlers/index.ts
    - packages/bot-discord-quiz/src/commands/index.ts
    - packages/bot-discord-quiz/src/cron/index.ts
    - packages/bot-discord-quiz/src/cron/close-expired-quizzes.ts
    - packages/bot-discord-quiz/src/smoke.test.ts
  modified:
    - vitest.config.ts
    - package.json
    - .env.example
decisions:
  - "DISCORD_QUIZ_BOT_TOKEN and DISCORD_QUIZ_CLIENT_ID are separate from existing DISCORD_BOT_TOKEN/DISCORD_CLIENT_ID — TeacherBot is a fully independent application"
  - "bot-discord-quiz has zero runtime dependency on @assistme/bot-discord — clean isolation"
  - "Only GatewayIntentBits.Guilds and DirectMessages intents — minimal footprint for Phase 8 scaffold"
  - "quiz-close-expired cron runs every 30min — balances responsiveness with DB load for 48h expiry threshold"
metrics:
  duration: 4min
  completed_date: "2026-03-27T10:51:13Z"
  tasks_completed: 2
  tasks_total: 3
  files_created: 9
  files_modified: 3
---

# Phase 08 Plan 02: Bot Discord Quiz Package Scaffold Summary

## One-liner

New isolated `@assistme/bot-discord-quiz` package: TeacherBot entry point with DISCORD_QUIZ_BOT_TOKEN, quiz expiration cron wired to core, Vitest project registered with passing smoke tests.

## What Was Built

Created the complete scaffold for the `packages/bot-discord-quiz` workspace package — the foundation that Phase 9-11 features (quiz creation, student experience, leaderboard) will be built into.

### Package Structure

```
packages/bot-discord-quiz/
  package.json          — @assistme/bot-discord-quiz, type: module, deps: core + discord.js + dotenv
  tsconfig.json         — extends ../../tsconfig.json
  src/
    index.ts            — main() entry: env validation, Client, ready event, registerCronJobs
    config.ts           — CHANNELS.quizAdmin = 'quiz-admin', ROLES.admin/student
    handlers/index.ts   — placeholder (Phase 10)
    commands/index.ts   — placeholder (Phase 9)
    cron/
      index.ts          — registerCronJobs: quiz-close-expired every 30min
      close-expired-quizzes.ts — calls closeExpiredQuizSessions from @assistme/core
    smoke.test.ts       — 5 tests: config exports + env vars
```

### Key Implementation Choices

- **Entry point** clones `packages/bot-discord/src/index.ts` pattern but uses `DISCORD_QUIZ_BOT_TOKEN` and `DISCORD_QUIZ_CLIENT_ID` (not the Formateur bot's vars)
- **Intents**: Only `Guilds` + `DirectMessages` (no `GuildMessages`, `MessageContent`, `GuildMembers`) — minimal footprint for Phase 8
- **Cron**: `quiz-close-expired` every 30min calls `closeExpiredQuizSessions()` from core (D-01: 48h expiration)
- **Zero coupling**: No imports from `@assistme/bot-discord` anywhere in the package
- **Vitest project**: `bot-discord-quiz` added between `bot-discord` and `core-integration` entries

### Test Coverage

- 148 tests pass across 21 test files (core + bot-discord + bot-discord-quiz)
- Smoke tests verify: CHANNELS.quizAdmin, ROLES.admin/student, 3 env vars injected by Vitest

## Tasks Completed

### Task 1: bot-discord-quiz package (commit 973bb68)

Created all source files: `package.json`, `tsconfig.json`, `src/index.ts`, `src/config.ts`, `src/cron/index.ts`, `src/cron/close-expired-quizzes.ts`, `src/handlers/index.ts`, `src/commands/index.ts`. Ran `pnpm install` to link workspace.

### Task 2: Vitest registration, smoke test, env vars (commit 51158db)

Added `bot-discord-quiz` project to `vitest.config.ts`, updated root `test`/`test:unit`/`test:coverage` scripts, added `DISCORD_QUIZ_BOT_TOKEN` and `DISCORD_QUIZ_CLIENT_ID` to `.env.example`, created `smoke.test.ts` with 5 passing tests.

### Task 3: Discord bot creation — BLOCKED (checkpoint:human-action)

Requires user to create TeacherBot application in Discord Developer Portal and set `DISCORD_QUIZ_BOT_TOKEN` and `DISCORD_QUIZ_CLIENT_ID` in `.env`. Bot cannot connect without a real token.

## Deviations from Plan

### Auto-fix: Merge wave 1 artifacts

**Found during:** Execution start
**Issue:** Wave 1 artifacts (Plan 08-01: quiz DB module) were on `worktree-agent-ae32b962` branch, not yet merged into `worktree-agent-ae378835`. The important_notes said "Wave 1 artifacts are already merged" but the worktree was missing `packages/core/src/db/quiz/`.
**Fix:** Merged `worktree-agent-ae32b962` into current branch (`git merge worktree-agent-ae32b962`). Also checked out phase 08 planning files from `workspace/quiz-bot` branch.
**Files modified:** All quiz DB files + .planning/phases/08-infrastructure/ files

None — plan executed exactly as written (after resolving the merge prerequisite).

## Known Stubs

- `packages/bot-discord-quiz/src/handlers/index.ts` — empty placeholder, Phase 10 will add student quiz DM handlers
- `packages/bot-discord-quiz/src/commands/index.ts` — empty placeholder, Phase 9 will add quiz creation slash commands

These stubs are intentional and do not block this plan's goal (bot scaffold with cron).

## Self-Check: PASSED

- `packages/bot-discord-quiz/package.json` — FOUND
- `packages/bot-discord-quiz/src/index.ts` — FOUND
- `packages/bot-discord-quiz/src/smoke.test.ts` — FOUND
- Commit 973bb68 — FOUND
- Commit 51158db — FOUND
- `pnpm test:unit` — 148 tests passed (21 files)
