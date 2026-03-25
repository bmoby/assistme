---
phase: 02-mocks-unit-tests
plan: "02"
subsystem: testing
tags: [vitest, discord.js, unit-tests, mocks, grammY, slash-commands, faq-handler]

# Dependency graph
requires:
  - phase: 02-mocks-unit-tests
    plan: "01"
    provides: "Discord mock builders (GuildMemberBuilder, MessageBuilder, CommandInteractionBuilder)"
  - phase: 02-mocks-unit-tests
    plan: "05"
    provides: "Domain fixture factories (createSession, createStudent, createExercise, createFaqEntry)"
provides:
  - "11 FAQ handler unit tests covering all routing branches (bot ignored, wrong channel, no role, confidence thresholds, admin reply)"
  - "15 session/session-update/add-student command unit tests"
  - "48 tests across all 9 admin slash command files (including announce, approve, create, review, revision, student-list)"
  - "Bug fix: GuildMemberBuilder.rolesCache now includes .map() to support roles.cache.map() in create.ts"
affects: [02-03, 02-04, 02-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.mock('@assistme/core') + MockedFunction<T> pattern for typed namespace mock access"
    - "makeClient() helper with handlers Map + __emit() for testing event-based handlers"
    - "CommandInteractionBuilder + withXOption() for testing slash commands without real interactions"
    - "agents namespace mock: access via agents.x as MockedFunction<AgentNS['x']>"

key-files:
  created:
    - "packages/bot-discord/src/handlers/faq.test.ts"
    - "packages/bot-discord/src/commands/admin/session.test.ts"
    - "packages/bot-discord/src/commands/admin/session-update.test.ts"
    - "packages/bot-discord/src/commands/admin/add-student.test.ts"
    - "packages/bot-discord/src/commands/admin/announce.test.ts"
    - "packages/bot-discord/src/commands/admin/approve.test.ts"
    - "packages/bot-discord/src/commands/admin/create.test.ts"
    - "packages/bot-discord/src/commands/admin/review.test.ts"
    - "packages/bot-discord/src/commands/admin/revision.test.ts"
    - "packages/bot-discord/src/commands/admin/student-list.test.ts"
  modified:
    - "packages/bot-discord/src/__mocks__/discord/builders.ts"

key-decisions:
  - "GuildMemberBuilder rolesCache bug fix: add .map() alongside .some()/.find()/.has() — create.ts calls roles.cache.map() to build roleNames array for agents.resolveRole, missing .map() caused silent TypeError in try/catch blocking invoke call"
  - "agents namespace mock: use MockedFunction<AgentNS['x']> cast for resolveRole/invoke/getAgent since vi.mock auto-mocks namespace properties individually"

patterns-established:
  - "Slash command test pattern: CommandInteractionBuilder + withMember(admin) + withXOption() + direct handleX(interaction) call — no event emitter needed"
  - "Namespace mock pattern: import namespace, cast each property as MockedFunction<NS['method']> for type-safe mock setup"
  - "Mock builder completeness: collection-like caches must implement ALL methods used in source code (some, find, has, map)"

requirements-completed: [UNIT-04, UNIT-06]

# Metrics
duration: 35min
completed: "2026-03-25"
---

# Phase 02 Plan 02: FAQ Handler and Slash Command Unit Tests Summary

**74 unit tests across 10 test files covering the FAQ handler (11 tests) and all 9 admin slash commands (63 tests), with zero real service calls via vi.mock('@assistme/core')**

## Performance

- **Duration:** 35 min (Task 3 only; Tasks 1-2 completed in prior session)
- **Started:** Prior session (Tasks 1-2)
- **Completed:** 2026-03-25
- **Tasks:** 3 (Task 3 executed this session; Tasks 1-2 from prior commits f5ab8e7, 3967115)
- **Files modified:** 11 (10 new test files + 1 builder fix)

## Accomplishments

- FAQ handler test suite: 11 tests covering bot message ignored, DM/non-TextChannel ignored, wrong channel ignored, no role ignored, high-confidence answer with incrementFaqUsage, low-confidence formation event, admin reply creates FAQ, error handling
- Session/session-update/add-student commands: 15 tests covering happy paths, session not found, invalid field, student already exists
- Remaining 6 commands (announce, approve, create, review, revision, student-list): 48 tests across the full command directory, all using mock infrastructure from Plans 01 and 05
- Fixed GuildMemberBuilder to expose `.map()` on rolesCache, enabling create.ts to work correctly in tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Write FAQ handler unit tests** - `f5ab8e7` (test)
2. **Task 2: Write session, session-update, add-student tests** - `3967115` (test)
3. **Task 3: Write remaining 6 command tests + fix builder** - `3469d23` (test)

## Files Created/Modified

- `packages/bot-discord/src/handlers/faq.test.ts` - 11 tests: FAQ routing (bot/DM/wrong-channel/no-role ignored, high/low confidence, admin reply, error handling)
- `packages/bot-discord/src/commands/admin/session.test.ts` - Session info display tests
- `packages/bot-discord/src/commands/admin/session-update.test.ts` - Session field update tests
- `packages/bot-discord/src/commands/admin/add-student.test.ts` - Student registration tests
- `packages/bot-discord/src/commands/admin/announce.test.ts` - Announcement channel send tests
- `packages/bot-discord/src/commands/admin/approve.test.ts` - Exercise approval tests
- `packages/bot-discord/src/commands/admin/create.test.ts` - Agent invocation tests (4 cases)
- `packages/bot-discord/src/commands/admin/review.test.ts` - Pending exercise review tests
- `packages/bot-discord/src/commands/admin/revision.test.ts` - Revision request tests
- `packages/bot-discord/src/commands/admin/student-list.test.ts` - Active student list tests
- `packages/bot-discord/src/__mocks__/discord/builders.ts` - Added `.map()` to GuildMemberBuilder rolesCache

## Decisions Made

- Used `MockedFunction<AgentNS['method']>` cast for `agents.resolveRole/invoke/getAgent` — vi.mock auto-mocks namespace properties and the typed cast enables `.mockReturnValue()` without type errors
- Fixed builder instead of working around it — adding `.map()` to the mock collection is the correct fix since the real Collection has `.map()`, so all other code using the builder benefits too

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GuildMemberBuilder rolesCache missing .map() method**
- **Found during:** Task 3 (create.test.ts happy path + details tests)
- **Issue:** `create.ts` line 44 calls `member.roles.cache.map(r => r.name)` to build `roleNames` for `agents.resolveRole`. The GuildMemberBuilder's rolesCache only implemented `.some()`, `.find()`, `.has()`, and `Symbol.iterator` — not `.map()`. This threw `TypeError: member.roles.cache.map is not a function` silently inside the try/catch, so `agents.invoke` was never called. Both happy path tests failed with `expected "vi.fn()" to be called with arguments [...], Number of calls: 0`.
- **Fix:** Added `map: <T>(fn: (role: MockRole) => T): T[] => storedRoles.map(fn)` to rolesCache in GuildMemberBuilder.build()
- **Files modified:** `packages/bot-discord/src/__mocks__/discord/builders.ts`
- **Verification:** All 4 create.test.ts tests pass; all 9 command test files pass (48 tests total)
- **Committed in:** `3469d23` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential fix. The mock builder was incomplete relative to the real discord.js Collection API. No scope creep — the fix makes the builder more faithful to the real Collection interface.

## Issues Encountered

- Pre-existing failures in `dm-handler.test.ts` (6 tests) exist independently of this plan's work. Confirmed via `git stash` that these failures pre-dated any changes made in this session. These are out of scope — logged to deferred-items for the dm-handler plan (02-03/02-04).

## Known Stubs

None - all test files wire to real source files via direct imports. All core functions are mocked via `vi.mock('@assistme/core')`. No placeholder data flows to production code.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 9 admin slash commands have unit tests with happy path + error case coverage
- FAQ handler has exhaustive routing coverage (all branches tested)
- Mock builder is now complete for Collection-like APIs (has .map() in addition to .some/.find/.has)
- Ready for Plans 02-03 (dm-handler isolation) and 02-04 (agent tests)
- Pre-existing dm-handler test failures need investigation in 02-03/02-04

---
*Phase: 02-mocks-unit-tests*
*Completed: 2026-03-25*
