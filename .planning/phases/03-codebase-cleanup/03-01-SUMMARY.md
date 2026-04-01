---
phase: 03-codebase-cleanup
plan: 01
subsystem: ai, database, testing
tags: [exercise-reviewer, ai-review, cleanup, migration, typescript]

# Dependency graph
requires:
  - phase: 01-remove-ai-auto-review
    provides: AI auto-review removed from submission flow
  - phase: 02-session-archiving
    provides: Archived status and archive command
provides:
  - Zero traces of exercise-reviewer module in codebase
  - Zero traces of ai_reviewed status in TypeScript files
  - DB migration converting legacy ai_reviewed records to submitted
  - ExerciseStatus type includes archived, excludes ai_reviewed
  - All specs updated to reflect current state
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Status-based query filters now use single .eq('status', 'submitted') instead of .in(['submitted', 'ai_reviewed'])"

key-files:
  created:
    - supabase/migrations/020_remove_ai_reviewed_status.sql
  modified:
    - packages/core/src/types/index.ts
    - packages/core/src/ai/formation/index.ts
    - packages/core/src/ai/index.ts
    - packages/core/src/db/formation/exercises.ts
    - packages/core/src/ai/formation/dm-agent.ts
    - packages/core/src/ai/formation/tsarag-agent.ts
    - packages/bot-discord/src/handlers/dm-handler.ts
    - packages/bot-discord/src/handlers/review-buttons.ts
    - packages/bot-discord/src/commands/admin/review.ts
    - packages/bot-discord/src/commands/admin/approve.ts
    - packages/bot-discord/src/commands/admin/revision.ts
    - packages/bot-discord/src/utils/format.ts
    - specs/01-cerveau-central/SPEC.md
    - specs/04-bot-discord/SPEC.md
    - specs/04-bot-discord/SPEC-DM-AGENT.md
    - specs/00-infrastructure/SPEC.md
    - specs/ROADMAP.md

key-decisions:
  - "Removed triggerAiReview function and call from dm-handler.ts (dead code after exercise-reviewer deletion)"
  - "Removed setAiReview function from exercises.ts (dead code, never exported or imported)"
  - "Simplified dm-agent pending feedback filter to use reviewed/approved/revision_needed instead of ai_reviewed"

patterns-established:
  - "Exercise queries filter only for status='submitted' (no dual-status patterns)"

requirements-completed: [CLEAN-06]

# Metrics
duration: 13min
completed: 2026-04-01
---

# Phase 03 Plan 01: Exercise Reviewer Cleanup Summary

**Deleted exercise-reviewer.ts module, purged all ai_reviewed references from 19 TypeScript files and 6 spec files, created DB migration for legacy records**

## Performance

- **Duration:** 13 min
- **Started:** 2026-04-01T09:57:24Z
- **Completed:** 2026-04-01T10:10:26Z
- **Tasks:** 2
- **Files modified:** 25 (19 TypeScript + 6 specs/migration)

## Accomplishments
- Deleted exercise-reviewer.ts entirely (199 lines of dead code removed)
- Removed all ai_reviewed status references from 19 TypeScript files across core and bot-discord packages
- Created SQL migration to convert any legacy ai_reviewed records to submitted
- Updated ExerciseStatus type to include archived (from Phase 2) and exclude ai_reviewed
- Updated 5 spec files to reflect current state without AI auto-review
- All 269 unit tests pass, TypeScript compiles cleanly for core and bot-discord

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete exercise-reviewer module and purge all ai_reviewed references** - `00e7d70` (refactor)
2. **Task 2: Create DB migration and update spec files** - `e14904a` (chore)

## Files Created/Modified

### Created
- `supabase/migrations/020_remove_ai_reviewed_status.sql` - Converts legacy ai_reviewed to submitted

### Deleted
- `packages/core/src/ai/formation/exercise-reviewer.ts` - AI exercise review module (199 lines)

### Modified (Core)
- `packages/core/src/types/index.ts` - ExerciseStatus type: removed ai_reviewed, added archived
- `packages/core/src/ai/formation/index.ts` - Removed reviewExercise/ExerciseReviewResult barrel exports
- `packages/core/src/ai/index.ts` - Removed reviewExercise/ExerciseReviewResult barrel exports
- `packages/core/src/db/formation/exercises.ts` - Removed setAiReview function, simplified pending queries
- `packages/core/src/ai/formation/dm-agent.ts` - Simplified pending feedback filter
- `packages/core/src/ai/formation/tsarag-agent.ts` - Simplified pending exercise filters and description

### Modified (Bot Discord)
- `packages/bot-discord/src/handlers/dm-handler.ts` - Removed triggerAiReview function, reviewExercise import, and fire-and-forget call
- `packages/bot-discord/src/handlers/review-buttons.ts` - Simplified status checks and session listing
- `packages/bot-discord/src/commands/admin/review.ts` - Simplified pending filters and AI score display
- `packages/bot-discord/src/commands/admin/approve.ts` - Simplified pending filter
- `packages/bot-discord/src/commands/admin/revision.ts` - Simplified pending filter
- `packages/bot-discord/src/utils/format.ts` - Removed ai_reviewed emoji, simplified progress filter

### Modified (Tests)
- `packages/core/src/db/formation/exercises.integration.test.ts` - Updated assertion
- `packages/core/src/ai/formation/dm-agent.test.ts` - Changed fixture status to reviewed
- `packages/bot-discord/src/commands/admin/approve.test.ts` - Changed fixture status to submitted
- `packages/bot-discord/src/commands/admin/review.test.ts` - Changed fixture status to submitted
- `packages/bot-discord/src/handlers/review-buttons.test.ts` - Updated test descriptions and fixtures
- `packages/bot-discord/src/handlers/dm-handler.test.ts` - Removed triggerAiReview tests and mocks

### Modified (Specs)
- `specs/01-cerveau-central/SPEC.md` - Removed Exercise Reviewer section
- `specs/04-bot-discord/SPEC.md` - Updated submission flow, imports, checklist
- `specs/04-bot-discord/SPEC-DM-AGENT.md` - Removed AI review flow, error case, notification row
- `specs/00-infrastructure/SPEC.md` - Updated status list to include archived
- `specs/ROADMAP.md` - Strikethrough on pre-review IA entry

## Decisions Made
- Removed triggerAiReview function and its fire-and-forget call from dm-handler.ts -- this was dead code that would have called the deleted exercise-reviewer module
- Removed setAiReview function from exercises.ts -- dead code, exported but never imported anywhere
- Simplified dm-agent's pending feedback to filter on reviewed/approved/revision_needed (dropping ai_reviewed entirely) and removed AI score fields from the returned data

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Cleaned ai_reviewed from files not listed in plan**
- **Found during:** Task 1 (code cleanup)
- **Issue:** Plan listed 13 files but grep found ai_reviewed in 12 additional locations across 7 files: exercises.ts (5 refs), dm-handler.ts (2 refs), dm-agent.ts (2 refs), tsarag-agent.ts (3 refs), dm-agent.test.ts (1 ref), dm-handler.test.ts (6 refs), format.ts (1 extra ref)
- **Fix:** Cleaned all references: removed setAiReview function, removed triggerAiReview function + call, simplified all pending filters, cleaned test mocks/fixtures
- **Files modified:** exercises.ts, dm-handler.ts, dm-handler.test.ts, dm-agent.ts, dm-agent.test.ts, tsarag-agent.ts, format.ts
- **Verification:** grep -r 'ai_reviewed' packages/ --include='*.ts' returns zero matches
- **Committed in:** 00e7d70 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Cleaned reviewExercise import and AI review dead code from dm-handler**
- **Found during:** Task 1 (code cleanup)
- **Issue:** dm-handler.ts imported reviewExercise from @assistme/core and had a triggerAiReview function that called it -- both dead code after module deletion
- **Fix:** Removed import, entire triggerAiReview function (80 lines), its call site, and unused getSignedUrl/AttachmentType imports
- **Files modified:** dm-handler.ts, dm-handler.test.ts
- **Verification:** grep -r 'reviewExercise' packages/ returns zero matches
- **Committed in:** 00e7d70 (Task 1 commit)

**3. [Rule 2 - Missing Critical] Cleaned AI review references from SPEC-DM-AGENT.md not listed in plan**
- **Found during:** Task 2 (spec updates)
- **Issue:** SPEC-DM-AGENT.md had 2 additional AI review references: image analysis "review IA" text and "Review IA terminee" notification row
- **Fix:** Removed "dans le cadre de la review IA" from image handling note, removed entire notification table row
- **Files modified:** specs/04-bot-discord/SPEC-DM-AGENT.md
- **Verification:** grep 'ai_reviewed\|ИИ-проверка\|review IA' returns zero matches
- **Committed in:** e14904a (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 2 - missing critical)
**Impact on plan:** All auto-fixes necessary to meet the plan's must_haves ("No TypeScript file contains the string ai_reviewed"). The plan underestimated the number of files containing ai_reviewed references. No scope creep -- all changes directly support the stated objective.

## Issues Encountered
None -- plan executed cleanly once all files were identified.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None -- no stubs, placeholders, or incomplete data flows.

## Next Phase Readiness
- Codebase is fully clean of exercise-reviewer and ai_reviewed artifacts
- DB migration ready to apply (converts any legacy ai_reviewed records to submitted)
- All specs reflect the current state
- This was the only plan in Phase 03 -- phase is complete

---
*Phase: 03-codebase-cleanup*
*Completed: 2026-04-01*
