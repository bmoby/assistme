# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 1-Foundation
**Areas discussed:** Package Scope, Test File Location, Config Structure

---

## Package Scope

| Option | Description | Selected |
|--------|-------------|----------|
| bot-discord + core | Juste ce dont on a besoin pour la Phase 2 (handlers + agents + DB). Les bots Telegram plus tard. | yes |
| Tous les 4 packages | Configurer Vitest pour core + bot-discord + bot-telegram + bot-telegram-public d'un coup | |
| You decide | Claude choisit l'approche la plus pragmatique | |

**User's choice:** bot-discord + core
**Notes:** Scope minimal -- seuls les packages necessaires pour les tests de la Phase 2

---

## Test File Location

| Option | Description | Selected |
|--------|-------------|----------|
| Co-located (Recommended) | A cote du code: src/handlers/dm-handler.test.ts. Facile a trouver, convention Vitest standard. | yes |
| __tests__/ separe | Dossier dedie: packages/bot-discord/__tests__/handlers/dm-handler.test.ts. Code source propre, tests groupes. | |
| You decide | Claude choisit selon les conventions du projet | |

**User's choice:** Co-located
**Notes:** None

### Naming Convention

| Option | Description | Selected |
|--------|-------------|----------|
| .test.ts | dm-handler.test.ts -- convention la plus courante avec Vitest | yes |
| .spec.ts | dm-handler.spec.ts -- plus courant dans l'ecosysteme Angular/BDD | |
| You decide | Claude choisit | |

**User's choice:** .test.ts
**Notes:** None

---

## Config Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Root + projects (Recommended) | Un seul vitest.config.ts racine avec projects: centralise | yes |
| Config par package | Chaque package a son vitest.config.ts. Plus de flexibilite mais plus de fichiers a maintenir. | |
| You decide | Claude choisit le plus pragmatique | |

**User's choice:** Root + projects
**Notes:** None

---

## Claude's Discretion

- Test scripts naming and structure
- Fake env var strategy
- `resolve.alias` configuration details
- `vite-tsconfig-paths` usage

## Deferred Ideas

None
