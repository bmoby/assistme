# SPEC : Bot Discord "Formateur"

## Vue d'ensemble
Gestion automatisee des etudiants (session 2 : 30 eleves) et de l'equipe (6 membres). Decharge le travail repetitif de formation et de management.

**Package** : `packages/bot-discord`
**Librairie** : discord.js (TypeScript)
**Dependance** : `packages/core`

---

## 1. Structure du serveur Discord

### 1.1 Categories et canaux

```
📋 GENERAL
  #annonces           (lecture seule, bot poste)
  #regles             (lecture seule)
  #presentations      (etudiants se presentent)

🎓 FORMATION SESSION 2
  #programme          (syllabus, planning)
  #faq                (questions automatiques)
  #exercices          (soumission + file d'attente)
  #ressources         (videos, PDFs, liens)
  #entraide           (etudiants s'aident entre eux)
  #lives              (annonces de live + enregistrements)

💼 EQUIPE
  #projets-clients    (un thread par projet)
  #briefs             (briefs auto-generes)
  #general-equipe     (discussion equipe)

🔒 ADMIN (visible seulement par le formateur)
  #logs               (toutes les actions du bot)
  #alertes            (notifications importantes)
```

### 1.2 Roles
- `@Formateur` : Admin, toutes permissions
- `@Equipe` : Acces categorie equipe
- `@Session2` : Acces categorie formation session 2
- `@Session1` : Anciens eleves (acces limite)

---

## 2. Fonctionnalites etudiants

### 2.1 FAQ Automatique (#faq)

**Fonctionnement** :
1. Etudiant pose une question dans #faq
2. Bot analyse la question avec Claude API
3. Si la reponse est dans la base de connaissances → repond automatiquement
4. Si pas sur (confidence < 70%) → "Je transfere ta question au formateur"
5. Quand le formateur repond → la reponse est ajoutee a la base

**Base de connaissances** :
- FAQ pre-remplies (questions courantes de la session 1)
- Enrichie automatiquement avec chaque nouvelle reponse du formateur
- Stockee dans Supabase (table `faq_entries`)

**Table `faq_entries`** :
```sql
- id UUID PRIMARY KEY
- question TEXT
- answer TEXT
- category TEXT ('pre_sale', 'technical', 'organizational', 'general')
- times_used INTEGER DEFAULT 0
- created_by TEXT ('admin', 'auto')
- created_at TIMESTAMPTZ
```

### 2.2 Soumission d'exercices (#exercices)

**Commande** : `/submit [lien-du-projet]` ou `/submit` + fichier joint

**Flux** :
```
Etudiant : /submit https://github.com/eleve/projet

Bot : Exercice recu !
  Etudiant : [Nom]
  Module : [auto-detecte ou demande]
  Soumis le : [date/heure]
  Deadline : [dans les temps / en retard de X jours]

  Pre-review IA en cours...

  [2 minutes plus tard]

  Pre-review terminee :
    Structure du projet : OK
    Pages principales : OK
    Responsive : Probleme detecte
    Points d'amelioration :
      - Le menu mobile ne s'ouvre pas
      - La page contact manque un formulaire

  Position dans la file de review : 3/8
  Temps estime avant review formateur : ~24h

  [Le formateur sera notifie automatiquement]
```

**Regles** :
- Deadline configurable par exercice
- Rappel automatique 48h et 24h avant la deadline
- Apres la deadline : accepte encore mais marque "en retard"
- **File d'attente visible** : chaque etudiant voit sa position
- Le formateur recoit une notification Telegram agrege (pas un par un)

**Notification Telegram au formateur** (1x par jour ou quand file > 5) :
```
📝 Exercices en attente de review :

1. Ismail - Module 3 (soumis il y a 2h) - Pre-review : 2 problemes
2. Fatima - Module 2 (soumis hier) - Pre-review : OK
3. Ali - Module 3 (soumis hier) - Pre-review : 4 problemes

[Voir les pre-reviews] [Ouvrir Discord]
```

### 2.3 Distribution de ressources (#ressources)

**Fonctionnement** :
- Le formateur upload une video/PDF → le bot la stocke dans Supabase Storage
- Le bot poste automatiquement dans #ressources avec :
  - Titre
  - Module/semaine concerne
  - Lien de telechargement (signe, temporaire)
  - Description courte

**Commande formateur** : `/resource [module] [titre]` + fichier joint

**Format du post** :
```
📹 Nouvelle ressource disponible !

Module 4 : Introduction aux APIs
Type : Video (45 min)
Lien : [Telecharger]

Bonne etude ! 🎯
Pour toute question → #faq
```

**Avantages vs Google Drive** :
- Pas de problemes d'autorisation
- Liens signes (securises, temporaires)
- Le bot gere tout, pas besoin d'aller sur un autre site

### 2.4 Annonces de lives (#lives)

**Avant le live** :
```
Commande formateur : /live [date] [heure] [sujet]

Bot poste dans #lives :
  🔴 LIVE PREVU
  Date : Mercredi 26 mars, 20h00
  Sujet : Module 4 - Les APIs
  Duree estimee : 1h30

  @Session2 A ne pas manquer !

  [Rappel 1h avant] [Rappel 15 min avant]
```

**Pendant le live** :
- Bot detecte le live vocal Discord (event `voiceStateUpdate`)
- Demarre l'enregistrement automatique (si techniquement possible via bot)
- Alternative : rappel a un etudiant designe d'enregistrer + commande `/recording [lien]` apres

**Apres le live** :
- Le formateur (ou le bot) uploade l'enregistrement
- Post automatique dans #lives :
```
  📹 Enregistrement disponible
  Live du 26 mars : Module 4 - Les APIs
  Lien : [Regarder / Telecharger]
```

### 2.5 Rappels automatiques aux etudiants

| Evenement | Rappel |
|-----------|--------|
| 48h avant deadline exercice | "Rappel : l'exercice Module X est a rendre dans 48h" |
| 24h avant deadline exercice | "Dernier jour pour soumettre l'exercice Module X !" |
| Nouveau cours disponible | "Un nouveau cours est disponible dans #ressources" |
| Live dans 1h | "Live dans 1h : [sujet]" |
| Live dans 15 min | "Live dans 15 minutes ! Rejoins le vocal" |
| Pas d'activite depuis 7 jours | DM prive : "Tout va bien ? Tu as besoin d'aide ?" |

---

## 3. Fonctionnalites equipe

### 3.1 Projets clients (#projets-clients)

**Quand un projet est assigne** (via `/assign` sur Telegram) :

Le bot cree un **thread** dans #projets-clients :
```
📋 PROJET : Site e-commerce - Ahmed

Client : Ahmed
Metier : Patisserie artisanale
Besoin : Site e-commerce pour vente en ligne
Budget : 1500-2000€
Deadline : 15 avril 2026

Assigne a : @Moussa

Recherche metier (IA) :
  - Marche de la patisserie en ligne en croissance
  - Concurrents identifies : [liste]
  - Fonctionnalites recommandees :
    - Catalogue produits avec photos
    - Commande en ligne
    - Livraison zone locale
    - Page Instagram integree

Proposition : [Lien PDF]

Etapes :
  [ ] Maquette UX/UI
  [ ] Validation client
  [ ] Developpement
  [ ] Tests
  [ ] Mise en production
  [ ] Livraison + formation client

@Moussa tu peux commencer. Toutes les questions ici dans ce thread.
```

### 3.2 Mise a jour de statut

**Commande membre** : `/status [etape]`
```
Moussa : /status maquette terminee

Bot : Projet Ahmed - Statut mis a jour
  [x] Maquette UX/UI ✅
  [ ] Validation client ← PROCHAINE ETAPE
  [ ] Developpement
  [ ] Tests
  [ ] Mise en production
  [ ] Livraison

  @Formateur La maquette est prete pour validation.
```

→ Notification Telegram au formateur

### 3.3 Resume equipe (hebdomadaire)

**CRON lundi 09:00** → Notification Telegram :
```
📊 Resume equipe - Semaine du 24 mars

Moussa : Projet Ahmed - Maquette en cours (deadline : 15 avril)
Ibrahim : Disponible, pas de projet
Fatima : Projet Sarah - En developpement (deadline : 1 avril)
...

Actions recommandees :
- Ibrahim est disponible → trouver un client
- Fatima est en retard de 2 jours → verifier
```

---

## 4. Commandes du bot

### 4.1 Commandes etudiants
| Commande | Action |
|----------|--------|
| `/submit [lien]` | Soumettre un exercice |
| `/progress` | Voir sa propre progression |
| `/help [question]` | Poser une question (redirige vers #faq) |

### 4.2 Commandes equipe
| Commande | Action |
|----------|--------|
| `/status [texte]` | Mettre a jour le statut du projet |
| `/question [texte]` | Poser une question au formateur (notifie Telegram) |
| `/done` | Marquer une etape comme terminee |

### 4.3 Commandes formateur (admin)
| Commande | Action |
|----------|--------|
| `/resource [module] [titre]` | Ajouter une ressource |
| `/live [date] [heure] [sujet]` | Planifier un live |
| `/recording [lien]` | Ajouter un enregistrement de live |
| `/deadline [module] [date]` | Definir une deadline d'exercice |
| `/announce [texte]` | Faire une annonce dans #annonces |
| `/review [etudiant]` | Voir la pre-review IA d'un exercice |
| `/approve [etudiant]` | Approuver un exercice |
| `/revision [etudiant] [feedback]` | Demander une revision |

---

## 5. Dependances
```json
{
  "discord.js": "^14.x",
  "@discordjs/rest": "^2.x",
  "@discordjs/builders": "^1.x"
}
```

---

## 6. Priorite de developpement

### Phase 1 (Semaine 2 - avant session 2)
- Structure du serveur Discord (categories, canaux, roles)
- `/submit` + file d'attente d'exercices
- `/resource` + Supabase Storage
- FAQ basique
- Notifications au formateur via Telegram

### Phase 2 (Mois 2)
- Pre-review IA des exercices
- Briefs auto-generes pour l'equipe (`/assign`)
- Suivi de statut des projets
- Rappels automatiques aux etudiants
- Enregistrement/distribution des lives

### Phase 3 (Mois 3)
- FAQ enrichie automatiquement
- Resume equipe hebdomadaire
- Dashboard de progression etudiants
- Statistiques d'engagement
