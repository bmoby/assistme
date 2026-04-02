# Phase 3: Codebase Cleanup - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove the exercise-reviewer module and all dead references to it and to the `ai_reviewed` status from the codebase. After this phase, no file in the monorepo imports, exports, or references exercise-reviewer or ai_reviewed. TypeScript type checks and unit tests pass cleanly.

</domain>

<decisions>
## Implementation Decisions

### Exercise-Reviewer Module Deletion
- **D-01:** Delete `packages/core/src/ai/formation/exercise-reviewer.ts` entirely.
- **D-02:** Remove the `reviewExercise` and `ExerciseReviewResult` re-exports from `packages/core/src/ai/formation/index.ts`.
- **D-03:** Remove the `reviewExercise` and `ExerciseReviewResult` re-exports from `packages/core/src/ai/index.ts`.
- **D-04:** Only remove exercise-reviewer exports from barrel files — do not touch unrelated exports.

### ai_reviewed Status Removal
- **D-05:** Remove `'ai_reviewed'` from the `ExerciseStatus` TypeScript type union in `packages/core/src/types/index.ts`.
- **D-06:** Migrate existing DB records: add a SQL migration that runs `UPDATE student_exercises SET status = 'submitted' WHERE status = 'ai_reviewed'`. This ensures no orphaned status values remain in the database.
- **D-07:** Remove `ai_reviewed` from all status filter conditions in production code:
  - `packages/bot-discord/src/handlers/review-buttons.ts` (lines 56, 121) — remove ai_reviewed from pending checks
  - `packages/bot-discord/src/commands/admin/review.ts` (lines 94, 145) — remove ai_reviewed filter and emoji
  - `packages/bot-discord/src/commands/admin/approve.ts` (line 38) — remove from pending filter
  - `packages/bot-discord/src/commands/admin/revision.ts` (line 38) — remove from pending filter
  - `packages/bot-discord/src/utils/format.ts` (line 12) — remove ai_reviewed emoji mapping

### Test Cleanup
- **D-08:** Update all test files that reference `ai_reviewed`:
  - `packages/core/src/db/formation/exercises.integration.test.ts` — update status expectations
  - `packages/bot-discord/src/commands/admin/approve.test.ts` — update fixture status
  - `packages/bot-discord/src/commands/admin/review.test.ts` — update fixture status
  - `packages/bot-discord/src/handlers/review-buttons.test.ts` — update tests referencing ai_reviewed
- **D-09:** No exercise-reviewer test file exists — nothing to delete there.

### Spec Synchronization
- **D-10:** Update `specs/04-bot-discord/SPEC.md` to remove references to exercise-reviewer and AI auto-review.
- **D-11:** Update `specs/01-cerveau-central/SPEC.md` to remove exercise-reviewer from the AI modules list.

### Claude's Discretion
- Exact SQL migration filename numbering (follow existing convention in `supabase/migrations/`)
- Whether to update CONNEXIONS.md if it references exercise-reviewer flows
- Order of cleanup operations (module deletion first vs type cleanup first)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Module to Delete
- `packages/core/src/ai/formation/exercise-reviewer.ts` — The full module to delete

### Barrel Exports to Clean
- `packages/core/src/ai/formation/index.ts` — Lines 1-2: re-exports reviewExercise and ExerciseReviewResult
- `packages/core/src/ai/index.ts` — Lines 21-22: re-exports reviewExercise and ExerciseReviewResult

### Type Definition
- `packages/core/src/types/index.ts` — Line 91: ExerciseStatus union includes 'ai_reviewed'

### Production Code with ai_reviewed References
- `packages/bot-discord/src/handlers/review-buttons.ts` — Lines 56, 121: status checks include ai_reviewed
- `packages/bot-discord/src/commands/admin/review.ts` — Lines 94, 145: ai_reviewed filter and emoji
- `packages/bot-discord/src/commands/admin/approve.ts` — Line 38: pending filter includes ai_reviewed
- `packages/bot-discord/src/commands/admin/revision.ts` — Line 38: pending filter includes ai_reviewed
- `packages/bot-discord/src/utils/format.ts` — Line 12: ai_reviewed emoji mapping

### Test Files to Update
- `packages/core/src/db/formation/exercises.integration.test.ts` — Line 175: expects ai_reviewed in results
- `packages/bot-discord/src/commands/admin/approve.test.ts` — Line 122: fixture with ai_reviewed status
- `packages/bot-discord/src/commands/admin/review.test.ts` — Line 103: fixture with ai_reviewed status
- `packages/bot-discord/src/handlers/review-buttons.test.ts` — Lines 379, 452, 538: tests referencing ai_reviewed

### Specs to Update
- `specs/04-bot-discord/SPEC.md` — References to exercise-reviewer and AI auto-review
- `specs/01-cerveau-central/SPEC.md` — Exercise-reviewer in AI modules list

### DB Migrations (pattern reference)
- `supabase/migrations/` — Existing migration files for numbering convention

### Prior Phase Context
- `.planning/phases/01-remove-ai-auto-review/01-CONTEXT.md` — Phase 1 decisions D-02, D-03 that deferred cleanup to this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Files to Modify (complete list from grep)
- 1 file to DELETE: `exercise-reviewer.ts`
- 2 barrel files to clean: `ai/formation/index.ts`, `ai/index.ts`
- 1 type file: `types/index.ts`
- 5 production files with ai_reviewed: review-buttons.ts, review.ts, approve.ts, revision.ts, format.ts
- 4 test files with ai_reviewed: exercises.integration.test.ts, approve.test.ts, review.test.ts, review-buttons.test.ts

### Established Patterns
- SQL migrations in `supabase/migrations/` with numbered filenames (19 existing files)
- Status filtering uses `.in('status', [...])` in Supabase queries
- Barrel exports chain: `formation/index.ts` -> `ai/index.ts` -> `core/src/index.ts`

### Integration Points
- `packages/core/src/index.ts` — May re-export from `ai/index.ts` (check if exercise-reviewer surfaces there)
- All status filter changes are localized — no cross-package dependencies beyond core types

</code_context>

<specifics>
## Specific Ideas

- Phase 1 D-02 explicitly deferred type union cleanup to this phase: "keep ai_reviewed in the type union until Phase 3 cleanup"
- The migration of old DB records from ai_reviewed to submitted is a safety measure — these exercises were submitted but only auto-reviewed by AI, never actually reviewed by a human
- This is the final phase of the milestone — after this, the codebase is fully clean of AI auto-review artifacts

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-codebase-cleanup*
*Context gathered: 2026-04-01*
