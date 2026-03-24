# Phase 1: Foundation - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure Vitest for the ESM monorepo so that any test file can be executed without import-time crashes, env var explosions, or module resolution failures. Phase delivers: working test runner, scripts, env isolation, and correct `@assistme/core` resolution.

</domain>

<decisions>
## Implementation Decisions

### Package Scope
- **D-01:** Configure Vitest for `packages/core` and `packages/bot-discord` only. The two Telegram bot packages (`bot-telegram`, `bot-telegram-public`) are out of scope for this milestone.

### Test File Location
- **D-02:** Co-located test files next to source code. Example: `src/handlers/dm-handler.test.ts` beside `src/handlers/dm-handler.ts`.
- **D-03:** Naming convention: `.test.ts` suffix (not `.spec.ts`).

### Config Structure
- **D-04:** Single root `vitest.config.ts` with `projects:` API pointing to `['packages/core', 'packages/bot-discord']`. No per-package configs.

### Claude's Discretion
- Test scripts naming and structure (`pnpm test`, `test:unit`, `test:integration`, `test:watch`)
- Fake env var strategy (inline in vitest config vs `.env.test` file)
- `resolve.alias` configuration details for `@assistme/core`
- Whether to use `vite-tsconfig-paths` plugin

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `specs/04-bot-discord/SPEC.md` -- Bot Discord spec (handlers, commands, agents architecture)
- `specs/01-cerveau-central/SPEC.md` -- Core package spec (DB, AI, types)

### Research Findings
- `.planning/research/STACK.md` -- Vitest 4.x config, MSW v2, discord.js mock strategy
- `.planning/research/PITFALLS.md` -- Critical pitfalls: `@assistme/core` alias (#5633), `getSupabase()` env crash, ESM pool config
- `.planning/research/ARCHITECTURE.md` -- Test architecture: component boundaries, mock layers, build order

### Codebase Maps
- `.planning/codebase/STACK.md` -- Current tech stack (TypeScript 5.7, discord.js 14.16, pnpm workspaces)
- `.planning/codebase/CONVENTIONS.md` -- Code style: ESM imports with `.js` extension, no path aliases, camelCase
- `.planning/codebase/STRUCTURE.md` -- Directory layout of all packages

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None for testing (zero test infrastructure exists)

### Established Patterns
- ESM imports with explicit `.js` extension throughout codebase
- No path aliases (`@/`) -- all relative paths
- `getSupabase()` in `packages/core/src/db/client.ts` reads env vars at module init -- MUST have fake vars in test config
- `pino` logger singleton in `packages/core/src/logger.ts` -- may need silencing in tests

### Integration Points
- Root `package.json` has `pnpm typecheck` and `pnpm build` scripts -- test scripts follow same pattern
- `packages/core/package.json` exports via `"exports"` field -- `resolve.alias` must point to `src/` not `dist/`
- `tsconfig.json` uses `"moduleResolution": "nodenext"` -- Vitest must respect this

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. Research findings provide strong guidance on Vitest ESM configuration.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-24*
