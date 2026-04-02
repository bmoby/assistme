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

## Testing Rules (MANDATORY — NO EXCEPTIONS)
- **Before committing ANY code change:** run `pnpm test:unit` and verify all tests pass
- **Before pushing:** the pre-push hook runs tests automatically — NEVER use `--no-verify` to skip it
- **When modifying a handler, agent, or core function:** run the relevant tests first, verify they pass, then make changes, then re-run to confirm nothing broke
- **When adding a new feature:** add or update tests covering the new behavior
- **CI is the final gate:** unit tests run on every push, integration tests run on every PR — both must pass

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
- `specs/` — Detailed specifications for each component (SOURCE OF TRUTH)
- `specs/INDEX.md` — Index of all specs and supplementary documents
- `specs/CONNEXIONS.md` — Data flow between components
- `specs/ROADMAP.md` — Development roadmap
- `learning-knowledge/` — Formation content (session plans, exercises, guides) — synced to DB via seed script
- `docs/` — Historical scoping documents (archived, see `docs/README.md`)

## Spec-First Development (MANDATORY)
**Les specs sont la source de verite.** Tout developpement suit cette methodologie :
1. Lire la spec AVANT de coder (`specs/[composant]/SPEC.md`)
2. Implementer selon la spec
3. Mettre a jour la spec si l'implementation diverge

### Custom Commands
- `/spec-check [composant]` — Auditer conformite implementation vs spec
- `/spec-update [composant]` — Mettre a jour la spec apres des changements
- `/implement [composant/feature]` — Implementer une feature en suivant la spec
- `/sync-check` — Audit complet de tout le projet (specs + code + ROADMAP)

### Hooks actifs
- **spec-reminder** : rappel automatique de lire la spec quand on modifie du code
- **protect-specs** : avertissement quand on modifie une spec directement

### Correspondance composant → package
| Spec | Package |
|------|---------|
| `specs/00-infrastructure/` | `supabase/` + schemas |
| `specs/01-cerveau-central/` | `packages/core/` |
| `specs/02-bot-telegram/` | `packages/bot-telegram/` |
| `specs/03-bot-telegram-public/` | `packages/bot-telegram-public/` |
| `specs/04-bot-discord/` | `packages/bot-discord/` |
| `specs/05-systeme-contenu/` | integre dans core + bots (Phase 4) |

## Contenu pedagogique
- `learning-knowledge/programme.md` — Structure du programme (6 modules, 24 sessions)
- `learning-knowledge/setup-etudiant.md` — Guide d'installation pour les etudiants
- `learning-knowledge/regles-discord.md` — Regles du serveur Discord
- `learning-knowledge/module-*/` — Plans de session detailles, exercices, visuels
- `docs/recherches/` — Rapports de recherche (archives, hors indexation IA)

## Commands
- `pnpm install` — Install all dependencies
- `pnpm dev` — Run all packages in dev mode
- `pnpm -F @assistme/core dev` — Run only core
- `pnpm -F @assistme/bot-telegram dev` — Run only Telegram admin bot
- `pnpm -F @assistme/bot-telegram-public dev` — Run only Telegram public bot
- `pnpm -F @assistme/bot-discord dev` — Run only Discord bot
- `pnpm build` — Build all packages
- `pnpm typecheck` — Type check all packages
- `pnpm seed:knowledge` — Sync formation markdown files to DB with embeddings (idempotent)

## Environment
- Copy `.env.example` to `.env` and fill in the values
- Never commit `.env` files

## Development Phases
- Phase 0 ✅: Infrastructure setup
- Phase 1 ✅: Core + Bot Telegram Admin (orchestrator, memory, voice, crons)
- Phase 2 ✅: Bot Telegram Public + Memory Manager + Research Agent
- Phase 3 🚧: Bot Discord Trainer (DM agent, sessions, exercises, FAQ, mentors)
- Phase 4: Content system + improvements

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Simplification du Flow Exercices — Bot Discord Formateur**

Refactoring du systeme de soumission d'exercices du Bot Discord Formateur. On supprime la correction automatique par IA (non fiable, redondante avec le bot quiz), on ajoute l'archivage par session, et on simplifie le feedback etudiant. Le formateur garde le controle total sur la review manuelle.

**Core Value:** Le formateur peut gerer les soumissions d'exercices sans goulot d'etranglement — archiver par session, corriger quand il veut, sans bruit IA inutile.

### Constraints

- **Isolation**: Zero import depuis `packages/bot-discord-quiz`, uniquement `@assistme/core`
- **DB**: Nouvelles migrations pour le statut `archived`, pas de modification des tables existantes (ajout seulement)
- **Langue**: Contenu etudiant-facing en russe
- **Tests**: Vitest, tests unitaires obligatoires avant commit (`pnpm test:unit`)
- **Backward compat**: Les exercices existants en `ai_reviewed` doivent rester consultables
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.7.0 — All source code across all packages (strict mode enforced via `tsconfig.json`)
- SQL — Supabase PostgreSQL migrations in `supabase/migrations/*.sql` (19 migration files)
## Runtime
- Node.js 20+ (specified in root `package.json` engines: `>=20.0.0`)
- Docker: node:20-alpine (production via `Dockerfile`)
- Timezone: Asia/Bangkok (set in `docker-compose.prod.yml`)
- pnpm 7+ (specified in engines), CI uses pnpm 10
- Lockfile: `pnpm-lock.yaml` (present)
- Workspace config: `pnpm-workspace.yaml` — `packages/*`
- corepack enabled in Docker builds (`corepack prepare pnpm@9 --activate`)
- ESM-only: All packages use `"type": "module"` in package.json
- `tsconfig.json`: target ES2022, module ESNext, moduleResolution bundler
- Strict TypeScript flags: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`
## Frameworks
- grammY 1.31.0 — Telegram bot framework (`packages/bot-telegram`, `packages/bot-telegram-public`)
- discord.js 14.16.0 — Discord bot framework (`packages/bot-discord`, `packages/bot-discord-quiz`)
- @anthropic-ai/sdk 0.39.0 — Claude API client (`packages/core/src/ai/client.ts`)
- openai 6.27.0 — OpenAI API client for Whisper, TTS (`packages/core/src/ai/transcribe.ts`, `packages/core/src/ai/tts.ts`)
- @supabase/supabase-js 2.49.1 — PostgreSQL + Storage client (`packages/core/src/db/client.ts`)
- vitest 4.1.1 — Test runner (root + `packages/core`, `packages/bot-discord`, `packages/bot-discord-quiz`)
- @vitest/coverage-v8 4.1.1 — Code coverage via V8
- msw 2.12.14 — Mock Service Worker for HTTP mocking in tests (root devDependency)
- puppeteer 24.40.0 — E2E browser testing (root devDependency)
- TypeScript 5.7.0 — Compilation (`tsc`)
- tsx 4.21.0 — TypeScript execution for dev mode and scripts
- vite-tsconfig-paths 6.1.1 — Path resolution in vitest configs
- dotenv 17.3.1 — Environment variable loading (`packages/bot-telegram`, `packages/bot-telegram-public`, `packages/bot-discord`, `packages/bot-discord-quiz`)
## Key Dependencies
- `@anthropic-ai/sdk` 0.39.0 — All AI agent logic: orchestrator, DM agent, tsarag agent, FAQ agent, exercise reviewer, quiz parser, open answer evaluation
- `@supabase/supabase-js` 2.49.1 — All data persistence + file storage
- `grammy` 1.31.0 — Telegram bot communication (admin + public)
- `discord.js` 14.16.0 — Discord bot communication (formateur + quiz)
- `openai` 6.27.0 — Whisper transcription, TTS voice responses, text-embedding-3-small embeddings
- `zod` 3.24.2 (core), 3.25.76 (bot-discord-quiz) — Runtime validation of external data (API responses, quiz parsing)
- `redis` 4.6.0 — Optional caching layer for memory contexts (`packages/core/src/cache/redis.ts`)
- `node-cron` 3.0.3 — Scheduled job execution (`packages/core/src/scheduler/index.ts`)
- `googleapis` 171.4.0 — Google Calendar API for Meet link generation (`packages/core/src/google/meet.ts`)
- `pptxgenjs` 4.0.1 — PowerPoint slide generation (`packages/core/src/agents/artisan/pptx-builder.ts`)
- `pdfkit` 0.17.2 — PDF document generation (`packages/bot-telegram/src/utils/pdf.ts`)
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
## Configuration
- Single `.env` file at project root (git-ignored)
- `.env.example` documents all variables (60 lines)
- `.env.dev` supported as override (loaded first by Discord bots via dotenv)
- `LOG_LEVEL` env var controls pino log level (default: 'info')
- `NODE_ENV` controls pino-pretty transport (dev vs production)
- `TZ=Asia/Bangkok` set in production Docker containers
- `ANTHROPIC_API_KEY` — Claude API (required)
- `ANTHROPIC_API_KEY_FORMATION` — Separate Claude key for formation bots (optional, falls back to main)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Database (required)
- `OPENAI_API_KEY` — Whisper, TTS, embeddings (required)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` — Admin bot (required for bot-telegram)
- `PUBLIC_BOT_TOKEN` — Public bot (required for bot-telegram-public)
- `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` — Formateur bot (required for bot-discord)
- `DISCORD_QUIZ_BOT_TOKEN`, `DISCORD_QUIZ_CLIENT_ID` — Quiz bot (required for bot-discord-quiz)
- `REDIS_URL` — Cache (disabled if not set)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` — Google Meet
- `TTS_MODEL`, `TTS_VOICE` — TTS configuration
- `QUIZ_EXPIRATION_HOURS` — Quiz timeout (default: 48)
- `META_APP_ID`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID` — Phase 4 (Instagram)
- `tsconfig.json` — Root TypeScript config (extended by packages)
- `vitest.config.ts` — Root test configuration with 6 named projects
- `Dockerfile` — Multi-stage build (builder -> production -> seed)
- `docker-compose.prod.yml` — Production deployment (5 services + seed-knowledge)
## Build & Output
- `tsc` compiles TypeScript to `dist/` directories in each package
- Output: ES2022 JavaScript with `.d.ts` declarations, `.js.map` source maps
- `packages/core` exports via `dist/index.js` (barrel file)
- `tsx watch` for all packages in dev mode
- `pnpm dev` runs all packages in parallel with `--parallel`
- `pnpm dev:discord` builds core first, then runs bot-discord
- `pnpm dev:quiz` builds core first, then runs bot-discord-quiz
## CI/CD
- Trigger: push (non-main branches), PR (to main), manual dispatch
- Unit tests: Node.js 20, pnpm 10, typecheck + vitest
- Integration tests: PR-only, uses Supabase CLI local instance
- E2E tests: manual dispatch only, requires Discord test tokens as secrets
- Trigger: push to main
- Change detection: `dorny/paths-filter` — only deploys changed services
- Migrations: sequential SQL application via `psql` to Supabase
- Deploy: SSH to VPS, `git pull`, selective Docker Compose rebuild
- Knowledge re-seed: triggered when `learning-knowledge/` files change
## Platform Requirements
- Node.js 20+, pnpm 7+
- Access to Supabase project (or local via `supabase start`)
- Anthropic API key, OpenAI API key
- Bot tokens for targeted platform
- VPS with Docker + Docker Compose
- Supabase project (PostgreSQL + pgvector + Storage)
- Redis 7 (Alpine, 256MB max, allkeys-lru eviction)
- GitHub Secrets for CI/CD deployment
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Use kebab-case for all source files: `dm-agent.ts`, `context-builder.ts`, `quiz-eval.ts`
- Use kebab-case for directories: `bot-discord-quiz`, `formation`
- Index files (`index.ts`) as module entry points for directories: `packages/core/src/db/index.ts`, `packages/core/src/ai/index.ts`
- Test files: co-located with source, `*.test.ts` suffix: `dm-agent.test.ts` next to `dm-agent.ts`
- Integration tests: `*.integration.test.ts` suffix: `knowledge.integration.test.ts`
- E2E tests: `*.e2e.test.ts` suffix in `test/e2e/`: `dm-student-flow.e2e.test.ts`
- camelCase for all function names: `askClaude()`, `getStudentByDiscordId()`, `runDmAgent()`
- Action-verb prefix for DB operations: `get*`, `create*`, `update*`, `delete*`, `search*`
- `run*` prefix for agent execution: `runDmAgent()`, `runTsaragAgent()`, `runMemoryAgent()`
- `handle*` prefix for event/interaction handlers: `handleSession()`, `handleQuizAnswer()`
- `setup*` prefix for wiring handler registration: `setupFaqHandler()`, `setupDmHandler()`
- `build*` prefix for constructing formatted output: `buildSessionForumContent()`, `buildContext()`
- `is*` / `has*` / `can*` for boolean functions: `isAdmin()`, `isStudent()`, `isMentor()`
- `parse*` prefix for parsing external data: `parseQuizFromTxt()`, `parseUserMessage()`
- camelCase for local variables and parameters: `discordUserId`, `queryEmbedding`, `pendingSubmissionIntent`
- UPPER_SNAKE_CASE for constants (especially prompts and table names):
- PascalCase for all types and interfaces: `Student`, `DmAgentContext`, `ExerciseReviewResult`
- Union types: PascalCase: `TaskStatus`, `StudentQuizSessionStatus`, `QuizQuestionType`
- `New*` type alias using `Omit` for creation payloads: `type NewStudent = Omit<Student, 'id' | 'created_at' | 'updated_at'>`
- Zod schemas: PascalCase with `Schema` suffix: `ParsedQuizSchema`, `AgentOriginSchema`, `InvokeAgentDataSchema`
- Type inference from Zod: `type ParsedQuiz = z.infer<typeof ParsedQuizSchema>`
- Interfaces for function parameter objects: `DmAgentContext`, `TsaragAgentContext`
- Interfaces for function return objects: `DmAgentResponse`, `ExerciseReviewResult`, `EvalResult`
## Code Style
- No ESLint config or Prettier config files present at project root
- Root `package.json` defines lint commands (`pnpm lint`, `pnpm format`) but no `.eslintrc` / `.prettierrc` files exist
- De facto formatting: 2-space indentation, single quotes for strings
- Line length: typically under 100 characters
- Trailing commas used in multi-line structures
- `strict: true` in root `tsconfig.json`
- `noUncheckedIndexedAccess: true` -- array/object index access returns `T | undefined`
- `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`
- Target: ES2022, Module: ESNext, moduleResolution: bundler
- Always use bracket notation with string literal for env access: `process.env['ANTHROPIC_API_KEY']` (enforced by `noUncheckedIndexedAccess`)
- All packages use `"type": "module"` in `package.json`
- ESM only: `import`/`export` syntax, no `require`
- Import paths include `.js` extension explicitly: `import { logger } from '../logger.js'`
- Exception: imports from `@assistme/core` use bare specifier (resolved by workspace): `import { askClaude } from '@assistme/core'`
## Import Organization
- No path aliases in source code (`@/` not used)
- Direct relative paths everywhere: `../../ai/client.js`, `../db/memory.js`
- The `@assistme/core` alias is resolved at vitest level via `resolve.alias` in `vitest.config.ts`
- `packages/core/src/index.ts` -- single export point for entire core package
- `packages/core/src/ai/index.ts` -- re-exports all AI functions and types
- `packages/core/src/db/index.ts` -- re-exports all DB modules
- `packages/core/src/ai/formation/index.ts` -- re-exports formation agents
- `packages/bot-discord/src/__mocks__/fixtures/domain/index.ts` -- re-exports all fixture factories
## Error Handling
- Supabase errors checked via `error` field in response, not exceptions
- Pattern: log error, then throw
- "Not found" returns `null` (check `PGRST116` Supabase error code), other errors throw
- JSON parsing with try/catch, fallback to degraded result:
- Extract JSON from Claude preamble text: `raw.match(/\{[\s\S]*\}/)`
- Markdown code block stripping for JSON extraction
- Each tool call wrapped in try/catch individually
- Error results returned as JSON tool_result so Claude can recover:
- Maximum iteration limit prevents infinite tool loops (typically 5 iterations)
- Top-level try/catch in handlers, reply with user-facing error message:
- Throw explicit `Error` if required env var is missing at initialization:
## Logging
- Log level from `LOG_LEVEL` env var, defaults to `'info'`
- Pretty-print in development, JSON in production
- Tests use `LOG_LEVEL=silent`
- Always use structured context object as first parameter:
- `debug`: detailed traces, API call params, token counts
- `info`: operation completed successfully, initialization
- `warn`: recoverable issues
- `error`: operation failures with error object included
- Logger always mocked to silence output:
## Type Patterns
- Separate interfaces for context (input) and response (output): `DmAgentContext` / `DmAgentResponse`
- Use `Record<string, unknown>` for flexible JSON objects: `payment_details: Record<string, unknown> | null`
- Union literal types for status fields: `type StudentStatus = 'interested' | 'registered' | 'paid' | 'active' | 'completed' | 'dropped'`
- Section comments with `// ============================================` separators between type groups
- Always specify return type on exported functions:
- `null` for DB fields that are empty: `phone: string | null`
- `undefined` for optional function params: `model?: ModelChoice`
- Nullish coalescing for defaults: `params.model ?? 'sonnet'`
- Runtime validation for external data (Claude API output, file parsing):
- Located in: `packages/bot-discord-quiz/src/ai/parse-quiz.ts`, `packages/core/src/agents/types.ts`
- Discriminated unions for complex structures: `z.discriminatedUnion('type', [McqSchema, TrueFalseSchema, OpenSchema])`
## Database Access
- `packages/core/src/db/client.ts` exports `getSupabase()` -- lazy singleton initialization
- Same pattern for Anthropic client: `packages/core/src/ai/client.ts` with `getClient()`, `getFormationClient()`
- Each entity module in `packages/core/src/db/`:
- Always cast Supabase result: `return data as Student`
- Empty arrays default: `return (data ?? []) as Student[]`
- Filter by foreign key: `.eq('discord_id', discordId)`
- Multiple status filter: `.in('status', ['paid', 'active'])`
- Ordering: `.order('created_at', { ascending: false })`
- Text search: `.ilike('name', `%${name}%`)`
## AI/Agent Patterns
- `packages/core/src/ai/client.ts` -- `askClaude({ prompt, systemPrompt?, model?, maxTokens?, formation? })`
- Model choice: `'sonnet' | 'opus'` mapped to full model names
- Used by: FAQ agent, quiz evaluator, quiz parser
- Pattern in `packages/core/src/ai/formation/dm-agent.ts`, `packages/core/src/ai/formation/tsarag-agent.ts`
- Steps: (1) define TOOLS array, (2) call Claude with tools, (3) check for tool_use blocks, (4) execute tools, (5) feed tool_result back, (6) repeat until end_turn or max iterations
- Max iterations guard (typically 5) prevents infinite loops
- Tool results returned as JSON strings via `JSON.stringify()`
- Agents return structured objects with text + optional intent/action data:
- The handler layer processes intents (e.g., showing a confirmation UI), NOT the agent itself
- Stored as `const SYSTEM_PROMPT = \`...\`` at module level
- Admin-facing prompts in French
- Student-facing prompts in Russian
- Security instructions embedded in prompts (ignore injection attempts)
- Role and channel names centralized in `packages/bot-discord/src/config.ts`:
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Four independent bot processes (Telegram Admin, Telegram Public, Discord Trainer, Discord Quiz) share one Core package
- AI-driven orchestration: user messages are interpreted by Claude, which returns structured JSON actions
- Three-tier memory system (core/working/archival) with temporal decay and semantic search
- Event-driven inter-bot communication via `formation_events` DB table (polled by cron)
- Autonomous agent jobs persisted in DB, processed by cron every minute
- Graceful degradation: Redis cache and embedding server are optional
## Layers
- Purpose: Handle user interactions via platform-specific APIs
- Location: `packages/bot-telegram/src/index.ts`, `packages/bot-telegram-public/src/index.ts`, `packages/bot-discord/src/index.ts`, `packages/bot-discord-quiz/src/index.ts`
- Contains: Bot initialization, dotenv loading, handler/command/cron registration, error handling
- Depends on: grammY (Telegram), discord.js (Discord), `@assistme/core`
- Used by: End users via Telegram/Discord
- Pattern: Each bot has a `main()` function that initializes client, registers handlers, then starts
- Purpose: Route incoming platform events to appropriate AI agents or direct DB operations
- Location: `packages/bot-telegram/src/handlers/`, `packages/bot-telegram-public/src/handlers/`, `packages/bot-discord/src/handlers/`, `packages/bot-discord-quiz/src/handlers/`
- Contains:
- Depends on: Core (AI agents, DB functions)
- Used by: Bot layer event emitters
- Purpose: Handle explicit slash commands and bot commands
- Location: `packages/bot-telegram/src/commands/`, `packages/bot-discord/src/commands/`, `packages/bot-discord-quiz/src/commands/`
- Contains:
- Depends on: Core (DB, agents, logger)
- Used by: Handlers that detect command syntax or slash command interactions
- Purpose: Execute time-based background jobs autonomously
- Location: `packages/bot-telegram/src/cron/`, `packages/bot-discord/src/cron/`, `packages/bot-discord-quiz/src/cron/`
- Contains:
- Depends on: Core (scheduler, AI, DB, agents)
- Used by: Core scheduler (node-cron) -- registered at bot startup
- Purpose: Decision-making and response generation using Claude API
- Location: `packages/core/src/ai/`
- Contains:
- Depends on: Claude API, OpenAI API, Core DB, Supabase
- Used by: Handlers, Cron jobs, Commands
- Purpose: Async background agent jobs with DB persistence and chaining
- Location: `packages/core/src/agents/`
- Contains:
- Pattern: `registerAgent()` at startup, `invoke()` creates DB job, cron polls and executes
- Purpose: Persistent storage abstraction over Supabase (PostgreSQL)
- Location: `packages/core/src/db/`
- Contains:
- Depends on: Supabase client
- Used by: All agents, handlers, cron jobs
- Purpose: Optional in-memory caching for memory contexts
- Location: `packages/core/src/cache/redis.ts`
- Contains: Singleton Redis client, TTL-based get/set/delete
- Pattern: Graceful degradation -- if Redis unavailable, returns null and callers fall through to DB
- Used by: Context Builder (memory tiers cached: core 5 min, working 2 min)
- Purpose: Centralized TypeScript interfaces and type unions
- Location: `packages/core/src/types/index.ts`
- Contains: Task, Student, StudentExercise, Client, Session, Quiz, QuizQuestion, MemoryEntry, Reminder, FormationEvent, PublicKnowledge, FaqEntry, and all related status/category enums
- Used by: All layers via `import type { ... } from '@assistme/core'`
- Purpose: Centralized cron job registration and lifecycle
- Location: `packages/core/src/scheduler/index.ts`
- Contains: `registerJob()`, `startAllJobs()`, `stopAllJobs()` with error-wrapped execution
- Used by: Bot cron modules register jobs at startup
## Data Flow
- Conversation state: In-memory Maps per chat/channel (TTL 30-60 min), cleared after inactivity
- Processing locks: Per-user Promise chains prevent concurrent agent executions
- Memory tiers: Persistent in Supabase, cached in Redis (core 5 min, working 2 min)
- Agent jobs: Persistent in Supabase `agent_jobs` table (pending -> processing -> completed/failed)
- Quiz sessions: Persistent in Supabase `student_quiz_sessions` table
## Key Abstractions
- Purpose: Single entry point for admin message interpretation
- Pattern: Claude analyzes text + context -> returns structured JSON with actions + response
- Actions executed inline or deferred to handler
- Memory Agent runs in background after every message (unless memory action triggered)
- Purpose: Multi-turn Claude interactions for complex workflows
- Pattern: Register tools -> Claude calls tools in loop (max 5 iterations) -> extract final text
- DM Agent tools: read-only (progress, session info, search) + write (create_submission)
- Tsarag Agent tools: read (list students/sessions/exercises) + action (propose_action/execute_pending with confirm flow)
- Purpose: Assemble dynamic prompt context without manual parameter passing
- Pattern: `buildContext(options)` loads tiers, live data, formats into text block -> inject into system prompt
- Tiers: Core (always loaded, identity), Working (sorted by temporal decay), Archival (semantic search on user message)
- Live data: Active tasks, client pipeline, temporal info (date/time)
- Core (permanent, identity): `packages/core/src/db/memory.ts` `getCoreMemory()`
- Working (30-day expiry): `getWorkingMemory()` with `computeDecay(last_confirmed)` scoring
- Archival (permanent, semantic search): `searchMemoryHybrid()` with BM25 + vector + decay
- Consolidation: `packages/core/src/ai/memory-consolidator.ts` runs nightly, reviews expired working memories
- Purpose: Async agent execution with DB persistence
- Pattern: `registerAgent(definition)` at startup -> `invoke(name, input, origin)` creates DB job -> cron calls `processAgentJobs()` -> agent executes -> files uploaded to Storage -> result event created
- Job chaining: agent output can specify `chainTo: { agentName, input }` for pipeline execution
- Zombie recovery: jobs stuck in `processing` for too long are reset to `pending`
- Purpose: Loose coupling between bots for cross-platform notifications
- Table: `formation_events` (type, source, target, data, processed)
- Producers: Discord handlers, AI agents (exercise submission, review, alerts)
- Consumers: Cron jobs poll and dispatch (Telegram: every 5 min, Discord: every 5 min)
## Entry Points
- Triggers: Incoming Telegram updates (text messages, voice, commands)
- Responsibilities: Register commands, handlers, cron jobs; register autonomous agents (Artisan, Chercheur)
- Language: French (admin interface)
- Triggers: Incoming Telegram updates from public users
- Responsibilities: Answer questions in Russian using public knowledge base, detect leads, notify admin
- Language: Russian (audience-facing)
- Triggers: Discord gateway events (messages, slash commands, button interactions, guild member events)
- Responsibilities: Student DM conversations, exercise submission/review, FAQ, admin management, cron jobs
- Language: Russian (student-facing), French (admin channel)
- Triggers: Discord slash commands, button interactions, DM messages
- Responsibilities: Quiz creation from TXT files, question delivery via DM, answer evaluation, score tracking
- Language: Russian (student-facing), French (admin commands)
- Barrel export aggregating all public types, DB functions, AI functions, scheduler, agents, logger
- Used by: All bots import as `import { ... } from '@assistme/core'`
## Error Handling
- Supabase errors: check `error` field in response, log with context, rethrow
- Claude API: throw on missing text block, JSON parse fallback to plain text response
- Redis/Embedding: silent degradation -- return null, callers fall through to direct DB queries
- Background operations (AI review, admin notification, memory agent): `void promise.catch(err => logger.error(...))`
- Agent jobs: errors caught per-job, marked as `failed` in DB without stopping other jobs
- Handler-level: try/catch around full message processing, user-facing error message sent back
- Conversation locks: prevent concurrent processing per user to avoid race conditions
## Cross-Cutting Concerns
- Framework: Pino (`packages/core/src/logger.ts`)
- Singleton export: `export const logger = pino({ ... })`
- Pretty-print in dev (pino-pretty), JSON in production
- Levels: debug (default disabled), info, warn, error
- Pattern: `logger.info({ contextObj }, 'Message')` -- structured first arg, string second
- Level controlled by `LOG_LEVEL` env var
- Tool: Zod for runtime validation of external data (Claude responses, API inputs, quiz parsing)
- Agent input validated via `agent.inputSchema.safeParse(input)` before job creation
- Quiz parsing: discriminated union schema for MCQ/true_false/open questions
- JSON responses from Claude: try/catch with fallback to plain text
- Telegram Admin: `isAdmin(ctx)` checks `ctx.from.id` against `TELEGRAM_ADMIN_ID` env var (`packages/bot-telegram/src/utils/auth.ts`)
- Discord Trainer: Role-based via `isAdmin(message)`, `isStudent(message)`, `isMentor(message)` checking Discord role names (`packages/bot-discord/src/utils/auth.ts`)
- Discord Quiz: Same role-based pattern (`packages/bot-discord-quiz/src/utils/auth.ts`)
- Agent invocation: `CallerRole` ('admin'|'mentor'|'student'|'public') checked against `agent.allowedRoles`
- No JWT/OAuth -- trust platform API message routing
- Per-user processing locks in DM handlers prevent concurrent agent executions
- Pattern: Promise chain per userId -- new messages queue behind existing processing
- Location: `processingLocks` Maps in `dm-handler.ts` and `admin-handler.ts`
- Redis optional: `packages/core/src/cache/redis.ts` with TTL-based get/set
- Memory tiers cached separately (core 5 min, working 2 min)
- Graceful degradation: if Redis unavailable, goes directly to Supabase
- Channel/role names centralized: `packages/bot-discord/src/config.ts`, `packages/bot-discord-quiz/src/config.ts`
- Must match Discord server setup exactly
- Environment: dotenv loaded from project root `.env` (and `.env.dev` for Discord bots)
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
