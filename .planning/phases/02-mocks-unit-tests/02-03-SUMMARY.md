---
phase: 02-mocks-unit-tests
plan: "03"
subsystem: packages/bot-discord
tags: [testing, unit-tests, handlers, discord]
dependency_graph:
  requires: [02-01, 02-05]
  provides: [handler-unit-tests]
  affects: [full-unit-test-suite]
tech_stack:
  added: []
  patterns:
    - drainProcessing() helper for processingLocks async queue pattern
    - TextChannel.prototype base for instanceof checks in test mocks
    - Approach A: mock button-handler to capture registered handlers directly
    - toHaveBeenNthCalledWith for reference-mutated argument verification
key_files:
  created:
    - packages/bot-discord/src/handlers/dm-handler.test.ts
    - packages/bot-discord/src/handlers/admin-handler.test.ts
    - packages/bot-discord/src/handlers/review-buttons.test.ts
  modified: []
decisions:
  - "drainProcessing(ms) helper after __emit: processingLocks queue returns before actual processing completes"
  - "TextChannel.prototype base for admin channel mocks: handleReviewOpen uses instanceof TextChannel in find predicate"
  - "Approach A (capture handlers via mocked registerButton) for review-buttons: handler functions not exported"
  - "toHaveBeenNthCalledWith instead of captured reference inspection: conv.messages mutated after runDmAgent call"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-03-25"
  tasks_completed: 3
  files_created: 3
---

# Phase 02 Plan 03: Handler Unit Tests Summary

Unit tests for the three most complex handlers in `packages/bot-discord`: dm-handler (conversation routing + state), admin-handler (Tsarag agent delegation), and review-buttons (exercise review flow). 33 new tests, all passing.

## What Was Built

### Task 1: dm-handler.test.ts (12 tests)

Covers the full DM message processing pipeline including the processingLocks async queue pattern.

Key behaviors tested:
- Bot messages and guild messages filtered before any processing
- Unknown users still routed to `runDmAgent` (handler does not pre-check student)
- Student DMs routed with correct context (`discordUserId`, `messages`)
- Conversation history accumulated across turns (same conversations Map entry)
- Sequential lock guarantees: two simultaneous emits processed in order
- Image attachments downloaded and passed as `pendingAttachments`
- URL extraction from message content added as `url`-type attachment
- File size limit (25 MB) enforced with error reply, agent not called
- Admin channel notified via `channels.cache.find()` when `submissionId` present
- `runDmAgent` rejection caught, error reply sent, no crash

### Task 2: admin-handler.test.ts (10 tests)

Covers the admin message processing pipeline including the pending action confirmation flow.

Key behaviors tested:
- Bot messages, DM messages, wrong channel, and non-admin users all filtered
- Admin messages in `'админ'` channel routed to `runTsaragAgent`
- Response delivered via `channel.send()` (not `message.reply`)
- Conversation keyed by `channel.id` (not user id)
- Conversation accumulation across turns with `turnMessages` integration
- Pending action stored after first call, passed to second call as `pendingAction`
- `discordActions` object verified to contain all 5 callback functions
- `runTsaragAgent` rejection caught, error reply sent
- `executedActionIds` Set persisted and passed to subsequent calls

### Task 3: review-buttons.test.ts (11 tests)

Uses Approach A (mock `button-handler.ts` to capture registered handlers) to test each handler in isolation.

Key behaviors tested:
- All 4 prefixes registered: `review_open_`, `review_approve_`, `review_revision_`, `review_session_`
- `review_open_`: defers, fetches exercise/student/session, calls `createReviewThread`
- `review_open_`: error paths for exercise not found and already-processed status
- `review_approve_`: updates status to `'approved'`, archives thread, sends DM
- `review_revision_`: updates status to `'revision_needed'`
- Must-be-thread guard for approve/revision (editReply with error if not in thread)
- `review_approve_` error when exercise not found
- `review_session_`: fetches pending exercises, returns embed + button rows
- `review_session_`: empty message when no pending exercises
- `review_session_`: inline `reply()` (not `deferReply`) for invalid session number

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] drainProcessing() required for processingLocks queue**
- **Found during:** Task 1 (dm-handler tests: 5 failing)
- **Issue:** `dm-handler.setupDmHandler` event handler sets up the processingLocks chain but does NOT await `currentLock` before returning. So `client.__emit()` resolves before `processDmMessage` runs. All assertions on agent calls and replies were failing.
- **Fix:** Added `drainProcessing(ms = 50)` helper (`setTimeout(r, ms)`) called after every `__emit`. Used `drainProcessing(100)` for tests with async delays (sequential lock test, admin notification).
- **Files modified:** `dm-handler.test.ts`
- **Applied to:** `admin-handler.test.ts` as well (same lock pattern)

**2. [Rule 1 - Bug] Object reference mutation in toHaveBeenCalledWith**
- **Found during:** Task 1 (state isolation test failing: messages.length was 2 instead of 1)
- **Issue:** `runDmAgent` receives `conv.messages` by reference. After the call, `conv.messages.push(assistantMessage)` mutates the same array. Vitest captures argument references, not snapshots — so `mock.calls[1][0].messages` showed 2 items (including the pushed assistant response).
- **Fix:** Changed assertion to use `toHaveBeenNthCalledWith` with `expect.not.arrayContaining` to verify the old message is absent, and `expect.arrayContaining` to verify the new message is present — both checked at call time via Vitest's matcher semantics.
- **Files modified:** `dm-handler.test.ts`

**3. [Rule 1 - Bug] TextChannel.prototype needed for review_open_ admin channel**
- **Found during:** Task 3 (review_open_ test failing: createReviewThread not called)
- **Issue:** `handleReviewOpen` uses `ch instanceof TextChannel` in its `channels.cache.find()` predicate. Plain object mock always returned undefined, causing early return with 'Canal admin non trouve'.
- **Fix:** Created `makeAdminChannel()` using `Object.create(TextChannel.prototype)` as base with `Object.defineProperties()` for all needed properties.
- **Files modified:** `review-buttons.test.ts`

**4. [Rule 1 - Bug] review-buttons registers `review_session_` not `review_skip_`**
- **Found during:** Task 3 (reading source — plan spec listed `review_skip_`)
- **Issue:** Plan mentioned 4 prefixes including `review_skip_`. Actual source uses `review_session_` (shows pending exercises for a session). Tests written against actual source.
- **Fix:** Tests cover `review_session_` with 3 test cases (happy path, empty, invalid number).
- **Files modified:** `review-buttons.test.ts`

## Self-Check

All 3 test files verified:

```
packages/bot-discord/src/handlers/dm-handler.test.ts — 12 tests PASS
packages/bot-discord/src/handlers/admin-handler.test.ts — 10 tests PASS
packages/bot-discord/src/handlers/review-buttons.test.ts — 11 tests PASS
Total: 33 tests, all passing
```

Commits verified:
- `13b184a`: test(02-03): add dm-handler unit tests (12 passing)
- `3d7092c`: test(02-03): add admin-handler unit tests (10 passing)
- `40d26b8`: test(02-03): add review-buttons unit tests (11 passing)

## Self-Check: PASSED
