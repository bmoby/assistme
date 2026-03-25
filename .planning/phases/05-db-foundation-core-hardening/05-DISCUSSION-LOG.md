# Phase 5: DB Foundation + Core Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 05-db-foundation-core-hardening
**Areas discussed:** Existing data handling, Bug fix scope, Caller boundary

---

## Existing Data Handling

| Option | Description | Selected |
|--------|-------------|----------|
| No data yet | Prod has no/few exercises — migration runs safely. Add pre-check comment. | |
| Cleanup script | Write separate SQL script to deduplicate before migration. | |
| IF NOT EXISTS guard | CREATE INDEX IF NOT EXISTS + DO block that skips if duplicates detected, logs warning. | ✓ |

**User's choice:** IF NOT EXISTS guard
**Notes:** User prefers defensive migration that never crashes on existing data.

---

## Bug Fix Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Fix now | On touche deja exercises.ts — corriger maintenant coute rien. | ✓ |
| Defer to Phase 6 | Phase 5 = DB foundation seulement. Bug corrige avec handlers. | |

**User's choice:** Fix now (Recommended)
**Notes:** Cost is near zero since we're already modifying exercises.ts.

---

## Caller Update Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 5 | SC2 exige session_id atomique. dm-agent is core/ = core hardening. | ✓ |
| Phase 6 | Phase 5 livre la fonction DB. Phase 6 met a jour les callers. | |

**User's choice:** Phase 5 (Recommended)
**Notes:** Fulfills SC2 end-to-end. dm-agent.ts is in packages/core/, fits "core hardening" scope.

---

## Claude's Discretion

- Migration ordering (single vs multiple migrations)
- Test strategy (follow existing v1.0 patterns)
- submitExercise() API signature cleanup

## Deferred Ideas

None — discussion stayed within phase scope.
