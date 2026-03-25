# Deferred Items - Phase 03: integration-ci

## Out-of-Scope Issues Discovered During Execution

### 1. core-import.test.ts timeout (pre-existing)

**Discovered in:** Plan 03 (Task 2 - coverage thresholds)
**File:** `packages/bot-discord/src/core-import.test.ts`
**Origin commit:** `a02adab` feat(01-01): add smoke tests and verify Vitest infrastructure
**Issue:** The test dynamically imports `@assistme/core` and times out in 5000ms. This is a pre-existing failure introduced in Phase 1 - Foundation, not caused by Phase 3 work.
**Impact:** `pnpm test:coverage` exits with code 1 due to this test failure (not threshold failures). Coverage thresholds themselves pass.
**Recommended fix:** Either increase `testTimeout` for this test file in `vitest.config.ts`, or investigate why dynamic import of `@assistme/core` hangs (likely an import-time side effect like DB connection or Redis client initialization).
**Status:** Deferred - not in scope for Plan 03.
