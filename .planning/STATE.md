---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Exercise Submission Flow
status: planning
stopped_at: Phase 5 context gathered
last_updated: "2026-03-25T09:40:00.657Z"
last_activity: 2026-03-25 — Roadmap v2.0 created
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Un etudiant soumet un exercice proprement (multi-format, apercu, confirmation), le formateur le review facilement, et personne ne se perd dans des doublons ou des soumissions vides.
**Current focus:** Phase 5 — DB Foundation + Core Hardening

## Current Position

Phase: 5 of 7 (DB Foundation + Core Hardening)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-03-25 — Roadmap v2.0 created

Progress: [░░░░░░░░░░] 0% (v2.0 phases only)

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

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- DB migration must run and be applied to prod before any handler changes ship
- Button-based preview/confirm (ActionRowBuilder + awaitMessageComponent) preferred over LLM-driven confirmation — deterministic handler, no Claude misinterpretation risk
- Partial unique index on `(student_id, session_id) WHERE status IN ('submitted', 'ai_reviewed')` — not a full unique constraint, intentionally scoped to active statuses
- Re-submission uses expand-then-contract ordering: upload new files first, delete old records last (fire-and-forget) — never leaves a zero-attachment submitted state

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 4 (admin UX, thread reuse): `client.channels.fetch(threadId)` can return null if thread was manually deleted from Discord — fallback to new thread creation must be explicitly implemented and tested
- Phase 4 (admin UX, AI message update): re-read `event-dispatcher.ts` before implementing `ai_review_complete` handler — existing dispatch lifecycle timing matters

## Session Continuity

Last session: 2026-03-25T09:40:00.650Z
Stopped at: Phase 5 context gathered
Resume file: .planning/phases/05-db-foundation-core-hardening/05-CONTEXT.md
