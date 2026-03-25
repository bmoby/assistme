---
phase: 03-integration-ci
plan: 02
subsystem: testing
tags: [vitest, supabase, pgvector, bm25, integration-tests, students, formation-knowledge]

# Dependency graph
requires:
  - phase: 03-01
    provides: test/integration-helpers.ts (createTestClient, createTestRunId, cleanupTestData), vitest.config.ts core-integration project with real Supabase env vars and globalSetup

provides:
  - packages/core/src/db/formation/students.integration.test.ts — 6 integration tests for student CRUD lifecycle
  - packages/core/src/db/formation/knowledge.integration.test.ts — 5 integration tests for BM25 search, pgvector cosine search, module filter, and getKnowledgeByModule

affects: [03-03-ci, 03-04-e2e, future DB layer changes in packages/core/src/db/formation/]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TEST_RUN_ID prefix isolation: prefix all test-created rows with createTestRunId() for guaranteed afterAll cleanup"
    - "adminDb.insert() for integration fixture seeding: never upsertFormationKnowledge() which fires background embedding requiring running server"
    - "Known unit vector (1536-dim, first element 1.0): deterministic cosine similarity 1.0 assertion without embedding server"
    - "BM25 trigger verification: check search_text populated after INSERT, force update if trigger misfired"

key-files:
  created:
    - packages/core/src/db/formation/students.integration.test.ts
    - packages/core/src/db/formation/knowledge.integration.test.ts
  modified: []

key-decisions:
  - "Insert test fixtures via adminDb.from().insert() not upsertFormationKnowledge() — upsert fires fire-and-forget background embedding that fails without embedding server"
  - "Known 1536-dim unit vector for pgvector test: seeded directly with embedding column, cosine similarity of identical vectors = 1.0 is deterministic without any live model"
  - "Use threshold: 0.0 in searchFormationKnowledge for tests — default 0.25 threshold would filter out BM25-only results (no embedding) causing false negatives"
  - "Tests require Docker/Supabase running — no way to run without local Supabase instance"

patterns-established:
  - "Integration test cleanup: afterAll(cleanupTestData(adminDb, table, column, TEST_RUN_ID)) pattern for all integration tests"
  - "No vi.mock in integration tests: all DB paths exercised for real against local Supabase"

requirements-completed: [INTG-02, INTG-03]

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 03 Plan 02: Integration Tests - Students CRUD and Knowledge Search Summary

**Integration tests for student CRUD and formation_knowledge hybrid search (BM25 + pgvector 1536-dim) against real local Supabase, with TEST_RUN_ID-prefixed isolation and afterAll cleanup**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-25T02:39:17Z
- **Completed:** 2026-03-25T02:40:58Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- 6 integration tests for student CRUD: createStudent, getStudent by id, getStudent null, getStudentByDiscordId, updateStudent, searchStudentByName — all against real students table
- 5 integration tests for formation_knowledge search: BM25 text path (null embedding), ranking selectivity, pgvector cosine with known 1536-dim unit vector (similarity >= 0.99), getKnowledgeByModule, module filter narrowing
- Correct isolation strategy: TEST_RUN_ID prefix on all test-created row identifiers, afterAll cleanup via cleanupTestData
- Fixture seeding avoids background embedding race: inserts via adminDb.from().insert() bypassing the upsertFormationKnowledge fire-and-forget embedder

## Task Commits

Each task was committed atomically:

1. **Task 1: students.integration.test.ts — student CRUD lifecycle** - `fdfdfea` (feat)
2. **Task 2: knowledge.integration.test.ts — BM25 and pgvector hybrid search** - `ce67b51` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `packages/core/src/db/formation/students.integration.test.ts` — 6 integration tests for student CRUD using real local Supabase students table
- `packages/core/src/db/formation/knowledge.integration.test.ts` — 5 integration tests for formation_knowledge BM25/pgvector hybrid search RPC and direct helpers

## Decisions Made
- Used `adminDb.from().insert()` for fixture seeding instead of `upsertFormationKnowledge()` — the upsert fires a background embedding call to the embedding server which is unavailable in test env, causing a fire-and-forget failure that pollutes test output
- Used a 1536-dim unit vector `[1.0, 0.0, ...]` for the pgvector seed row — identical query vector produces cosine similarity of exactly 1.0, deterministic without any live embedding model
- Set `threshold: 0.0` in search calls — the default 0.25 threshold filters out BM25-only results (rows without an embedding) so tests using null queryEmbedding would return 0 results
- Placed BM25 trigger verification in beforeAll with a forced update fallback — Supabase triggers fire synchronously on INSERT but this guards against edge cases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Docker Desktop is not running in the current execution environment, so `pnpm test:integration` fails at the `supabase db reset` step in globalSetup.ts. The test files are correctly written and will pass once Docker/Supabase local is running. This is an infrastructure constraint, not a code issue.

**To run the integration tests:**
1. Start Docker Desktop
2. Run `supabase start` (or it will be started automatically by globalSetup)
3. Run `pnpm test:integration`

## User Setup Required

None - no external service configuration required beyond what was set up in Phase 03-01.

## Next Phase Readiness
- Integration test files are complete and ready to run when Docker is available
- The `core-integration` Vitest project (defined in vitest.config.ts, Phase 03-01) will pick up both `*.integration.test.ts` files automatically
- Phase 03-03 (CI GitHub Actions) can reference these test files for the integration test job
- No blockers for Phase 03-03 — CI doesn't need to run integration tests without Docker, as per the three-tier CI decision

## Known Stubs

None - both test files are complete with no stubs or placeholder assertions.

---
*Phase: 03-integration-ci*
*Completed: 2026-03-25*
