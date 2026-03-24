# External Integrations

**Analysis Date:** 2026-03-24

## APIs & External Services

**AI Language Models:**
- Claude API (Anthropic) - Orchestration, memory consolidation, agents
  - SDK: `@anthropic-ai/sdk` 0.39.0
  - Auth: `ANTHROPIC_API_KEY` (env var)
  - Implementation: `packages/core/src/ai/client.ts`
  - Models: claude-sonnet-4-6 (default), claude-opus-4-6 (available)

**OpenAI APIs:**
- Whisper 1 - Audio transcription to text
  - SDK: `openai` 6.27.0
  - Auth: `OPENAI_API_KEY`
  - Implementation: `packages/core/src/ai/transcribe.ts`
  - Languages: Detectable or specified (French by default for admin, Russian for public)

- TTS (Text-to-Speech) - Voice responses
  - SDK: `openai` 6.27.0
  - Auth: `OPENAI_API_KEY`
  - Implementation: `packages/core/src/ai/tts.ts`
  - Models: `tts-1` (standard), `tts-1-hd` (natural)
  - Voices: alloy, echo, fable, onyx, nova, shimmer
  - Configuration: `TTS_MODEL`, `TTS_VOICE` env vars

- text-embedding-3-small - Semantic search embeddings
  - SDK: `openai` 6.27.0 (via fetch HTTP)
  - Auth: `OPENAI_API_KEY`
  - Implementation: `packages/core/src/ai/embeddings.ts`
  - Vector dimension: 1536 (stored in Supabase)
  - Used by: Formation knowledge search, hybrid BM25+vector

**Telegram Bot Platform:**
- Telegram Bot API (official)
  - Framework: `grammy` 1.31.0
  - Auth: `TELEGRAM_BOT_TOKEN` (HTTP polling via grammY)
  - Admin Bot: `packages/bot-telegram/` - Personal copilot
  - Public Bot: `packages/bot-telegram-public/` - Audience bot (Russian)
  - Token env vars: `TELEGRAM_BOT_TOKEN`, `PUBLIC_BOT_TOKEN`
  - Admin chat: `TELEGRAM_ADMIN_CHAT_ID`

**Discord Bot Platform:**
- Discord Gateway API
  - Framework: `discord.js` 14.16.0
  - Auth: `DISCORD_BOT_TOKEN` (websocket gateway connection)
  - Implementation: `packages/bot-discord/`
  - Configuration: `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`
  - Features: Slash commands (REST API), DM handling, guild messages, member events

**Google Services:**
- Google Calendar API (v3) - Meet link generation
  - SDK: `googleapis` 171.4.0
  - Auth: OAuth2 with refresh token
  - Implementation: `packages/core/src/google/meet.ts`
  - Configuration: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
  - Feature: Automatic Google Meet link creation for training sessions
  - Scopes: `https://www.googleapis.com/auth/calendar.events`

**Meta Services (Phase 4 - Not Yet Active):**
- Instagram DM API
  - Configuration: `META_APP_ID`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID`
  - Status: Planned, credentials held in env

## Data Storage

**Databases:**
- PostgreSQL (via Supabase)
  - Client: `@supabase/supabase-js` 2.49.1
  - Connection: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (backend), `SUPABASE_ANON_KEY` (frontend)
  - Implementation: `packages/core/src/db/client.ts`
  - Features: Vector extension (pgvector) for embeddings, custom RPCs, storage buckets

  **Core Tables:**
  - `tasks` - Daily task management
  - `daily_plans` - AI-generated daily schedules
  - `memory` - Short-term and long-term memory with tiers (immediate, working, long-term)
  - `memory_events` - Timestamped events for memory consolidation
  - `clients` - Lead/project management
  - `team_members` - Team roster
  - `students` - Training session students
  - `sessions` - Training sessions with dates, attendees, recordings
  - `student_exercises` - Exercise submissions and grading
  - `formation_knowledge` - Educational content with embeddings
  - `formation_faq` - FAQ database
  - `agent_jobs` - Async job queue for agents
  - More: See `supabase/migrations/` for full schema

**File Storage:**
- Supabase Storage (AWS S3-compatible)
  - Implementation: Via Supabase client
  - Buckets: `student-submissions` (exercise files), `session-recordings`, `assets`
  - Used by: Exercise reviewer, session recording links

**Caching:**
- Redis (optional, graceful degradation)
  - Client: `redis` 4.6.0
  - Connection: `REDIS_URL` (optional)
  - Implementation: `packages/core/src/cache/redis.ts`
  - Behavior: If unavailable, cache is disabled (all operations succeed without caching)
  - TTL-based expiry

## Authentication & Identity

**Auth Provider:**
- Custom (no centralized auth service used)
  - Role-based: admin, mentor, student, public
  - Implementation: `packages/core/src/agents/types.ts` (CallerRole type)
  - Source: Telegram user ID, Discord user ID, or public mode
  - Permissions: Per-agent in `packages/core/src/agents/permissions.ts`

**OAuth2 Integrations:**
- Google OAuth2 - For Google Calendar/Meet
  - Refresh token stored: `GOOGLE_REFRESH_TOKEN`
  - No user login, only backend service account integration

## Monitoring & Observability

**Error Tracking:**
- None (not integrated)
- Manual logging to console/file

**Logs:**
- Approach: Structured logging via pino
  - Implementation: `packages/core/src/logger.ts`
  - Format: JSON in production, pretty-printed in development
  - Log Level: Configurable via `LOG_LEVEL` env var (default: info)
  - All major operations logged: API calls, DB queries, agent execution, errors

## CI/CD & Deployment

**Hosting:**
- Self-hosted or cloud VM (any Node.js compatible platform)
- GitHub Actions (mentioned in bot-telegram index, CI/CD deployment hook)

**CI Pipeline:**
- GitHub Actions (referenced in code comments)
- Triggers: Push to main branch
- Jobs: Build, typecheck, deploy

## Environment Configuration

**Required Environment Variables (Production):**
```
# Core Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...

# Bot Tokens
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
PUBLIC_BOT_TOKEN=123456:ABC-DEF...
DISCORD_BOT_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...

# Google Services
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
```

**Optional Environment Variables:**
```
# Caching
REDIS_URL=redis://localhost:6379

# Embeddings
EMBEDDING_SERVER_URL=http://localhost:8090/embed

# TTS Configuration
TTS_MODEL=hd  # or empty for standard
TTS_VOICE=nova  # alloy, echo, fable, onyx, nova, shimmer

# Logging
LOG_LEVEL=info  # debug, info, warn, error

# Server
NODE_ENV=production  # or development
PORT=3000

# Public URLs
PILOTE_NEURO_URL=https://pilotneuro.com
PORTAL_URL=https://...
TELEGRAM_GROUP_URL=https://t.me/...

# Instagram (Phase 4)
META_APP_ID=...
META_APP_SECRET=...
META_ACCESS_TOKEN=...
INSTAGRAM_ACCOUNT_ID=...
```

**Secrets Location:**
- `.env` file (git-ignored) at project root
- Never committed; copied to deployment environment manually
- Sensitive values: API keys, tokens, credentials

## Webhooks & Callbacks

**Incoming:**
- Telegram: grammY handles long polling (no webhooks exposed)
- Discord: Discord.js handles gateway websocket (no webhooks)
- Google: OAuth2 refresh token (server-side only)

**Outgoing:**
- None currently implemented
- Future: Instagram webhook callbacks (Phase 4)

## Data Flow

**AI Processing Pipeline:**
1. User input → Bot (Telegram/Discord)
2. Bot → Core AI (Claude API via `packages/core/src/ai/orchestrator.ts`)
3. Claude processes with context from DB (memory, tasks, formation knowledge)
4. Response → Supabase (if storing memory/events)
5. Response → User (Telegram/Discord)

**Transcription Flow:**
1. User uploads audio (Telegram voice message)
2. Bot → OpenAI Whisper API
3. Transcription → Claude for processing
4. Result stored in memory table → Supabase

**Knowledge Search:**
1. Query text → OpenAI embeddings (text-embedding-3-small)
2. Vector search via Supabase RPC (cosine + BM25 hybrid)
3. Results → DM Agent tool, FAQ Agent, etc.

**Cron Job Flow:**
1. Scheduler (`node-cron`) triggers at set times
2. Handler → Agent execution via job queue
3. Jobs stored in `agent_jobs` table
4. Async processing with result storage

## Dependency Risks

**Critical Path:**
- Anthropic Claude API - Core AI functionality, no fallback
- Supabase PostgreSQL - All data persistence, no fallback
- OpenAI API - Transcription, TTS, embeddings (graceful degradation if missing)

**Graceful Degradation:**
- Redis: Disabled if unavailable, cache bypassed
- OpenAI embedding: Disabled if API key missing, semantic search unavailable
- Google Calendar: Sessions cannot generate Meet links if credentials missing

---

*Integration audit: 2026-03-24*
