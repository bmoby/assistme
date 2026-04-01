# Phase 3: Codebase Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 03-codebase-cleanup
**Areas discussed:** ai_reviewed DB records, Spec synchronization, Barrel export cleanup scope
**Mode:** --auto (all decisions auto-selected)

---

## ai_reviewed DB Records

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate old records to `submitted` via SQL | One-line UPDATE migration, keeps DB consistent with TypeScript types | ✓ |
| Leave orphaned in DB | No migration, but text column values won't match TypeScript type union | |
| Add deprecation comment in type | Keep `ai_reviewed` in union with comment, remove later | |

**User's choice:** [auto] Migrate old records to `submitted` via SQL (recommended default)
**Notes:** Leaving orphaned status values creates a mismatch between TypeScript types and DB reality. A simple UPDATE keeps things clean. These records were never reviewed by a human.

---

## Spec Synchronization

| Option | Description | Selected |
|--------|-------------|----------|
| Update specs as part of this phase | Remove exercise-reviewer references from SPEC.md files | ✓ |
| Defer spec updates | Update specs separately after all code changes | |
| Skip spec updates | Specs are informational, not blocking | |

**User's choice:** [auto] Update specs as part of this phase (recommended default)
**Notes:** Spec-first methodology requires specs to stay synchronized. Removing a module without updating the spec creates a documented feature that doesn't exist.

---

## Barrel Export Cleanup Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Only remove exercise-reviewer exports | Strictly scoped to CLEAN-06 requirement | ✓ |
| Opportunistic cleanup of all dead exports | Scan for other unused exports while touching barrel files | |

**User's choice:** [auto] Only remove exercise-reviewer exports (recommended default)
**Notes:** Keep the phase strictly scoped to CLEAN-06. No opportunistic cleanup of unrelated exports.

---

## Claude's Discretion

- SQL migration filename numbering (follow existing convention)
- Whether to update CONNEXIONS.md if it references exercise-reviewer
- Order of cleanup operations

## Deferred Ideas

None — discussion stayed within phase scope
