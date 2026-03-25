# Phase 5: DB Foundation + Core Hardening - Research

**Researched:** 2026-03-25
**Domain:** PostgreSQL partial unique indexes, Supabase migrations, TypeScript type hardening, Vitest integration tests
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (Migration Safety):** Migration uses `CREATE UNIQUE INDEX IF NOT EXISTS` + a DO block that detects existing duplicate rows and logs a warning instead of crashing. Never fail silently, never crash on existing data.
- **D-02 (Bug Fix Inclusion):** Fix `getPendingExercisesBySession()` in this phase — it queries `exercise_number` instead of `session_id`. Touching exercises.ts anyway; cost is near zero.
- **D-03 (Caller Update):** Update `dm-agent.ts` to pass `session_id` directly to `submitExercise()` in Phase 5 — remove the separate UPDATE. Fulfills SC2 (atomic session_id) end-to-end.

### Claude's Discretion

- **Migration ordering:** Single migration vs multiple — Claude picks the cleanest approach for the 3 schema changes (partial unique index, review_thread columns, bug fix).
- **Test strategy:** Follow existing test patterns from v1.0 (integration tests with real Supabase local, unit tests for pure functions). Existing test infrastructure is the template.
- **submitExercise() API:** Claude decides whether to just add `session_id` param or also clean up the signature (module/exercise_number may be redundant with session). Best judgment.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SUB-01 | DB unique constraint `(student_id, session_id)` prevents duplicate submissions | Partial unique index pattern, PostgreSQL 23505 error code, DO block for pre-flight duplicate detection |
| SUB-03 | `session_id` assigned atomically in the INSERT (not in a separate UPDATE) | `submitExercise()` signature change, dm-agent.ts caller update pattern |
</phase_requirements>

---

## Summary

Phase 5 is a pure DB + core TypeScript hardening phase. No Discord UI changes, no new bot behaviour — every success criterion is verified by automated tests and `pnpm typecheck`. The work has four concrete deliverables: (1) a single SQL migration file (`017_exercise_submission_v2.sql`), (2) updated `exercises.ts` functions, (3) an updated `dm-agent.ts` call site, and (4) an integration test file covering the DB layer.

The existing test infrastructure (Vitest + Supabase local Docker + `integration-helpers.ts`) is fully operational and already follows the exact patterns this phase needs. The `students.integration.test.ts` and `knowledge.integration.test.ts` files are the direct templates. No new tooling setup is required — the planner can write tasks that assume the infrastructure is ready.

The most important technical constraint to get right is the partial unique index: it must be `WHERE status IN ('submitted', 'ai_reviewed')` (not a full table unique constraint), because a student can resubmit after a `revision_needed` decision. The DO block pre-flight check protects the migration from crashing on any environment that already has duplicate rows in those statuses.

**Primary recommendation:** Single migration file `017_exercise_submission_v2.sql` with all three schema changes; single test file `exercises.integration.test.ts` covering the index violation, the new lookup function, and the atomic session_id.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL (via Supabase) | 15 (Supabase managed) | Partial unique index, error code 23505 | Project's only database |
| @supabase/supabase-js | 2.49.1 | DB client used in all DB functions | Established project dependency |
| TypeScript | 5.7.0 (strict) | Type safety for `StudentExercise` interface additions | Project mandate: strict mode, no `any` |
| Vitest | (existing — see vitest.config.ts) | Integration test runner | Already configured with `core-integration` project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase CLI | 2.75.0 (installed) | `supabase db reset` to apply migration locally | Required for integration test globalSetup |
| Docker | 29.2.0 (installed) | Runs Supabase local stack | Required for `supabase start` in CI |

No new package installations required for this phase.

---

## Architecture Patterns

### Recommended Project Structure

Files touched in this phase:

```
supabase/migrations/
└── 017_exercise_submission_v2.sql   # NEW: partial unique index + review_thread cols

packages/core/src/
├── types/index.ts                   # EDIT: add review_thread_id, review_thread_ai_message_id to StudentExercise
├── db/formation/
│   ├── exercises.ts                 # EDIT: submitExercise() + session_id param, fix getPendingExercisesBySession, add getExerciseByStudentAndSession
│   └── exercises.integration.test.ts  # NEW: integration tests for DB layer
└── ai/formation/
    └── dm-agent.ts                  # EDIT: remove separate UPDATE, pass session_id to submitExercise()
```

### Pattern 1: Partial Unique Index with Duplicate-Safe Migration

**What:** Add a `CREATE UNIQUE INDEX IF NOT EXISTS` scoped to specific status values. Wrap in a DO block that detects and reports pre-existing violations.

**When to use:** Enforcing application-level constraints that are only valid for a subset of rows (here: only active submissions matter; `revision_needed` rows can be re-used).

**Example:**
```sql
-- 017_exercise_submission_v2.sql

-- Pre-flight: detect any existing duplicates before creating index
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO dup_count
  FROM (
    SELECT student_id, session_id
    FROM student_exercises
    WHERE status IN ('submitted', 'ai_reviewed')
      AND session_id IS NOT NULL
    GROUP BY student_id, session_id
    HAVING COUNT(*) > 1
  ) dups;

  IF dup_count > 0 THEN
    RAISE WARNING 'Found % duplicate (student_id, session_id) pairs in active statuses. Index not created — manual cleanup required.', dup_count;
  ELSE
    -- Safe to create index
    CREATE UNIQUE INDEX IF NOT EXISTS uq_student_exercise_active
      ON student_exercises (student_id, session_id)
      WHERE status IN ('submitted', 'ai_reviewed');
    RAISE NOTICE 'Unique index uq_student_exercise_active created successfully.';
  END IF;
END $$;

-- review_thread columns (safe ADD COLUMN IF NOT EXISTS — always idempotent)
ALTER TABLE student_exercises
  ADD COLUMN IF NOT EXISTS review_thread_id TEXT,
  ADD COLUMN IF NOT EXISTS review_thread_ai_message_id TEXT;
```

**Constraint:** The DO block approach means the index creation is conditional. The planner must include a verification step that confirms the index exists after `supabase db reset`.

### Pattern 2: Atomic session_id in submitExercise()

**What:** Add `session_id` as a required parameter to `submitExercise()` and include it in the single INSERT call. Remove the post-INSERT UPDATE in `dm-agent.ts`.

**Current (two-step, non-atomic):**
```typescript
// dm-agent.ts — lines 397-408
exercise = await submitExercise({ student_id, module, exercise_number, submission_url, submission_type });
await db.from('student_exercises').update({ session_id: session.id }).eq('id', exercise.id);
```

**Target (single INSERT):**
```typescript
// exercises.ts — submitExercise()
export async function submitExercise(params: {
  student_id: string;
  session_id: string;      // NEW required param
  module: number;
  exercise_number: number;
  submission_url: string;
  submission_type?: string;
}): Promise<StudentExercise>

// dm-agent.ts — single call, no separate update
exercise = await submitExercise({
  student_id: student.id,
  session_id: session.id,    // NEW — was separate update
  module: session.module,
  exercise_number: session.session_number,
  submission_url: submissionUrl,
  submission_type: submissionType,
});
```

**Note on signature cleanup (discretion area):** `module` and `exercise_number` are now redundant — `session_id` links to the `sessions` table which already has `module` and `session_number`. The planner may choose to keep them for now (backwards-compatible, no other callers) or remove them. Research recommendation: keep them as optional or keep them populated — they are denormalized query conveniences. The single caller (`dm-agent.ts`) already has `session.module` and `session.session_number` available.

### Pattern 3: Bug Fix — getPendingExercisesBySession()

**What:** Change the filter column from `exercise_number` to `session_id`.

**Current bug (line 199):**
```typescript
.eq('exercise_number', sessionNumber)  // WRONG: filters by exercise_number not session_id
```

**Caller context** (`review-buttons.ts` line 208): `getPendingExercisesBySession(sessionNumber)` — passes session number, not session UUID. The function signature must either:
- (a) Accept `sessionNumber: number` and do a subquery join to sessions, OR
- (b) Accept `sessionId: string` (UUID) and update the caller

**Research finding:** Option (a) is simpler and does not require changing the call site in `review-buttons.ts`. Option (b) requires updating the caller but produces a cleaner indexed query against `session_id` (which already has `idx_student_exercises_session` index). The planner should choose: the locked decision says "fix the bug" — the how is discretion.

Recommended: change signature to accept `sessionId: string` and update the single call site in `review-buttons.ts`. This correctly uses the indexed `session_id` column and aligns with SC3 ("single targeted query, not a linear scan").

### Pattern 4: New Lookup Function — getExerciseByStudentAndSession()

**What:** A targeted single-row query using the indexed `(student_id, session_id)` columns. Returns `StudentExercise | null`.

**Example:**
```typescript
export async function getExerciseByStudentAndSession(
  studentId: string,
  sessionId: string
): Promise<StudentExercise | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('student_id', studentId)
    .eq('session_id', sessionId)
    .in('status', ['submitted', 'ai_reviewed'])
    .maybeSingle();  // returns null if 0 rows, throws if >1 row (impossible after unique index)

  if (error) {
    logger.error({ error, studentId, sessionId }, 'Failed to get exercise by student and session');
    throw error;
  }
  return data as StudentExercise | null;
}
```

**Note on `.maybeSingle()` vs `.single()`:** `.single()` throws `PGRST116` when no rows found; `.maybeSingle()` returns null. The latter is correct here since "not submitted yet" is a valid state. Supabase JS v2 supports `maybeSingle()`. Confidence: HIGH (verified in existing codebase — `getExercise()` already uses `.single()` with `PGRST116` handling; using `.maybeSingle()` is cleaner for optional lookup).

### Pattern 5: TypeScript Type Addition

**What:** Add two new nullable fields to `StudentExercise` interface.

**Current interface** (types/index.ts, line 94): does not have `review_thread_id` or `review_thread_ai_message_id`.

**Target:**
```typescript
export interface StudentExercise {
  // ... existing fields ...
  session_id: string | null;
  submission_count: number;
  review_history: ReviewHistoryEntry[];
  notification_message_id: string | null;
  review_thread_id: string | null;           // NEW
  review_thread_ai_message_id: string | null; // NEW
  created_at: string;
}
```

Both fields are `string | null` because Discord thread IDs are strings (snowflake IDs). This is backwards-compatible — all existing code that reads `StudentExercise` will simply get `undefined` for these fields until the migration runs (Supabase returns the column as null when added with `ADD COLUMN IF NOT EXISTS`).

### Anti-Patterns to Avoid

- **DO NOT use `CREATE UNIQUE INDEX` without `IF NOT EXISTS`:** The migration must be idempotent — Supabase `db reset` is called in `globalSetup.ts` before every integration test run.
- **DO NOT use `.single()` in `getExerciseByStudentAndSession()`:** Will throw on empty result set. Use `.maybeSingle()`.
- **DO NOT leave the duplicate UPDATE in dm-agent.ts:** That is the entire point of SUB-03. After `submitExercise()` accepts `session_id`, remove lines 405-408 completely.
- **DO NOT create the index inside the DO block without the duplicate pre-flight check:** On a clean DB this is fine, but if existing data has duplicates the migration crashes with an opaque error. D-01 is locked.
- **DO NOT make `session_id` optional in `submitExercise()`:** It must be required so TypeScript enforces the caller passes it. The caller already has it available.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting PostgreSQL constraint violations | Custom error message parsing | Check `error.code === '23505'` in Supabase error response | Supabase JS propagates PG error codes directly in the `error` object |
| Conditional index creation in migration | IF/ELSE with DDL statements | DO block with RAISE WARNING + `CREATE UNIQUE INDEX IF NOT EXISTS` | DO blocks are the standard PostgreSQL pattern for procedural migration logic |
| Optional row lookup | Manual `.eq().limit(1)` + array check | `.maybeSingle()` | Supabase JS v2 built-in: returns null for 0 rows, throws for >1 row |
| Migration test | Separate test framework | `supabase db reset` in `globalSetup.ts` | Already the project pattern — resets apply all migrations in order |

---

## Common Pitfalls

### Pitfall 1: DO Block Index Creation Silently Skipped

**What goes wrong:** The DO block detects duplicates and logs a RAISE WARNING, but the migration still exits 0. The index is never created. The plan's verification step does not check for index existence.

**Why it happens:** DO blocks run in a single transaction. RAISE WARNING does not abort — only RAISE EXCEPTION aborts. The migration "succeeds" but the index does not exist.

**How to avoid:** Include a verification step after `supabase db reset` that queries `pg_indexes` to confirm `uq_student_exercise_active` exists:
```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'student_exercises'
  AND indexname = 'uq_student_exercise_active';
```

**Warning signs:** Migration runs without error, but integration test for 23505 violation does not trigger.

### Pitfall 2: Partial Index Does Not Cover NULL session_id

**What goes wrong:** The unique index is `ON student_exercises (student_id, session_id) WHERE status IN ('submitted', 'ai_reviewed')`. If `session_id IS NULL`, PostgreSQL does NOT enforce uniqueness because NULL != NULL in index comparisons. Two rows with `session_id = NULL` and the same `student_id` can coexist.

**Why it happens:** PostgreSQL partial unique indexes treat NULL values as not equal to each other, so the uniqueness constraint is vacuously satisfied for NULL values.

**How to avoid:** This is acceptable here — after D-03 (atomic session_id in INSERT), `session_id` will never be NULL for new submissions. However, the DO block pre-flight and integration tests should only operate on rows where `session_id IS NOT NULL`.

**Warning signs:** Test that inserts two rows with `session_id = NULL` does not raise 23505 — this is correct behaviour, not a bug.

### Pitfall 3: `submitExercise()` Has a Single Caller — But Type Errors Cascade

**What goes wrong:** Making `session_id` required in `submitExercise()` causes a TypeScript compile error at the call site in `dm-agent.ts`. If `pnpm typecheck` is run before updating the caller, it fails. This is expected — but the plan must sequence: update `exercises.ts` first, then immediately update `dm-agent.ts`, then run typecheck.

**Why it happens:** `packages/core` and `packages/bot-discord` share types via `@assistme/core` import. TypeScript strict mode catches the missing parameter.

**How to avoid:** The plan must update `dm-agent.ts` in the same task (or immediately following task) as `submitExercise()`. Do not leave a typecheck failure between tasks.

### Pitfall 4: getPendingExercisesBySession Caller Signature Change

**What goes wrong:** If the function signature changes from `(sessionNumber: number)` to `(sessionId: string)`, the caller in `review-buttons.ts` line 208 must also change. Failing to update the caller results in a typecheck error.

**Why it happens:** `review-buttons.ts` is in `packages/bot-discord`, a separate package. The function is exported from `packages/core`. Changing the exported function signature without updating all callers breaks typecheck.

**How to avoid:** Grep for all callers of `getPendingExercisesBySession` before changing the signature. There is currently one caller: `review-buttons.ts` line 208. The caller passes `sessionNumber` (integer). If changing to accept UUID, the caller must resolve the session UUID from the session number — or look up the session ID via a separate DB call.

**Alternative:** Change the internal implementation to accept `sessionNumber: number` and look up `session_id` via a subquery join. This avoids changing the caller's interface. Research recommendation: keep `(sessionNumber: number)` signature, change the internal filter from `.eq('exercise_number', sessionNumber)` to a join (or two-step: first get session by number, then filter by session_id).

### Pitfall 5: Integration Test Cleanup for Unique Index

**What goes wrong:** Integration tests insert rows with the same `(student_id, session_id)` intentionally to test the 23505 error. If the test transaction is not rolled back or `cleanupTestData` is not called, subsequent test runs fail with "duplicate key" errors from leftover rows.

**Why it happens:** The integration test infrastructure uses `afterAll(cleanupTestData)` but does not use transactions. If a test crashes before `afterAll`, rows remain.

**How to avoid:** Use unique `TEST_RUN_ID` prefixed UUIDs for `student_id` — the same prefix used for cleanup. Each test run uses fresh IDs that do not collide with previous runs. This is the established pattern in `students.integration.test.ts`.

---

## Code Examples

Verified patterns from existing codebase:

### Integration Test Structure (from students.integration.test.ts)
```typescript
// Source: packages/core/src/db/formation/students.integration.test.ts
import { describe, it, expect, afterAll } from 'vitest';
import { createTestClient, createTestRunId, cleanupTestData } from '../../../../../test/integration-helpers.js';

const TEST_RUN_ID = createTestRunId();
const adminDb = createTestClient();

afterAll(async () => {
  await cleanupTestData(adminDb, 'student_exercises', 'student_id', TEST_RUN_ID);
});

describe('exercises DB integration', () => {
  it('duplicate (student_id, session_id) in active status returns 23505', async () => {
    // ... insert first row, insert second row, expect error.code === '23505'
  });
});
```

### Supabase Error Code Check Pattern (from exercises.ts)
```typescript
// Source: packages/core/src/db/formation/exercises.ts — getExercise()
if (error.code === 'PGRST116') return null;
logger.error({ error, id }, 'Failed to get exercise');
throw error;
```

For the 23505 unique violation, the pattern is:
```typescript
if (error.code === '23505') {
  throw new Error('Duplicate submission: student already has an active submission for this session');
}
```

### maybeSingle() Pattern
```typescript
// Supabase JS v2 — returns null for 0 rows, data for 1 row, throws for >1 row
const { data, error } = await db
  .from(TABLE)
  .select()
  .eq('student_id', studentId)
  .eq('session_id', sessionId)
  .in('status', ['submitted', 'ai_reviewed'])
  .maybeSingle();
```

### DO Block with Conditional DDL (PostgreSQL)
```sql
DO $$
DECLARE dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (...) dups;
  IF dup_count > 0 THEN
    RAISE WARNING 'Duplicates found: %', dup_count;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_student_exercise_active
      ON student_exercises (student_id, session_id)
      WHERE status IN ('submitted', 'ai_reviewed');
  END IF;
END $$;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Two-step INSERT + UPDATE for session_id | Single INSERT with session_id | Phase 5 (this phase) | Eliminates window where exercise row exists without session_id |
| `exercise_number` filter in getPendingExercisesBySession | `session_id` filter | Phase 5 (this phase) | Fixes silent bug returning wrong exercises |
| No type fields for review_thread_id | `review_thread_id: string \| null` on StudentExercise | Phase 5 (this phase) | TypeScript-ready for Phase 7 review thread reuse |

**Deprecated/outdated:**
- The separate `db.from('student_exercises').update({ session_id })` call in dm-agent.ts (lines 406-408): removed in this phase, replaced by inline INSERT param.

---

## Open Questions

1. **getPendingExercisesBySession signature change impact**
   - What we know: single caller (`review-buttons.ts` line 208) passes `sessionNumber: number`
   - What's unclear: does changing the signature to `(sessionId: string)` require a Supabase query to resolve session UUID from number in the caller, or should the function do the resolution internally?
   - Recommendation: Change internal implementation to use a two-step lookup (get session UUID by number, then query by session_id). Keeps caller interface unchanged. Avoids touching `review-buttons.ts` which is out of scope for Phase 5.

2. **submitExercise() signature — keep module/exercise_number params?**
   - What we know: `module` and `exercise_number` are denormalized columns on `student_exercises`. They are in the schema (migration 001) and populated by the caller.
   - What's unclear: are they used anywhere downstream for queries or display?
   - Recommendation: Keep them in the signature for now. The columns exist in the DB schema, they provide denormalized query convenience, and removing them is a separate refactor not required for SUB-01/SUB-03.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Migration apply (`supabase db reset`), integration test globalSetup | Yes | 2.75.0 | None — required |
| Docker | Supabase local stack (`supabase start`) | Yes | 29.2.0 | None — required for integration tests |
| Node.js | Test runner, tsx | Yes (project requirement) | 20+ | None |
| Vitest | Unit + integration tests | Yes (in devDependencies, config exists) | existing | None |

**Missing dependencies with no fallback:** None — all required tools are present.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `packages/core/src/db/formation/exercises.ts` — current function signatures and bugs
- Direct codebase read: `packages/core/src/types/index.ts` — `StudentExercise` interface (confirmed missing `review_thread_id`)
- Direct codebase read: `packages/core/src/ai/formation/dm-agent.ts` lines 396-413 — confirmed two-step INSERT+UPDATE
- Direct codebase read: `supabase/migrations/` (001, 005, 016) — confirmed current schema columns
- Direct codebase read: `vitest.config.ts` — confirmed `core-integration` and `bot-discord-integration` projects with `globalSetup`
- Direct codebase read: `packages/core/src/db/formation/students.integration.test.ts` — established integration test pattern
- Direct codebase read: `.planning/research/ARCHITECTURE.md` — prior architectural analysis including `review_thread_id` column specification

### Secondary (MEDIUM confidence)
- PostgreSQL docs (training knowledge, HIGH confidence for standard features): partial unique indexes, `WHERE` clause on indexes, DO blocks, RAISE WARNING/NOTICE, error code 23505
- Supabase JS v2 docs (training knowledge): `.maybeSingle()` returns `null` for 0 rows; `.single()` throws `PGRST116`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools verified present on machine, versions confirmed
- Architecture patterns: HIGH — directly verified from codebase; no assumptions
- Pitfalls: HIGH — derived from direct code reading and PostgreSQL standard behaviour
- Bug analysis: HIGH — confirmed bug at exercises.ts line 199 via direct read

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable domain — DB schema, TypeScript, Supabase local)
