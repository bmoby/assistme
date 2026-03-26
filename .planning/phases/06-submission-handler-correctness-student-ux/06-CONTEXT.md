# Phase 6: Submission Handler Correctness + Student UX - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Students submit exercises with confidence — empty submissions blocked, sessions validated in DB, preview-confirm with Discord buttons before DB write, re-submission replaces old record in-place, and `pendingAttachments` cleaned on error. Scope: handler-level changes in `dm-handler.ts`, DM agent tool call interception, and supporting DB queries. No new slash commands, no DM agent rewrite.

</domain>

<decisions>
## Implementation Decisions

### Preview-Confirm Flow
- **D-01:** Handler intercepts `create_submission` tool call from DM agent. Instead of executing the DB write immediately, handler shows an embed preview (session number, text excerpt, file list, link list) with "Soumettre" and "Annuler" buttons (`ActionRowBuilder` + `ButtonBuilder`, already imported in `dm-handler.ts`). DB write only happens after "Soumettre" click.
- **D-02:** Buttons timeout after 2 minutes. After timeout, buttons disable and message updates to "Soumission expirée". `pendingAttachments` stay in memory so student can retry.
- **D-03:** On "Annuler" click or timeout: clear `pendingAttachments`, confirm cancellation to student. State fully reset.

### Session Selection
- **D-04:** Keep natural language — Claude extracts `session_number` via `create_submission` tool (already works). Handler validates session existence in DB (`getSessionByNumber()`) before showing preview. If session doesn't exist: error message to student, no preview shown, attachments preserved for retry.

### Re-submission Flow
- **D-05:** Update in-place — same exercise row. Status resets to `submitted`, `submission_count` increments, old attachments replaced (expand-then-contract: upload new first, delete old last). `review_history` array keeps full audit trail. No new DB records.
- **D-06:** Re-submission is allowed only when current status is `approved`, `revision_requested`, or `rejected` — not when already `submitted` or `ai_reviewed` (duplicate protection from Phase 5 unique index handles this at DB level).

### Empty Submission Rules
- **D-07:** Reject submission only if `pendingAttachments` is empty AND `student_comment` is empty/whitespace. A text-only submission (written answer, inline link) is valid. Check happens at handler level when intercepting `create_submission`, before showing preview.

### Error Cleanup
- **D-08:** On DM agent error (catch block in `processDmMessage`), clear `pendingAttachments` to prevent stale attachment leakage between messages. This fixes SUB-04.

### Claude's Discretion
- **Preview embed content:** Claude/planner decides exact embed fields and formatting. Must include: session number, text excerpt (if any), file names + sizes, link URLs.
- **Agent prompt updates:** If the DM agent system prompt needs tweaking to better guide `create_submission` calls (e.g., "always confirm session number before submitting"), planner decides the exact wording.
- **Error message wording:** Russian-language error messages for validation failures (empty submission, invalid session). Follow existing message style in dm-handler.ts.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Handler Code (primary modification target)
- `packages/bot-discord/src/handlers/dm-handler.ts` — DM handler with conversation state, attachment accumulation, agent invocation
- `packages/core/src/ai/formation/dm-agent.ts` — DM agent with `create_submission` tool definition and handler

### DB Functions (used by handler)
- `packages/core/src/db/formation/exercises.ts` — `submitExercise()` (updated Phase 5), `getExerciseByStudentAndSession()` (new Phase 5), `updateExercise()`
- `packages/core/src/db/formation/sessions.ts` — `getSessionByNumber()` for session validation

### Types
- `packages/core/src/types/index.ts` — `StudentExercise`, `PendingAttachment`, `ConversationMessage`

### Specs
- `specs/04-bot-discord/SPEC.md` — Bot Discord spec (exercise flow, review system)
- `specs/01-cerveau-central/SPEC.md` — Core package spec (DB layer, types)

### Prior Phase Artifacts
- `.planning/phases/05-db-foundation-core-hardening/05-01-SUMMARY.md` — Phase 5 changes to exercises.ts and dm-agent.ts
- `.planning/phases/05-db-foundation-core-hardening/05-CONTEXT.md` — Phase 5 decisions

### Test Patterns
- `packages/bot-discord/src/handlers/dm-handler.test.ts` — Existing DM handler unit tests (follow pattern)
- `packages/core/src/ai/formation/dm-agent.test.ts` — Existing DM agent unit tests

### Codebase Context
- `.planning/codebase/CONCERNS.md` — Exercise submission state machine fragility analysis
- `.planning/codebase/ARCHITECTURE.md` — Handler/agent/DB layer architecture

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ActionRowBuilder`, `ButtonBuilder`, `ButtonStyle` — already imported in dm-handler.ts, ready for preview buttons
- `awaitMessageComponent` — Discord.js method for waiting on button clicks with timeout
- `getSessionByNumber()` — already exists in sessions.ts for session validation
- `getExerciseByStudentAndSession()` — new in Phase 5, enables checking for existing submission before re-submit
- `updateExercise()` — already exists, can be used for in-place re-submission update
- `formatSubmissionNotification()` — already imported in dm-handler.ts for admin channel notifications

### Established Patterns
- Conversation state is in-memory `Map<string, ConversationState>` with `pendingAttachments` array
- Processing locks prevent concurrent DM processing per student
- Agent results return `{ text, submissionId }` — `submissionId` presence triggers attachment cleanup and admin notification
- Messages split at 2000 chars via `sendLongMessage()`

### Integration Points
- `create_submission` tool call in dm-agent.ts (line 630) is where interception happens
- Admin notification (`notifyAdminChannel`) fires after successful submission — must still fire after button confirm
- `pendingAttachments` cleanup currently at line 159-160 — needs to also happen on error (line 170-173)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow existing Russian-language message patterns in dm-handler.ts.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-submission-handler-correctness-student-ux*
*Context gathered: 2026-03-25*
