# CONNEXIONS — Flux de donnees entre composants

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐
│  Bot Telegram Admin  │     │  Bot Telegram Public  │
│  (Copilote, FR)      │     │  (Audience, RU)       │
└──────────┬──────────┘     └──────────┬───────────┘
           │                           │
           ▼                           ▼
┌──────────────────────────────────────────────────┐
│                     CORE                          │
│                                                   │
│  ┌──────────────┐  ┌────────────────────┐        │
│  │ Orchestrator  │  │  Memory Manager    │        │
│  │ (routeur)     │─▶│  (agent specialise)│        │
│  └──────┬───────┘  └────────────────────┘        │
│         │          ┌────────────────────┐        │
│         ├─────────▶│  Research Agent     │        │
│         │          └────────────────────┘        │
│         │          ┌────────────────────┐        │
│         ├─────────▶│  Memory Agent (bg)  │        │
│         │          └────────────────────┘        │
│         │          ┌────────────────────┐        │
│         ├─────────▶│  Notif Planner      │        │
│         │          └────────────────────┘        │
│         │          ┌────────────────────┐        │
│         └─────────▶│  Context Builder    │        │
│                    └────────┬───────────┘        │
│                             │                    │
│  ┌──────────────────────────┴─────────────────┐  │
│  │              Supabase                       │  │
│  │  memory | public_knowledge | tasks          │  │
│  │  clients | daily_plans | reminders | events │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌──────────────┐  ┌──────────────────────┐      │
│  │  Scheduler    │  │  Transcription       │      │
│  │  (crons)      │  │  (Whisper FR/RU)     │      │
│  └──────────────┘  └──────────────────────┘      │
└──────────────────────────────────────────────────┘
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

### Flux 6 : Contexte Dynamique (chaque requete orchestrateur)

```
buildContext() →
  Couche 1 — Memoire personnelle :
    identity, situation, preference, relationship, lesson
  Couche 2 — Donnees live :
    Taches actives (max 15), Pipeline clients
  Couche 3 — Public Knowledge :
    formation, services, faq, free_courses, general (contenu complet)
  Couche 4 — Temporel :
    Date/heure en francais
→ Injecte dans system prompt de l'orchestrateur
```

### Flux 7 : Capture rapide (Admin texte libre)

```
Bot Telegram Admin : "Ahmed veut un site, budget 2000€"
  → Orchestrator : parse avec Claude → create_client + create_task
  → DB : nouveau client + nouvelle tache
  → Memory Agent (background) : detecte relationship Ahmed
  → Bot : "Client Ahmed cree. Tache ajoutee."
```

---

## Flux Futurs (Phase 3+)

### Discord Formateur

```
Etudiant soumet exercice → Discord /submit → Supabase queue
  → IA pre-review → Notification admin groupee (1x/jour)
  → Review manuelle → Feedback etudiant

Formateur /assign → Telegram → Brief auto-genere
  → Thread Discord cree → @TeamMember notifie
  → Status updates → Resume hebdo
```

---

## Matrice de Dependances

| Composant | Depend de | Notifie |
|-----------|-----------|---------|
| Core/DB | Supabase | — |
| Core/AI | Claude API, Core/DB | — |
| Core/Scheduler | Core/AI, Core/DB | Bot Admin |
| Bot Admin | Core (AI, DB, Scheduler) | — |
| Bot Public | Core/DB, Claude API | Bot Admin (leads) |
| Bot Discord | Core (AI, DB) | Bot Admin |

## Ordre de developpement

```
Core (DB + AI + Scheduler) ✅
  └──▶ Bot Telegram Admin ✅
        └──▶ Bot Telegram Public ✅
              └──▶ Agents Specialises (Memory Manager, Research) ✅
                    └──▶ Bot Discord (Phase 3)
                          └──▶ Systeme Contenu (Phase 4)
```
