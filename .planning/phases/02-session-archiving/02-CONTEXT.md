# Phase 2: Session Archiving - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Add the ability for the trainer to archive all exercises for a given session with one command. Archived exercises stay in the database but no longer appear in notifications, digests, or pending exercise lists. This is a new feature (slash command + DB update + filtering changes).

</domain>

<decisions>
## Implementation Decisions

### Database & Status
- **D-01:** Add `'archived'` to the `ExerciseStatus` TypeScript type union in `packages/core/src/types/index.ts`. The DB column is plain text — no migration needed to change a constraint.
- **D-02:** Create a new DB function `archiveExercisesBySession(sessionId: string)` in `packages/core/src/db/formation/exercises.ts` that bulk-updates all exercises for a session to `status = 'archived'`.
- **D-03:** Only exercises in `submitted`, `approved`, or `revision_needed` status should be archivable. Exercises already in `archived` are skipped. This prevents archiving exercises that are mid-review.
- **D-04:** No SQL migration file needed — the status column is text, not an enum. The TypeScript type is the only constraint.

### Slash Command
- **D-05:** Create `/archive-session` as a new admin slash command in `packages/bot-discord/src/commands/admin/`.
- **D-06:** The command takes a required `session` parameter (integer — session number). Use Discord autocomplete to list available sessions with pending exercises.
- **D-07:** Command shows an ephemeral confirmation message: "Archiver N exercice(s) de la session X ? (approve/annuler)" with buttons before executing.
- **D-08:** After confirmation, execute the bulk archive and respond with a summary: "N exercice(s) archives pour la session X".
- **D-09:** Only admins can use this command (use existing `isAdmin()` check).
- **D-10:** Command language is French (admin-facing), not Russian.

### Filtering Archived Exercises
- **D-11:** Update `getPendingExercises()` in exercises.ts to exclude `archived` status (it already filters by `submitted` only after Phase 1, but add explicit exclusion for safety).
- **D-12:** Update `getExerciseSummary()` in exercises.ts to exclude `archived` exercises from counts.
- **D-13:** Update the exercise digest cron (`exercise-digest.ts`) to skip archived exercises — they should not appear in the daily digest.
- **D-14:** Update the admin digest cron (`admin-digest.ts`) to exclude archived exercises from summary counts.
- **D-15:** The `/review` command should not list archived exercises in its pending list.

### Backward Compatibility
- **D-16:** Existing exercises are not affected — only explicitly archived exercises get the new status.
- **D-17:** The review buttons (approve/revision) should not work on archived exercises — add a guard check.

### Claude's Discretion
- Whether to add a `/unarchive-session` command (likely not needed for v1, but planner can decide)
- Exact wording of confirmation and success messages
- Whether autocomplete should show all sessions or only those with pending exercises

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Exercise Database Layer
- `packages/core/src/db/formation/exercises.ts` — All exercise queries, getPendingExercises, getExerciseSummary
- `packages/core/src/types/index.ts` — ExerciseStatus type union (line ~91)

### Admin Commands (pattern reference)
- `packages/bot-discord/src/commands/admin/review.ts` — Existing admin command pattern with exercise listing
- `packages/bot-discord/src/commands/admin/approve.ts` — Pattern for exercise status update command
- `packages/bot-discord/src/commands/admin/session-update.ts` — Pattern for session-based admin command with autocomplete

### Cron/Digest (filtering targets)
- `packages/bot-discord/src/cron/exercise-digest.ts` — Daily exercise digest (must exclude archived)
- `packages/bot-discord/src/cron/admin-digest.ts` — Admin digest summary (must exclude archived)

### Review System (guard checks)
- `packages/bot-discord/src/handlers/review-buttons.ts` — Review button handlers (must reject archived)

### Bot Entry Point (command registration)
- `packages/bot-discord/src/index.ts` — Where slash commands are registered

### Specs
- `specs/04-bot-discord/SPEC.md` — Update after implementation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `isAdmin()` utility — already used across all admin commands
- `SlashCommandBuilder` pattern from existing admin commands (review.ts, approve.ts)
- `EmbedBuilder` for confirmation/success messages
- `ButtonBuilder` for confirmation buttons (approve/cancel pattern exists in review-buttons.ts)
- `getExerciseSummary()` and `getPendingExercises()` — existing query functions to update

### Established Patterns
- Admin commands live in `packages/bot-discord/src/commands/admin/`
- Commands export `data` (SlashCommandBuilder) and `execute` (handler function)
- Commands are registered in `index.ts` via a commands array
- Session-related commands use autocomplete with session number (see session-update.ts)
- Confirmation flows use ephemeral messages with buttons

### Integration Points
- `packages/bot-discord/src/index.ts` — register new slash command
- `packages/core/src/db/formation/exercises.ts` — add archiveExercisesBySession function
- `packages/core/src/types/index.ts` — extend ExerciseStatus type
- `packages/core/src/index.ts` — export new function

</code_context>

<specifics>
## Specific Ideas

- User explicitly requested "archivage par session" — one command to archive everything for a given session
- The trainer said he has "plein d'etudiants qui ont soumis des exercices" and cannot review each one — archiving is the release valve
- Keep it simple: archive = out of sight, not deleted

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-session-archiving*
*Context gathered: 2026-04-01*
