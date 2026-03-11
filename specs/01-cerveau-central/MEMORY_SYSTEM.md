# SPEC : Systeme de Memoire Intelligente

> **Statut : ✅ IMPLEMENTE** — Table memory, Memory Agent, Context Builder, seed initial. Voir fichiers : `core/src/db/memory.ts`, `core/src/ai/memory-agent.ts`, `core/src/ai/context-builder.ts`, `supabase/migrations/002_memory_and_events.sql`

## Probleme
Un fichier statique `context.ts` ne suffit pas. La situation de Magomed change :
- Les cours se terminent, de nouveaux commencent
- Des clients arrivent et partent
- L'equipe evolue
- Les objectifs changent
- De nouvelles infos arrivent chaque jour

Le systeme doit **apprendre et se mettre a jour tout seul**.

---

## Architecture de la memoire

### 3 couches de memoire

```
┌─────────────────────────────────────────────────────┐
│  COUCHE 1 : IDENTITE (quasi permanente)             │
│  Qui est Magomed, personnalite, fonctionnement      │
│  Change : rarement (tous les 3-6 mois)              │
│  Stockage : table `memory` category='identity'      │
└─────────────────────────────────────────────────────┘
         │
┌─────────────────────────────────────────────────────┐
│  COUCHE 2 : SITUATION (evolue regulierement)        │
│  Activites en cours, equipe, objectifs, finances    │
│  Change : chaque semaine/mois                       │
│  Stockage : table `memory` category='situation'     │
│  Mise a jour : automatique par l'Agent Memoire      │
└─────────────────────────────────────────────────────┘
         │
┌─────────────────────────────────────────────────────┐
│  COUCHE 3 : CONTEXTE LIVE (temps reel)              │
│  Taches actives, clients en cours, messages recents │
│  Change : en permanence                             │
│  Stockage : tables existantes (tasks, clients, etc) │
│  Lecture : a chaque requete                         │
└─────────────────────────────────────────────────────┘
```

---

## Table `memory`

```sql
CREATE TABLE IF NOT EXISTS memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL
    CHECK (category IN ('identity', 'situation', 'preference', 'relationship', 'lesson')),
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

CREATE INDEX idx_memory_category ON memory(category);
CREATE INDEX idx_memory_key ON memory(key);
```

### Categories

| Categorie | Exemples | Duree de vie |
|-----------|----------|--------------|
| `identity` | Personnalite, competences, fonctionnement mental | Permanente |
| `situation` | Activites en cours, equipe, objectifs, localisation | Mois |
| `preference` | "N'aime pas les reviews micro", "veut du shadow boxing" | Permanente sauf correction |
| `relationship` | Info sur chaque personne (client, etudiant, famille) | Mise a jour continue |
| `lesson` | "Monday.com a echoue car trop de friction" | Permanente |

### Exemples de donnees

```
category='identity', key='expertise', content='Dev JS/TS 10+ ans, autodidacte, ex Renault/Prisma/Cegid/Cresus'
category='identity', key='motivation_style', content='Motive par objectifs concrets et peur de perdre. Paralyse par trop de choix.'
category='identity', key='productive_hours', content='Fenetre 10h-15h. Apres 15h ca descend.'
category='situation', key='formation_session2', content='30 places, lancement fin mars 2026, duree 3 mois, 1200€. Syllabus a ecrire.'
category='situation', key='equipe', content='6 membres operationnels, 1 client en cours, commission 20%'
category='situation', key='objectifs_3mois', content='Session 2 reussie, clients reguliers pour equipe, securite financiere'
category='preference', key='outils', content='Zero friction obligatoire. Push > Pull. Pas de Monday.com.'
category='relationship', key='frere_jordanie', content='Bot Telegram livraison gateaux, quasi fini, ~1 jour de travail'
category='lesson', key='session1_logistique', content='Google Drive = chaos autorisations. Supabase Storage a la place.'
```

---

## Agent Memoire

### Role
Ecoute tout ce que Magomed dit (vocal, texte) et met a jour la memoire automatiquement.

### Fonctionnement
A chaque message traite par le bot, l'Agent Memoire se pose ces questions :
1. Est-ce que ce message contient une info qui change ma connaissance de la situation ?
2. Est-ce que quelque chose que je savais est maintenant obsolete ?
3. Est-ce qu'il y a une nouvelle personne, un nouveau fait, une nouvelle preference ?

### Implementation
Apres chaque traitement de message, un appel IA secondaire (leger, Haiku ou Sonnet) :

```
System prompt :
"Tu es l'Agent Memoire. Tu analyses le message de Magomed et determines
si la memoire doit etre mise a jour.

MEMOIRE ACTUELLE :
[injection de toutes les entrees memory]

MESSAGE DE MAGOMED :
[le message transcrit]

ACTIONS DEJA PRISES :
[les actions du processMessage]

Reponds en JSON :
{
  "updates": [
    {
      "action": "create" | "update" | "delete",
      "category": "...",
      "key": "...",
      "content": "...",
      "reason": "..."
    }
  ]
}

Si rien a mettre a jour, reponds : { "updates": [] }
Sois selectif : ne mets a jour que quand c'est significatif."
```

### Quand l'Agent Memoire s'execute
- Apres chaque message vocal (info riche)
- Apres chaque message texte (si > 20 caracteres)
- PAS pour les commandes (/plan, /tasks, etc.)
- En arriere-plan (n'attend pas la reponse pour repondre a l'utilisateur)

---

## Construction du contexte a chaque requete

Au lieu d'un fichier statique, le systeme construit le contexte dynamiquement :

```typescript
async function buildContext(): Promise<string> {
  // Couche 1 : Identite (depuis memory)
  const identity = await getMemoryByCategory('identity');

  // Couche 2 : Situation (depuis memory)
  const situation = await getMemoryByCategory('situation');
  const preferences = await getMemoryByCategory('preference');
  const lessons = await getMemoryByCategory('lesson');

  // Couche 3 : Live (depuis les tables operationnelles)
  const activeTasks = await getActiveTasks();
  const clients = await getClientPipeline();
  const now = new Date();

  return `
IDENTITE :
${identity.map(m => `- ${m.key}: ${m.content}`).join('\n')}

SITUATION ACTUELLE :
${situation.map(m => `- ${m.key}: ${m.content}`).join('\n')}

PREFERENCES :
${preferences.map(m => `- ${m.key}: ${m.content}`).join('\n')}

LECONS APPRISES :
${lessons.map(m => `- ${m.key}: ${m.content}`).join('\n')}

DONNEES LIVE :
- ${activeTasks.length} taches actives
${activeTasks.slice(0, 10).map(t => `  - [${t.priority}] ${t.title}`).join('\n')}
- ${clients.length} clients dans le pipeline
${clients.map(c => `  - ${c.name} [${c.status}]`).join('\n')}
- Date: ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR')}
  `;
}
```

---

## Migration des donnees statiques

> **Statut : ✅ FAIT** — Les donnees statiques ont ete converties en ~25 entrees INSERT dans `002_memory_and_events.sql` et injectees dans la table `memory`. Le fichier `context.ts` statique est deprecie et sera supprime une fois le systeme confirme en production. Toute modification future passe par l'Agent Memoire automatiquement ou par commande manuelle (a implementer).

---

## Commandes de gestion memoire (Telegram)

> **Statut : ❌ PAS ENCORE IMPLEMENTE** — A faire dans une prochaine iteration.

| Commande | Action |
|----------|--------|
| `/memory` | Voir un resume de ce que le bot sait |
| `/memory identity` | Voir la couche identite |
| `/memory situation` | Voir la couche situation |
| `/forget [key]` | Supprimer une entree |
| `/correct [key] [nouveau contenu]` | Corriger une info |

---

## Cout estime

- Agent Memoire (Sonnet) : ~500 tokens input + 200 output par message = ~$0.003/message
- Construction du contexte : ~1000 tokens = ~$0.003/message
- Total par message : ~$0.008 (le processMessage principal + memoire + contexte)
- 30 messages/jour = ~$0.24/jour = ~$7/mois

Acceptable pour la valeur apportee.
