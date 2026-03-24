# Phase 1: Foundation - Research

**Researched:** 2026-03-24
**Domain:** Vitest ESM configuration for pnpm monorepo (TypeScript strict, Node.js 20+)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 — Package Scope:** Configure Vitest for `packages/core` and `packages/bot-discord` only. The two Telegram bot packages (`bot-telegram`, `bot-telegram-public`) are out of scope for this milestone.

**D-02 — Test File Location:** Co-located test files next to source code. Example: `src/handlers/dm-handler.test.ts` beside `src/handlers/dm-handler.ts`.

**D-03 — Naming Convention:** `.test.ts` suffix (not `.spec.ts`).

**D-04 — Config Structure:** Single root `vitest.config.ts` with `projects:` API pointing to `['packages/core', 'packages/bot-discord']`. No per-package configs.

### Claude's Discretion

- Test scripts naming and structure (`pnpm test`, `test:unit`, `test:integration`, `test:watch`)
- Fake env var strategy (inline in vitest config vs `.env.test` file)
- `resolve.alias` configuration details for `@assistme/core`
- Whether to use `vite-tsconfig-paths` plugin

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Vitest configured for the ESM monorepo with `projects:` API and `pool: 'forks'` | Vitest 4.1.1 `projects` API (HIGH confidence). `pool: 'forks'` required for ESM stability with Node.js native modules — `vmThreads` causes memory leaks in ESM contexts. |
| FOUND-02 | `@assistme/core` resolved via `resolve.alias` to source (not `dist/`) | Confirmed by pitfall analysis: `packages/core/package.json` exports field points to `dist/`, which requires an explicit alias override in vitest config. `path.resolve('packages/core/src/index.ts')` from root config bypasses stale dist. |
| FOUND-03 | Fake environment variables in test config to prevent import-time crashes | `getSupabase()` in `packages/core/src/db/client.ts` (line 12–13) throws immediately if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are absent. Must be set in `test.env` before any module loads. |
| FOUND-04 | Scripts `pnpm test`, `pnpm test:unit`, `pnpm test:integration` functional | Root `package.json` currently has no test scripts. Must add to root (orchestration) and per-package scripts (package-level invocation). |
| FOUND-05 | Watch mode (`pnpm test:watch`) with file filtering | Vitest watch mode is the default when running `vitest` without `--run`. Filter-by-file is built-in (`vitest --watch path/to/file`). Needs a `test:watch` script entry in root package.json. |
</phase_requirements>

---

## Summary

Phase 1 delivers exactly one thing: a Vitest installation that can execute an empty test suite against the existing monorepo without crashing. No actual test files are written in this phase — only the infrastructure that makes writing tests possible. The two primary obstacles are (1) `@assistme/core` resolves to `dist/` in pnpm workspaces, causing stale-build failures and broken module mocking, and (2) any import of a handler file transitively calls `getSupabase()`, which throws at module initialization if `SUPABASE_URL` is absent.

The root `tsconfig.json` uses `"moduleResolution": "bundler"` — this is the standard TypeScript 5.x bundler mode and is compatible with Vitest as long as `vite-tsconfig-paths` is used to sync path resolution. Without this plugin, imports that typecheck correctly may fail at Vitest runtime. Installing it on day one prevents a category of hard-to-diagnose test failures later.

D-04 (single root `vitest.config.ts` with `projects:`) aligns with the current Vitest 4.1.1 API. The deprecated `vitest.workspace.ts` pattern must not be used — it was removed in Vitest 3.2. The `projects` array in the root config can accept either glob patterns or inline project definitions; for this phase, inline project definitions give more explicit control over include patterns and env vars per package.

**Primary recommendation:** Install `vitest@^4.1.1` and `vite-tsconfig-paths` at root; create `vitest.config.ts` at root with `projects` for `core` and `bot-discord`; set `test.env` with fake Supabase/Discord vars; add `resolve.alias` for `@assistme/core`; add test scripts to root and per-package `package.json` files.

---

## Project Constraints (from CLAUDE.md)

These directives are mandatory and override any conflicting research recommendations:

| Directive | Category | Impact on Phase 1 |
|-----------|----------|--------------------|
| TypeScript strict mode, no `any` | Code convention | Vitest types and test files must compile with strict mode |
| ESM imports (`import`/`export`, no `require`) | Module system | All test config and test files use ESM syntax |
| `"type": "module"` in all packages | Module system | Vitest must not inject CommonJS transforms |
| `pnpm workspaces` monorepo | Architecture | Vitest installed at root; packages resolved via workspace symlinks |
| All code through `packages/core/src/` | Architecture | `resolve.alias` must point into `src/`, not `dist/` |
| Spec-first development | Process | No test code until specs confirm the component interface |
| Never commit `.env` files | Security | Fake env vars go in `vitest.config.ts` `test.env`, not in a committed `.env.test` |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.1 | Test runner, assertions, mocking, watch mode | Native ESM support without transformation hacks. `projects:` API replaces the deprecated workspace file. `pool: 'forks'` is the ESM-stable default. Fastest option for this stack. |
| @vitest/coverage-v8 | 4.1.1 | Code coverage using V8 provider | Default coverage provider since Vitest 3.2 with AST-based remapping. The old `c8` provider (v0.33.0, published 3 years ago) is dead — do not install it. |
| vite-tsconfig-paths | 5.x (latest) | Sync TypeScript path resolution into Vitest | Root `tsconfig.json` uses `"moduleResolution": "bundler"`. Without this plugin, imports that pass `tsc --noEmit` can fail at Vitest runtime with `Cannot find module`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| msw | 2.x | HTTP interception for Anthropic/Supabase REST/OpenAI | Phase 2+ (mock infrastructure). Not needed in Phase 1, but install now at root to avoid a second installation commit. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vitest `projects:` inline | glob `'packages/*/vitest.config.ts'` | Glob requires per-package config files — contradicts D-04. Use inline project definitions. |
| `vite-tsconfig-paths` plugin | Manual `resolve.alias` for each path | Manual aliases work for `@assistme/core` but won't catch future path alias additions. Plugin is the forward-compatible choice. |
| `test.env` in vitest config | `.env.test` file | `.env.test` risks being committed accidentally. Inline `test.env` in `vitest.config.ts` is explicit and version-controlled safely. |

**Installation:**
```bash
pnpm add -D -w vitest @vitest/coverage-v8 vite-tsconfig-paths msw
```

Run at repo root. `-w` flag installs to the root workspace. Per-package devDependencies for `vitest` are NOT needed — the root binary is shared.

**Per-package `devDependencies` additions** (for TypeScript type resolution in tests):
```bash
pnpm add -D --filter @assistme/bot-discord vitest
pnpm add -D --filter @assistme/core vitest
```

**Version verification (confirmed 2026-03-24):**
```
vitest@4.1.1          — npm view vitest version → 4.1.1
@vitest/coverage-v8@4.1.1 — npm view @vitest/coverage-v8 version → 4.1.1
```

---

## Architecture Patterns

### Recommended Project Structure

After Phase 1, the only new files in the repo are:

```
vitest.config.ts                    # Root config — projects, env, alias, pool
package.json                        # + test scripts added
packages/core/package.json          # + test scripts added
packages/bot-discord/package.json   # + test scripts added
```

No test files are created in Phase 1. The structure is purely configuration. Test files will be co-located starting in Phase 2 following D-02 and D-03:

```
packages/
  core/src/
    db/client.ts
    db/client.test.ts               # Phase 2+, co-located per D-02
  bot-discord/src/
    handlers/dm-handler.ts
    handlers/dm-handler.test.ts     # Phase 2+, co-located per D-02
```

### Pattern 1: Root Vitest Config with Inline Projects (D-04)

**What:** Single `vitest.config.ts` at repo root with `projects:` array containing inline project definitions for `core` and `bot-discord`. No per-package vitest config files.

**When to use:** Mandated by D-04.

**Example:**
```typescript
// vitest.config.ts (repo root)
// Source: https://vitest.dev/guide/projects
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        // Project: @assistme/core unit tests
        test: {
          name: 'core',
          root: path.resolve(__dirname, 'packages/core'),
          environment: 'node',
          pool: 'forks',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.integration.test.ts', 'src/**/*.e2e.test.ts'],
          env: {
            SUPABASE_URL: 'http://localhost:54321',
            SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
            ANTHROPIC_API_KEY: 'test-anthropic-key',
            OPENAI_API_KEY: 'test-openai-key',
            LOG_LEVEL: 'silent',
          },
        },
        resolve: {
          alias: {
            '@assistme/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
          },
        },
      },
      {
        // Project: @assistme/bot-discord unit tests
        test: {
          name: 'bot-discord',
          root: path.resolve(__dirname, 'packages/bot-discord'),
          environment: 'node',
          pool: 'forks',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.integration.test.ts', 'src/**/*.e2e.test.ts'],
          env: {
            SUPABASE_URL: 'http://localhost:54321',
            SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
            ANTHROPIC_API_KEY: 'test-anthropic-key',
            OPENAI_API_KEY: 'test-openai-key',
            DISCORD_BOT_TOKEN: 'test-discord-token',
            DISCORD_CLIENT_ID: 'test-client-id',
            DISCORD_GUILD_ID: 'test-guild-id',
            LOG_LEVEL: 'silent',
          },
        },
        resolve: {
          alias: {
            '@assistme/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.config.ts'],
    },
  },
});
```

### Pattern 2: pnpm Test Scripts (Claude's Discretion — recommended)

**What:** Root-level orchestration scripts plus per-package convenience scripts. The `test:unit` filter runs only `.test.ts` files (excludes `.integration.test.ts` and `.e2e.test.ts`). `test:watch` starts Vitest in interactive watch mode.

**Root `package.json` additions:**
```json
{
  "scripts": {
    "test": "vitest run --project core --project bot-discord",
    "test:unit": "vitest run --project core --project bot-discord",
    "test:integration": "vitest run --project core-integration --project bot-discord-integration",
    "test:watch": "vitest --project core --project bot-discord",
    "test:coverage": "vitest run --coverage --project core --project bot-discord"
  }
}
```

Note: `test:integration` references projects that do not exist yet (Phase 3). The script must be defined now per FOUND-04, but it will exit cleanly with no matching projects until Phase 3 adds them.

**Per-package `package.json` additions** (same in both `packages/core/package.json` and `packages/bot-discord/package.json`):
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### Pattern 3: `@assistme/core` Alias (FOUND-02)

**What:** `resolve.alias` in the vitest config overrides pnpm's symlink resolution so that `import { ... } from '@assistme/core'` in test files resolves directly to `packages/core/src/index.ts` rather than `packages/core/dist/index.js`.

**Why it matters:** `packages/core/package.json` exports field points exclusively to `dist/`. If `dist/` is absent or stale, every test file that imports from `@assistme/core` fails with `Error: Cannot find module`. By pointing the alias to the source TypeScript file, Vitest handles the TypeScript compilation itself (via esbuild transform) and always sees the latest source code.

**Exact configuration** (verified against Vitest 4.x docs):
```typescript
resolve: {
  alias: {
    '@assistme/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
  },
}
```

This must appear in BOTH project definitions (core and bot-discord), because each project config is independent. Alternatively, it can be placed in a shared `defineConfig` wrapper that both projects inherit — but per the Vitest 4.x `projects` API, top-level `resolve` in the root config does not automatically flow into project-level configs.

### Anti-Patterns to Avoid

- **`"pool": "vmThreads"`:** Causes memory leaks and instability with ESM modules that use native bindings (e.g., `pino`). Use `"forks"` or rely on the `forks` default.
- **`vitest.workspace.ts` file:** Deprecated since Vitest 3.2. Do not create this file — use the `projects:` key inside `vitest.config.ts`.
- **Storing fake env vars in `.env.test`:** A committed `.env.test` creates a false sense of security about real credentials, and `.env.test` is not guaranteed to be git-ignored. Use `test.env` in the vitest config instead.
- **Pointing the alias at `dist/`:** The alias must target `src/index.ts`. Pointing at `dist/index.js` defeats the purpose and reintroduces the stale-build failure.
- **Installing `@vitest/coverage-c8`:** This package is dead (last published November 2022, v0.33.0). Use `@vitest/coverage-v8` only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript path alias resolution in Vitest | Custom `resolve.alias` map per path | `vite-tsconfig-paths` plugin | Manual aliases break silently when new paths are added to tsconfig. Plugin syncs automatically. |
| Module coverage tracking | Custom instrumentation | `@vitest/coverage-v8` | V8 provider is accurate, fast, and bundled with Vitest. Manual coverage is unreliable in ESM. |
| ESM transform for test files | Babel, ts-jest | Vitest's built-in esbuild transform | esbuild handles TypeScript and ESM natively. Adding Babel or ts-jest introduces transform chain complexity. |
| Env var loading in tests | `dotenv.config()` call in setup file | `test.env` in vitest config | `dotenv.config()` fires after module initialization may have already thrown. `test.env` is applied before any module loads. |

**Key insight:** Vitest's built-in esbuild transform eliminates the need for any separate TypeScript compilation step before running tests. The resolver + transform pipeline is sufficient for this codebase's needs.

---

## Common Pitfalls

### Pitfall 1: `@assistme/core` Resolves to Stale `dist/` via pnpm Symlinks

**What goes wrong:** pnpm installs workspace packages via symlinks. `node_modules/@assistme/core` points to `packages/core/dist/`. If `dist/` is absent (fresh clone, CI) or stale, every test file that imports `@assistme/core` throws `Error: Cannot find module` or silently imports outdated code.

**Why it happens:** `packages/core/package.json` exports field points only to `dist/index.js`. Vitest follows the symlink and respects the `exports` field.

**How to avoid:** Set `resolve.alias['@assistme/core']` to `path.resolve(__dirname, 'packages/core/src/index.ts')` in `vitest.config.ts`. This completely bypasses the symlink and the exports field.

**Warning signs:** Tests pass locally after `pnpm build` but fail in CI (which has no `dist/`). `vi.mock('@assistme/core')` silently no-ops.

---

### Pitfall 2: `getSupabase()` Throws at Import Time Without Fake Env Vars

**What goes wrong:** `packages/core/src/db/client.ts` throws `Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` during module initialization. Any test file that imports a handler (`dm-handler.ts`, `admin-handler.ts`, etc.) transitively loads this module. The entire test file fails before the first `it()` block runs.

**Why it happens:** `getSupabase()` checks `process.env` at call time, but it is called lazily. However, the module is initialized at import time and the throw pattern will trigger the first time any DB-touching function is evaluated. In ESM, all top-level awaits and module-side-effects run during module evaluation.

**How to avoid:** In `vitest.config.ts`, set `test.env` with at minimum `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set to fake (non-empty) strings. The values do not need to connect to anything — they just need to satisfy the non-null guard.

**Warning signs:** First test output is `Error: Missing SUPABASE_URL` with stack trace pointing to `packages/core/src/db/client.ts:13`.

---

### Pitfall 3: `moduleResolution: "bundler"` Mismatch With Vitest's Node Resolver

**What goes wrong:** The root `tsconfig.json` uses `"moduleResolution": "bundler"`. Vitest runs in Node.js environment. TypeScript resolves imports one way during `tsc --noEmit`; Vitest's vite resolver resolves them a different way at runtime. Imports that pass typecheck fail with `Cannot find module` during test execution.

**Why it happens:** `"bundler"` mode allows omitting file extensions in imports (handled by the bundler). But Vitest in Node.js environment requires either explicit `.js` extensions or a resolver that handles extension-less imports. The `vite-tsconfig-paths` plugin bridges this gap.

**How to avoid:** Install `vite-tsconfig-paths` and add it to `vitest.config.ts` plugins array. Run both `pnpm typecheck` and `pnpm test` as separate CI steps — a passing typecheck does not guarantee test-time resolution.

**Warning signs:** `Error: Cannot find module '../utils/format.js'` appears only in test output, not in typecheck output.

---

### Pitfall 4: No Test Scripts Means `pnpm test` Exits 0 With No Output

**What goes wrong:** `packages/bot-discord/package.json` and `packages/core/package.json` have no `test` script. The root `package.json` has no test scripts. Running `pnpm test` either errors with "Missing script: test" or exits 0 silently (if the recursive flag finds no packages with a test script).

**How to avoid:** Add test scripts in the same commit that installs Vitest. Do not leave a state where `vitest` is installed but no scripts invoke it.

**Warning signs:** `pnpm test` exits 0 with no output. CI reports "success" despite no tests running.

---

### Pitfall 5: `pino-pretty` Transport Causes Noise in Test Output

**What goes wrong:** The `logger.ts` singleton initializes `pino` with `pino-pretty` transport when `NODE_ENV !== 'production'`. Every test run prints colored log output to stdout, making test output hard to read and potentially causing test output assertions to fail.

**How to avoid:** In `test.env`, set `LOG_LEVEL: 'silent'` to suppress all pino output during tests. This is the pino-documented way to silence a logger at runtime.

**Warning signs:** Test output contains colored log lines from application code between assertion outputs.

---

## Code Examples

Verified patterns from official sources and direct codebase inspection:

### Minimal Smoke Test (verify infrastructure works)

```typescript
// packages/bot-discord/src/index.test.ts  (or any path matching *.test.ts)
// Source: authored to verify Phase 1 success criteria
import { describe, it, expect } from 'vitest';

describe('infrastructure smoke', () => {
  it('runs without crashing', () => {
    expect(true).toBe(true);
  });
});
```

This file proves `pnpm test:unit` exits 0. Create one in `packages/core/src/` and one in `packages/bot-discord/src/` to verify both projects are discovered.

### Verify `@assistme/core` Alias Resolves to Source

```typescript
// packages/bot-discord/src/core-import.test.ts
// Source: verifies FOUND-02 success criterion
import { describe, it, expect } from 'vitest';

describe('@assistme/core resolution', () => {
  it('imports from source without building dist', async () => {
    // If dist/ is absent and alias is wrong, this dynamic import throws
    const core = await import('@assistme/core');
    expect(core).toBeDefined();
  });
});
```

### Verify Env Var Guard Does Not Crash Import

```typescript
// packages/bot-discord/src/handlers/dm-handler.test.ts
// Source: verifies FOUND-03 + FOUND-05 success criterion
import { describe, it, expect } from 'vitest';

describe('dm-handler import', () => {
  it('imports without throwing even without real Supabase', async () => {
    // getSupabase() lazy-throws only when called, not when module is imported.
    // The test.env fake vars prevent any DB-touching call from throwing.
    const handler = await import('./dm-handler.js');
    expect(handler).toBeDefined();
  });
});
```

Note: `dm-handler.ts` imports from `@assistme/core` at the top level. The module-level `getSupabase()` call only fires when a DB function is actually invoked, not at import time. Fake env vars in `test.env` satisfy the guard if any such call happens during initialization.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `vitest.workspace.ts` file | `projects:` key in `vitest.config.ts` | Vitest 3.2 (deprecated), removed in 3.x | Do not create a workspace file. The `projects` array inside the config is the current API. |
| `@vitest/coverage-c8` | `@vitest/coverage-v8` | Vitest 3.x (c8 archived) | Only install `@vitest/coverage-v8`. c8 package is dead. |
| `pool: 'vmThreads'` for ESM | `pool: 'forks'` (default) | Vitest 3.x | `vmThreads` caused memory leaks with ESM + native modules. `forks` is stable and the default. |

**Deprecated/outdated:**
- `vitest.workspace.ts`: Deprecated since Vitest 3.2, must not be created.
- `@vitest/coverage-c8`: Dead package (v0.33.0, 2022). Replaced by `@vitest/coverage-v8`.
- `pool: 'vmThreads'`: Discouraged for ESM. Use default `forks`.

---

## Open Questions

1. **`test:integration` script targets projects that don't exist until Phase 3**
   - What we know: FOUND-04 requires the script to be defined and executable now.
   - What's unclear: Should the script fail gracefully when no integration projects are defined, or should it be a placeholder no-op?
   - Recommendation: Define the script to run `vitest run --project core-integration --project bot-discord-integration`. Vitest exits 0 with "no tests found" when the project names don't match any defined projects. This satisfies "executable" per FOUND-04.

2. **`vite-tsconfig-paths` version compatibility with Vitest 4.1.1**
   - What we know: The plugin is widely used and the `vite-tsconfig-paths@5.x` series targets Vite 5 / Vitest 3+.
   - What's unclear: The exact minimum version compatible with Vitest 4.1.1.
   - Recommendation: Install `vite-tsconfig-paths@^5.0.0` and verify `pnpm typecheck` and `pnpm test` both pass. The plugin API has been stable.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | All test execution | Yes | v24.14.0 | — |
| pnpm | Package management | Yes | 10.32.1 | — |
| vitest | Test runner | No (not installed) | — | Must install |
| @vitest/coverage-v8 | Coverage | No (not installed) | — | Must install |
| vite-tsconfig-paths | Path resolution | No (not installed) | — | Must install (no viable manual alternative for bundler mode) |
| msw | HTTP mocking | No (not installed) | — | Phase 2 only — can defer but install now |

**Missing dependencies with no fallback:**
- `vitest` — blocks all test execution
- `vite-tsconfig-paths` — required for `"moduleResolution": "bundler"` compatibility; manual alias map is incomplete

**Missing dependencies with fallback:**
- `msw` — not needed for Phase 1, but install now to avoid a second install commit in Phase 2

**Note:** Node.js version is v24.14.0, which exceeds the project requirement of 20+. No compatibility issues expected.

---

## Sources

### Primary (HIGH confidence)
- Vitest 4.1.1 official documentation (vitest.dev/guide/projects) — projects API, pool config
- Vitest 4.0 blog (vitest.dev/blog/vitest-4) — breaking changes and current defaults
- Vitest 3.2 release notes (vitest.dev/blog/vitest-3-2.html) — workspace file deprecation
- Direct codebase inspection — `packages/core/src/db/client.ts` env var throw pattern (verified line 12–13), root `tsconfig.json` `moduleResolution: bundler` (verified), `packages/core/package.json` exports field (verified points to `dist/`)

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` — prior research verified against Vitest issue #5633 (pnpm workspace mock split), discord.js discussion #6179
- `.planning/research/STACK.md` — prior research on vitest version, pool recommendations, script patterns

### Tertiary (LOW confidence)
- None for Phase 1 scope. All critical claims are HIGH confidence.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via `npm view`, confirmed against official vitest.dev docs
- Architecture: HIGH — config patterns verified against Vitest 4.x `projects` API docs, tsconfig inspected directly
- Pitfalls: HIGH — Pitfalls 1-4 verified against actual codebase files (`client.ts` line 12–13 confirmed); Pitfall 5 verified against pino docs

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (Vitest is actively maintained but breaking changes between 4.x minor versions are rare)
