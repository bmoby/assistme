# 04 — Bot Discord "Formateur"

> **Statut : Phase 3 — En cours (DM Agent)**

**Package** : `packages/bot-discord`
**Librairie** : discord.js
**Dependance** : `@assistme/core`

Gestion automatisee des etudiants (session 2 : 30 eleves) et de l'equipe (6 membres). Decharge le travail repetitif de formation et de management.

---

## 1. Structure du serveur Discord

### Categories et canaux
```
GENERAL
  #annonces           (lecture seule, bot poste)
  #regles             (lecture seule)
  #presentations      (etudiants se presentent)
  #wins-et-victoires  (etudiants partagent leurs victoires)

FORMATION SESSION 2
  #programme          (syllabus, planning)
  #faq                (questions automatiques)
  #exercices          (soumission + file d'attente)
  #ressources         (videos, PDFs, liens)
  #entraide           (etudiants s'aident entre eux)
  #lives              (annonces de live + enregistrements)
  #retours-chaos      (retours de l'exercice chaos Module 2, session 5)

EQUIPE
  #projets-clients    (un thread par projet)
  #briefs             (briefs auto-generes)
  #general-equipe     (discussion equipe)

ADMIN (visible seulement par le formateur)
  #logs               (toutes les actions du bot)
  #alertes            (notifications importantes)
```

**Note pods** : Les pods peuvent utiliser des threads dans #entraide ou des canaux vocaux temporaires. Pas de canaux texte dedies par pod pour l'instant.

### Roles
- `@Formateur` : Admin, toutes permissions
- `@Equipe` : Acces categorie equipe
- `@Session2` : Acces categorie formation session 2
- `@Session1` : Anciens eleves / alumni-mentors

**Sans `@Session2`** : un membre ne voit que #annonces et #regles.

---

## 2. Authentification et verification

### Flux d'inscription

```
Admin : /add-student Ahmed @discord_user [pod:3]
  → Cree student record dans Supabase (discord_id lie)
  → Assigne le role @Session2 si l'utilisateur Discord est fourni
  → L'etudiant a immediatement acces aux canaux de formation
```

### Regles

- **Pas de self-registration.** L'admin EST la verification. Seul `/add-student` cree un compte etudiant.
- **Auto-verification au join** : quand un membre rejoint le serveur, le handler `guildMemberAdd` verifie si son `discord_id` est pre-enregistre dans `students`. Si oui → role `@Session2` assigne automatiquement + DM de bienvenue.
- **Membre non-enregistre** : recoit un DM generique invitant a contacter le formateur. Acces limite a #annonces et #regles.

### Controle d'acces des commandes

- Admin : verifie via le role `@Formateur` (`isAdmin()`)
- Etudiant : verifie via le role `@Session2` (`isStudent()`) puis lookup `students` par `discord_id` (`getStudentFromInteraction()`)

---

## 3. Pods

- **7-8 pods** de 3-4 etudiants chacun
- Champ `pod_id` (integer, 1-8) dans la table `students`
- Assigne via `/add-student [nom] [discord?] [pod?]`
- Chaque pod a un alumni-mentor attribue (voir section 4)
- Les pods servent pour : exercices en groupe, peer review, entraide, accountability

---

## 4. Alumni-mentors

- **6 alumni de la Session 1** operationnels dans l'equipe
- Chaque alumni-mentor accompagne **~5 etudiants** (1-2 pods)
- Role Discord : `@Session1`
- Responsabilites : support premier niveau, feedback exercices, check-in hebdo avec les pods
- L'effet proteges : mentorer les autres renforce les competences des alumni eux-memes

---

## 5. Ceremonies

Reference detaillee : `learning-knowledge/programme.md`

| Ceremonie | Quand | Objectif |
|-----------|-------|----------|
| **Kick-Off** | Session 1 | Histoire + alumni S1 (5 min) + journey map + Quick Win + tour de table + regles |
| **Mi-parcours** | Semaine 5-6 | Retrospective + celebration progres + preview phase 2 |
| **Pitch projets** | Semaine 9 | Chaque etudiant presente son projet (5 min) |
| **Demo Day** | Semaine 12 | Presentation finale — projet teste avec un vrai utilisateur. Gate d'acces a `#equipe` |

---

## 6. Fonctionnalites etudiants

### 6.1 FAQ Automatique (#faq)

1. Etudiant pose une question en russe dans #faq
2. Bot analyse avec Claude API (`core/src/ai/formation/faq-agent.ts`) — recherche hybride dans la base FAQ + formation_knowledge
3. Si reponse connue (confidence > 70%) → repond automatiquement **en russe**
4. Si pas sur → "Я не уверен в ответе. Тренер ответит тебе лично." + event `student_alert` pour l'admin
5. Reponse du formateur/mentor ajoutee a la base automatiquement (avec deduplication — les questions similaires ne creent pas de doublons)

### 6.2 Soumission d'exercices (#exercices)

**Commande** : `/submit [lien] [module] [exercice]`

**Flow :**
```
Etudiant soumet via DM (ou /submit lien:... module:N exercice:N)
Bot : Exercice recu !
  → Log dans student_exercises (status: 'submitted')
  → Event 'exercise_submitted' cree (→ digest Telegram admin)
```

**Regles :**
- Deadline configurable par exercice via `/deadline`
- Rappels 48h et 24h avant deadline
- File d'attente visible (chaque etudiant voit sa position)

**Statuts d'exercice :**
| Statut | Description |
|--------|-------------|
| `submitted` | Soumis par l'etudiant, en attente de review |
| `ai_reviewed` | Pre-review IA (legacy, backward compat) |
| `reviewed` | Review manuelle en cours |
| `approved` | Approuve par le formateur |
| `revision_needed` | Revision demandee |
| `archived` | Archive par session — invisible dans les digests, pending lists, et review buttons |

**Archivage :** La commande `/archive-session [session]` archive en bulk tous les exercices archivables (`submitted`, `approved`, `revision_needed`) d'une session. Les exercices archives restent en base mais ne sont plus affiches dans aucun workflow actif (digests, notifications, review). L'archivage est irreversible en v1.

### 6.3 Ressources (#ressources)

**Commande admin** : `/resource [module] [titre] [lien?] [description?]`
- Post automatique dans #ressources

### 6.4 Lives (#lives)

**Commande admin** : `/live [date] [heure] [sujet]`
- Annonce automatique dans #lives
- Rappels 1h et 15min avant

### 6.5 Rappels automatiques

| Evenement | Rappel |
|-----------|--------|
| 48h avant deadline | Rappel dans #exercices |
| 24h avant deadline | Dernier rappel |
| Nouveau cours | Notification dans #ressources |
| Live dans 1h/15min | Rappels dans #lives |
| Inactivite 7 jours | Detection dropout + alerte formateur |

---

## 7. Fonctionnalites equipe

### 7.1 Projets clients (#projets-clients)

Quand un projet est assigne (via `/assign` sur Telegram) :
- Thread cree dans #projets-clients
- Brief auto-genere (recherche metier IA + proposition)
- @TeamMember notifie
- Etapes listees avec checkboxes

### 7.2 Mise a jour de statut

**Commande membre** : `/status [etape terminee]`
- Met a jour le thread du projet
- Notifie le formateur via Telegram

### 7.3 Resume equipe (hebdomadaire)

CRON lundi 09:00 → Notification Telegram :
- Statut de chaque membre et projet
- Actions recommandees

---

## 8. Commandes

### Etudiants
Les etudiants n'utilisent PAS de commandes slash. Ils communiquent via DM avec le bot (agent conversationnel IA). Voir `SPEC-DM-AGENT.md`.

### Formateur (admin)
| Commande | Action |
|----------|--------|
| `/session [номер] [название] [модуль]` | Creer une session (post Forum + DB) ✅ |
| `/session-update [номер] [задание?] [формат?] [дедлайн?] [видео?] [replay?] [советы?]` | Mettre a jour une session ✅ |
| `/add-student [имя] [discord?] [под?]` | Ajouter un etudiant ✅ |
| `/announce [текст]` | Annonce dans #объявления ✅ |
| `/review [студент]` | Voir pre-review IA d'un etudiant ✅ |
| `/approve [студент] [отзыв?]` | Approuver exercice ✅ |
| `/revision [студент] [отзыв]` | Demander revision ✅ |
| `/students` | Lister tous les etudiants ✅ |
| `/archive-session [session]` | Archiver tous les exercices d'une session (confirmation + bulk) ✅ |

### Mentor
| Commande | Action |
|----------|--------|
| `/review [студент]` | Voir les exercices (lecture seule) ✅ |

### Commandes supprimees
| Ancienne commande | Remplacee par |
|-------------------|---------------|
| `/submit` | DM agent conversationnel |
| `/progress` | DM agent conversationnel |
| `/live` | `/session` (post Forum) |
| `/deadline` | `/session-update` |
| `/resource` | `/session` (post Forum) |

---

## 9. Architecture d'isolation

Le bot Discord est **isole** du systeme personnel (admin copilote). Il ne touche que les donnees de formation.

### Imports autorises
- `core/src/db/formation/` — students, exercises, faq, events
- `core/src/ai/formation/` — faq-agent, dm-agent, tsarag-agent

### Imports INTERDITS
- `core/src/db/memory/`, `core/src/db/tasks/`, `core/src/db/clients/`
- `core/src/ai/orchestrator/`, `core/src/ai/agents/`
- `core/src/scheduler/daily-plans/`
- Tout ce qui touche aux donnees personnelles de l'admin

### Separation des donnees
- Les etudiants ne voient JAMAIS les donnees admin (memoire, taches, clients)
- Le bot Discord n'a acces qu'aux tables `students`, `student_exercises`, `faq_entries`, `events`

### Debranchable
Le systeme formation peut etre "debranche" en supprimant :
1. `packages/bot-discord/`
2. `packages/core/src/db/formation/`
3. `packages/core/src/ai/formation/`

Le reste du systeme (Telegram admin, core) continue de fonctionner sans modification.

---

## 10. Communication inter-bots

### Table `events` comme file de messages

Les bots communiquent via une table `events` dans Supabase (pas d'appels directs entre bots).

**Discord → Telegram admin :**
| Type d'event | Quand | Donnees |
|--------------|-------|---------|
| `exercise_submitted` | Etudiant soumet un exercice | student_name, module, exercise_number, ai_score, ai_recommendation |
| `student_alert` | Probleme detecte (dropout, etc.) | student_name, alert_type, details |
| `daily_exercise_digest` | Digest quotidien | exercices du jour, stats |

**Telegram admin → Discord :**
| Type d'event | Quand | Donnees |
|--------------|-------|---------|
| `announcement` | Admin envoie une annonce | texte, canal cible |

### Cron jobs (formation)

| Job | Schedule | Action |
|-----|----------|--------|
| `formation-exercise-digest` | Tous les jours a 20h (`0 20 * * *`) | Envoie le digest d'exercices au formateur |
| `formation-dropout-detector` | Lundi a 10h (`0 10 * * 1`) | Detection des etudiants a risque de decrochage |
| `formation-event-dispatcher` | Toutes les 5 min (`*/5 * * * *`) | Traite les events en attente (Telegram → Discord) |
| `formation-deadline-48h` | Tous les jours a 10h (`0 10 * * *`) | DM rappel 48h avant deadline (etudiants n'ayant pas soumis) ✅ |
| `formation-deadline-24h` | Tous les jours a 10h (`0 10 * * *`) | DM rappel 24h avant deadline (urgent) ✅ |

---

## 11. Additions Core

- CRUD `students` + `student_exercises` (`core/src/db/formation/students.ts`, `exercises.ts`) ✅
- CRUD `faq_entries` (`core/src/db/formation/faq.ts`) ✅
- CRUD `events` (`core/src/db/formation/events.ts`) ✅
- CRUD `sessions` (`core/src/db/formation/sessions.ts`) ✅
- CRUD `submission_attachments` (`core/src/db/formation/attachments.ts`) ✅
- Agent FAQ (`core/src/ai/formation/faq-agent.ts`) ✅
- **Agent DM conversationnel** (`core/src/ai/formation/dm-agent.ts`) ✅ — voir `SPEC-DM-AGENT.md`
  - Claude tool_use avec 5 outils (get_student_progress, get_session_exercise, create_submission, get_pending_feedback, search_course_content)
  - System prompt en russe, boucle d'execution des outils
  - Remplace les commandes `/submit` et `/progress` pour les etudiants

---

## 12. Dependances

```json
{
  "discord.js": "^14.16.0",
  "@assistme/core": "workspace:*",
  "dotenv": "^17.3.1"
}
```

**Variables d'environnement requises :**
- `DISCORD_BOT_TOKEN` — Token du bot Discord
- `DISCORD_GUILD_ID` — ID du serveur Discord
- `DISCORD_CLIENT_ID` — ID de l'application Discord (necessaire pour l'enregistrement des slash commands via REST API)
- `DISCORD_ADMIN_USER_ID` — ID Discord de l'admin (pour les notifications directes)

---

## 13. Priorite de developpement

### Essentiel (avant session 2) ✅
- Structure serveur Discord (categories, canaux, roles)
- Authentification (add-student + auto-verification guildMemberAdd)
- `/submit` + pre-review IA + file d'attente
- `/resource`, `/live`, `/deadline`
- `/review`, `/approve`, `/revision`
- FAQ automatique
- Cron jobs (digest, dropout, event dispatcher)
- Communication inter-bots via events

### Ameliorations (apres lancement)
- Briefs auto-generes pour l'equipe
- Suivi de statut des projets clients
- Resume equipe hebdomadaire
- Gamification (leaderboard, badges)
