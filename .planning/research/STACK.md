# Technology Stack: Discord.js Bot Testing Infrastructure

**Project:** Dev Environment & Automated Tests — Bot Discord
**Researched:** 2026-03-24
**Domain:** Testing infrastructure for TypeScript/ESM/Node.js Discord bot monorepo

---

## Recommended Stack

### Test Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| vitest | ^4.1.1 | Test runner, assertions, mocking | Native ESM support without transformation hacks. Pool `forks` (default) is stable for ESM Node.js — `vmThreads` causes memory leaks and instability with ESM. `projects` API enables per-package configs in the pnpm monorepo without a separate `vitest.workspace` file (that pattern is deprecated as of v3.2). Faster than Jest by 3-5x for this workload. Same assertion API as Jest so switching cost is near zero. |
| @vitest/coverage-v8 | ^4.1.1 | Coverage reports | V8 provider is the default since Vitest 3.2 added AST-based remapping, giving Istanbul-level accuracy with V8 speed. The old `c8` provider (0.33.0, last published 3 years ago) is dead — do not use it. |

**Confidence: HIGH** — Verified against current Vitest 4.1.1 docs and official blog posts.

### HTTP / API Mocking

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| msw | ^2.x (latest) | Intercept HTTP calls to Anthropic, OpenAI, Supabase REST, Google APIs | Officially recommended by Vitest docs for request mocking in Node.js. Uses `@mswjs/interceptors` under the hood — intercepts `fetch`, Axios, and any HTTP client without module patching. Works identically in unit and integration test contexts. Framework-agnostic: mocks defined once, reusable across test layers. |

**Confidence: HIGH** — Vitest documentation explicitly recommends MSW. MSW v2 supports Node.js 18+ (project uses 20+).

**Do NOT use `nock`** — nock patches Node's `http` module directly, which breaks with ESM and native `fetch`. It has now adopted MSW's interceptors under the hood anyway, so MSW is the cleaner choice.

### Discord.js Mocking

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Custom vi.fn() factories | n/a | Mock Discord.js Client, Guild, Channel, Message, Interaction objects | No maintained third-party library exists for discord.js v14. `jest-discordjs-mocks` targets old Jest + older d.js versions. `@shoginn/discordjs-mock` last published >1 year ago, unknown v14 compatibility. `corde` (E2E library) last release November 2022, unmaintained. The discord.js v14 class internals are largely private — shallow factory objects with `vi.fn()` stubs is the standard community pattern (confirmed in discordjs/discord.js Discussion #6179). |

**Confidence: MEDIUM** — The absence of a maintained library is confirmed across multiple official and community sources. The factory pattern is the pragmatic consensus.

Minimal factory pattern for unit tests:

```typescript
// test/factories/discord.ts
import { vi } from 'vitest';

export function makeMockInteraction(overrides = {}) {
  return {
    reply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    user: { id: 'user-123', username: 'TestUser', tag: 'TestUser#0000' },
    guildId: 'guild-123',
    channelId: 'channel-123',
    ...overrides,
  };
}

export function makeMockMessage(overrides = {}) {
  return {
    reply: vi.fn().mockResolvedValue(undefined),
    author: { id: 'user-123', username: 'TestUser', bot: false },
    content: '',
    channelId: 'channel-123',
    guildId: 'guild-123',
    ...overrides,
  };
}
```

### Integration Test Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| supabase CLI | latest | Local Supabase stack (Postgres + pgvector + Auth) via Docker | Official supported path for local integration testing. `supabase start` spins up the full stack (12 Docker containers). Tests run against a real Postgres instance with real migrations applied — no mock DB. This ensures pgvector queries, RLS policies, and RPC functions are actually tested. |

**Confidence: HIGH** — Official Supabase docs confirm this is the recommended integration testing approach.

**Startup time warning:** First run pulls Docker images (~1 min). Subsequent runs are faster but still ~15-30s. This means integration tests must be in a separate test suite that is NOT run on every file save. Run them pre-commit or on CI only.

**Important constraint:** The Supabase CLI can only manage one local DB at a time. If you also run a local dev instance, you need to either use separate ports or stop the dev instance before running integration tests. Configure integration tests to point to a different port (e.g., `54322` instead of `54321`).

### Supabase Test Client

```typescript
// test/setup/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const testSupabase = createClient(
  process.env.SUPABASE_TEST_URL ?? 'http://127.0.0.1:54321',
  process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? 'your-local-anon-key'
);
```

### Claude API Mocking

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| msw + vi.fn() | — | Mock Anthropic API responses | The `@anthropic-ai/sdk` has NO official test helpers or mock utilities (verified against SDK repo). The SDK uses standard `fetch` under the hood. MSW intercepts these calls at the network level, returning controlled JSON responses. For unit tests where you want to test agent logic without HTTP at all, mock the wrapper functions (`askClaude`, `runAgent`) directly with `vi.mock()`. |

**Confidence: MEDIUM** — No official mocking utilities found in the Anthropic SDK. Pattern is inferred from SDK architecture (fetch-based) and standard Vitest/MSW practices.

Two-level strategy:
- **Unit tests:** `vi.mock('../ai/claude')` — stub `askClaude()` return value directly.
- **Integration tests:** MSW handler intercepting `https://api.anthropic.com/v1/messages` — returns deterministic JSON.

### CI

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| GitHub Actions | n/a | Run unit + integration tests on push/PR | Already the project's VCS platform. `pnpm/action-setup@v3` + `actions/setup-node@v4` is the standard 2025 pattern. Unit tests run without any secrets. Integration tests require Supabase local stack — run via `supabase start` in CI before test suite. E2E tests (real Discord bot) are excluded from CI — they require a live Discord token and are run manually. |

**Confidence: HIGH** — Standard pattern, well-documented and widely used.

---

## Alternatives Considered and Rejected

| Category | Recommended | Rejected | Reason for Rejection |
|----------|-------------|----------|---------------------|
| Test runner | Vitest 4.x | Jest 29+ | Jest ESM support requires `--experimental-vm-modules` or Babel transform — adds friction to a pure ESM monorepo. Slower. Vitest is the current standard for Node.js ESM projects. |
| Test runner | Vitest 4.x | Node.js built-in test runner | The built-in runner (`node:test`) lacks the ecosystem depth: no first-class mocking, no coverage, no monorepo `projects` config, poor assertion ergonomics. Acceptable only for trivial scripts. |
| HTTP mocking | msw | nock | nock patches `http` module, incompatible with `fetch`-based SDKs (Anthropic, Supabase) in ESM. Archived/unmaintained direction. |
| HTTP mocking | msw | direct vi.mock on SDK modules | Module mocking breaks when the module wraps `fetch` at import time. MSW intercepts at network layer — more realistic and more maintainable. |
| Discord mocking | vi.fn() factories | jest-discordjs-mocks | Targets Jest + d.js v12/v13. Not compatible with Vitest or d.js v14 without rewriting. |
| Discord mocking | vi.fn() factories | @shoginn/discordjs-mock | Last published >1 year ago. Unknown v14 support. Single maintainer. Risk of being a dead dependency. |
| Discord E2E | Custom test bot | corde | Last release November 2022. Does not support discord.js v14. Unmaintained. |
| DB for integration | supabase local | Mock Supabase client | Mocking the entire Supabase client means tests never catch query errors, pgvector issues, or RLS policy bugs. Real DB is necessary for this codebase's complexity (hybrid search, RPC functions). |
| Coverage | @vitest/coverage-v8 | @vitest/coverage-c8 | c8 package last published 3 years ago (v0.33.0). Superseded entirely by v8 provider. Dead package — do not install. |

---

## Installation

```bash
# Test runner + coverage
pnpm add -D vitest @vitest/coverage-v8

# HTTP mocking (for Anthropic API, OpenAI, Supabase REST)
pnpm add -D msw

# TypeScript types for test utilities (usually bundled with vitest)
# No additional @types packages needed for vitest itself
```

Install at **root level** for monorepo-wide test runner. The `vitest` binary is invoked from root using the `projects` config.

---

## Vitest Configuration Structure

### Root config (vitest.config.ts at repo root)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // projects replaces the deprecated vitest.workspace file (deprecated in v3.2)
    projects: ['packages/*/vitest.config.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.config.ts'],
    },
  },
});
```

### Per-package config (e.g., packages/bot-discord/vitest.config.ts)

```typescript
import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'bot-discord',
    environment: 'node',
    // pool: 'forks' is the default — ESM-safe. Do not change to vmThreads.
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts', 'src/**/*.e2e.test.ts'],
    setupFiles: ['../../test/setup/unit.ts'],
  },
});
```

---

## Test Suite Separation

| Suite | Files | Trigger | Secrets needed |
|-------|-------|---------|---------------|
| Unit | `*.test.ts` | Every push, watch mode | None |
| Integration | `*.integration.test.ts` | Pre-commit, CI | `SUPABASE_TEST_URL`, `SUPABASE_TEST_SERVICE_ROLE_KEY` |
| E2E | `*.e2e.test.ts` | Manual only | `DISCORD_BOT_TOKEN_DEV`, `DISCORD_TEST_GUILD_ID` |

This separation is enforced via filename convention and per-suite Vitest configs. Unit tests MUST be runnable with zero external services.

---

## pnpm Scripts

Add to root `package.json`:

```json
{
  "scripts": {
    "test": "vitest run --project 'bot-discord' --project 'core'",
    "test:watch": "vitest --project 'bot-discord' --project 'core'",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --project 'bot-discord-integration'",
    "test:all": "vitest run"
  }
}
```

---

## Sources

- Vitest 4.1.1 official documentation: https://vitest.dev/guide/projects
- Vitest 4.0 release announcement: https://vitest.dev/blog/vitest-4
- Vitest 3.2 release (workspace deprecation): https://vitest.dev/blog/vitest-3-2.html
- Vitest pool documentation: https://vitest.dev/config/pool
- Vitest request mocking guide: https://vitest.dev/guide/mocking/requests
- MSW official documentation: https://mswjs.io/docs/
- MSW Node.js integration: https://mswjs.io/docs/integrations/node/
- Supabase local development: https://supabase.com/docs/guides/local-development
- Supabase integration testing discussion: https://github.com/orgs/supabase/discussions/16415
- discord.js mocking community discussion: https://github.com/discordjs/discord.js/discussions/6179
- Anthropic TypeScript SDK: https://github.com/anthropics/anthropic-sdk-typescript
- corde E2E library (unmaintained): https://github.com/cordejs/corde
