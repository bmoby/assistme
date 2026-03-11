# Architecture de l'Assistant Personnel IA

## Principe fondamental

> **Telegram = telecommande de ta vie.**
> Tout arrive sur Telegram. Tu ne vas nulle part. Tout vient a toi.

---

## Vue d'ensemble du systeme

```
                    ┌─────────────────────────────┐
                    │      CERVEAU CENTRAL         │
                    │   (Supabase + Claude API +   │
                    │    Moteur de priorisation)    │
                    └──────────┬──────────────────┘
                               │
            ┌──────────────────┼──────────────────────┐
            │                  │                       │
   ┌────────▼────────┐ ┌──────▼───────┐  ┌───────────▼──────────┐
   │  BOT TELEGRAM   │ │ BOT DISCORD  │  │  BOT INSTAGRAM/TIKTOK│
   │  "COPILOTE"     │ │ "FORMATEUR"  │  │  "FILTRE"            │
   │  (Interface     │ │ (Etudiants + │  │  (Messages entrants) │
   │   principale)   │ │  Equipe)     │  │                      │
   └─────────────────┘ └──────────────┘  └──────────────────────┘
```

---

## COMPOSANT 1 : Le Cerveau Central

### Role
Base de donnees + logique + IA qui connecte tout.

### Stack technique
- **Supabase** (deja en place) : base de donnees, auth, stockage fichiers
- **Claude API** : raisonnement, generation de propositions, recherche client
- **Serveur Node.js/TypeScript** : orchestrateur (heberge sur Railway, Fly.io, ou VPS)
- **Cron jobs** : taches planifiees (rappels matin, soir, deadlines)

### Tables Supabase (ajouts)
- `tasks` : toutes les taches avec priorite, deadline, statut, categorie
- `daily_plan` : plan du jour genere chaque matin
- `messages_queue` : messages entrants tries et en attente
- `students` : progression, exercices, paiements (ameliorer l'existant)
- `clients` : pipeline client (lead -> qualifie -> proposition -> en cours -> livre)
- `team_members` : competences, disponibilite, projets en cours
- `content_calendar` : idees de contenu, dates de publication
- `habits` : suivi des habitudes (sport, coucher, lever)

---

## COMPOSANT 2 : Bot Telegram "COPILOTE"

### Role
**Interface principale.** C'est ici que tu vis. Push notifications sur iPhone.

### Fonctionnalites

#### 2.1 Routine du matin (CRON 8h30)
```
📋 Bonjour ! Voici ta journee :

🔴 URGENT (avant 12h) :
  1. Repondre a [Client X] sur WhatsApp (qualifie hier, attend ta reponse)
  2. Corriger le bug de [Eleve Y] (bloque depuis 2 jours)

🟡 IMPORTANT (avant 17h) :
  3. Ecrire le chapitre 3 du syllabus (session 2 dans 12 jours)
  4. Briefer [Membre Z] sur le nouveau projet

🟢 SI TU AS LE TEMPS :
  5. Rechercher des idees de contenu pour la semaine
  6. Mettre en prod le bot de ton frere

⏱️ Fenetre d'or : 10h-15h. Protege-la.

💪 Si tu ne fais que les 2 rouges aujourd'hui, c'est deja une victoire.
```

#### 2.2 Rappel coucher (CRON 00h00)
```
🌙 Il est minuit.

Si tu te couches maintenant :
  ✅ Reveil a 8h30 = 8h30 de sommeil
  ✅ Cafe + douche a 9h15
  ✅ Debut de travail a 10h = 5h de fenetre d'or

Si tu te couches a 2h :
  ❌ Reveil difficile a 10h
  ❌ Debut de travail a 12h = 3h de fenetre d'or
  ❌ Tu perds 2h de travail productif demain

Bonne nuit ?  [OUI] [PAS ENCORE]
```

#### 2.3 Anti-procrastination (si pas d'activite detectee a 11h)
```
⚠️ Il est 11h. Ta fenetre d'or a commence.

Ta tache #1 est : [Repondre a Client X]
Temps estime : 15 min

Commence par CA. Juste ca. Rien d'autre.

[C'EST FAIT ✅] [JE M'Y METS] [REPORTER]
```

#### 2.4 Capture rapide
A tout moment, envoyer un message au bot = capture instantanee.
```
Toi : "Client Ahmed veut un site e-commerce, rappeler vendredi"
Bot : ✅ Tache creee :
  - Client : Ahmed
  - Besoin : Site e-commerce
  - Rappel : Vendredi 14 mars
  - Categorie : Client pipeline
  [MODIFIER] [OK]
```

#### 2.5 Commandes rapides
- `/next` → Quelle est ma prochaine tache ?
- `/plan` → Plan de la journee
- `/add [texte]` → Ajouter une tache rapide
- `/done [numero]` → Marquer comme fait
- `/client [nom]` → Voir le pipeline d'un client
- `/student [nom]` → Voir la progression d'un eleve
- `/week` → Resume de la semaine
- `/sport` → Lancer une session shadow boxing (lien video + timer)
- `/content` → Prochaine idee de contenu a filmer

#### 2.6 Rappels intelligents
- Rappel si un client attend une reponse depuis +24h
- Rappel si un eleve est bloque depuis +48h
- Rappel si aucune publication depuis +7 jours
- Rappel pour appeler parents/enfants (configurable)
- Rappel sport si pas fait depuis 3 jours

---

## COMPOSANT 3 : Bot Discord "FORMATEUR"

### Role
Gestion automatisee des etudiants et de l'equipe. Decharge le travail repetitif.

### Fonctionnalites etudiants

#### 3.1 FAQ automatique (canal #faq)
- Bot qui repond automatiquement aux questions frequentes
- Base de connaissances alimentee par les reponses que tu as deja donnees
- Si la question n'est pas dans la base → notifie le Copilote Telegram pour que tu decides

#### 3.2 Soumission d'exercices (canal #exercices)
```
Commande: /submit [lien-du-projet]

Bot: ✅ Exercice recu de [Eleve].
  - Deadline : dans les temps ✅
  - Review automatique en cours...

  [2 min plus tard]

  📋 Pre-review automatique :
  - Structure du projet : ✅ OK
  - Pages principales presentes : ✅ OK
  - Responsive : ⚠️ Probleme detecte sur mobile
  - Performance : ✅ OK

  En attente de la review finale du formateur.
  Position dans la file : 3/8
```
- Review IA automatique (structure, basiques)
- File d'attente visible (plus de "tout le monde envoie la veille")
- Deadlines automatiques avec rappels 48h et 24h avant

#### 3.3 Ressources et videos (canal #ressources)
- Bot qui poste automatiquement les nouvelles videos/ressources
- Liens heberges sur Supabase Storage (pas Google Drive = plus de problemes d'autorisation)
- Organise par module/semaine
- Confirmation de lecture/visionnage

#### 3.4 Enregistrement des lives
- Bot qui detecte le debut d'un live Discord
- Enregistrement automatique
- Upload sur Supabase Storage
- Post automatique dans #ressources avec le titre et la date

### Fonctionnalites equipe

#### 3.5 Canal #projets-clients
- Chaque nouveau projet = un thread automatique
- Statut visible : En attente | En cours | Review | Livre
- Le bot rappelle les deadlines
- Tu recois un resume sur Telegram

#### 3.6 Briefing structure
Quand tu assignes un projet :
```
Commande Telegram : /assign @membre "Site e-commerce Ahmed"

→ Le bot cree un thread Discord avec :
  📋 BRIEF PROJET : Site e-commerce Ahmed

  🏢 Client : Ahmed
  📊 Metier : [recherche IA auto-generee]
  🎯 Besoin : Site e-commerce
  💰 Budget : [fourchette]
  📅 Deadline : [date]

  📝 Proposition validee : [lien PDF]
  🔗 References : [liens concurrents analyses par IA]

  📌 Etapes :
  1. [ ] Maquette UX
  2. [ ] Validation client
  3. [ ] Developpement
  4. [ ] Tests
  5. [ ] Mise en production

  @membre tu peux commencer. Questions → ici.
```

---

## COMPOSANT 4 : Bot Instagram "FILTRE"

### Role
Trier automatiquement les DMs Instagram. Eliminer les 90% de temps perdu.

### Fonctionnement

```
Message DM recu
      │
      ▼
  IA analyse le message
      │
      ├── 🛒 Client potentiel ?
      │     → Reponse auto : "Merci ! Pour mieux comprendre ton besoin,
      │       utilise ce lien : [Bot Telegram qualification]"
      │     → Log dans Supabase (pipeline client)
      │     → Notif Telegram : "Nouveau lead qualifie : [resume]"
      │
      ├── 🎓 Interesse par les cours ?
      │     → Reponse auto : "Toutes les infos sont ici : pilotneuro.com
      │       Si tu as des questions apres avoir vu le site, ecris-moi !"
      │     → Si insiste → transfert WhatsApp
      │
      ├── ❓ Question technique ?
      │     → Reponse IA basee sur tes contenus/expertise
      │     → "J'ai fait une video la-dessus : [lien]"
      │
      ├── 👋 Social / faire connaissance ?
      │     → Reponse polie auto : "Merci pour ton message !
      │       Suis mes contenus pour rester en contact 🙏"
      │
      └── 🔴 Important / VIP / pas clair ?
            → Notif Telegram : "Message non classe de [nom]. A traiter."
            → Tu decides toi-meme
```

### Implementation
- **Meta Business API** (Instagram Messenger API / Graph API)
- Necessite un compte Instagram Business/Creator + Page Facebook liee
- Meta Developer App + App Review (⚠️ **2-6 semaines** de delai de review)
- Permissions requises : `pages_messaging`, `instagram_manage_messages`, `pages_show_list`, `instagram_basic`
- Webhook pour recevoir les messages en temps reel
- Claude API pour classifier et generer les reponses
- **Limite** : 200 DMs/heure, fenetre de 24h apres message initie par l'utilisateur
- **ACTION IMMEDIATE** : Soumettre la demande Meta App Review maintenant (meme si le bot est prevu mois 2)
- **Alternative no-code** : ManyChat ($15-65/mo) si besoin d'aller plus vite

---

## COMPOSANT 5 : Systeme de contenu

### Role
T'aider a publier regulierement sans effort de planification.

### Fonctionnement
- Chaque lundi, le bot Telegram envoie :
```
📹 Idees de contenu cette semaine :

1. 🔥 [Sujet tendance] - "Sora vient de sortir une MAJ, montre ce que ca fait"
   Angle : Demo concrete + ton avis

2. 💡 [Evergreen] - "Comment j'ai forme 6 developpeurs en 3 mois"
   Angle : Storytelling + lecons apprises

3. 🎓 [Educatif] - "3 outils IA gratuits pour creer un site en 1h"
   Angle : Tutorial rapide

Laquelle te parle ? [1] [2] [3]
```
- Tu choisis, le bot prepare un brief :
  - Points cles a mentionner
  - Stats/chiffres a citer
  - Duree recommandee
- Apres tournage, rappel pour publier

---

## PRIORITE DE DEVELOPPEMENT

### 🔴 Semaine 1 (MAINTENANT - urgence session 2)
1. **Bot Telegram Copilote** (version basique)
   - Plan du matin (CRON)
   - Capture rapide de taches
   - `/next`, `/plan`, `/done`
   - Rappel coucher
2. **Ecrire le syllabus** (assiste par l'IA via le Copilote)

### 🟡 Semaine 2 (avant le lancement session 2)
3. **Bot Discord Formateur** (version basique)
   - Soumission d'exercices avec file d'attente
   - Distribution de ressources via Supabase Storage
   - FAQ automatique basique
4. **Configurer Supabase Storage** pour les videos (remplacer Google Drive)

### 🟢 Mois 2
5. **Bot Instagram Filtre**
   - Classification des DMs
   - Reponses automatiques
   - Redirection vers bot Telegram qualification
6. **Enrichir le Bot Telegram**
   - Anti-procrastination
   - Suivi sport
   - Pipeline clients
   - `/assign` pour briefer l'equipe

### 🔵 Mois 3
7. **Systeme de contenu**
   - Veille automatique
   - Suggestions hebdomadaires
   - Calendrier editorial
8. **Enregistrement auto des lives Discord**
9. **Pre-review IA des exercices etudiants**
10. **Dashboard Supabase** (visuel pour suivre tout)

---

## Stack technique complete

| Composant | Technologie |
|-----------|-------------|
| Base de donnees | Supabase (PostgreSQL) |
| Stockage fichiers/videos | Supabase Storage |
| Backend / Orchestrateur | Node.js + TypeScript (serveur) |
| Hebergement serveur | Railway ou Fly.io |
| IA / Raisonnement | Claude API (Sonnet pour rapide, Opus pour complexe) |
| Bot Telegram | grammy ou telegraf (TypeScript) |
| Bot Discord | discord.js ou Sapphire Framework (TypeScript) |
| Bot Instagram | Meta Graph API + Webhooks |
| Cron / Planification | node-cron ou cron Supabase Edge Functions |
| Notifications iPhone | Via Telegram (push natif) |

---

## Ce que ca resout

| Probleme | Solution | Composant |
|----------|----------|-----------|
| Paralysie decisionnelle | Plan du matin + `/next` | Copilote Telegram |
| Oubli | Capture rapide + rappels intelligents | Copilote Telegram |
| 90% messages Instagram inutiles | Tri + reponses auto | Bot Instagram |
| Questions repetitives etudiants | FAQ auto + redirection site | Bot Discord |
| Exercices en vrac la veille | File d'attente + deadlines | Bot Discord |
| Google Drive chaos | Supabase Storage | Cerveau Central |
| Briefing equipe chronophage | `/assign` + brief auto IA | Discord + Telegram |
| Pas de routine | CRON matin + soir + sport | Copilote Telegram |
| Pas de contenu regulier | Suggestions hebdo + calendrier | Copilote Telegram |
| Procrastination | Rappels + "tu perds X si..." | Copilote Telegram |
| Review etudiants penible | Pre-review IA + file d'attente | Bot Discord |
