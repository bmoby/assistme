# 05 — Systeme de Contenu

> **Statut : Phase 4 — Futur**

Aide a publier regulierement du contenu sans effort de planification. Veille automatique, suggestions de sujets, briefs prepares, rappels de publication.

**Pas un package separe** : Integre dans le Core (cron jobs) + Bot Telegram Admin (interface).

---

## 1. Fonctionnalites

### 1.1 Veille automatique (CRON hebdomadaire — lundi 09:00)

1. Claude API identifie les tendances tech de la semaine
2. Filtre par pertinence pour la communaute (IA, no-code, dev, entrepreneuriat)
3. Croise avec les sujets deja couverts
4. Genere 3 idees de contenu

**Notification Telegram :**
```
Idees de contenu cette semaine :

1. TENDANCE : [sujet] - Angle : [angle] - Duree : 3-5 min
2. EDUCATIF : [sujet] - Angle : [angle] - Duree : 5-8 min
3. STORYTELLING : [sujet] - Angle : [angle] - Duree : 3-5 min

[Choisir 1] [Choisir 2] [Choisir 3] [Autre idee]
```

### 1.2 Brief de contenu (apres choix)

```
Brief pour : "[titre]"

Points cles a mentionner :
  1. [point 1]
  2. [point 2]
  ...

Stats/chiffres a citer : [donnees]
Hashtags suggeres : [hashtags]
Meilleur moment pour publier : [timing]

[C'est note, je tourne demain] [Modifier le brief]
```

### 1.3 Rappel de publication

Si idee choisie mais pas publiee apres 3 jours :
```
Rappel : tu as choisi "[titre]" il y a 3 jours.
Tu as ton studio pret, ca prend 2-3h max.
[Je le fais aujourd'hui] [Reporter] [Abandonner]
```

### 1.4 Suivi des publications

- Pipeline : idee → recherche → script → filme → publie
- Date de publication, plateforme, URL
- Engagement (si API disponible, sinon saisie manuelle)

---

## 2. Table Supabase

Utilise `content_ideas` :
```sql
id, title, topic, angle, type, platform
key_points JSONB
status ('idea', 'researched', 'scripted', 'filmed', 'published')
published_at, published_url, engagement JSONB
created_at
```

---

## 3. Priorite

### Phase 4a
- Veille hebdomadaire avec Claude API
- Notification Telegram avec 3 idees
- Brief auto apres choix
- Rappel si pas publie

### Phase 4b
- Suivi des performances
- Analyse de quel type de contenu marche le mieux
- Suggestions basees sur les performances passees
