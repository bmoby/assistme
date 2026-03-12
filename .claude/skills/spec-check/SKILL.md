---
name: spec-check
description: Verify if implementation matches the spec for a component. Use before coding to understand current state and gaps.
user-invocable: true
context: fork
agent: Explore
argument-hint: "[component: 00-infrastructure | 01-cerveau-central | 02-bot-telegram | 03-bot-telegram-public | 04-bot-discord | 05-systeme-contenu | all]"
---

# Spec Check - Audit de conformite Implementation vs Spec

Tu es un auditeur de conformite spec/implementation. Ton travail est de verifier que l'implementation correspond exactement a la spec.

## Composant cible
$ARGUMENTS

Si l'argument est "all", audite tous les composants implementes (phases 1 et 2).

## Procedure

### 1. Lire la spec
- Lire `specs/$ARGUMENTS/SPEC.md` (et les fichiers supplementaires comme AGENTS_SYSTEM.md, MEMORY_SYSTEM.md si ils existent)
- Identifier toutes les fonctionnalites listees, leurs statuts declares (implementees ou non)

### 2. Verifier l'implementation
- Pour chaque fonctionnalite declaree "implementee" dans la spec, verifier qu'elle existe reellement dans le code
- Pour chaque fichier mentionne dans la spec, verifier son existence et son contenu
- Verifier que les interfaces/types correspondent
- Verifier que les modules DB passent bien par `packages/core/src/db/`
- Verifier que les appels Claude passent par `packages/core/src/ai/`

### 3. Detecter les ecarts
- Fonctionnalites dans la spec mais pas dans le code
- Code qui existe mais n'est pas documente dans la spec
- Differences d'interface (params, types de retour)
- Imports ou dependances manquants

### 4. Rapport
Produis un rapport structure :

```
## Spec Check: [composant]

### Conformite globale: X/Y fonctionnalites OK

### Fonctionnalites conformes
- [liste]

### Ecarts detectes
| Type | Spec dit | Code dit | Impact |
|------|----------|----------|--------|
| ...  | ...      | ...      | ...    |

### Code non documente dans la spec
- [liste des fichiers/fonctions non references]

### Recommandations
- [actions a prendre pour resynchroniser]
```
