# Connexions entre composants

## Schema des flux de donnees

```
┌──────────────┐     webhook      ┌──────────────────┐
│  Instagram   │ ──────────────→  │                  │
│  (DMs)       │                  │                  │
└──────────────┘                  │                  │
                                  │   SERVEUR        │
┌──────────────┐     webhook      │   BACKEND        │     ┌───────────┐
│  Telegram    │ ←──────────────→ │   (Node.js)      │────→│ Supabase  │
│  (Copilote)  │                  │                  │←────│ (DB +     │
└──────────────┘                  │   packages/      │     │  Storage) │
                                  │   - core         │     └───────────┘
┌──────────────┐     gateway      │   - bot-telegram │
│  Discord     │ ←──────────────→ │   - bot-discord  │     ┌───────────┐
│  (Formateur) │                  │   - bot-instagram│────→│ Claude    │
└──────────────┘                  │                  │←────│ API       │
                                  └──────────────────┘     └───────────┘
```

---

## Flux detailles

### FLUX 1 : Nouveau client depuis Instagram
```
1. [Instagram] DM recu
2. [Bot Instagram] Webhook → classification IA → categorie "CLIENT"
3. [Bot Instagram] Reponse auto : "Utilise ce lien [Bot Telegram qualification]"
4. [Core/DB] Log message dans `messages_log`
5. [Core/DB] Cree un lead dans `clients` (status: 'lead')
6. [Bot Telegram] Notification : "Nouveau lead : [nom] - [resume]"
7. [Bot Telegram qualification existant] Le client repond aux questions
8. [Core/DB] Met a jour `clients` (status: 'qualified', qualification_data)
9. [Bot Telegram Copilote] "Lead qualifie : [nom], besoin: [X], budget: [Y]. /proposal [nom] ?"
10. [Utilisateur] /proposal Ahmed
11. [Core/AI] Recherche metier + generation proposition
12. [Bot Telegram] Envoie la proposition en PDF
13. [Utilisateur] Envoie au client via WhatsApp (manuel)
14. [Utilisateur] /assign Ahmed Moussa
15. [Bot Discord] Cree thread dans #projets-clients avec brief complet
16. [Core/DB] Met a jour `clients` (status: 'in_progress', assigned_to)
```

### FLUX 2 : Nouvel etudiant
```
1. [Instagram/TikTok] Message "Je veux m'inscrire aux cours"
2. [Bot Instagram] Classification → "COURS" → Reponse auto : "pilotneuro.com"
3. [Etudiant] Va sur pilotneuro.com, s'inscrit
4. [Core/DB] Nouveau record dans `students` (status: 'registered')
5. [Bot Telegram] "Nouvel inscrit : [nom]. Attente paiement."
6. [Utilisateur] Contacte l'etudiant (WhatsApp), confirme paiement
7. [Utilisateur] Met a jour dans Supabase ou via commande : /student [nom] paid
8. [Core/DB] Met a jour `students` (status: 'paid')
9. [Bot Discord] Assigne le role @Session2 a l'etudiant
10. [Bot Discord] Message de bienvenue dans #annonces
```

### FLUX 3 : Soumission d'exercice
```
1. [Discord] Etudiant : /submit [lien]
2. [Bot Discord] Log dans `student_exercises` (status: 'submitted')
3. [Core/AI] Pre-review automatique du projet
4. [Core/DB] Met a jour `student_exercises` (status: 'ai_reviewed', ai_review: {...})
5. [Bot Discord] Affiche la pre-review a l'etudiant + position dans la file
6. [Bot Telegram] Notification groupee (1x/jour) : "X exercices en attente de review"
7. [Utilisateur] /reviews → voit la liste
8. [Utilisateur] Review manuelle (sur Discord ou via Telegram)
9. [Bot Discord] /approve [etudiant] ou /revision [etudiant] [feedback]
10. [Bot Discord] Notifie l'etudiant du resultat
```

### FLUX 4 : Plan quotidien
```
1. [Core/Scheduler] CRON 08:30 declenche `morning-plan`
2. [Core/DB] Recupere : taches actives, en retard, clients en attente, etudiants bloques
3. [Core/AI] Claude API genere le plan priorise
4. [Core/DB] Sauvegarde dans `daily_plans`
5. [Bot Telegram] Envoie le plan avec boutons inline
6. [Utilisateur] Clique "Commencer tache 1"
7. [Core/DB] Met a jour `tasks` (status: 'in_progress')
8. [Core/Scheduler] CRON 11:00 : si aucune tache commencee → rappel anti-procrastination
9. [Core/Scheduler] CRON 15:00 : bilan mi-journee
10. [Core/Scheduler] CRON 19:00 : review du soir
11. [Core/Scheduler] CRON 00:00 : rappel coucher
```

### FLUX 5 : Assignation projet equipe
```
1. [Bot Telegram] Utilisateur : /assign Ahmed Moussa
2. [Core/AI] Recherche automatique sur le metier d'Ahmed
3. [Core/AI] Genere le brief structure
4. [Core/DB] Met a jour `clients` (assigned_to: Moussa)
5. [Bot Discord] Cree un thread dans #projets-clients
6. [Bot Discord] Poste le brief complet avec etapes
7. [Bot Discord] @Moussa est notifie
8. [Core/Scheduler] Rappels periodiques sur l'avancement
9. [Bot Discord] Moussa : /status maquette terminee
10. [Bot Telegram] "Moussa a termine la maquette pour Ahmed. [Voir] [Valider]"
```

### FLUX 6 : Capture rapide
```
1. [Bot Telegram] Utilisateur envoie : "Ahmed veut un site, rappeler vendredi"
2. [Core/AI] Claude parse : intention=new_client, nom=Ahmed, besoin=site, rappel=vendredi
3. [Core/DB] Cree un record dans `clients` + un record dans `reminders`
4. [Bot Telegram] Confirmation : "Client Ahmed cree. Rappel vendredi. [Modifier] [OK]"
5. [Core/Scheduler] Vendredi → "Rappel : contacter Ahmed pour le projet site"
```

---

## Matrice des dependances

| Composant | Depend de | Est utilise par |
|-----------|-----------|-----------------|
| Core/DB | Supabase | Tous les bots |
| Core/AI | Claude API | Tous les bots |
| Core/Scheduler | Core/DB, Core/AI | Bot Telegram (recoit les notifications) |
| Bot Telegram | Core/DB, Core/AI, Core/Scheduler | - |
| Bot Discord | Core/DB, Core/AI | Bot Telegram (notifications) |
| Bot Instagram | Core/DB, Core/AI | Bot Telegram (notifications) |

---

## Ordre de developpement (base sur les dependances)

```
Semaine 1 :  Core/DB + Core/AI + Core/Scheduler (fondations)
             ↓
Semaine 1-2: Bot Telegram (utilise le core)
             ↓
Semaine 2 :  Bot Discord (utilise le core, notifie Telegram)
             ↓
Mois 2 :     Bot Instagram (utilise le core, notifie Telegram)
             ↓
Mois 3 :     Systeme contenu (utilise le core + Telegram)
```
