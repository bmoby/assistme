# ROADMAP — Vibe Coder

Systeme multi-bots connectes a un cerveau central (Supabase + Claude API).
Developpement par phases, chaque phase livre un composant fonctionnel.

---

## Phase 0 — Infrastructure ✅

*Jour 1 — Termine*

- [x] Initialiser le monorepo pnpm workspaces
- [x] Config TypeScript strict, ESM modules
- [x] Creer le package `core`
- [x] Configurer Supabase (tables, indexes, migrations)
- [x] Variables d'environnement (.env)
- [x] Setup Git + GitHub prive
- [x] Creer le bot Telegram admin via @BotFather
- [x] Tester connexion Supabase + Claude API

**Livrable** : Monorepo fonctionnel avec core connecte a Supabase et Claude API.

---

## Phase 1 — Cerveau Central + Bot Telegram Admin ✅

*Jours 2-5 — Termine*

### Core (`packages/core`)
- [x] Client Claude API generique (Sonnet / Opus / Haiku)
- [x] Client Supabase + CRUD : tasks, daily_plans, memory, clients
- [x] Orchestrateur : analyse message → actions → reponse
- [x] Context Builder dynamique (4 couches : memoire + live + public_knowledge + temporel)
- [x] Memory Agent background (auto-update memoire apres chaque message)
- [x] Transcription audio via Whisper (multi-langue FR/RU)
- [x] Scheduler : crons push (plan matinal, anti-procrastination, bilan soir)
- [x] Logger pino + Types TypeScript complets

### Bot Telegram Admin (`packages/bot-telegram`)
- [x] Authentification admin (ADMIN_TELEGRAM_ID)
- [x] Commandes : /start, /plan, /next, /done, /add, /tasks, /skip, /clients, /kb
- [x] Capture libre texte → orchestrateur
- [x] Messages vocaux → Whisper FR → orchestrateur
- [x] Historique de conversation (in-memory, 20 msgs, 1h TTL)
- [x] Crons push : plan matinal 08:30, anti-procrastination 11:00, check 14:00, bilan 19:00, rappel sommeil 00:00
- [x] Splitting messages longs (>4096 chars)

**Livrable** : Bot Telegram admin operationnel avec orchestrateur intelligent, memoire evolutive, vocal, et rappels.

---

## Phase 2 — Bot Telegram Public + Agents Specialises ✅

*Jours 6-10 — Termine*

### Bot Telegram Public (`packages/bot-telegram-public`)
- [x] Interface en russe pour l'audience
- [x] Reponses basees sur la table `public_knowledge` (formation, services, FAQ, cours gratuits)
- [x] Messages vocaux en russe (Whisper)
- [x] Detection de leads via tags caches `[LEAD:...]`
- [x] Notification admin automatique via API Telegram
- [x] Historique de conversation (in-memory, 20 msgs, 30min TTL)
- [x] Migration seed ~20 entrees de connaissances publiques

### Memory Manager Agent (`packages/core/src/ai/memory-manager.ts`)
- [x] Agent specialise pour TOUTES les operations memoire
- [x] Gere `memory` (perso) + `public_knowledge` (bot public)
- [x] Charge l'etat complet des deux tables avant chaque operation
- [x] Modifications chirurgicales (change uniquement la partie concernee)
- [x] Confirmation avec diff (ancien → nouveau)
- [x] Declenchement via action `manage_memory` de l'orchestrateur

### Research Agent (`packages/core/src/ai/research-agent.ts`)
- [x] Recherches approfondies sur un sujet
- [x] Texte structure libre (maxTokens 16000)
- [x] Inclut contexte memoire si pertinent
- [x] Declenchement via action `start_research` de l'orchestrateur

**Livrable** : Bot public fonctionnel + agents specialises (memoire + recherche).

---

## Phase 3 — Formation Session 2 + Bot Discord 🚧

*Quasi-complet — reste : notifications groupees, CRUD team members*

### Organisation Formation (`learning-knowledge/CURRICULUM.md`)
- [x] Recherches approfondies (psychologie, pedagogie, structure programme)
- [x] Structurer le curriculum (modules, sujets, progression)
- [x] Designer les exercices et livrables
- [x] Concevoir les outils et l'automatisation

### Bot Discord (`packages/bot-discord`)
- [x] Structure serveur (ОБЩЕЕ, ОБУЧЕНИЕ, ПОДЫ, АДМИН)
- [x] Systeme de roles (@tsarag, @student, @mentor)
- [x] FAQ automatique (#faq) avec base de connaissances
- [x] Pre-review IA des exercices (exercise-reviewer.ts)
- [x] Agent DM conversationnel — remplace /submit et /progress (`SPEC-DM-AGENT.md`)
- [x] Handler DM (upload fichiers Supabase Storage, queue par etudiant, memoire conversation)
- [x] Agent admin Tsarag — assistant conversationnel dans #admin (`SPEC-TSARAG-AGENT.md`)
- [x] Commande `/session` (cree post Forum + DB)
- [x] Commande `/session-update` (met a jour exercice/deadline)
- [x] Role mentor (isMentor, /review + FAQ pour mentors)
- [x] Crons rappels (deadline 48h/24h via DM)
- [ ] Notifications groupees vers bot admin (1x/jour)
- [x] Nettoyage anciennes commandes (/submit, /progress, /live, /deadline, /resource)

### Core — Additions Phase 3
- [x] CRUD Students + Student Exercises
- [x] CRUD Sessions + Submission Attachments
- [x] CRUD FAQ Entries + Events
- [x] Agent pre-review exercices
- [x] Agent FAQ
- [x] Agent DM conversationnel (Claude tool_use, 5 outils dont search_course_content)
- [x] Agent admin Tsarag (Claude tool_use, 9 outils, pattern propose/confirm/execute)
- [x] Knowledge Base formation (table formation_knowledge, recherche hybride vector+BM25)
- [ ] CRUD Team Members
- [ ] Generation briefs clients

### Migrations DB
- [x] 004_students_system.sql (students, student_exercises, faq_entries)
- [x] 005_sessions_system.sql (sessions, submission_attachments, session_id FK)
- [x] 008_hybrid_search_decay.sql (BM25 + temporal decay sur memory)
- [x] 009_agent_jobs.sql (jobs asynchrones pour agents)
- [x] 010_formation_knowledge.sql (formation_knowledge, pgvector 384d, tsvector, RPC hybrid search)

### Knowledge Base Formation
- [x] Table formation_knowledge (embeddings MiniLM-L6-v2, BM25 tsvector, tags)
- [x] RPC search_formation_knowledge() (hybrid : vector cosine + BM25 + filtres)
- [x] Module DB knowledge.ts (upsert, search, getBySession, getByModule)
- [x] Seed script idempotent (pnpm seed:knowledge) — 14 fichiers markdown, chunking H2/H3
- [x] Integration DM Agent : outil search_course_content (query + session + module)
- [x] Integration FAQ Agent : auto-search knowledge si pas de contexte explicite
- [x] Integration Exercise Reviewer : charge contenu session pour evaluer en contexte

### Reste a faire
- [ ] Notifications groupees vers bot admin (event dispatcher daily digest)
- [ ] CRUD Team Members (table existe, pas de module DB/AI)
- [ ] Generation briefs clients (Phase 3/4 overlap)

**Livrable** : Discord pret pour la session 2 avec agent DM, agent admin Tsarag, exercices multi-format, et FAQ.

---

## Phase 4 — Systeme Contenu + Ameliorations 📋

*Futur*

- [ ] Veille automatique (cron hebdomadaire, tendances tech)
- [ ] Suggestions de contenu (3 idees/semaine)
- [ ] Briefs auto-generes (points cles, hashtags, timing)
- [ ] Pipeline contenu : idee → recherche → script → filme → publie
- [ ] Tracking engagement
- [ ] Commandes Telegram : /sport, /mood, /stats, /week
- [ ] Optimisation et specialisation des agents

**Livrable** : Systeme complet, tous les composants operationnels.

---

## Resume visuel

```
Semaine 1   ████████████████  Phase 0 (Setup) ✅ + Phase 1 (Core + Admin) ✅
Semaine 2   ████████████████  Phase 2 (Public Bot + Agents) ✅
Semaine 3-4 ████████████████  Phase 3 (Discord Formateur)
Mois 2-3    ████████████████  Phase 4 (Contenu + ameliorations)
```

---

## Actions immediates

1. [x] ~~Creer le bot Telegram admin~~ via @BotFather ✅
2. [x] ~~Creer le bot Telegram public~~ via @BotFather ✅
3. [x] **Creer le bot Discord** via Developer Portal ✅
4. [ ] **Tester bot admin + bot public** en conditions reelles
5. [ ] **Deploy sur Railway/Fly.io**
6. [x] **Commencer Phase 3** (Discord) pour session 2 ✅
