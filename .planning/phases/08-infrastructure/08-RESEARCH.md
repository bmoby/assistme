# Phase 8: Infrastructure - Research

**Researched:** 2026-03-27
**Domain:** New pnpm monorepo package scaffold + Supabase SQL migration + Vitest project registration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (Quiz Expiration):** Quiz expirent après 48h. Le cron de fermeture automatique vérifie les quiz actifs dont la date de création dépasse 48h et les passe en statut `closed`. Les sessions étudiants en cours deviennent `expired_incomplete` avec score partiel calculé.
- **D-02 (Bot Identity):** Le bot Discord s'appelle **TeacherBot**. Nom visible dans Discord (DMs, profil). Le package npm reste `@assistme/bot-discord-quiz` pour la cohérence monorepo.
- **D-03 (Admin Channel):** Le channel admin dédié au quiz s'appelle **quiz-admin**. Le bot quiz poste ses digests et alertes dans ce channel. Séparé de #админ du bot principal.

### Claude's Discretion

- Schema exact des 4 tables (colonnes, types, contraintes, index) — suivre les requirements DATA-01→04 comme guide
- Env vars naming convention — cohérent avec l'existant (DISCORD_QUIZ_BOT_TOKEN, etc.)
- Structure interne du package (handlers/, commands/, cron/, utils/) — calquer sur bot-discord
- Vitest config — étendre le pattern existant du monorepo

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BOT-01 | Nouveau package `packages/bot-discord-quiz` dans le monorepo pnpm | pnpm-workspace.yaml uses `packages/*` wildcard — new package auto-detected; pattern from bot-discord/package.json confirmed |
| BOT-02 | Nouveau token Discord, nouveau bot application, même guild | New env vars `DISCORD_QUIZ_BOT_TOKEN`, `DISCORD_QUIZ_CLIENT_ID`; same `DISCORD_GUILD_ID` reused |
| BOT-03 | Imports uniquement depuis `@assistme/core` — zéro import depuis `packages/bot-discord` | Confirmed: `@assistme/core` exports all needed DB functions and types via workspace:* dep |
| BOT-04 | Entry point indépendant, process séparé, `pnpm -F @assistme/bot-discord-quiz dev` | Script name `dev` with `tsx watch src/index.ts`; -F flag targets by package name |
| BOT-05 | Tests unitaires avec Vitest | New project entry in root `vitest.config.ts`; pattern confirmed from bot-discord project entry |
| DATA-01 | Table `quizzes` | Migration 018; schema documented in Architecture Patterns section |
| DATA-02 | Table `quiz_questions` | Migration 018; schema documented |
| DATA-03 | Table `student_quiz_sessions` | Migration 018; foreign key → `students.id` (migration 004) |
| DATA-04 | Table `student_quiz_answers` | Migration 018; foreign key → `student_quiz_sessions.id` |
| DATA-05 | Cron job pour fermer automatiquement les quiz expirés | `scheduler.registerJob()` from `@assistme/core`; 48h threshold per D-01 |
| DATA-06 | TXT original stocké | Out of scope for Phase 8 (mapped to Phase 9 in REQUIREMENTS.md traceability) |
| DATA-07 | Modèle de données extensible — timestamps, statuts, scores structurés | timestamps + CHECK constraints + JSONB columns confirmed |
</phase_requirements>

---

## Summary

Phase 8 is a pure infrastructure setup phase: create `packages/bot-discord-quiz`, write the Supabase migration for four quiz tables, and register the bot-discord-quiz project in the root Vitest config. There is no new logic to invent — every pattern to follow already exists in the monorepo.

The dominant reference is `packages/bot-discord`. Its `package.json`, `tsconfig.json`, entry-point sequence (`dotenv → Client → commands → handlers → crons → login`), and Vitest project entry in the root `vitest.config.ts` are the exact templates to clone and adapt. The pnpm workspace wildcard `packages/*` means no workspace configuration changes are needed.

The migration is number 018 (017 is the last existing one). The four tables follow the same patterns already present: UUID primary keys via `uuid_generate_v4()`, `TIMESTAMPTZ` timestamps, `CHECK` constraints for status enums, JSONB for structured data, and foreign keys referencing `students` and `sessions`.

**Primary recommendation:** Clone bot-discord package structure verbatim, create migration 018 with the four quiz tables, add a `bot-discord-quiz` project entry to the root `vitest.config.ts` — and add two new env vars to `.env.example`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| discord.js | ^14.16.0 | Discord gateway client, REST API, slash command registration | Already used by bot-discord; same guild |
| @assistme/core | workspace:* | DB (Supabase), types, logger, scheduler | All shared logic lives here; BOT-03 requires zero import from bot-discord |
| dotenv | ^17.3.1 | Load .env / .env.dev at process start | Existing pattern in all bot packages |
| tsx | ^4.19.0 | TypeScript dev runner (watch mode) | Used by all packages for `dev` script |
| vitest | ^4.1.1 | Unit test runner | Already in monorepo; project entries in root vitest.config.ts |
| node-cron | ^3.0.3 | Cron scheduling | Already in @assistme/core scheduler module — not a direct dep |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| typescript | ^5.7.0 | Type checking | devDependency — same as all packages |
| @types/node | ^20.17.0 | Node.js type definitions | devDependency — same as all packages |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending root vitest.config.ts | Per-package vitest.config.ts | Per-package config is valid but root config keeps all project entries centralized — existing pattern is root-only |

**Installation (new package):**
```bash
cd packages/bot-discord-quiz
pnpm install
```
Root install picks it up automatically via workspace wildcard.

---

## Architecture Patterns

### Recommended Project Structure

```
packages/bot-discord-quiz/
├── package.json             # @assistme/bot-discord-quiz, type:module
├── tsconfig.json            # extends ../../tsconfig.json
└── src/
    ├── index.ts             # Entry point: dotenv → Client → commands → handlers → crons → login
    ├── config.ts            # CHANNELS, ROLES constants (quiz-admin, TeacherBot)
    ├── cron/
    │   └── index.ts         # registerCronJobs(): quiz expiration cron (every hour or */30 * * * *)
    ├── handlers/            # Future phases — empty index.ts placeholder is sufficient
    │   └── index.ts
    ├── commands/            # Future phases — empty index.ts placeholder is sufficient
    │   └── index.ts
    └── smoke.test.ts        # Baseline: env vars present, runs without crashing
```

### Pattern 1: package.json clone

Mirror `packages/bot-discord/package.json` exactly, changing only the package name:

```json
{
  "name": "@assistme/bot-discord-quiz",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@assistme/core": "workspace:*",
    "discord.js": "^14.16.0",
    "dotenv": "^17.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.17.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^4.1.1"
  }
}
```

### Pattern 2: Entry point sequence

Mirror `packages/bot-discord/src/index.ts` with quiz-specific names:

```typescript
// Source: packages/bot-discord/src/index.ts (established pattern)
import dotenv from 'dotenv';
// Load .env.dev first (overrides), then .env (defaults)
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../..');
dotenv.config({ path: resolve(root, '.env.dev') });
dotenv.config({ path: resolve(root, '.env') });

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { logger } from '@assistme/core';
import { registerCronJobs } from './cron/index.js';

async function main(): Promise<void> {
  const token = process.env['DISCORD_QUIZ_BOT_TOKEN'];
  const guildId = process.env['DISCORD_GUILD_ID'];        // shared with bot-discord
  const clientId = process.env['DISCORD_QUIZ_CLIENT_ID'];

  if (!token) throw new Error('DISCORD_QUIZ_BOT_TOKEN not set');
  if (!guildId) throw new Error('DISCORD_GUILD_ID not set');
  if (!clientId) throw new Error('DISCORD_QUIZ_CLIENT_ID not set');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });

  client.once('ready', (readyClient) => {
    logger.info({ user: readyClient.user.tag, guildId }, 'TeacherBot is online');
    registerCronJobs(client, guildId);
  });

  client.on('error', (error) => {
    logger.error({ error }, 'Discord quiz client error');
  });

  await client.login(token);
}

main().catch((error) => {
  logger.error({ err: error }, 'Failed to start TeacherBot');
  process.exit(1);
});
```

**Note on intents:** Phase 8 only needs `Guilds` (to read guild info and post to quiz-admin channel) and `DirectMessages` + `Partials.Channel` (for DM support used in later phases). `GuildMessages` and `MessageContent` are not needed until Phase 10.

### Pattern 3: Config file

```typescript
// Source: packages/bot-discord/src/config.ts (established pattern)
export const ROLES = {
  admin: 'tsarag',
  student: 'student',
} as const;

export const CHANNELS = {
  quizAdmin: 'quiz-admin',   // D-03: dedicated quiz admin channel
} as const;
```

### Pattern 4: Cron job registration

```typescript
// Source: packages/bot-discord/src/cron/index.ts (established pattern)
import { Client } from 'discord.js';
import { scheduler, logger } from '@assistme/core';
import { closeExpiredQuizzes } from './close-expired-quizzes.js';

export function registerCronJobs(client: Client, guildId: string): void {
  // Close expired quiz sessions every 30 minutes
  // D-01: 48h expiration threshold
  scheduler.registerJob('quiz-close-expired', '*/30 * * * *', async () => {
    await closeExpiredQuizzes();
    logger.info('Expired quiz sessions closed');
  });

  scheduler.startAllJobs();
  logger.info('TeacherBot cron jobs started');
}
```

### Pattern 5: DB module for quiz tables (in core)

All quiz DB operations belong in `packages/core/src/db/quiz/` following the formation/ pattern:

```typescript
// Source: packages/core/src/db/formation/students.ts (established CRUD pattern)
const TABLE = 'quizzes';

export async function getActiveQuizzes(): Promise<Quiz[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) {
    logger.error({ error }, 'Failed to get active quizzes');
    throw error;
  }
  return (data ?? []) as Quiz[];
}
```

### Pattern 6: Supabase migration numbering

The last migration is `017_exercise_submission_v2.sql`. New migration must be `018_quiz_system.sql`.

```sql
-- ============================================
-- Vibe Coder - Quiz System
-- Migration 018
-- ============================================

-- quizzes table (DATA-01)
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'closed')),
  questions_data JSONB,           -- raw parsed data (extensibility)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- quiz_questions table (DATA-02)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'true_false', 'open')),
  question_text TEXT NOT NULL,
  choices JSONB,                  -- null for open questions
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- student_quiz_sessions table (DATA-03)
CREATE TABLE IF NOT EXISTS student_quiz_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'expired_incomplete')),
  current_question INTEGER NOT NULL DEFAULT 0,
  score DECIMAL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- student_quiz_answers table (DATA-04)
CREATE TABLE IF NOT EXISTS student_quiz_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES student_quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  student_answer TEXT NOT NULL,
  is_correct BOOLEAN,
  ai_evaluation JSONB,            -- for open questions (extensibility D-07)
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_session_number ON quizzes(session_number);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_number ON quiz_questions(quiz_id, question_number);
CREATE INDEX IF NOT EXISTS idx_student_quiz_sessions_student ON student_quiz_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_quiz_sessions_quiz ON student_quiz_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_student_quiz_sessions_status ON student_quiz_sessions(status);
CREATE INDEX IF NOT EXISTS idx_student_quiz_answers_session ON student_quiz_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_student_quiz_answers_question ON student_quiz_answers(question_id);
```

### Pattern 7: Vitest project entry

Add two entries to the root `vitest.config.ts` projects array — one for unit tests, one for integration tests (mirroring the bot-discord pattern):

```typescript
// Source: vitest.config.ts (established pattern)
{
  test: {
    name: 'bot-discord-quiz',
    root: path.resolve(__dirname, 'packages/bot-discord-quiz'),
    environment: 'node',
    pool: 'forks',
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts', 'src/**/*.e2e.test.ts'],
    env: {
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key-placeholder',
      ANTHROPIC_API_KEY: 'test-anthropic-key-placeholder',
      OPENAI_API_KEY: 'test-openai-key-placeholder',
      DISCORD_QUIZ_BOT_TOKEN: 'test-discord-quiz-token-placeholder',
      DISCORD_QUIZ_CLIENT_ID: 'test-quiz-client-id-placeholder',
      DISCORD_GUILD_ID: 'test-guild-id-placeholder',
      LOG_LEVEL: 'silent',
    },
  },
  resolve: {
    alias: {
      '@assistme/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
    },
  },
},
```

The root-level `pnpm test:unit` command uses `--project core --project bot-discord`. It must be updated to also include `--project bot-discord-quiz`:
```
"test:unit": "vitest run --project core --project bot-discord --project bot-discord-quiz"
```

### Pattern 8: Types for quiz entities

New quiz types belong in `packages/core/src/types/index.ts` following the existing block structure:

```typescript
// ============================================
// Quiz Types
// ============================================

export type QuizStatus = 'draft' | 'active' | 'closed';
export type QuizQuestionType = 'mcq' | 'true_false' | 'open';
export type StudentQuizSessionStatus = 'not_started' | 'in_progress' | 'completed' | 'expired_incomplete';

export interface Quiz {
  id: string;
  session_number: number;
  status: QuizStatus;
  questions_data: Record<string, unknown> | null;
  created_at: string;
  closed_at: string | null;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_number: number;
  type: QuizQuestionType;
  question_text: string;
  choices: Record<string, unknown> | null;
  correct_answer: string;
  explanation: string | null;
  created_at: string;
}

export interface StudentQuizSession {
  id: string;
  student_id: string;
  quiz_id: string;
  status: StudentQuizSessionStatus;
  current_question: number;
  score: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface StudentQuizAnswer {
  id: string;
  session_id: string;
  question_id: string;
  student_answer: string;
  is_correct: boolean | null;
  ai_evaluation: Record<string, unknown> | null;
  answered_at: string;
}
```

### Anti-Patterns to Avoid

- **Importing from `packages/bot-discord`:** BOT-03 is a hard constraint. All imports must come from `@assistme/core` or `discord.js`. If bot-discord has a helper you want, copy the logic into the new package or move it to core.
- **Separate `vitest.config.ts` per package:** The project uses a root-level config. Adding a per-package config creates a split that breaks `pnpm test:unit`.
- **Adding `GuildMessages` + `MessageContent` intents now:** Not needed for Phase 8. Add only what the cron job and bot-online check require. Unnecessary intents can cause Discord rate-limit issues.
- **Using `migrations/018` for anything not DATA-01→04:** Keep the migration focused. TXT storage (DATA-06) is Phase 9.
- **Putting quiz DB operations inside `packages/bot-discord-quiz`:** All DB operations belong in `packages/core/src/db/quiz/` so they are accessible to other packages and testable independently.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron scheduling | Custom setInterval/setTimeout | `scheduler` from `@assistme/core` | Already wraps node-cron with error handling, logging, and start/stop |
| Supabase client | New createClient() call | `getSupabase()` from `@assistme/core` | Singleton pattern already initialized; double-initialization causes connection leaks |
| Discord client options | Re-research intents | Copy from bot-discord/src/index.ts | Established, working intent set with correct `Partials.Channel` for DM support |
| Test env setup | New test infrastructure | Add project entry to root vitest.config.ts | Root config already handles alias resolution, env injection, and pool config |
| DB type casting | Manual `as unknown as T` | Follow `students.ts` pattern: `return data as Student` | Supabase client generic is `any`; project convention is type assertion at return boundary |

---

## Common Pitfalls

### Pitfall 1: dotenv path resolution in ESM

**What goes wrong:** `dotenv.config({ path: '.env' })` resolves relative to `process.cwd()` (project root when running via `pnpm -F`). But `__dirname` is not available in ESM by default — accessing it without the `fileURLToPath` / `dirname` pattern throws a ReferenceError.

**Why it happens:** ESM modules do not expose `__dirname` and `__filename` globals.

**How to avoid:** Copy the exact pattern from `bot-discord/src/index.ts`:
```typescript
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../..');
dotenv.config({ path: resolve(root, '.env.dev') });
dotenv.config({ path: resolve(root, '.env') });
```

**Warning signs:** `process.env['DISCORD_QUIZ_BOT_TOKEN']` is undefined at runtime even when `.env` has the value set.

### Pitfall 2: Supabase migration order dependency

**What goes wrong:** `student_quiz_sessions` has a foreign key to `students`. If the migration is applied before migration 004 (students), or if the migration file number is out of order, it will fail.

**Why it happens:** PostgreSQL enforces foreign key existence at DDL time.

**How to avoid:** Name the file `018_quiz_system.sql` (next after 017). The migration uses `REFERENCES students(id)` which was created in 004. Running `supabase db push` applies migrations in numeric order.

**Warning signs:** `ERROR: relation "students" does not exist` during migration apply.

### Pitfall 3: `pnpm test:unit` not picking up new package

**What goes wrong:** Running `pnpm test:unit` after adding the new package's project entry to `vitest.config.ts` but forgetting to add `--project bot-discord-quiz` to the root `package.json` test:unit script means the new tests are silently skipped.

**Why it happens:** The root `test:unit` script explicitly names projects: `vitest run --project core --project bot-discord`. It does not auto-discover new projects.

**How to avoid:** Update the `test:unit` (and `test:coverage`) commands in root `package.json` to include `--project bot-discord-quiz`.

**Warning signs:** `pnpm test:unit` passes but `vitest run --project bot-discord-quiz` shows test results that weren't in the unit suite output.

### Pitfall 4: Discord.js private constructors in tests

**What goes wrong:** `new Client()` in test code triggers Discord.js to validate token and initiate WebSocket — tests hang or throw network errors.

**Why it happens:** discord.js `Client` constructor does not require a token but event-based code tries to call `.login()`.

**How to avoid:** The smoke.test.ts pattern used by bot-discord does NOT import the main index.ts or instantiate a Client. It only tests env var presence and pure utility functions. Follow this pattern for Phase 8 baseline tests.

**Warning signs:** Tests hang for 30+ seconds waiting for Discord gateway timeout.

### Pitfall 5: `closeExpiredQuizzes` cron logic — partial score calculation

**What goes wrong:** Closing an `in_progress` session requires computing a partial score from existing answers. Attempting to do this from scratch risks off-by-one errors (e.g. scoring questions not yet answered).

**Why it happens:** The session stores `current_question` (zero-indexed position), not which questions have been answered. Only `student_quiz_answers` rows represent actual submitted answers.

**How to avoid:** Score = `(count of is_correct=true answers / total questions in quiz) * 100`. Query `student_quiz_answers` by `session_id`, count `is_correct = true`, divide by `quiz_questions` count for that quiz_id. Set `score` on the session before flipping status to `expired_incomplete`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20+ | Runtime | ✓ | v24.14.0 | — |
| pnpm | Workspace management | ✓ | 10.32.1 | — |
| Supabase CLI | Migration apply | ✓ | 2.75.0 | — |
| Supabase local (Docker) | Migration apply, integration tests | ✓ | Running at 127.0.0.1:54321 | — |
| Docker | Supabase local | ✓ | 29.2.0 | — |
| discord.js v14 | Bot client | ✓ (in bot-discord already) | ^14.16.0 | — |
| Vitest | Unit tests | ✓ | ^4.1.1 | — |
| DISCORD_QUIZ_BOT_TOKEN | Bot login | ✗ | — | **Blocking** — requires creating new Discord bot application |
| DISCORD_QUIZ_CLIENT_ID | Slash command registration | ✗ | — | **Blocking** — same application as above |
| DISCORD_GUILD_ID | Guild targeting | ✓ (shared with bot-discord) | Exists in .env | — |

**Missing dependencies with no fallback:**
- `DISCORD_QUIZ_BOT_TOKEN` and `DISCORD_QUIZ_CLIENT_ID` — a new bot application must be created in the Discord Developer Portal before Phase 8 execution. This is noted as a known blocker in STATE.md. The planner must include a "create bot application" step as a prerequisite gate.

**Missing dependencies with fallback:**
- None.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-package vitest.config.ts | Root vitest.config.ts with projects array | Phase 7 (bot-discord testing phase) | All test commands run from root; new packages add a project entry, not a new config file |
| CJS modules | ESM-only (`"type": "module"`) | Project start | All imports use `.js` extension; no `require()`; `__dirname` needs `fileURLToPath` workaround |

---

## Open Questions

1. **Which cron frequency for quiz expiration?**
   - What we know: D-01 says close quizzes > 48h old. No frequency specified.
   - What's unclear: Every 30 minutes vs. every hour vs. once daily at midnight.
   - Recommendation: `*/30 * * * *` (every 30 min) — low DB cost (one SELECT query), fast enough that expiry is within 30 min of threshold.

2. **Should `closeExpiredQuizzes` be in `packages/core` or `packages/bot-discord-quiz`?**
   - What we know: DB operations belong in core per CLAUDE.md convention.
   - What's unclear: The actual "close" operation (UPDATE quizzes + UPDATE sessions) is purely DB work.
   - Recommendation: Put `closeExpiredQuizSessions()` in `packages/core/src/db/quiz/` — the cron just calls it. This keeps the function testable without Discord.

3. **Foreign key: `student_quiz_sessions.student_id` references `students.id` — what happens when a student is deleted?**
   - What we know: `ON DELETE CASCADE` is used in other tables (e.g., `submission_attachments`).
   - What's unclear: Whether students are ever deleted or just set to `dropped` status.
   - Recommendation: Use `ON DELETE CASCADE` for consistency with rest of schema (see `005_sessions_system.sql`). If student is dropped, their quiz history goes with them.

---

## Sources

### Primary (HIGH confidence)

- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/bot-discord/package.json` — exact dependency versions, script names
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/bot-discord/src/index.ts` — entry point pattern, dotenv/ESM workaround, intent list
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/bot-discord/src/config.ts` — CHANNELS/ROLES centralization pattern
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/bot-discord/src/cron/index.ts` — cron registration pattern
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/core/src/db/formation/students.ts` — DB module CRUD pattern
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/core/src/scheduler/index.ts` — scheduler API
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/supabase/migrations/004_students_system.sql` — foreign key target for student_quiz_sessions
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/supabase/migrations/017_exercise_submission_v2.sql` — confirms 018 is next
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/vitest.config.ts` — project entries, env injection, alias config
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/pnpm-workspace.yaml` — `packages/*` wildcard confirmed
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/core/src/types/index.ts` — type definition conventions
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/bot-discord/src/__mocks__/discord/builders.ts` — Discord mock builder pattern for tests

### Secondary (MEDIUM confidence)

- `supabase status` output — Supabase local confirmed running at 127.0.0.1:54321
- `docker info` output — Docker available v29.2.0

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions directly read from package.json
- Architecture: HIGH — patterns read directly from source files, no guessing
- Migration schema: HIGH — requirements explicit (DATA-01→04), column types follow existing migration conventions
- Vitest config: HIGH — pattern read directly from vitest.config.ts
- Pitfalls: HIGH — sourced from actual code artifacts and known ESM/Discord.js constraints

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable stack, patterns unlikely to change)
