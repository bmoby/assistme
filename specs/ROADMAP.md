# Roadmap de Developpement

## Contexte
- Session 2 des cours dans ~2 semaines
- 1 seul developpeur (Magomed) assiste par Claude Code
- Stack : TypeScript, Supabase, grammY, discord.js, Claude API

---

## PHASE 0 : Setup (Jour 1) ✅ TERMINE
> Mettre en place l'infrastructure de dev

- [x] Initialiser le monorepo (pnpm workspaces)
- [x] Config TypeScript strict, ESM modules
- [x] Creer le package `core`
- [x] Configurer Supabase (tables, indexes)
- [x] Creer le `.env` avec toutes les cles
- [x] Creer le `CLAUDE.md` avec les instructions pour Claude Code
- [x] Setup Git + premiere commit (pousse sur GitHub privé)
- [x] Creer le bot Telegram via @BotFather
- [x] Tester la connexion Supabase + Claude API

**Livrable** : Monorepo fonctionnel avec core connecte a Supabase et Claude API.

---

## PHASE 1 : Bot Telegram Copilote v1 (Jours 2-5) ✅ TERMINE
> L'essentiel : savoir quoi faire chaque matin + capturer les taches

### Core + commandes de base ✅
- [x] Core/DB : CRUD tasks, daily_plans, clients, memory
- [x] Core/AI : `askClaude()` client avec choix modele (sonnet/opus)
- [x] Core/AI : `generateDailyPlan()` + `parseUserMessage()`
- [x] Core/AI : `transcribeAudio()` via Whisper API
- [x] Core/AI : `buildContext()` - contexte dynamique 3 couches (memoire + live + temporel)
- [x] Core/AI : `processWithOrchestrator()` - traitement intelligent des messages
- [x] Core/AI : `runMemoryAgent()` - mise a jour memoire en arriere-plan
- [x] Core/DB : `memory.ts` - CRUD table memory (getAllMemory, upsertMemory, deleteMemory, etc.)
- [x] Bot Telegram : Setup grammY, long polling
- [x] Bot Telegram : Commandes /start, /plan, /next, /done, /add, /tasks, /skip, /clients, /client, /newclient
- [x] Bot Telegram : Texte libre → processWithOrchestrator()
- [x] Bot Telegram : Vocal → Whisper transcription → processWithOrchestrator()

### Cron jobs ✅
- [x] Core/Scheduler : Setup node-cron
- [x] Cron : Plan du matin (08:30)
- [x] Cron : Anti-procrastination (11:00)
- [x] Cron : Check-in 14:00
- [x] Cron : Review 19:00
- [x] Cron : Rappel coucher (00:00)

### Systeme de memoire intelligent ✅
- [x] Table `memory` (5 categories: identity, situation, preference, relationship, lesson)
- [x] Table `events` (prete pour le bus d'evenements futur)
- [x] Seed initial ~25 entrees memoire depuis le profil utilisateur
- [x] Memory Agent qui analyse chaque message et met a jour la memoire automatiquement
- [x] Contexte dynamique construit a chaque requete (memoire + taches + clients + date)

### Reste a faire
- [ ] Commandes `/memory`, `/forget`, `/correct` (gestion memoire manuelle)
- [ ] Filtrage Memory Agent (pas pour commandes, pas pour messages < 20 chars)
- [ ] Inline keyboards (boutons)
- [ ] Deploy sur Railway/Fly.io
- [ ] Test complet en conditions reelles

**Livrable** : Bot Telegram operationnel avec orchestrateur intelligent, memoire evolutive, vocal, et rappels.

---

## PHASE 2 : Bot Discord Formateur v1 (Jours 6-10)
> Pret pour le lancement de la session 2

### Jour 6 : Setup
- [ ] Creer le bot Discord via Developer Portal
- [ ] Setup discord.js dans le package
- [ ] Configurer les categories, canaux, roles sur le serveur

### Jour 7-8 : Exercices + ressources
- [ ] Commande `/submit` : soumission d'exercices
- [ ] File d'attente visible
- [ ] Supabase Storage : upload/download de ressources
- [ ] Commande `/resource` : ajout de ressource par le formateur
- [ ] Post automatique dans #ressources

### Jour 9 : FAQ + notifications
- [ ] FAQ basique avec Claude API dans #faq
- [ ] Notifications vers Telegram (exercices en attente, questions)
- [ ] Rappels de deadline (48h, 24h)

### Jour 10 : Polish + test
- [ ] Test avec 2-3 anciens eleves
- [ ] Ajuster les messages et le flow
- [ ] Documenter les commandes pour les etudiants

**Livrable** : Discord pret pour la session 2 avec exercices, ressources et FAQ.

---

## PHASE 3 : Enrichissement Telegram + Equipe (Semaines 3-4)

- [ ] Cron : Bilan 15h + Review 19h
- [ ] Commandes clients : `/clients`, `/newclient`
- [ ] Commande `/assign` → cree brief Discord
- [ ] Core/AI : `researchClientBusiness()`
- [ ] Core/AI : `generateProposal()`
- [ ] Commande `/research [client]`
- [ ] Commande `/proposal [client]`
- [ ] Suivi statut projets equipe
- [ ] Resume equipe hebdomadaire

**Livrable** : Pipeline client automatise + gestion equipe.

---

## PHASE 4 : Bot Instagram Filtre (Mois 2)

- [ ] Soumettre Meta App Review (⚠️ FAIRE MAINTENANT, pas en mois 2)
- [ ] Setup webhook Instagram
- [ ] Classification des DMs (Claude API)
- [ ] Reponses auto : COURS, SOCIAL
- [ ] Redirection CLIENT → bot Telegram qualification
- [ ] Reponses IA : TECHNIQUE
- [ ] Detection VIP → notification Telegram
- [ ] Logging dans Supabase
- [ ] Commande Telegram `/instagram` (stats)

**Livrable** : 90%+ des DMs Instagram traites automatiquement.

---

## PHASE 5 : Contenu + Ameliorations (Mois 3)

- [ ] Veille hebdomadaire (Claude API)
- [ ] Suggestions de contenu via Telegram
- [ ] Briefs auto apres choix
- [ ] Rappels publication
- [ ] Pre-review IA des exercices etudiants
- [ ] Enregistrement auto des lives Discord
- [ ] Commandes `/sport`, `/mood`, `/stats`
- [ ] Commande `/week` (resume hebdomadaire)
- [ ] Dashboard visuel (optionnel, Supabase + simple frontend)

**Livrable** : Systeme complet, tous les composants operationnels.

---

## Resume visuel

```
Semaine 1  ████████████████  Phase 0 (Setup) ✅ + Phase 1 (Telegram) ✅
Semaine 2  ████████████████  Phase 2 (Discord) → LANCEMENT SESSION 2
Semaine 3  ████████████████  Phase 3 (Enrichissement)
Semaine 4  ████████████████  Phase 3 (suite)
Mois 2     ████████████████  Phase 4 (Instagram)
Mois 3     ████████████████  Phase 5 (Contenu + ameliorations)
```

---

## Actions immediates

1. [ ] **Soumettre la demande Meta App Review** (2-6 semaines de delai)
2. [x] ~~Creer le bot Telegram~~ via @BotFather ✅
3. [ ] **Creer le bot Discord** via Developer Portal (5 min)
4. [ ] **Tester le bot Telegram** en conditions reelles avec le systeme memoire
5. [ ] **Commencer Phase 2** (Discord) - URGENT, session 2 dans ~2 semaines
