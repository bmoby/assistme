# Plan de Migration vers OpenClaw

> **Date :** 2026-03-18
> **Auteur :** Claude (analyse automatisee)
> **Objectif :** Migrer l'ensemble du systeme AssistMe vers OpenClaw tout en conservant 100% des fonctionnalites existantes.

---

## Table des matieres

1. [Resume executif](#1-resume-executif)
2. [Cartographie actuelle vs OpenClaw](#2-cartographie-actuelle-vs-openclaw)
3. [Architecture cible](#3-architecture-cible)
4. [Phase 0 — Fondations OpenClaw](#4-phase-0--fondations-openclaw)
5. [Phase 1 — Data Layer (Supabase Skills)](#5-phase-1--data-layer-supabase-skills)
6. [Phase 2 — Agent Brain (Orchestrateur → Pi Agent)](#6-phase-2--agent-brain-orchestrateur--pi-agent)
7. [Phase 3 — Bot Telegram Admin](#7-phase-3--bot-telegram-admin)
8. [Phase 4 — Bot Telegram Public](#8-phase-4--bot-telegram-public)
9. [Phase 5 — Bot Discord Formation](#9-phase-5--bot-discord-formation)
10. [Phase 6 — Systeme de Memoire](#10-phase-6--systeme-de-memoire)
11. [Phase 7 — Agents Autonomes](#11-phase-7--agents-autonomes)
12. [Phase 8 — Cron & Notifications](#12-phase-8--cron--notifications)
13. [Phase 9 — Tests & Validation](#13-phase-9--tests--validation)
14. [Phase 10 — Deploiement & Cutover](#14-phase-10--deploiement--cutover)
15. [Risques & Mitigations](#15-risques--mitigations)
16. [Ce qu'on gagne avec OpenClaw](#16-ce-quon-gagne-avec-openclaw)
17. [Ce qu'on perd / Points d'attention](#17-ce-quon-perd--points-dattention)
18. [Estimation effort](#18-estimation-effort)
19. [Checklist pre-migration](#19-checklist-pre-migration)

---

## 1. Resume executif

### Pourquoi migrer ?

Le systeme actuel est un monorepo custom (~15K lignes TS) avec 3 bots independants, un orchestrateur maison, et une logique de routing/memory/agents ecrite a la main. **OpenClaw** offre :

- **Gateway unifie** : un seul processus pour tous les canaux (Telegram, Discord, WhatsApp, etc.)
- **Agent Pi integre** : runtime d'agent IA complet avec tool_use natif, streaming, context pruning
- **Plugin system** : 100+ extensions (channels, providers, memory, tools)
- **Multi-provider** : switch entre Claude, GPT, Gemini, Ollama sans changer le code
- **Cron natif** : jobs planifies avec wakeup
- **Memory vectorielle** : LanceDB/SQLite-vec avec semantic search
- **Apps natives** : macOS, iOS, Android

### Strategie de migration

**Approche : Migration incrementale avec cohabitation temporaire.**

On ne fait PAS de big bang. On construit le nouveau systeme en parallele, on migre fonctionnalite par fonctionnalite, et on bascule quand tout est valide.

**Donnees Supabase : ON LES GARDE.** OpenClaw utilise du stockage fichier (JSONL) pour les sessions, mais nos donnees metier (tasks, clients, students, memory, etc.) restent dans Supabase. On les expose via des **skills custom OpenClaw**.

---

## 2. Cartographie actuelle vs OpenClaw

### Mapping composant par composant

| Composant actuel | Fichier(s) | Equivalent OpenClaw | Strategie |
|---|---|---|---|
| **Orchestrateur** | `core/src/ai/orchestrator.ts` | Pi Agent Runtime + AGENTS.md + tools | Remplace par agent Pi avec tools custom |
| **Context Builder** | `core/src/ai/context-builder.ts` | Bootstrap files (AGENTS.md, SOUL.md, USER.md) + tools dynamiques | Config dans fichiers bootstrap |
| **Memory Manager** | `core/src/ai/memory-manager.ts` | Skill custom `supabase-memory` | Tool pour l'agent Pi |
| **Memory Agent** | `core/src/ai/memory-agent.ts` | Hook post-agent + skill | Fire-and-forget via hooks OpenClaw |
| **Research Agent** | `core/src/ai/research-agent.ts` | Skill custom `research` | Tool Pi invocable |
| **Client Discovery** | `core/src/ai/client-discovery-agent.ts` | Skill custom `client-discovery` | Tool Pi invocable |
| **Notification Planner** | `core/src/ai/notification-planner.ts` | Cron job OpenClaw + skill | Cron natif |
| **Memory Consolidator** | `core/src/ai/memory-consolidator.ts` | Cron job OpenClaw + skill | Cron natif |
| **Transcription** | `core/src/ai/transcribe.ts` | OpenClaw Media (transcription native) | Support natif |
| **Planner** | `core/src/ai/planner.ts` | Skill custom `daily-planner` | Tool Pi invocable |
| **Embeddings** | `core/src/ai/embeddings.ts` | OpenClaw Memory (LanceDB/vector) | Integre nativement |
| **Bot Telegram Admin** | `bot-telegram/src/` | Channel Telegram OpenClaw (agent admin) | Config channel + skills |
| **Bot Telegram Public** | `bot-telegram-public/src/` | Second agent OpenClaw + Channel Telegram | Agent separe avec restrictions |
| **Bot Discord** | `bot-discord/src/` | Channel Discord OpenClaw + skills formation | Config channel + skills |
| **Supabase DB** | `core/src/db/` | Skills custom (Supabase client) | **GARDE** — expose via tools |
| **Redis Cache** | `core/src/cache/redis.ts` | Pas necessaire (OpenClaw a son propre cache) | Supprime |
| **Agent Jobs** | `core/src/agents/` | Skills OpenClaw + exec tool | Skills + cron |
| **Cron Scheduler** | `core/src/scheduler/` | OpenClaw Cron natif | Migration directe |
| **Event System** | `core/src/db/formation/events.ts` | Gateway routing + hooks | Simplifie |
| **Conversation History** | `bot-*/utils/conversation.ts` | Sessions JSONL (natif) | Automatique |
| **Auth (isAdmin)** | `bot-*/utils/auth.ts` | DM Policy + allowFrom + roles | Config OpenClaw |

### Mapping database

| Table Supabase | Conservation | Acces via OpenClaw |
|---|---|---|
| `tasks` | ✅ Garde | Skill `supabase-tasks` |
| `daily_plans` | ✅ Garde | Skill `supabase-planner` |
| `memory` | ✅ Garde + sync OpenClaw Memory | Skill `supabase-memory` + bridge |
| `public_knowledge` | ✅ Garde | Skill `supabase-knowledge` |
| `clients` | ✅ Garde | Skill `supabase-clients` |
| `reminders` | ✅ Garde | Skill `supabase-reminders` + Cron |
| `students` | ✅ Garde | Skill `supabase-formation` |
| `student_exercises` | ✅ Garde | Skill `supabase-formation` |
| `sessions` (formation) | ✅ Garde | Skill `supabase-formation` |
| `submission_attachments` | ✅ Garde | Skill `supabase-formation` |
| `faq_entries` | ✅ Garde | Skill `supabase-formation` |
| `events` | ⚠️ Simplifie | Remplace par Gateway routing |
| `agent_jobs` | ⚠️ Simplifie | Remplace par OpenClaw exec + cron |
| `team_members` | ✅ Garde | Skill `supabase-team` |

---

## 3. Architecture cible

```
┌─────────────────────────────────────────────────────────┐
│                    OpenClaw Gateway                       │
│                  (port 18789, WSS)                        │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │  Channel     │  │  Channel     │  │  Channel     │     │
│  │  Telegram    │  │  Telegram    │  │  Discord     │     │
│  │  (Admin)     │  │  (Public)    │  │  (Formation) │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                  │                  │            │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐   │
│  │  Agent Pi    │  │  Agent Pi    │  │  Agent Pi     │   │
│  │  "copilote"  │  │  "public"    │  │  "formateur"  │   │
│  │  (FR, admin) │  │  (RU, read)  │  │  (RU, students)│  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                  │                  │            │
│  ┌──────▼──────────────────▼──────────────────▼───────┐  │
│  │              Skills & Tools Layer                    │  │
│  │                                                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │  │
│  │  │ supabase-*   │  │ formation-*  │  │ artisan   │ │  │
│  │  │ (tasks,mem,  │  │ (students,   │  │ chercheur │ │  │
│  │  │  clients,kb) │  │  exercises,  │  │ research  │ │  │
│  │  │              │  │  faq,sessions)│  │           │ │  │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │  │
│  └─────────┼─────────────────┼─────────────────┼───────┘  │
│            │                 │                  │          │
└────────────┼─────────────────┼──────────────────┼──────────┘
             │                 │                  │
     ┌───────▼─────────────────▼──────────────────▼───────┐
     │                    Supabase                         │
     │  PostgreSQL + pgvector + Storage + RPC              │
     │  (TOUTES les tables conservees)                     │
     └─────────────────────────────────────────────────────┘
```

### 3 Agents Pi distincts

| Agent | ID | Langue | Acces | Channel |
|---|---|---|---|---|
| `copilote` | `agent:copilote` | Francais | Full (admin) | Telegram Admin |
| `public` | `agent:public` | Russe | Read-only KB | Telegram Public |
| `formateur` | `agent:formateur` | Russe | Formation only | Discord |

Chaque agent a son propre `AGENTS.md`, `SOUL.md`, ses tools autorises, et ses sessions independantes.

---

## 4. Phase 0 — Fondations OpenClaw

### 4.1. Installation et setup

```bash
# Installer OpenClaw globalement
npm install -g openclaw@latest

# Initialiser
openclaw onboard

# Structure cible
~/.openclaw/
├── openclaw.json          # Config principale
├── agents/
│   ├── copilote/          # Agent admin
│   │   ├── AGENTS.md
│   │   ├── SOUL.md
│   │   ├── USER.md
│   │   ├── TOOLS.md
│   │   └── sessions/
│   ├── public/            # Agent public
│   │   ├── AGENTS.md
│   │   ├── SOUL.md
│   │   └── sessions/
│   └── formateur/         # Agent formation
│       ├── AGENTS.md
│       ├── SOUL.md
│       └── sessions/
├── skills/                # Skills custom
│   ├── supabase-core/
│   ├── supabase-memory/
│   ├── supabase-formation/
│   ├── artisan/
│   ├── chercheur/
│   └── notification-planner/
└── credentials/
```

### 4.2. Configuration de base (`openclaw.json`)

```json5
{
  gateway: {
    port: 18789,
    bind: "0.0.0.0",
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" }
  },

  agents: {
    defaults: {
      model: "anthropic/claude-sonnet-4-6",
      sandbox: { enabled: false },
      blockStreamingDefault: "off"
    },
    profiles: {
      copilote: {
        workspace: "~/.openclaw/agents/copilote",
        model: "anthropic/claude-sonnet-4-6",
        tools: [
          "supabase-tasks", "supabase-memory", "supabase-clients",
          "supabase-planner", "supabase-reminders", "supabase-knowledge",
          "research", "client-discovery", "artisan", "chercheur",
          "notification-planner"
        ]
      },
      public: {
        workspace: "~/.openclaw/agents/public",
        model: "anthropic/claude-haiku-4-5",
        tools: ["supabase-knowledge-readonly", "lead-detector"]
      },
      formateur: {
        workspace: "~/.openclaw/agents/formateur",
        model: "anthropic/claude-sonnet-4-6",
        tools: [
          "supabase-formation", "exercise-reviewer",
          "faq-agent", "supabase-knowledge-readonly"
        ]
      }
    }
  },

  channels: {
    telegram: {
      // Agent Admin — bot principal
      botToken: "${TELEGRAM_BOT_TOKEN}",
      dmPolicy: "allowlist",
      allowFrom: ["${ADMIN_TELEGRAM_CHAT_ID}"],
      agent: "copilote",
      streaming: "edit",
      voiceTranscription: true
    },
    // Second bot Telegram = extension custom ou second instance
    // Voir section 8 pour les details
    discord: {
      token: "${DISCORD_BOT_TOKEN}",
      agent: "formateur",
      guilds: {
        "${DISCORD_GUILD_ID}": {
          allowFrom: ["*"],
          dmPolicy: "open",
          mentionGating: true
        }
      }
    }
  },

  models: {
    providers: {
      anthropic: {
        apiKey: "${ANTHROPIC_API_KEY}",
        models: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5"]
      },
      openai: {
        apiKey: "${OPENAI_API_KEY}"
        // Pour Whisper transcription si pas natif
      }
    }
  },

  tools: {
    exec: { sandbox: false },
    browser: { enabled: false },
    canvas: { enabled: false },
    cron: { timezone: "Asia/Bangkok" }
  }
}
```

### 4.3. Variables d'environnement

```env
# OpenClaw
OPENCLAW_GATEWAY_TOKEN=<generate-secure-token>

# LLM Providers
ANTHROPIC_API_KEY=<existing>
OPENAI_API_KEY=<existing>

# Supabase (inchange)
SUPABASE_URL=<existing>
SUPABASE_ANON_KEY=<existing>
SUPABASE_SERVICE_ROLE_KEY=<existing>

# Channels
TELEGRAM_BOT_TOKEN=<existing>
PUBLIC_BOT_TOKEN=<new-or-existing>
DISCORD_BOT_TOKEN=<existing>
DISCORD_GUILD_ID=<existing>
DISCORD_CLIENT_ID=<existing>

# Admin identifiers
ADMIN_TELEGRAM_CHAT_ID=<existing>
DISCORD_ADMIN_USER_ID=<existing>
```

### 4.4. Taches

- [ ] Installer OpenClaw (node >= 22.16.0)
- [ ] Creer la structure de repertoires
- [ ] Ecrire `openclaw.json` de base
- [ ] Configurer `.env`
- [ ] Valider que le gateway demarre (`openclaw gateway`)
- [ ] Tester la connexion WebSocket

---

## 5. Phase 1 — Data Layer (Supabase Skills)

**Objectif :** Exposer TOUTES les tables Supabase comme des tools invocables par l'agent Pi.

### 5.1. Skill `supabase-core`

Skill de base qui fournit le client Supabase partage.

```
~/.openclaw/skills/supabase-core/
├── package.json
├── index.ts          # Plugin entry, exports Supabase client
└── client.ts         # getSupabase() singleton
```

**`client.ts`** — Reprend exactement `packages/core/src/db/client.ts` :
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let instance: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!instance) {
    instance = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return instance
}
```

### 5.2. Skill `supabase-tasks`

Expose les operations sur les taches comme tools Pi.

```
~/.openclaw/skills/supabase-tasks/
├── package.json
├── index.ts          # Register tools
└── tools/
    ├── create-task.ts
    ├── complete-task.ts
    ├── get-active-tasks.ts
    ├── get-tasks-by-category.ts
    ├── update-task.ts
    └── delete-task.ts
```

**Tools a creer (exactement les memes signatures que `core/src/db/tasks.ts`) :**

| Tool name | Description | Params |
|---|---|---|
| `tasks.create` | Cree une tache | `{ title, description?, category, priority, due_date?, due_time?, estimated_minutes? }` |
| `tasks.complete` | Marque une tache complete | `{ id }` |
| `tasks.list_active` | Liste les taches actives | `{ category?, priority?, limit? }` |
| `tasks.update` | Met a jour une tache | `{ id, ...fields }` |
| `tasks.delete` | Supprime une tache | `{ id }` |
| `tasks.next_priority` | Prochaine tache prioritaire | `{}` |

### 5.3. Skill `supabase-clients`

| Tool name | Description | Params |
|---|---|---|
| `clients.create` | Cree un lead | `{ name, phone?, source?, business_type?, need?, budget_range? }` |
| `clients.pipeline` | Affiche le pipeline | `{ status? }` |
| `clients.update_status` | Change le statut | `{ id, status }` |
| `clients.update` | Met a jour un client | `{ id, ...fields }` |

### 5.4. Skill `supabase-memory`

**Le plus critique.** Gere les deux tables `memory` et `public_knowledge`.

| Tool name | Description | Params |
|---|---|---|
| `memory.get_all` | Charge toute la memoire | `{ tier? }` |
| `memory.get_by_category` | Par categorie | `{ category }` |
| `memory.upsert` | Cree/modifie une entree | `{ category, key, content, tier?, confidence? }` |
| `memory.delete` | Supprime une entree | `{ category, key }` |
| `memory.search_semantic` | Recherche semantique | `{ query, limit? }` |
| `knowledge.get_all` | Tout le public_knowledge | `{}` |
| `knowledge.get_by_category` | Par categorie | `{ category }` |
| `knowledge.upsert` | Cree/modifie une entree | `{ category, key, content }` |
| `knowledge.delete` | Supprime | `{ category, key }` |

### 5.5. Skill `supabase-planner`

| Tool name | Description | Params |
|---|---|---|
| `planner.get_today` | Plan du jour | `{}` |
| `planner.create` | Genere un plan | `{ date }` |
| `planner.update_status` | Met a jour le statut | `{ id, status }` |
| `planner.get_productivity_trend` | Tendance productivite | `{ days? }` |

### 5.6. Skill `supabase-reminders`

| Tool name | Description | Params |
|---|---|---|
| `reminders.create` | Cree un rappel | `{ message, trigger_at, repeat?, channel? }` |
| `reminders.create_batch` | Cree N rappels | `{ reminders: [...] }` |
| `reminders.get_today` | Rappels du jour | `{}` |
| `reminders.cancel` | Annule un rappel | `{ id }` |
| `reminders.get_due` | Rappels en retard | `{}` |
| `reminders.mark_sent` | Marque comme envoye | `{ id }` |

### 5.7. Skill `supabase-formation`

Regroupe tout le systeme formation.

| Tool name | Description | Params |
|---|---|---|
| `formation.add_student` | Ajoute un etudiant | `{ name, discord_id?, phone?, email?, session? }` |
| `formation.list_students` | Liste les etudiants | `{ status?, session? }` |
| `formation.get_student` | Un etudiant | `{ id or discord_id }` |
| `formation.update_student` | Met a jour | `{ id, ...fields }` |
| `formation.submit_exercise` | Soumet un exercice | `{ student_id, module, exercise_number, submission_url?, submission_type? }` |
| `formation.get_exercises` | Exercices d'un etudiant | `{ student_id }` |
| `formation.review_exercise` | Review manuelle | `{ exercise_id, status, feedback? }` |
| `formation.ai_review` | Pre-review IA | `{ exercise_id }` |
| `formation.create_session` | Cree une session | `{ session_number, title, module, ... }` |
| `formation.update_session` | Met a jour | `{ id, ...fields }` |
| `formation.list_sessions` | Liste les sessions | `{}` |
| `formation.add_faq` | Ajoute une FAQ | `{ question, answer, category? }` |
| `formation.search_faq` | Cherche dans la FAQ | `{ query }` |
| `formation.get_attachments` | Fichiers d'un exercice | `{ exercise_id }` |
| `formation.add_attachment` | Ajoute un fichier | `{ exercise_id, type, url?, storage_path?, ... }` |

### 5.8. Taches Phase 1

- [ ] Creer le skill `supabase-core` (client partage)
- [ ] Creer le skill `supabase-tasks` (6 tools)
- [ ] Creer le skill `supabase-clients` (4 tools)
- [ ] Creer le skill `supabase-memory` (9 tools)
- [ ] Creer le skill `supabase-planner` (4 tools)
- [ ] Creer le skill `supabase-reminders` (6 tools)
- [ ] Creer le skill `supabase-formation` (15 tools)
- [ ] Tester chaque tool individuellement via CLI
- [ ] Valider les types Zod pour chaque input

### Code source a porter

Reprendre directement le code de `packages/core/src/db/` :
- `tasks.ts` → `supabase-tasks/tools/*.ts`
- `clients.ts` → `supabase-clients/tools/*.ts`
- `memory.ts` → `supabase-memory/tools/*.ts`
- `public-knowledge.ts` → `supabase-memory/tools/*.ts`
- `daily-plans.ts` → `supabase-planner/tools/*.ts`
- `reminders.ts` → `supabase-reminders/tools/*.ts`
- `formation/*.ts` → `supabase-formation/tools/*.ts`

**La logique metier est identique.** On wrappe juste chaque fonction dans un tool OpenClaw.

---

## 6. Phase 2 — Agent Brain (Orchestrateur → Pi Agent)

### 6.1. Le changement fondamental

**Avant (custom) :**
```
Message → orchestrator.ts → Claude Sonnet → JSON { actions, response }
  → execute actions inline → delegate to sub-agents
```

**Apres (OpenClaw) :**
```
Message → Pi Agent → Claude Sonnet avec tools → tool_use natif
  → agent execute tools directement → response streamee
```

L'orchestrateur custom disparait. Le **Pi Agent** fait le meme travail nativement via `tool_use` de Claude. Les "actions inline" deviennent des **tools** que l'agent invoque directement.

### 6.2. Bootstrap : `AGENTS.md` (Agent Copilote)

Ce fichier remplace `orchestrator.ts` + `context-builder.ts`. Il definit le comportement de l'agent.

```markdown
# AGENTS.md — Agent Copilote (Admin)

## Identite
Tu es l'assistant personnel de Magomed. Tu parles en francais.
Tu geres ses taches, clients, memoire, planning, et recherches.

## Regles fondamentales
- ZERO friction : reponds vite, agis d'abord
- Push > Pull : notifie proactivement
- Motivation par la perte : "tu perds X si tu ne fais pas Y"
- 3 niveaux d'autonomie : Manuel / Semi-auto / Full auto
- EXCLU du scope : juridique, comptabilite, administratif

## Outils disponibles
Tu as acces aux outils suivants pour gerer les donnees :

### Taches
- `tasks.create` — Cree une tache (categorise et priorise intelligemment)
- `tasks.complete` — Marque une tache complete
- `tasks.list_active` — Liste les taches actives
- `tasks.update` — Met a jour une tache
- `tasks.delete` — Supprime une tache
- `tasks.next_priority` — Prochaine tache prioritaire

### Clients
- `clients.create` — Cree un lead
- `clients.pipeline` — Affiche le pipeline
- `clients.update_status` — Change le statut
- `clients.update` — Met a jour un client

### Memoire
- `memory.get_all` — Charge toute la memoire (pour comprendre le contexte)
- `memory.upsert` — Modifie une memoire (categorie/cle/contenu)
- `memory.delete` — Supprime une memoire
- `memory.search_semantic` — Recherche semantique dans les archives
- `knowledge.get_all` — Lit la base de connaissance publique
- `knowledge.upsert` — Modifie la base publique
- `knowledge.delete` — Supprime de la base publique

### Planning
- `planner.get_today` — Plan du jour
- `planner.create` — Genere un plan
- `planner.get_productivity_trend` — Tendance productivite

### Rappels
- `reminders.create` — Cree un rappel
- `reminders.get_today` — Rappels du jour

### Recherche
- `research.deep` — Lance une recherche approfondie sur un sujet

### Clients Discovery
- `client_discovery.generate_questions` — Genere des questions de qualification

### Agents autonomes
- `artisan.generate_pptx` — Genere une presentation PPTX
- `chercheur.research_and_present` — Recherche + presentation

## Comportement par defaut
1. A chaque message, commence par appeler `memory.get_all` pour charger le contexte
2. Analyse l'intention de l'utilisateur
3. Execute les actions necessaires via les outils
4. Reponds de maniere concise et actionnable
5. Si tu detectes un changement de situation, appelle `memory.upsert` pour le noter

## Format de reponse
- Concis, pas de blabla
- Confirme les actions executees
- Propose la prochaine etape si pertinent
- Utilise des emojis avec parcimonie
```

### 6.3. Bootstrap : `SOUL.md` (Personnalite)

```markdown
# SOUL.md — Personnalite

Tu es un assistant personnel direct, efficace, sans BS.
Tu parles comme un collegue senior, pas comme un assistant corporate.
Tu connais Magomed intimement via sa memoire.
Tu le challenges quand il procrastine.
Tu le motives par la perte ("tu perds 500€ si tu ne fais pas ce call").
Tu es proactif : tu anticipes, tu proposes, tu ne te contentes pas de repondre.
```

### 6.4. Bootstrap : `USER.md` (Profil utilisateur)

```markdown
# USER.md — Profil

- Dev senior 10+ ans, JS/TS expert, autodidacte
- Vit seul en Thailande (fuseau Asia/Bangkok)
- Createur contenu tchetchene (30K abonnes, objectif 100K)
- Formateur (session 2: 30 places, ~2 semaines)
- Agence de 6 personnes (commission 20%)
- Motivation : revenus + impact + liberte
```

### 6.5. Ce qui change dans le routing

**Avant :** L'orchestrateur parsait un JSON `{ actions: [...], response: "..." }` et executait les actions inline.

**Apres :** L'agent Pi utilise `tool_use` natif de Claude. Il appelle directement les tools sans parsing JSON intermediaire. C'est plus fiable, plus rapide, et c'est le standard.

| Action actuelle | Tool OpenClaw |
|---|---|
| `create_task` | `tasks.create` |
| `complete_task` | `tasks.complete` |
| `create_client` | `clients.create` |
| `note` | `memory.upsert` |
| `manage_memory` | `memory.*` / `knowledge.*` |
| `start_research` | `research.deep` |
| `start_client_discovery` | `client_discovery.generate_questions` |
| `invoke_agent` (artisan) | `artisan.generate_pptx` |
| `invoke_agent` (chercheur) | `chercheur.research_and_present` |

### 6.6. Taches Phase 2

- [ ] Ecrire `AGENTS.md` pour l'agent copilote
- [ ] Ecrire `SOUL.md`
- [ ] Ecrire `USER.md`
- [ ] Ecrire `TOOLS.md` (resume des tools disponibles)
- [ ] Tester l'agent en mode CLI (`openclaw agent`)
- [ ] Valider que l'agent utilise les tools correctement
- [ ] Comparer les reponses avec l'orchestrateur actuel
- [ ] Ajuster les prompts bootstrap si necessaire

---

## 7. Phase 3 — Bot Telegram Admin

### 7.1. Ce qui change

**Avant :** Bot grammY custom avec 11 commandes, handlers, conversation history manuelle, cron jobs.

**Apres :** Channel Telegram OpenClaw connecte a l'agent `copilote`. Les commandes deviennent des messages naturels routes vers l'agent.

### 7.2. Migration des commandes

| Commande actuelle | Migration OpenClaw |
|---|---|
| `/start` | Message de bienvenue dans `AGENTS.md` (first-message behavior) |
| `/plan` | Message naturel "plan du jour" → agent appelle `planner.get_today` |
| `/next` | Message "prochaine tache" → agent appelle `tasks.next_priority` |
| `/done` | Message "c'est fait" → agent appelle `tasks.complete` |
| `/add [text]` | Message naturel → agent appelle `tasks.create` |
| `/tasks` | Message "mes taches" → agent appelle `tasks.list_active` |
| `/skip` | Message "passe" → agent appelle `tasks.update` (skip logic) |
| `/clients` | Message "clients" → agent appelle `clients.pipeline` |
| `/kb` | Message "base de connaissance" → agent appelle `knowledge.get_all` |
| `/kb set [...]` | Message "modifie le prix a..." → agent appelle `knowledge.upsert` |
| `/notifs` | Message "notifications" → agent appelle `reminders.get_today` |
| `/notifs [N]` | Message "change a N notifs" → cron replanifie |
| `/replan` | Message "replanifie" → cron force replan |

**Important :** Les slash commands disparaissent. L'interaction devient 100% langage naturel. C'est un upgrade UX pour l'admin (zero friction++).

Si on veut garder des raccourcis, on peut configurer des **custom commands** dans la config Telegram OpenClaw qui mappent `/plan` → "Montre-moi le plan du jour".

### 7.3. Conversation history

**Avant :** `Map<chatId, messages[]>` en memoire, max 20, TTL 1h.

**Apres :** Sessions JSONL natives d'OpenClaw. Automatique, persistant, avec compaction. **Mieux que l'actuel.**

### 7.4. Voice messages

**Avant :** Handler custom → OpenAI Whisper → orchestrator.

**Apres :** OpenClaw a un support natif de transcription audio (`voiceTranscription: true` dans la config channel). Si Whisper n'est pas supporte nativement, on cree un skill custom `transcribe` qui appelle l'API OpenAI.

### 7.5. Message splitting

**Avant :** Custom split a 4096 chars.

**Apres :** Gere nativement par le channel Telegram d'OpenClaw (block chunking).

### 7.6. Authentification

**Avant :** `isAdmin(ctx)` compare `ctx.from.id` avec `ADMIN_TELEGRAM_CHAT_ID`.

**Apres :** `dmPolicy: "allowlist"` + `allowFrom: ["<ADMIN_CHAT_ID>"]` dans la config. Automatique, pas de code.

### 7.7. Taches Phase 3

- [ ] Configurer le channel Telegram dans `openclaw.json`
- [ ] Tester la connexion au bot Telegram existant
- [ ] Valider l'auth (allowlist)
- [ ] Tester les messages texte → agent copilote
- [ ] Tester les messages vocaux → transcription → agent
- [ ] Tester les messages longs (split automatique)
- [ ] Valider chaque ancienne commande en langage naturel
- [ ] Configurer des custom commands si besoin pour les raccourcis
- [ ] Comparer side-by-side avec le bot actuel

---

## 8. Phase 4 — Bot Telegram Public

### 8.1. Le defi : 2 bots Telegram

OpenClaw a un seul channel Telegram par defaut. Or on a **2 bots Telegram** avec des tokens differents et des comportements differents.

**Solutions possibles :**

#### Option A : Extension custom (recommande)

Creer une extension OpenClaw `telegram-public` qui instancie un second bot grammY avec le `PUBLIC_BOT_TOKEN`. Cette extension :
- Ecoute les messages du bot public
- Route vers l'agent `public`
- Applique les restrictions (read-only, russe, lead detection)

#### Option B : Second instance OpenClaw

Lancer un second processus OpenClaw dedie au bot public. Plus simple mais plus lourd.

#### Option C : Multi-bot dans un seul channel

Configurer le channel Telegram OpenClaw pour gerer 2 tokens. Necessite un fork/patch du channel Telegram.

**Recommandation : Option A** — extension custom. C'est l'approche la plus propre et la plus maintenable.

### 8.2. Agent `public` — Restrictions

```markdown
# AGENTS.md — Agent Public

## Identite
Tu es l'assistant public de Magomed. Tu reponds en RUSSE uniquement.
Tu as acces a la base de connaissance publique.

## Regles
- Tu ne reveles JAMAIS d'informations personnelles sur Magomed
- Tu reponds UNIQUEMENT sur la base de la connaissance publique
- Si on te demande quelque chose hors scope, reponds poliment que tu ne sais pas
- Tu NE peux PAS modifier la base de connaissance

## Detection de leads
Si un utilisateur montre un interet commercial (formation, services, creation de site),
note les informations suivantes et appelle `lead_detector.notify` :
- Nom (si mentionne)
- Besoin
- Budget (si mentionne)
- Type de business

## Outils
- `knowledge.get_all` — Lire la base publique (READ ONLY)
- `knowledge.get_by_category` — Par categorie
- `lead_detector.notify` — Notifier l'admin d'un lead potentiel
```

### 8.3. Skill `lead-detector`

Remplace la logique de detection de leads du bot public actuel.

```typescript
// Tool: lead_detector.notify
// Envoie une notification a l'admin via Telegram API
{
  name: "lead_detector.notify",
  description: "Notifie l'admin d'un lead detecte",
  params: {
    name: z.string().optional(),
    need: z.string(),
    budget: z.string().optional(),
    business_type: z.string().optional(),
    source_message: z.string()
  },
  execute: async (params) => {
    // POST to Telegram Bot API
    await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: formatLeadNotification(params),
        parse_mode: 'HTML'
      })
    })
  }
}
```

### 8.4. Taches Phase 4

- [ ] Decider entre Option A/B/C (recommande : A)
- [ ] Creer l'extension `telegram-public` si Option A
- [ ] Ecrire `AGENTS.md` pour l'agent public (russe, read-only)
- [ ] Creer le skill `lead-detector`
- [ ] Configurer la voix en russe (transcription RU)
- [ ] Tester les reponses basees sur public_knowledge
- [ ] Tester la detection de leads
- [ ] Tester la notification admin
- [ ] Valider la conversation history (sessions separees)

---

## 9. Phase 5 — Bot Discord Formation

### 9.1. Ce qui change

**Avant :** Bot discord.js custom avec slash commands, handlers, DM agent, FAQ, cron jobs.

**Apres :** Channel Discord OpenClaw connecte a l'agent `formateur`, avec skills formation.

### 9.2. Migration des commandes admin Discord

| Commande actuelle | Migration OpenClaw |
|---|---|
| `/add-student` | Tool `formation.add_student` (invoque par agent via DM ou channel admin) |
| `/session` | Tool `formation.create_session` + action Discord (thread Forum) |
| `/session-update` | Tool `formation.update_session` |
| `/announce` | Tool `message.send` natif OpenClaw (vers channel #annonces) |
| `/review` | Tool `formation.get_exercises` (filtre par etudiant) |
| `/approve` | Tool `formation.review_exercise` (status: approved) |
| `/revision` | Tool `formation.review_exercise` (status: revision_needed) |
| `/students` | Tool `formation.list_students` |

### 9.3. DM Agent → Agent Pi formateur

**Avant :** `dm-agent.ts` avec 4 tools custom (get_student_progress, get_session_exercise, create_submission, get_pending_feedback).

**Apres :** L'agent Pi `formateur` a ces memes tools via le skill `supabase-formation`. Le comportement est defini dans `AGENTS.md`.

```markdown
# AGENTS.md — Agent Formateur

## Identite
Tu es l'assistant de formation de Magomed. Tu parles en RUSSE.
Tu aides les etudiants de la Session 2 avec leurs exercices et questions.

## Comportement en DM
Quand un etudiant t'envoie un message prive :
1. Identifie l'etudiant par son discord_id (`formation.get_student`)
2. Si c'est un envoi d'exercice, guide-le pour soumettre :
   - Demande le numero de session
   - Accepte les fichiers/liens
   - Appelle `formation.submit_exercise` + `formation.add_attachment`
3. S'il demande son avancement, appelle `formation.get_exercises`
4. S'il a des questions, cherche dans la FAQ (`formation.search_faq`)
5. Si la FAQ ne repond pas (confiance < 70%), dis-lui que tu transmets au mentor

## Comportement en channel
- Ne reponds que quand mentionne (@bot) ou dans #faq
- Dans #faq : reponds avec la FAQ, ajoute de nouvelles reponses automatiquement

## Regles
- JAMAIS d'acces aux donnees personnelles de Magomed
- Ton encourageant mais direct
- Guide sans faire a la place de l'etudiant
- Maximum : formation, exercices, FAQ
```

### 9.4. Guild member handler

**Avant :** Event handler custom `guildMemberAdd` → verification discord_id → assign role.

**Apres :** Deux options :
1. **Hook OpenClaw** : hook `on-member-join` qui verifie et assigne le role
2. **Skill custom** : un skill qui ecoute les events Discord et reagit

OpenClaw ne gere pas nativement les guild member events comme handlers customs. Il faudra probablement une **extension Discord custom** qui ajoute cette logique.

### 9.5. Actions Discord specifiques

Certaines actions necessitent des appels Discord directs (creer un thread Forum, assigner un role, poster dans un channel specifique). Solutions :

- **Tool `message.send`** : OpenClaw a un tool natif pour envoyer des messages sur les channels
- **Extension Discord** : pour les actions avancees (threads, roles, reactions)
- **Tool `exec`** : en dernier recours, un script qui fait les appels Discord API

### 9.6. Taches Phase 5

- [ ] Configurer le channel Discord dans `openclaw.json`
- [ ] Ecrire `AGENTS.md` pour l'agent formateur
- [ ] Porter la logique DM agent dans le prompt + tools
- [ ] Creer l'extension Discord pour les guild events (auto-role)
- [ ] Creer l'extension Discord pour les threads Forum
- [ ] Tester les DM avec un etudiant test
- [ ] Tester la FAQ automatique
- [ ] Tester la soumission d'exercice de bout en bout
- [ ] Tester les commandes admin (review, approve, etc.)
- [ ] Valider l'upload de fichiers vers Storage

---

## 10. Phase 6 — Systeme de Memoire

### 10.1. Double memoire : Supabase + OpenClaw

On garde les tables Supabase (`memory`, `public_knowledge`) comme source de verite metier. Mais on UTILISE AUSSI la memoire vectorielle native d'OpenClaw pour les sessions et le contexte conversationnel.

**Architecture memoire cible :**

```
┌─────────────────────────────────────┐
│         OpenClaw Memory              │
│  (LanceDB / sessions JSONL)         │
│  - Historique conversations          │
│  - Context window management         │
│  - Session compaction                │
│  - Cache prompt (Anthropic)          │
└──────────────┬──────────────────────┘
               │ (lecture/ecriture via tools)
┌──────────────▼──────────────────────┐
│         Supabase Memory              │
│  - memory (3 tiers, pgvector)        │
│  - public_knowledge                  │
│  - Embeddings (all-MiniLM-L6-v2)    │
│  - SOURCE DE VERITE METIER           │
└─────────────────────────────────────┘
```

### 10.2. Context loading (remplacement du Context Builder)

**Avant :** `context-builder.ts` charge 4 couches de contexte a chaque requete.

**Apres :** L'agent Pi charge le contexte via ses tools au debut de chaque conversation :

1. L'agent appelle `memory.get_all` (tier core + working) au premier message
2. Les infos sont dans le contexte de la session
3. Pour les recherches archivales, il appelle `memory.search_semantic`
4. Les live data (tasks, clients) sont chargees a la demande via tools

**Optimisation :** On peut pre-charger le contexte memoire dans les fichiers bootstrap. Un cron OpenClaw qui regenere `USER.md` toutes les heures avec les memories core :

```
Cron job "refresh-user-context" (every 1h):
  → Read memory.core + memory.working from Supabase
  → Write to ~/.openclaw/agents/copilote/USER.md
  → Agent Pi reloads automatiquement
```

### 10.3. Memory Agent (background auto-updates)

**Avant :** `memory-agent.ts` fire-and-forget apres chaque message.

**Apres :** Hook OpenClaw `post-agent` qui :
1. Analyse le dernier echange
2. Detecte les changements de situation
3. Appelle `memory.upsert` si necessaire

```json5
// Dans openclaw.json
hooks: {
  "post-agent": {
    script: "node ~/.openclaw/hooks/memory-updater.js",
    agents: ["copilote"]  // Seulement pour l'admin
  }
}
```

### 10.4. Memory Consolidation (cron 03:00)

**Avant :** `memory-consolidator.ts` en cron node-cron.

**Apres :** Cron OpenClaw :

```json5
cron: {
  jobs: {
    "memory-consolidation": {
      schedule: "0 3 * * *",
      agent: "copilote",
      prompt: "Execute la consolidation memoire : charge les memories working expirees, decide pour chacune si elle doit etre archivee, supprimee, ou renouvelee. Utilise memory.get_all avec tier=working, puis memory.upsert ou memory.delete selon ta decision."
    }
  }
}
```

### 10.5. Embeddings

**Avant :** Serveur Python FastAPI (all-MiniLM-L6-v2, 384 dim) pour les embeddings, auto-fire sur upsertMemory.

**Apres :** Deux options :

1. **Garder le serveur Python** — le skill `supabase-memory` appelle le serveur d'embeddings existant a chaque upsert
2. **Utiliser OpenClaw Memory** — migrer vers LanceDB avec les embeddings OpenClaw natifs (OpenAI, Gemini, ou Ollama)

**Recommandation :** Option 1 pour la migration initiale (aucun changement DB). Option 2 comme amelioration future.

### 10.6. Taches Phase 6

- [ ] Configurer la memoire OpenClaw (LanceDB ou memory-core)
- [ ] Creer le cron `refresh-user-context` (regenere USER.md)
- [ ] Creer le hook `post-agent` pour le memory agent background
- [ ] Creer le cron `memory-consolidation`
- [ ] Decider : garder embedding server ou migrer vers OpenClaw Memory
- [ ] Si migration embeddings : modifier le skill supabase-memory
- [ ] Tester la boucle complete : message → context → response → memory update
- [ ] Valider que les 3 tiers fonctionnent (core, working, archival)
- [ ] Tester la recherche semantique

---

## 11. Phase 7 — Agents Autonomes

### 11.1. Artisan Agent (PPTX Generator)

**Avant :** Agent custom dans `core/src/agents/artisan/` avec job queue (`agent_jobs` table), `pptxgenjs`, upload Storage.

**Apres :** Skill OpenClaw `artisan` :

```
~/.openclaw/skills/artisan/
├── package.json          # deps: pptxgenjs, @supabase/supabase-js
├── index.ts              # Register tool
├── build-pptx.ts         # Porter depuis core/src/agents/artisan/build-pptx.ts
└── tools/
    └── generate-pptx.ts  # Tool definition
```

**Tool :**
```typescript
{
  name: "artisan.generate_pptx",
  description: "Genere une presentation PPTX professionnelle",
  params: {
    topic: z.string(),
    slideCount: z.number().default(10),
    details: z.string().optional(),
    language: z.enum(['fr', 'ru', 'en']).default('fr')
  },
  execute: async (params, ctx) => {
    // 1. Claude structure le contenu en JSON slides
    // 2. buildPptx() cree le fichier
    // 3. Upload vers Supabase Storage (agent-outputs/)
    // 4. Retourne le lien de telechargement
  }
}
```

**Changement majeur :** Plus de job queue (`agent_jobs`). L'execution est synchrone dans le tool call. Si c'est trop long, on peut utiliser le tool `exec` OpenClaw pour lancer un process background.

### 11.2. Chercheur Agent

**Avant :** Agent custom avec deep research + chaining vers artisan.

**Apres :** Skill OpenClaw `chercheur` :

```typescript
{
  name: "chercheur.research",
  description: "Recherche approfondie sur un sujet",
  params: {
    topic: z.string(),
    details: z.string().optional(),
    chain_to_artisan: z.boolean().default(false)
  },
  execute: async (params, ctx) => {
    // 1. Claude fait la recherche (web.search + web.fetch si besoin)
    // 2. Si chain_to_artisan, appelle artisan.generate_pptx
    // 3. Retourne le document de recherche
  }
}
```

### 11.3. Suppression de la job queue

La table `agent_jobs` et le `job-processor.ts` ne sont plus necessaires. OpenClaw gere l'execution des tools de maniere synchrone ou via ses propres mecanismes (cron, exec).

**Migration des jobs existants :**
- Les jobs `pending` dans `agent_jobs` doivent etre traites avant le cutover
- Les jobs `completed` sont des archives (on garde la table en read-only)

### 11.4. Taches Phase 7

- [ ] Porter `build-pptx.ts` dans le skill artisan
- [ ] Creer le tool `artisan.generate_pptx`
- [ ] Porter la logique de recherche dans le skill chercheur
- [ ] Creer le tool `chercheur.research`
- [ ] Tester la generation PPTX de bout en bout
- [ ] Tester le chaining recherche → presentation
- [ ] Valider l'upload vers Supabase Storage
- [ ] Decider du sort de la table `agent_jobs` (archive vs suppression)

---

## 12. Phase 8 — Cron & Notifications

### 12.1. Migration des cron jobs

| Cron actuel | Schedule | Migration OpenClaw |
|---|---|---|
| `daily-notification-plan` | 07:00 | Cron OpenClaw → agent copilote |
| `notification-dispatcher` | */2 * * * * | Cron OpenClaw → skill custom |
| `memory-consolidation` | 03:00 | Cron OpenClaw → agent copilote |
| `zombie-reminder-cleanup` | 06:55 | Cron OpenClaw → skill custom |
| `formation-events` | */5 * * * * | **Supprime** (remplace par routing Gateway) |
| `deadline-reminders` | 10:00 | Cron OpenClaw → agent formateur |
| `exercise-digest` | 20:00 | Cron OpenClaw → agent copilote |
| `dropout-detector` | Lundi 10:00 | Cron OpenClaw → agent formateur |
| `event-dispatcher` | */5 * * * * | **Supprime** (remplace par routing Gateway) |

### 12.2. Notification dynamique

**Avant :** `notification-planner.ts` genere N notifications/jour, `notification-dispatcher.ts` les envoie toutes les 2 min.

**Apres :**

```json5
cron: {
  jobs: {
    "daily-notification-plan": {
      schedule: "0 7 * * *",
      agent: "copilote",
      prompt: "C'est 7h du matin. Planifie les notifications pour aujourd'hui. Charge les taches actives, le plan du jour, et les clients en attente. Genere 15 rappels intelligents repartis entre 8h30 et 23h30 (espacement minimum 20 min). Types : morning_start, progress_check, focus_probe, blocker_check, client_followup, motivation, planning, accountability, reflection, evening_review, sleep_reminder. Utilise reminders.create_batch pour les creer."
    },
    "notification-dispatcher": {
      schedule: "*/2 * * * *",
      // Ce job est special : il ne passe PAS par l'agent.
      // Il execute un script qui envoie les rappels dus.
      script: "node ~/.openclaw/scripts/notification-dispatcher.js"
    },
    "zombie-cleanup": {
      schedule: "55 6 * * *",
      script: "node ~/.openclaw/scripts/zombie-cleanup.js"
    }
  }
}
```

**Note importante :** Le `notification-dispatcher` ne peut PAS etre un job agent car il tourne toutes les 2 minutes et doit etre ultra-leger (pas d'appel Claude). C'est un script Node.js qui :
1. Query `reminders` table pour les rappels dus
2. Envoie via Telegram API
3. Marque comme `sent`

→ Porter `packages/bot-telegram/src/cron/notification-dispatcher.ts` en script standalone.

### 12.3. Crons formation

```json5
cron: {
  jobs: {
    "deadline-reminders": {
      schedule: "0 10 * * *",
      agent: "formateur",
      prompt: "C'est 10h. Verifie les deadlines d'exercices a venir. Pour chaque deadline dans 48h, envoie un rappel amical a l'etudiant en DM. Pour chaque deadline dans 24h, envoie un rappel urgent. Utilise formation.list_sessions pour voir les deadlines et formation.list_students pour les etudiants."
    },
    "exercise-digest": {
      schedule: "0 20 * * *",
      agent: "copilote",
      prompt: "C'est 20h. Genere le digest quotidien des exercices soumis aujourd'hui. Liste les soumissions du jour avec statut, etudiant, et note IA. Envoie-moi le resume."
    },
    "dropout-detector": {
      schedule: "0 10 * * 1",
      agent: "formateur",
      prompt: "C'est lundi 10h. Analyse l'activite des etudiants sur la derniere semaine. Identifie ceux qui n'ont soumis aucun exercice ou qui n'ont pas interagi depuis 5+ jours. Signale les etudiants a risque de decrochage."
    }
  }
}
```

### 12.4. Suppression des event dispatchers

Les crons `formation-events` et `event-dispatcher` qui traitent les events inter-bots sont **remplaces par le routing natif du Gateway OpenClaw**. Quand l'agent formateur detecte un exercice soumis, il utilise `message.send` pour notifier l'admin directement sur Telegram.

### 12.5. Taches Phase 8

- [ ] Configurer tous les cron jobs dans `openclaw.json`
- [ ] Porter `notification-dispatcher.ts` en script standalone
- [ ] Porter `zombie-cleanup` en script standalone
- [ ] Ecrire les prompts de chaque cron agent
- [ ] Tester le daily notification plan (07:00)
- [ ] Tester le dispatcher (2 min)
- [ ] Tester les deadline reminders
- [ ] Tester le exercise digest
- [ ] Tester le dropout detector
- [ ] Valider que les notifications arrivent sur Telegram

---

## 13. Phase 9 — Tests & Validation

### 13.1. Tests de non-regression

Pour chaque fonctionnalite, comparer le comportement ancien vs nouveau :

#### Bot Telegram Admin
- [ ] Message texte libre → reponse coherente avec contexte memoire
- [ ] "Ajoute une tache: appeler client X" → tache creee en DB
- [ ] "C'est fait" → tache marquee complete
- [ ] "Montre mes taches" → liste active
- [ ] "Pipeline clients" → liste clients avec statuts
- [ ] "Change le prix a 2500" → public_knowledge modifie
- [ ] "Fais une recherche sur [sujet]" → recherche approfondie
- [ ] "Genere une presentation sur [sujet]" → PPTX genere et envoye
- [ ] Message vocal → transcription FR → reponse
- [ ] Message long (>4096 chars) → split correct
- [ ] Notification dynamique recue a l'heure prevue
- [ ] Memoire mise a jour automatiquement apres conversation

#### Bot Telegram Public
- [ ] Question sur la formation → reponse en russe basee sur KB
- [ ] Question hors scope → reponse poliment negative
- [ ] Lead detecte → notification admin recue
- [ ] Message vocal en russe → transcription → reponse
- [ ] Pas d'acces aux donnees privees

#### Bot Discord
- [ ] Etudiant envoie un DM → agent repond en russe
- [ ] Soumission d'exercice → fichier uploade → review IA → notification admin
- [ ] Question dans #faq → reponse automatique ou transfert
- [ ] Nouveau membre → verification → role assigne
- [ ] Admin review exercice → feedback envoye a l'etudiant
- [ ] Deadline reminder 48h → DM recu par l'etudiant
- [ ] Daily digest → resume recu par l'admin

#### Systeme memoire
- [ ] Memory core chargee au demarrage
- [ ] Memory working accessible
- [ ] Memory archival via recherche semantique
- [ ] Consolidation quotidienne a 03:00
- [ ] Mise a jour automatique apres conversation
- [ ] Public knowledge intact et accessible

### 13.2. Tests de performance

- [ ] Temps de reponse agent < 5 secondes (message simple)
- [ ] Temps de reponse agent < 15 secondes (avec tools)
- [ ] Generation PPTX < 60 secondes
- [ ] Cron job execution < 30 secondes
- [ ] Pas de timeout sur les sessions longues

### 13.3. Tests de securite

- [ ] Agent public ne peut PAS modifier la memoire
- [ ] Agent formateur ne peut PAS acceder aux taches/clients admin
- [ ] Etudiants ne peuvent PAS invoquer les agents (artisan, chercheur)
- [ ] DM policy respectee (seul admin accede au copilote)
- [ ] Pas de fuite de donnees entre agents

---

## 14. Phase 10 — Deploiement & Cutover

### 14.1. Strategie de deploiement

```
Semaine N   : OpenClaw tourne en parallele (shadow mode)
Semaine N+1 : Migration donnees temps reel (dual-write)
Semaine N+2 : Cutover bot admin (bascule Telegram token)
Semaine N+3 : Cutover bot public + Discord
Semaine N+4 : Ancien systeme eteint, monitoring
```

### 14.2. Shadow mode

1. OpenClaw Gateway tourne sur un port different
2. Les messages sont copies vers le nouveau systeme (sans reponse)
3. On compare les reponses generees (sans les envoyer)
4. On ajuste les prompts et skills

### 14.3. Cutover Telegram

1. **Nouveau token** : Si on change de bot, creer un nouveau bot Telegram et migrer le token
2. **Meme token** : Si on garde le meme bot, arreter l'ancien service et demarrer OpenClaw avec le meme token

**Recommandation :** Garder le meme token pour eviter de perdre l'historique de chat.

### 14.4. Cutover Discord

1. Meme bot Discord, meme token
2. Arreter `packages/bot-discord`
3. Demarrer OpenClaw avec le channel Discord configure
4. Verifier les permissions du bot sur le serveur

### 14.5. Rollback plan

Si quelque chose ne va pas :
1. Arreter OpenClaw Gateway
2. Redemarrer les anciens bots (`pnpm dev`)
3. Les donnees Supabase sont intactes (aucune migration destructive)
4. Diagnostiquer et corriger

### 14.6. Docker production

```yaml
# docker-compose.openclaw.yml
version: '3.8'
services:
  openclaw:
    image: node:24-slim
    working_dir: /app
    volumes:
      - openclaw-data:/root/.openclaw
      - ./scripts:/app/scripts
    environment:
      - OPENCLAW_GATEWAY_TOKEN
      - ANTHROPIC_API_KEY
      - OPENAI_API_KEY
      - SUPABASE_URL
      - SUPABASE_SERVICE_ROLE_KEY
      - TELEGRAM_BOT_TOKEN
      - PUBLIC_BOT_TOKEN
      - DISCORD_BOT_TOKEN
      - DISCORD_GUILD_ID
      - DISCORD_CLIENT_ID
      - ADMIN_TELEGRAM_CHAT_ID
    ports:
      - "18789:18789"
    command: npx openclaw gateway
    restart: unless-stopped

  embedding-server:
    # Garde l'ancien embedding server si besoin
    build: ./embedding-server
    ports:
      - "8100:8100"
    restart: unless-stopped

volumes:
  openclaw-data:
```

### 14.7. Taches Phase 10

- [ ] Deployer OpenClaw en shadow mode
- [ ] Comparer les reponses pendant 1 semaine
- [ ] Planifier la fenetre de cutover (week-end de preference)
- [ ] Cutover bot admin Telegram
- [ ] Valider 24h en production
- [ ] Cutover bot public Telegram
- [ ] Cutover bot Discord
- [ ] Valider 48h en production
- [ ] Eteindre les anciens services
- [ ] Nettoyer le code mort (packages/bot-*)

---

## 15. Risques & Mitigations

| Risque | Impact | Probabilite | Mitigation |
|---|---|---|---|
| **2 bots Telegram non supportes nativement** | Haut | Haute | Extension custom (Phase 4, Option A) |
| **Discord guild events (member join) pas geres** | Moyen | Haute | Extension Discord custom |
| **Notification dispatcher trop frequent pour un agent** | Haut | Haute | Script standalone (pas agent) |
| **Perte de contexte memoire pendant migration** | Haut | Faible | Supabase intact, pas de migration DB |
| **Latence accrue (Pi Agent + tools vs orchestrateur direct)** | Moyen | Moyenne | Optimiser prompts, pre-charger contexte |
| **Forum threads Discord non supportes** | Moyen | Moyenne | Tool custom ou extension Discord |
| **Upload fichiers exercices via DM** | Moyen | Faible | OpenClaw gere les media nativement |
| **Whisper transcription non native** | Faible | Moyenne | Skill custom wrappant l'API OpenAI |
| **OpenClaw breaking changes** | Haut | Faible | Verrouiller la version, tester avant upgrade |
| **Node 22+ requis** | Faible | Faible | Upgrade Node (actuellement 20+) |

---

## 16. Ce qu'on gagne avec OpenClaw

### Gains architecturaux
- **1 processus au lieu de 3** : un seul Gateway pour tous les bots
- **Pas de code de routing** : plus d'orchestrateur custom
- **Tool use natif** : plus de parsing JSON custom
- **Session management automatique** : plus de Map<> en memoire
- **Plugin system** : ajout de channels/providers sans code
- **Multi-provider** : switch Claude → GPT → Gemini en 1 config

### Gains fonctionnels
- **WhatsApp support** : nouvelle surface sans effort
- **iMessage support** : pour iPhone (push natif)
- **Web UI** : interface web pour l'admin
- **Browser automation** : agent peut naviguer le web
- **Canvas** : agent peut generer des UI interactives
- **Apps natives** : macOS menu bar, iOS app
- **Streaming** : reponses en temps reel
- **70+ skills integrees** : GitHub, Notion, Spotify, etc.

### Gains operationnels
- **Moins de code a maintenir** : ~15K lignes → ~3K lignes (skills custom)
- **Cron natif** : plus de node-cron custom
- **Monitoring** : health endpoint, WebSocket status
- **Upgrades** : `npm update -g openclaw`
- **Communaute** : bug fixes, nouvelles features, plugins

---

## 17. Ce qu'on perd / Points d'attention

### Ce qu'on perd
- **Controle total du routing** : on depend du routing OpenClaw
- **Slash commands Telegram/Discord** : remplace par langage naturel (mais possible de recreer via commands custom)
- **Job queue persistante** : `agent_jobs` remplace par execution synchrone + cron
- **Granularite du Context Builder** : les 4 couches deviennent des tools a la demande
- **Conversation history TTL custom** : OpenClaw gere ses propres sessions

### Points d'attention
- **OpenClaw est un projet open source** : dependance a la communaute/mainteneurs
- **Node 22+ requis** : upgrade necessaire (actuellement 20+)
- **Courbe d'apprentissage** : nouveau systeme de config, skills, hooks
- **Debug plus opaque** : les erreurs dans le Pi Agent sont moins lisibles qu'un crash Node direct
- **Cout potentiel** : plus de token usage si l'agent fait plus de tool calls (mais optimisable)

---

## 18. Estimation effort

### Par phase

| Phase | Description | Effort estime | Complexite |
|---|---|---|---|
| 0 | Fondations OpenClaw | 1 jour | Faible |
| 1 | Data Layer (Skills Supabase) | 3-4 jours | Moyenne |
| 2 | Agent Brain (Bootstrap files) | 1-2 jours | Moyenne |
| 3 | Bot Telegram Admin | 1-2 jours | Faible |
| 4 | Bot Telegram Public | 2-3 jours | Haute (extension custom) |
| 5 | Bot Discord Formation | 3-4 jours | Haute (extensions custom) |
| 6 | Systeme de Memoire | 2-3 jours | Moyenne |
| 7 | Agents Autonomes | 1-2 jours | Faible |
| 8 | Cron & Notifications | 2-3 jours | Moyenne |
| 9 | Tests & Validation | 3-4 jours | Moyenne |
| 10 | Deploiement & Cutover | 2-3 jours | Moyenne |

**Total estime : 20-30 jours de travail**

### Chemin critique

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 (admin fonctionnel)
                                   ↓
                              Phase 6 (memoire)
                                   ↓
                              Phase 8 (crons)
                                   ↓
                         Phase 4 + Phase 5 (parallele)
                                   ↓
                              Phase 7 (agents)
                                   ↓
                              Phase 9 (tests)
                                   ↓
                              Phase 10 (deploy)
```

### MVP (premier bot fonctionnel)

Phases 0 + 1 + 2 + 3 = **Bot admin Telegram fonctionnel en ~7 jours**

---

## 19. Checklist pre-migration

### Infrastructure
- [ ] Node.js >= 22.16.0 installe
- [ ] OpenClaw installe et fonctionnel
- [ ] Supabase accessible et donnees integres
- [ ] Backup complet de la DB Supabase
- [ ] Tokens (Telegram, Discord, Claude, OpenAI) disponibles

### Donnees
- [ ] Export des memories core (au cas ou)
- [ ] Export des public_knowledge
- [ ] Export des clients actifs
- [ ] Export des taches actives
- [ ] Snapshot des students et exercises

### Code
- [ ] Ancien code tague dans git (tag `pre-openclaw-migration`)
- [ ] Documentation des prompts actuels (orchestrateur, memory manager, etc.)
- [ ] Liste de tous les edge cases connus

### Equipe
- [ ] Informer les etudiants de la migration (downtime possible)
- [ ] Fenetre de migration planifiee
- [ ] Rollback plan teste

---

## Annexe A — Structure des skills OpenClaw

### Template de skill

```typescript
// ~/.openclaw/skills/my-skill/index.ts
import { defineSkill, z } from 'openclaw/plugin-sdk'

export default defineSkill({
  name: 'my-skill',
  version: '1.0.0',
  tools: [
    {
      name: 'my_tool',
      description: 'What this tool does',
      parameters: z.object({
        param1: z.string().describe('Description'),
        param2: z.number().optional().describe('Optional param')
      }),
      execute: async (params, ctx) => {
        // Implementation
        return { result: 'success', data: '...' }
      }
    }
  ]
})
```

### Package.json type

```json
{
  "name": "@assistme/openclaw-skill-supabase-tasks",
  "version": "1.0.0",
  "type": "module",
  "main": "index.ts",
  "dependencies": {
    "@supabase/supabase-js": "^2.49.1",
    "zod": "^3.24.2"
  }
}
```

---

## Annexe B — Mapping complet des fichiers

| Fichier actuel | Action | Destination OpenClaw |
|---|---|---|
| `core/src/db/client.ts` | Porter | `skills/supabase-core/client.ts` |
| `core/src/db/tasks.ts` | Porter | `skills/supabase-tasks/tools/*.ts` |
| `core/src/db/clients.ts` | Porter | `skills/supabase-clients/tools/*.ts` |
| `core/src/db/memory.ts` | Porter | `skills/supabase-memory/tools/*.ts` |
| `core/src/db/public-knowledge.ts` | Porter | `skills/supabase-memory/tools/*.ts` |
| `core/src/db/daily-plans.ts` | Porter | `skills/supabase-planner/tools/*.ts` |
| `core/src/db/reminders.ts` | Porter | `skills/supabase-reminders/tools/*.ts` |
| `core/src/db/formation/*.ts` | Porter | `skills/supabase-formation/tools/*.ts` |
| `core/src/ai/orchestrator.ts` | **Supprime** | Remplace par AGENTS.md + tools |
| `core/src/ai/context-builder.ts` | **Supprime** | Remplace par bootstrap files + tools |
| `core/src/ai/memory-manager.ts` | **Supprime** | Remplace par tool memory.* dans AGENTS.md |
| `core/src/ai/memory-agent.ts` | Porter (hook) | `hooks/memory-updater.js` |
| `core/src/ai/research-agent.ts` | Porter (skill) | `skills/chercheur/tools/research.ts` |
| `core/src/ai/client-discovery-agent.ts` | Porter (skill) | `skills/client-discovery/tools/*.ts` |
| `core/src/ai/notification-planner.ts` | Porter (cron) | Cron job prompt + reminders tools |
| `core/src/ai/memory-consolidator.ts` | Porter (cron) | Cron job prompt |
| `core/src/ai/transcribe.ts` | Porter (skill) | `skills/transcribe/` ou natif OpenClaw |
| `core/src/ai/planner.ts` | Porter (skill) | `skills/supabase-planner/tools/generate.ts` |
| `core/src/ai/embeddings.ts` | Garder | Appele depuis skills (HTTP) |
| `core/src/ai/formation/*.ts` | Porter (skill) | `skills/supabase-formation/tools/*.ts` |
| `core/src/agents/registry.ts` | **Supprime** | OpenClaw gere ses propres skills |
| `core/src/agents/job-processor.ts` | **Supprime** | Plus de job queue |
| `core/src/agents/artisan/` | Porter (skill) | `skills/artisan/` |
| `core/src/agents/chercheur.ts` | Porter (skill) | `skills/chercheur/` |
| `core/src/cache/redis.ts` | **Supprime** | OpenClaw a son propre cache |
| `core/src/scheduler/` | **Supprime** | OpenClaw Cron natif |
| `core/src/types/index.ts` | Porter | `skills/supabase-core/types.ts` |
| `bot-telegram/src/**` | **Supprime** | Channel Telegram OpenClaw |
| `bot-telegram-public/src/**` | **Supprime** | Extension custom + agent public |
| `bot-discord/src/**` | **Supprime** | Channel Discord OpenClaw + extensions |
| `embedding-server/` | **Garder** | Toujours utile pour pgvector |
| `supabase/migrations/` | **Garder** | DB inchangee |

---

## Annexe C — Diagramme de decision

```
                        ┌──────────────────┐
                        │  Fonctionnalite  │
                        │    a migrer      │
                        └────────┬─────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Existe en natif dans   │
                    │     OpenClaw ?          │
                    └────────┬───────┬────────┘
                        OUI │       │ NON
                            │       │
                   ┌────────▼──┐  ┌─▼──────────────┐
                   │ Utiliser  │  │ C'est de la     │
                   │ le natif  │  │ logique metier ? │
                   └───────────┘  └──┬──────────┬───┘
                                 OUI │          │ NON
                                     │          │
                            ┌────────▼──┐  ┌───▼───────────┐
                            │ Creer un  │  │ Extension     │
                            │   skill   │  │ custom        │
                            │  custom   │  │ (channel/hook)│
                            └───────────┘  └───────────────┘
```

---

*Ce document est la reference pour la migration. Il sera mis a jour au fur et a mesure de l'avancement.*
