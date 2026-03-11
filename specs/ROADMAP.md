# Roadmap de Developpement

## Contexte
- Session 2 des cours dans ~2 semaines
- 1 seul developpeur (Magomed) assiste par Claude Code
- Stack : TypeScript, Supabase, grammY, discord.js, Claude API

---

## PHASE 0 : Setup (Jour 1)
> Mettre en place l'infrastructure de dev

- [ ] Initialiser le monorepo (pnpm workspaces)
- [ ] Config TypeScript, ESLint, Prettier
- [ ] Creer le package `core`
- [ ] Configurer Supabase (nouvelles tables, storage buckets, RLS)
- [ ] Creer le `.env` avec toutes les cles
- [ ] Creer le `CLAUDE.md` avec les instructions pour Claude Code
- [ ] Setup Git + premiere commit
- [ ] Creer le bot Telegram via @BotFather
- [ ] Tester la connexion Supabase + Claude API

**Livrable** : Monorepo fonctionnel avec core connecte a Supabase et Claude API.

---

## PHASE 1 : Bot Telegram Copilote v1 (Jours 2-5)
> L'essentiel : savoir quoi faire chaque matin + capturer les taches

### Jour 2-3 : Core + commandes de base
- [ ] Core/DB : CRUD tasks, daily_plans
- [ ] Core/AI : Fonction `generateDailyPlan()`
- [ ] Core/AI : Fonction `parseUserMessage()` (capture intelligente)
- [ ] Bot Telegram : Setup grammY, connexion webhook
- [ ] Bot Telegram : Commande `/plan`
- [ ] Bot Telegram : Commande `/next`
- [ ] Bot Telegram : Commande `/done`
- [ ] Bot Telegram : Commande `/add`
- [ ] Bot Telegram : Commande `/tasks`
- [ ] Bot Telegram : Texte libre → capture intelligente

### Jour 4 : Cron jobs
- [ ] Core/Scheduler : Setup node-cron
- [ ] Cron : Plan du matin (08:30)
- [ ] Cron : Rappel coucher (00:00)
- [ ] Cron : Anti-procrastination (11:00)

### Jour 5 : Polish + deploy
- [ ] Inline keyboards (boutons)
- [ ] Gestion d'erreurs
- [ ] Deploy sur Railway/Fly.io
- [ ] Test complet en conditions reelles

**Livrable** : Bot Telegram operationnel avec plan quotidien, capture de taches, et rappels.

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
Semaine 1  ████████████████  Phase 0 (Setup) + Phase 1 (Telegram)
Semaine 2  ████████████████  Phase 2 (Discord) → LANCEMENT SESSION 2
Semaine 3  ████████████████  Phase 3 (Enrichissement)
Semaine 4  ████████████████  Phase 3 (suite)
Mois 2     ████████████████  Phase 4 (Instagram)
Mois 3     ████████████████  Phase 5 (Contenu + ameliorations)
```

---

## Actions immediates (AUJOURD'HUI)

1. [ ] **Soumettre la demande Meta App Review** (2-6 semaines de delai)
2. [ ] **Creer le bot Telegram** via @BotFather (2 min)
3. [ ] **Creer le bot Discord** via Developer Portal (5 min)
4. [ ] **Valider le monorepo setup** et commencer Phase 0
