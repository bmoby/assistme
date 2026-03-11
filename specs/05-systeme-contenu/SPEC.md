# SPEC : Systeme de Contenu

## Vue d'ensemble
Aide a publier regulierement du contenu sans effort de planification. Veille automatique, suggestions de sujets, briefs pre-pares, rappels de publication.

**Pas un package separe** : Integre dans le Core (cron jobs) + Bot Telegram (interface).

---

## 1. Fonctionnalites

### 1.1 Veille automatique (CRON hebdomadaire - lundi 09:00)

**Logique** :
1. Utiliser Claude API pour identifier les tendances tech de la semaine
2. Filtrer par pertinence pour la communaute (IA, no-code, dev, entrepreneuriat)
3. Croiser avec les sujets deja couverts (eviter les doublons)
4. Generer 3 idees de contenu

**Notification Telegram** :
```
📹 Idees de contenu cette semaine :

1. 🔥 TENDANCE : Claude 4.5 sort demain - montre ce que tu fais avec
   Angle : "Je gere mon business avec une IA, voici comment"
   Duree : 3-5 min

2. 💡 EDUCATIF : Comment creer un bot Telegram en 30 min avec l'IA
   Angle : Tutorial concret, pas a pas
   Duree : 5-8 min

3. 📖 STORYTELLING : Comment j'ai forme 6 developpeurs sans diplome
   Angle : Histoire personnelle + lecons
   Duree : 3-5 min

[Choisir 1] [Choisir 2] [Choisir 3] [Autre idee]
```

### 1.2 Brief de contenu (apres choix)

Quand l'utilisateur choisit une idee :
```
📋 Brief pour : "Comment creer un bot Telegram en 30 min avec l'IA"

Points cles a mentionner :
  1. Pourquoi un bot Telegram (automatisation, disponibilite 24/7)
  2. Les outils : Claude Code + grammy
  3. Demo live : creer un bot simple
  4. Montrer le resultat final
  5. Call to action : "Suivez mes cours pour apprendre"

Stats/chiffres a citer :
  - Telegram : 950M+ utilisateurs
  - Les bots Telegram generent [X] d'engagement

Hashtags suggeres :
  #telegram #bot #ia #tech #coding #nocode

Meilleur moment pour publier :
  Mardi ou jeudi, 19h-21h (heure de ta communaute)

[C'est note, je tourne demain] [Modifier le brief]
```

### 1.3 Rappel de publication

Si une idee est choisie mais pas publiee apres 3 jours :
```
📹 Rappel : tu as choisi le sujet "Bot Telegram en 30 min"
il y a 3 jours.

Tu as ton studio pret, ca prend 2-3h max.

[Je le fais aujourd'hui] [Reporter] [Abandonner]
```

### 1.4 Suivi des publications

Apres publication, log dans Supabase :
- Date de publication
- Plateforme
- URL
- Suivi engagement (si API disponible, sinon saisie manuelle)

---

## 2. Table Supabase

Utilise la table `content_ideas` definie dans la spec infrastructure :
```sql
- id, title, topic, angle, type, platform
- key_points JSONB
- status ('idea', 'researched', 'scripted', 'filmed', 'published')
- published_at, published_url
- engagement JSONB
```

---

## 3. Priorite de developpement

### Phase 1 (Mois 3)
- Veille hebdomadaire avec Claude API
- Notification Telegram avec 3 idees
- Brief auto apres choix
- Rappel si pas publie

### Phase 2 (Mois 4+)
- Suivi des performances
- Analyse de quel type de contenu marche le mieux
- Suggestions basees sur les performances passees
- Integration API Instagram/TikTok pour poster directement (si pertinent)
