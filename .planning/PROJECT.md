# Simplification du Flow Exercices — Bot Discord Formateur

## What This Is

Refactoring du systeme de soumission d'exercices du Bot Discord Formateur. On supprime la correction automatique par IA (non fiable, redondante avec le bot quiz), on ajoute l'archivage par session, et on simplifie le feedback etudiant. Le formateur garde le controle total sur la review manuelle.

## Core Value

Le formateur peut gerer les soumissions d'exercices sans goulot d'etranglement — archiver par session, corriger quand il veut, sans bruit IA inutile.

## Requirements

### Validated

- [x] Soumission d'exercices par DM (fichiers, liens, texte) — existing
- [x] Preview + confirmation avant soumission — existing
- [x] Notification admin dans #admin avec embed — existing
- [x] Thread de review avec contexte complet — existing
- [x] Boutons approve/revision dans le thread — existing
- [x] Feedback formateur envoye en DM a l'etudiant — existing
- [x] Re-soumission avec historique dans le meme thread — existing
- [x] Stockage des fichiers dans Supabase Storage — existing
- [x] Prevention des doublons (unique index) — existing

- [x] Supprimer l'auto-review IA du flow de soumission — Phase 1
- [x] Supprimer le score IA et feedback auto des notifications admin — Phase 1
- [x] Supprimer le placeholder IA dans les threads de review — Phase 1
- [x] Simplifier le DM etudiant (juste accuse de reception) — Phase 1
- [x] Statut ne passe plus par ai_reviewed pour les nouvelles soumissions — Phase 1

- [x] Ajouter le statut `archived` aux exercices (type ExerciseStatus) — Phase 2
- [x] Commande admin `/archive-session` pour archiver par session — Phase 2
- [x] Exercices archives exclus des notifications et digests — Phase 2
- [x] Exercices archives restent consultables en DB — Phase 2

- [x] Nettoyer les references a exercise-reviewer dans le codebase — Phase 3

### Active

(None — all requirements validated)

### Out of Scope

- Modification du bot quiz — projet separe, pas touche ici
- Modification du flow de review admin (thread, boutons, feedback) — ca reste tel quel
- Correction automatique par IA — supprimee volontairement, l'IA n'est pas fiable pour ca
- Gamification des soumissions (compteur, stats) — pas demande
- Archivage automatique (apres X jours) — on reste sur archivage manuel par session

## Context

- Monorepo pnpm : `packages/core` (shared), `packages/bot-discord` (exercices + formateur), `packages/bot-discord-quiz` (quiz)
- Le bot quiz est le vrai outil d'evaluation automatise (bonnes/mauvaises reponses objectives)
- Les exercices sont une preuve d'engagement, pas un examen — la correction IA est donc du bruit
- 30 etudiants actifs, plusieurs sessions — les exercices s'accumulent sans archivage
- Le formateur developpe activement d'autres features et ne peut pas corriger chaque exercice un par un
- Fichiers cles :
  - `packages/bot-discord/src/handlers/dm-handler.ts` — flow de soumission
  - `packages/bot-discord/src/handlers/review-thread.ts` — creation thread review
  - `packages/bot-discord/src/handlers/review-buttons.ts` — boutons approve/revision
  - `packages/core/src/db/formation/exercises.ts` — requetes DB exercices

## Constraints

- **Isolation**: Zero import depuis `packages/bot-discord-quiz`, uniquement `@assistme/core`
- **DB**: Nouvelles migrations pour le statut `archived`, pas de modification des tables existantes (ajout seulement)
- **Langue**: Contenu etudiant-facing en russe
- **Tests**: Vitest, tests unitaires obligatoires avant commit (`pnpm test:unit`)
- **Backward compat**: Legacy `ai_reviewed` records migrated to `submitted` via SQL migration 020

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supprimer l'auto-review IA | Score non fiable pour non-codeurs pilotant l'IA, redondant avec le bot quiz | Done (Phase 1) |
| Archivage par session (pas par exercice) | Le formateur gere par session, pas par etudiant individuel | Done (Phase 2) |
| Garder le flow review admin intact | Le formateur veut continuer a corriger manuellement quand il le souhaite | Done (Phase 1) |
| Accuse de reception simple (pas de score) | Sans correction IA, pas de score a montrer — juste "recu, merci" | Done (Phase 1) |
| Supprimer exercise-reviewer module | Dead code apres Phase 1, references polluent le codebase | Done (Phase 3) |
| Migrer ai_reviewed DB records | Orphaned status values after type cleanup | Done (Phase 3, migration 020) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check -- still the right priority?
3. Audit Out of Scope -- reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-01 after Phase 3 completion — all milestone phases complete*
