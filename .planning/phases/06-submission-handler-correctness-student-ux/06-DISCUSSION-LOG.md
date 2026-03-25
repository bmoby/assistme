# Phase 6: Submission Handler Correctness + Student UX - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 06-submission-handler-correctness-student-ux
**Areas discussed:** Preview-confirm trigger, Session selection UX, Re-submission flow, Empty submission rules

---

## Preview-Confirm Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Intercept create_submission | Handler intercepts agent's tool call, shows embed + buttons, commits to DB only after click | ✓ |
| Agent asks, handler confirms | Claude asks 'Confirm?' in text, handler detects and shows buttons as second step | |
| Handler-driven accumulate mode | Handler manages entire flow, Claude only called after confirmation | |

**User's choice:** Intercept create_submission
**Notes:** Deterministic handler controls the flow. Agent stays unaware of buttons.

### Follow-up: Button Timeout

| Option | Description | Selected |
|--------|-------------|----------|
| 2 minutes | Buttons disable after 2 min, attachments stay for retry | ✓ |
| 5 minutes | More relaxed timeout | |
| No timeout | Buttons stay forever | |

**User's choice:** 2 minutes

---

## Session Selection UX

| Option | Description | Selected |
|--------|-------------|----------|
| Keep Claude natural language | Student says 'session 3', Claude extracts via tool. Handler validates in DB. | ✓ |
| Slash command /submit <session> | Structured command, bypasses Claude | |
| Bot prompts with numbered menu | Select dropdown with available sessions | |

**User's choice:** Keep Claude natural language
**Notes:** Minimal change. Handler adds DB validation step before preview.

---

## Re-submission Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Update in-place | Same row, status reset, submission_count++, review_history keeps audit trail | ✓ |
| Archive old + create new | Old marked 'superseded', new record created | |
| Soft-delete old + create new | Old soft-deleted, new created, needs schema change | |

**User's choice:** Update in-place
**Notes:** One row per student+session. review_history array preserves full history.

---

## Empty Submission Rules

| Option | Description | Selected |
|--------|-------------|----------|
| No attachments AND no meaningful text | Reject only if both empty. Text-only submissions valid. Handler-level check. | ✓ |
| No attachments (strict) | Require at least one file/URL. Text-only blocked. | |
| Agent decides | Let Claude judge content sufficiency. Non-deterministic. | |

**User's choice:** No attachments AND no meaningful text
**Notes:** Check at handler level when intercepting create_submission, before showing preview.

---

## Claude's Discretion

- Preview embed formatting and fields
- DM agent prompt tweaks for better create_submission guidance
- Russian-language error message wording

## Deferred Ideas

None — discussion stayed within phase scope.
