# Roadmap: Simplification Flow Exercices

## Overview

This refactoring strips the unreliable AI auto-review from the exercise submission flow, adds session-based archiving for the trainer, and cleans up dead code. Three phases: first make the flow work without AI, then add archiving, then sweep the codebase clean.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Remove AI Auto-Review** - Strip AI scoring, placeholder, and feedback from the entire exercise submission flow
- [ ] **Phase 2: Session Archiving** - Add archived status and admin command to archive exercises by session
- [ ] **Phase 3: Codebase Cleanup** - Remove exercise-reviewer module and all dead references

## Phase Details

### Phase 1: Remove AI Auto-Review
**Goal**: Exercises flow from submission to admin review without any AI involvement -- no auto-score, no AI placeholder, no AI feedback to students
**Depends on**: Nothing (first phase)
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04, CLEAN-05
**Success Criteria** (what must be TRUE):
  1. Student submits an exercise and receives a simple acknowledgment DM (in Russian) with no score or AI feedback
  2. Admin notification in #admin channel shows exercise details without any AI score or recommendation
  3. Review thread is created with full context but no AI placeholder message or pending AI review indicator
  4. Exercise status transitions directly from `submitted` to admin review states -- the `ai_reviewed` status is never set for new submissions
**Plans**: TBD

Plans:
- [ ] 01-01: TBD

### Phase 2: Session Archiving
**Goal**: Trainer can archive all exercises for a completed session with one command, keeping them queryable but out of active workflows
**Depends on**: Phase 1
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04
**Success Criteria** (what must be TRUE):
  1. Admin runs `/archive-session` with a session identifier and all exercises for that session move to `archived` status
  2. Archived exercises no longer appear in admin notifications or digest summaries
  3. Archived exercises remain queryable in the database -- no data is deleted
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Codebase Cleanup
**Goal**: The exercise-reviewer module and all its references are removed from the codebase -- no dead code remains
**Depends on**: Phase 2
**Requirements**: CLEAN-06
**Success Criteria** (what must be TRUE):
  1. The file `packages/core/src/ai/formation/exercise-reviewer.ts` is deleted or emptied
  2. No file in the monorepo imports or references `exercise-reviewer` (verified by grep)
  3. `pnpm typecheck` and `pnpm test:unit` pass with zero errors after removal
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Remove AI Auto-Review | 0/0 | Not started | - |
| 2. Session Archiving | 0/0 | Not started | - |
| 3. Codebase Cleanup | 0/0 | Not started | - |
