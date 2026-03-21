# Spec — Agent admin Tsarag (Bot Discord)

> **Statut : IMPLEMENTE**
> Agent conversationnel dans le canal #admin pour gerer la formation via messages libres.

---

## 1. Vue d'ensemble

### Le probleme

Le formateur (Magomed) doit gerer 30 etudiants, des sessions, des exercices, des annonces. Les commandes slash (`/approve`, `/session`, etc.) existent mais sont rigides — il faut se souvenir de la syntaxe exacte, choisir le bon autocomplete, et chaque operation necessite une commande separee.

### La solution

Un agent IA conversationnel dans le canal `#admin` (visible uniquement par le role `@tsarag`). Le formateur ecrit en langage naturel, en francais. L'agent :
- Comprend l'intention (lister etudiants, approuver un exercice, creer une session...)
- Collecte les infos manquantes via des outils READ
- Propose l'action a effectuer et attend confirmation
- Execute apres confirmation explicite

### Principes

| Principe | Detail |
|----------|--------|
| **Langue** | Francais avec l'admin. Russe pour tout contenu destine aux etudiants. |
| **Propose avant d'agir** | Toute operation d'ecriture passe par le pattern propose → confirm → execute. |
| **Idempotent** | Chaque action a un UUID. Re-executer un execute_pending deja fait retourne `already_executed`. |
| **Direct** | Ton efficace, tutoiement, proactif (signale problemes et opportunites). |

---

## 2. Architecture

### Flux

```
Message dans #admin (role @tsarag verifie)
    |
    v
admin-handler.ts (bot-discord)
    |
    v
Conversation state (in-memory, par channel)
  - messages: AdminConversationMessage[] (max 50, TTL 60 min)
  - pendingAction: PendingAction | null
  - executedActionIds: Set<string>
    |
    v
runTsaragAgent(context) (core/ai/formation/tsarag-agent.ts)
    |
    v
Claude Sonnet (tool_use loop, max 8 iterations)
    |
    v
TsaragAgentResponse {
  text, actionsPerformed, proposedAction,
  pendingConsumed, turnMessages, executedActionId
}
    |
    v
admin-handler met a jour la conversation + envoie la reponse
```

### Modele

- `claude-sonnet-4-6` (rapide, bon en tool_use)
- `max_tokens: 2048`
- System prompt injecte dynamiquement (avec pending action context si applicable)

### Conversation state

| Champ | Type | Detail |
|-------|------|--------|
| `messages` | `AdminConversationMessage[]` | Historique complet (user + assistant + tool_use + tool_result). Max 30 messages. |
| `pendingAction` | `PendingAction \| null` | Action proposee en attente de confirmation. |
| `executedActionIds` | `Set<string>` | UUIDs des actions deja executees (protection idempotency). |
| `lastActivityAt` | `Date` | Timestamp derniere activite. TTL 60 min. |

Le state est **par channel** (pas par user) — il n'y a qu'un seul admin.

---

## 3. Outils (Tools)

### 3.1 Outils READ (7)

Aucun effet de bord. L'agent les appelle librement pour collecter des informations.

| Outil | Description | Parametres |
|-------|-------------|------------|
| `list_students` | Lister les etudiants de la session 2 | `status_filter?` (interested, registered, paid, active, completed, dropped) |
| `get_student_details` | Profil + progression d'un etudiant | `student_name` (recherche fuzzy) |
| `list_pending_exercises` | Exercices en attente de correction | aucun |
| `get_session_details` | Details d'une session | `session_number` |
| `list_sessions` | Toutes les sessions | aucun |
| `search_course_content` | Recherche hybride dans formation_knowledge | `query`, `session_number?`, `module?` |
| `get_formation_stats` | Stats agregees (etudiants, exercices, sessions) | aucun |

### 3.2 Outils ACTION (2)

Le pattern propose/confirm/execute garantit que l'admin valide avant toute operation d'ecriture.

#### `propose_action`

Propose une operation d'ecriture. Stocke l'action en attente avec un UUID unique.

**Validation de langue :** les champs destines aux etudiants (title, description, exercise_description, expected_deliverables, exercise_tips, text, message, feedback) sont verifies par une heuristique cyrillique. Si un champ semble ne pas etre en russe, un warning est ajoute au resume pour alerter l'admin.

**Types d'actions :**

| Type | Parametres | Effet |
|------|------------|-------|
| `create_session` | session_number, module, title, description?, exercise_description?, expected_deliverables?, exercise_tips?, deadline?, video_url?, status? | Cree session en DB + post Forum + annonce Discord |
| `update_session` | session_number, + champs a modifier | Met a jour session en DB |
| `approve_exercise` | student_name, feedback? (russe), exercise_id? | Approuve exercice + DM etudiant + event Telegram. Retourne `dm_sent` + warning si echec DM. |
| `request_revision` | student_name, feedback (russe), exercise_id? | Demande revision + DM etudiant + event Telegram. Retourne `dm_sent` + warning si echec DM. |
| `send_announcement` | text (russe), mention_students? | Poste dans #annonces |
| `dm_student` | student_name, message (russe) | Envoie un DM a l'etudiant |

#### `execute_pending`

Execute l'action en attente. Aucun parametre — execute ce qui a ete propose.

**Gardes :**
1. Si aucune action en attente → erreur `no_pending`
2. Si l'action a deja ete executee ce tour → `already_executed`
3. Si l'UUID est dans `executedActionIds` → `already_executed` (idempotency)

---

## 4. Pattern pending action

Le flow obligatoire pour toute operation d'ecriture :

```
Admin: "approuve l'exercice de Ahmed"
    |
    v
Agent: appelle get_student_details("Ahmed") → profil + exercices
Agent: appelle propose_action(approve_exercise, {student_name: "Ahmed"}, "Approuver l'exercice M1-Z1 de Ahmed")
Agent: "Je vais approuver l'exercice M1-Z1 de Ahmed. Tu confirmes ?"
    |
    v
Admin: "oui"
    |
    v
Agent: appelle execute_pending()
Agent: "Exercice approuve. Ahmed a recu un DM de confirmation."
```

**Variantes :**
- Admin dit "change le feedback" → Agent appelle `propose_action` avec les nouveaux params (remplace le precedent)
- Admin dit "annule" → Agent abandonne (ni propose ni execute)
- Admin dit "oui" apres un long delai → L'action est toujours en memoire (TTL 60 min)

---

## 5. Protection double-execution

Deux couches de protection empechent l'execution multiple d'une meme action :

### Couche 1 — Historique ContentBlock

Les messages `tool_use` + `tool_result` complets sont stockes dans l'historique de conversation. Claude voit qu'il a deja appele `execute_pending` et recu un resultat — il ne rappelle pas.

### Couche 2 — Idempotency UUID

Chaque `PendingAction` a un `id: string` (UUID v4). Quand `execute_pending` s'execute :
1. Verifie `context.executedActionIds.has(pendingAction.id)`
2. Si deja present → retourne `already_executed` sans rien faire
3. Sinon → execute, ajoute l'ID au set

Le handler (admin-handler.ts) persiste les IDs dans `conv.executedActionIds` pour la duree de la conversation.

### Flag `pendingExecutedThisTurn`

Empeche deux appels a `execute_pending` dans le meme tour de boucle tool_use (si Claude genere deux tool_use blocks dans une seule reponse).

---

## 6. Discord action callbacks

L'agent ne communique pas directement avec Discord. Il recoit un objet `DiscordActionCallbacks` injecte par le handler :

| Callback | Utilise par | Effet |
|----------|-------------|-------|
| `sendAnnouncement(text, mentionStudents)` | `send_announcement`, `create_session` | Poste dans #annonces, mentionne @student si demande |
| `sendToSessionsForum(number, title, content, module)` | `create_session` | Cree un thread dans le Forum, applique tag module, retourne thread ID |
| `dmStudent(discordId, message)` | `approve_exercise`, `request_revision`, `dm_student` | Envoie un DM via `member.createDM()` |

---

## 7. Fichiers

| Fichier | Role |
|---------|------|
| `packages/core/src/ai/formation/tsarag-agent.ts` | Agent core : system prompt, tools, tool handlers, boucle tool_use |
| `packages/bot-discord/src/handlers/admin-handler.ts` | Handler Discord : conversation state, callbacks Discord, message routing |
| `packages/bot-discord/src/config.ts` | Configuration canaux/roles (CHANNELS.admin) |
| `packages/core/src/types/index.ts` | Types : TsaragAgentContext, TsaragAgentResponse, PendingAction, AdminConversationMessage |

---

## 8. Dependances

| Dependance | Usage |
|------------|-------|
| `@anthropic-ai/sdk` | Appels Claude API (tool_use) |
| `core/db/formation/*` | CRUD students, exercises, sessions, events, knowledge |
| `core/ai/embeddings` | Embeddings pour search_course_content |
| `discord.js` | Callbacks Discord (Forum, DM, annonces) |

---

*Ce document est la source de verite pour l'agent admin Tsarag. Tout ecart entre le code et cette spec est un bug.*
