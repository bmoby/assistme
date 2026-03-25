---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
stopped_at: Completed 03-integration-ci/03-04-PLAN.md
last_updated: "2026-03-25T02:36:17.587Z"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 10
  completed_plans: 7
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** Pouvoir modifier le bot Discord et savoir immediatement si ca marche ou si ca casse quelque chose -- sans deployer en prod.
**Current focus:** Phase 03 — integration-ci

## Current Position

Phase: 03 (integration-ci) — EXECUTING
Plan: 2 of 4

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*
| Phase 01-foundation P01 | 2 | 2 tasks | 8 files |
| Phase 02-mocks-unit-tests P05 | 15 | 2 tasks | 11 files |
| Phase 02-mocks-unit-tests P01 | 15 | 2 tasks | 7 files |
| Phase 02-mocks-unit-tests P02 | 35 | 3 tasks | 11 files |
| Phase 02-mocks-unit-tests P04 | 15 | 2 tasks | 2 files |
| Phase 02-mocks-unit-tests P03 | 10 | 3 tasks | 3 files |
| Phase 03-integration-ci P04 | 3 | 1 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Vitest over Jest: better native ESM support, faster for this workload
- Supabase local Docker over mock DB: integration tests need real pgvector
- Bot de dev Discord separe: zero risk on prod, dedicated token
- 3-tier test pyramid: unit (fast, no services) + integration (real DB) + E2E (real Discord, manual only)
- [Phase 01-foundation]: Vitest projects API (not workspace file) for inline monorepo project definitions — no deprecated vitest.workspace.ts
- [Phase 01-foundation]: pool: forks over vmThreads for ESM native module stability
- [Phase 01-foundation]: test.env fake vars per Vitest project to prevent import-time env crashes from getSupabase() and logger
- [Phase 01-foundation]: test:integration script uses || exit 0 — Vitest 4.x exits 1 on unknown --project filter names
- [Phase 02-05]: JSON arrays for multi-turn agent sequences — dm-agent-submission: 3 responses, tsarag-read-propose: 2 responses
- [Phase 02-05]: Module-level seq counter (not closure) for fixture factories to allow external resetSeq() without re-import
- [Phase 02-mocks-unit-tests]: Object.defineProperty over Object.assign for GuildMember.prototype base — GuildMember.prototype defines some properties as getter-only
- [Phase 02-mocks-unit-tests]: getAnthropicMockFactory() must return {default: vi.fn()} for ESM default import mock pattern
- [Phase 02-mocks-unit-tests]: GuildMemberBuilder rolesCache must expose .map() — create.ts calls roles.cache.map() for agent role resolution; missing method causes silent TypeError in try/catch
- [Phase 02-mocks-unit-tests]: agents namespace mock: use MockedFunction<AgentNS['method']> typed cast to get type-safe .mockReturnValue() access on auto-mocked namespace properties
- [Phase 02-mocks-unit-tests]: FAQ agent mocks askClaude (../client.js) not @anthropic-ai/sdk directly — faq-agent.ts delegates to client abstraction
- [Phase 02-mocks-unit-tests]: Tsarag agent max iterations = 8 (vs 5 for DM agent) — verified in source before writing iteration limit test
- [Phase 02-mocks-unit-tests]: drainProcessing() helper after __emit: processingLocks queue returns before actual processing completes
- [Phase 02-mocks-unit-tests]: TextChannel.prototype base for admin channel mocks: handleReviewOpen uses instanceof TextChannel in find predicate
- [Phase 02-mocks-unit-tests]: Approach A (mock button-handler to capture handlers) for review-buttons: handler functions not exported
- [Phase 03-integration-ci]: Three-tier CI: unit on push, integration on PR, E2E on workflow_dispatch only — no Discord secrets in automated jobs
- [Phase 03-integration-ci]: Supabase Docker cache keyed on migrations/** hash — auto-invalidates on schema changes in CI

### Pending Todos

None yet.

### Blockers/Concerns

- Handler isolation scope for dm-handler and admin-handler is not fully analyzed — module-level singleton refactor depth unknown. Assess during Phase 2 planning.
- Supabase CLI version that bundles pgvector 0.7+ needs confirmation against `supabase/config.toml`. Validate at Phase 3 start.

## Session Continuity

Last session: 2026-03-25T02:36:17.581Z
Stopped at: Completed 03-integration-ci/03-04-PLAN.md
Resume file: None
