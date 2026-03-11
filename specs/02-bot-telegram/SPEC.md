# SPEC : Bot Telegram "Copilote"

## Vue d'ensemble
Interface principale de l'utilisateur. C'est ici que tout arrive. Push notifications sur iPhone. Zero friction : recevoir un message = etre informe, repondre = agir.

**Package** : `packages/bot-telegram`
**Librairie** : grammY (TypeScript, moderne, bien maintenu)
**Dependance** : `packages/core`

---

## 1. Architecture du bot

### 1.1 Modes d'interaction
1. **Messages push** (le bot envoie) : Plans, rappels, alertes, notifications
2. **Commandes** (l'utilisateur envoie) : `/next`, `/plan`, `/done`, etc.
3. **Texte libre** (l'utilisateur envoie) : Capture rapide, le bot interprete avec l'IA

### 1.2 Conversation = un seul chat
Tout se passe dans un seul chat Telegram avec le bot. Pas de groupes, pas de canaux. Un chat = une telecommande.

---

## 2. Fonctionnalites detaillees

### 2.1 Plan du matin (PUSH - 08:30)

**Declencheur** : Cron job `morning-plan` dans le core
**Logique** :
1. Recuperer toutes les taches actives, en retard, en attente
2. Recuperer les clients en attente de reponse
3. Recuperer les etudiants qui ont besoin d'attention
4. Verifier les habitudes (sport fait recemment ?)
5. Appeler Claude API pour generer un plan priorise
6. Envoyer sur Telegram

**Format du message** :
```
Bonjour ! Voici ta journee (Mardi 25 mars)

URGENT (avant 12h) :
  1. Repondre a Ahmed sur WhatsApp - attend depuis hier
     → Temps estime : 15 min

  2. Corriger le bug header de Ismail
     → Temps estime : 30 min

IMPORTANT (avant 17h) :
  3. Ecrire Module 4 du syllabus (session 2 dans 10 jours)
     → Temps estime : 2h

  4. Briefer Moussa sur le projet Ahmed
     → Temps estime : 45 min

SI TU AS LE TEMPS :
  5. Rechercher idees contenu semaine prochaine
  6. Shadow boxing 20 min

Fenetre d'or : 10h-15h. Taches 1 et 2 d'abord.

Si tu ne fais que les 2 urgentes, c'est deja bien.

[Commencer la tache 1] [Voir details]
```

**Boutons inline** :
- `Commencer la tache 1` → marque comme in_progress, lance un timer
- `Voir details` → affiche les details de toutes les taches

### 2.2 Rappel coucher (PUSH - 00:00)

**Format** :
```
Il est minuit.

Si tu te couches maintenant :
  Reveil 8h30 = 8h30 de sommeil
  Fenetre d'or complete demain

Si tu te couches a 2h :
  Tu perds 2h de travail productif demain
  [Liste des taches urgentes de demain]

[Bonne nuit] [15 min de plus]
```

**Si "15 min de plus"** → rappel a 00:15, puis 00:30, puis message plus insistant.

### 2.3 Anti-procrastination (PUSH - 11:00)

**Condition** : Aucune tache marquee comme completee ou in_progress aujourd'hui.

**Format** :
```
Il est 11h. Ta fenetre d'or a commence il y a 1h.

Aucune tache demarree aujourd'hui.

Ta tache #1 : [Titre]
Temps estime : [X] min

Juste celle-la. Rien d'autre.

[Je m'y mets] [Reporter a demain]
```

**Si "Reporter a demain"** → demander pourquoi (optionnel), replanifier.

### 2.4 Bilan mi-journee (PUSH - 15:00)

**Format** :
```
Bilan 15h :

Fait aujourd'hui :
  [Tache 1] (35 min)
  [Tache 2] (1h10)

Reste a faire :
  [Tache 3] - je te recommande celle-ci
  [Tache 4]

Tu as bien avance ! / Il reste du travail, courage.

[Continuer avec tache 3] [Pause]
```

### 2.5 Review du soir (PUSH - 19:00)

**Format** :
```
Resume de ta journee :

Fait : 4/6 taches
Temps de travail estime : 5h20
Sport : Non (3 jours sans sport)

Demain, les priorites seront :
  1. [Tache reportee]
  2. [Nouvelle tache urgente]

Note ta journee : [1] [2] [3] [4] [5]
```

---

## 3. Commandes

### 3.1 Gestion des taches

| Commande | Action |
|----------|--------|
| `/next` | Affiche la prochaine tache a faire (la plus prioritaire) |
| `/plan` | Affiche le plan du jour complet |
| `/done` | Marque la tache en cours comme terminee, affiche la suivante |
| `/done [numero]` | Marque une tache specifique comme terminee |
| `/skip` | Passe la tache actuelle, passe a la suivante |
| `/add [texte]` | Ajouter une tache rapide (l'IA categorise et priorise) |
| `/tasks` | Voir toutes les taches actives |
| `/week` | Resume de la semaine (taches faites, en retard, stats) |

### 3.2 Gestion clients

| Commande | Action |
|----------|--------|
| `/clients` | Voir le pipeline clients |
| `/client [nom]` | Details d'un client |
| `/newclient [texte]` | Creer un nouveau lead (l'IA parse les infos) |
| `/assign [client] [membre]` | Assigner un client a un membre (cree le brief Discord) |
| `/proposal [client]` | Generer une proposition pour un client |
| `/research [client]` | Lancer une recherche metier client |

### 3.3 Gestion etudiants

| Commande | Action |
|----------|--------|
| `/students` | Liste des etudiants et leur statut |
| `/student [nom]` | Details d'un etudiant |
| `/reviews` | Exercices en attente de review |

### 3.4 Contenu

| Commande | Action |
|----------|--------|
| `/content` | Prochaine idee de contenu a filmer |
| `/ideas` | Voir toutes les idees de contenu |

### 3.5 Personnel

| Commande | Action |
|----------|--------|
| `/sport` | Lancer une session sport (lien video + timer + log) |
| `/mood [1-5]` | Logger son humeur |
| `/remind [texte] [quand]` | Creer un rappel |
| `/stats` | Statistiques personnelles (productivite, habitudes) |

---

## 4. Texte libre (Capture intelligente)

Quand l'utilisateur envoie un message qui n'est pas une commande, l'IA l'interprete :

**Exemples** :
```
"Ahmed veut un site e-commerce, budget 2000€, rappeler vendredi"
→ Cree un client + tache de rappel

"Ismail a un bug sur la page contact, c'est urgent"
→ Cree une tache urgente categorie student

"Demain je dois preparer le module 5"
→ Cree une tache pour demain

"J'ai fini la proposition pour Ahmed"
→ Cherche la tache correspondante, la marque comme done

"Appeler maman dimanche"
→ Cree un rappel pour dimanche
```

**Logique** :
1. Envoyer le message a Claude API avec le contexte des taches/clients/etudiants existants
2. Claude determine l'intention (creer tache, completer tache, creer client, rappel, question)
3. Executer l'action
4. Confirmer a l'utilisateur avec possibilite de modifier

---

## 5. Notifications entrantes (depuis les autres bots)

Le Copilote Telegram recoit des notifications des autres composants :

| Source | Notification |
|--------|-------------|
| Bot Instagram | "Nouveau lead qualifie : [nom] - [besoin]" |
| Bot Instagram | "Message non classe de [nom]. A traiter." |
| Bot Discord | "Exercice soumis par [eleve] - pre-review terminee" |
| Bot Discord | "[Membre equipe] a une question sur le projet [client]" |
| Core / Cron | Tous les rappels planifies |
| Core / Cron | "Client [nom] attend une reponse depuis 24h" |

---

## 6. Boutons et interactions

Utiliser les **Inline Keyboards** de Telegram pour :
- Choix rapide (Oui/Non, 1-5, Commencer/Reporter)
- Navigation entre taches
- Actions rapides sans taper de commande

---

## 7. Dependances
```json
{
  "grammy": "^1.x",
  "@grammyjs/conversations": "latest",
  "@grammyjs/runner": "latest"
}
```

---

## 8. Priorite de developpement

### Phase 1 (Semaine 1)
- Commandes : `/next`, `/plan`, `/done`, `/add`, `/tasks`
- Cron : Plan du matin (08:30)
- Cron : Rappel coucher (00:00)
- Texte libre : Capture intelligente basique

### Phase 2 (Semaine 2)
- Cron : Anti-procrastination (11:00), Bilan (15:00), Review (19:00)
- Commandes clients : `/clients`, `/newclient`, `/assign`
- Notifications entrantes depuis Discord

### Phase 3 (Mois 2)
- Commandes : `/sport`, `/content`, `/research`, `/proposal`
- Commandes : `/stats`, `/week`, `/mood`
- Notifications depuis Instagram
- Inline keyboards avances
