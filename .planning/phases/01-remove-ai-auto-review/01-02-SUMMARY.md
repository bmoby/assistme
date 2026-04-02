---
phase: 01-remove-ai-auto-review
plan: 02
subsystem: database, ai-agents, discord
tags: [supabase, exercise-status, backward-compat, discord.js, claude-tools]

# Dependency graph
requires:
  - phase: 01-remove-ai-auto-review plan 01
    provides: AI review removed from submission flow (dm-handler, review-thread)
provides:
  - DB queries filter pending exercises by submitted only (not ai_reviewed)
  - Agent tools (dm-agent, tsarag-agent) no longer reference ai_reviewed
  - Review buttons session listing no longer shows Score IA
  - Backward compat preserved for old ai_reviewed exercises in review buttons
affects: [03-cleanup-dead-code, session-archiving]

# Tech tracking
tech-stack:
  added: []
  patterns: [submitted-only-pending-filter, backward-compat-status-check]

key-files:
  created: []
  modified:
    - packages/core/src/db/formation/exercises.ts
    - packages/core/src/ai/formation/dm-agent.ts
    - packages/core/src/ai/formation/dm-agent.test.ts
    - packages/core/src/ai/formation/tsarag-agent.ts
    - packages/bot-discord/src/handlers/review-buttons.ts

key-decisions:
  - "Removed dead setAiReview function from exercises.ts (never called after AI review removal)"
  - "Kept ai_reviewed backward compat checks in review-buttons handleReviewOpen and handleReviewDecision"

patterns-established:
  - "Pending exercise = submitted status only (no ai_reviewed)"
  - "Review buttons accept both submitted and ai_reviewed for backward compat with old data"

requirements-completed: [CLEAN-05]

# Metrics
duration: 5min
completed: 2026-03-31
---

# Phase 01 Plan 02: Update Status Filters Summary

**All pending exercise queries and agent filters now use submitted-only logic, with backward compat preserved for old ai_reviewed exercises in review buttons**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-31T07:45:21Z
- **Completed:** 2026-03-31T07:50:28Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Removed ai_reviewed from all 4 DB query locations in exercises.ts (3 Supabase .eq() + 1 JS filter)
- Removed ai_reviewed from dm-agent get_pending_feedback tool filter and response mapping
- Removed ai_reviewed from tsarag-agent list_pending_exercises tool description and 2 filter expressions
- Removed Score IA display from review-buttons handleReviewSession listing
- Preserved backward compat: review buttons still accept ai_reviewed status for old exercises

## Task Commits

Each task was committed atomically:

1. **Task 1: Update DB queries and agent filters to remove ai_reviewed from pending logic** - `7857632` (fix)
2. **Task 2: Update review-buttons to handle ai_reviewed backward compat and remove Score IA display** - `818c935` (fix)

## Files Created/Modified
- `packages/core/src/db/formation/exercises.ts` - Removed ai_reviewed from 3 query filters, 1 JS filter, and dead setAiReview function
- `packages/core/src/ai/formation/dm-agent.ts` - Removed ai_reviewed from get_pending_feedback filter and AI review data mapping
- `packages/core/src/ai/formation/dm-agent.test.ts` - Updated fixture from ai_reviewed to approved status
- `packages/core/src/ai/formation/tsarag-agent.ts` - Updated tool description and 2 pending exercise filters
- `packages/bot-discord/src/handlers/review-buttons.ts` - Removed Score IA display from session listing

## Decisions Made
- Removed the dead `setAiReview` function from exercises.ts as Rule 2 deviation -- it was the mechanism that set ai_reviewed status, and with AI review removed it is unreachable dead code
- Kept backward compat checks in review-buttons as specified by D-16 -- old exercises with ai_reviewed status can still be opened and reviewed via buttons

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Dead Code] Removed setAiReview function from exercises.ts**
- **Found during:** Task 1 (DB query updates)
- **Issue:** The setAiReview function explicitly sets status to 'ai_reviewed' -- with AI review removed from the flow, this function is dead code and was the last ai_reviewed reference in exercises.ts
- **Fix:** Removed the entire setAiReview function (17 lines)
- **Files modified:** packages/core/src/db/formation/exercises.ts
- **Verification:** grep confirms 0 ai_reviewed references in exercises.ts; all 272 tests pass; typecheck passes for core and bot-discord
- **Committed in:** 7857632 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 dead code removal, Rule 2)
**Impact on plan:** Essential cleanup to meet acceptance criteria. No scope creep.

## Issues Encountered
- Pre-existing typecheck failure in bot-discord-quiz (mockBuildQuestionEmbed/mockBuildOpenQuestionEmbed not in type) -- unrelated to this plan's changes, out of scope

## Known Stubs
None -- all changes are removals/simplifications with no new stubs introduced.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All pending exercise queries now use submitted-only logic
- ai_reviewed status is completely absent from exercises.ts, dm-agent.ts, and tsarag-agent.ts
- Review buttons maintain backward compat for old data
- Ready for Phase 3 cleanup of dead ai_reviewed references in types and any remaining files

## Self-Check: PASSED

All 5 modified files exist. Both task commits (7857632, 818c935) verified in git log. SUMMARY.md created.

---
*Phase: 01-remove-ai-auto-review*
*Completed: 2026-03-31*
