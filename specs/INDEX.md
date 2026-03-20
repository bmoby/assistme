# Specs — Index

> Source de verite du projet. Voir [CLAUDE.md](/CLAUDE.md) pour la methodologie spec-first.

## Composants principaux

| # | Composant | Spec | Package |
|---|-----------|------|---------|
| 00 | Infrastructure | [SPEC.md](00-infrastructure/SPEC.md) | `supabase/` + schemas |
| 01 | Cerveau Central | [SPEC.md](01-cerveau-central/SPEC.md) | `packages/core/` |
| 02 | Bot Telegram Admin | [SPEC.md](02-bot-telegram/SPEC.md) | `packages/bot-telegram/` |
| 03 | Bot Telegram Public | [SPEC.md](03-bot-telegram-public/SPEC.md) | `packages/bot-telegram-public/` |
| 04 | Bot Discord | [SPEC.md](04-bot-discord/SPEC.md) | `packages/bot-discord/` |
| 05 | Systeme Contenu | [SPEC.md](05-systeme-contenu/SPEC.md) | integre dans core + bots |
| 06 | Formation | [SPEC.md](06-formation/SPEC.md) | Organisation formation Session 2 |

## Documents supplementaires

### 01 — Cerveau Central

| Document | Description |
|----------|-------------|
| [AGENTS_SYSTEM.md](01-cerveau-central/AGENTS_SYSTEM.md) | Architecture des agents IA (orchestrateur, memory manager, research, etc.) |
| [MEMORY_SYSTEM.md](01-cerveau-central/MEMORY_SYSTEM.md) | Systeme memoire 3 tiers (core, working, archival) |

### 04 — Bot Discord

| Document | Description |
|----------|-------------|
| [SPEC-DM-AGENT.md](04-bot-discord/SPEC-DM-AGENT.md) | Specification du DM Agent conversationnel (tool_use, soumissions) |

### 06 — Formation

| Document | Description |
|----------|-------------|
| [recherches/](06-formation/recherches/) | 6 rapports de recherche (psychologie, pedagogie, structure, analogies, IA, quick-win) |

> **Note** : deux fichiers commencent par `recherche-D` (`recherche-D-analogie-restaurant-architecture-logicielle.md` et `recherche-D-paysage-outils-IA-coding.md`). C'est un nommage historique, non renomme pour ne pas casser les cles du seed script.

## Documents transversaux

| Document | Description |
|----------|-------------|
| [ROADMAP.md](ROADMAP.md) | Plan de developpement phase par phase |
| [CONNEXIONS.md](CONNEXIONS.md) | Flux de donnees entre composants |

## Contenu formation (hors specs)

Le contenu pedagogique (plans de session, exercices, guides) est dans `recherche/` et synchronise vers la DB via `pnpm seed:knowledge`. Voir [specs/06-formation/SPEC.md](06-formation/SPEC.md) pour les cross-references.
