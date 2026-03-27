# Phase 7: Admin Review UX + Test Coverage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 07-admin-review-ux-test-coverage
**Areas discussed:** Thread content on re-submission, Thread deletion fallback, AI review update mechanism, Test strategy

---

## Thread Content on Re-submission

| Option | Description | Selected |
|--------|-------------|----------|
| Audit trail (add new content) | Post separator + new content in existing thread, formateur sees progression | ✓ |
| Clear/collapse old content | Remove or collapse old messages, show only latest submission | |

**User's choice:** Audit trail — add new content to existing thread with separator
**Notes:** Simpler to implement, preserves review history for formateur

---

## Thread Deletion Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Create new thread silently | If thread was manually deleted, create fresh thread without alerting admin | ✓ |
| Alert admin | Notify admin that the thread was deleted and a new one was created | |

**User's choice:** Create new thread silently
**Notes:** If someone deleted it manually, they intended to. No noise needed.

---

## AI Review Update Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Event-dispatcher pattern | Extend ai_review_complete event handler to also update thread AI message | |
| Direct update in triggerAiReview | After saving AI review, check review_thread_ai_message_id and edit directly | ✓ |

**User's choice:** Direct update in triggerAiReview
**Notes:** Initially recommended event-dispatcher for consistency, but user questioned this. Key insight: the thread may not exist when AI review completes (depends on when admin clicks "Ouvrir review"). Direct update is simpler — if thread exists, edit; if not, createReviewThread will show real review. No cron delay, no event-dispatcher changes needed. Notification update stays in event-dispatcher (different concern, already works).

---

## Test Strategy for TST-01

| Option | Description | Selected |
|--------|-------------|----------|
| Unit + integration | Unit tests for idempotency/thread-reuse logic, integration tests for DB thread ID persistence | ✓ |
| Unit only | Unit tests with mocked DB | |
| Unit + integration + E2E | Full coverage including E2E Discord thread tests | |

**User's choice:** Unit + integration, skip E2E update
**Notes:** E2E thread testing requires real Discord threads — not worth the complexity for this phase.

---

## Claude's Discretion

- Separator message format in thread for re-submissions
- Thread unarchive error handling (fallback to new thread)
- Test file organization (follow existing patterns)

## Deferred Ideas

None — discussion stayed within phase scope.
