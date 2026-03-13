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
| `clients.ts` | clients | ✅ createClient, getClientPipeline, updateClientStatus, updateClient |
| `reminders.ts` | reminders | ✅ createReminder, createReminders, getDueReminders, markReminderSent, cancelActiveReminders, getTodayReminders |
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
| `start_client_discovery` | Delegue au handler → Client Discovery Agent | Questions de qualification client |

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

### 2.6 Client Discovery Agent ✅ (`client-discovery-agent.ts`)

Agent de qualification client — genere des questions pertinentes adaptees au business du client.

```typescript
runClientDiscoveryAgent(params: {
  clientName: string
  businessDescription: string
  knownInfo?: string
  conversationHistory?: string
}): Promise<ClientDiscoveryResult>  // { content: string, clientId?: string }
```

- 7 themes de questions : Business, Tech actuelle, Points de douleur, Equipe, Clients du client, Budget/Timeline, Vision
- Analyse les infos deja fournies et ne pose pas de questions redondantes
- Questions formulees de facon conversationnelle
- Premiere brique du workflow Discovery → Qualification → Research → Proposition

### 2.7 Context Builder ✅ (`context-builder.ts`)

Construit le contexte dynamique injecte dans le system prompt.

```typescript
buildContext(): Promise<string>
```

**4 couches :**
1. Memoire personnelle (identity, situation, preference, relationship, lesson)
2. Donnees live (taches actives max 15, pipeline clients)
3. Public Knowledge (contenu complet pour gestion)
4. Temporel (date/heure en francais)

### 2.8 Transcription ✅ (`transcribe.ts`)

```typescript
transcribeAudio(buffer: Buffer, filename: string, language: string = 'fr'): Promise<string>
```

- OpenAI Whisper API
- Langues : `fr` (admin bot), `ru` (public bot)
- Formats : .ogg (Telegram voice), .mp3, .wav

### 2.9 Planner ✅ (`planner.ts`)

```typescript
generateDailyPlan(params): Promise<DailyPlan>
parseUserMessage(message: string): Promise<ParsedMessage>
```

### 2.10 Notification Planner ✅ (`notification-planner.ts`)

Agent IA qui planifie les notifications dynamiques de la journee.

```typescript
planDailyNotifications(notificationCount: number): Promise<PlannedNotification[]>
getNotificationCount(): Promise<number>
```

**Flow :**
1. `buildContext()` — charge memoire + taches + clients + temporel
2. Claude Sonnet avec system prompt specialise + contexte complet
3. Genere exactement N notifications avec heures + messages + types
4. Valide le format (HH:MM) et trie par heure

**Types de notifications generees :**
- `morning_start` : demarrage journee, plan, energie
- `progress_check` : avancement sur une tache specifique (mentionne le nom)
- `focus_probe` : verifier la concentration
- `blocker_check` : detecter blocages et imprevu
- `client_followup` : suivi client specifique
- `motivation` : push anti-procrastination
- `planning` : reorganisation, prochaine etape
- `accountability` : demander des comptes sur un engagement
- `reflection` : apprentissage du jour
- `evening_review` : bilan de journee
- `sleep_reminder` : rappel sommeil gamifie (motivation par la perte)

**Regles de distribution :**
- Plage horaire : 08:30 → 23:30
- Espacement minimum : 20 minutes entre deux notifications
- Concentration pendant la "fenetre d'or" (10h-15h)
- Moins de notifications le soir (max 2-3 apres 20h)

**Preference utilisateur :**
- Nombre configurable via table `memory` (cle `notifications_par_jour`, categorie `preference`)
- Default : 15 notifications/jour
- Modifiable via `/notifs [nombre]` ou en langage naturel

---

## 3. Module Scheduler (`src/scheduler/`)

### Systeme de notifications dynamiques ✅

Remplace les 5 crons fixes par un systeme intelligent pilote par l'IA.

| Cron | Frequence | Action | Statut |
|------|-----------|--------|--------|
| `daily-notification-plan` | 07:00 quotidien | L'IA planifie toutes les notifications du jour | ✅ |
| `notification-dispatcher` | Toutes les 2 min | Verifie et envoie les notifications dues | ✅ |
| Veille contenu | Lundi 10:00 | Suggestions contenu | ❌ Phase 4 |
| Student check | Quotidien 10:00 | Etudiants bloques > 48h | ❌ Phase 3 |
| Client followup | Quotidien 10:00 | Clients en attente > 24h | ❌ Phase 3 |

**Architecture :**
1. A 07:00, le `daily-notification-plan` appelle le Notification Planner Agent
2. L'agent genere N notifications (heures + messages) basees sur le contexte actuel
3. Les notifications sont stockees dans la table `reminders` (status `active`)
4. Toutes les 2 minutes, le `notification-dispatcher` verifie les reminders dues (`trigger_at <= NOW()`)
5. Chaque notification envoyee est marquee `sent`

**Replanification :** Possible a tout moment via `/replan` ou `/notifs [nombre]`

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
