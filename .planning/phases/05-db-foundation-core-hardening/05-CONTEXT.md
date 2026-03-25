# Phase 5: DB Foundation + Core Hardening - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the schema and DB functions correct — duplicate submissions impossible at the database level, session_id written atomically in a single INSERT, new lookup function, and TypeScript types ready for Phase 7. Phase delivers: 1 migration, updated exercises.ts functions, updated dm-agent.ts call site, bug fix, and matching tests.

</domain>

<decisions>
## Implementation Decisions

### Migration Safety
- **D-01:** Migration uses `CREATE UNIQUE INDEX IF NOT EXISTS` + a DO block that detects existing duplicate rows and logs a warning instead of crashing. Never fail silently, never crash on existing data.

### Bug Fix Inclusion
- **D-02:** Fix `getPendingExercisesBySession()` in this phase — it queries `exercise_number` instead of `session_id`. We're already touching exercises.ts, cost is near zero.

### Caller Update
- **D-03:** Update `dm-agent.ts` to pass `session_id` directly to `submitExercise()` in Phase 5 — remove the separate UPDATE. This fulfills SC2 (atomic session_id) end-to-end. dm-agent is in `packages/core/` so it's "core hardening" scope.

### Claude's Discretion
- **Migration ordering:** Single migration vs multiple — Claude picks the cleanest approach for the 3 schema changes (partial unique index, review_thread columns, bug fix).
- **Test strategy:** Follow existing test patterns from v1.0 (integration tests with real Supabase local, unit tests for pure functions). Existing test infrastructure is the template.
- **submitExercise() API:** Claude decides whether to just add `session_id` param or also clean up the signature (module/exercise_number may be redundant with session). Best judgment.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### DB Schema & Migrations
- `supabase/migrations/001_initial_schema.sql` — Original student_exercises table (no session_id)
- `supabase/migrations/005_sessions_system.sql` — session_id column added as ALTER
- `supabase/migrations/016_exercise_review_system.sql` — submission_count, review_history, notification_message_id

### Core DB Functions
- `packages/core/src/db/formation/exercises.ts` — All exercise CRUD functions (submitExercise, getPendingExercisesBySession bug at ~line 199)
- `packages/core/src/types/index.ts` — StudentExercise interface (missing review_thread_id, review_thread_ai_message_id)

### Caller Code
- `packages/core/src/ai/formation/dm-agent.ts` — create_submission tool (lines 396-414: submitExercise + separate UPDATE for session_id)

### Prior Decisions (STATE.md)
- Partial unique index on `(student_id, session_id) WHERE status IN ('submitted', 'ai_reviewed')` — not full unique constraint, intentionally scoped to active statuses
- DB migration must run and be applied to prod before any handler changes ship

### Specs
- `specs/04-bot-discord/SPEC.md` — Bot Discord spec (exercise flow, review system)
- `specs/01-cerveau-central/SPEC.md` — Core package spec (DB layer, types)

### Test Infrastructure (follow existing patterns)
- `test/integration-helpers.ts` — Test isolation helpers
- `test/globalSetup.ts` — Supabase local lifecycle
- `packages/core/src/db/formation/knowledge.test.integration.ts` — Example DB integration test pattern

### Codebase Maps
- `.planning/codebase/CONCERNS.md` — Exercise submission state machine fragility analysis
- `.planning/codebase/ARCHITECTURE.md` — Handler/agent/DB layer architecture

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `test/integration-helpers.ts` — createTestClient, createTestRunId, cleanupTestData — reuse for exercise DB tests
- `test/globalSetup.ts` — Supabase local start/stop lifecycle
- `test/msw-server.ts` — MSW v2 server (not needed for Phase 5 DB tests)
- Existing migration patterns in `supabase/migrations/` — follow numbering convention

### Established Patterns
- DB functions return typed objects or null, throw on unexpected errors
- Supabase errors checked via `error` field, not exceptions
- Integration tests use real Supabase local Docker
- Migrations are incremental ALTER files, numbered sequentially

### Integration Points
- `submitExercise()` is called by dm-agent.ts `create_submission` tool — single caller to update
- `getPendingExercisesBySession()` is called by `review-buttons.ts` `handleReviewSession()` — fixing the query fixes the review panel
- `StudentExercise` type is used across core + bot-discord — adding fields is backwards-compatible (nullable)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow existing migration and test patterns from v1.0.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-db-foundation-core-hardening*
*Context gathered: 2026-03-25*
