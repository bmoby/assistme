---
phase: 02-mocks-unit-tests
plan: 01
subsystem: testing
tags: [vitest, discord.js, anthropic-sdk, builder-pattern, mocks, test-isolation]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Vitest configured with bot-discord project, 3 smoke tests passing
provides:
  - Discord.js object builders (MessageBuilder, GuildMemberBuilder, CommandInteractionBuilder, ButtonInteractionBuilder)
  - Anthropic SDK mock helper (mockAnthropicCreate, mockToolUseSequence, getAnthropicMockFactory)
  - Handler test isolation exports (_clearStateForTesting in dm-handler and admin-handler)
affects: [02-02, 02-03, 02-04, 02-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "as unknown as DiscordType cast for discord.js private constructors"
    - "Object.defineProperty for GuildMember.prototype base (has getter-only properties)"
    - "vi.fn().mockResolvedValue() for all async Discord methods"
    - "getAnthropicMockFactory() with default key for ESM default import mock"
    - "NODE_ENV guard on test-only exports"

key-files:
  created:
    - packages/bot-discord/src/__mocks__/discord/builders.ts
    - packages/bot-discord/src/__mocks__/discord/index.ts
    - packages/bot-discord/src/__mocks__/core/anthropic-mock.ts
    - packages/bot-discord/src/__mocks__/core/index.ts
    - packages/bot-discord/src/__mocks__/mocks-smoke.test.ts
  modified:
    - packages/bot-discord/src/handlers/dm-handler.ts
    - packages/bot-discord/src/handlers/admin-handler.ts

key-decisions:
  - "Object.defineProperty over Object.assign for GuildMember.prototype base — GuildMember.prototype defines some properties as getter-only, Object.assign throws TypeError"
  - "_clearStateForTesting() guarded by NODE_ENV !== 'test' to be safe in production"
  - "mocks-smoke.test.ts co-located in __mocks__/ to verify builders are importable without separate test infra"

patterns-established:
  - "Builder pattern: MessageBuilder().withContent().inGuild().build() chainable API"
  - "resetSeq() in beforeEach for deterministic test IDs"
  - "vi.mock('@anthropic-ai/sdk', () => getAnthropicMockFactory()) pattern for default import mocks"

requirements-completed: [MOCK-01, MOCK-02, UNIT-01]

# Metrics
duration: 15min
completed: 2026-03-24
---

# Phase 02 Plan 01: Mocks + Unit Tests — Infrastructure Summary

**Discord.js builder pattern with TextChannel/GuildMember prototype chains, Anthropic SDK default-import mock, and handler test isolation exports for zero-state-leak unit testing**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-24T13:52:00Z
- **Completed:** 2026-03-24T14:07:10Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- 4 Discord.js builder classes with chainable API — MessageBuilder, GuildMemberBuilder, CommandInteractionBuilder, ButtonInteractionBuilder
- `instanceof TextChannel` and `instanceof GuildMember` checks pass in tests (required by faq.ts and auth.ts)
- Anthropic SDK mock with `getAnthropicMockFactory()` that includes `default` key for ESM default import mock
- `_clearStateForTesting()` exports on dm-handler and admin-handler prevent Map state leakage between tests
- 13 passing smoke tests in `__mocks__/mocks-smoke.test.ts` verify all infrastructure works

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Discord.js object builders and Anthropic SDK mock helper** - `9022725` (feat)
2. **Task 2: Add _clearStateForTesting() exports to dm-handler and admin-handler** - `eaccdae` (feat)

## Files Created/Modified

- `packages/bot-discord/src/__mocks__/discord/builders.ts` — 4 builder classes with instanceof support and vi.fn() method stubs
- `packages/bot-discord/src/__mocks__/discord/index.ts` — barrel re-export
- `packages/bot-discord/src/__mocks__/core/anthropic-mock.ts` — mockAnthropicCreate, mockToolUseSequence, mockMultiTurnSequence, getAnthropicMockFactory
- `packages/bot-discord/src/__mocks__/core/index.ts` — barrel re-export
- `packages/bot-discord/src/__mocks__/mocks-smoke.test.ts` — 13 smoke tests verifying all infrastructure
- `packages/bot-discord/src/handlers/dm-handler.ts` — added _clearStateForTesting() export at bottom
- `packages/bot-discord/src/handlers/admin-handler.ts` — added _clearStateForTesting() export at bottom

## Decisions Made

- **Object.defineProperty over Object.assign for GuildMember prototype:** `GuildMember.prototype` defines `id` and other properties as getter-only. `Object.assign` throws `TypeError: Cannot set property id of [object Object] which has only a getter`. Using `Object.defineProperties` with explicit descriptors avoids this — discovered and fixed during Task 1 smoke test run.

- **co-located smoke test in `__mocks__/`:** Rather than a separate fixture import test, placed `mocks-smoke.test.ts` inside `__mocks__/` so Vitest picks it up in the bot-discord project run and verifies importability with each test run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GuildMember.prototype has getter-only id property**
- **Found during:** Task 1 (Discord.js builders)
- **Issue:** `Object.assign(Object.create(GuildMember.prototype), { id: ... })` throws `TypeError: Cannot set property id of [object Object] which has only a getter` — GuildMember.prototype defines `id` as a getter.
- **Fix:** Replaced `Object.assign` with `Object.defineProperties` using explicit `{ value, writable: true, configurable: true, enumerable: true }` descriptors for each property.
- **Files modified:** `packages/bot-discord/src/__mocks__/discord/builders.ts`
- **Verification:** All 13 smoke tests pass, including `instanceof GuildMember` check.
- **Committed in:** `9022725` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Fix necessary for prototype-based instanceof to work. No scope creep.

## Issues Encountered

- Pre-existing TypeScript version mismatch: root `tsconfig.json` uses `moduleResolution: bundler` which requires TypeScript 5.0+, but the installed version is 4.7.4. This causes `pnpm exec tsc --noEmit` to fail on all packages. This is a pre-existing issue unrelated to this plan. Vitest (which uses Vite's own TS transformer) is unaffected and all tests pass.

## Known Stubs

None — this plan delivers infrastructure (builders and mocks), not data-rendering components.

## Next Phase Readiness

- All downstream test plans (02-02 through 02-05) can import from `__mocks__/discord/` and `__mocks__/core/`
- Handler test isolation is in place — `_clearStateForTesting()` available in dm-handler and admin-handler
- Smoke tests serve as regression guard for mock infrastructure across future plan additions

---
*Phase: 02-mocks-unit-tests*
*Completed: 2026-03-24*
