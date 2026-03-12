---
name: spec-update
description: Update spec files after implementation changes. Keeps specs as source of truth by reflecting what was actually built.
user-invocable: true
argument-hint: "[component: 00-infrastructure | 01-cerveau-central | 02-bot-telegram | 03-bot-telegram-public | 04-bot-discord | 05-systeme-contenu]"
---

# Spec Update - Mise a jour de la spec apres changements

Tu dois mettre a jour la spec pour qu'elle reflette exactement l'etat actuel de l'implementation.

## Composant cible
$ARGUMENTS

## Procedure

### 1. Analyser l'implementation actuelle
- Lire tout le code source du package correspondant
- Identifier les fichiers, fonctions, types, exports
- Comprendre l'architecture reelle

### 2. Lire la spec actuelle
- Lire `specs/$ARGUMENTS/SPEC.md` et fichiers associes
- Identifier les sections qui decrivent chaque fonctionnalite

### 3. Verifier les connexions
- Lire `specs/CONNEXIONS.md` pour voir les flux impactes
- Lire `specs/ROADMAP.md` pour les statuts de phase

### 4. Mettre a jour la spec
- Ajouter les fonctionnalites implementees mais non documentees
- Corriger les descriptions qui ne correspondent plus au code
- Mettre a jour les statuts (implementee / non implementee)
- Mettre a jour les tables de fichiers avec les bons chemins
- Garder le meme format et style que le reste de la spec

### 5. Mettre a jour les fichiers transverses si necessaire
- `specs/CONNEXIONS.md` si de nouveaux flux existent
- `specs/ROADMAP.md` si le statut de phase a change
- `CLAUDE.md` si l'architecture globale a evolue

### Regles
- La spec est la source de verite : elle DOIT correspondre exactement au code
- Ne jamais supprimer de la spec ce qui est prevu mais pas encore implemente - juste marquer le statut correctement
- Utiliser les marqueurs : `Implementee`, `Partielle`, `A implementer`, `Modifiee`
- Inclure des exemples de code uniquement quand ca clarifie l'usage
