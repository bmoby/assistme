# Architecture

**Analysis Date:** 2026-03-31

## Pattern Overview

**Overall:** Multi-bot monorepo with shared Core brain. Four independent bot processes communicate through a central `@assistme/core` package and a shared Supabase database. AI agents use Claude API tool-use loops for decision-making.

**Key Characteristics:**
- Four independent bot processes (Telegram Admin, Telegram Public, Discord Trainer, Discord Quiz) share one Core package
- AI-driven orchestration: user messages are interpreted by Claude, which returns structured JSON actions
- Three-tier memory system (core/working/archival) with temporal decay and semantic search
- Event-driven inter-bot communication via `formation_events` DB table (polled by cron)
- Autonomous agent jobs persisted in DB, processed by cron every minute
- Graceful degradation: Redis cache and embedding server are optional

## Layers

**Bot Layer (Platform Clients):**
- Purpose: Handle user interactions via platform-specific APIs
- Location: `packages/bot-telegram/src/index.ts`, `packages/bot-telegram-public/src/index.ts`, `packages/bot-discord/src/index.ts`, `packages/bot-discord-quiz/src/index.ts`
- Contains: Bot initialization, dotenv loading, handler/command/cron registration, error handling
- Depends on: grammY (Telegram), discord.js (Discord), `@assistme/core`
- Used by: End users via Telegram/Discord
- Pattern: Each bot has a `main()` function that initializes client, registers handlers, then starts

**Handler Layer:**
- Purpose: Route incoming platform events to appropriate AI agents or direct DB operations
- Location: `packages/bot-telegram/src/handlers/`, `packages/bot-telegram-public/src/handlers/`, `packages/bot-discord/src/handlers/`, `packages/bot-discord-quiz/src/handlers/`
- Contains:
  - `packages/bot-telegram/src/handlers/free-text.ts` -- Routes admin free text to Orchestrator, then dispatches actions (memory, research, agent invocation, client discovery)
  - `packages/bot-telegram/src/handlers/voice.ts` -- Transcribes voice via Whisper, then routes to Orchestrator
  - `packages/bot-telegram-public/src/handlers/message.ts` -- Public Q&A with lead detection via Claude tags
  - `packages/bot-discord/src/handlers/dm-handler.ts` -- Multi-turn DM Agent conversations with exercise submission flow
  - `packages/bot-discord/src/handlers/admin-handler.ts` -- Tsarag Agent for admin channel management
  - `packages/bot-discord/src/handlers/faq.ts` -- FAQ channel auto-answering with knowledge base
  - `packages/bot-discord-quiz/src/handlers/quiz-start.ts`, `quiz-answer.ts`, `quiz-dm.ts` -- Quiz interaction flow via buttons and DMs
- Depends on: Core (AI agents, DB functions)
- Used by: Bot layer event emitters

**Command Layer:**
- Purpose: Handle explicit slash commands and bot commands
- Location: `packages/bot-telegram/src/commands/`, `packages/bot-discord/src/commands/`, `packages/bot-discord-quiz/src/commands/`
- Contains:
  - Telegram: `/plan`, `/tasks`, `/next`, `/done`, `/add`, `/skip`, `/clients`, `/newclient`, `/notifs`, `/voice`, `/kb`
  - Discord Trainer: `/add-student`, `/announce`, `/review`, `/approve`, `/revision`, `/student-list`, `/session`, `/session-update`, `/create`
  - Discord Quiz: `/quiz-create` (upload TXT, AI parses, sends to students), `/quiz-status`, `/quiz-close`
- Depends on: Core (DB, agents, logger)
- Used by: Handlers that detect command syntax or slash command interactions

**Cron Layer:**
- Purpose: Execute time-based background jobs autonomously
- Location: `packages/bot-telegram/src/cron/`, `packages/bot-discord/src/cron/`, `packages/bot-discord-quiz/src/cron/`
- Contains:
  - Telegram: memory consolidation (03:00), zombie reminder cleanup (06:55), daily notification plan (07:00), notification dispatch (every 2 min), formation event dispatch (every 5 min), agent job processor (every 1 min)
  - Discord: exercise digest (09:00), dropout detection (Mon 10:00), event dispatch (every 5 min), deadline reminders (10:00), storage cleanup (03:00), admin digest (09:00/21:00), agent job processor (every 1 min)
  - Quiz: close expired quiz sessions (every 30 min)
- Depends on: Core (scheduler, AI, DB, agents)
- Used by: Core scheduler (node-cron) -- registered at bot startup

**AI Agent Layer:**
- Purpose: Decision-making and response generation using Claude API
- Location: `packages/core/src/ai/`
- Contains:
  - `packages/core/src/ai/orchestrator.ts` -- Telegram admin Orchestrator: interprets free text, returns structured JSON actions
  - `packages/core/src/ai/formation/dm-agent.ts` -- Discord DM Agent: multi-turn tool-use loop for student interactions (5 tool types)
  - `packages/core/src/ai/formation/tsarag-agent.ts` -- Discord Admin Agent: formation management with propose/confirm action flow
  - `packages/core/src/ai/formation/faq-agent.ts` -- FAQ answering with existing FAQ matching
  - `packages/core/src/ai/formation/exercise-reviewer.ts` -- AI exercise review with attachment analysis
  - `packages/core/src/ai/memory-agent.ts` -- Background memory extraction from conversations
  - `packages/core/src/ai/memory-manager.ts` -- Explicit memory CRUD operations
  - `packages/core/src/ai/memory-consolidator.ts` -- Nightly memory tier consolidation
  - `packages/core/src/ai/research-agent.ts` -- Deep research report generation
  - `packages/core/src/ai/client-discovery-agent.ts` -- Client qualification question generation
  - `packages/core/src/ai/planner.ts` -- Daily plan generation
  - `packages/core/src/ai/notification-planner.ts` -- AI-driven notification scheduling
  - `packages/core/src/ai/context-builder.ts` -- Assembles dynamic prompt context from memory tiers + live data
  - `packages/core/src/ai/client.ts` -- Claude API client wrapper (singleton, model selection)
  - `packages/core/src/ai/embeddings.ts` -- OpenAI text-embedding-3-small for semantic search
  - `packages/core/src/ai/transcribe.ts` -- OpenAI Whisper transcription
  - `packages/core/src/ai/tts.ts` -- Text-to-speech generation
  - `packages/bot-discord-quiz/src/ai/parse-quiz.ts` -- Quiz TXT parsing via Claude with Zod validation
- Depends on: Claude API, OpenAI API, Core DB, Supabase
- Used by: Handlers, Cron jobs, Commands

**Autonomous Agent Framework:**
- Purpose: Async background agent jobs with DB persistence and chaining
- Location: `packages/core/src/agents/`
- Contains:
  - `packages/core/src/agents/registry.ts` -- Agent registration and invocation with permission checks
  - `packages/core/src/agents/types.ts` -- AgentDefinition, AgentJob, AgentOrigin, CallerRole types
  - `packages/core/src/agents/permissions.ts` -- Role-based access control for agent invocation
  - `packages/core/src/agents/db.ts` -- Agent job DB operations (create, get, mark status)
  - `packages/core/src/agents/job-processor.ts` -- Polls pending jobs, executes, uploads files to Storage, chains jobs
  - `packages/core/src/agents/artisan/` -- PPTX presentation generator agent
  - `packages/core/src/agents/chercheur.ts` -- Deep research agent (chains to artisan)
- Pattern: `registerAgent()` at startup, `invoke()` creates DB job, cron polls and executes

**Database Layer:**
- Purpose: Persistent storage abstraction over Supabase (PostgreSQL)
- Location: `packages/core/src/db/`
- Contains:
  - `packages/core/src/db/client.ts` -- Singleton Supabase client
  - `packages/core/src/db/tasks.ts` -- Task CRUD (personal task management)
  - `packages/core/src/db/daily-plans.ts` -- Daily plan persistence
  - `packages/core/src/db/clients.ts` -- Client/lead pipeline CRUD
  - `packages/core/src/db/memory.ts` -- Three-tier memory operations (core/working/archival) with decay and hybrid search
  - `packages/core/src/db/reminders.ts` -- Reminder scheduling and lifecycle
  - `packages/core/src/db/public-knowledge.ts` -- Public bot knowledge base
  - `packages/core/src/db/formation/students.ts` -- Student CRUD and lookup by Discord ID
  - `packages/core/src/db/formation/exercises.ts` -- Exercise submission, review, status management
  - `packages/core/src/db/formation/sessions.ts` -- Session CRUD and publishing
  - `packages/core/src/db/formation/faq.ts` -- FAQ entries CRUD
  - `packages/core/src/db/formation/events.ts` -- Inter-bot event creation and polling
  - `packages/core/src/db/formation/attachments.ts` -- Exercise attachment management with Supabase Storage
  - `packages/core/src/db/formation/knowledge.ts` -- Formation knowledge base with hybrid search (BM25 + vector)
  - `packages/core/src/db/quiz/quizzes.ts` -- Quiz CRUD
  - `packages/core/src/db/quiz/questions.ts` -- Quiz question operations
  - `packages/core/src/db/quiz/sessions.ts` -- Student quiz session tracking
  - `packages/core/src/db/quiz/answers.ts` -- Student answer recording and evaluation
- Depends on: Supabase client
- Used by: All agents, handlers, cron jobs

**Cache Layer:**
- Purpose: Optional in-memory caching for memory contexts
- Location: `packages/core/src/cache/redis.ts`
- Contains: Singleton Redis client, TTL-based get/set/delete
- Pattern: Graceful degradation -- if Redis unavailable, returns null and callers fall through to DB
- Used by: Context Builder (memory tiers cached: core 5 min, working 2 min)

**Type System:**
- Purpose: Centralized TypeScript interfaces and type unions
- Location: `packages/core/src/types/index.ts`
- Contains: Task, Student, StudentExercise, Client, Session, Quiz, QuizQuestion, MemoryEntry, Reminder, FormationEvent, PublicKnowledge, FaqEntry, and all related status/category enums
- Used by: All layers via `import type { ... } from '@assistme/core'`

**Scheduler:**
- Purpose: Centralized cron job registration and lifecycle
- Location: `packages/core/src/scheduler/index.ts`
- Contains: `registerJob()`, `startAllJobs()`, `stopAllJobs()` with error-wrapped execution
- Used by: Bot cron modules register jobs at startup

## Data Flow

**Telegram Admin Message Flow:**

1. User sends text message to Telegram admin bot
2. `packages/bot-telegram/src/handlers/free-text.ts` catches non-command text
3. `isAdmin(ctx)` validates sender (`packages/bot-telegram/src/utils/auth.ts`)
4. Message added to in-memory conversation history (`packages/bot-telegram/src/utils/conversation.ts`)
5. `processWithOrchestrator()` called (`packages/core/src/ai/orchestrator.ts`):
   a. `buildContext()` assembles memory tiers + live tasks/clients + temporal data
   b. Claude API called with context-enriched system prompt
   c. JSON response parsed: `{ actions: [...], response: "..." }`
   d. Actions executed inline: `create_task`, `complete_task`, `create_client`
   e. Deferred actions returned: `manage_memory`, `start_research`, `invoke_agent`, `start_client_discovery`
6. Handler dispatches deferred actions (memory manager, research agent, agent invocation)
7. Memory Agent runs in background (fire-and-forget) to extract long-term memories
8. Response sent back to user via `smartReply()` (plain text or TTS)

**Discord Student DM Flow:**

1. Student sends DM to Discord Trainer bot
2. `packages/bot-discord/src/handlers/dm-handler.ts` catches DM messages
3. Per-user processing lock acquired (prevents concurrent processing)
4. Attachments downloaded to buffer, URLs detected in text
5. `runDmAgent()` called (`packages/core/src/ai/formation/dm-agent.ts`):
   a. Student identified by Discord ID
   b. Claude API called with tool-use loop (max 5 iterations)
   c. Tools: `get_student_progress`, `get_session_exercise`, `create_submission`, `get_pending_feedback`, `search_course_content`
   d. If `create_submission` tool used, returns `submissionIntent` (not DB write)
6. If submission intent present, handler shows preview-confirm flow:
   a. Embed with session info, files, comments
   b. Confirm/Cancel buttons with 2-minute timeout
   c. On confirm: uploads files to Supabase Storage, creates DB records, triggers AI review (fire-and-forget)
   d. Admin notification sent to `#admin` channel
7. Stale conversations cleaned up every 5 minutes (30 min TTL)

**Discord Quiz Flow:**

1. Admin uploads TXT file via `/quiz-create` command (`packages/bot-discord-quiz/src/commands/quiz-create.ts`)
2. `parseQuizFromTxt()` sends TXT to Claude for structured parsing (`packages/bot-discord-quiz/src/ai/parse-quiz.ts`)
3. Zod validates parsed quiz structure (MCQ, true/false, open questions)
4. Admin sees preview embed with confirm/cancel buttons
5. On confirm: quiz + questions saved to DB, quiz sent to all active students via DM
6. Students answer question-by-question via buttons (MCQ/true_false) or DM text (open)
7. Each answer evaluated (exact match for MCQ/TF, AI for open questions)
8. Session completed when all questions answered; score calculated
9. Expired sessions closed by cron every 30 minutes

**Inter-Bot Communication (Event System):**

1. Producer creates event: `createFormationEvent({ type, source, target, data })`
   - Sources: Discord handlers, AI agents
   - Types: `exercise_submitted`, `exercise_reviewed`, `student_alert`, `announcement`, `ai_review_complete`
2. Events stored in `formation_events` table (Supabase)
3. Consumers poll every 5 minutes:
   - Telegram cron (`packages/bot-telegram/src/cron/formation-events.ts`) processes events targeted at `telegram-admin`
   - Discord cron (`packages/bot-discord/src/cron/event-dispatcher.ts`) processes events targeted at `discord`
4. Event marked as processed after delivery

**State Management:**
- Conversation state: In-memory Maps per chat/channel (TTL 30-60 min), cleared after inactivity
- Processing locks: Per-user Promise chains prevent concurrent agent executions
- Memory tiers: Persistent in Supabase, cached in Redis (core 5 min, working 2 min)
- Agent jobs: Persistent in Supabase `agent_jobs` table (pending -> processing -> completed/failed)
- Quiz sessions: Persistent in Supabase `student_quiz_sessions` table

## Key Abstractions

**Orchestrator (`packages/core/src/ai/orchestrator.ts`):**
- Purpose: Single entry point for admin message interpretation
- Pattern: Claude analyzes text + context -> returns structured JSON with actions + response
- Actions executed inline or deferred to handler
- Memory Agent runs in background after every message (unless memory action triggered)

**Tool-Use Agent Loop (`packages/core/src/ai/formation/dm-agent.ts`, `tsarag-agent.ts`):**
- Purpose: Multi-turn Claude interactions for complex workflows
- Pattern: Register tools -> Claude calls tools in loop (max 5 iterations) -> extract final text
- DM Agent tools: read-only (progress, session info, search) + write (create_submission)
- Tsarag Agent tools: read (list students/sessions/exercises) + action (propose_action/execute_pending with confirm flow)

**Context Builder (`packages/core/src/ai/context-builder.ts`):**
- Purpose: Assemble dynamic prompt context without manual parameter passing
- Pattern: `buildContext(options)` loads tiers, live data, formats into text block -> inject into system prompt
- Tiers: Core (always loaded, identity), Working (sorted by temporal decay), Archival (semantic search on user message)
- Live data: Active tasks, client pipeline, temporal info (date/time)

**Three-Tier Memory:**
- Core (permanent, identity): `packages/core/src/db/memory.ts` `getCoreMemory()`
- Working (30-day expiry): `getWorkingMemory()` with `computeDecay(last_confirmed)` scoring
- Archival (permanent, semantic search): `searchMemoryHybrid()` with BM25 + vector + decay
- Consolidation: `packages/core/src/ai/memory-consolidator.ts` runs nightly, reviews expired working memories

**Agent Job System (`packages/core/src/agents/`):**
- Purpose: Async agent execution with DB persistence
- Pattern: `registerAgent(definition)` at startup -> `invoke(name, input, origin)` creates DB job -> cron calls `processAgentJobs()` -> agent executes -> files uploaded to Storage -> result event created
- Job chaining: agent output can specify `chainTo: { agentName, input }` for pipeline execution
- Zombie recovery: jobs stuck in `processing` for too long are reset to `pending`

**Formation Event Bus:**
- Purpose: Loose coupling between bots for cross-platform notifications
- Table: `formation_events` (type, source, target, data, processed)
- Producers: Discord handlers, AI agents (exercise submission, review, alerts)
- Consumers: Cron jobs poll and dispatch (Telegram: every 5 min, Discord: every 5 min)

## Entry Points

**`packages/bot-telegram/src/index.ts` (Telegram Admin Copilot):**
- Triggers: Incoming Telegram updates (text messages, voice, commands)
- Responsibilities: Register commands, handlers, cron jobs; register autonomous agents (Artisan, Chercheur)
- Language: French (admin interface)

**`packages/bot-telegram-public/src/index.ts` (Telegram Public Bot):**
- Triggers: Incoming Telegram updates from public users
- Responsibilities: Answer questions in Russian using public knowledge base, detect leads, notify admin
- Language: Russian (audience-facing)

**`packages/bot-discord/src/index.ts` (Discord Trainer Bot):**
- Triggers: Discord gateway events (messages, slash commands, button interactions, guild member events)
- Responsibilities: Student DM conversations, exercise submission/review, FAQ, admin management, cron jobs
- Language: Russian (student-facing), French (admin channel)

**`packages/bot-discord-quiz/src/index.ts` (Discord Quiz Bot - TeacherBot):**
- Triggers: Discord slash commands, button interactions, DM messages
- Responsibilities: Quiz creation from TXT files, question delivery via DM, answer evaluation, score tracking
- Language: Russian (student-facing), French (admin commands)

**`packages/core/src/index.ts` (Core Package):**
- Barrel export aggregating all public types, DB functions, AI functions, scheduler, agents, logger
- Used by: All bots import as `import { ... } from '@assistme/core'`

## Error Handling

**Strategy:** Explicit throws for critical errors, graceful degradation for non-critical services, fire-and-forget for background operations.

**Patterns:**
- Supabase errors: check `error` field in response, log with context, rethrow
- Claude API: throw on missing text block, JSON parse fallback to plain text response
- Redis/Embedding: silent degradation -- return null, callers fall through to direct DB queries
- Background operations (AI review, admin notification, memory agent): `void promise.catch(err => logger.error(...))`
- Agent jobs: errors caught per-job, marked as `failed` in DB without stopping other jobs
- Handler-level: try/catch around full message processing, user-facing error message sent back
- Conversation locks: prevent concurrent processing per user to avoid race conditions

## Cross-Cutting Concerns

**Logging:**
- Framework: Pino (`packages/core/src/logger.ts`)
- Singleton export: `export const logger = pino({ ... })`
- Pretty-print in dev (pino-pretty), JSON in production
- Levels: debug (default disabled), info, warn, error
- Pattern: `logger.info({ contextObj }, 'Message')` -- structured first arg, string second
- Level controlled by `LOG_LEVEL` env var

**Validation:**
- Tool: Zod for runtime validation of external data (Claude responses, API inputs, quiz parsing)
- Agent input validated via `agent.inputSchema.safeParse(input)` before job creation
- Quiz parsing: discriminated union schema for MCQ/true_false/open questions
- JSON responses from Claude: try/catch with fallback to plain text

**Authentication:**
- Telegram Admin: `isAdmin(ctx)` checks `ctx.from.id` against `TELEGRAM_ADMIN_ID` env var (`packages/bot-telegram/src/utils/auth.ts`)
- Discord Trainer: Role-based via `isAdmin(message)`, `isStudent(message)`, `isMentor(message)` checking Discord role names (`packages/bot-discord/src/utils/auth.ts`)
- Discord Quiz: Same role-based pattern (`packages/bot-discord-quiz/src/utils/auth.ts`)
- Agent invocation: `CallerRole` ('admin'|'mentor'|'student'|'public') checked against `agent.allowedRoles`
- No JWT/OAuth -- trust platform API message routing

**Concurrency:**
- Per-user processing locks in DM handlers prevent concurrent agent executions
- Pattern: Promise chain per userId -- new messages queue behind existing processing
- Location: `processingLocks` Maps in `dm-handler.ts` and `admin-handler.ts`

**Caching:**
- Redis optional: `packages/core/src/cache/redis.ts` with TTL-based get/set
- Memory tiers cached separately (core 5 min, working 2 min)
- Graceful degradation: if Redis unavailable, goes directly to Supabase

**Configuration:**
- Channel/role names centralized: `packages/bot-discord/src/config.ts`, `packages/bot-discord-quiz/src/config.ts`
- Must match Discord server setup exactly
- Environment: dotenv loaded from project root `.env` (and `.env.dev` for Discord bots)

---

*Architecture analysis: 2026-03-31*
