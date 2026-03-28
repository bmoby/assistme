---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Exercise Submission Flow
status: Ready to execute
stopped_at: Completed 10-01-PLAN.md
last_updated: "2026-03-28T05:44:30.088Z"
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 11
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Un etudiant soumet un exercice proprement (multi-format, apercu, confirmation), le formateur le review facilement, et personne ne se perd dans des doublons ou des soumissions vides.
**Current focus:** Phase 10 — student-quiz-experience

## Current Position

Phase: 10 (student-quiz-experience) — EXECUTING
Plan: 2 of 3

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
| Phase 08 P01 | 5min | 2 tasks | 7 files |
| Phase 08 P02 | 4min | 2 tasks | 12 files |
| Phase 10-student-quiz-experience P01 | 12min | 1 tasks | 5 files |

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

- [Phase 08-01]: original_txt TEXT column on quizzes provides DATA-06 baseline storage — Supabase Storage deferred if file sizes require it
- [Phase 08-01]: getQuizBySession returns latest quiz for session_number (DESC created_at) to allow quiz replacement per session
- [Phase 08-01]: closeExpiredQuizSessions loops per quiz to correctly calculate partial score per individual session
- [Phase 08-02]: DISCORD_QUIZ_BOT_TOKEN and DISCORD_QUIZ_CLIENT_ID are separate from Formateur bot vars — TeacherBot is a fully independent Discord application
- [Phase 08-02]: bot-discord-quiz has zero runtime dependency on @assistme/bot-discord — clean package isolation
- [Phase 08-02]: Only GatewayIntentBits.Guilds + DirectMessages for Phase 8 scaffold (minimal footprint)
- [Phase 08-02]: quiz-close-expired cron every 30min (not real-time) — adequate for 48h expiry threshold
- [Phase 10-01]: Use SendableChannel union type (DMChannel | TextChannel | NewsChannel | ThreadChannel) instead of TextBasedChannel for quiz flow — PartialGroupDMChannel lacks .send()
- [Phase 10-01]: advanceOrComplete returns StudentQuizSession | null — null on complete signals handlers to clear awaitingOpenAnswer state
- [Phase 10-01]: evaluateOpenAnswer fallback: substring match when JSON.parse fails — avoids crash on malformed Claude response

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 4 (admin UX, thread reuse): `client.channels.fetch(threadId)` can return null if thread was manually deleted from Discord — fallback to new thread creation must be explicitly implemented and tested
- Phase 4 (admin UX, AI message update): re-read `event-dispatcher.ts` before implementing `ai_review_complete` handler — existing dispatch lifecycle timing matters

## Session Continuity

Last session: 2026-03-28T05:44:30.083Z
Stopped at: Completed 10-01-PLAN.md
Resume file: None
