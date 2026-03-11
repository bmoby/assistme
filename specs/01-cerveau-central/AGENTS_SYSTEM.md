# SPEC : Systeme Multi-Agents

## Vision
Un systeme ou plusieurs agents specialises collaborent, chacun avec un role precis.
Ils partagent la meme memoire (Supabase) et communiquent via un bus d'evenements.

---

## Les Agents

```
┌──────────────────────────────────────────────────────────────┐
│                    ORCHESTRATEUR                              │
│  Recoit tous les messages, decide quel agent doit agir       │
│  Combine les reponses, envoie le resultat final              │
└──────────┬──────────┬──────────┬──────────┬─────────────────┘
           │          │          │          │
    ┌──────▼───┐ ┌────▼────┐ ┌──▼──────┐ ┌▼──────────┐
    │  AGENT   │ │  AGENT  │ │  AGENT  │ │  AGENT    │
    │ MEMOIRE  │ │ TACHES  │ │ CLIENTS │ │ FORMATION │
    └──────────┘ └─────────┘ └─────────┘ └───────────┘
           │          │          │          │
    ┌──────▼───┐ ┌────▼────┐ ┌──▼──────┐ ┌▼──────────┐
    │  AGENT   │ │  AGENT  │ │  AGENT  │ │  AGENT    │
    │ CONTENU  │ │ ROUTINE │ │ EQUIPE  │ │ VEILLE    │
    └──────────┘ └─────────┘ └─────────┘ └───────────┘
```

---

## 1. Agent Orchestrateur (le chef)

### Role
Point d'entree de tout message. Analyse, decide, delegue, combine.

### Logique
```
Message recu (vocal transcrit ou texte)
    │
    ▼
Orchestrateur analyse :
    │
    ├── Parle de clients ? → Agent Clients
    ├── Parle de taches/organisation ? → Agent Taches
    ├── Parle de formation/etudiants ? → Agent Formation
    ├── Parle d'equipe/projets ? → Agent Equipe
    ├── Parle de contenu/reseaux ? → Agent Contenu
    ├── Parle de routine/sport/bien-etre ? → Agent Routine
    ├── Info nouvelle sur sa situation ? → Agent Memoire
    └── Plusieurs sujets ? → Delegue a PLUSIEURS agents en parallele
    │
    ▼
Combine les reponses → Message unique a Magomed
```

### Implementation
```typescript
async function orchestrate(message: string, context: BuiltContext): Promise<OrchestratorResult> {
  // 1. Classifier le message
  const classification = await classifyMessage(message, context);

  // 2. Deleguer aux agents concernes (en parallele si possible)
  const agentResults = await Promise.all(
    classification.agents.map(agentName =>
      executeAgent(agentName, message, context)
    )
  );

  // 3. Toujours envoyer a l'Agent Memoire en arriere-plan
  updateMemory(message, agentResults).catch(err => logger.error(err));

  // 4. Combiner les resultats
  return combineResults(agentResults);
}
```

---

## 2. Agent Memoire

Voir `MEMORY_SYSTEM.md` pour les details complets.

### Responsabilites
- Mettre a jour la memoire apres chaque interaction
- Detecter les infos obsoletes
- Repondre aux questions "qu'est-ce que tu sais sur X ?"

---

## 3. Agent Taches

### Responsabilites
- Creer, modifier, completer des taches
- Prioriser selon les regles de Magomed (urgent, deadline, debloque les autres)
- Generer le plan du jour
- Detecter les taches en retard
- Proposer la prochaine tache

### Regles specifiques
- Max 3 urgentes par jour
- Toujours commencer par une tache rapide (<15 min)
- Apres 15h : taches legeres uniquement
- Si rien n'est fait a 11h → alerte

---

## 4. Agent Clients

### Responsabilites
- Gerer le pipeline (lead → qualifie → proposition → en cours → livre)
- Rechercher le metier du client (avec l'IA)
- Generer des propositions
- Suivre les delais de reponse (> 24h → alerte)
- Calculer les commissions

### Interactions
- Recoit les leads depuis le Bot Instagram (futur)
- Recoit les leads depuis le Bot Telegram qualification (existant)
- Envoie les briefs au Bot Discord pour l'equipe

---

## 5. Agent Formation

### Responsabilites
- Gerer les etudiants (inscription, paiement, progression)
- Suivre les exercices (soumis, en attente, approuves)
- Gerer le planning des cours (modules, lives, deadlines)
- Preparer les ressources
- Detecter les etudiants en difficulte

### Interactions
- Recoit les soumissions depuis le Bot Discord
- Notifie sur Telegram quand un etudiant a besoin d'attention

---

## 6. Agent Equipe

### Responsabilites
- Connaitre la disponibilite de chaque membre
- Assigner les projets aux bons membres
- Suivre l'avancement des projets
- Generer les briefs structures
- Resume hebdomadaire de l'equipe

### Interactions
- Publie les briefs sur le Bot Discord
- Recoit les mises a jour de statut depuis Discord

---

## 7. Agent Contenu

### Responsabilites
- Veille des tendances tech
- Suggerer des idees de contenu
- Preparer des briefs pour le tournage
- Suivre la frequence de publication
- Rappeler quand pas de publication depuis X jours

---

## 8. Agent Routine

### Responsabilites
- Gerer les habitudes (sport, sommeil, hydratation)
- Rappels proactifs bases sur les patterns
- Suivi du bien-etre (humeur, energie)
- Detecter les signes de burnout/procrastination
- Proposer des pauses / sessions sport

### Regles
- Si pas de sport depuis 3 jours → rappel
- Si coucher apres 1h → message le lendemain
- Si 0 tache faite 2 jours de suite → intervention forte

---

## 9. Agent Veille (futur)

### Responsabilites
- Surveiller les nouveautes IA, tech, outils
- Filtrer par pertinence pour Magomed et sa communaute
- Alimenter l'Agent Contenu avec des sujets

---

## Communication entre agents

### Bus d'evenements (Supabase + in-memory)

```typescript
// Table events dans Supabase (pour persistance)
// + EventEmitter en memoire (pour temps reel)

type Event = {
  type: string;
  source: string; // quel agent emet
  target?: string; // quel agent doit recevoir (ou 'all')
  data: Record<string, unknown>;
  timestamp: Date;
};

// Exemples d'evenements
'client:new_lead'        // Agent Clients → Agent Taches (creer tache de suivi)
'client:proposal_ready'  // Agent Clients → Orchestrateur → Telegram
'student:stuck'          // Agent Formation → Orchestrateur → Telegram
'student:exercise_submitted' // Bot Discord → Agent Formation → review
'team:project_update'    // Bot Discord → Agent Equipe → Telegram
'content:publish_overdue' // Agent Contenu → Agent Routine → Telegram
'routine:no_sport_3days' // Agent Routine → Orchestrateur → Telegram
'memory:situation_changed' // Agent Memoire → tous les agents (rafraichir contexte)
```

---

## Priorite d'implementation

### Phase 1 ✅ IMPLEMENTE (simplifie)

**Architecture actuelle : Orchestrateur monolithique**

Au lieu de 8 agents separes, un seul `processWithOrchestrator()` gère tout :
- Recoit le message + contexte dynamique (memoire + live data + temporel)
- Un seul appel Claude Sonnet qui comprend, decide et repond
- Execute les actions directement (create_task, complete_task, create_client, note)
- Lance le Memory Agent en arriere-plan (fire-and-forget)

**Pourquoi simplifie :** Un orchestrateur monolithique est plus fiable, moins cher (1 appel au lieu de 2-3), et suffisant tant que la complexite reste gerableen un seul prompt. La separation en agents viendra quand un seul prompt ne suffira plus.

**Ce qui est implemente :**
- [x] Agent Memoire (`memory-agent.ts`) - analyse chaque message, met a jour la memoire
- [x] Orchestrateur (`orchestrator.ts`) - traite les messages, execute les actions
- [x] Construction contexte dynamique (`context-builder.ts`) - 3 couches
- [x] CRUD memoire (`db/memory.ts`) - getAllMemory, upsertMemory, deleteMemory, etc.
- [x] Table `events` creee (prete pour le bus futur)

**Ce qui n'est PAS encore fait :**
- [ ] Classification separee (tout est dans 1 prompt)
- [ ] Delegation a des agents specialises
- [ ] Bus d'evenements actif (table existe mais pas utilisee)

### Phase 2 (avec Bot Discord)
- Agent Formation
- Agent Equipe

### Phase 3 (avec Bot Instagram)
- Agent Clients (enrichir avec le pipeline Instagram)

### Phase 4
- Agent Contenu
- Agent Routine
- Agent Veille
- Bus d'evenements complet
- Separation de l'orchestrateur monolithique en agents specialises si necessaire

---

## Cout estime du systeme complet

| Composant | Tokens/message | Cout/message |
|-----------|---------------|--------------|
| Orchestrateur (classification) | ~300 | $0.001 |
| Agent principal (1 ou 2) | ~2000 | $0.006 |
| Agent Memoire (arriere-plan) | ~700 | $0.002 |
| Construction contexte | ~1000 | $0.003 |
| **Total** | **~4000** | **~$0.012** |

30 messages/jour = $0.36/jour = **~$11/mois**

Avec les cron jobs (5/jour x 30 jours) : +$4.5/mois

**Total estime : ~$15-20/mois** pour un systeme complet multi-agents.
