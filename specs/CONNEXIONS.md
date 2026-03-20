# CONNEXIONS — Flux de donnees entre composants

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  Bot Telegram Admin  │     │  Bot Telegram Public  │     │  Bot Discord          │
│  (Copilote, FR)      │     │  (Audience, RU)       │     │  (Formateur, RU)      │
└──────────┬──────────┘     └──────────┬───────────┘     └──────────┬───────────┘
           │                           │                            │
           │         events            │                  events    │
           │◀──────────────────────────┼────────────────────────────┤
           │                           │                            │
           ▼                           ▼                            ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                                CORE                                        │
│                                                                            │
│  ┌──────────────┐  ┌────────────────────┐  ┌──────────────────────┐       │
│  │ Orchestrator  │  │  Memory Manager    │  │  DM Agent            │       │
│  │ (routeur)     │─▶│  (agent specialise)│  │  (formation, RU)     │       │
│  └──────┬───────┘  └────────────────────┘  └──────────────────────┘       │
│         │          ┌────────────────────┐  ┌──────────────────────┐       │
│         ├─────────▶│  Research Agent     │  │  FAQ Agent            │       │
│         │          └────────────────────┘  │  (formation, RU)      │       │
│         │          ┌────────────────────┐  └──────────────────────┘       │
│         ├─────────▶│  Memory Agent (bg)  │                                │
│         │          └────────────────────┘                                 │
│         │          ┌────────────────────┐                                 │
│         ├─────────▶│  Notif Planner      │                                │
│         │          └────────────────────┘                                 │
│         │          ┌────────────────────┐                                 │
│         └─────────▶│  Context Builder    │                                │
│                    └────────┬───────────┘                                 │
│                             │                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                       Supabase                                     │   │
│  │  memory | public_knowledge | tasks | clients | reminders           │   │
│  │  events | sessions | students | student_exercises | faq            │   │
│  │  exercise_attachments | formation_knowledge | Storage              │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌──────────────┐  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │  Scheduler    │  │  Transcription       │  │  Memory Consolidator │    │
│  │  (crons)      │  │  (Whisper FR/RU)     │  │  (03:00 daily)       │    │
│  └──────────────┘  └──────────────────────┘  └──────────────────────┘    │
│                                                                            │
│  ┌──────────────┐  ┌──────────────────────┐                               │
│  │  Redis Cache  │  │  Embedding Server    │                               │
│  │  (mem tiers)  │  │  (FastAPI, MiniLM)   │                               │
│  └──────────────┘  └──────────────────────┘                               │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Flux Principaux

### Flux 1 : Message Admin (Texte ou Vocal)

```
User → Bot Admin
  → [Whisper si vocal → transcription FR]
  → addMessage(chatId, 'user', text)
  → formatHistoryForPrompt(chatId)
  → processWithOrchestrator(text, history)
    → buildContext() (memoire + live + public_knowledge + temporel)
    → Claude Sonnet analyse message + contexte
    → Parse JSON : { actions: [...], response: "..." }
    → Execute actions inline (create_task, complete_task, create_client, note)
    → Retourne actions speciales (manage_memory, start_research) au handler
  → Bot envoie result.response
  → Si manage_memory → appelle Memory Manager (voir flux 2)
  → Si start_research → appelle Research Agent (voir flux 3)
  → Memory Agent (background) si pas d'action memoire
```

### Flux 2 : Gestion Memoire (Admin uniquement)

```
User demande modification memoire/KB
  → Orchestrator detecte intent → action manage_memory
  → Handler appelle processMemoryRequest(userMessage, history)
    → Charge etat complet : getAllMemory() + getAllPublicKnowledge()
    → Claude specialise avec prompt memoire + etat complet des 2 tables
    → Determine : table cible, action, categorie, cle, nouveau contenu
    → Execute upsert/delete sur la bonne table
    → Retourne confirmation avec diff (ancien → nouveau)
  → Bot envoie le rapport du Memory Manager
```

### Flux 3 : Recherche Approfondie (Admin)

```
User demande recherche → Orchestrator → action start_research
  → Handler appelle runResearchAgent({ topic, details, includeMemory })
    → Si includeMemory → buildContext() pour enrichir
    → Claude Sonnet avec prompt deep research (maxTokens 16000)
    → Retourne texte structure libre
  → Bot envoie rapport (split si > 4096 chars via sendLongMessage)
```

### Flux 4 : Message Public (Texte ou Vocal)

```
Utilisateur externe → Bot Public
  → [Whisper si vocal → transcription RU]
  → Charge public_knowledge depuis Supabase
  → Claude avec system prompt russe + knowledge base
  → Reponse en russe
  → Regex detection lead : [LEAD: name="..." need="..." budget="..." urgency="..."]
    → Si lead detecte :
      → Strip tags de la reponse avant envoi
      → Notification admin via fetch POST API Telegram (bot admin token)
  → addMessage + conversation history (20 msgs, 30min TTL)
```

### Flux 5 : Notifications Dynamiques (IA → Scheduler → Bot Admin)

```
07:00  → planDay()
         → getNotificationCount() (lit preference memoire, default 15)
         → cancelActiveReminders() (cleanup)
         → planDailyNotifications(count)
           → buildContext() (memoire + taches + clients + temporel)
           → Claude Sonnet planifie N notifications (heures + messages + types)
         → createReminders() (batch insert dans table reminders)

*/2 min → dispatchNotifications()
         → getDueReminders() (trigger_at <= NOW() AND status = 'active')
         → Pour chaque reminder due :
           → bot.api.sendMessage(chatId, message)
           → markReminderSent(id)
         → User repond → flux 1 (orchestrateur normal)

A la demande → /notifs [nombre] ou /replan
         → upsertMemory(preference, notifications_par_jour)
         → planDay() (replanification immediate)
```

### Flux 6 : Contexte Dynamique — Memory 3 Tiers (chaque requete orchestrateur)

```
buildContext({ includePublicKnowledge?, maxTasks?, userMessage? }) →
  Couche 1 — Memoire personnelle (tier-aware) :
    Core tier (identity) :
      → cacheGet('memory:core') || getCoreMemory() → cacheSet(5 min)
    Working tier (situation, preference, relationship) :
      → cacheGet('memory:working') || getWorkingMemory() → cacheSet(2 min)
    Archival tier (lesson) :
      → PAS charge par defaut
      → Si userMessage fourni :
        → getEmbedding(userMessage) → embedding serveur HTTP
        → searchMemorySemantic(embedding) → RPC Supabase pgvector
        → Ajoute resultats pertinents au contexte
  Couche 2 — Donnees live :
    Taches actives (max N), Pipeline clients
    Clients filtres : statuts terminaux (delivered/paid) > 7 jours exclus
  Couche 3 — Public Knowledge :
    Charge uniquement si includePublicKnowledge: true
  Couche 4 — Temporel :
    Date/heure en francais
→ Injecte dans system prompt de l'orchestrateur
```

**Cache invalidation :**
- `upsertMemory()` → `cacheDelete('memory:core')` + `cacheDelete('memory:working')`
- `deleteMemory()` → meme invalidation
- Auto-embedding fire-and-forget sur `upsertMemory()`

### Flux 7 : Capture rapide (Admin texte libre)

```
Bot Telegram Admin : "Ahmed veut un site, budget 2000€"
  → Orchestrator : parse avec Claude → create_client + create_task
  → DB : nouveau client + nouvelle tache
  → Memory Agent (background) : detecte relationship Ahmed
  → Bot : "Client Ahmed cree. Tache ajoutee."
```

### Flux 8 : DM Agent — Soumission d'exercice par message prive

```
Etudiant envoie DM au bot Discord (texte, fichier, lien)
  → dm-handler intercepte (messageCreate, guild === null)
  → Lock sequentiel par userId (empeche traitement concurrent)
  → Gestion fichiers :
    → Validation : MIME type (image, PDF, doc, zip, txt) + taille max 25 MB
    → Upload vers Supabase Storage bucket "exercise-submissions"
      → Chemin : {student_id}/{session-N|misc}/{timestamp}-{filename}
    → Ajout a pendingAttachments (storagePath, filename, mimeType, type)
  → Detection URLs dans le texte → ajout a pendingAttachments (type: 'url')
  → Ajout message a conversation (in-memory, max 20 messages, TTL 30 min)
  → runDmAgent(context) :
    → getStudentByDiscordId() → identification etudiant
    → Claude Sonnet tool_use loop (max 5 iterations) avec 5 tools :
      → get_student_progress : profil + statut soumissions par session
      → get_session_exercise : details exercice (deliverables, deadline)
      → create_submission : cree student_exercises + exercise_attachments
        → createFormationEvent(type: 'exercise_submitted', target: 'telegram-admin')
      → get_pending_feedback : reviews IA/formateur non consultees
      → search_course_content : recherche hybride dans formation_knowledge
        → getEmbedding(query) → searchFormationKnowledge(query, embedding, filters)
    → Retourne texte reponse + submissionId eventuel
  → Si submission creee → vide pendingAttachments
  → Bot Discord envoie reponse (split si > 2000 chars)
```

### Flux 9 : Discord ↔ Telegram Events (table `events`)

```
Direction Discord → Telegram (source: 'discord', target: 'telegram-admin') :
  → exercise_submitted : cree par DM Agent apres soumission
    → data : student_name, session_number, session_title, exercise_id, attachment_count, comment
  → daily_exercise_digest : cree par cron exercise-digest (1x/jour)
    → data : total, pending, approved, revision_needed, pending_details[]
  → student_alert : cree par FAQ handler quand confiance < 70%
    → data : alert_type ('faq_unanswered'), student_name, question
  → Bot Telegram Admin lit les events via getUnprocessedEvents('telegram-admin')
    → Envoie notification formatee a l'admin
    → markEventProcessed(id)

Direction Telegram → Discord (source: 'telegram-admin', target: 'discord') :
  → announcement : cree par admin via Bot Telegram
    → data : { text }
  → event-dispatcher (cron */2 min) lit getUnprocessedEvents('discord')
    → type 'announcement' → envoie dans #annonces
    → markEventProcessed(id)
```

### Flux 10 : Session Management (admin /session)

```
Admin Discord → /session (номер, название, модуль)
  → Verification role admin (isAdmin)
  → createSession() → insert dans table sessions (status: 'published')
  → Cherche ForumChannel (#sessions) :
    → Cree thread : "Сессия {N} — {titre}"
    → Contenu template : video, theme, exercice, deadline, replay
    → Applique tag module si disponible
    → updateSession(id, { discord_thread_id })
  → Cherche #annonces (TextChannel) :
    → Envoie annonce avec mention @role etudiant
    → "Доступна Сессия {N}! {titre}"
  → Reply ephemeral a l'admin (confirmation + statut forum)

Admin Discord → /session-update (mise a jour session existante)
  → updateSession() → update dans table sessions
  → Modification possible : titre, description, deadline, exercise_description, status
```

### Flux 11 : Deadline Reminders (cron automatique)

```
Cron 2x/jour → sendDeadlineReminders(client, hoursBeforeDeadline)
  → Fenetre 48h (J-2) :
    → getSessionsWithDeadlineIn(48) → sessions avec deadline dans 48h
    → getActiveStudents() → tous les etudiants actifs
    → Pour chaque session × etudiant :
      → getExercisesByStudent(id) → verifie si deja soumis (session_id match)
      → Si pas soumis ET discord_id present :
        → client.users.fetch(discord_id)
        → DM : "⏰ Через 2 дня дедлайн по Сессии {N} «{titre}». Ты ещё не сдал(а)."
  → Fenetre 24h (J-1) :
    → Meme logique, message urgent :
      → DM : "⚠️ Завтра дедлайн по Сессии {N} «{titre}»! Последний день."
  → Si DM echoue (user.send()) → log warn (DMs desactives)
  → Log recap : nombre de sessions + heures
```

### Flux 12 : Memory Consolidation (cron 03:00 quotidien)

```
03:00 → runMemoryConsolidation()
  → Charge working memories expirees (expires_at < NOW())
  → Pour chaque memoire expiree :
    → Claude Sonnet analyse pertinence actuelle
    → Decision :
      archive → tier = 'archival', category = 'lesson', expires_at = NULL
      delete  → deleteMemory(id)
      renew   → expires_at = NOW() + 30 jours
  → cacheDelete('memory:working') (invalidation post-consolidation)
```

### Flux 13 : Zombie Reminder Cleanup (cron 06:55 quotidien)

```
06:55 → expireZombieReminders()
  → Annule tous les reminders actifs dont trigger_at < NOW() - 24h
  → Empeche les "zombies" (notifications jamais envoyees) de s'accumuler

getDueReminders() — guard supplementaire :
  → Ignore les reminders dont trigger_at < NOW() - 6h (stale guard)

cancelActiveReminders() — version amelioree :
  → Annule TOUS les reminders actifs dans le passe (pas seulement aujourd'hui)
```

### Flux 14 : Embedding Pipeline (auto + backfill — memory)

```
Auto-embedding (a chaque upsertMemory) :
  → upsertMemory(entry) → DB insert/update
  → Fire-and-forget : getEmbedding(content) → embedding server HTTP
  → Si embedding recu → update memory SET embedding = vector

Backfill (scripts/backfill-embeddings.ts) :
  → Charge toutes les memories sans embedding
  → getEmbeddings(texts[]) → batch request au serveur
  → Update chaque memory avec son embedding

Recherche semantique :
  → getEmbedding(userMessage) → vecteur 384 dim
  → searchMemorySemantic(vector, { matchThreshold: 0.7, matchCount: 5 })
  → RPC Supabase → cosine similarity sur pgvector
  → Retourne memories triees par pertinence
```

### Flux 15 : Formation Knowledge Base (contenu pedagogique → agents)

```
Seed (pnpm seed:knowledge) :
  → Lit 14 fichiers markdown (learning-knowledge/*)
  → Chunking par headings H2, split H3 si chunk > 3000 chars
  → extractTags() : termes en gras + defaultTags
  → upsertFormationKnowledge() par chunk (idempotent, upsert sur source_file+title)
    → Auto-embed background : getEmbedding(title+content) → update embedding
  → Batch embed fallback : getEmbeddings(texts[]) pour chunks sans embedding

Recherche hybride (RPC search_formation_knowledge) :
  → Input : query_text + query_embedding(384d) + filtres (module, session, type)
  → Score = vector_weight * cosine_similarity + text_weight * BM25_rank
  → Seuil : similarity_threshold (default 0.25)
  → Retourne top-N resultats tries par final_score

Consommateurs :
  DM Agent (search_course_content) :
    → Etudiant pose question sur le cours → getEmbedding(query) → search hybride
    → Injecte resultats dans la conversation Claude
  FAQ Agent (auto-search) :
    → Si pas de formationKnowledge explicite → getEmbedding(question) → search hybride
    → Enrichit le contexte Claude avec top-3 resultats
  Exercise Reviewer (contexte session) :
    → getKnowledgeBySession(sessionNumber) → query directe (pas de vector)
    → Injecte contenu pedagogique dans le prompt d'evaluation (max 4000 chars)
```

### Flux 16 : Tsarag Agent — Admin Discord conversationnel

```
Admin ecrit dans #admin (guild channel, role @tsarag verifie)
  → admin-handler.ts intercepte (messageCreate, channel.name === 'admin')
  → Lock sequentiel par channel (pas de traitement concurrent)
  → Conversation state (in-memory, max 50 messages, TTL 60 min)
    → pendingAction (PendingAction | null)
    → executedActionIds (Set<string> — idempotency)
  → runTsaragAgent(context) :
    → System prompt (francais, direct, ton admin)
    → Claude Sonnet tool_use loop (max 8 iterations)
    → Outils READ (7) : list_students, get_student_details, list_pending_exercises,
        get_session_details, list_sessions, search_course_content, get_formation_stats
    → Outils ACTION (2) :
      → propose_action(type, params, summary) → stocke PendingAction avec UUID
      → execute_pending() → execute l'action en attente (avec idempotency check)
    → Pattern : READ → propose_action → "Tu confirmes ?" → confirm → execute_pending
  → Retourne TsaragAgentResponse :
    → text, proposedAction, pendingConsumed, executedActionId, turnMessages
  → admin-handler met a jour conversation state + envoie la reponse
  → Si action executee (approve, revision) → cree event Telegram + DM etudiant

Actions possibles via execute_pending :
  - create_session → DB + Forum Discord + annonce
  - update_session → DB
  - approve_exercise → DB + DM etudiant + event Telegram
  - request_revision → DB + DM etudiant + event Telegram
  - send_announcement → #annonces Discord
  - dm_student → DM via member.createDM()
```

---

## Matrice de Dependances

| Composant | Depend de | Notifie |
|-----------|-----------|---------|
| Core/DB | Supabase | — |
| Core/AI | Claude API, Core/DB | — |
| Core/Cache | Redis (optionnel, fallback gracieux) | — |
| Core/Embeddings | Embedding Server (optionnel, fallback gracieux) | — |
| Core/Context Builder | Core/DB, Core/Cache, Core/Embeddings | — |
| Core/Memory Consolidator | Claude API, Core/DB, Core/Cache | — |
| Core/Scheduler | Core/AI, Core/DB | Bot Admin |
| Core/DM Agent | Claude API, Core/DB (formation), Core/Embeddings, formation_knowledge | — |
| Core/Tsarag Agent | Claude API, Core/DB (formation), Core/Embeddings, formation_knowledge | Bot Admin (events), Discord (annonces, DM, forum) |
| Core/FAQ Agent | Claude API, Core/DB (faq), Core/Embeddings, formation_knowledge | — |
| Core/Exercise Reviewer | Claude API, formation_knowledge (par session) | — |
| Core/Knowledge Base | Supabase (formation_knowledge), Embedding Server | DM Agent, FAQ Agent, Exercise Reviewer, Tsarag Agent |
| Redis | — | Core/Cache |
| Embedding Server | — | Core/Embeddings |
| Bot Admin | Core (AI, DB, Cache, Scheduler) | — |
| Bot Public | Core/DB, Claude API | Bot Admin (leads) |
| Bot Discord | Core (AI, DB, DM Agent, FAQ Agent, Tsarag Agent) | Bot Admin (events) |
| Bot Discord / DM Handler | Core/DM Agent, Supabase Storage | Bot Admin (exercise_submitted) |
| Bot Discord / Admin Handler | Core/Tsarag Agent | Discord (annonces, DM, forum), Bot Admin (events) |
| Bot Discord / Event Dispatcher | Core/DB (events) | Discord channels |
| Bot Discord / Deadline Reminders | Core/DB (sessions, students, exercises) | Etudiants (DM) |
| Bot Discord / Exercise Digest | Core/DB (exercises) | Bot Admin (daily_exercise_digest) |
| Bot Discord / FAQ Handler | Core/FAQ Agent, Core/DB (faq) | Bot Admin (student_alert) |
| Bot Discord / Session Command | Core/DB (sessions) | Discord forum + annonces |

## Ordre de developpement

```
Core (DB + AI + Scheduler) ✅
  └──▶ Bot Telegram Admin ✅
        └──▶ Bot Telegram Public ✅
              └──▶ Agents Specialises (Memory Manager, Research) ✅
                    └──▶ Bot Discord (Phase 3)
                    │     ├── DM Agent + Handler (soumission exercices) ✅
                    │     ├── Tsarag Agent + Admin Handler (gestion formation) ✅
                    │     ├── Session Management (/session) ✅
                    │     ├── FAQ Agent + Handler ✅
                    │     ├── Formation Knowledge Base (RAG pedagogique) ✅
                    │     ├── Event Dispatcher (Discord ↔ Telegram) ✅
                    │     ├── Deadline Reminders (cron) ✅
                    │     └── Exercise Digest (cron) ✅
                    └──▶ Systeme Contenu (Phase 4)
```
