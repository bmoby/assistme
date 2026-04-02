# Technology Stack

**Analysis Date:** 2026-03-31

## Languages

**Primary:**
- TypeScript 5.7.0 — All source code across all packages (strict mode enforced via `tsconfig.json`)

**Secondary:**
- SQL — Supabase PostgreSQL migrations in `supabase/migrations/*.sql` (19 migration files)

## Runtime

**Environment:**
- Node.js 20+ (specified in root `package.json` engines: `>=20.0.0`)
- Docker: node:20-alpine (production via `Dockerfile`)
- Timezone: Asia/Bangkok (set in `docker-compose.prod.yml`)

**Package Manager:**
- pnpm 7+ (specified in engines), CI uses pnpm 10
- Lockfile: `pnpm-lock.yaml` (present)
- Workspace config: `pnpm-workspace.yaml` — `packages/*`
- corepack enabled in Docker builds (`corepack prepare pnpm@9 --activate`)

**Module System:**
- ESM-only: All packages use `"type": "module"` in package.json
- `tsconfig.json`: target ES2022, module ESNext, moduleResolution bundler
- Strict TypeScript flags: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`

## Frameworks

**Core:**
- grammY 1.31.0 — Telegram bot framework (`packages/bot-telegram`, `packages/bot-telegram-public`)
  - `@grammyjs/runner` 2.0.3 — Concurrent update processing (`packages/bot-telegram`)
- discord.js 14.16.0 — Discord bot framework (`packages/bot-discord`, `packages/bot-discord-quiz`)
- @anthropic-ai/sdk 0.39.0 — Claude API client (`packages/core/src/ai/client.ts`)
- openai 6.27.0 — OpenAI API client for Whisper, TTS (`packages/core/src/ai/transcribe.ts`, `packages/core/src/ai/tts.ts`)
  - Embeddings use direct fetch to OpenAI REST API, not the SDK (`packages/core/src/ai/embeddings.ts`)
- @supabase/supabase-js 2.49.1 — PostgreSQL + Storage client (`packages/core/src/db/client.ts`)

**Testing:**
- vitest 4.1.1 — Test runner (root + `packages/core`, `packages/bot-discord`, `packages/bot-discord-quiz`)
- @vitest/coverage-v8 4.1.1 — Code coverage via V8
- msw 2.12.14 — Mock Service Worker for HTTP mocking in tests (root devDependency)
- puppeteer 24.40.0 — E2E browser testing (root devDependency)

**Build/Dev:**
- TypeScript 5.7.0 — Compilation (`tsc`)
- tsx 4.21.0 — TypeScript execution for dev mode and scripts
- vite-tsconfig-paths 6.1.1 — Path resolution in vitest configs
- dotenv 17.3.1 — Environment variable loading (`packages/bot-telegram`, `packages/bot-telegram-public`, `packages/bot-discord`, `packages/bot-discord-quiz`)

## Key Dependencies

**Critical (core functionality):**
- `@anthropic-ai/sdk` 0.39.0 — All AI agent logic: orchestrator, DM agent, tsarag agent, FAQ agent, exercise reviewer, quiz parser, open answer evaluation
  - Models used: `claude-sonnet-4-6` (default), `claude-opus-4-6` (complex tasks like open answer evaluation)
  - Two clients: personal (`ANTHROPIC_API_KEY`) and formation (`ANTHROPIC_API_KEY_FORMATION`, falls back to personal)
  - Client location: `packages/core/src/ai/client.ts`
- `@supabase/supabase-js` 2.49.1 — All data persistence + file storage
  - Client location: `packages/core/src/db/client.ts`
  - Singleton pattern: initialized once with service role key
- `grammy` 1.31.0 — Telegram bot communication (admin + public)
- `discord.js` 14.16.0 — Discord bot communication (formateur + quiz)
- `openai` 6.27.0 — Whisper transcription, TTS voice responses, text-embedding-3-small embeddings
- `zod` 3.24.2 (core), 3.25.76 (bot-discord-quiz) — Runtime validation of external data (API responses, quiz parsing)

**Infrastructure:**
- `redis` 4.6.0 — Optional caching layer for memory contexts (`packages/core/src/cache/redis.ts`)
  - Graceful degradation: system works without Redis; all cache operations silently return null
- `node-cron` 3.0.3 — Scheduled job execution (`packages/core/src/scheduler/index.ts`)
- `googleapis` 171.4.0 — Google Calendar API for Meet link generation (`packages/core/src/google/meet.ts`)
  - Graceful degradation: returns fictitious Meet link when credentials not configured

**Document Generation:**
- `pptxgenjs` 4.0.1 — PowerPoint slide generation (`packages/core/src/agents/artisan/pptx-builder.ts`)
- `pdfkit` 0.17.2 — PDF document generation (`packages/bot-telegram/src/utils/pdf.ts`)

**Logging:**
- `pino` 9.6.0 — Structured JSON logging (`packages/core/src/logger.ts`)
- `pino-pretty` 13.1.3 — Human-readable log formatting (dev mode only, enabled when `NODE_ENV !== 'production'`)

## Monorepo Packages

| Package | Name | Purpose | Key Dependencies |
|---------|------|---------|------------------|
| `packages/core` | `@assistme/core` | Shared brain: DB, AI, scheduler, types | anthropic, supabase, openai, googleapis, redis, pino, zod |
| `packages/bot-telegram` | `@assistme/bot-telegram` | Admin copilot bot (French, private) | grammy, @grammyjs/runner, pdfkit, dotenv |
| `packages/bot-telegram-public` | `@assistme/bot-telegram-public` | Public bot (Russian, audience) | grammy, dotenv |
| `packages/bot-discord` | `@assistme/bot-discord` | Formateur bot (students + team) | discord.js, dotenv |
| `packages/bot-discord-quiz` | `@assistme/bot-discord-quiz` | Quiz bot (automated assessments) | discord.js, zod, dotenv |

All bot packages depend on `@assistme/core` via workspace protocol (`workspace:*`).

## Configuration

**Environment:**
- Single `.env` file at project root (git-ignored)
- `.env.example` documents all variables (60 lines)
- `.env.dev` supported as override (loaded first by Discord bots via dotenv)
- `LOG_LEVEL` env var controls pino log level (default: 'info')
- `NODE_ENV` controls pino-pretty transport (dev vs production)
- `TZ=Asia/Bangkok` set in production Docker containers

**Critical env vars:**
- `ANTHROPIC_API_KEY` — Claude API (required)
- `ANTHROPIC_API_KEY_FORMATION` — Separate Claude key for formation bots (optional, falls back to main)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Database (required)
- `OPENAI_API_KEY` — Whisper, TTS, embeddings (required)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` — Admin bot (required for bot-telegram)
- `PUBLIC_BOT_TOKEN` — Public bot (required for bot-telegram-public)
- `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` — Formateur bot (required for bot-discord)
- `DISCORD_QUIZ_BOT_TOKEN`, `DISCORD_QUIZ_CLIENT_ID` — Quiz bot (required for bot-discord-quiz)

**Optional env vars:**
- `REDIS_URL` — Cache (disabled if not set)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` — Google Meet
- `TTS_MODEL`, `TTS_VOICE` — TTS configuration
- `QUIZ_EXPIRATION_HOURS` — Quiz timeout (default: 48)
- `META_APP_ID`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID` — Phase 4 (Instagram)

**Build:**
- `tsconfig.json` — Root TypeScript config (extended by packages)
- `vitest.config.ts` — Root test configuration with 6 named projects
- `Dockerfile` — Multi-stage build (builder -> production -> seed)
- `docker-compose.prod.yml` — Production deployment (5 services + seed-knowledge)

## Build & Output

**Compilation:**
- `tsc` compiles TypeScript to `dist/` directories in each package
- Output: ES2022 JavaScript with `.d.ts` declarations, `.js.map` source maps
- `packages/core` exports via `dist/index.js` (barrel file)

**Development:**
- `tsx watch` for all packages in dev mode
- `pnpm dev` runs all packages in parallel with `--parallel`
- `pnpm dev:discord` builds core first, then runs bot-discord
- `pnpm dev:quiz` builds core first, then runs bot-discord-quiz

## CI/CD

**Test pipeline** (`.github/workflows/test.yml`):
- Trigger: push (non-main branches), PR (to main), manual dispatch
- Unit tests: Node.js 20, pnpm 10, typecheck + vitest
- Integration tests: PR-only, uses Supabase CLI local instance
- E2E tests: manual dispatch only, requires Discord test tokens as secrets

**Deploy pipeline** (`.github/workflows/deploy.yml`):
- Trigger: push to main
- Change detection: `dorny/paths-filter` — only deploys changed services
- Migrations: sequential SQL application via `psql` to Supabase
- Deploy: SSH to VPS, `git pull`, selective Docker Compose rebuild
- Knowledge re-seed: triggered when `learning-knowledge/` files change

## Platform Requirements

**Development:**
- Node.js 20+, pnpm 7+
- Access to Supabase project (or local via `supabase start`)
- Anthropic API key, OpenAI API key
- Bot tokens for targeted platform

**Production:**
- VPS with Docker + Docker Compose
- Supabase project (PostgreSQL + pgvector + Storage)
- Redis 7 (Alpine, 256MB max, allkeys-lru eviction)
- GitHub Secrets for CI/CD deployment

---

*Stack analysis: 2026-03-31*
