---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Exercise Submission Flow
status: Phase complete — ready for verification
stopped_at: Completed 07-02-PLAN.md
last_updated: "2026-03-27T07:40:57.453Z"
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Un etudiant soumet un exercice proprement (multi-format, apercu, confirmation), le formateur le review facilement, et personne ne se perd dans des doublons ou des soumissions vides.
**Current focus:** Phase 07 — admin-review-ux-test-coverage

## Current Position

Phase: 07 (admin-review-ux-test-coverage) — EXECUTING
Plan: 2 of 2

## Performance Metrics

**Velocity (v2.0):**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*
| Phase 05 P01 | 5min | 2 tasks | 6 files |
| Phase 05 P02 | 5min | 1 tasks | 1 files |
| Phase 06 P01 | 7min | 2 tasks | 4 files |
| Phase 06 P02 | 6min | 1 tasks | 1 files |
| Phase 07 P01 | 15min | 2 tasks | 5 files |
| Phase 07-admin-review-ux-test-coverage P02 | 9min | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- DB migration must run and be applied to prod before any handler changes ship
- Button-based preview/confirm (ActionRowBuilder + awaitMessageComponent) preferred over LLM-driven confirmation — deterministic handler, no Claude misinterpretation risk
- Partial unique index on `(student_id, session_id) WHERE status IN ('submitted', 'ai_reviewed')` — not a full unique constraint, intentionally scoped to active statuses
- Re-submission uses expand-then-contract ordering: upload new files first, delete old records last (fire-and-forget) — never leaves a zero-attachment submitted state
- [Phase 05]: DO block with duplicate detection before index creation for safe production migration
- [Phase 05]: Keep getPendingExercisesBySession(sessionNumber) signature to avoid breaking callers; resolve UUID internally
- [Phase 05]: Use DB-generated UUIDs for student test fixtures (students.id is UUID column)
- [Phase 05]: Verify unique index via 23505 error behavior (Supabase JS cannot query pg_indexes)
- [Phase 06]: DM agent returns SubmissionIntent instead of executing DB write — handler owns full submission lifecycle
- [Phase 06]: uploadFileToStorage and triggerAiReview moved from dm-agent.ts to dm-handler.ts — submission logic belongs in handler layer
- [Phase 06]: Need to set student mock in every submission flow test — handleSubmissionIntent calls getStudentByDiscordId before empty/session checks
- [Phase 06]: makeReplyMessageMock(null) triggers timeout path, makeReplyMessageMock(customId) simulates button click
- [Phase 07]: createReviewThread owns all DB persistence for review_thread_id + review_thread_ai_message_id — callers must not call updateExercise for these IDs
- [Phase 07]: resubmitExercise clears review_thread_ai_message_id but preserves review_thread_id — thread persists for reuse across re-submissions
- [Phase 07]: AI message edit in triggerAiReview uses formatReviewThreadMessages with [] attachments — safe because aiReviewMsg does not depend on attachments
- [Phase 07]: triggerAiReview only reachable from executeSubmission when storagePaths.length > 0 — test via full submission flow (submissionIntent + confirm + file attachment)
- [Phase 07]: setArchived failure fallback bug in review-thread.ts: fixed with unarchiveSucceeded flag — catch block without success guard silently continues reuse path

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 4 (admin UX, thread reuse): `client.channels.fetch(threadId)` can return null if thread was manually deleted from Discord — fallback to new thread creation must be explicitly implemented and tested
- Phase 4 (admin UX, AI message update): re-read `event-dispatcher.ts` before implementing `ai_review_complete` handler — existing dispatch lifecycle timing matters

## Session Continuity

Last session: 2026-03-27T07:40:57.447Z
Stopped at: Completed 07-02-PLAN.md
Resume file: None
