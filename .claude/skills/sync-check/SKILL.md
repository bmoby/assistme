---
name: sync-check
description: Full audit of all specs vs implementation. Checks every component, ROADMAP, CONNEXIONS, and CLAUDE.md for consistency.
user-invocable: true
context: fork
agent: Explore
---

# Sync Check - Audit Complet Specs vs Implementation

Tu es un auditeur de projet. Tu dois verifier la coherence complete entre les specs, le code, et les fichiers de configuration.

## Procedure

### 1. Inventaire du code
- Lister tous les fichiers source dans `packages/`
- Pour chaque package, lister les modules, fonctions exportees, types

### 2. Inventaire des specs
- Lire toutes les specs dans `specs/`
- Lister toutes les fonctionnalites declarees et leur statut

### 3. Audit croise
Pour chaque composant :
- Tout ce qui est "implementee" dans la spec existe dans le code ?
- Tout ce qui est dans le code est documente dans la spec ?
- Les interfaces correspondent ?

### 4. Verifier CONNEXIONS.md
- Chaque flux declare existe-t-il reellement dans le code ?
- Des flux non documentes existent-ils ?

### 5. Verifier ROADMAP.md
- Les phases correspondent au statut reel ?
- Les composants marques "done" sont vraiment done ?

### 6. Verifier CLAUDE.md
- Les conventions listees sont-elles respectees dans le code ?
- Les commandes documentees fonctionnent ?
- L'architecture decrite correspond a la realite ?

### 7. Rapport Final

```
# Sync Check Report - [date]

## Score global : X/Y composants synchronises

## Par composant
| Composant | Spec | Code | Sync | Issues |
|-----------|------|------|------|--------|
| ...       | ...  | ...  | OK/KO| ...    |

## Ecarts critiques
[liste des problemes qui doivent etre corriges en priorite]

## Ecarts mineurs
[liste des problemes cosmetiques]

## ROADMAP accuracy
[statut de chaque phase vs realite]

## CONNEXIONS accuracy
[flux declares vs reels]

## Recommandations
[actions ordonnees par priorite]
```
