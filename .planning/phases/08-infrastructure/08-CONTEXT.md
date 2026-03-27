# Phase 8: Infrastructure - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Le package `packages/bot-discord-quiz` existe, se connecte à la guild Discord, et les 4 tables quiz sont live dans Supabase. C'est la fondation sur laquelle toutes les autres phases se construisent.

Requirements: BOT-01→05, DATA-01→07 (12 requirements)

</domain>

<decisions>
## Implementation Decisions

### Quiz Expiration
- **D-01:** Les quiz expirent après **48h**. Le cron de fermeture automatique vérifie les quiz actifs dont la date de création dépasse 48h et les passe en statut `closed`. Les sessions étudiants en cours deviennent `expired_incomplete` avec score partiel calculé.

### Bot Identity
- **D-02:** Le bot Discord s'appelle **TeacherBot**. C'est le nom visible dans Discord (DMs, profil). Le package npm reste `@assistme/bot-discord-quiz` pour la cohérence monorepo.

### Admin Channel
- **D-03:** Le channel admin dédié au quiz s'appelle **quiz-admin**. Le bot quiz poste ses digests et alertes dans ce channel. Séparé de #админ du bot principal.

### Claude's Discretion
- Schema exact des 4 tables (colonnes, types, contraintes, index) — suivre les requirements DATA-01→04 comme guide
- Env vars naming convention — cohérent avec l'existant (DISCORD_QUIZ_BOT_TOKEN, etc.)
- Structure interne du package (handlers/, commands/, cron/, utils/) — calquer sur bot-discord
- Vitest config — étendre le pattern existant du monorepo

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bot Discord existant (pattern à suivre)
- `packages/bot-discord/package.json` — Structure package, dépendances, scripts
- `packages/bot-discord/tsconfig.json` — Config TypeScript (extends root)
- `packages/bot-discord/src/index.ts` — Entry point pattern (env, client, handlers, crons)
- `packages/bot-discord/src/config.ts` — Noms des channels et rôles Discord

### Core (shared)
- `packages/core/src/db/formation/` — Pattern DB operations (students.ts, sessions.ts, exercises.ts)
- `packages/core/src/types/index.ts` — Types existants (Student, Session, ExerciseStatus)
- `packages/core/src/db/client.ts` — Supabase client singleton

### Workspace config
- `pnpm-workspace.yaml` — Wildcard `packages/*` (le nouveau package sera auto-détecté)
- `tsconfig.json` (root) — Config TS partagée

### Migrations existantes
- `supabase/migrations/004_students_system.sql` — Schema étudiants (référencé par quiz)
- `supabase/migrations/005_sessions_system.sql` — Schema sessions (référencé par quiz)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/bot-discord/package.json` — Template exact pour le nouveau package (deps, scripts, structure)
- `packages/bot-discord/src/config.ts` — Pattern pour channel/role names centralisés
- `packages/bot-discord/src/utils/auth.ts` — Fonctions `isAdmin()`, `isStudent()` réutilisables via core ou à dupliquer
- `packages/core/src/db/formation/` — Pattern CRUD complet (create, get, update, list, search) pour entités formation

### Established Patterns
- **Entry point** : dotenv → Client → register commands → setup handlers → register crons → login
- **DB operations** : fonctions exportées par entité, Supabase client singleton, erreurs loggées puis rethrown
- **Types** : enums string union, interfaces dans `types/index.ts`
- **Migrations** : fichier SQL numéroté, RLS policies, index GIN/HNSW

### Integration Points
- `@assistme/core` workspace dependency — toutes les DB operations et types partagés
- Tables `students` et `sessions` existantes — les tables quiz les référencent via foreign keys
- `pnpm-workspace.yaml` wildcard — le package est auto-inclus

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard infrastructure phase following established patterns from bot-discord.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-infrastructure*
*Context gathered: 2026-03-27*
