# Roadmap: Dev Environment & Automated Tests — Bot Discord

## Overview

Starting from zero tests in a 15K+ line TypeScript/ESM Discord.js v14 codebase, this roadmap builds a complete automated testing infrastructure in four sequential phases. Phase 1 makes Vitest run at all. Phase 2 builds the shared mock layer and covers every handler with unit tests. Phase 3 validates DB correctness with real Supabase Docker and gates the CI pipeline. Phase 4 adds an optional E2E smoke-test layer using a dedicated dev Discord bot. Each phase is a prerequisite for the next; the safety net is real and usable after Phase 3 even if Phase 4 is deferred.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Vitest configured for ESM monorepo, all test scripts functional, zero crashes at import (completed 2026-03-24)
- [x] **Phase 2: Mocks + Unit Tests** - Shared mock layer built, all handlers covered with deterministic unit tests (completed 2026-03-25)
- [ ] **Phase 3: Integration + CI** - Real Supabase Docker validates DB layer, GitHub Actions CI gates every PR
- [ ] **Phase 4: E2E Discord Dev** - Dedicated dev bot + test server, critical flows covered with real Discord interactions

## Phase Details

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
**UI hint**: no

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
**Plans:** 4 plans

Plans:
- [ ] 03-01-PLAN.md — Integration test infrastructure: Vitest projects, globalSetup, MSW server, test isolation helpers
- [ ] 03-04-PLAN.md — GitHub Actions CI pipeline: unit on push, integration on PR, E2E placeholder
- [ ] 03-02-PLAN.md — DB layer integration tests: students CRUD and knowledge search (BM25 + pgvector)
- [ ] 03-03-PLAN.md — Agent integration test (DM Agent + real DB) and coverage thresholds

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
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/1 | Complete   | 2026-03-24 |
| 2. Mocks + Unit Tests | 5/5 | Complete   | 2026-03-25 |
| 3. Integration + CI | 0/4 | In progress | - |
| 4. E2E Discord Dev | 0/? | Not started | - |
