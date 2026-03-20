# Specs — Index

> Source de verite du projet. Voir [CLAUDE.md](/CLAUDE.md) pour la methodologie spec-first.
>
> **Regle** : `specs/` = 1 dossier = 1 composant logiciel deployable.
> Le contenu pedagogique va dans `recherche/`. La documentation historique dans `docs/`.

## Composants principaux

| # | Composant | Spec | Package |
|---|-----------|------|---------|
| 00 | Infrastructure | [SPEC.md](00-infrastructure/SPEC.md) | `supabase/` + schemas |
| 01 | Cerveau Central | [SPEC.md](01-cerveau-central/SPEC.md) | `packages/core/` |
| 02 | Bot Telegram Admin | [SPEC.md](02-bot-telegram/SPEC.md) | `packages/bot-telegram/` |
| 03 | Bot Telegram Public | [SPEC.md](03-bot-telegram-public/SPEC.md) | `packages/bot-telegram-public/` |
| 04 | Bot Discord | [SPEC.md](04-bot-discord/SPEC.md) | `packages/bot-discord/` |
| 05 | Systeme Contenu | [SPEC.md](05-systeme-contenu/SPEC.md) | integre dans core + bots (Phase 4) |

## Documents supplementaires

### 01 — Cerveau Central

| Document | Description |
|----------|-------------|
| [AGENTS_SYSTEM.md](01-cerveau-central/AGENTS_SYSTEM.md) | Architecture des agents IA (orchestrateur, memory manager, research, etc.) |
| [MEMORY_SYSTEM.md](01-cerveau-central/MEMORY_SYSTEM.md) | Systeme memoire 3 tiers (core, working, archival) |

### 04 — Bot Discord

| Document | Description |
|----------|-------------|
| [SPEC-DM-AGENT.md](04-bot-discord/SPEC-DM-AGENT.md) | Agent DM conversationnel (etudiants, soumissions, tool_use) |
| [SPEC-TSARAG-AGENT.md](04-bot-discord/SPEC-TSARAG-AGENT.md) | Agent admin Tsarag (gestion formation, pattern propose/confirm/execute) |

## Documents transversaux

| Document | Description |
|----------|-------------|
| [ROADMAP.md](ROADMAP.md) | Plan de developpement phase par phase |
| [CONNEXIONS.md](CONNEXIONS.md) | Flux de donnees entre composants |

## Contenu pedagogique (hors specs)

Le contenu pedagogique vit dans `recherche/` et est synchronise vers la DB via `pnpm seed:knowledge`.

| Document | Description |
|----------|-------------|
| [recherche/CURRICULUM.md](/recherche/CURRICULUM.md) | Structure du programme (6 modules, 24 sessions, principes pedagogiques) |
| [recherche/GUIDE-FORMATEUR.md](/recherche/GUIDE-FORMATEUR.md) | Guide operationnel du formateur |
| [recherche/recherches/](/recherche/recherches/) | 6 rapports de recherche (psychologie, pedagogie, structure, analogies, IA, quick-win) |
| [recherche/module-1/](/recherche/module-1/) | Plans de session detailles, exercices, visuels |

> **Note** : deux fichiers commencent par `recherche-D` (`recherche-D-analogie-restaurant-architecture-logicielle.md` et `recherche-D-paysage-outils-IA-coding.md`). Nommage historique, conserve pour ne pas casser les cles du seed script.
