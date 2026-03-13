# Systeme d'Agents — Architecture

## Vision

Des agents specialises collaborant via une base de donnees partagee (Supabase) et un orchestrateur central qui route les requetes.

---

## Architecture Actuelle (Phase 1-2) ✅

### Orchestrateur (Routeur Central)

L'orchestrateur est le point d'entree unique pour les messages admin. Il analyse, decide, execute les actions simples, et delegue aux agents specialises.

```
Message utilisateur
  → Orchestrateur (Claude Sonnet + contexte complet)
  → Actions simples executees inline (tasks, clients, notes)
  → Actions complexes deleguees :
      manage_memory → Memory Manager Agent
      start_research → Research Agent
      start_client_discovery → Client Discovery Agent
  → Memory Agent (background) pour auto-updates
```

**Pourquoi un orchestrateur centralise :**
- Un seul appel Claude pour comprendre l'intent
- Le contexte complet est charge une seule fois
- Les actions simples sont executees immediatement (pas de latence)
- Les agents specialises ne sont appeles que quand necessaire

### Agents Implementes

| Agent | Fichier | Declenchement | Role |
|-------|---------|---------------|------|
| Orchestrateur | `orchestrator.ts` | Chaque message admin | Comprendre, decider, router |
| Memory Manager | `memory-manager.ts` | Action `manage_memory` | CRUD intelligent memory + public_knowledge |
| Research Agent | `research-agent.ts` | Action `start_research` | Recherches approfondies |
| Client Discovery Agent | `client-discovery-agent.ts` | Action `start_client_discovery` | Questions de qualification client |
| Memory Agent | `memory-agent.ts` | Background (fire-and-forget) | Auto-detection changements situation |
| Context Builder | `context-builder.ts` | Chaque requete orchestrateur | Construction contexte dynamique |

### Separation des Responsabilites

```
Orchestrateur
├── Actions inline : create_task, complete_task, create_client, note
├── Delegation : manage_memory → Memory Manager
├── Delegation : start_research → Research Agent
├── Delegation : start_client_discovery → Client Discovery Agent
└── Background : Memory Agent (si pas d'action memoire)

Memory Manager
├── Charge etat complet des 2 tables (memory + public_knowledge)
├── Identifie table + categorie + cle automatiquement
├── Execute modifications chirurgicales
└── Confirme avec diff (ancien → nouveau)

Research Agent
├── Prompt deep research (sans limite de profondeur)
├── Optionnel : inclut contexte memoire perso
└── Retourne texte structure libre (max 16K tokens)

Client Discovery Agent
├── Analyse infos connues sur le client
├── Genere questions en 7 themes (business, tech, douleurs, equipe, clients, budget, vision)
├── Ne pose pas de questions deja repondues
└── Premiere brique du workflow Discovery → Qualification → Research → Proposition

Memory Agent (Background)
├── Analyse chaque message silencieusement
├── Detecte changements significatifs de situation
└── Met a jour memoire perso automatiquement
```

---

## Cout Estimatif

| Composant | Tokens/requete | Cout/requete |
|-----------|---------------|-------------|
| Orchestrateur | ~2000 in + ~500 out | ~$0.005 |
| Memory Manager | ~3000 in + ~500 out | ~$0.006 |
| Research Agent | ~1000 in + ~8000 out | ~$0.03 |
| Client Discovery Agent | ~1000 in + ~2000 out | ~$0.01 |
| Memory Agent (bg) | ~1500 in + ~200 out | ~$0.003 |
| Context Builder | 0 (pas d'appel Claude) | $0 |

**Budget mensuel :** ~$10-15/mois pour 30 messages/jour + quelques recherches/semaine.

---

## Agents Futurs (Phase 3+)

### Agent Formation (Phase 3 — Discord)
- Pre-review automatique des exercices soumis
- Suivi de progression des etudiants
- FAQ automatique avec base de connaissances

### Agent Equipe (Phase 3 — Discord)
- Affectation de projets clients
- Generation de briefs automatiques
- Suivi des disponibilites et deadlines

### Agent Contenu (Phase 4)
- Veille technologique automatique
- Suggestions de contenu
- Briefs auto-generes (hashtags, timing, points cles)

### Agent Routine (Phase 4)
- Suivi d'habitudes (sport, sommeil, productivite)
- Rappels intelligents
- Detection de patterns (burnout, procrastination)

---

## Communication Inter-Agents

### Actuelle : Via Base de Donnees

Les agents communiquent via Supabase :
- L'orchestrateur lit/ecrit dans `tasks`, `clients`
- Le Memory Manager lit/ecrit dans `memory`, `public_knowledge`
- Le Context Builder lit toutes les tables (lecture seule)
- Le Memory Agent ecrit dans `memory` uniquement

### Future : Event Bus (Table `events`)

La table `events` existe dans Supabase mais n'est pas encore activee.
Elle permettra une communication asynchrone entre agents :

```sql
events (id, type, source, target, data, status, created_at, processed_at)
```

Cas d'usage futurs :
- Discord → event `exercise_submitted` → notification Telegram
- Scheduler → event `daily_plan_generated` → push Telegram
- Bot Public → event `lead_detected` → alert admin

L'event bus sera active quand le bot Discord sera implemente.
