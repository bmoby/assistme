# External Integrations

**Analysis Date:** 2026-03-31

## APIs & External Services

### Anthropic (Claude API)

- **SDK/Client:** `@anthropic-ai/sdk` 0.39.0
- **Auth:** API key via `ANTHROPIC_API_KEY` (personal) and `ANTHROPIC_API_KEY_FORMATION` (formation, optional fallback to main)
- **Client initialization:** `packages/core/src/ai/client.ts` — Two singleton Anthropic instances
- **Models used:**
  - `claude-sonnet-4-6` — Default for most operations (orchestrator, quiz parsing, FAQ, DM agent, exercise review, planner)
  - `claude-opus-4-6` — Used for open answer evaluation in quiz (`packages/bot-discord-quiz/src/utils/quiz-eval.ts`)
- **Used in:**
  - `packages/core/src/ai/client.ts` — `askClaude()` (simple prompt-response) and `getFormationClient()` (raw SDK for tool-use agents)
  - `packages/core/src/ai/orchestrator.ts` — Admin message interpretation with JSON action extraction
  - `packages/core/src/ai/formation/dm-agent.ts` — Multi-turn student DM conversations with tool use
  - `packages/core/src/ai/formation/tsarag-agent.ts` — Admin formation management with tool use
  - `packages/core/src/ai/formation/faq-agent.ts` — FAQ answer generation
  - `packages/core/src/ai/formation/exercise-reviewer.ts` — Exercise evaluation with multi-modal (images) support
  - `packages/core/src/ai/memory-agent.ts` — Memory CRUD operations
  - `packages/core/src/ai/memory-consolidator.ts` — Daily memory tier consolidation
  - `packages/core/src/ai/research-agent.ts` — Research tasks
  - `packages/core/src/ai/planner.ts` — Daily plan generation and message parsing
  - `packages/core/src/ai/notification-planner.ts` — Notification scheduling
  - `packages/core/src/ai/client-discovery-agent.ts` — Client qualification
  - `packages/bot-discord-quiz/src/ai/parse-quiz.ts` — Parse TXT files into structured quiz questions
  - `packages/bot-discord-quiz/src/utils/quiz-eval.ts` — Evaluate open-ended quiz answers
- **Purpose:** All AI decision-making, text generation, structured data extraction, and multi-turn tool-use agent workflows
- **Error handling:**
  - `askClaude()` throws on missing API key or no text response
  - JSON responses from Claude parsed with `JSON.parse()` + fallback for malformed output
  - Zod validation on structured responses (e.g., `ParsedQuizSchema.parse()`)
  - Tool-use agents have max iteration limits to prevent infinite loops

### OpenAI

- **SDK/Client:** `openai` 6.27.0 (for Whisper/TTS), direct `fetch` to REST API (for embeddings)
- **Auth:** `OPENAI_API_KEY` env var
- **Used in:**
  - `packages/core/src/ai/transcribe.ts` — `transcribeAudio()` using Whisper (`whisper-1` model)
  - `packages/core/src/ai/tts.ts` — `textToSpeech()` using TTS (`tts-1` or `tts-1-hd` model, configurable via `TTS_MODEL`)
  - `packages/core/src/ai/embeddings.ts` — `getEmbedding()` / `getEmbeddings()` using `text-embedding-3-small` model via REST API
- **Purpose:**
  - **Whisper:** Voice message transcription (French default, configurable language parameter)
  - **TTS:** Voice response generation (opus format, voice configurable via `TTS_VOICE`, max 4096 chars)
  - **Embeddings:** 1536-dimensional vectors for semantic search on formation knowledge and memory
- **Error handling:**
  - Whisper/TTS: throws on missing API key, propagates API errors
  - Embeddings: returns `null` on any failure (graceful degradation — search still works via BM25 text matching)
  - Embeddings have 10s timeout (single) / 30s timeout (batch) via `AbortSignal.timeout()`

### Telegram Bot API

- **SDK/Client:** `grammy` 1.31.0 with `@grammyjs/runner` 2.0.3
- **Auth:** `TELEGRAM_BOT_TOKEN` (admin bot), `PUBLIC_BOT_TOKEN` (public bot)
- **Used in:**
  - `packages/bot-telegram/src/index.ts` — Admin copilot bot (French)
  - `packages/bot-telegram-public/src/index.ts` — Public audience bot (Russian)
- **Purpose:** Two separate Telegram bots:
  - **Admin bot:** Personal copilot with task management, voice messages, orchestrator, cron notifications
  - **Public bot:** Public-facing bot for audience in Russian (course info, services, FAQ)
- **Error handling:** `bot.catch()` global error handler logging to pino

### Discord Gateway API

- **SDK/Client:** `discord.js` 14.16.0
- **Auth:** `DISCORD_BOT_TOKEN` (formateur), `DISCORD_QUIZ_BOT_TOKEN` (quiz)
- **Used in:**
  - `packages/bot-discord/src/index.ts` — Formateur bot (Intents: Guilds, GuildMessages, MessageContent, GuildMembers, DirectMessages)
  - `packages/bot-discord-quiz/src/index.ts` — Quiz bot (Intents: Guilds, DirectMessages, GuildMembers)
  - Both require `DISCORD_CLIENT_ID` / `DISCORD_QUIZ_CLIENT_ID` and `DISCORD_GUILD_ID`
- **Purpose:** Two separate Discord bots on the same guild:
  - **Formateur:** Slash commands for session/exercise/student management, DM agent, FAQ, review threads, admin handler
  - **Quiz:** Automated quiz delivery via DMs, button interactions for MCQ/true-false, AI evaluation for open questions
- **Features used:** Slash commands (REST API registration), button interactions, DMs, forum channels, thread management, member events
- **Error handling:** `client.on('error')` global error handler; slash command registration wrapped in try-catch with warning log

### Google Calendar API

- **SDK/Client:** `googleapis` 171.4.0
- **Auth:** OAuth2 with refresh token via `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- **Used in:** `packages/core/src/google/meet.ts` — `createMeetEvent()`
- **Purpose:** Create Google Calendar events with auto-generated Google Meet links for live training sessions
- **Scope:** `https://www.googleapis.com/auth/calendar.events`
- **Error handling:**
  - **Graceful degradation:** Returns fictitious Meet URL when credentials not configured (dev/test)
  - Throws on missing credentials or failed event creation in production
- **Setup scripts:** `scripts/google-auth.ts` — OAuth2 flow to obtain initial refresh token

## Data Storage

### Supabase (PostgreSQL + pgvector + Storage)

- **Client:** `@supabase/supabase-js` 2.49.1
- **Connection:** Service role key via `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- **Client location:** `packages/core/src/db/client.ts` — Singleton pattern
- **Migrations:** `supabase/migrations/` — 19 sequential SQL files (001 through 019)

**Core Tables:**
| Table | Module | Purpose |
|-------|--------|---------|
| `tasks` | `packages/core/src/db/tasks.ts` | Task management (todo, in_progress, done) |
| `daily_plans` | `packages/core/src/db/daily-plans.ts` | AI-generated daily plans |
| `clients` | `packages/core/src/db/clients.ts` | Client/lead pipeline |
| `team_members` | — | Team member profiles |
| `memory` | `packages/core/src/db/memory.ts` | Three-tier memory system (core/working/archival) with embeddings |
| `public_knowledge` | `packages/core/src/db/public-knowledge.ts` | Public bot knowledge base |
| `reminders` | `packages/core/src/db/reminders.ts` | Scheduled reminders |

**Formation Tables:**
| Table | Module | Purpose |
|-------|--------|---------|
| `students` | `packages/core/src/db/formation/students.ts` | Student enrollment and profiles |
| `sessions` | `packages/core/src/db/formation/sessions.ts` | Training session management |
| `student_exercises` | `packages/core/src/db/formation/exercises.ts` | Exercise submissions and reviews |
| `submission_attachments` | `packages/core/src/db/formation/attachments.ts` | Files attached to submissions |
| `formation_knowledge` | `packages/core/src/db/formation/knowledge.ts` | Course content with embeddings (pgvector) |
| `formation_events` | `packages/core/src/db/formation/events.ts` | Inter-bot event queue |
| `faq` | `packages/core/src/db/formation/faq.ts` | FAQ entries for the FAQ agent |

**Quiz Tables:**
| Table | Module | Purpose |
|-------|--------|---------|
| `quizzes` | `packages/core/src/db/quiz/quizzes.ts` | Quiz metadata (draft/active/closed) |
| `quiz_questions` | `packages/core/src/db/quiz/questions.ts` | Individual questions per quiz |
| `student_quiz_sessions` | `packages/core/src/db/quiz/sessions.ts` | Per-student quiz progress tracking |
| `student_quiz_answers` | `packages/core/src/db/quiz/answers.ts` | Individual answer records with AI evaluation |

**Agent Tables:**
| Table | Module | Purpose |
|-------|--------|---------|
| `agent_jobs` | `packages/core/src/agents/db.ts` | Async agent job queue (pending/processing/completed/failed) |

**File Storage (Supabase Storage buckets):**
- `exercise-submissions` — Student exercise file uploads (signed URLs for access)
  - Used in: `packages/core/src/db/formation/attachments.ts`
- `agent-outputs` — Generated files from autonomous agents (PPTX, etc.)
  - Used in: `packages/core/src/agents/job-processor.ts`

**PostgreSQL Extensions:**
- `uuid-ossp` — UUID generation for primary keys
- `pgvector` — Vector similarity search for embeddings (1536-dimensional, OpenAI text-embedding-3-small)
- `tsvector` — Full-text search (BM25) for formation knowledge hybrid search

**RPC Functions:**
- `search_formation_knowledge()` — Hybrid search combining vector cosine similarity + BM25 text matching
  - Defined in: `supabase/migrations/010_formation_knowledge.sql` (with fixes in 011, 012)

### Redis

- **Client:** `redis` 4.6.0 (node-redis)
- **Connection:** `REDIS_URL` env var (e.g., `redis://localhost:6379`)
- **Client location:** `packages/core/src/cache/redis.ts` — Singleton with graceful degradation
- **Purpose:** TTL-based caching for memory context queries
  - Core memory cache: 5 minutes TTL (`CACHE_TTL_CORE = 300`)
  - Working memory cache: 2 minutes TTL (`CACHE_TTL_WORKING = 120`)
- **Production config:** Redis 7 Alpine, 256MB max memory, allkeys-lru eviction policy
- **Error handling:**
  - Returns `null` on any connection or operation failure
  - Sets `connectionFailed` flag to avoid repeated connection attempts
  - All cache operations (get/set/delete) are non-critical — silently swallowed errors

## Authentication & Identity

**No custom auth system.** Trust is delegated to platform APIs:

- **Telegram admin bot:** Admin check via `isAdmin(ctx)` helper in `packages/bot-telegram/src/utils/auth.ts` — compares `ctx.from.id` against `TELEGRAM_ADMIN_CHAT_ID`
- **Discord formateur bot:** Role-based checks via `isAdmin(interaction)` in `packages/bot-discord/src/utils/auth.ts`
- **Discord quiz bot:** Admin check in `packages/bot-discord-quiz/src/utils/auth.ts`
- **Supabase:** Service role key (full access, no RLS) — used server-side only
- **No JWT/OAuth for end users** — bots authenticate to platforms, platforms authenticate users

## Monitoring & Observability

**Error Tracking:**
- No dedicated service (no Sentry, no Datadog)
- Errors logged via pino to stdout/stderr

**Logs:**
- Structured JSON logging via pino (`packages/core/src/logger.ts`)
- Pretty-print in development (`pino-pretty`)
- JSON output in production
- Docker log rotation: `json-file` driver, 10MB max size, 3 files per container
- Log levels: debug, info, warn, error (controlled by `LOG_LEVEL` env var)

**Health Checks:**
- None configured (no HTTP health endpoints, no readiness probes)

## CI/CD & Deployment

**Hosting:**
- VPS (SSH-based deployment) — accessed via `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` secrets
- Docker Compose production: `docker-compose.prod.yml`
- 5 services: redis, bot-telegram, bot-telegram-public, bot-discord, bot-discord-quiz
- Seed runner: `seed-knowledge` service (on-demand, `profiles: [seed]`)

**CI Pipeline:**
- GitHub Actions (`.github/workflows/test.yml` and `.github/workflows/deploy.yml`)
- Unit tests: every push (non-main) + every PR to main
- Integration tests: PR to main only (uses `supabase/setup-cli` for local Supabase)
- E2E tests: manual dispatch only (requires Discord test bot tokens)
- Deploy: push to main triggers selective Docker rebuild via SSH

**Deployment strategy:**
- Change detection via `dorny/paths-filter` — only rebuild affected bot services
- Migrations run before service deploy via `psql` with custom `_migrations` tracking table
- `.env` synced from GitHub Secrets to VPS before deploy
- Knowledge re-seed triggered when `learning-knowledge/` content changes

## Webhooks & Callbacks

**Incoming:**
- None — all bots use long-polling (grammY default) or WebSocket gateway (discord.js)

**Outgoing:**
- None — no webhook-based integrations

## Inter-Bot Communication

**Event-driven pattern via Supabase `formation_events` table:**
- Producers: DM Agent, Tsarag Agent, exercise handlers
- Consumers: Cron jobs (event-dispatcher in `packages/bot-discord/src/cron/event-dispatcher.ts`)
- Pattern: Create event row -> cron polls every 2 min -> format + send -> mark processed
- Event types: `exercise_submitted`, `exercise_reviewed`, `student_alert`, `announcement`, `daily_exercise_digest`

## Scheduled Jobs (Cron)

**Bot Telegram cron jobs** (`packages/bot-telegram/src/cron/`):
- Morning plan generation
- Dynamic notifications
- Check-ins (anti-procrastination)
- Midnight reminder
- Formation event dispatch

**Bot Discord cron jobs** (`packages/bot-discord/src/cron/`):
- Event dispatcher (polls `formation_events`)
- Exercise digest
- Admin digest
- Deadline reminders
- Dropout detector
- Storage cleanup

**Bot Discord Quiz cron jobs** (`packages/bot-discord-quiz/src/cron/`):
- Close expired quizzes (after `QUIZ_EXPIRATION_HOURS`, default 48h)

**Scheduler:** `packages/core/src/scheduler/index.ts` — `node-cron` 3.0.3 with error-wrapped execution

## Phase 4 Integrations (Not Yet Active)

**Instagram (Meta Graph API):**
- Env vars defined but empty: `META_APP_ID`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID`
- No implementation code present — placeholder for future DM filtering bot

**Embedding Server (Self-hosted, deprecated):**
- `EMBEDDING_SERVER_URL` env var exists (default: `http://localhost:8090/embed`)
- Previously used MiniLM-L6-v2 via FastAPI; now replaced by OpenAI `text-embedding-3-small`
- Migration 012 (`012_openai_embeddings_1536.sql`) upgraded from 384d to 1536d vectors

---

*Integration audit: 2026-03-31*
