# Technology Stack

**Analysis Date:** 2026-03-24

## Languages

**Primary:**
- TypeScript 5.7.0 - All source code (strict mode enforced via `tsconfig.json`)
- JavaScript/Node.js 20+ - Runtime

**Secondary:**
- SQL - Supabase PostgreSQL migrations and functions

## Runtime

**Environment:**
- Node.js 20+ (specified in `package.json` engines)

**Package Manager:**
- pnpm 7.0+ (monorepo with workspaces)
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core Platforms:**
- grammY 1.31.0 - Telegram bot framework (`packages/bot-telegram`, `packages/bot-telegram-public`)
  - `@grammyjs/runner` 2.0.3 - Async runner for bot polling
- discord.js 14.16.0 - Discord bot framework (`packages/bot-discord`)

**AI & Large Language Models:**
- @anthropic-ai/sdk 0.39.0 - Claude API integration (`packages/core`)
  - Models: claude-sonnet-4-6, claude-opus-4-6
- openai 6.27.0 - OpenAI API integration (Whisper transcription, TTS, embeddings)
  - Whisper: speech-to-text (audio transcription)
  - TTS: tts-1 and tts-1-hd models for text-to-speech

**Building & Development:**
- tsx 4.21.0 - TypeScript execution engine for dev/scripts
- TypeScript 5.7.0 - Type checking and compilation

**Scheduling:**
- node-cron 3.0.3 - Cron job scheduling for background tasks

**Data Persistence & Search:**
- @supabase/supabase-js 2.49.1 - PostgreSQL database client
- redis 4.6.0 - Optional caching layer (optional if REDIS_URL not set)

**Validation & Type Safety:**
- zod 3.24.2 - Runtime schema validation for external data

**Logging:**
- pino 9.6.0 - Structured logging
- pino-pretty 13.1.3 - Human-readable log formatting in development

**Content Generation:**
- pptxgenjs 4.0.1 - PowerPoint presentation generation
- pdfkit 0.17.2 - PDF document generation (bot-telegram)

**Google Services:**
- googleapis 171.4.0 - Google APIs client (Calendar, Meet link generation)

**Environment Management:**
- dotenv 17.3.1 - Load .env files (bot-telegram, bot-telegram-public, bot-discord)

## Key Dependencies

**Critical Infrastructure:**
- @anthropic-ai/sdk - Claude API backbone for AI agents and memory consolidation
- @supabase/supabase-js - PostgreSQL database with vector/embedding support
- grammY - Telegram bot communication
- discord.js - Discord bot communication

**Essential AI Services:**
- openai - Whisper (transcription), TTS (voice responses), text-embedding-3-small (semantic search)
- googleapis - Google Calendar/Meet integration for session management

**Optional but Important:**
- redis - Caching layer (graceful degradation if unavailable)

## Configuration

**Environment Variables:**
- See `.env.example` for full list
- Critical: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`, `OPENAI_API_KEY`
- Optional: `REDIS_URL`, `EMBEDDING_SERVER_URL`, `GOOGLE_*` (Google Meet), `INSTAGRAM_*` (Phase 4)
- Development: `.env` file at project root (git-ignored)

**Build Configuration:**
- `tsconfig.json` - Root TypeScript configuration (ES2022 target, strict mode, ESM modules)
- ESM-only: All packages use `"type": "module"` in package.json (no CommonJS)

## Project Structure

**Monorepo Layout:**
```
packages/
├── core/              # Central brain (DB, AI, Scheduler, Agents)
├── bot-telegram/      # Admin copilot (personal)
├── bot-telegram-public/ # Public bot (audience, Russian)
└── bot-discord/       # Trainer bot (students + team)
```

## Platform Requirements

**Development:**
- Node.js 20+ with pnpm 7+
- PostgreSQL compatible database (Supabase)
- Telegram API credentials for bot token
- Discord API credentials for bot and guild
- Claude API key (Anthropic)
- OpenAI API key (Whisper, TTS, embeddings)
- Optional: Redis for caching
- Optional: Google OAuth2 credentials for Meet integration

**Production:**
- Deployment target: Node.js server (GCP, AWS, Heroku compatible)
- Supabase project (PostgreSQL + vector extensions)
- Secure env var management for API keys
- Redis instance for caching (optional but recommended)

## Development Commands

**Root Level:**
- `pnpm install` - Install all dependencies
- `pnpm dev` - Run all packages in parallel (watch mode)
- `pnpm build` - Build all packages
- `pnpm typecheck` - Type check all packages
- `pnpm lint` - Run ESLint on all source
- `pnpm lint:fix` - Fix linting issues
- `pnpm format` - Format code with Prettier
- `pnpm seed:knowledge` - Sync formation markdown to DB with embeddings

**Package-Level:**
- `pnpm -F @assistme/core dev` - Run core only
- `pnpm -F @assistme/bot-telegram dev` - Run Telegram admin bot only
- `pnpm -F @assistme/bot-telegram-public dev` - Run Telegram public bot only
- `pnpm -F @assistme/bot-discord dev` - Run Discord bot only

## Output Format

**Module System:**
- ESM (ES Modules) only - `import`/`export` syntax
- No CommonJS, no bundling for Node.js packages
- TSC compiles to `dist/` directories

**Generated Assets:**
- JavaScript: `dist/*.js` with `.d.ts` declaration files
- Source maps: `dist/*.js.map` for debugging
- Type definitions: `dist/*.d.ts` exported via package.json exports field

---

*Stack analysis: 2026-03-24*
