# Project Research Summary

**Project:** Exercise Submission Flow — Bot Discord v2.0
**Domain:** Discord.js v14 interaction patterns, Supabase constraint design, multi-message DM flow hardening
**Researched:** 2026-03-25
**Confidence:** HIGH

## Executive Summary

This milestone is a hardening and UX improvement pass on an already-working exercise submission system. The core architecture (DM agent, multi-message accumulation, review threads, admin buttons) is fully built and in production. The research confirms that no new dependencies or packages are required — all required Discord.js APIs (`awaitMessageComponent`, `ActionRowBuilder`, `ButtonBuilder`, `ThreadChannel.setArchived`) and Supabase patterns (`.maybeSingle()`, partial unique index) exist in the already-installed versions (`discord.js 14.16.0`, `@supabase/supabase-js 2.49.1`). This is a code-addition and schema-hardening milestone, not a dependency-addition milestone.

The recommended approach is to address correctness gaps before UX improvements, in strict dependency order: DB migration first (unique index + new columns), then type updates, then DB function additions, then application-layer guards, then review UX improvements. This order ensures every change stands on solid schema foundations and prevents the most dangerous bugs (silent duplicate submissions, non-atomic session linking, empty exercise records) from ever entering the codebase. Tests are mandatory for all changes per project constraints — each phase includes unit test coverage as a completion criterion.

The primary risks are not technical unknowns. They are well-understood gaps in the existing code that have not caused production incidents only because of low student volume. The critical risk cluster is three-way: no DB-level uniqueness constraint (Pitfall 2), non-atomic `session_id` assignment (Pitfall 3), and orphaned attachment state after partial failures (Pitfall 5). All three must be resolved in the migration and core phases before any handler-level changes are made.

---

## Key Findings

### Recommended Stack

No new dependencies are required. The entire milestone is implemented using existing packages: `discord.js 14.16.0` for all Discord interaction APIs (message component collectors, embed builders, thread management), `@supabase/supabase-js 2.49.1` for DB operations (partial unique index, `.maybeSingle()` queries, targeted updates), and the existing `packages/core` type system. Adding `bullmq`, `discord-collector` wrappers, or raw `pg` client would be active anti-patterns here.

The one design decision with long-term implications: the preview/confirmation flow should use a Discord button (`ActionRowBuilder` + `awaitMessageComponent`) rather than a purely conversational Claude-driven confirmation. The button provides a deterministic `ButtonInteraction` handler that cannot be misinterpreted, while conversational confirmation is LLM-dependent and has a documented failure class (Claude sometimes skips the preview step or misreads a vague student reply as confirmation).

**Core technologies:**
- `discord.js 14.16.0`: `awaitMessageComponent`, `EmbedBuilder`, `ActionRowBuilder<ButtonBuilder>`, `ThreadChannel.setArchived`, `ButtonInteraction.deferUpdate` — all available, all verified in official docs and existing codebase
- `@supabase/supabase-js 2.49.1`: partial unique index via migration, `.maybeSingle()` for "find or null" queries, targeted `update` for thread ID storage — no new patterns needed
- `Vitest` (existing v1.0 infrastructure): mandatory for all changes per project constraints; unit tests per phase, integration tests for full flow verification

### Expected Features

**Must have (table stakes — correctness blockers):**
- Empty submission rejected before DB write — currently the agent can create an empty exercise record with no content
- DB unique constraint `(student_id, session_id)` — uniqueness is application-layer only; race condition risk at DB level
- `session_id` written atomically in the INSERT, not as a separate UPDATE — currently non-atomic; silent data loss risk on crash
- Preview confirmation before `create_submission` fires — LLM-only confirmation is unreliable; button gate is the correct fix
- Re-submission uses upload-before-delete ordering — current order risks an empty-attachment submitted state on crash

**Should have (UX differentiators):**
- Review thread reuse on re-submission (`review_thread_id` column + `setArchived` + reuse logic) — admin loses continuity when a new thread is created each time
- AI review message live-updated in thread via `ai_review_complete` event — currently the "en cours..." placeholder is never replaced
- Cancel mid-flow tool that resets `pendingAttachments` — no current escape valve except 30-minute conversation timeout
- Batch student queries in `handleReviewSession` (single `.in()` call) — currently N+1 sequential DB calls for up to 30 students

**Defer (polish / v2+ pass):**
- Thread name uniqueness suffix (append `exercise.id.slice(0, 8)`) — low-probability edge case at current student volume
- Signed URL refresh on thread open (7-day expiry issue) — affects archived reviews only, not active review flows
- `SELECT ... FOR UPDATE` advisory lock for concurrent admin clicks — unnecessary overhead at single-admin scale
- Student-facing progress dashboard or slash commands — explicitly out of scope per PROJECT.md

### Architecture Approach

All changes are contained within the existing layered architecture. The key boundary to preserve: `dm-agent.ts` must remain a pure function from `dm-handler.ts`'s perspective — it receives context, returns a result, and must not reach into the handler's in-memory state. The only outbound coupling is `DmAgentResponse.submissionId`, which signals the handler to clear `pendingAttachments`. Adding `submissionPhase` state tracking to `ConversationState` is explicitly rejected — it would couple the handler to Claude's language choices. Phase tracking stays in Claude's message context; the handler only enforces structural invariants (lock serialization, pendingAttachments lifecycle, conversation TTL).

**Major components and their change surface:**
1. `supabase/migrations/0XX_exercise_submission_v2.sql` — new file: `review_thread_id`, `review_thread_ai_message_id` nullable columns + partial unique index on `(student_id, session_id) WHERE status IN ('submitted', 'ai_reviewed')`
2. `packages/core/src/types/index.ts` — add two new nullable fields to `StudentExercise` interface
3. `packages/core/src/db/formation/exercises.ts` — add `getExerciseByStudentAndSession()` (`.maybeSingle()` pattern), add `updateExerciseThreadId()`; fold `session_id` into `submitExercise` INSERT (remove separate bare UPDATE)
4. `packages/core/src/ai/formation/dm-agent.ts` — add empty-submission guard; strengthen system prompt; invert attachment ordering in re-submission path
5. `packages/bot-discord/src/utils/review-thread.ts` — accept optional `existingThread?: ThreadChannel`; capture and return AI message ID
6. `packages/bot-discord/src/handlers/review-buttons.ts` — check `review_thread_id` before creating thread; store thread ID after creation; replace dynamic import with static import
7. `packages/bot-discord/src/cron/event-dispatcher.ts` — add `ai_review_complete` handler to edit thread AI message

### Critical Pitfalls

1. **Button double-click creates duplicate review threads (Pitfall 1)** — Write `review_thread_id` to DB before `adminChannel.threads.create()`; guard `handleReviewOpen` with early return if `exercise.review_thread_id` is already set
2. **No DB unique constraint on `(student_id, session_id)` (Pitfall 2)** — Add partial unique index before any handler changes; handle `23505` Postgres error code explicitly in `submitExercise`
3. **Non-atomic `session_id` assignment — bare UPDATE after INSERT (Pitfall 3)** — Fold `session_id` into the `submitExercise` INSERT parameters; delete the separate UPDATE from `handleCreateSubmission`
4. **Re-submission deletes old attachments before uploading new ones (Pitfall 4)** — Invert to expand-then-contract: upload new files first, status transition second, delete old records last (fire-and-forget)
5. **Orphaned `pendingAttachments` on partial failure corrupt next submission (Pitfall 5)** — Clear `pendingAttachments` in the `catch` block, not only on success; currently only the success path resets this state
6. **`vi.mock('@assistme/core')` silently no-ops in bot-discord tests due to pnpm symlink split (Pitfall 6)** — Already resolved in v1.0 Vitest config via `resolve.alias`; verify new test files respect the same config

---

## Implications for Roadmap

Based on combined research, the correct phase structure follows strict dependency order. Schema and type foundations must be locked before application logic is touched. All phases require Vitest test coverage as a completion criterion per project constraints.

### Phase 1: DB Foundation + Types

**Rationale:** Every other change in this milestone depends on the schema being correct. The partial unique index, the two new nullable columns, and the type update are prerequisites for all downstream TypeScript changes. This phase has zero risk of breaking existing behavior — all new columns are nullable with NULL defaults; the partial unique index only applies to active statuses and does not affect existing rows.

**Delivers:** Migration `0XX_exercise_submission_v2.sql` applied locally (and to production before any other phase ships); `StudentExercise` interface updated with `review_thread_id: string | null` and `review_thread_ai_message_id: string | null`; `pnpm typecheck` passes clean; existing migrations unaffected.

**Addresses:** Pitfall 2 (unique constraint prerequisite), Pitfall 1 (review_thread_id column prerequisite), admin review UX thread reuse (column prerequisite)

**Avoids:** Working on handler changes before the schema is ready, which would require a second migration pass to add columns

### Phase 2: Core DB Module Hardening

**Rationale:** With types locked, the DB functions that all handlers depend on can be hardened atomically. The non-atomic `session_id` assignment (Pitfall 3) must be fixed here before the submission handler changes in Phase 3 add new code paths that might perpetuate the old pattern.

**Delivers:** `getExerciseByStudentAndSession()` with `.maybeSingle()` (targeted query replacing linear scan); `updateExerciseThreadId()` (typed convenience wrapper); `submitExercise()` refactored to accept and write `session_id` in the INSERT in one round-trip; Pitfall 3 eliminated. Unit tests for all new and modified DB functions.

**Uses:** Partial unique index from Phase 1; updated `StudentExercise` type from Phase 1

**Avoids:** Pitfall 3 (non-atomic session_id), N+1 student query pattern (Pitfall 9 — batch-fetch with `.in()` added to student module)

### Phase 3: Submission Handler Correctness

**Rationale:** The highest-value, lowest-risk application changes. The empty-submission guard and the re-submission attachment ordering fix are isolated changes with no downstream dependencies. They can be tested with pure unit tests — no Discord gateway, no real DB required. The system prompt hardening completes the correctness layer without adding code complexity.

**Delivers:** Empty submission guard at the top of `handleCreateSubmission()` (returns `empty_submission` error before any DB write); re-submission attachment order inverted to upload-first / delete-last (Pitfall 4 eliminated); system prompt strengthened to forbid `create_submission` when `pendingAttachments` is empty; `pendingAttachments` cleared on all error paths in the `catch` block (Pitfall 5 eliminated); `storageIdx` replaced by index-keyed Map to prevent attachment misalignment (Pitfall 11). Unit tests for all new guard paths including error cases.

**Addresses:** FEATURES.md table-stakes items: empty submission validation, attachment ordering safety

**Avoids:** Pitfall 4 (delete-before-upload), Pitfall 5 (orphaned attachments), Pitfall 11 (storageIdx misalignment)

### Phase 4: Admin Review UX — Thread Reuse + AI Message Update

**Rationale:** These improvements have the most moving parts (thread unarchive, event dispatcher integration, new DB column reads) and build directly on Phase 1 columns and Phase 2 DB functions. Thread reuse and AI message update are separable sub-tasks that can be developed and tested independently within this phase.

**Delivers:** `createReviewThread()` accepts optional `existingThread?: ThreadChannel`; `handleReviewOpen()` checks `exercise.review_thread_id` before creating a new thread; idempotency guard eliminates double-click duplicate threads (Pitfall 1 eliminated); thread ID stored after creation via `updateExerciseThreadId()`; `ai_review_complete` event dispatched to edit thread AI message using stored `review_thread_ai_message_id`; dynamic import in `review-buttons.ts` replaced with static import (Pitfall 8 eliminated). Unit tests for new-thread and thread-reuse paths; integration test for AI message update flow.

**Avoids:** Pitfall 1 (duplicate threads), Pitfall 8 (dynamic import bypasses mock in tests)

### Phase 5: Test Coverage Completion + E2E Verification

**Rationale:** PROJECT.md mandates tests for all changes. Phases 1-4 include unit tests per step, but integration and E2E coverage for the complete submission state machine (accumulate → preview → confirm → submitted → admin review → revision → re-submit → thread reuse) should be locked down as a dedicated phase to catch any gaps. Also the correct phase to verify `_clearStateForTesting()` covers all new `ConversationState` fields and that no new Vitest configuration issues were introduced.

**Delivers:** Full integration test coverage for the submission flow state machine; E2E synthetic event flow covering: happy path, empty submission rejection, re-submission with thread reuse, admin double-click idempotency; all new `ConversationState` fields verified in `_clearStateForTesting()` and test fixtures; CI job split verified (unit fast, integration gated on Docker).

**Addresses:** Pitfall 14 (Map state leaks between tests — verify `beforeEach` `_clearStateForTesting()` calls), Pitfall 15 (Supabase Docker CI job isolation), Pitfall 16 (E2E not silently skipping in CI)

### Phase Ordering Rationale

- Schema before types: PostgreSQL partial unique index and column additions must exist before TypeScript interfaces reference them
- Types before DB functions: `StudentExercise` interface must include `review_thread_id` before `updateExerciseThreadId()` can be typed correctly
- DB functions before handlers: `getExerciseByStudentAndSession()` and `updateExerciseThreadId()` must exist before handler code calls them
- Correctness fixes before UX: empty guard, atomic session_id, attachment ordering are simpler, independently testable, and lower risk than the multi-file admin UX changes
- UX improvements last in feature work: thread reuse touches the most files (`review-thread.ts`, `review-buttons.ts`, `event-dispatcher.ts`) and benefits most from the stable foundation
- Test completion as dedicated phase: integration and E2E tests require all application code to be stable first; bundling them with feature phases risks incomplete coverage under time pressure

### Research Flags

Phases with standard patterns — no additional research needed:
- **Phase 1:** PostgreSQL partial unique index — standard, well-documented; `CREATE UNIQUE INDEX ... WHERE` syntax is stable
- **Phase 2:** `.maybeSingle()` Supabase pattern — verified in official JS client docs; direct replacement for `PGRST116` error handling
- **Phase 3:** Application-layer guard logic — pure TypeScript; no external API surface
- **Phase 4:** `awaitMessageComponent`, `setArchived`, `deferUpdate` — verified in discord.js 14.16 official docs and confirmed used in existing codebase

Phases requiring careful implementation attention (not research, but deliberate execution):
- **Phase 4, thread reuse:** `client.channels.fetch(threadId)` can return `null` if the thread was manually deleted from Discord. The fallback to creating a new thread must be implemented and tested explicitly
- **Phase 4, AI message update:** Re-read `event-dispatcher.ts` before implementing — the existing `ai_review_complete` event lifecycle and dispatch timing matters for correctness

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All required APIs verified in official discord.js 14.16 docs and confirmed present in codebase. No speculative dependencies. No new packages required. |
| Features | HIGH | Based entirely on direct codebase analysis of existing implementation gaps with file and line references. Not ecosystem guesses. Gap list is exhaustive and maps directly to file changes. |
| Architecture | HIGH | All architecture research derived from reading production source files. Component boundaries are explicit. Build order has no ambiguities. |
| Pitfalls | HIGH | All 16 pitfalls verified against actual source code with line references and SQL detection queries. Prevention code provided for all critical pitfalls. |

**Overall confidence:** HIGH

### Gaps to Address

- **Confirmation button scope decision:** The research recommends a Discord button for preview/confirm UX (more reliable than LLM-driven confirmation). This is not explicitly specified in PROJECT.md (which says "apercu avant confirmation" without specifying the mechanism). The roadmapper should decide whether Phase 3 includes the button flow (medium complexity, best correctness) or a strengthened system prompt only (simpler, LLM-dependent). This decision affects Phase 3 and Phase 4 scope.

- **Interaction token 15-minute expiry (Pitfall 10):** A `Promise.race` timeout guard in `handleReviewDecision` is a production safety measure. Not a blocker at current student volume but should be explicitly assigned to Phase 4 or flagged as a Phase 5 concern during planning.

- **`storageIdx` counter fix (Pitfall 11):** The index-keyed Map fix for attachment index tracking in `handleCreateSubmission` should be folded into Phase 3 but was not called out as a table-stakes feature in FEATURES.md. Confirm during Phase 3 planning whether this needs an explicit test case or is handled implicitly by the empty-submission guard (which reduces the attack surface).

---

## Sources

### Primary (HIGH confidence)

- `packages/bot-discord/src/handlers/dm-handler.ts` — accumulation state, processing locks, conversation TTL (direct codebase read)
- `packages/bot-discord/src/handlers/review-buttons.ts` — admin review flow, thread lifecycle, button handling (direct codebase read)
- `packages/bot-discord/src/utils/review-thread.ts` — thread creation, message formatting (direct codebase read)
- `packages/core/src/ai/formation/dm-agent.ts` — Claude tool loop, submission logic, re-submission path (direct codebase read)
- `packages/core/src/db/formation/exercises.ts` — student_exercises CRUD, status machine (direct codebase read)
- `supabase/migrations/004_students_system.sql`, `005_sessions_system.sql`, `016_exercise_review_system.sql` — schema analysis (direct codebase read)
- discord.js 14.16.3 DMChannel class reference: https://discordjs.dev/docs/packages/discord.js/14.16.3/DMChannel:Class
- discord.js 14.18.0 Message class (awaitMessageComponent): https://discord.js.org/docs/packages/discord.js/14.18.0/Message:class
- discord.js collectors guide: https://discordjs.guide/popular-topics/collectors
- discord.js v14 component interactions guide: https://discordjs.guide/interactive-components/interactions.html
- Supabase JS upsert reference: https://supabase.com/docs/reference/javascript/upsert
- discord.js v14 ThreadChannel (14.16.3): https://discordjs.dev/docs/packages/discord.js/14.16.3/ThreadChannel:Class

### Secondary (MEDIUM confidence)

- Vitest symlink/mock split: https://github.com/vitest-dev/vitest/issues/5633 — confirmed pnpm workspace alias workaround (already applied in v1.0 config)
- Supabase upsert + unique constraint races: https://github.com/orgs/supabase/discussions/3721 — confirmed partial unique index behavior
- Supabase composite unique constraint discussion: https://github.com/orgs/supabase/discussions/28927
- discord-api-docs discussion on modal limitations: https://github.com/discord/discord-api-docs/discussions/5883 — confirms modals are incompatible with file submission UX

### Tertiary (LOW confidence)

- Discord interaction token expiry issue: https://github.com/discordjs/discord.js/issues/9052 — 15-minute limit confirmed; exact failure behavior under production load is not fully characterized
- Interaction collector issues in v14 DM context: https://github.com/discordjs/discord.js/issues/9866 — relevant for `awaitMessageComponent` in DM channels specifically

---
*Research completed: 2026-03-25*
*Ready for roadmap: yes*
