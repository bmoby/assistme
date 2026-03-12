# 04 — Bot Discord "Formateur"

> **Statut : Phase 3 — A implementer**

**Package** : `packages/bot-discord`
**Librairie** : discord.js
**Dependance** : `@vibe-coder/core`

Gestion automatisee des etudiants (session 2 : 30 eleves) et de l'equipe (6 membres). Decharge le travail repetitif de formation et de management.

---

## 1. Structure du serveur Discord

### Categories et canaux
```
GENERAL
  #annonces           (lecture seule, bot poste)
  #regles             (lecture seule)
  #presentations      (etudiants se presentent)

FORMATION SESSION 2
  #programme          (syllabus, planning)
  #faq                (questions automatiques)
  #exercices          (soumission + file d'attente)
  #ressources         (videos, PDFs, liens)
  #entraide           (etudiants s'aident entre eux)
  #lives              (annonces de live + enregistrements)

EQUIPE
  #projets-clients    (un thread par projet)
  #briefs             (briefs auto-generes)
  #general-equipe     (discussion equipe)

ADMIN (visible seulement par le formateur)
  #logs               (toutes les actions du bot)
  #alertes            (notifications importantes)
```

### Roles
- `@Formateur` : Admin, toutes permissions
- `@Equipe` : Acces categorie equipe
- `@Session2` : Acces categorie formation session 2
- `@Session1` : Anciens eleves (acces limite)

---

## 2. Fonctionnalites etudiants

### 2.1 FAQ Automatique (#faq)

1. Etudiant pose une question dans #faq
2. Bot analyse avec Claude API
3. Si reponse connue (confidence > 70%) → repond automatiquement
4. Si pas sur → "Je transfere au formateur"
5. Reponse du formateur ajoutee a la base automatiquement

### 2.2 Soumission d'exercices (#exercices)

**Commande** : `/submit [lien]`

**Flow :**
```
Etudiant : /submit https://github.com/eleve/projet
Bot : Exercice recu ! Pre-review IA en cours...
  → Log dans student_exercises (status: 'submitted')
  → Pre-review automatique Claude
  → Affiche resultats + position dans la file
  → Notification Telegram groupee au formateur (1x/jour)
```

**Regles :**
- Deadline configurable par exercice
- Rappels 48h et 24h avant deadline
- File d'attente visible (chaque etudiant voit sa position)

### 2.3 Ressources (#ressources)

**Commande formateur** : `/resource [module] [titre]` + fichier joint
- Upload vers Supabase Storage
- Post automatique dans #ressources avec lien signe temporaire

### 2.4 Lives (#lives)

**Commande formateur** : `/live [date] [heure] [sujet]`
- Annonce automatique dans #lives
- Rappels 1h et 15min avant
- Apres : `/recording [lien]` pour l'enregistrement

### 2.5 Rappels automatiques

| Evenement | Rappel |
|-----------|--------|
| 48h avant deadline | Rappel dans #exercices |
| 24h avant deadline | Dernier rappel |
| Nouveau cours | Notification dans #ressources |
| Live dans 1h/15min | Rappels dans #lives |
| Inactivite 7 jours | DM prive a l'etudiant |

---

## 3. Fonctionnalites equipe

### 3.1 Projets clients (#projets-clients)

Quand un projet est assigne (via `/assign` sur Telegram) :
- Thread cree dans #projets-clients
- Brief auto-genere (recherche metier IA + proposition)
- @TeamMember notifie
- Etapes listees avec checkboxes

### 3.2 Mise a jour de statut

**Commande membre** : `/status [etape terminee]`
- Met a jour le thread du projet
- Notifie le formateur via Telegram

### 3.3 Resume equipe (hebdomadaire)

CRON lundi 09:00 → Notification Telegram :
- Statut de chaque membre et projet
- Actions recommandees

---

## 4. Commandes

### Etudiants
| Commande | Action |
|----------|--------|
| `/submit [lien]` | Soumettre un exercice |
| `/progress` | Voir sa progression |

### Equipe
| Commande | Action |
|----------|--------|
| `/status [texte]` | Mettre a jour le statut du projet |
| `/question [texte]` | Poser une question au formateur |

### Formateur (admin)
| Commande | Action |
|----------|--------|
| `/resource [module] [titre]` | Ajouter une ressource |
| `/live [date] [heure] [sujet]` | Planifier un live |
| `/deadline [module] [date]` | Definir deadline exercice |
| `/announce [texte]` | Annonce dans #annonces |
| `/review [etudiant]` | Voir pre-review IA |
| `/approve [etudiant]` | Approuver exercice |
| `/revision [etudiant] [feedback]` | Demander revision |

---

## 5. Additions Core necessaires

- CRUD `students` + `student_exercises`
- CRUD `team_members`
- Agent de pre-review d'exercices (Claude)
- Generation de briefs clients (Claude + recherche metier)
- Table `faq_entries` pour la FAQ automatique

---

## 6. Dependances

```json
{
  "discord.js": "^14.x",
  "@vibe-coder/core": "workspace:*"
}
```

---

## 7. Priorite de developpement

### Essentiel (avant session 2)
- Structure serveur Discord (categories, canaux, roles)
- `/submit` + file d'attente d'exercices
- `/resource` + Supabase Storage
- FAQ basique
- Notifications au formateur via Telegram

### Ameliorations (apres lancement)
- Pre-review IA des exercices
- Briefs auto-generes pour l'equipe
- Suivi de statut des projets
- Rappels automatiques
- Resume equipe hebdomadaire
