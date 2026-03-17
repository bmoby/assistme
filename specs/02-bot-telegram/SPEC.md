# 02 — Bot Telegram Admin "Copilote"

> **Statut : ✅ IMPLEMENTE**

**Package** : `packages/bot-telegram`
**Librairie** : grammY
**Dependance** : `@assistme/core`

Interface principale de Magomed. Tout passe par la. Push notifications sur iPhone. Zero friction.

---

## 1. Architecture

### Modes d'interaction
1. **Messages push** (bot → user) : plans, rappels, alertes, notifications
2. **Commandes** (user → bot) : `/next`, `/plan`, `/done`, `/kb`, etc.
3. **Texte libre** (user → bot) : capture rapide, orchestrateur IA
4. **Messages vocaux** (user → bot) : Whisper FR → orchestrateur

### Un seul chat
Tout se passe dans un seul chat Telegram avec le bot. Authentifie via `ADMIN_TELEGRAM_ID`.

---

## 2. Commandes implementees ✅

### Gestion des taches
| Commande | Action |
|----------|--------|
| `/start` | Message de bienvenue |
| `/plan` | Plan du jour complet |
| `/next` | Prochaine tache (plus prioritaire) |
| `/done` | Marque tache en cours comme terminee |
| `/add [texte]` | Ajouter tache (IA categorise et priorise) |
| `/tasks` | Toutes les taches actives |
| `/skip` | Passe la tache actuelle |

### Gestion clients
| Commande | Action |
|----------|--------|
| `/clients` | Pipeline clients |

### Gestion connaissances
| Commande | Action |
|----------|--------|
| `/kb` | Voir toutes les connaissances publiques |
| `/kb [categorie]` | Voir par categorie |
| `/kb set [cat] [key] [content]` | Ajouter/modifier |
| `/kb del [cat] [key]` | Supprimer |

### Notifications dynamiques
| Commande | Action |
|----------|--------|
| `/notifs` | Voir le statut des notifications (envoyees, en attente, prochaines) |
| `/notifs [nombre]` | Changer le nombre de notifications/jour (1-50) et replanifier |
| `/replan` | Forcer une replanification des notifications pour le reste de la journee |

### Commandes futures (Phase 3+)
| Commande | Phase |
|----------|-------|
| `/assign [client] [membre]` | Phase 3 |
| `/proposal [client]` | Phase 3 |
| `/research [client]` | Phase 3 |
| `/students`, `/student [nom]`, `/reviews` | Phase 3 |
| `/week`, `/stats`, `/sport`, `/mood` | Phase 4 |

---

## 3. Texte libre → Orchestrateur ✅

Quand l'utilisateur envoie un message qui n'est pas une commande :

```
"Ahmed veut un site, budget 2000€" → create_client + note
"J'ai fini la proposition pour Ahmed" → complete_task
"Change le prix de la formation a 2500" → manage_memory → Memory Manager
"Fais une recherche sur le marche IA en 2026" → start_research → Research Agent
"J'ai un client Ahmed, boulangerie artisanale" → create_client + start_client_discovery → Client Discovery Agent
```

**Flow :**
1. `addMessage(chatId, 'user', text)` — historique conversation
2. `formatHistoryForPrompt(chatId)` — derniers 20 messages
3. `processWithOrchestrator(text, history)` — orchestrateur
4. Si `manage_memory` → appelle `processMemoryRequest()` → envoie resultat
5. Si `start_client_discovery` → appelle `runClientDiscoveryAgent()` → envoie questions
6. Si `start_research` → appelle `runResearchAgent()` → envoie rapport
7. Sinon → envoie `result.response`

---

## 4. Messages vocaux ✅

Meme flow que texte libre mais avec transcription Whisper en amont :

```
Voice message → fetch Telegram file → Buffer
  → transcribeAudio(buffer, 'voice.ogg', 'fr')
  → Affiche transcription : "texte"
  → Meme flow que texte libre
```

---

## 5. Historique de conversation ✅

**Fichier** : `src/utils/conversation.ts`

- In-memory `Map<chatId, messages[]>`
- Max 20 messages par chat
- TTL : 1 heure (nettoyage auto)
- Injecte dans le system prompt de l'orchestrateur comme "HISTORIQUE DE CONVERSATION RECENTE"

---

## 6. Notifications dynamiques ✅

Systeme de notifications intelligent pilote par l'IA. Remplace les 5 crons fixes.

**Architecture :**
- L'IA planifie toutes les notifications de la journee a 07:00
- Le nombre est configurable par l'utilisateur (default : 15/jour)
- Un dispatcher verifie les notifications dues toutes les 2 minutes
- Les notifications sont stockees dans la table `reminders` de Supabase

**Crons :**
| Cron | Frequence | Action |
|------|-----------|--------|
| `daily-notification-plan` | 07:00 quotidien | Appelle le Notification Planner → stocke dans `reminders` |
| `notification-dispatcher` | Toutes les 2 min | Envoie les notifications dont `trigger_at <= NOW()` |

**Types de notifications generes par l'IA :**
- `morning_start`, `progress_check`, `focus_probe`, `blocker_check`
- `client_followup`, `motivation`, `planning`, `accountability`
- `reflection`, `evening_review`, `sleep_reminder`

**Fichiers :**
- `src/cron/index.ts` — Enregistrement des 2 crons dynamiques
- `src/cron/dynamic-notifications.ts` — `planDay()`, `dispatchNotifications()`, `getNotificationsSummary()`
- `src/commands/notifs.ts` — Commandes `/notifs` et `/replan`

**Commandes utilisateur :**
- `/notifs` — Voir le statut (envoyees / en attente / prochaines)
- `/notifs 20` — Changer le nombre et replanifier
- `/replan` — Forcer une replanification immediate

---

## 7. Notifications entrantes (futurs)

| Source | Notification |
|--------|-------------|
| Bot Public | "Nouveau lead qualifie : [nom] - [besoin]" |
| Bot Discord | "Exercice soumis par [eleve]" |
| Bot Discord | "Question equipe sur projet [client]" |
| Core/Cron | Rappels planifies |
| Core/Cron | "Client [nom] attend une reponse depuis 24h" |

---

## 8. Message splitting ✅

Telegram limite les messages a 4096 caracteres. La fonction `sendLongMessage()` split automatiquement :
1. Par paragraphes (`\n\n`)
2. Par lignes (`\n`) si un paragraphe depasse la limite
3. Envoie chaque chunk separement

---

## 9. Dependances

```json
{
  "grammy": "^1.x",
  "@assistme/core": "workspace:*"
}
```
