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

### Active

- [ ] Supprimer l'auto-review IA (exercise-reviewer) du flow de soumission
- [ ] Supprimer le score IA et le feedback auto-genere des notifications admin
- [ ] Supprimer le placeholder/message IA dans les threads de review
- [ ] Simplifier le DM etudiant apres soumission (juste accuse de reception, pas de score)
- [ ] Ajouter une commande admin d'archivage par session
- [ ] Ajouter le statut `archived` aux exercices
- [ ] Nettoyer les references a exercise-reviewer dans le codebase

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
  - `packages/core/src/ai/formation/exercise-reviewer.ts` — a supprimer/desactiver
  - `packages/bot-discord/src/handlers/dm-handler.ts` — flow de soumission
  - `packages/bot-discord/src/handlers/review-thread.ts` — creation thread review
  - `packages/bot-discord/src/handlers/review-buttons.ts` — boutons approve/revision
  - `packages/core/src/db/formation/exercises.ts` — requetes DB exercices

## Constraints

- **Isolation**: Zero import depuis `packages/bot-discord-quiz`, uniquement `@assistme/core`
- **DB**: Nouvelles migrations pour le statut `archived`, pas de modification des tables existantes (ajout seulement)
- **Langue**: Contenu etudiant-facing en russe
- **Tests**: Vitest, tests unitaires obligatoires avant commit (`pnpm test:unit`)
- **Backward compat**: Les exercices existants en `ai_reviewed` doivent rester consultables

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supprimer l'auto-review IA | Score non fiable pour non-codeurs pilotant l'IA, redondant avec le bot quiz | -- Pending |
| Archivage par session (pas par exercice) | Le formateur gere par session, pas par etudiant individuel | -- Pending |
| Garder le flow review admin intact | Le formateur veut continuer a corriger manuellement quand il le souhaite | -- Pending |
| Accuse de reception simple (pas de score) | Sans correction IA, pas de score a montrer — juste "recu, merci" | -- Pending |

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
*Last updated: 2026-03-31 after initialization*
