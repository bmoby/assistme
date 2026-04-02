# Codebase Structure

**Analysis Date:** 2026-03-31

## Directory Layout

```
vibe-coder/
├── packages/
│   ├── core/                        # Shared brain: DB, AI, types, scheduler, agents
│   │   └── src/
│   │       ├── agents/              # Autonomous agent framework + registered agents
│   │       │   └── artisan/         # PPTX presentation generator agent
│   │       ├── ai/                  # All Claude/OpenAI API logic
│   │       │   └── formation/       # Formation-specific agents (DM, FAQ, Tsarag, Exercise Reviewer)
│   │       ├── cache/               # Redis caching layer (optional)
│   │       ├── config/              # Constants and configuration
│   │       ├── db/                  # Supabase database operations
│   │       │   ├── formation/       # Formation tables (students, exercises, sessions, faq, events, knowledge)
│   │       │   └── quiz/            # Quiz tables (quizzes, questions, sessions, answers)
│   │       ├── google/              # Google APIs (Meet link generation)
│   │       ├── scheduler/           # Cron job registration and lifecycle
│   │       ├── types/               # Centralized TypeScript interfaces
│   │       └── utils/               # Shared utilities (session forum content builder)
│   ├── bot-telegram/                # Admin Copilot bot (French, grammY)
│   │   └── src/
│   │       ├── commands/            # Slash/text commands (/plan, /tasks, /clients, etc.)
│   │       ├── cron/                # Scheduled jobs (memory, notifications, events)
│   │       ├── handlers/            # Message handlers (free-text, voice)
│   │       └── utils/               # Auth, conversation, formatting, PDF, reply helpers
│   ├── bot-telegram-public/         # Public bot (Russian, grammY)
│   │   └── src/
│   │       ├── handlers/            # Message and voice handlers
│   │       └── utils/               # Conversation history, admin notification
│   ├── bot-discord/                 # Discord Trainer bot (discord.js)
│   │   └── src/
│   │       ├── __mocks__/           # Test mocks (core, discord, fixtures)
│   │       ├── commands/            # Slash commands
│   │       │   └── admin/           # Admin-only commands (session, review, announce, etc.)
│   │       ├── cron/                # Scheduled jobs (digest, dropout, events, cleanup)
│   │       ├── handlers/            # Event handlers (DM, FAQ, admin, buttons, guild-member)
│   │       └── utils/               # Auth, formatting, message splitting, review threads
│   └── bot-discord-quiz/            # Quiz bot - TeacherBot (discord.js)
│       └── src/
│           ├── ai/                  # Quiz-specific AI (TXT parsing)
│           ├── commands/            # Slash commands (quiz-create, quiz-status, quiz-close)
│           ├── cron/                # Expired quiz cleanup
│           ├── handlers/            # Button handlers, quiz flow (start, answer, DM)
│           └── utils/               # Auth, quiz evaluation, flow control, message formatting
├── supabase/
│   └── migrations/                  # SQL migrations (001-019)
├── embedding-server/                # Optional FastAPI embedding server (Python)
├── scripts/                         # Utility scripts (seed, migrate, research, auth)
├── learning-knowledge/              # Formation content (markdown files)
│   └── module-1/                    # Module-specific session plans, exercises, visuals
├── specs/                           # Spec-first documentation (SOURCE OF TRUTH)
├── test/                            # Shared test infrastructure (global setup, e2e)
├── deploy/                          # Deployment configuration
├── docs/                            # Historical architecture and research docs (archived)
├── .github/workflows/               # CI/CD (test.yml, deploy.yml)
├── .githooks/                       # Git hooks (pre-push runs tests)
├── .claude/                         # Claude Code configuration and GSD workflow
├── .planning/                       # GSD planning artifacts and codebase analysis
├── tsconfig.json                    # Root TypeScript config (shared by all packages)
├── vitest.config.ts                 # Root Vitest config with project-based test runners
├── package.json                     # Root workspace scripts and dev dependencies
├── pnpm-workspace.yaml              # Workspace definition: packages/*
├── Dockerfile                       # Multi-stage Docker build (builder -> production -> seed)
└── docker-compose.prod.yml          # Production compose with all services
```

## Directory Purposes

**`packages/core/` (`@assistme/core`):**
- Purpose: Shared brain used by all bots. Contains ALL database operations, AI logic, types, and infrastructure
- Entry: `packages/core/src/index.ts` -- barrel export of everything public
- Key files:
  - `packages/core/src/ai/client.ts` -- Singleton Claude API client with model selection
  - `packages/core/src/ai/orchestrator.ts` -- Admin message interpretation and action execution
  - `packages/core/src/ai/context-builder.ts` -- Dynamic prompt context assembly from memory + live data
  - `packages/core/src/ai/formation/dm-agent.ts` -- Student DM conversation agent with tool-use loop
  - `packages/core/src/ai/formation/tsarag-agent.ts` -- Admin formation management agent with propose/confirm flow
  - `packages/core/src/db/client.ts` -- Singleton Supabase client
  - `packages/core/src/types/index.ts` -- All TypeScript interfaces
  - `packages/core/src/agents/registry.ts` -- Agent registration, invocation, permission checking
  - `packages/core/src/logger.ts` -- Pino logger singleton

**`packages/bot-telegram/` (`@assistme/bot-telegram`):**
- Purpose: Admin Copilot -- personal assistant for Magomed (French language)
- Entry: `packages/bot-telegram/src/index.ts`
- Key files:
  - `packages/bot-telegram/src/handlers/free-text.ts` -- Main message handler routing to Orchestrator
  - `packages/bot-telegram/src/cron/index.ts` -- Registers all Telegram cron jobs
  - `packages/bot-telegram/src/utils/auth.ts` -- Admin ID verification
  - `packages/bot-telegram/src/utils/conversation.ts` -- In-memory conversation history

**`packages/bot-telegram-public/` (`@assistme/bot-telegram-public`):**
- Purpose: Public-facing bot for audience interactions (Russian language)
- Entry: `packages/bot-telegram-public/src/index.ts`
- Key files:
  - `packages/bot-telegram-public/src/handlers/message.ts` -- Q&A with lead detection
  - `packages/bot-telegram-public/src/utils/notify-admin.ts` -- Telegram admin notification helper

**`packages/bot-discord/` (`@assistme/bot-discord`):**
- Purpose: Discord Trainer bot for formation management and student interactions
- Entry: `packages/bot-discord/src/index.ts`
- Key files:
  - `packages/bot-discord/src/handlers/dm-handler.ts` -- Student DM agent with exercise submission flow (~800 lines)
  - `packages/bot-discord/src/handlers/admin-handler.ts` -- Admin channel Tsarag agent
  - `packages/bot-discord/src/handlers/faq.ts` -- FAQ auto-answering
  - `packages/bot-discord/src/commands/index.ts` -- Slash command registration and routing
  - `packages/bot-discord/src/config.ts` -- Discord channel/role name constants

**`packages/bot-discord-quiz/` (`@assistme/bot-discord-quiz`):**
- Purpose: Separate quiz bot (TeacherBot) for automated student evaluation
- Entry: `packages/bot-discord-quiz/src/index.ts`
- Key files:
  - `packages/bot-discord-quiz/src/ai/parse-quiz.ts` -- Claude-powered TXT quiz parsing with Zod validation
  - `packages/bot-discord-quiz/src/commands/quiz-create.ts` -- Admin uploads TXT, AI parses, sends to students
  - `packages/bot-discord-quiz/src/handlers/quiz-answer.ts` -- Student answer processing
  - `packages/bot-discord-quiz/src/utils/quiz-eval.ts` -- Answer evaluation logic (exact match + AI for open)
  - `packages/bot-discord-quiz/src/utils/quiz-flow.ts` -- Quiz progression and scoring

**`supabase/migrations/`:**
- Purpose: PostgreSQL schema migrations (ordered 001-019)
- Key migrations:
  - `001_initial_schema.sql` -- Tasks, clients, habits, content ideas
  - `002_memory_and_events.sql` -- Memory tiers, formation events
  - `004_students_system.sql` -- Students table
  - `005_sessions_system.sql` -- Sessions table
  - `009_agent_jobs.sql` -- Autonomous agent job queue
  - `010_formation_knowledge.sql` -- Knowledge base with vector search RPC
  - `017_exercise_submission_v2.sql` -- Exercise submission with attachments
  - `018_quiz_system.sql` -- Quiz tables (quizzes, questions, sessions, answers)

**`scripts/`:**
- Purpose: Standalone utility scripts
- Key files:
  - `scripts/seed-formation-knowledge.ts` -- Sync markdown files to DB with embeddings (idempotent)
  - `scripts/migrate-local.sh` -- Run Supabase migrations locally
  - `scripts/clone-prod-to-local.sh` -- Clone production DB to local
  - `scripts/google-auth.ts` -- Google OAuth2 setup for Meet integration

**`learning-knowledge/`:**
- Purpose: Formation content files (markdown) -- source of truth for knowledge base
- Synced to DB via `pnpm seed:knowledge`
- Contains: Session plans, quiz files, exercise descriptions, setup guides

**`specs/`:**
- Purpose: Specification documents (SOURCE OF TRUTH for development)
- Structure: `specs/00-infrastructure/`, `specs/01-cerveau-central/`, etc.
- Key files: `specs/INDEX.md`, `specs/CONNEXIONS.md`, `specs/ROADMAP.md`

## Key File Locations

**Entry Points:**
- `packages/core/src/index.ts`: Core package barrel export
- `packages/bot-telegram/src/index.ts`: Telegram Admin bot startup
- `packages/bot-telegram-public/src/index.ts`: Telegram Public bot startup
- `packages/bot-discord/src/index.ts`: Discord Trainer bot startup
- `packages/bot-discord-quiz/src/index.ts`: Discord Quiz bot startup

**Configuration:**
- `tsconfig.json`: Root TypeScript config (ES2022, strict, ESM)
- `vitest.config.ts`: Root test config with 6 projects (unit + integration + e2e)
- `package.json`: Workspace scripts (dev, build, test, seed)
- `pnpm-workspace.yaml`: Workspace definition
- `packages/bot-discord/src/config.ts`: Discord channel/role name mapping
- `packages/bot-discord-quiz/src/config.ts`: Quiz bot channel/role name mapping

**Core Logic:**
- `packages/core/src/ai/orchestrator.ts`: Admin message interpretation
- `packages/core/src/ai/formation/dm-agent.ts`: Student DM agent
- `packages/core/src/ai/formation/tsarag-agent.ts`: Admin formation agent
- `packages/core/src/ai/context-builder.ts`: Dynamic context assembly
- `packages/core/src/agents/registry.ts`: Agent registration and invocation
- `packages/core/src/agents/job-processor.ts`: Background agent job execution

**Database:**
- `packages/core/src/db/client.ts`: Supabase singleton
- `packages/core/src/db/formation/`: All formation CRUD (students, exercises, sessions, faq, events, knowledge, attachments)
- `packages/core/src/db/quiz/`: All quiz CRUD (quizzes, questions, sessions, answers)
- `packages/core/src/db/memory.ts`: Three-tier memory with hybrid search
- `packages/core/src/db/tasks.ts`: Task management

**Testing:**
- `vitest.config.ts`: Root config defining 6 test projects
- `packages/bot-discord/src/__mocks__/`: Shared test mocks (core, discord.js, domain fixtures)
- `test/globalSetup.ts`: Integration test global setup (Supabase local)

## Naming Conventions

**Files:**
- kebab-case for all source files: `dm-agent.ts`, `quiz-eval.ts`, `context-builder.ts`
- Test files co-located with source: `dm-agent.test.ts`, `quiz-eval.test.ts`
- Integration tests use suffix: `dm-agent.integration.test.ts`
- Index files as barrel exports: `index.ts` in each directory

**Directories:**
- kebab-case: `bot-discord-quiz`, `formation`, `admin`
- Feature grouping: `commands/admin/`, `db/formation/`, `db/quiz/`, `ai/formation/`
- `__mocks__/` for test mock modules

**Packages:**
- Scoped: `@assistme/core`, `@assistme/bot-discord`, `@assistme/bot-discord-quiz`, `@assistme/bot-telegram`, `@assistme/bot-telegram-public`
- Workspace references: `"@assistme/core": "workspace:*"`

## Where to Add New Code

**New AI Agent (formation-related):**
- Agent logic: `packages/core/src/ai/formation/{agent-name}.ts`
- Export from: `packages/core/src/ai/formation/index.ts`
- Re-export from: `packages/core/src/ai/index.ts`
- Re-export from: `packages/core/src/index.ts` (automatic via barrel)
- Tests: `packages/core/src/ai/formation/{agent-name}.test.ts`

**New Autonomous Agent (background job):**
- Agent definition: `packages/core/src/agents/{agent-name}/index.ts` (or `{agent-name}.ts` for simple ones)
- Register function: Export `register{AgentName}` function
- Register in bot startup: Add `agents.register{AgentName}()` in bot `index.ts`
- Export from: `packages/core/src/agents/index.ts`

**New Database Table/Operations:**
- Migration: `supabase/migrations/{NNN}_{description}.sql`
- DB module: `packages/core/src/db/{domain}/{table-name}.ts`
- Barrel export: Add to `packages/core/src/db/{domain}/index.ts` then `packages/core/src/db/index.ts`
- Types: Add interfaces to `packages/core/src/types/index.ts`

**New Discord Slash Command (Trainer bot):**
- Command file: `packages/bot-discord/src/commands/admin/{command-name}.ts`
- Export: `{commandName}Command` (SlashCommandBuilder) + `handle{CommandName}` (handler)
- Register: Import and add to `commands` array in `packages/bot-discord/src/commands/index.ts`
- Tests: `packages/bot-discord/src/commands/admin/{command-name}.test.ts`

**New Discord Slash Command (Quiz bot):**
- Command file: `packages/bot-discord-quiz/src/commands/{command-name}.ts`
- Register: Import and push to `commands` array in `packages/bot-discord-quiz/src/commands/index.ts`
- Tests: `packages/bot-discord-quiz/src/commands/{command-name}.test.ts`

**New Discord Handler:**
- Handler file: `packages/bot-discord/src/handlers/{handler-name}.ts`
- Setup function: Export `setup{HandlerName}(client: Client)`
- Register: Call setup function in `packages/bot-discord/src/index.ts`
- Tests: `packages/bot-discord/src/handlers/{handler-name}.test.ts`

**New Telegram Command:**
- Command file: `packages/bot-telegram/src/commands/{command-name}.ts`
- Register: Import in `packages/bot-telegram/src/commands/index.ts`

**New Cron Job:**
- Job logic: `packages/{bot}/src/cron/{job-name}.ts`
- Register: Add `scheduler.registerJob(...)` in `packages/{bot}/src/cron/index.ts`

**New Core Utility:**
- File: `packages/core/src/utils/{utility-name}.ts`
- Export from: `packages/core/src/index.ts`

**New Formation Content:**
- Markdown files: `learning-knowledge/module-{N}/session-{NN}-{topic}.md`
- After adding: Run `pnpm seed:knowledge` to sync to DB

**New Test Fixtures (Discord bot):**
- Location: `packages/bot-discord/src/__mocks__/fixtures/domain/{entity}.ts`
- Export from: `packages/bot-discord/src/__mocks__/fixtures/domain/index.ts`

## Special Directories

**`supabase/migrations/`:**
- Purpose: Sequential SQL migration files for PostgreSQL schema
- Generated: No (hand-written)
- Committed: Yes
- Run via: `scripts/migrate-local.sh` or `pnpm migrate`

**`embedding-server/`:**
- Purpose: Optional FastAPI server for MiniLM-L6-v2 embeddings (legacy, replaced by OpenAI embeddings)
- Generated: No
- Committed: Yes
- Note: Currently unused -- embeddings now use OpenAI text-embedding-3-small directly via `packages/core/src/ai/embeddings.ts`

**`dist/` (per package):**
- Purpose: Compiled JavaScript output from TypeScript
- Generated: Yes (by `tsc`)
- Committed: No (gitignored)

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (by `pnpm install`)
- Committed: No (gitignored)

**`.planning/`:**
- Purpose: GSD workflow planning artifacts and codebase analysis documents
- Generated: Yes (by GSD commands)
- Committed: Yes

**`specs/`:**
- Purpose: Specification documents -- SOURCE OF TRUTH for all development
- Generated: No (hand-written)
- Committed: Yes
- Rule: Read spec BEFORE coding, update spec if implementation diverges

**`test/`:**
- Purpose: Shared test infrastructure (global setup for integration tests, e2e setup)
- Contains: `test/globalSetup.ts` (Supabase local startup), `test/e2e/` (end-to-end tests)
- Committed: Yes

---

*Structure analysis: 2026-03-31*
