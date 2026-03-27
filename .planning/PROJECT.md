# Bot Discord Quiz

## What This Is

Bot Discord séparé (`packages/bot-discord-quiz`) qui évalue les étudiants de la formation via des quiz interactifs liés aux sessions. L'admin uploade un fichier TXT contenant les questions/réponses, le bot parse, prévisualise, puis envoie le quiz à tous les étudiants actifs en DM. L'étudiant répond question par question via boutons Discord. Les résultats sont stockés de manière ultra-structurée en BDD, et l'admin reçoit des digests et alertes en cas de scores bas.

## Core Value

Identifier les étudiants qui décrochent via des quiz automatisés — sans que l'admin ait à corriger manuellement quoi que ce soit.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Admin uploade un TXT libre via slash command et le bot parse les questions via IA
- [ ] Preview obligatoire : l'admin voit le quiz structuré et confirme avant envoi
- [ ] Envoi immédiat en DM à tous les étudiants actifs après confirmation
- [ ] 3 types de questions : QCM, Vrai/Faux, Ouverte (conversationnelle)
- [ ] Étudiant répond question par question via boutons Discord (QCM/V-F) ou texte (ouvertes)
- [ ] Évaluation automatique : QCM/V-F exact match, ouvertes évaluées par IA (tolérance souple vs réponse attendue du TXT)
- [ ] Pause/reprise : état sauvegardé en BDD, l'étudiant peut revenir plus tard
- [ ] 1 seul quiz actif par étudiant — nouveau quiz ferme l'ancien automatiquement (score partiel, statut expired_incomplete)
- [ ] One-shot : pas de re-tentative possible
- [ ] Feedback à la fin : question par question (correct/incorrect + explication du TXT) + score total en %
- [ ] Alerte admin si score < 60%
- [ ] Admin digest dans channel dédié : qui a fait, qui n'a pas fait, scores, incomplets
- [ ] Fermeture automatique des quiz expirés (cron)
- [ ] Modèle de données extensible : quiz, questions, réponses étudiants, scores, statuts, timestamps
- [ ] Full russe côté étudiant
- [ ] Bot complètement séparé du bot Discord principal (nouveau token, nouveau process)
- [ ] Zéro modification du bot Discord existant

### Out of Scope

- Modification du bot Discord principal — isolation totale, zéro régression
- Re-tentative de quiz — one-shot, l'étudiant doit écouter le cours
- Timer par question — pas un examen, c'est du feedback
- Quiz dans un channel public — DM uniquement
- Génération automatique de questions par IA — le TXT est la source de vérité
- Correction manuelle par l'admin — tout est automatisé
- Intégration avec le Tsarag agent existant — slash commands dédiées sur le nouveau bot

## Context

### Architecture existante
- Monorepo pnpm : `packages/core` (shared), `packages/bot-telegram`, `packages/bot-telegram-public`, `packages/bot-discord`
- Le quiz bot sera `packages/bot-discord-quiz` — même pattern que les autres bots
- Partage `@assistme/core` pour DB (Supabase), types, logger
- Discord.js 14.16.0, même guild que le bot principal
- Étudiants déjà enregistrés dans table `students` avec `discord_id`
- Sessions déjà structurées dans table `sessions` (24 sessions × 6 modules)

### Formation
- 30 étudiants, formation en russe
- Sessions avec exercices, le quiz complète l'évaluation
- Fichiers quiz existants dans `learning-knowledge/module-*/session-XX-quiz.md`
- L'admin (formateur) veut identifier les décrocheurs rapidement

### Interaction admin
- Channel Discord dédié pour les quiz (séparé de #админ)
- Slash commands : `/quiz-create`, `/quiz-status`, `/quiz-close`
- L'admin uploade le TXT en pièce jointe de la slash command

### Interaction étudiant
- DM du quiz bot (différent du bot principal)
- Bouton "Commencer" pour démarrer
- QCM/V-F : boutons Discord (interactions)
- Ouvertes : réponse texte en DM
- Feedback immédiat à la fin

## Constraints

- **Stack**: TypeScript strict, ESM, pnpm workspaces, discord.js 14 — cohérent avec le monorepo
- **DB**: Supabase (PostgreSQL) — nouvelles tables, pas de modification des tables existantes
- **Bot séparé**: Nouveau token Discord, nouveau process, même guild
- **Isolation**: Zéro import depuis `packages/bot-discord`, uniquement depuis `@assistme/core`
- **Langue**: Tout le contenu étudiant-facing en russe
- **Source de vérité**: Le fichier TXT uploadé par l'admin — l'IA ne sort jamais du scope du document
- **Tests**: Vitest, tests unitaires obligatoires avant commit

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Bot séparé plutôt qu'extension du bot existant | Zéro risque de régression, déploiement indépendant, UX claire | — Pending |
| TXT libre parsé par IA (pas de format structuré imposé) | Moins de friction pour l'admin, format naturel | — Pending |
| Preview obligatoire avant envoi | Le parsing IA peut avoir des erreurs (5%), preview en 30s évite un quiz buggé envoyé à 30 étudiants | — Pending |
| 1 quiz actif max par étudiant | Évite l'accumulation, signal clair de décrochage si incomplet | — Pending |
| Boutons Discord pour QCM/V-F, texte pour ouvertes | Sépare les interactions du DM agent existant, pas de conflit de routing | — Pending |
| Channel admin dédié (pas #админ) | Isolation totale entre les deux bots | — Pending |
| Seuil alerte < 60% | Identifier ceux qui sont "à côté de la plaque", pas les perfectionner | — Pending |
| One-shot, pas de re-tentative | L'objectif est d'évaluer la compréhension réelle, pas de permettre le bachotage | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-27 after initialization*
