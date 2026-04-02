# Codebase Concerns

**Analysis Date:** 2026-03-31

## Technical Debt

### In-Memory State Without Periodic Cleanup (Telegram Bots)
- **Issue:** Telegram bot conversation histories (`packages/bot-telegram/src/utils/conversation.ts`, `packages/bot-telegram-public/src/utils/conversation.ts`) and pending change maps (`packages/bot-telegram/src/utils/pending-changes.ts`) rely on lazy expiration checked only on read. There is no `setInterval` cleanup loop, unlike the Discord handlers which clean up stale state every 5-10 minutes. If a user chats once and never returns, their entry stays in the Map forever.
- **Impact:** Slow memory growth over weeks/months of uptime. Not critical given the small user base, but inconsistent with the Discord handler pattern.
- **Severity:** low
- **Fix approach:** Add a `setInterval` cleanup loop (like `packages/bot-discord/src/handlers/dm-handler.ts` line 795) that runs every 10-30 minutes and evicts entries older than TTL.

### Duplicated `sendLongMessage` Function
- **Issue:** The 2000-character Discord message splitting logic is copy-pasted in three locations:
  - `packages/bot-discord/src/handlers/dm-handler.ts` (line 674)
  - `packages/bot-discord/src/handlers/admin-handler.ts` (line 189)
  - `packages/bot-telegram/src/utils/reply.ts` (line 32, Telegram-specific variant)
- **Impact:** Bug fixes or improvements to message splitting must be applied in multiple places. The Discord variants are nearly identical.
- **Severity:** low
- **Fix approach:** Extract the Discord `sendLongMessage` into a shared utility (e.g., `packages/bot-discord/src/utils/message-split.ts` already exists but is not used by the handlers). Import from there.

### Duplicated `isAdmin` / Auth Patterns Across Bots
- **Issue:** Three separate `isAdmin` implementations exist:
  - `packages/bot-discord/src/utils/auth.ts` (role-based, accepts `Message | ChatInputCommandInteraction`)
  - `packages/bot-discord-quiz/src/utils/auth.ts` (role-based, accepts `ChatInputCommandInteraction | ButtonInteraction`)
  - `packages/bot-telegram/src/utils/auth.ts` (chat ID comparison)
- The Discord variants are nearly identical (both check `ROLES.admin` on guild member) but have different type signatures, preventing shared use.
- **Impact:** Divergence risk if role names change. The quiz bot must independently track `ROLES.admin` in its own `config.ts`.
- **Severity:** low
- **Fix approach:** Consider moving common Discord auth logic into a shared utility within `packages/bot-discord/src/utils/` that both bots import, or keep them separate since the quiz bot is intentionally isolated from `bot-discord`.

### `as any` in Memory Agent
- **Issue:** `packages/core/src/ai/memory-agent.ts` (lines 92, 96) uses `as any` to cast Claude's JSON output categories to `MemoryCategory`. The Claude response is parsed but not validated — if Claude returns an invalid category, it silently passes through.
- **Impact:** Could insert invalid category values into the memory table. Since Claude usually gets categories right, this is low-probability but should be validated.
- **Severity:** low
- **Fix approach:** Add a Zod schema or manual validation for the parsed JSON response, consistent with the project convention of using Zod for external data validation.

### Exercise Reviewer: AI Auto-Correction Complexity
- **Issue:** The exercise review flow (`packages/core/src/ai/formation/exercise-reviewer.ts`) involves a complex chain: DM handler receives submission -> uploads to storage -> triggers AI review (fire-and-forget) -> AI writes review to DB -> creates formation event -> updates admin notification embed -> edits review thread message. Multiple fire-and-forget operations create a fragile cascade.
- **Files:** `packages/bot-discord/src/handlers/dm-handler.ts` (lines 158-237, `triggerAiReview`), `packages/core/src/ai/formation/exercise-reviewer.ts`, `packages/bot-discord/src/handlers/review-buttons.ts`
- **Impact:** Failures in the cascade are silently swallowed (non-blocking by design), but the admin may see inconsistent state — e.g., a thread shows "AI score: en cours..." that never gets updated. The review thread update (editing the AI message in a thread found by stored message ID) is particularly fragile.
- **Severity:** medium
- **Fix approach:** The user plans to simplify this by removing AI auto-correction entirely. If kept, add a periodic cron to detect exercises stuck in `submitted` status > N hours (i.e., AI review silently failed) and alert the admin.

### Pervasive `return data as Type` in DB Layer
- **Issue:** Nearly all Supabase query functions cast results with `return data as StudentExercise` (40+ occurrences across `packages/core/src/db/`). The Supabase JS client returns `any` from `.select()`, and these casts skip runtime validation.
- **Files:** All files in `packages/core/src/db/formation/`, `packages/core/src/db/quiz/`, `packages/core/src/db/clients.ts`, `packages/core/src/db/tasks.ts`
- **Impact:** If a database migration changes a column type or adds a required field, TypeScript will not catch the mismatch at runtime. This contradicts the project convention of using Zod for external data validation.
- **Severity:** medium
- **Fix approach:** Either (1) add Zod schemas for each entity and validate Supabase responses, or (2) use Supabase's generated types via `supabase gen types typescript`. Option 2 gives compile-time safety; option 1 gives runtime safety. Both are incremental — can be done table-by-table.

### No Linting/Formatting Configuration Files
- **Issue:** `package.json` defines `pnpm lint`, `pnpm lint:fix`, and `pnpm format` commands, but no ESLint config file (`.eslintrc*`, `eslint.config.*`) or Prettier config (`.prettierrc*`) exists in the repository root.
- **Impact:** Running `pnpm lint` or `pnpm format` may fail or use default rules. Code style consistency relies on developer discipline rather than tooling enforcement.
- **Severity:** low
- **Fix approach:** Add `eslint.config.js` and `.prettierrc` to the project root. The CI pipeline runs `pnpm typecheck` but not `pnpm lint`, so linting is not enforced anywhere.

## Security Considerations

### Telegram Admin Auth: Fail-Open When Env Var Missing
- **Issue:** `packages/bot-telegram/src/utils/auth.ts` returns `true` (allows all users) when `TELEGRAM_ADMIN_CHAT_ID` is not set. The warning is logged, but any user can send commands.
- **Files:** `packages/bot-telegram/src/utils/auth.ts` (line 8)
- **Impact:** If the env var is accidentally unset in production, all Telegram users would have admin access to orchestrator actions (create tasks, manage clients, run memory agent).
- **Severity:** high
- **Fix approach:** Change to fail-closed: return `false` when `TELEGRAM_ADMIN_CHAT_ID` is not set, and log an error instead of a warning.

### Supabase Service Role Key Used Client-Side
- **Issue:** All database access uses the `SUPABASE_SERVICE_ROLE_KEY`, which bypasses Row Level Security (RLS). This is the "god key" for the database.
- **Files:** `packages/core/src/db/client.ts` (line 10)
- **Impact:** This is acceptable for server-side bots that run as trusted processes, but any code injection or leaked key gives full DB access. There is no RLS fallback layer.
- **Severity:** low (acceptable for the architecture, but worth noting)
- **Fix approach:** Keep the current pattern since all bots are server-side. Ensure the key never leaks (already in `.gitignore`). Consider RLS policies as an additional defense layer if the system scales.

### No Input Sanitization on Claude JSON Outputs
- **Issue:** Multiple agents parse Claude's JSON responses and use values directly in database operations and Discord messages: orchestrator (`packages/core/src/ai/orchestrator.ts` line 116), memory agent (`packages/core/src/ai/memory-agent.ts` line 73), FAQ agent, exercise reviewer, etc. None validate the parsed JSON against a schema.
- **Impact:** A malformed Claude response could insert unexpected values into the database. The `as Type` casts give a false sense of type safety.
- **Severity:** medium
- **Fix approach:** Add Zod validation for all Claude JSON responses. The project already uses Zod (`zod` is in core dependencies) but only for the artisan agent input. Apply it consistently across all agents.

## Performance Risks

### No Rate Limiting or Retry Logic for Claude API
- **Issue:** API calls to Claude (`packages/core/src/ai/client.ts`) have no retry logic, no exponential backoff, and no rate limiting. If Claude returns a 429 or 500, the error propagates immediately. The same applies to OpenAI embedding calls (`packages/core/src/ai/embeddings.ts`).
- **Impact:** During API outages or rate limits, all agent operations fail immediately. The Discord bot DM handler catches errors gracefully (replies "try again"), but the Telegram orchestrator and cron jobs may fail silently.
- **Severity:** medium
- **Fix approach:** Wrap `askClaude` and `getEmbedding` with retry logic (2-3 retries with exponential backoff). The `@anthropic-ai/sdk` has built-in retry support that could be configured when creating the client.

### Pending Attachments Hold Buffers in Memory
- **Issue:** When a student sends files via DM, the Discord handler downloads the file into a Node.js `Buffer` and stores it in the in-memory `ConversationState.pendingAttachments` array (`packages/bot-discord/src/handlers/dm-handler.ts` line 593). Files up to 25 MB are accepted. These buffers persist until either: submission is confirmed, the conversation is cleaned up (30 min TTL), or an error clears them.
- **Impact:** If multiple students send large files simultaneously, memory usage spikes. With the current small class size (~30 students), this is manageable. At scale (100+ concurrent students), it becomes a problem.
- **Severity:** low (for current scale)
- **Fix approach:** Consider streaming directly to Supabase Storage on receipt instead of buffering in-memory, or implement a memory cap on total pending buffer size.

### Exercise Summary Fetches All Rows
- **Issue:** `getExerciseSummary()` in `packages/core/src/db/formation/exercises.ts` (line 183) fetches all exercises from the table and counts them in JavaScript, rather than using a SQL aggregate.
- **Impact:** Inefficient as the number of exercises grows. Currently negligible with ~30 students and ~24 sessions.
- **Severity:** low
- **Fix approach:** Replace with a Supabase RPC that does `SELECT status, COUNT(*) FROM student_exercises GROUP BY status`.

### Quiz Open-Answer Evaluation Uses Opus Model
- **Issue:** `packages/bot-discord-quiz/src/utils/quiz-eval.ts` (line 23) uses `model: 'opus'` for evaluating every open-answer quiz response. Opus is significantly more expensive and slower than Sonnet.
- **Impact:** Higher API costs and slower response times during quizzes with open questions. For a binary "correct/incorrect" determination, Sonnet would likely suffice.
- **Severity:** low
- **Fix approach:** Switch to `model: 'sonnet'` for quiz evaluation. The lenient evaluation prompt already handles edge cases well.

## Scalability Issues

### Module-Level Singletons Without Graceful Shutdown
- **Issue:** Several modules use module-level singletons that are never cleaned up:
  - `packages/core/src/db/client.ts`: Supabase client (no disconnect)
  - `packages/core/src/cache/redis.ts`: Redis client (no disconnect on shutdown)
  - `packages/core/src/ai/client.ts`: Anthropic clients (no cleanup)
  - `packages/core/src/scheduler/index.ts`: `jobs` array is module-level, `stopAllJobs()` exists but is never called
  - All `setInterval` calls in handler setup functions (`dm-handler`, `admin-handler`) are never cleared
- **Impact:** On graceful shutdown or hot reload, connections may leak. The `setInterval` timers keep the Node.js process alive even after the bot disconnects.
- **Severity:** low
- **Fix approach:** Add a `shutdown()` function to core that stops cron jobs, clears intervals, and closes Redis/Supabase connections. Call it from each bot's shutdown handler.

### In-Memory Conversation State Lost on Restart
- **Issue:** All conversation state (Discord DM conversations, admin conversations, Telegram chat history, pending quiz data) is stored in in-memory `Map` objects. A process restart or crash loses all active conversations mid-flow.
- **Impact:** Students in the middle of an exercise submission or quiz will need to start over. Admin conversations with pending actions lose their context.
- **Severity:** medium
- **Fix approach:** For critical flows (exercise submission, quiz in progress), the DB already tracks state (exercise status, quiz session). The conversation context loss is acceptable. Consider persisting pending quiz data (`quiz-create.ts` `pendingQuizzes` Map) to avoid quiz creation failures on restart.

## Missing Infrastructure

### No Health Check Endpoints
- **Issue:** None of the bots expose HTTP health check endpoints. The deployment uses Docker containers (`docker-compose.prod.yml` referenced in CI), but there is no way for a load balancer or monitoring system to verify bot health.
- **Impact:** Silent failures (e.g., bot loses Discord gateway connection but the process stays alive) are undetectable without manual monitoring.
- **Severity:** medium
- **Fix approach:** Add a minimal HTTP server (express or built-in `http`) to each bot that responds to `/health` with bot connection status.

### No Structured Error Reporting / Alerting
- **Issue:** Errors are logged via Pino but there is no error tracking service (Sentry, Datadog, etc.). Log analysis requires SSH access to the VPS.
- **Impact:** Production errors may go unnoticed for hours or days unless the admin sees a user-facing error message.
- **Severity:** medium
- **Fix approach:** Add Sentry or a similar error tracking service. The Telegram admin bot already receives some alerts (e.g., `ai_review_failed`), but systematic error tracking is missing.

### CI Does Not Run Linting
- **Issue:** The CI pipeline (`.github/workflows/test.yml`) runs `pnpm typecheck` and `pnpm test:unit` but not `pnpm lint` or `pnpm format`. Combined with the missing linting config files, there is no automated style enforcement.
- **Impact:** Code style may drift over time, especially with AI-assisted code generation.
- **Severity:** low
- **Fix approach:** Add lint configuration files, then add `pnpm lint` to the CI pipeline.

## Code Smells

### Empty Catch Blocks Swallow Errors Silently
- **Issue:** 27 `catch {}` blocks (empty catch without variable binding or logging) across the codebase. Many are intentional (non-critical operations like cache, thread archiving), but some hide real failures:
  - `packages/core/src/ai/orchestrator.ts` (line 117): JSON parse failure falls through silently
  - `packages/core/src/ai/context-builder.ts` (line 150, 175): Public knowledge and archival search failures are hidden
  - `packages/core/src/ai/planner.ts` (line 78, 142): Daily plan JSON parse failures return garbage
- **Impact:** Debugging production issues is harder when errors are swallowed. An empty catch is the TypeScript equivalent of Python's `except: pass`.
- **Severity:** low
- **Fix approach:** Add at least `logger.debug` to all catch blocks. For critical paths (orchestrator JSON parsing), add proper error handling.

### Tsarag Agent File Size (1081 lines)
- **Issue:** `packages/core/src/ai/formation/tsarag-agent.ts` is the largest source file at 1081 lines, containing: system prompt, tool definitions, all tool handlers, action execution, date parsing, language detection, and the main agent loop.
- **Impact:** Difficult to navigate and modify. Each tool handler is a self-contained function, but they all live in one file.
- **Severity:** low
- **Fix approach:** Extract tool handlers into `tsarag-tools/` subdirectory with one file per tool category (read-tools.ts, action-tools.ts, helpers.ts). Keep the main agent loop in the top-level file.

### Hardcoded Role and Channel Names
- **Issue:** While `config.ts` files centralize role/channel names per bot, the values themselves are hardcoded strings matching the Discord server setup (e.g., `'tsarag'`, `'объявления'`, `'студент'`). The bot-discord and bot-discord-quiz each maintain separate `config.ts` files with overlapping role names.
- **Files:** `packages/bot-discord/src/config.ts`, `packages/bot-discord-quiz/src/config.ts`
- **Impact:** Adding a new bot or changing a Discord role name requires finding and updating all config files.
- **Severity:** low
- **Fix approach:** Move shared Discord role/channel constants to `packages/core` or to an environment variable.

## Dependencies

### OpenAI API Key Used for Embeddings
- **Issue:** `packages/core/src/ai/embeddings.ts` reads `OPENAI_API_KEY` at module load time (line 3: `const OPENAI_API_KEY = process.env['OPENAI_API_KEY']`). If the env var is set after the module is imported, the key won't be picked up. All other API clients read env vars lazily inside functions.
- **Impact:** Could cause embedding failures if module load order is wrong. Currently works because `dotenv` runs before any imports.
- **Severity:** low
- **Fix approach:** Read `process.env['OPENAI_API_KEY']` inside the `getEmbedding()` function instead of at module scope, consistent with how `client.ts` handles `ANTHROPIC_API_KEY`.

### No Dependency Pinning Beyond Lockfile
- **Issue:** `package.json` dependencies use caret ranges (e.g., `"discord.js": "^14.16.0"`, `"@anthropic-ai/sdk": "^0.39.0"`). This is normal, but the devDependencies in the root `package.json` use even wider ranges (`"discord.js": "^14.25.1"`, `"vitest": "^4.1.1"`).
- **Impact:** `pnpm-lock.yaml` ensures reproducible installs, but if the lockfile is regenerated (e.g., after `pnpm update`), major version differences between root devDependencies and package dependencies could cause issues.
- **Severity:** low
- **Fix approach:** Periodically audit with `pnpm outdated` and update intentionally.

## Test Coverage Gaps

### Telegram Bots Have Zero Tests
- **Issue:** `packages/bot-telegram/` and `packages/bot-telegram-public/` have no test files. All existing tests cover `packages/bot-discord/`, `packages/bot-discord-quiz/`, and `packages/core/`.
- **Files:** `packages/bot-telegram/src/` (13 source files, 0 test files), `packages/bot-telegram-public/src/` (5 source files, 0 test files)
- **Impact:** Changes to the orchestrator integration, voice handler, cron jobs, or reply formatting in Telegram bots are untested. The orchestrator itself (`packages/core/src/ai/orchestrator.ts`) also has no unit tests.
- **Risk:** High for the orchestrator — it parses Claude JSON and executes database actions. A JSON parsing edge case could create duplicate tasks or crash.
- **Priority:** Medium (orchestrator is the riskiest untested component)

### Cron Jobs Have No Tests
- **Issue:** All cron jobs across all bots are untested:
  - `packages/bot-discord/src/cron/` (6 files: admin-digest, deadline-reminders, dropout-detector, event-dispatcher, exercise-digest, storage-cleanup)
  - `packages/bot-telegram/src/cron/` (6 files: anti-procrastination, check-ins, dynamic-notifications, formation-events, midnight-reminder, morning-plan)
  - `packages/bot-discord-quiz/src/cron/` (2 files: close-expired-quizzes, index)
- **Impact:** Cron jobs run autonomously and affect production data (sending DMs, marking exercises, dispatching events). Bugs in cron jobs are discovered only in production.
- **Risk:** Medium-high for `event-dispatcher` and `deadline-reminders` which modify state.
- **Priority:** Medium

### Memory Agent and Consolidator Untested
- **Issue:** `packages/core/src/ai/memory-agent.ts` and `packages/core/src/ai/memory-consolidator.ts` have no tests. These modules modify the memory database based on Claude's JSON output.
- **Impact:** Memory corruption (wrong category, accidental deletion) would be difficult to detect and diagnose.
- **Priority:** Low (memory operations are best-effort and the admin can manually fix)

---

*Concerns audit: 2026-03-31*
