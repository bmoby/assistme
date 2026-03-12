# Systeme de Memoire Intelligente

> **Statut : ✅ IMPLEMENTE** — Tables `memory` + `public_knowledge`, Memory Manager, Memory Agent, Context Builder.

## Vue d'ensemble

Le systeme de memoire permet a l'assistant de connaitre Magomed profondement et d'evoluer avec lui. Deux tables distinctes gerent la memoire personnelle et les connaissances publiques.

---

## Tables

### Table `memory` — Memoire Personnelle

Informations privees sur Magomed, invisibles du public.

```sql
CREATE TABLE memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('identity','situation','preference','relationship','lesson')),
  key TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence DECIMAL DEFAULT 1.0,
  source TEXT DEFAULT 'conversation',
  last_confirmed TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, key)
);
```

| Categorie | Contenu | Frequence de changement |
|-----------|---------|------------------------|
| `identity` | Competences, personnalite, fonctionnement | Rarement (3-6 mois) |
| `situation` | Activites en cours, equipe, objectifs, finances | Regulierement (semaines) |
| `preference` | Gouts, methodes, outils preferes | Quand dit explicitement |
| `relationship` | Infos sur des personnes (nom = cle) | Au fil des conversations |
| `lesson` | Experiences, erreurs, choses apprises | Quand un apprentissage emerge |

### Table `public_knowledge` — Connaissances Publiques

Informations affichees par le bot public aux utilisateurs (en russe).

```sql
CREATE TABLE public_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('formation','services','faq','free_courses','general')),
  key TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, key)
);
```

| Categorie | Contenu | Exemples |
|-----------|---------|----------|
| `formation` | Tout sur Pilote Neuro | prix, programme, duree, format, resultats |
| `services` | Services proposes | creation de sites, tarifs, processus |
| `faq` | Questions frequentes | experience requise, langue, garantie |
| `free_courses` | Cours gratuits | Portal, lien Telegram |
| `general` | Infos publiques sur Magomed | bio, parcours, reseaux |

---

## Agents qui gerent la memoire

### Memory Manager (On-Demand) ✅

**Fichier** : `packages/core/src/ai/memory-manager.ts`
**Declenchement** : Quand l'admin demande une modification (action `manage_memory`).

**Responsabilites :**
- Seul agent autorise a modifier `memory` ET `public_knowledge` sur demande explicite
- Charge l'etat complet des deux tables avant chaque operation
- Identifie automatiquement la bonne table et la bonne cle
- Modifications chirurgicales (change uniquement la partie concernee)
- Confirme avec diff (ancien → nouveau)

**Flow :**
```
Admin : "Change le prix a 2500"
  → Orchestrateur detecte intent memoire → action manage_memory
  → Handler appelle processMemoryRequest()
    → Charge : memory + public_knowledge (etat complet)
    → Claude analyse : c'est public_knowledge.formation.pricing
    → Ancien : "2997€ payable en 3 fois"
    → Nouveau : "2500€ payable en 3 fois"
    → Execute upsert
  → Bot : "Modifie : pricing (formation) — 2997€ → 2500€"
```

### Memory Agent (Background) ✅

**Fichier** : `packages/core/src/ai/memory-agent.ts`
**Declenchement** : Automatique apres chaque message (fire-and-forget).

**Responsabilites :**
- Detecte automatiquement les changements de situation
- Ne modifie que la table `memory` (pas `public_knowledge`)
- Ne se declenche pas si `manage_memory` a ete execute
- Silencieux (pas de reponse utilisateur)

**Flow :**
```
Admin : "J'ai signe un nouveau client pour 5000€"
  → Orchestrateur : cree le client (action inline)
  → Memory Agent (background) :
    → Detecte : info sur situation financiere
    → Upsert memory.situation.current_clients
```

---

## Context Builder ✅

**Fichier** : `packages/core/src/ai/context-builder.ts`

Construit le contexte dynamique injecte dans chaque requete orchestrateur.

### 4 Couches

```
buildContext() →

  Couche 1 — Memoire Personnelle :
    QUI EST MAGOMED : [identity]
    SITUATION ACTUELLE : [situation]
    PREFERENCES : [preference]
    PERSONNES CONNUES : [relationship]
    LECONS APPRISES : [lesson]

  Couche 2 — Donnees Live :
    TACHES ACTIVES (max 15, avec priorite et deadline)
    CLIENTS (pipeline avec statut et besoin)

  Couche 3 — Public Knowledge :
    BASE DE CONNAISSANCES DU BOT PUBLIC
    Contenu COMPLET (pas tronque) pour permettre la gestion

  Couche 4 — Temporel :
    DATE ET HEURE en francais
```

---

## Securite

- **Bot Admin uniquement** peut modifier la memoire (via Memory Manager ou commande /kb)
- **Bot Public** lit uniquement `public_knowledge` (aucune ecriture)
- **Memory Agent** ecrit uniquement dans `memory` (pas `public_knowledge`)
- Les modifications sont loguees avec leur source (`memory_manager`, `memory_agent`, `admin_manual`)

---

## Cout

| Operation | Cout/requete |
|-----------|-------------|
| Memory Manager (on-demand) | ~$0.006 |
| Memory Agent (background) | ~$0.003 |
| Context Builder | $0 (lecture DB) |

Budget memoire : ~$5/mois pour 30 messages/jour.
