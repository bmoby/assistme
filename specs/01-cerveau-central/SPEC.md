# 01 — Cerveau Central (Core)

> **Statut : ✅ Phase 1 + 2 IMPLEMENTEES**

**Package** : `packages/core`
**Entry point** : `src/index.ts`

Le cerveau central contient toute la logique partagee : base de donnees, IA, scheduling, types.
Tous les bots en dependent via `@vibe-coder/core`.

---

## 1. Module Database (`src/db/`)

Client Supabase unique (`src/db/client.ts`) utilise par tous les modules.

| Fichier | Table | Statut |
|---------|-------|--------|
| `tasks.ts` | tasks | ✅ createTask, completeTask, getActiveTasks, getTasksByCategory, etc. |
| `daily-plans.ts` | daily_plans | ✅ createDailyPlan, getTodayPlan, updatePlanStatus |
| `memory.ts` | memory | ✅ getAllMemory, getMemoryByCategory, getMemoryEntry, upsertMemory, deleteMemory |
| `public-knowledge.ts` | public_knowledge | ✅ getAllPublicKnowledge, getByCategory, getEntry, upsert, delete |
| `clients.ts` | clients | ✅ createClient, getClientPipeline, updateClientStatus |
| `students.ts` | students | ❌ Phase 3 |
| `exercises.ts` | student_exercises | ❌ Phase 3 |
| `team.ts` | team_members | ❌ Phase 3 |
| `messages.ts` | messages_log | ❌ Futur |
| `habits.ts` | habits | ❌ Futur |

---

## 2. Module AI (`src/ai/`)

### 2.1 Client Claude API ✅ (`client.ts`)

```typescript
askClaude(params: {
  prompt: string
  systemPrompt?: string
  model?: 'sonnet' | 'opus' | 'haiku'
  maxTokens?: number
}): Promise<string>
```

### 2.2 Orchestrateur ✅ (`orchestrator.ts`)

Routeur principal. Recoit un message + historique → decide + execute + repond.

```typescript
processWithOrchestrator(message: string, conversationHistory?: string): Promise<OrchestratorResult>
```

**Flow :**
1. `buildContext()` — charge memoire + live + public_knowledge + temporel
2. Claude Sonnet avec system prompt + contexte + historique
3. Parse JSON : `{ actions: [...], response: "..." }`
4. Execute actions inline : `create_task`, `complete_task`, `create_client`, `note`
5. Retourne actions speciales au handler : `manage_memory`, `start_research`
6. Lance Memory Agent en background (si pas d'action memoire)

**Actions supportees :**

| Action | Execution | Description |
|--------|-----------|-------------|
| `create_task` | Inline (orchestrateur) | Cree tache avec titre, categorie, priorite, deadline |
| `complete_task` | Inline (orchestrateur) | Complete tache par match de titre |
| `create_client` | Inline (orchestrateur) | Cree lead avec nom, besoin, budget, source |
| `note` | Inline (log seulement) | Note informative |
| `manage_memory` | Delegue au handler → Memory Manager | Toute operation memoire/KB |
| `start_research` | Delegue au handler → Research Agent | Recherche approfondie |

### 2.3 Memory Manager ✅ (`memory-manager.ts`)

Agent specialise pour toutes les operations sur `memory` et `public_knowledge`.

```typescript
processMemoryRequest(params: {
  userMessage: string
  conversationHistory?: string
}): Promise<MemoryManagerResult>
```

**Flow :**
1. Charge etat complet : `getAllMemory()` + `getAllPublicKnowledge()`
2. Claude specialise avec etat complet + demande utilisateur
3. Determine table, action, categorie, cle, contenu
4. Execute modifications chirurgicales (upsert/delete)
5. Retourne confirmation avec diff (ancien → nouveau)

**Regles :**
- Identifie automatiquement la bonne table (prix/formation/services → `public_knowledge`, perso → `memory`)
- Utilise les cles existantes, jamais de doublons
- Change uniquement la partie concernee du contenu
- Si incertain, pose une question au lieu de modifier

### 2.4 Research Agent ✅ (`research-agent.ts`)

Recherches approfondies, rapports structures en texte libre.

```typescript
runResearchAgent(params: {
  topic: string
  details: string
  includeMemory?: boolean
}): Promise<ResearchResult>  // { content: string }
```

- maxTokens 16000 pour rapports complets
- Prompt encourage l'exhaustivite (pas de limite de profondeur)
- Optionnel : inclut contexte memoire via `buildContext()`
- Texte structure (titres, emojis, paragraphes detailles)

### 2.5 Memory Agent Background ✅ (`memory-agent.ts`)

Analyse automatiquement chaque message pour detecter des changements de situation.

```typescript
runMemoryAgent(params: {
  message: string
  actionsSummary: string
}): Promise<void>
```

- Fire-and-forget (pas de reponse utilisateur)
- Ne se declenche PAS si `manage_memory` a ete execute
- Categories : identity, situation, preference, relationship, lesson
- Ne met a jour que pour des changements significatifs

### 2.6 Context Builder ✅ (`context-builder.ts`)

Construit le contexte dynamique injecte dans le system prompt.

```typescript
buildContext(): Promise<string>
```

**4 couches :**
1. Memoire personnelle (identity, situation, preference, relationship, lesson)
2. Donnees live (taches actives max 15, pipeline clients)
3. Public Knowledge (contenu complet pour gestion)
4. Temporel (date/heure en francais)

### 2.7 Transcription ✅ (`transcribe.ts`)

```typescript
transcribeAudio(buffer: Buffer, filename: string, language: string = 'fr'): Promise<string>
```

- OpenAI Whisper API
- Langues : `fr` (admin bot), `ru` (public bot)
- Formats : .ogg (Telegram voice), .mp3, .wav

### 2.8 Planner ✅ (`planner.ts`)

```typescript
generateDailyPlan(params): Promise<DailyPlan>
parseUserMessage(message: string): Promise<ParsedMessage>
```

---

## 3. Module Scheduler (`src/scheduler/`)

| Cron | Heure | Action | Statut |
|------|-------|--------|--------|
| Plan matinal | 08:30 | Genere plan du jour → push Telegram | ✅ |
| Anti-procrastination | 11:00 | Si aucune tache commencee → rappel | ✅ |
| Check mi-journee | 14:00 | Bilan + recommandation | ✅ |
| Bilan du soir | 19:00 | Score productivite + priorites demain | ✅ |
| Rappel sommeil | 00:00 | Rappel gamifie | ✅ |
| Veille contenu | Lundi 10:00 | Suggestions contenu | ❌ Phase 4 |
| Student check | Quotidien 10:00 | Etudiants bloques > 48h | ❌ Phase 3 |
| Client followup | Quotidien 10:00 | Clients en attente > 24h | ❌ Phase 3 |

---

## 4. Module Types (`src/types/index.ts`)

Types TypeScript stricts pour toutes les tables Supabase :
Task, DailyPlan, Client, Student, StudentExercise, TeamMember, MessageLog, ContentIdea, Habit, Reminder, PublicKnowledge.

---

## 5. Exports (`src/index.ts`)

```typescript
export * from './types/index.js';
export * from './db/index.js';
export * from './ai/index.js';
export * as scheduler from './scheduler/index.js';
export { logger } from './logger.js';
```

Tous les bots importent depuis `@vibe-coder/core`.

---

## 6. Dependances

```json
{
  "@supabase/supabase-js": "^2.x",
  "@anthropic-ai/sdk": "latest",
  "openai": "^4.x",
  "node-cron": "^3.x",
  "zod": "^3.x",
  "pino": "^8.x"
}
```
