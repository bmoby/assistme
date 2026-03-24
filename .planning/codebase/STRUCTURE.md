# Codebase Structure

**Analysis Date:** 2026-03-24

## Directory Layout

```
vibe-coder/ (root, pnpm monorepo)
├── packages/
│   ├── core/                          # Shared brain (types, DB, AI, scheduler, agents)
│   │   ├── src/
│   │   │   ├── index.ts               # Main export aggregator
│   │   │   ├── logger.ts              # Pino logger singleton
│   │   │   ├── types/                 # Centralized TypeScript interfaces
│   │   │   ├── db/                    # Supabase abstraction layer
│   │   │   ├── ai/                    # Claude agents and logic
│   │   │   ├── agents/                # Autonomous agent system
│   │   │   ├── scheduler/             # Cron job registry
│   │   │   ├── cache/                 # Redis cache (optional)
│   │   │   ├── google/                # Google APIs (Meet)
│   │   │   └── utils/                 # Shared utilities
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── dist/
│   │
│   ├── bot-telegram/                  # Admin copilot (French)
│   │   ├── src/
│   │   │   ├── index.ts               # Bot entry point
│   │   │   ├── commands/              # Slash commands (/plan, /tasks, /clients, etc.)
│   │   │   ├── handlers/              # Event handlers (free-text, voice)
│   │   │   ├── cron/                  # Scheduled jobs (daily-plan, notifications)
│   │   │   └── utils/                 # Bot-specific helpers (auth, conversation)
│   │   ├── package.json
│   │   └── dist/
│   │
│   ├── bot-telegram-public/           # Public bot (Russian audience)
│   │   ├── src/
│   │   │   ├── index.ts               # Bot entry point
│   │   │   ├── handlers/              # Event handlers (message, voice)
│   │   │   └── utils/                 # Bot-specific helpers
│   │   ├── package.json
│   │   └── dist/
│   │
│   └── bot-discord/                   # Training bot (Russian)
│       ├── src/
│       │   ├── index.ts               # Bot entry point
│       │   ├── config.ts              # Discord bot config (intents, partials)
│       │   ├── commands/
│       │   │   ├── index.ts           # Slash command registration
│       │   │   └── admin/             # Admin-only commands (/session, etc.)
│       │   ├── handlers/              # Event handlers
│       │   │   ├── dm-handler.ts      # Student DM processing
│       │   │   ├── admin-handler.ts   # #admin channel processing
│       │   │   ├── faq.ts             # FAQ handler
│       │   │   ├── review-buttons.ts  # Exercise review interactions
│       │   │   ├── guild-member.ts    # Student welcome
│       │   │   └── button-handler.ts  # Generic button routing
│       │   ├── cron/                  # Scheduled jobs
│       │   │   ├── index.ts           # Cron registration
│       │   │   ├── deadline-reminders.ts
│       │   │   ├── exercise-digest.ts
│       │   │   ├── admin-digest.ts
│       │   │   ├── event-dispatcher.ts
│       │   │   ├── dropout-detector.ts
│       │   │   └── storage-cleanup.ts
│       │   └── utils/                 # Bot-specific helpers
│       ├── package.json
│       └── dist/
│
├── supabase/                          # Database migrations and schema
│   ├── migrations/                    # SQL migration files
│   └── seed.sql                       # Initial seed data
│
├── scripts/                           # Utility scripts
│   ├── seed-formation-knowledge.ts    # Ingest learning-knowledge/ → DB
│   ├── email/templates/               # Email templates
│   └── ...
│
├── specs/                             # Detailed specifications (source of truth)
│   ├── 00-infrastructure/SPEC.md      # DB schema, stack, conventions
│   ├── 01-cerveau-central/SPEC.md     # Core package spec
│   ├── 02-bot-telegram/SPEC.md        # Admin bot spec
│   ├── 03-bot-telegram-public/SPEC.md # Public bot spec
│   ├── 04-bot-discord/SPEC.md         # Discord bot spec
│   ├── 05-systeme-contenu/SPEC.md     # Content system spec
│   ├── CONNEXIONS.md                  # Data flow between components
│   └── ROADMAP.md                     # Development phases and status
│
├── learning-knowledge/                # Pedagogical content (synced to DB)
│   ├── programme.md                   # Full curriculum structure
│   ├── setup-etudiant.md              # Student setup guide
│   ├── regles-discord.md              # Discord server rules
│   ├── module-1/
│   │   ├── session-1/
│   │   │   ├── plan.md                # Session plan
│   │   │   ├── exercices.md           # Exercises
│   │   │   └── ...
│   │   └── ...
│   └── ...
│
├── docs/                              # Historical/archived documentation
│   ├── architecture/
│   ├── profil/
│   ├── recherches/
│   └── reponses/
│
├── .planning/                         # GSD codebase analysis output
│   └── codebase/
│       ├── STACK.md
│       ├── INTEGRATIONS.md
│       ├── ARCHITECTURE.md
│       ├── STRUCTURE.md
│       ├── CONVENTIONS.md
│       ├── TESTING.md
│       └── CONCERNS.md
│
├── .claude/                           # Claude configuration
│   ├── settings.json
│   ├── agents/                        # Custom command definitions
│   ├── commands/                      # Command configs
│   ├── rules/                         # Project-specific rules
│   └── hooks/                         # Git hooks and watchers
│
├── .github/workflows/                 # CI/CD pipelines
│
├── .env.example                       # Environment variables template
├── package.json                       # Root workspace config
├── pnpm-workspace.yaml                # Workspace definition
├── tsconfig.json                      # Root TypeScript config
├── .gitignore
└── README.md
```

## Directory Purposes

**packages/core/src/index.ts:**
- Purpose: Main export point for all core functionality
- Exports: All types, DB functions, AI functions, scheduler, agents, logger
- Pattern: Re-exports from submodules to keep imports simple

**packages/core/src/types/:**
- Purpose: Centralized TypeScript interfaces for entire system
- Contains: Task, DailyPlanTask, Client, MemoryEntry, Student, Session, Exercise, Event, Reminder, FaqEntry types
- Pattern: Define once, import everywhere via `import type { Task } from '@assistme/core'`

**packages/core/src/db/:**
- Purpose: Supabase client and abstraction layer
- Pattern: `getSupabase()` singleton → module per table/concept
- Key files:
  - `client.ts` - Singleton initialization with credentials
  - `tasks.ts` - Task CRUD operations
  - `clients.ts` - Client/lead pipeline
  - `memory.ts` - Personal memory with 3-tier system
  - `reminders.ts` - Notification state
  - `formation/` - Training-specific (students, sessions, exercises, knowledge, faq, attachments, events)

**packages/core/src/ai/:**
- Purpose: All Claude API interactions and agent logic
- Key patterns:
  - `client.ts` - Ask Claude function wrapper
  - `orchestrator.ts` - Main entry for admin text messages
  - Specialized agents: `memory-manager.ts`, `research-agent.ts`, `client-discovery-agent.ts`
  - Formation agents: `dm-agent.ts`, `tsarag-agent.ts`, `faq-agent.ts`, `exercise-reviewer.ts`
  - Support: `context-builder.ts`, `notification-planner.ts`, `embeddings.ts`, `transcribe.ts`

**packages/core/src/agents/:**
- Purpose: Autonomous agent job processing system
- Contains:
  - `registry.ts` - Register agents with permissions
  - `job-processor.ts` - Process async jobs from queue
  - `artisan/` - Autonomous creation agent (PPTX, documents)
  - `chercheur.ts` - Research agent (background analysis)
  - `permissions.ts` - Role-based access control
  - `db.ts` - Agent job state persistence

**packages/core/src/scheduler/:**
- Purpose: Cron job registration and execution
- Pattern: `registerJob(name, cronExpression, handler)` → `startAllJobs()`
- Error handling: Try-catch around handlers, log failures, continue

**packages/core/src/cache/:**
- Purpose: Optional Redis caching layer
- Pattern: Get/set with TTL, graceful fallback to DB if unavailable
- Used by: Context Builder for memory tier caching

**packages/bot-telegram/src/commands/:**
- Purpose: Explicit slash command handlers
- Files: `plan.ts`, `tasks.ts`, `clients.ts`, `kb.ts`, `notifs.ts`, `voice.ts`
- Pattern: `register[X]Command(bot)` function exported from each

**packages/bot-telegram/src/handlers/:**
- Purpose: Event-driven message processors
- Files:
  - `free-text.ts` - Unstructured messages → Orchestrator
  - `voice.ts` - Voice messages → Whisper → Orchestrator
- Pattern: Register with `bot.on('message:text', handler)` and `bot.on('message:voice', handler)`

**packages/bot-telegram/src/cron/:**
- Purpose: Time-based autonomous tasks
- Key files:
  - `dynamic-notifications.ts` - `planDay()` (07:00), `dispatchNotifications()` (*/2)
  - `formation-events.ts` - Poll events, forward Discord→Telegram
- Pattern: `scheduler.registerJob()` in `registerCronJobs(bot)`

**packages/bot-telegram/src/utils/:**
- Purpose: Bot-specific helpers
- Files: `auth.ts` (isAdmin check), `conversation.ts` (history management), `reply.ts`, `pdf.ts`

**packages/bot-discord/src/commands/admin/:**
- Purpose: Admin slash commands
- Files: Likely `/session`, `/session-update` handlers
- Pattern: Verify role, call Core agents, create DB entries

**packages/bot-discord/src/handlers/dm-handler.ts:**
- Purpose: Process student DMs for exercise submission
- Flow: Intercept DM → file upload → DM Agent → create submission
- State: Per-user conversation and attachment buffers (30 min TTL)

**packages/bot-discord/src/handlers/admin-handler.ts:**
- Purpose: Process #admin channel messages for admin operations
- Flow: Intercept → Tsarag Agent → propose action → execute (tool-use pattern)
- State: Per-channel conversation and pending action

**packages/bot-discord/src/cron/:**
- Purpose: Autonomous Discord-specific tasks
- Files: `deadline-reminders.ts`, `exercise-digest.ts`, `admin-digest.ts`, `event-dispatcher.ts`, `dropout-detector.ts`, `storage-cleanup.ts`
- Pattern: Register via `scheduler.registerJob()`

**supabase/migrations/:**
- Purpose: Database schema evolution
- Pattern: Numbered SQL files (001_, 002_, etc.), idempotent where possible
- Tables: tasks, clients, memory, reminders, daily_plans, public_knowledge, sessions, students, exercises, events, formation_knowledge, student_exercises, exercise_attachments, faq, student_faq_answers

**scripts/seed-formation-knowledge.ts:**
- Purpose: Ingest `learning-knowledge/` markdown files into formation_knowledge table
- Process: Read files → chunk by headings → extract tags → upsert to DB → background embed
- Run via: `pnpm seed:knowledge`

**learning-knowledge/:**
- Purpose: Source of truth for pedagogical content
- Structure: `programme.md` (overview) + `module-N/session-N/` (detailed plans + exercises)
- Sync: Files committed to git, seeded to DB via `seed-formation-knowledge.ts`
- Update workflow: Modify markdown → `pnpm seed:knowledge` → DB updated

**specs/:**
- Purpose: Detailed specifications (source of truth per component)
- Files: One SPEC.md per major component + CONNEXIONS.md (data flow) + ROADMAP.md (phases)
- Access pattern: Read spec BEFORE modifying package code

## Key File Locations

**Entry Points:**
- `packages/bot-telegram/src/index.ts` - Telegram admin bot startup (main())
- `packages/bot-telegram-public/src/index.ts` - Telegram public bot startup (main())
- `packages/bot-discord/src/index.ts` - Discord bot startup (main())
- `packages/core/src/index.ts` - Core module exports (not executable)

**Configuration:**
- `.env` (not committed) - Environment variables (TELEGRAM_BOT_TOKEN, DISCORD_BOT_TOKEN, etc.)
- `pnpm-workspace.yaml` - Workspace definition
- `tsconfig.json` - Root TypeScript config
- `packages/*/package.json` - Per-package config and scripts
- `packages/*/tsconfig.json` - Per-package overrides (all inherit from root)

**Core Logic:**
- `packages/core/src/ai/orchestrator.ts` - Admin message routing and action generation
- `packages/core/src/ai/context-builder.ts` - Dynamic context assembly
- `packages/core/src/db/client.ts` - Supabase singleton
- `packages/core/src/db/memory.ts` - Memory CRUD with semantic search
- `packages/core/src/scheduler/index.ts` - Cron job registry

**Bot-Specific:**
- `packages/bot-telegram/src/handlers/free-text.ts` - Main admin message processor
- `packages/bot-telegram/src/cron/dynamic-notifications.ts` - Daily planning + dispatch
- `packages/bot-discord/src/handlers/dm-handler.ts` - Student exercise submissions
- `packages/bot-discord/src/handlers/admin-handler.ts` - Admin operations

**Testing:**
- No dedicated test files found (legacy architecture, tests likely external)

**Database:**
- `supabase/migrations/` - SQL schema evolution

**Documentation:**
- `specs/` - Component specifications (authoritative)
- `learning-knowledge/` - Pedagogical content (authoritative)
- `docs/` - Historical notes (archived)

## Naming Conventions

**Files:**
- `*.ts` - TypeScript source files
- `index.ts` - Module/directory entry point
- Pattern for handlers: `{trigger}-handler.ts` or `{trigger}.ts` (e.g., `free-text.ts`, `dm-handler.ts`)
- Pattern for commands: `{domain}.ts` (e.g., `tasks.ts`, `clients.ts`)
- Pattern for agents: `{agent-name}-agent.ts` (e.g., `orchestrator.ts`, `research-agent.ts`)
- Pattern for utilities: `{concept}.ts` (e.g., `auth.ts`, `conversation.ts`)
- Pattern for crons: `{job-name}.ts` (e.g., `dynamic-notifications.ts`, `deadline-reminders.ts`)

**Directories:**
- `src/` - Source code (TypeScript)
- `dist/` - Compiled output (JavaScript, generated)
- `packages/` - Monorepo workspaces
- `scripts/` - Executable utilities
- `specs/` - Specifications
- `learning-knowledge/` - Content
- `docs/` - Documentation
- `.planning/` - GSD output

**TypeScript/Code:**
- `camelCase` for variables, functions, parameters
- `PascalCase` for classes, types, interfaces
- `UPPER_SNAKE_CASE` for constants (MODEL_MAP, etc.)
- Prefix private functions with `_` (rarely used, keep exports small)
- Async functions clearly named: `runAgent()`, `registerJob()`, `processMessage()`

**Database:**
- `snake_case` for table and column names (SQL convention)
- Table names plural where collection-like (tasks, clients, reminders)
- Single row/entity tables singular (daily_plans is special case)
- Foreign keys: `{entity}_id` (e.g., `task_id`, `user_id`)

**Environment Variables:**
- `UPPER_SNAKE_CASE` (e.g., TELEGRAM_BOT_TOKEN, SUPABASE_URL)
- Grouped by system: `TELEGRAM_*`, `DISCORD_*`, `SUPABASE_*`, `ANTHROPIC_*`, `LOG_*`

## Where to Add New Code

**New Feature in Core (DB-backed):**
1. Define type in `packages/core/src/types/index.ts`
2. Create DB module `packages/core/src/db/{concept}.ts` with CRUD functions
3. Export from `packages/core/src/db/index.ts`
4. Use in agents/handlers via `import { function } from '@assistme/core'`

**New AI Agent/Logic:**
1. Create file `packages/core/src/ai/{agent-name}-agent.ts`
2. If tool-use required: register tools, implement tool handlers
3. Export from `packages/core/src/ai/index.ts`
4. Call from handler: `import { run{AgentName}Agent } from '@assistme/core'`
5. Update `specs/01-cerveau-central/SPEC.md` with agent description

**New Telegram Admin Command:**
1. Create `packages/bot-telegram/src/commands/{domain}.ts`
2. Export `register{X}Command(bot)` function
3. Import and call in `packages/bot-telegram/src/commands/index.ts`
4. Register in bot entry point via `registerCommands(bot)`

**New Discord Slash Command:**
1. Create handler in `packages/bot-discord/src/commands/admin/{command}.ts` (if admin-only)
2. Or in `packages/bot-discord/src/commands/` (if general)
3. Register in `packages/bot-discord/src/commands/index.ts` via REST API
4. Add to `setupCommandHandler()` or create new handler

**New Cron Job:**
1. Create `packages/bot-{platform}/src/cron/{job-name}.ts` with exported handler function
2. Import in `packages/bot-{platform}/src/cron/index.ts`
3. Call `scheduler.registerJob(name, cronExpression, handler)` in `registerCronJobs()`
4. Add startup call: `scheduler.startAllJobs()` in bot entry point (if not already done)

**New Database Migration:**
1. Create `supabase/migrations/{NNN}_description.sql`
2. Write idempotent SQL (use IF NOT EXISTS, CREATE OR REPLACE FUNCTION)
3. Test migration: Deploy to Supabase instance
4. Update `specs/00-infrastructure/SPEC.md` schema section

**New Formation Content:**
1. Create `learning-knowledge/module-{N}/session-{N}/` directory
2. Add `plan.md`, `exercices.md`, visuals, etc.
3. Run `pnpm seed:knowledge` to ingest to DB
4. Update `learning-knowledge/programme.md` with session links

**New Utility/Helper:**
- **Shared across bots**: `packages/core/src/utils/{concept}.ts` → export from core
- **Bot-specific**: `packages/bot-{platform}/src/utils/{concept}.ts`
- **Google APIs**: `packages/core/src/google/{service}.ts`

## Special Directories

**node_modules/:**
- Purpose: Installed dependencies (pnpm workspaces)
- Generated: Yes
- Committed: No (.gitignore)

**dist/:**
- Purpose: Compiled TypeScript output
- Generated: Yes (by `tsc` during build)
- Committed: No (.gitignore)

**.env:**
- Purpose: Runtime configuration (API keys, database URLs)
- Template: `.env.example`
- Committed: No (.gitignore)
- How to use: Copy `.env.example` to `.env`, fill in values

**.planning/codebase/:**
- Purpose: GSD analysis documents (STACK.md, ARCHITECTURE.md, etc.)
- Generated: By GSD mapper agents
- Committed: Yes
- Update frequency: Per major refactoring or phase completion

---

*Structure analysis: 2026-03-24*
