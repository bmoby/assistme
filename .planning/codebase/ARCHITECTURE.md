# Architecture

**Analysis Date:** 2026-03-24

## Pattern Overview

**Overall:** Multi-bot centralized architecture with async event-driven orchestration.

**Key Characteristics:**
- **Three independent bot clients** (Telegram Admin, Telegram Public, Discord) communicate through a shared Core brain
- **Request-response pattern** for synchronous operations + **event-driven pattern** for async notifications
- **Autonomous agents** (Orchestrator, DM Agent, Tsarag Agent, FAQ Agent) with tool use for Claude API
- **Three-tier memory system** (Core/Working/Archival) with semantic search via pgvector
- **Graceful degradation:** Redis cache and embedding server are optional, system works without them

## Layers

**Entry Points (Bot Layer):**
- Purpose: Handle user interactions via platform APIs (Telegram grammY, Discord.js)
- Location: `packages/bot-telegram/src/index.ts`, `packages/bot-telegram-public/src/index.ts`, `packages/bot-discord/src/index.ts`
- Contains: Bot initialization, event routing to handlers, error handlers
- Depends on: grammY, discord.js, Core (AI, DB, scheduler)
- Used by: End users via Telegram/Discord

**Handler Layer (Event Processors):**
- Purpose: Process incoming events from platforms and route to appropriate agents/commands
- Location: `packages/bot-telegram/src/handlers/`, `packages/bot-telegram-public/src/handlers/`, `packages/bot-discord/src/handlers/`
- Contains:
  - `free-text.ts` - Telegram admin message handler → Orchestrator
  - `voice.ts` - Telegram voice messages → Whisper transcription → Orchestrator
  - `dm-handler.ts` - Discord DMs from students → DM Agent
  - `admin-handler.ts` - Discord #admin messages → Tsarag Agent
  - `faq.ts` - Discord message patterns → FAQ Agent
  - `review-buttons.ts` - Discord button interactions → Exercise review handlers
- Depends on: Core (AI, DB, agents)
- Used by: Bot layer event emitters

**Command Layer:**
- Purpose: Execute explicit user commands (backup, manual operations)
- Location: `packages/bot-telegram/src/commands/`, `packages/bot-discord/src/commands/admin/`
- Contains: Task commands (/plan, /tasks, /next), Client commands (/clients, /newclient), Admin commands (/session, /session-update)
- Depends on: Core (DB, logger)
- Used by: Handlers that detect command syntax

**Cron/Scheduler Layer:**
- Purpose: Execute time-based autonomous jobs
- Location: `packages/bot-telegram/src/cron/`, `packages/bot-discord/src/cron/`
- Contains:
  - `dynamic-notifications.ts` - Daily plan generation (07:00), notification dispatch (*/2 min)
  - `formation-events.ts` - Event polling and forwarding between Discord/Telegram
  - `admin-digest.ts` - Daily exercise submission summary (Discord)
  - `deadline-reminders.ts` - Deadline notifications to students (24h and 48h before)
  - `exercise-digest.ts` - Daily exercise activity report
  - `dropout-detector.ts` - Student engagement monitoring
- Depends on: Core (scheduler module, AI, DB)
- Used by: Core scheduler (node-cron)

**Core/AI Layer (Brain):**
- Purpose: Decision-making and response generation for all user interactions
- Location: `packages/core/src/ai/`
- Contains:
  - `orchestrator.ts` - Main entry point for admin messages (Telegram). Analyzes user input, decides actions (create_task, manage_memory, start_research), generates response
  - `memory-agent.ts` - Background service that extracts and stores long-term learnings from orchestrator actions
  - `memory-manager.ts` - Specialized agent for memory CRUD operations (create/update/delete/search)
  - `research-agent.ts` - Deep research mode with extended token budget (16k) for complex topics
  - `client-discovery-agent.ts` - Interactive discovery for new client leads
  - `memory-consolidator.ts` - Daily cleanup (03:00) that archives/deletes expired working memories
  - `formation/dm-agent.ts` - DM handler for Discord students: file uploads, exercise submission, course search (tool use)
  - `formation/tsarag-agent.ts` - Admin conversational interface (Discord #admin): student lookup, exercise actions, announcements
  - `formation/faq-agent.ts` - Answers FAQ questions with confidence scoring
  - `formation/exercise-reviewer.ts` - Reviews student exercise submissions with session context
  - `context-builder.ts` - Assembles dynamic context (memory, tasks, clients, time) for orchestrator prompts
  - `notification-planner.ts` - Generates daily notification plan (topics, times, messages)
  - `planner.ts` - Parses daily plan generation from Claude
  - `transcribe.ts` - Whisper API for voice messages (FR/RU)
  - `embeddings.ts` - Calls embedding server or returns zero vector
- Depends on: Core (DB, logger, cache), Claude API, Supabase, Embedding Server (optional)
- Used by: Handlers, Cron jobs, Commands

**Core/DB Layer (State):**
- Purpose: Persistent storage abstraction over Supabase
- Location: `packages/core/src/db/`
- Contains:
  - `client.ts` - Supabase singleton initialization
  - `tasks.ts` - Task CRUD (create, read, update completion status)
  - `clients.ts` - Client/lead pipeline management
  - `memory.ts` - Personal memory CRUD (core/working/archival tiers, semantic search, embedding storage)
  - `reminders.ts` - Notification scheduling with state tracking (active/sent/expired)
  - `daily-plans.ts` - Session plans with task snapshots
  - `public-knowledge.ts` - Knowledge base for public bot (Telegram public)
  - `formation/` - Formation-specific tables:
    - `students.ts` - Student profiles linked to Discord IDs
    - `sessions.ts` - Training session metadata
    - `exercises.ts` - Exercise definitions
    - `knowledge.ts` - Course content with hybrid search RPC
    - `faq.ts` - FAQ entries with approval workflow
    - `attachments.ts` - Exercise submission file metadata
    - `events.ts` - Cross-bot events (Discord ↔ Telegram)
- Depends on: Supabase client
- Used by: All agents, handlers, cron jobs

**Core/Cache Layer (Performance):**
- Purpose: Optional in-memory caching for memory contexts (Redis)
- Location: `packages/core/src/cache/redis.ts`
- Contains: Singleton Redis client, TTL-based get/set for memory tiers
- Graceful degradation: If Redis unavailable, queries go directly to Supabase
- Used by: Context Builder

**Core/Types Layer:**
- Purpose: Centralized TypeScript interfaces and enums
- Location: `packages/core/src/types/index.ts`
- Contains: Task, DailyPlanTask, Client, MemoryEntry, Student, Session, Exercise, Event, Reminder types
- Used by: All layers

**Core/Scheduler Layer:**
- Purpose: Cron job registration and execution
- Location: `packages/core/src/scheduler/index.ts`
- Contains: Job registry, error-wrapped execution
- Used by: Bot cron entry points

**External Services Layer:**
- **Supabase (PostgreSQL)**: Master state store for all entities
- **Claude API**: All AI decisions and agent logic (async agent tools)
- **Embedding Server**: MiniLM-L6-v2 embeddings via HTTP (optional, FastAPI)
- **OpenAI Whisper**: Audio transcription for voice messages
- **Redis**: Optional cache for performance
- **Google APIs**: Meet link generation for sessions

## Data Flow

**Flow 1: Admin Text Message → Orchestrator → Action Execution**

1. User sends text message to Telegram Admin bot
2. `handlers/free-text.ts` receives message
3. Message added to conversation history cache (20 messages, 30 min TTL)
4. `processWithOrchestrator(text, history)` called
5. Context Builder assembles: memory (3 tiers), active tasks, clients, time
6. Claude Sonnet analyzes with orchestrator prompt (direct actions: create_task, complete_task, etc.)
7. Claude returns JSON: `{ actions: [...], response: "..." }`
8. Inline actions executed (task/client creation)
9. Response sent to user
10. If `manage_memory` action detected → `processMemoryRequest()` called
11. If `start_research` action detected → `runResearchAgent()` called
12. Background: Memory Agent analyzes significant extracts and stores as archival memories

**Flow 2: Memory Modification (Specialized Agent)**

1. User indicates memory change intent (e.g., "Je change d'objectif")
2. Orchestrator detects → returns `manage_memory` action
3. Handler calls `processMemoryRequest(userMessage, history)`
4. Memory Manager agent loads full memory state (core + working + public knowledge)
5. Claude analyzes: table (memory vs public_knowledge), action (create/update/delete), category, key
6. Execute on Supabase, invalidate cache (memory:core, memory:working)
7. Return confirmation with diff (old → new)

**Flow 3: Notification Dispatch (Scheduled)**

1. 07:00 Cron: `planDay()`
   - Reads preference: notifications per day (default 15)
   - Cancel previous day's reminders
   - Build context (tasks, clients, time)
   - Claude plans N notifications: topics, times, messages
   - Batch create reminders in DB (status: 'active')

2. Every 2 min: `dispatchNotifications()`
   - Query: reminders with trigger_at <= NOW() AND status = 'active'
   - Send each via `bot.api.sendMessage(chatId, message)`
   - Mark as sent (status: 'sent')

3. User responds → Flow 1 (normal orchestrator)

**Flow 4: Student Exercise Submission (Discord DM)**

1. Student sends text + file/link in Discord DM
2. `dm-handler.ts` intercepts (guild === null check)
3. Files validated: MIME type + size (max 25 MB)
4. Uploaded to Supabase Storage: `exercise-submissions/{student_id}/{session-N|misc}/{timestamp}-{filename}`
5. Conversation state accumulated (max 20 messages, 30 min TTL)
6. `runDmAgent({ studentId, discordId, messages, pendingAttachments })`
   - Claude with tool loop (max 5 iterations):
     - Tool 1: `get_student_progress` → student profile + submission status
     - Tool 2: `get_session_exercise` → deliverables, deadline
     - Tool 3: `create_submission` → inserts student_exercises + exercise_attachments, creates event
     - Tool 4: `get_pending_feedback` → reviews student hasn't seen
     - Tool 5: `search_course_content` → hybrid search in formation_knowledge
   - Returns text response + submissionId
7. Event created: type='exercise_submitted', target='telegram-admin'
8. Bot Discord sends response (split if >2000 chars)
9. Conversation state cleared

**Flow 5: Formation Knowledge (Hybrid Search)**

1. On seed (`pnpm seed:knowledge`):
   - Read 14 markdown files from `learning-knowledge/`
   - Chunk by H2 headings, split H3 if >3000 chars
   - Extract tags from bold text
   - Upsert to `formation_knowledge` table (idempotent by source_file+title)
   - Background embed: `getEmbedding()` → HTTP call to embedding server

2. On query (DM Agent, FAQ Agent, context):
   - `getEmbedding(query_text)` → 384-dim vector (HTTP if available, else zero vector)
   - Call RPC `search_formation_knowledge(query_text, embedding, filters)`
   - RPC scores: `vector_weight * cosine + text_weight * BM25`
   - Returns sorted results (threshold 0.25)

**Flow 6: Admin Actions via Tsarag Agent (Discord #admin)**

1. Admin writes message in #admin channel
2. `admin-handler.ts` intercepts (role check @tsarag)
3. Conversation state per channel (50 messages, 60 min TTL)
4. `runTsaragAgent(context)`
   - Claude with tool loop (max 8 iterations):
     - READ tools (7): list_students, get_student_details, list_pending_exercises, etc.
     - ACTION tools (2): propose_action (stores pending action), execute_pending
   - Pattern: READ → propose_action → wait for confirmation → execute
5. Returns: text, proposedAction, executedActionId
6. Admin confirms: "Tu confirmes ?" → User replies "oui" → execute_pending called
7. Execution side effects:
   - Create/update/approve: creates events (Telegram notification)
   - Approve exercise: DM student with feedback
   - Send announcement: posts in #annonces

**State Management:**

- **Conversation state**: In-memory maps per chat/channel (TTL 30-60 min), cleared after agent completion
- **Memory cache**: Redis with 2-5 min TTL for tier contexts, invalidated on upsert/delete
- **Reminder state**: Persistent in Supabase (active → sent → expired)
- **Event queue**: Persistent in Supabase (unprocessed → processed)
- **Formation knowledge embeddings**: Stored in pgvector columns, fetched on seed/search

## Key Abstractions

**Orchestrator Pattern:**
- Purpose: Single entry point for admin message interpretation
- Location: `packages/core/src/ai/orchestrator.ts`
- Pattern: Claude analyzes text + context → returns structured JSON with actions + response
- Used by: Telegram admin handlers

**Agent Pattern (Tool-Use Loop):**
- Purpose: Multi-turn Claude interactions for complex workflows
- Examples: DM Agent, Tsarag Agent, FAQ Agent, Exercise Reviewer
- Pattern: Register tools → Claude calls tools in loop (max N iterations) → extract final text
- Tool categories: READ (queries DB/API) and ACTION (modify state with confirmation)

**Context Builder Pattern:**
- Purpose: Assemble dynamic prompt context without manual parameter passing
- Location: `packages/core/src/ai/context-builder.ts`
- Pattern: `buildContext(options)` loads tiers, live data, formats into text block → inject into system prompt
- Caching: Memory tiers cached separately (core 5 min, working 2 min)

**Memory Tier System:**
- Purpose: Organize long-term knowledge with different retention/search policies
- Core (permanent, identity): Personality, skills, life structure
- Working (30-day expiry, situation/preference/relationship): Current activities, goals, people
- Archival (permanent, lessons): Past experiences, learnings (semantic search only)
- Consolidation: Daily 03:00 cron reviews expired working memories, archives or deletes

**Event-Driven Cross-Bot Communication:**
- Purpose: Async notifications without tight coupling
- Table: `events` (id, source, target, type, data, created_at, processed_at)
- Producers: DM Agent, Tsarag Agent, handlers
- Consumers: Cron jobs (event-dispatcher every 2 min), handlers
- Pattern: Create event → cron polls → format and send → mark processed

**Embedding Search Pipeline:**
- Purpose: Semantic retrieval for course content and memory
- Query flow: getText() → getEmbedding(text) → HTTP to embedding server → pgvector similarity
- Fallback: If embedding server down, use zero vector (BM25 only, graceful degradation)
- RPC: `search_formation_knowledge()` combines vector + BM25 scores

## Entry Points

**Telegram Admin Bot (`packages/bot-telegram/src/index.ts`):**
- Location: Entry point at main() function
- Triggers: Incoming Telegram updates (messages, voice, buttons)
- Responsibilities:
  - Load .env, initialize grammY Bot
  - Register autonomous agents (Artisan, Chercheur)
  - Register handlers (commands, voice, free text)
  - Register cron jobs
  - Error handling
- Outputs: Messages to chat, notifications

**Telegram Public Bot (`packages/bot-telegram-public/src/index.ts`):**
- Location: Entry point at main() function
- Triggers: Incoming Telegram updates from non-admin users
- Responsibilities:
  - Load .env, initialize grammY Bot
  - Handle /start command
  - Register voice + message handlers
  - Transcribe voice (Whisper RU)
  - Load public_knowledge from DB
  - Error handling
- Outputs: Messages to chat, lead notifications to admin

**Discord Bot (`packages/bot-discord/src/index.ts`):**
- Location: Entry point at main() function
- Triggers: Discord gateway events (ready, messages, interactions)
- Responsibilities:
  - Load .env, initialize Discord.js Client
  - Register autonomous agents
  - Register slash commands via REST API
  - Setup handlers (DM, admin #channel, FAQ, buttons, member join)
  - Register cron jobs
  - Error handling
- Outputs: Messages, DMs, channel announcements, button responses

**Core Index (`packages/core/src/index.ts`):**
- Location: Module export aggregator
- Exports: All public types, DB functions, AI functions, scheduler, agents, logger
- Used by: All bots import this as `import { ... } from '@assistme/core'`

## Error Handling

**Strategy:** Explicit try-catch blocks with structured logging, never silent failures.

**Patterns:**

1. **Cron jobs** (`packages/core/src/scheduler/index.ts`):
```
try {
  await job.handler()
  logger.info({ job: job.name }, 'Cron job completed')
} catch (error) {
  logger.error({ job: job.name, error }, 'Cron job failed')
  // Continue to next job, don't crash
}
```

2. **Agent tool calls** (DM Agent, Tsarag Agent):
```
try {
  const result = await tool()
  // Use result
} catch (error) {
  logger.error({ tool: name, error }, 'Tool failed')
  // Return error message to Claude via tool_use_error response
}
```

3. **External service failures** (Redis, Embedding Server):
```
try {
  return await redis.get(key)
} catch {
  logger.debug('Cache miss, querying DB directly')
  return await db.query() // Graceful degradation
}
```

4. **Database constraints** (unique keys, foreign keys):
```
try {
  await db.upsert(record)
} catch (error) {
  if (error.code === 'UNIQUE_VIOLATION') {
    logger.warn('Duplicate entry, updating instead')
    await db.update(record)
  } else {
    throw error // Re-throw unexpected errors
  }
}
```

5. **Handler-level** (Telegram/Discord):
```
bot.catch((err) => {
  logger.error({ error: err.error, ctx: err.ctx?.update }, 'Bot error')
  // Don't reply to user, just log
})
```

## Cross-Cutting Concerns

**Logging:**
- Framework: Pino (structured JSON logging)
- Configuration: `packages/core/src/logger.ts`
- Pretty-print in dev, JSON in production
- Levels: debug (disabled by default), info, warn, error
- Pattern: `logger.info({ context }, 'Message')` for all meaningful actions

**Validation:**
- Tool: Zod for runtime validation of external data (Supabase responses, Claude outputs)
- Location: `packages/core/src/types/` and AI modules
- Pattern: Parse and validate before use, throw explicit errors if invalid

**Authentication:**
- Telegram: Admin check via `isAdmin(ctx)` helper in `packages/bot-telegram/src/utils/auth.ts`
- Discord: Role check via `isAdmin(interaction)` or role verification in handlers
- No JWT/OAuth (trust incoming message routing from platform APIs)

**Concurrency Control:**
- Conversation state: Per-channel/chat locks prevent concurrent agent executions
- Location: Lock maps in handler modules
- Pattern: Acquire lock → run agent → release lock → process other messages sequentially

**Performance Considerations:**
- **Memory contexts cached**: Core (5 min), Working (2 min) to reduce DB queries
- **Embedding server optional**: Zero vector fallback if unavailable
- **Batch operations**: Formation knowledge seeded in chunks, reminders created in batch
- **Cron schedule staggering**: 03:00 consolidation before 07:00 plan before 07:02 dispatch

---

*Architecture analysis: 2026-03-24*
