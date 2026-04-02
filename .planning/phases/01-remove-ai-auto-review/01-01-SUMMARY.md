---
phase: 01-remove-ai-auto-review
plan: 01
subsystem: discord, ai-agents, event-system
tags: [discord.js, exercise-review, ai-removal, review-thread]

# Dependency graph
requires: []
provides:
  - AI review fire-and-forget call removed from dm-handler submission flow
  - AI placeholder message no longer created in review threads
  - Admin notification embed stripped of AI score and recommendation fields
  - Student DM simplified to acknowledgment only (no AI feedback)
  - ai_review_complete event no longer processed by event dispatcher
  - formatProgressEmbed counts only submitted (not ai_reviewed) as pending
affects: [02-session-archiving, 03-cleanup-dead-code]

# Tech tracking
tech-stack:
  added: []
  removed: []
  changed: []
---

# Plan 01-01: Strip AI Auto-Review from Submission Flow

## Result: COMPLETE

All tasks executed successfully. AI auto-review has been fully disconnected from the exercise submission flow.

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Remove AI review trigger, notification fields, and event handler | Done | `2309df2` |
| 2 | Remove AI placeholder from review threads | Done | `405c066` |

## Key Changes

### dm-handler.ts
- Removed `triggerAiReview()` function and its fire-and-forget call after submission
- Removed import of `reviewExercise` from exercise-reviewer
- Exercises now stay in `submitted` status after upload (no AI transition)

### format.ts
- Removed AI score/recommendation fields from `formatSubmissionNotification`
- Removed AI score from `formatStudentFeedbackDM`
- Updated `formatProgressEmbed` to count only `submitted` as pending

### event-dispatcher.ts
- Removed `ai_review_complete` event case handler

### review-thread.ts
- Removed AI placeholder message creation in `createReviewThread`
- Removed AI message editing in `reuseReviewThread`
- Thread structure now: submission content + action buttons (no AI message in between)
- `review_thread_ai_message_id` no longer set for new submissions

### review-thread.test.ts
- Updated tests to verify no AI message is created
- Removed test expectations for AI placeholder

## Verification

- `pnpm test:unit`: 34 files, 269 tests passed, 0 failures
- `pnpm typecheck`: core and bot-discord pass (pre-existing quiz-bot issue unrelated)

## Self-Check: PASSED

All acceptance criteria met:
- No `reviewExercise` or `triggerAiReview` calls in dm-handler
- No AI placeholder message in review thread creation
- No AI score fields in admin notification embed
- Student DM contains only acknowledgment text
- Event dispatcher has no ai_review_complete handler

## key-files

### created
(none)

### modified
- packages/bot-discord/src/handlers/dm-handler.ts
- packages/bot-discord/src/utils/format.ts
- packages/bot-discord/src/cron/event-dispatcher.ts
- packages/bot-discord/src/utils/review-thread.ts
- packages/bot-discord/src/utils/review-thread.test.ts

### deleted
(none)
