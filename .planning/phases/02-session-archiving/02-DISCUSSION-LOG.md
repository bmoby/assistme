# Phase 2: Session Archiving - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 02-session-archiving
**Areas discussed:** DB migration, command design, digest filtering, confirmation flow
**Mode:** --auto (all decisions auto-selected)

---

## DB Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| TypeScript type only | Add to ExerciseStatus union, no SQL migration (column is text) | auto |
| SQL migration | Add CHECK constraint or enum migration | |

**User's choice:** [auto] TypeScript type only (recommended)
**Notes:** Status column is plain text, no DB constraint to change.

---

## Command Design

| Option | Description | Selected |
|--------|-------------|----------|
| Session number param | Integer param with autocomplete listing sessions | auto |
| Session name param | String param matching session title | |
| Interactive selection | Show list, user picks | |

**User's choice:** [auto] Session number parameter (recommended)
**Notes:** Consistent with existing /session commands. Autocomplete for discoverability.

---

## Digest/Notification Filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Filter at query level | Update getPendingExercises and getExerciseSummary to exclude archived | auto |
| Filter at display level | Keep queries, filter in cron/command code | |

**User's choice:** [auto] Filter at query level (recommended)
**Notes:** Centralized filtering prevents leaks. All consumers benefit.

---

## Confirmation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Ephemeral confirmation | Show count, require button click before executing | auto |
| No confirmation | Execute immediately | |
| DM confirmation | Send confirmation to admin DM | |

**User's choice:** [auto] Ephemeral confirmation (recommended)
**Notes:** Archiving is a batch operation — confirmation prevents accidental archives.

---

## Claude's Discretion

- Whether to add /unarchive-session
- Exact message wording
- Autocomplete scope (all sessions vs only those with pending exercises)
