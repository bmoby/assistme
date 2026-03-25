# Dev Environment & Automated Tests - Bot Discord

## What This Is

Infrastructure de tests automatises et environnement de developpement pour le bot Discord formateur (`packages/bot-discord`). Actuellement zero tests, zero feedback local -- tout est teste en production. Ce projet met en place 3 couches de tests (unit, integration, E2E) et l'infra necessaire pour dev en confiance.

## Core Value

Pouvoir modifier le bot Discord et savoir immediatement si ca marche ou si ca casse quelque chose -- sans deployer en prod.

## Requirements

### Validated

- Monorepo pnpm workspaces fonctionnel -- existing
- Bot Discord en production avec discord.js 14.16 -- existing
- Core package (DB Supabase, AI Claude, agents) -- existing
- Handlers: DM agent, admin handler, FAQ, exercise review, slash commands -- existing

### Active

- [x] Environnement de dev Discord (serveur de test + bot de dev separe) — Validated in Phase 4: E2E Discord Dev
- [x] Framework de test (Vitest) configure pour le monorepo ESM — Validated in Phase 1: Foundation
- [x] Tests unitaires: handlers, agents, commandes, utils en isolation — Validated in Phase 2: Mocks + Unit Tests
- [x] Tests d'integration: Supabase local (Docker) + mock Claude API — Validated in Phase 3: Integration + CI
- [x] Tests E2E: vrai bot de dev sur serveur Discord de test, scenarios complets — Validated in Phase 4: E2E Discord Dev
- [x] CI GitHub Actions: tests auto sur push/PR — Validated in Phase 3: Integration + CI
- [x] Mocks/fixtures reutilisables pour Discord.js, Supabase, Claude API — Validated in Phase 2: Mocks + Unit Tests

### Out of Scope

- Tests pour les bots Telegram (admin + public) -- scope limite au bot Discord
- Tests de performance/load -- pas la priorite
- UI tests / visual regression -- backend only
- Migration de framework de test existant -- aucun test n'existe

## Context

- **Codebase existante:** ~15K+ lignes de code TypeScript strict, ESM modules
- **Phase 4 complete:** E2E tests with real Discord dev bot (14 tests: DM student flow, exercise submission, FAQ), two-bot architecture, `pnpm test:e2e`, CI workflow_dispatch job
- **Phase 3 complete:** Integration tests against real Supabase Docker (students CRUD, pgvector search, agent+DB), GitHub Actions CI pipeline (unit on push, integration on PR), MSW v2, coverage thresholds
- **Douleur principale:** Pas de feedback local -- obliger de deployer en prod pour tester (Phase 2+ addressera)
- **Bot Discord:** discord.js 14.16, handlers (DM, admin, FAQ, review), slash commands, crons
- **Core partage:** Supabase (PostgreSQL + pgvector), Claude API (agents avec tool use), Redis (optionnel)
- **Agents IA:** Orchestrator, DM Agent, Tsarag Agent, FAQ Agent -- logique complexe avec tool calling

## Constraints

- **Stack:** TypeScript strict, ESM, pnpm workspaces -- pas de CJS
- **Runtime:** Node.js 20+
- **Test framework:** Vitest (recommande par codebase map pour ESM + monorepo)
- **DB locale:** Supabase local via Docker (pas de mock DB pour les tests d'integration)
- **Bot de dev:** Token Discord separe de la prod, serveur de test dedie
- **CI:** GitHub Actions, doit tourner sans secrets Discord pour unit/integration

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vitest over Jest | Meilleur support ESM natif, plus rapide, meme API | Validated Phase 1 |
| Bot Discord de dev separe | Zero risque sur la prod, token dedie | Validated Phase 4 |
| Supabase local Docker | Tests d'integration avec vraie DB, pas de mocks DB | Validated Phase 3 |
| 3 couches de tests | Unit (rapide) + Integration (DB reelle) + E2E (vrai Discord) | Validated Phase 4 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check -- still the right priority?
3. Audit Out of Scope -- reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-25 after Phase 3: Integration + CI completion*
