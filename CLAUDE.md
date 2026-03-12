# CLAUDE.md - Vibe Coder Project

## Project Overview
Personal AI assistant system: multi-bot architecture (Telegram Admin + Telegram Public + Discord) connected to a central brain (Supabase + Claude API).

## Architecture
- **Monorepo** with pnpm workspaces
- `packages/core` — shared logic: DB (Supabase), AI (Claude API, agents), Scheduler (cron), Types
- `packages/bot-telegram` — Admin Copilot bot (private, French, grammY)
- `packages/bot-telegram-public` — Public bot (audience, Russian, grammY)
- `packages/bot-discord` — Trainer bot (students + team, discord.js) — Phase 3

## Tech Stack
- TypeScript (strict mode), Node.js 20+, ESM modules
- Supabase (PostgreSQL + Storage)
- Claude API (@anthropic-ai/sdk), OpenAI Whisper (transcription)
- grammY (Telegram), discord.js (Discord)
- pnpm workspaces, tsx for dev

## Code Conventions
- All code in TypeScript strict mode, no `any`
- ESM imports (`import`/`export`, not `require`)
- Use Zod for runtime validation of external data
- Use pino for logging
- Functional style: prefer pure functions, minimize side effects
- Error handling: use explicit error types, no silent catches
- All Supabase queries go through `packages/core/src/db/`
- All Claude API calls go through `packages/core/src/ai/`

## Key Files
- `specs/` — Detailed specifications for each component
- `specs/CONNEXIONS.md` — Data flow between components
- `specs/ROADMAP.md` — Development roadmap
- `docs/` — User profile, responses, architecture docs

## Commands
- `pnpm install` — Install all dependencies
- `pnpm dev` — Run all packages in dev mode
- `pnpm -F @vibe-coder/core dev` — Run only core
- `pnpm -F @vibe-coder/bot-telegram dev` — Run only Telegram admin bot
- `pnpm -F @vibe-coder/bot-telegram-public dev` — Run only Telegram public bot
- `pnpm build` — Build all packages
- `pnpm typecheck` — Type check all packages

## Environment
- Copy `.env.example` to `.env` and fill in the values
- Never commit `.env` files

## Development Phases
- Phase 0 ✅: Infrastructure setup
- Phase 1 ✅: Core + Bot Telegram Admin (orchestrator, memory, voice, crons)
- Phase 2 ✅: Bot Telegram Public + Memory Manager + Research Agent
- Phase 3: Bot Discord Trainer (students + team)
- Phase 4: Content system + improvements
