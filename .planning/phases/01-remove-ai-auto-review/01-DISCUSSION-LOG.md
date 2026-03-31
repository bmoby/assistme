# Phase 1: Remove AI Auto-Review - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 01-remove-ai-auto-review
**Areas discussed:** ai_reviewed status, notification embed, review thread, student DM
**Mode:** --auto (all decisions auto-selected)

---

## ai_reviewed Status Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Treat as submitted | Keep ai_reviewed in type union, treat as equivalent to submitted for filtering | auto |
| Migrate to submitted | DB migration to change all ai_reviewed to submitted | |
| Remove from type | Remove ai_reviewed from ExerciseStatus type immediately | |

**User's choice:** [auto] Treat as submitted (recommended default)
**Notes:** Simplest migration path. No data loss. Code keeps working during transition. Type cleanup deferred to Phase 3.

---

## Notification Embed Simplification

| Option | Description | Selected |
|--------|-------------|----------|
| Just show submission details | Remove AI section, keep student/session/files/resubmission info | auto |
| Add placeholder text | Replace AI section with "En attente de review" | |
| Redesign embed | New embed layout without AI section | |

**User's choice:** [auto] Just show submission details (recommended default)
**Notes:** Remove the AI fields entirely, no placeholder needed. The embed already has all the useful info.

---

## Review Thread Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Remove AI message only | Thread: submission + buttons (no AI placeholder) | auto |
| Add manual review prompt | Replace AI message with "Review en attente du formateur" | |

**User's choice:** [auto] Remove AI message only (recommended default)
**Notes:** Thread structure simplified. Submission message + action buttons directly.

---

## Student DM

| Option | Description | Selected |
|--------|-------------|----------|
| Simple acknowledgment | Just "received, thank you" in Russian | auto |
| Acknowledgment + stats | "Received! You've submitted 3/5 exercises" | |

**User's choice:** [auto] Simple acknowledgment (recommended default — per user requirement CLEAN-04)
**Notes:** User explicitly requested no gamification. Just "received".

---

## Claude's Discretion

- Exact Russian wording of acknowledgment DM
- Log level for removal traces (info vs debug)
- Whether to add code comments noting intentional removal
