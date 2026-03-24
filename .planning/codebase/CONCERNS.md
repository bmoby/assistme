# Codebase Concerns

**Analysis Date:** 2026-03-24

---

## Tech Debt

### 1. Missing Test Coverage

**Issue:** Zero automated test files in packages (no .test.ts or .spec.ts files detected)

**Files:**
- `packages/core/src/**/*.ts` - 100+ files without unit tests
- `packages/bot-telegram/src/**/*.ts` - All handler code untested
- `packages/bot-discord/src/**/*.ts` - Critical handlers untested (dm-handler.ts, admin-handler.ts, review-buttons.ts)
- `packages/bot-telegram-public/src/**/*.ts` - All features untested

**Impact:**
- AI agent modifications (orchestrator, memory manager, exercise reviewer) have no regression protection
- Database layer changes risk silent failures
- Critical Discord handlers (exercise review, student submissions) cannot be validated pre-deployment
- Formation content seed script lacks validation

**Fix approach:**
1. Set up Jest/Vitest with shared test utilities in `packages/core`
2. Add integration tests for Claude API calls, Supabase queries, orchestrator flows
3. Add unit tests for utility functions (format.ts, PDF parsing)
4. Mock external services (Claude API, Supabase, Discord)
5. Target 60%+ coverage on critical paths before Phase 4

---

### 2. Unhandled Promise Chains and Race Conditions

**Issue:** Multiple fire-and-forget promises with `.catch()` handlers that only log errors

**Files:**
- `packages/core/src/ai/orchestrator.ts:234-235` - Memory agent background runs without awaiting
- `packages/core/src/ai/formation/dm-agent.ts:387` - deleteStorageFiles silently fails
- `packages/core/src/ai/formation/dm-agent.ts:454-468` - AI review async failure notifications incomplete
- `packages/bot-discord/src/handlers/dm-handler.ts:163` - notifyAdminChannel fire-and-forget
- `packages/bot-discord/src/handlers/dm-handler.ts:284-286` - DM processing lock pattern uses Promise.resolve() chain

**Impact:**
- Storage cleanup failures not propagated to user
- Admin channel notifications may silently fail during high load
- Exercise review failures logged but not escalated to student feedback queue
- Concurrent DM processing could create race conditions with locking

**Fix approach:**
1. Add explicit error recovery: retry logic for storage deletions
2. Use centralized job queue (already in DB: `agent_jobs` table in `009_agent_jobs.sql`)
3. Implement fallback notifications if admin channel update fails
4. Add telemetry to detect silent failures
5. Consider using Promise.allSettled for parallel operations

---

### 3. Large AI Agent Files - Cognitive Load

**Issue:** Two critical agents exceed 600 lines, making maintenance and debugging difficult

**Files:**
- `packages/core/src/ai/formation/tsarag-agent.ts` - 1045 lines (system prompt + tools + logic)
- `packages/core/src/ai/formation/dm-agent.ts` - 690 lines (5 tools + conversation logic)

**Impact:**
- Difficult to reason about agent behavior without reading entire file
- Tool implementations mixed with conversation flow
- Changes to one tool affect readability of others
- System prompt changes require file navigation

**Fix approach:**
1. Extract tools to separate files: `tools/tsarag-*.ts`, `tools/dm-*.ts`
2. Move system prompts to constants file: `ai/formation/prompts.ts`
3. Keep agent core at 200-300 lines max
4. Example: `tsarag-agent.ts` → `tsarag-agent.ts` (orchestrator) + `tools/tsarag-session.ts`, `tools/tsarag-student.ts`, `tools/tsarag-announcements.ts`

---

### 4. Type Safety Gaps - "any" Usage

**Issue:** Process.env variables used without validation in multiple files

**Files:**
- `packages/core/src/ai/transcribe.ts:10` - Throws on missing OPENAI_API_KEY, but no Zod validation
- `packages/core/src/ai/formation/dm-agent.ts:549` - ANTHROPIC_API_KEY checked with throw, not validated
- `packages/bot-discord/src/handlers/**/*.ts` - Discord API errors returned as JSON strings, not typed errors

**Impact:**
- Runtime errors instead of compile-time detection
- Incomplete error context (missing auth keys discovered only at runtime)
- Inconsistent error handling across packages (some throw, some return JSON errors)

**Fix approach:**
1. Create `packages/core/src/env.ts` with Zod schema for all env vars
2. Validate at package startup, not in AI agents
3. Use typed Error classes: `class MissingConfigError extends Error { constructor(key: string) }`
4. Return discriminated union errors from agents: `{ ok: true, result } | { ok: false, error: AgentError }`

---

## Known Bugs

### 1. Habit Check Not Implemented

**Bug description:** Daily plan system references habit tracking that doesn't exist

**Symptoms:**
- Plan command returns `sportDoneRecently: false` hardcoded
- No way to update or query habits from any bot interface
- Habits table never created (listed as ❌ Futur in specs)

**Files:**
- `packages/bot-telegram/src/commands/plan.ts:32`
- `specs/01-cerveau-central/SPEC.md:33` (habits table not implemented)

**Trigger:** Run `/plan` command - returns dummy habit data

**Workaround:** Habits feature currently disabled; won't affect current training (Phase 3)

**Fix approach:**
- Phase 4: Create `habits` table in DB migration
- Add `/habit` command in Telegram admin bot
- Integrate with morning plan context builder

---

### 2. Event Dispatcher Daily Digest Not Implemented

**Bug description:** Notifications grouping to admin bot is incomplete

**Symptoms:**
- Formation events created and stored in `events` table (migration 005)
- No daily digest cron to aggregate events and send to admin
- Individual notifications may spam admin channel during high submission volume
- No event prioritization or filtering

**Files:**
- `specs/ROADMAP.md:105,137` - Listed as "[ ] Notifications groupees vers bot admin (1x/jour)"
- `packages/core/src/types/index.ts:293` - Type exists (`daily_exercise_digest`) but never used
- `packages/core/src/db/formation/events.ts` - CRUD exists, but no aggregation logic

**Trigger:** 30+ students submit exercises in same hour → 30+ individual DMs to admin

**Impact:** Admin channel becomes noisy; hard to see urgent issues

**Fix approach:**
1. Add cron job in scheduler (similar to `scheduleReminders()` pattern in `packages/core/src/scheduler/crons.ts`)
2. Cron: 21:00 Bangkok time daily → query unprocessed events → group by type → send 1 formatted message to admin
3. Mark events as processed after sending
4. Implement priority levels: `critical` (student stuck >48h) → immediate, `normal` → daily digest

---

## Security Considerations

### 1. Supabase Service Role Key Exposure Risk

**Risk:** Service role key used in multiple agents and bots

**Files:**
- `packages/core/src/db/client.ts` - Uses `SUPABASE_SERVICE_ROLE_KEY` for privileged operations
- All packages initialize client with service key at startup
- Key stored in `.env` (not committed, but one leak = full database access)

**Current mitigation:**
- `.env` in `.gitignore`
- Key rotation instructions in `.env.example`
- Used only for trusted server-side operations

**Recommendations:**
1. Document service key rotation procedure in CLAUDE.md
2. Add secret rotation to deployment checklist
3. Monitor Supabase audit logs for suspicious queries (via dashboard)
4. Consider Row Level Security (RLS) policies for sensitive tables if moving to web frontend later
5. Separate read-only key for public bot (use anon key where possible)

---

### 2. Discord Token Compromise Path

**Risk:** Discord bot token in environment allows anyone with the token to impersonate the bot

**Files:**
- `packages/bot-discord/src/index.ts` - Loads `DISCORD_BOT_TOKEN` at startup
- Token used to authenticate all bot actions

**Current mitigation:**
- Token in `.env`, not committed
- Token rotated via Discord Developer Portal if compromised
- Bot runs in single private guild (limited blast radius)

**Recommendations:**
1. Enable Discord's bot token rotation feature in Developer Portal
2. Audit bot permissions quarterly (least privilege principle)
3. Monitor bot activity in Discord audit logs
4. Document emergency bot token rotation procedure

---

### 3. Claude API Key Rate Limiting and Cost Control

**Risk:** No rate limiting on Claude API calls; high-traffic periods could cause runaway costs or service throttling

**Files:**
- `packages/core/src/ai/client.ts` - Direct Claude API calls without rate limiting
- `packages/core/src/ai/formation/dm-agent.ts:623` - Tool loop unbounded
- `packages/core/src/ai/formation/tsarag-agent.ts` - No iteration limits on tool calls

**Current mitigation:**
- Single user (personal bot), limited message volume
- maxTokens caps on each call (Sonnet: 8000, agents: 4096)

**Recommendations:**
1. Implement request queue with exponential backoff for 429 (rate limit) responses
2. Add daily cost budget alerts (track in DB)
3. Implement per-user rate limits for Discord (e.g., max 5 DM messages/minute)
4. Log all API calls with token counts for cost auditing
5. Set up budget alerts in Anthropic console (Claude API settings)

---

## Performance Bottlenecks

### 1. In-Memory Conversation History Scaling Issue

**Issue:** Conversation histories stored in-memory with TTL; will overflow on high message volume

**Problem:** 30 students × multiple DMs/day = hundreds of conversations in memory simultaneously

**Files:**
- `packages/bot-discord/src/handlers/dm-handler.ts:26` - Map<userId, ConversationMessage[]>
- `packages/bot-discord/src/handlers/admin-handler.ts:19` - Map<userId, AdminConversationMessage[]>
- TTL cleanup: 30 min (DM) / 60 min (admin) via `cleanupConversations()` interval

**Impact:**
- Memory leak if bot process crashes before TTL runs
- Restart = loss of all conversation context
- Max ~20MB memory per 1000 conversations (estimate)

**Improvement path:**
1. Move conversations to Redis (optional `REDIS_URL` already in env)
2. Use Supabase `messages_log` table (created in schema but unused)
3. Implement automatic persistence: save to DB after agent response
4. Add memory metrics to logger (warn if >200 conversations in memory)

---

### 2. Formation Knowledge Search Performance (Vector + BM25)

**Issue:** Hybrid search on formation_knowledge table could slow with >5000 chunks

**Problem:** Currently ~200 chunks (14 markdown files, H2/H3 splitting). No query optimization.

**Files:**
- `supabase/migrations/010_formation_knowledge.sql` - RPC `search_formation_knowledge()`
- `packages/core/src/db/formation/knowledge.ts` - searchFormationKnowledge() calls RPC
- Used in: dm-agent (tool), tsarag-agent (tool), faq-agent (fallback), exercise-reviewer (context)

**Current latency:** ~100-200ms per search (estimated, no monitoring)

**Improvement path:**
1. Add `created_at` index on formation_knowledge
2. Implement query caching layer: memoize results for same session_id + query within 5 min
3. Pre-compute embeddings for top 20 queries (most common student questions)
4. Monitor RPC performance with Supabase Query Performance dashboard
5. Phase 4: Add full-text search optimization if dataset grows >5000 chunks

---

### 3. Exercise Review File Download Latency

**Issue:** Attachment signedURLs generated on-demand; downloading multiple files during review slows agent

**Problem:** Student submits 5 files → 5 signedURLs generated → 5 concurrent downloads → blocked on slowest

**Files:**
- `packages/core/src/ai/formation/exercise-reviewer.ts:78-137` - downloadReviewAttachment() called sequentially for each file
- `packages/core/src/ai/formation/dm-agent.ts:259-268` - Single file upload has error handling, but no timeout
- Files stored in Supabase Storage bucket (no CDN, direct download)

**Improvement path:**
1. Add timeout to attachment downloads (30s max)
2. Download attachments in parallel: Promise.all instead of sequential
3. Cache signedURLs in Redis for 1 hour (reduced generation calls)
4. Consider CDN for frequently accessed files (Phase 4)

---

## Fragile Areas

### 1. Student Exercise Submission State Machine

**Fragile:** Exercise submission lifecycle complex with multiple state transitions

**Files:**
- `packages/core/src/db/formation/exercises.ts` - updateExerciseStatus() with status enum
- `packages/bot-discord/src/handlers/dm-handler.ts:57-177` - DM message flow triggers submissions
- `packages/bot-discord/src/handlers/review-buttons.ts` - Admin approval/revision buttons change state
- `specs/04-bot-discord/SPEC-DM-AGENT.md:105-150` - State diagram

**Why fragile:**
- 5 possible states: `draft` → `pending_review` → `approved` / `revision_needed` → `resubmit` (draft again) → `pending_review` (loop) / `approved` (final)
- No transaction safety: submission + AI review + notification fires async
- If AI review fails, state stays `pending_review` but no error logged to student
- Concurrent re-submissions possible if bot crashes mid-state-update

**Safe modification approach:**
1. Wrap state transitions in DB transactions (Supabase already supports)
2. Never update status without also logging event (create event record atomically)
3. Add invariant checks: before state X, verify preconditions in code
4. Test state machine with unit tests covering all transitions
5. Add logging at each state boundary (aide with debugging)

---

### 2. Tsarag Admin Agent Tool Execution

**Fragile:** Agent calls tools that have side effects (create sessions, send announcements); no dry-run mode

**Files:**
- `packages/core/src/ai/formation/tsarag-agent.ts:100-200` (propose_action flow)
- `packages/core/src/ai/formation/tsarag-agent.ts:500-700` (tool implementations: create_session, publish_session, send_announcement)
- System prompt enforces propose → confirm → execute, but tool code doesn't validate confirmation state

**Why fragile:**
- If confirm message contains typo ("go" vs "GO"), agent may skip execute
- System prompt requires verbatim text copy, but tool code doesn't verify
- Announcement scheduled for wrong time if date format mismatch (JJ/MM/AAAA vs DD/MM/YYYY)
- No rollback if session create succeeds but Discord thread creation fails

**Safe modification approach:**
1. Implement execute state machine: `{ phase: 'proposed' | 'confirmed' | 'executed', data, confirmation }` stored in memory
2. Refuse tool execution if not in `confirmed` state
3. Validate all inputs (dates, session numbers, text encoding) before tool call, not after
4. Wrap multi-step operations in transaction (session + thread + message)
5. Add explicit confirmation codes: user must type "CONFIRM 123" (code from agent)

---

### 3. Memory Manager Update Conflicts

**Fragile:** Two agents can modify `memory` table simultaneously without locking

**Files:**
- `packages/core/src/ai/memory-manager.ts` - Orchestrator delegates all memory ops here
- `packages/core/src/ai/memory-agent.ts` - Background agent also updates memory
- `packages/core/src/db/memory.ts` - upsertMemory() has no conflict detection

**Why fragile:**
- Memory Agent runs async, Memory Manager runs sync in handler
- If both update same key at same time: last write wins (silent data loss)
- No version field or timestamp check on updates

**Safe modification approach:**
1. Add `updated_at TIMESTAMPTZ` field to memory table
2. Use optimistic locking: check `updated_at` before upsert, fail if changed
3. Or: implement advisory locks in Postgres (SELECT pg_advisory_lock(hash(key)))
4. Prevent concurrent execution: memory_agent shouldn't run if memory_manager just executed

---

## Scaling Limits

### 1. Discord Message Queue (DM Handler)

**Current capacity:** Processing lock handles 1 DM per user sequentially

**Files:** `packages/bot-discord/src/handlers/dm-handler.ts:272-290`

**Limit:** With 30 students, each sending 1 message = 30 sequential locks, ~30 seconds total processing

**Where it breaks:**
- 100 students = 100 seconds processing (2+ minutes)
- Discord rate limits trigger (~50 msgs/min per bot)
- User sees delayed bot responses

**Scaling path:**
1. Move from in-memory locks to Redis-based queue
2. Add worker pool: process N DMs in parallel (3-5 workers)
3. Scale to 100-500 students with queue depth metrics
4. Monitor Discord API rate limits and back off on 429

---

### 2. Formation Knowledge Embeddings

**Current capacity:** 200 chunks, stored locally as vectors

**Where it breaks:**
- >5000 chunks = query performance degrades
- No automatic re-embedding when knowledge updates

**Files:** `supabase/migrations/010_formation_knowledge.sql`, `scripts/seed-formation-knowledge.ts`

**Scaling path:**
1. Batch embed on seed (already done)
2. Re-embed only changed chunks on seed:knowledge
3. Monitor vector search query time (add APM)
4. Phase 4: Switch to OpenAI embeddings (1536d) for better search quality

---

### 3. Daily Schedule Crons (Telegram Bot)

**Current capacity:** 5 crons (08:30, 11:00, 14:00, 19:00, 00:00)

**Files:** `packages/bot-telegram/src/scheduler.ts`

**Where it breaks:**
- Each cron sends 1 message to admin = 5 messages/day
- Phase 4: 10+ new crons (content checks, client followups, etc.) = context switching overhead
- No distribution: all fire at once if bot restarts

**Scaling path:**
1. Move crons to centralized scheduler in `packages/core`
2. Use DB-driven schedule with jitter (±5 min) to avoid thundering herd
3. Implement cron failure recovery (retry 3x with exponential backoff)
4. Add observability: log each cron execution and duration

---

## Dependencies at Risk

### 1. OpenAI Whisper for Transcription (Single Point of Failure)

**Risk:** Transcription API outage blocks audio messages in both Telegram bots

**Files:**
- `packages/core/src/ai/transcribe.ts` - Uses OpenAI Whisper API directly
- `packages/bot-telegram/src/handlers/voice.ts` - Audio message handler depends on transcription
- `packages/bot-telegram-public/src/handlers/voice.ts` - Same dependency

**Impact:** If OpenAI Whisper down → users can't send voice messages (all voice features blocked)

**Mitigation:**
1. Add fallback: cache transcriptions (Redis or DB) + return cached if API fails
2. Queue failed transcriptions for batch retry (5 min later)
3. Monitor Whisper API status via StatusPage
4. Phase 4: Consider alternative (Google Cloud Speech-to-Text, Azure)

---

### 2. Claude API Cost Control (Budget Risk)

**Risk:** No spending limits; high-context-window agents (tsarag, dm) could spike costs

**Agents with highest token consumption:**
- Tsarag agent: system prompt (500 tokens) + tools (1000+) + conversation history (2000+) = 3500+ tokens per message
- DM agent: similar structure + file attachments (vision)

**Phase 4 risk:** If conversation history saved to DB and loaded for every message, costs multiply

**Mitigation:**
1. Set monthly budget limit in Anthropic console
2. Log token usage per message (track in DB)
3. Implement token budgets per agent type
4. Use Haiku for simple tasks, Sonnet only for complex reasoning
5. Compress conversation history before reloading (summarize after 50 messages)

---

## Test Coverage Gaps

### 1. Orchestrator Action Execution (Complex, Untested)

**What's not tested:**
- Orchestrator parses JSON actions correctly
- Each action type (create_task, complete_task, note, manage_memory, etc.) executes correctly
- Inline actions succeed/fail independently without affecting others
- Memory Agent background doesn't interfere with orchestrator response

**Files:**
- `packages/core/src/ai/orchestrator.ts:115-240` - All action execution logic
- No tests mock Claude API responses or DB operations

**Risk:** Silent failures (actions silently dropped if JSON parse fails, no error to user)

**Priority:** HIGH (core feature)

---

### 2. Formation Exercise Reviewer (AI-Generated Content)

**What's not tested:**
- Reviewer correctly parses Claude response as ExerciseReviewResult
- Image attachments downloaded and passed to Claude correctly
- Scores are reasonable (always 5-8, never 0 or 10?)
- Language mixing (French + Russian in response) works

**Files:**
- `packages/core/src/ai/formation/exercise-reviewer.ts:78-170` - Core review logic
- `packages/core/src/ai/formation/dm-agent.ts:454-468` - Exercise trigger (fire-and-forget)

**Risk:** Student gets incomplete or nonsensical review; no feedback loop

**Priority:** HIGH (affects student experience)

---

### 3. Database Migration Safety

**What's not tested:**
- All 16 migrations apply in order without errors
- Data integrity after migrations (no orphaned rows)
- RPC functions (search_formation_knowledge, search_memory_hybrid) return correct types
- Indexes built correctly (no N+1 queries)

**Files:**
- `supabase/migrations/*.sql` - Zero automated testing
- No pre-deployment validation script

**Risk:** Migration fails on production, manual rollback needed

**Priority:** MEDIUM (mitigated by manual testing, but error-prone)

---

## Missing Critical Features

### 1. Graceful Error Recovery for Students

**Feature gap:** When exercise submission fails (upload, AI review, etc.), student gets error but no retry path

**Problem:**
- Student tries to submit exercise in DM → storage upload fails → "error: internal_error"
- Student doesn't know if submission was partial, lost, or queued
- No way to check submission status without DM history

**Files:**
- `packages/core/src/ai/formation/dm-agent.ts:259-268` - Upload error thrown
- `packages/core/src/ai/formation/dm-agent.ts:345-380` - Submission creation
- No status query tool in DM agent

**What's needed:**
1. Add `status` tool to DM agent: "Какой статус моего задания?" → returns latest submission state
2. Implement submission queuing (if upload fails, queue for retry)
3. Notify student via DM when queued task retried/succeeds

---

### 2. Mentor Review Workflow (Partially Implemented)

**Feature gap:** Mentors can view exercises but limited approval capabilities

**Problem:**
- Mentors (alumni) can call `/review` to see pending exercises
- Mentors can leave feedback (FAQ tool)
- But mentors can't approve or request revisions (only admin/formateur can)
- No assignment of mentors to students for supervision

**Files:**
- `specs/04-bot-discord/SPEC.md:88-94` - Mentor role defined
- `packages/core/src/db/formation/exercises.ts` - No mentor_id field
- `packages/bot-discord/src/commands/admin/review.ts` - /review access uses isMentor() but no approval buttons

**What's needed:**
1. Add mentor_id to student_exercises table
2. Let mentors approve exercises for their pod (not all)
3. Send mentor notifications for their pod's submissions

**Priority:** MEDIUM (blocking mentor role activation)

---

## Summary by Severity

### 🔴 CRITICAL (Fix Before Production)
1. **No automated tests** - Zero test coverage on core agents
2. **Unhandled promises** - Silent failures in storage cleanup and notifications
3. **Exercise reviewer not validated** - AI output could be nonsensical
4. **State machine fragility** - Submission state transitions not atomic

### 🟠 HIGH (Fix Before Phase 4)
1. **Event dispatcher not implemented** - Admin gets spammed with notifications
2. **Missing orchestrator tests** - Core action logic untested
3. **Memory manager conflicts** - Concurrent updates possible
4. **No migration testing** - DB changes risky

### 🟡 MEDIUM (Fix in Phase 4)
1. **Large agent files** - Hard to maintain (1045 lines)
2. **In-memory conversation scaling** - Memory leak on high volume
3. **Type safety gaps** - No Zod env validation
4. **Mentor workflow incomplete** - Feature partially implemented

### 🟢 LOW (Nice to Have)
1. **Performance monitoring** - No metrics on API latency
2. **Knowledge search optimization** - Premature (current dataset small)
3. **Alternative transcription** - Whisper working, backups not urgent

---

*Concerns audit: 2026-03-24*
