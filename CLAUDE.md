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
- `specs/` — Detailed specifications for each component (SOURCE OF TRUTH)
- `specs/INDEX.md` — Index of all specs and supplementary documents
- `specs/CONNEXIONS.md` — Data flow between components
- `specs/ROADMAP.md` — Development roadmap
- `recherche/` — Formation content (session plans, exercises, guides) — synced to DB via seed script
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
| `specs/01-cerveau-central/` | `packages/core/` |
| `specs/02-bot-telegram/` | `packages/bot-telegram/` |
| `specs/03-bot-telegram-public/` | `packages/bot-telegram-public/` |
| `specs/04-bot-discord/` | `packages/bot-discord/` |
| `specs/06-formation/` | Organisation formation Session 2 (curriculum, exercices, outils) |

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
