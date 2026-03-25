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

**Dev Environment & Automated Tests - Bot Discord**

Infrastructure de tests automatises et environnement de developpement pour le bot Discord formateur (`packages/bot-discord`). Actuellement zero tests, zero feedback local -- tout est teste en production. Ce projet met en place 3 couches de tests (unit, integration, E2E) et l'infra necessaire pour dev en confiance.

**Core Value:** Pouvoir modifier le bot Discord et savoir immediatement si ca marche ou si ca casse quelque chose -- sans deployer en prod.

### Constraints

- **Stack:** TypeScript strict, ESM, pnpm workspaces -- pas de CJS
- **Runtime:** Node.js 20+
- **Test framework:** Vitest (recommande par codebase map pour ESM + monorepo)
- **DB locale:** Supabase local via Docker (pas de mock DB pour les tests d'integration)
- **Bot de dev:** Token Discord separe de la prod, serveur de test dedie
- **CI:** GitHub Actions, doit tourner sans secrets Discord pour unit/integration
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.7.0 - All source code (strict mode enforced via `tsconfig.json`)
- JavaScript/Node.js 20+ - Runtime
- SQL - Supabase PostgreSQL migrations and functions
## Runtime
- Node.js 20+ (specified in `package.json` engines)
- pnpm 7.0+ (monorepo with workspaces)
- Lockfile: `pnpm-lock.yaml` (present)
## Frameworks
- grammY 1.31.0 - Telegram bot framework (`packages/bot-telegram`, `packages/bot-telegram-public`)
- discord.js 14.16.0 - Discord bot framework (`packages/bot-discord`)
- @anthropic-ai/sdk 0.39.0 - Claude API integration (`packages/core`)
- openai 6.27.0 - OpenAI API integration (Whisper transcription, TTS, embeddings)
- tsx 4.21.0 - TypeScript execution engine for dev/scripts
- TypeScript 5.7.0 - Type checking and compilation
- node-cron 3.0.3 - Cron job scheduling for background tasks
- @supabase/supabase-js 2.49.1 - PostgreSQL database client
- redis 4.6.0 - Optional caching layer (optional if REDIS_URL not set)
- zod 3.24.2 - Runtime schema validation for external data
- pino 9.6.0 - Structured logging
- pino-pretty 13.1.3 - Human-readable log formatting in development
- pptxgenjs 4.0.1 - PowerPoint presentation generation
- pdfkit 0.17.2 - PDF document generation (bot-telegram)
- googleapis 171.4.0 - Google APIs client (Calendar, Meet link generation)
- dotenv 17.3.1 - Load .env files (bot-telegram, bot-telegram-public, bot-discord)
## Key Dependencies
- @anthropic-ai/sdk - Claude API backbone for AI agents and memory consolidation
- @supabase/supabase-js - PostgreSQL database with vector/embedding support
- grammY - Telegram bot communication
- discord.js - Discord bot communication
- openai - Whisper (transcription), TTS (voice responses), text-embedding-3-small (semantic search)
- googleapis - Google Calendar/Meet integration for session management
- redis - Caching layer (graceful degradation if unavailable)
## Configuration
- See `.env.example` for full list
- Critical: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`, `OPENAI_API_KEY`
- Optional: `REDIS_URL`, `EMBEDDING_SERVER_URL`, `GOOGLE_*` (Google Meet), `INSTAGRAM_*` (Phase 4)
- Development: `.env` file at project root (git-ignored)
- `tsconfig.json` - Root TypeScript configuration (ES2022 target, strict mode, ESM modules)
- ESM-only: All packages use `"type": "module"` in package.json (no CommonJS)
## Project Structure
## Platform Requirements
- Node.js 20+ with pnpm 7+
- PostgreSQL compatible database (Supabase)
- Telegram API credentials for bot token
- Discord API credentials for bot and guild
- Claude API key (Anthropic)
- OpenAI API key (Whisper, TTS, embeddings)
- Optional: Redis for caching
- Optional: Google OAuth2 credentials for Meet integration
- Deployment target: Node.js server (GCP, AWS, Heroku compatible)
- Supabase project (PostgreSQL + vector extensions)
- Secure env var management for API keys
- Redis instance for caching (optional but recommended)
## Development Commands
- `pnpm install` - Install all dependencies
- `pnpm dev` - Run all packages in parallel (watch mode)
- `pnpm build` - Build all packages
- `pnpm typecheck` - Type check all packages
- `pnpm lint` - Run ESLint on all source
- `pnpm lint:fix` - Fix linting issues
- `pnpm format` - Format code with Prettier
- `pnpm seed:knowledge` - Sync formation markdown to DB with embeddings
- `pnpm -F @assistme/core dev` - Run core only
- `pnpm -F @assistme/bot-telegram dev` - Run Telegram admin bot only
- `pnpm -F @assistme/bot-telegram-public dev` - Run Telegram public bot only
- `pnpm -F @assistme/bot-discord dev` - Run Discord bot only
## Output Format
- ESM (ES Modules) only - `import`/`export` syntax
- No CommonJS, no bundling for Node.js packages
- TSC compiles to `dist/` directories
- JavaScript: `dist/*.js` with `.d.ts` declaration files
- Source maps: `dist/*.js.map` for debugging
- Type definitions: `dist/*.d.ts` exported via package.json exports field
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Lowercase with hyphens for directories and modules: `agent-jobs.ts`, `memory-agent.ts`, `bot-telegram`
- PascalCase for type/interface files if exporting types: `types/index.ts` contains interfaces like `Task`, `Student`
- Index files (`index.ts`) as module entry points for directory-based organization
- Function files use kebab-case that matches functionality: `memory-agent.ts`, `context-builder.ts`, `pptx-builder.ts`
- camelCase for all function names
- Async functions follow same naming convention without async suffix: `createTask()`, `getSupabase()`, `runMemoryAgent()`
- Private helper functions prefixed with underscore discouraged; instead use module scoping
- Action-verb prefix for database operations: `getTask()`, `createTask()`, `updateTask()`, `deleteMemory()`
- Query functions: `get*` for single/array returns, `search*` for filtered results
- Boolean functions: `is*`, `has*`, `can*` prefix: `isOpen` (redis check pattern)
- camelCase for all local variables and parameters
- Constant strings (prompts, messages): UPPER_SNAKE_CASE
- Example: `MEMORY_AGENT_PROMPT`, `ORCHESTRATOR_PROMPT`, `TABLE = 'tasks'`
- Interface implementations use camelCase properties
- Configuration objects: camelCase keys
- PascalCase for all type and interface names: `Task`, `AgentJob`, `AgentDefinition`, `AgentOutput`
- Union types: PascalCase: `TaskStatus`, `TaskPriority`, `CallerRole`
- Zod schemas: PascalCase suffix with "Schema": `ArtisanInputSchema`, `AgentOriginSchema`
- Type inference from Zod: `type ArtisanInput = z.infer<typeof ArtisanInputSchema>`
## Code Style
- ESM modules only (`import`/`export`, no `require`)
- Import `.js` extension explicitly in ESM files: `import { logger } from '../logger.js'`
- No auto-formatting tool configured (prettier/eslint configs missing)
- Standard indentation observed: 2 spaces
- Line length: typically under 100 characters for readability
- Root package.json defines lint commands but no config files present
- Commands available: `pnpm lint` (eslint), `pnpm lint:fix`, `pnpm format` (prettier)
- Actual linting configuration files not present in repo (may be inherited from node_modules)
- No strict linting enforcement observed in codebase review
## Import Organization
- No path aliases configured (no `@/` or `~` patterns)
- Direct relative paths used throughout: `../../ai/client.js`, `../db/memory.js`
## Error Handling
- Throw explicit Error objects with descriptive messages: `throw new Error('Missing ANTHROPIC_API_KEY environment variable')`
- Error messages are developer-facing strings that include context
- Database errors logged before rethrowing: `logger.error({ error }, 'Failed to get task'); throw error;`
- Non-critical operations use graceful degradation (see cache module):
- Try-catch used for JSON parsing, graceful fallback to plain text:
- Async operations use Promise.all for parallel execution: `const [coreMemory, workingMemory] = await Promise.all([...])`
- Supabase errors checked via `error` field in response object, not exceptions
## Logging
- Centralized logger instance exported: `export const logger = pino({ ... })`
- Log levels: 'debug', 'info', 'warn', 'error' observed in use
- Context object as first parameter (structured logging): `logger.error({ error, id }, 'Failed to get task')`
- Informational logs use logger.info: `logger.info('Supabase client initialized')`
- Debug logs for detailed traces: `logger.debug({ model, promptLength }, 'Calling Claude API')`
- Warning logs for recoverable issues: `logger.warn({ count }, 'Recovered zombie agent jobs')`
- Non-critical failures (cache) logged at debug level to avoid noise
- Log level determined by `LOG_LEVEL` env var, defaults to 'info'
## Comments
- Block comments for major system prompts (multi-line, placed above constant)
- Comments on complex logic like zombie job recovery or memory tier classification
- Section comments for grouping related functionality (e.g., `// ============================================` separators in types)
- No JSDoc observed in codebase; type inference from TypeScript sufficient
## Function Design
- Typical functions 10-40 lines for database operations
- Larger functions (50-100+ lines) used for complex orchestration logic (orchestrator, agents)
- Agent execute functions contain substantial business logic but maintain readability through clear sections
- Single object parameter preferred for functions with 2+ arguments: `{ agentName, input, origin }`
- Type-safe via TypeScript interfaces or Zod schemas
- Optional parameters use `?` nullability or defaults: `slideCount?: number`, `model?: ModelChoice`
- Default values provided in function body: `category: task.category ?? 'personal'`
- Explicit return types always specified in function signature
- Async functions return Promise<T>: `Promise<Task>`, `Promise<void>`, `Promise<AgentOutput>`
- Database functions return entity types or null: `Task | null`, `Task[]`
- Orchestration functions return structured objects: `{ response: string; actions: Array<{...}> }`
- Errors thrown explicitly rather than returning Result<T> types
## Module Design
- Default export rare; named exports preferred
- Each module exports main functions plus supporting types
- Database modules (`packages/core/src/db/`) export CRUD operations and query functions
- AI modules (`packages/core/src/ai/`) export main entry points with clear names: `askClaude()`, `runMemoryAgent()`
- Agents register themselves via `registerAgent()` pattern
- `packages/core/src/index.ts` serves as single export point for entire core package
- `packages/core/src/agents/index.ts` exports all agent registration functions
- `packages/core/src/ai/formation/index.ts` exports formation-related agents
- Internal barrel files re-export from subdirectories for clean API surface
## Validation
- Agent input validation via Zod schemas: `ArtisanInputSchema.parse(input)`
- API data validation before database operations
- Example schema:
- Type inference from schema: `type ArtisanInput = z.infer<typeof ArtisanInputSchema>`
- JSON response parsing with fallback: `JSON.parse()` with catch block returning degraded result
## Database Access Pattern
- `packages/core/src/db/client.ts` — Supabase client initialization
- `packages/core/src/db/tasks.ts` — Task CRUD operations
- `packages/core/src/db/clients.ts` — Client/lead operations
- `packages/core/src/db/memory.ts` — Memory tier operations
- `packages/core/src/db/formation/` — Formation-specific queries
- `packages/core/src/db/formation/knowledge.ts` — Knowledge base operations
## API Call Pattern
- Model selection via enum: `'sonnet' | 'opus'` mapped to full model names
- System prompts passed separately for cleaner separation
- Token usage logged for monitoring
- Singleton client pattern (initialized once, reused)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- **Three independent bot clients** (Telegram Admin, Telegram Public, Discord) communicate through a shared Core brain
- **Request-response pattern** for synchronous operations + **event-driven pattern** for async notifications
- **Autonomous agents** (Orchestrator, DM Agent, Tsarag Agent, FAQ Agent) with tool use for Claude API
- **Three-tier memory system** (Core/Working/Archival) with semantic search via pgvector
- **Graceful degradation:** Redis cache and embedding server are optional, system works without them
## Layers
- Purpose: Handle user interactions via platform APIs (Telegram grammY, Discord.js)
- Location: `packages/bot-telegram/src/index.ts`, `packages/bot-telegram-public/src/index.ts`, `packages/bot-discord/src/index.ts`
- Contains: Bot initialization, event routing to handlers, error handlers
- Depends on: grammY, discord.js, Core (AI, DB, scheduler)
- Used by: End users via Telegram/Discord
- Purpose: Process incoming events from platforms and route to appropriate agents/commands
- Location: `packages/bot-telegram/src/handlers/`, `packages/bot-telegram-public/src/handlers/`, `packages/bot-discord/src/handlers/`
- Contains:
- Depends on: Core (AI, DB, agents)
- Used by: Bot layer event emitters
- Purpose: Execute explicit user commands (backup, manual operations)
- Location: `packages/bot-telegram/src/commands/`, `packages/bot-discord/src/commands/admin/`
- Contains: Task commands (/plan, /tasks, /next), Client commands (/clients, /newclient), Admin commands (/session, /session-update)
- Depends on: Core (DB, logger)
- Used by: Handlers that detect command syntax
- Purpose: Execute time-based autonomous jobs
- Location: `packages/bot-telegram/src/cron/`, `packages/bot-discord/src/cron/`
- Contains:
- Depends on: Core (scheduler module, AI, DB)
- Used by: Core scheduler (node-cron)
- Purpose: Decision-making and response generation for all user interactions
- Location: `packages/core/src/ai/`
- Contains:
- Depends on: Core (DB, logger, cache), Claude API, Supabase, Embedding Server (optional)
- Used by: Handlers, Cron jobs, Commands
- Purpose: Persistent storage abstraction over Supabase
- Location: `packages/core/src/db/`
- Contains:
- Depends on: Supabase client
- Used by: All agents, handlers, cron jobs
- Purpose: Optional in-memory caching for memory contexts (Redis)
- Location: `packages/core/src/cache/redis.ts`
- Contains: Singleton Redis client, TTL-based get/set for memory tiers
- Graceful degradation: If Redis unavailable, queries go directly to Supabase
- Used by: Context Builder
- Purpose: Centralized TypeScript interfaces and enums
- Location: `packages/core/src/types/index.ts`
- Contains: Task, DailyPlanTask, Client, MemoryEntry, Student, Session, Exercise, Event, Reminder types
- Used by: All layers
- Purpose: Cron job registration and execution
- Location: `packages/core/src/scheduler/index.ts`
- Contains: Job registry, error-wrapped execution
- Used by: Bot cron entry points
- **Supabase (PostgreSQL)**: Master state store for all entities
- **Claude API**: All AI decisions and agent logic (async agent tools)
- **Embedding Server**: MiniLM-L6-v2 embeddings via HTTP (optional, FastAPI)
- **OpenAI Whisper**: Audio transcription for voice messages
- **Redis**: Optional cache for performance
- **Google APIs**: Meet link generation for sessions
## Data Flow
- **Conversation state**: In-memory maps per chat/channel (TTL 30-60 min), cleared after agent completion
- **Memory cache**: Redis with 2-5 min TTL for tier contexts, invalidated on upsert/delete
- **Reminder state**: Persistent in Supabase (active → sent → expired)
- **Event queue**: Persistent in Supabase (unprocessed → processed)
- **Formation knowledge embeddings**: Stored in pgvector columns, fetched on seed/search
## Key Abstractions
- Purpose: Single entry point for admin message interpretation
- Location: `packages/core/src/ai/orchestrator.ts`
- Pattern: Claude analyzes text + context → returns structured JSON with actions + response
- Used by: Telegram admin handlers
- Purpose: Multi-turn Claude interactions for complex workflows
- Examples: DM Agent, Tsarag Agent, FAQ Agent, Exercise Reviewer
- Pattern: Register tools → Claude calls tools in loop (max N iterations) → extract final text
- Tool categories: READ (queries DB/API) and ACTION (modify state with confirmation)
- Purpose: Assemble dynamic prompt context without manual parameter passing
- Location: `packages/core/src/ai/context-builder.ts`
- Pattern: `buildContext(options)` loads tiers, live data, formats into text block → inject into system prompt
- Caching: Memory tiers cached separately (core 5 min, working 2 min)
- Purpose: Organize long-term knowledge with different retention/search policies
- Core (permanent, identity): Personality, skills, life structure
- Working (30-day expiry, situation/preference/relationship): Current activities, goals, people
- Archival (permanent, lessons): Past experiences, learnings (semantic search only)
- Consolidation: Daily 03:00 cron reviews expired working memories, archives or deletes
- Purpose: Async notifications without tight coupling
- Table: `events` (id, source, target, type, data, created_at, processed_at)
- Producers: DM Agent, Tsarag Agent, handlers
- Consumers: Cron jobs (event-dispatcher every 2 min), handlers
- Pattern: Create event → cron polls → format and send → mark processed
- Purpose: Semantic retrieval for course content and memory
- Query flow: getText() → getEmbedding(text) → HTTP to embedding server → pgvector similarity
- Fallback: If embedding server down, use zero vector (BM25 only, graceful degradation)
- RPC: `search_formation_knowledge()` combines vector + BM25 scores
## Entry Points
- Location: Entry point at main() function
- Triggers: Incoming Telegram updates (messages, voice, buttons)
- Responsibilities:
- Outputs: Messages to chat, notifications
- Location: Entry point at main() function
- Triggers: Incoming Telegram updates from non-admin users
- Responsibilities:
- Outputs: Messages to chat, lead notifications to admin
- Location: Entry point at main() function
- Triggers: Discord gateway events (ready, messages, interactions)
- Responsibilities:
- Outputs: Messages, DMs, channel announcements, button responses
- Location: Module export aggregator
- Exports: All public types, DB functions, AI functions, scheduler, agents, logger
- Used by: All bots import this as `import { ... } from '@assistme/core'`
## Error Handling
```
```
```
```
```
```
```
```
```
```
## Cross-Cutting Concerns
- Framework: Pino (structured JSON logging)
- Configuration: `packages/core/src/logger.ts`
- Pretty-print in dev, JSON in production
- Levels: debug (disabled by default), info, warn, error
- Pattern: `logger.info({ context }, 'Message')` for all meaningful actions
- Tool: Zod for runtime validation of external data (Supabase responses, Claude outputs)
- Location: `packages/core/src/types/` and AI modules
- Pattern: Parse and validate before use, throw explicit errors if invalid
- Telegram: Admin check via `isAdmin(ctx)` helper in `packages/bot-telegram/src/utils/auth.ts`
- Discord: Role check via `isAdmin(interaction)` or role verification in handlers
- No JWT/OAuth (trust incoming message routing from platform APIs)
- Conversation state: Per-channel/chat locks prevent concurrent agent executions
- Location: Lock maps in handler modules
- Pattern: Acquire lock → run agent → release lock → process other messages sequentially
- **Memory contexts cached**: Core (5 min), Working (2 min) to reduce DB queries
- **Embedding server optional**: Zero vector fallback if unavailable
- **Batch operations**: Formation knowledge seeded in chunks, reminders created in batch
- **Cron schedule staggering**: 03:00 consolidation before 07:00 plan before 07:02 dispatch
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
