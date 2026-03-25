# Phase 4: E2E Discord Dev - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 04-e2e-discord-dev
**Areas discussed:** Dev bot setup, Test server structure, Test user strategy, Scope of E2E scenarios

---

## Dev Bot Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, I have one | Already created a second Discord application with its own token | ✓ |
| No, need to create one | Plan should include setup instructions | |
| Reuse prod bot | Same bot, different test guild | |

**User's choice:** Already has a separate dev bot

| Option | Description | Selected |
|--------|-------------|----------|
| .env.test file | Store token in .env.test (git-ignored) | ✓ |
| Environment variable only | No file, export each session | |
| You decide | Claude picks | |

**User's choice:** .env.test file

---

## Test Server Structure

| Option | Description | Selected |
|--------|-------------|----------|
| I have a test server | Test server exists, just need guild/channel IDs | ✓ |
| Script should create channels | Automated channel creation on first run | |
| I'll create it manually | Manual setup with documentation | |

**User's choice:** Already has a test server

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror all prod channels | Full mirror for most realistic testing | ✓ |
| Minimum for tests only | Only channels needed for 3 scenarios | |
| You decide | Claude determines minimum set | |

**User's choice:** Mirror all prod channels

---

## Test User Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Second bot as test user | Lightweight second bot sends messages to dev bot, fully automated | ✓ |
| Your Discord account | Manual interaction or account token | |
| Discord API direct calls | REST API messages without real client | |

**User's choice:** Second bot as test user (already has it)

---

## Scope of E2E Scenarios

| Option | Description | Selected |
|--------|-------------|----------|
| Happy path only | Main success flow per scenario | |
| Happy + one error path | Success + one failure per scenario | |
| Thorough | Multiple paths including edge cases | ✓ |

**User's choice:** Thorough

| Option | Description | Selected |
|--------|-------------|----------|
| Real Claude API | True E2E, costs money, non-deterministic | |
| Mock Claude in E2E too | MSW fixtures, deterministic, free | |
| Configurable | Mocked by default, --live flag for real API | ✓ |

**User's choice:** Configurable (mocked default + --live flag)

---

## Claude's Discretion

- E2E test file naming, Vitest project config, MSW handler design, timeout values, .env.test variable naming

## Deferred Ideas

None — discussion stayed within phase scope.
