# Exercise Submission Flow - Bot Discord

## What This Is

Solidification du flow de soumission d'exercices pour le bot Discord formateur (`packages/bot-discord`). L'etudiant soumet des exercices via DM (multi-messages : texte, fichiers, liens), confirme via apercu, et le formateur review avec une UX amelioree. Unicite par session, re-soumission controlee apres feedback.

## Core Value

Un etudiant soumet un exercice proprement (multi-format, apercu, confirmation), le formateur le review facilement, et personne ne se perd dans des doublons ou des soumissions vides.

## Current Milestone: v2.0 Exercise Submission Flow

**Goal:** Solidifier le flow complet de soumission d'exercices — accumulation multi-messages, apercu avant envoi, unicite par session, re-soumission controlee, et UX formateur amelioree.

**Target features:**
- Soumission multi-messages (texte, fichiers, liens) avec apercu avant confirmation
- Unicite 1 etudiant = 1 soumission par session (DB constraint + handler logic)
- Re-soumission apres feedback (remplace l'ancienne)
- Validation : pas de soumission vide
- L'etudiant precise la session (doit exister en DB)
- UX formateur : navigation/review plus fluide (threads, boutons, re-ouverture facile)

## Requirements

### Validated

- Monorepo pnpm workspaces fonctionnel -- existing
- Bot Discord en production avec discord.js 14.16 -- existing
- Core package (DB Supabase, AI Claude, agents) -- existing
- Handlers: DM agent, admin handler, FAQ, exercise review, slash commands -- existing
- Test infrastructure: Vitest, unit, integration, E2E, CI -- validated v1.0
- Dev environment: separate Discord bot, test server -- validated v1.0

### Active

- [ ] UX formateur : review plus fluide, re-ouverture facile

### Validated in Phase 6

- [x] Apercu avant confirmation de soumission — Validated Phase 6
- [x] Validation : refus de soumission vide (sans contenu) — Validated Phase 6
- [x] Etudiant precise la session (validation existence en DB) — Validated Phase 6
- [x] Re-soumission apres feedback (remplace l'ancienne) — Validated Phase 6

### Out of Scope

- Tests pour les bots Telegram (admin + public) -- scope limite au bot Discord
- Tests de performance/load -- pas la priorite
- UI tests / visual regression -- backend only
- Nouveau design du DM agent complet -- on ameliore le flow existant

## Context

- **Codebase existante:** ~15K+ lignes TypeScript strict, ESM modules
- **v1.0 complete:** 163 tests (unit + integration + E2E), CI, dev environment
- **Bot Discord:** discord.js 14.16, handlers (DM, admin, FAQ, review), slash commands, crons
- **Core partage:** Supabase (PostgreSQL + pgvector), Claude API (agents avec tool use)
- **Tables existantes:** students, student_exercises, sessions, submission_attachments
- **DM Agent:** Claude tool_use, 5 outils dont search_course_content
- **Admin handler:** review-buttons.ts, thread-based review

## Constraints

- **Stack:** TypeScript strict, ESM, pnpm workspaces
- **Runtime:** Node.js 20+
- **Test framework:** Vitest — tests obligatoires pour tout changement
- **DB:** Supabase (PostgreSQL), migrations incrementales
- **Discord limitations:** bots can't DM bots (E2E uses synthetic events)
- **Pre-push hook:** tests doivent passer avant tout push

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vitest over Jest | Meilleur support ESM natif, plus rapide | Validated v1.0 |
| Bot Discord de dev separe | Zero risque sur la prod | Validated v1.0 |
| Supabase local Docker | Integration tests avec vraie DB | Validated v1.0 |
| 3 couches de tests | Unit + Integration + E2E | Validated v1.0 |
| Pre-push hook obligatoire | Tests impossible a contourner | Validated v1.0 |
| Partial unique index (not full constraint) | Scope to active statuses only — allows resubmission after approval | Validated Phase 5 |
| Atomic session_id in single INSERT | No NULL window, no separate UPDATE race condition | Validated Phase 5 |
| DM agent returns intent, handler confirms | Preview-confirm flow with buttons, agent doesn't write to DB | Validated Phase 6 |
| Button timeout preserves attachments | Student can retry without re-uploading files | Validated Phase 6 |

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
*Last updated: 2026-03-25 — Phase 6 complete (submission handler correctness + student UX)*
