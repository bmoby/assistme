# Phase 2: Mocks + Unit Tests - Research

**Researched:** 2026-03-24
**Domain:** Vitest unit testing for discord.js 14 handlers and Claude tool-use agents in a pnpm ESM monorepo
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Thin wrapper approach — handlers stay as-is. Tests mock imports via `vi.mock()` and test handler functions directly by passing fake Discord objects. Minimal production code changes.

**D-02:** Lazy initialization where needed — if `vi.mock()` can't prevent a side effect (e.g., Discord Client constructor), add minimal lazy init (`getClient()` pattern) to that specific module. Only change what's actually broken.

**D-03:** Skip and defer untestable handlers — if a handler is so tightly coupled that vi.mock() + fake objects isn't enough, mark it as a gap for a later phase. Don't invest in invasive refactors in Phase 2.

**D-04:** `vi.mock()` only — mock at module import level for all external services (Supabase, Claude API, Discord.js). No MSW v2 in Phase 2. Fastest execution, no extra dependency.

**D-05:** Full builder pattern for Discord.js factories — `MessageBuilder().withContent('test').withAuthor(user).inChannel(ch).build()` chainable API that builds complete discord.js-shaped objects. Ergonomic for complex test scenarios.

**D-06:** Shared mocks location: `packages/bot-discord/src/__mocks__/` — co-located with the tests that use them, inside the bot-discord package.

**D-07:** Static JSON files for Claude API response fixtures — pre-built response arrays in `packages/bot-discord/src/__mocks__/fixtures/`. Simple to read, easy to version.

**D-08:** Thorough coverage per agent — multiple scenarios per agent covering main flows, error paths, and edge cases. Not just happy paths.

**D-09:** Exhaustive coverage — cover every code path: all message types, all agent tools, all error branches, edge cases (empty input, rate limiting, concurrent messages). Maximum confidence.

**D-10:** No numeric coverage threshold in Phase 2 — write thorough tests but don't enforce a percentage. Coverage thresholds come in Phase 3 with CI.

### Claude's Discretion

- Which specific handlers need lazy init vs pure vi.mock() (assess during research)
- Builder API design details (method names, chaining ergonomics)
- JSON fixture file organization and naming within `__mocks__/fixtures/`
- Which edge cases are worth testing vs diminishing returns

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOCK-01 | Discord.js factories (Message, Guild, GuildMember, Interaction) via plain objects + `vi.fn()` | Builder pattern detailed in Architecture Patterns section — `as unknown as` cast + `vi.fn()` stubs is the only viable approach for d.js v14 private constructors |
| MOCK-02 | Fixtures Claude API with multi-turn tool-use sequences (DM Agent, Tsarag, FAQ) | Anthropic SDK mock pattern fully specified — `vi.mock('@anthropic-ai/sdk')` + static JSON fixtures matching `MessageParam` shape |
| MOCK-03 | MSW v2 handlers for Supabase REST and Claude API HTTP interception | D-04 locks this OUT of Phase 2 — use `vi.mock()` at module level only, not MSW; MOCK-03 is deferred per decision D-04 |
| MOCK-04 | Shared domain fixtures (students, sessions, exercises, formation knowledge) | Factory functions with `Partial<T>` overrides, seq counter for unique IDs — all types available from `@assistme/core` |
| UNIT-01 | Handler isolation refactor — extract pure logic from handlers coupled to Discord Client | Audit shows `dm-handler.ts` and `admin-handler.ts` have module-level `let discordClient` requiring `setupXHandler(mockClient)` in `beforeEach`; `notifyAdminChannel` in dm-handler uses `discordClient` directly — needs lazy init or test export |
| UNIT-02 | Unit tests dm-handler (routing DM, parsing messages, delegation to DM Agent) | `processDmMessage` is unexported but testable by calling `setupDmHandler(mockClient)` then emitting fake events or by exporting for test; `conversations` Map leaks — needs `clearConversations()` export |
| UNIT-03 | Unit tests admin-handler (messages #admin, delegation Tsarag Agent) | Same module-level Map pattern; `processAdminMessage` is unexported; `isAdmin()` checks `member.roles.cache` — need `GuildMember` mock with roles collection |
| UNIT-04 | Unit tests FAQ handler (pattern detection, responses) | `setupFaqHandler` is the export; handler checks `message.channel instanceof TextChannel` — requires mock that passes instanceof check or spy on it; calls `getAllFaqEntries()` and `answerFaqQuestion()` from `@assistme/core` |
| UNIT-05 | Unit tests review-buttons (button interactions, exercise review flow) | `registerReviewButtons()` registers 4 button prefixes; each handler is unexported — need to export or test via `registerButton` spy; handlers use `interaction.deferReply`, `interaction.editReply`, `guild.members.fetch` |
| UNIT-06 | Unit tests slash commands (/session, /session-update, admin commands) | 9 commands in `commands/admin/`; each has an exported `handleX(interaction)` function — directly testable with fake `ChatInputCommandInteraction`; `interaction.options.getInteger/getString` need stub |
| UNIT-07 | Tests for agent logic (tool routing, response parsing, error handling) | `runDmAgent` in `packages/core/src/ai/formation/dm-agent.ts` imports Anthropic directly — mock `@anthropic-ai/sdk`; test tool dispatch sequence; max 5 iteration loop |
</phase_requirements>

---

## Summary

Phase 2 builds the reusable mock layer and comprehensive unit test suite for the Discord bot. The foundation from Phase 1 is solid: Vitest 4.1.1 is installed and configured with the `@assistme/core` source alias and fake env vars in place. Three smoke tests pass.

The primary challenge is that discord.js v14 uses private constructors — direct instantiation of `Message`, `ButtonInteraction`, or `ChatInputCommandInteraction` is impossible in TypeScript strict mode. The solution is plain object stubs typed via `as unknown as DiscordType`, with `vi.fn()` for all methods. The builder pattern (D-05) wraps this cast behind a fluent API so test code stays readable. All four handlers and the slash commands use only a small surface of the Discord type graph — the mock objects can cover just the properties each handler actually reads.

The second challenge is the module-level mutable state: both `dm-handler.ts` and `admin-handler.ts` use `let conversations`, `let processingLocks`, and `let discordClient` at module scope. Because ESM modules are singletons, these Maps persist across tests. The minimal-invasive fix (D-01/D-02) is to export a `_clearStateForTesting()` function from each handler (guarded by `NODE_ENV === 'test'`) and call it in `beforeEach`. The `discordClient` variable requires `setupDmHandler(mockClient)` to be called in `beforeEach`. No architectural refactor needed.

**Primary recommendation:** Build mock infrastructure in this order — (1) `@anthropic-ai/sdk` mock + fixtures, (2) Supabase `@assistme/core` function mocks, (3) Discord object builders, (4) domain fixture factories — then write tests per handler. Start with FAQ and slash commands (least coupling) before tackling dm-handler and review-buttons (most coupling).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.1 | Test runner, assertions, mocking | Already installed (Phase 1). Native ESM, `pool: forks`, projects API. |
| @anthropic-ai/sdk | 0.39.0 | Production dep being mocked | Already in project. No mock utilities — must `vi.mock()` the whole module. |
| discord.js | 14.16.0 | Production dep being mocked | Already in project. Private constructors mandate plain object stubs. |
| @supabase/supabase-js | 2.49.1 | Production dep being mocked | Already in project. Fluent builder chain must be stubbed with Proxy or chained `vi.fn()`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitest/coverage-v8 | 4.1.1 | Coverage reports | Add in Phase 3 for CI threshold enforcement; not mandatory in Phase 2 per D-10 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `vi.mock('@anthropic-ai/sdk')` | MSW v2 HTTP intercept | MSW is more realistic but D-04 locks Phase 2 to `vi.mock()` only |
| Plain object builders | `@shoginn/discordjs-mock` | Third-party lib is unmaintained/unknown v14 compatibility — confirmed out of scope in REQUIREMENTS.md |

**Installation:** No new packages needed. All required libraries are already installed (Phase 1 installed Vitest 4.1.1).

---

## Architecture Patterns

### Recommended Directory Structure

```
packages/bot-discord/src/
  __mocks__/
    discord/
      builders.ts          # MessageBuilder, InteractionBuilder, GuildMemberBuilder
      index.ts             # re-export all builders
    core/
      index.ts             # vi.mock factory for @assistme/core exports
    fixtures/
      anthropic/
        dm-agent-tool-use.json       # tool_use turn then end_turn final text
        dm-agent-submission.json     # full create_submission flow (3 turns)
        tsarag-read-propose.json     # read tool + propose_action turn
        faq-agent-match.json         # FAQ answered with confidence 90
        faq-agent-low-confidence.json
      domain/
        student.ts          # createStudent(overrides?)
        session.ts          # createSession(overrides?)
        exercise.ts         # createExercise(overrides?)
        faq-entry.ts        # createFaqEntry(overrides?)
  handlers/
    dm-handler.test.ts
    admin-handler.test.ts
    faq.test.ts
    review-buttons.test.ts
  commands/
    admin/
      session.test.ts
      session-update.test.ts
```

### Pattern 1: Builder Pattern for Discord.js Fake Objects

**What:** A chainable builder class that accumulates properties and returns a plain object cast to the Discord type.

**When to use:** Any test that needs to pass a `Message`, `ChatInputCommandInteraction`, `ButtonInteraction`, or `GuildMember` to a handler under test.

**Key insight from codebase audit:** The handlers only read a small surface of the Discord type. Here is the exact surface each handler uses:

- `dm-handler.ts` reads: `message.author.id`, `message.author.bot`, `message.guild`, `message.attachments`, `message.content`, `message.channel` (cast to `DMChannel`, calls `sendTyping()`), `message.reply()`
- `admin-handler.ts` reads: `message.author.bot`, `message.guild`, `message.channel.name`, `message.attachments`, `message.content`, `message.channel.id`, `message.channel` (cast to `TextChannel`, calls `sendTyping()`, `channel.send()`), `message.member.roles.cache`
- `faq.ts` reads: `message.author.bot`, `message.channel instanceof TextChannel`, `message.channel.name`, `message.member.roles.cache`, `message.reference`, `message.content`, `message.react()`, `message.reply()`
- `review-buttons.ts` reads: `interaction.customId`, `interaction.deferReply()`, `interaction.editReply()`, `interaction.guild.channels.cache`, `interaction.channel.isThread()`, `interaction.client.user.id`, `interaction.guild.members.fetch()`
- `session.ts` command reads: `interaction.member`, `interaction.options.getInteger()`, `interaction.options.getString()`, `interaction.deferReply()`, `interaction.editReply()`, `interaction.guild.channels.cache`, `interaction.guild.roles.cache`

```typescript
// packages/bot-discord/src/__mocks__/discord/builders.ts
import { vi } from 'vitest';
import type { Message, ChatInputCommandInteraction, ButtonInteraction, GuildMember } from 'discord.js';

// Incrementing sequence for unique IDs
let seq = 0;
function nextId(): string { return `id-${++seq}`; }

// ── GuildMember ──────────────────────────────────────────────────────────────

export interface MockRoleOptions {
  name: string;
  id?: string;
}

export class GuildMemberBuilder {
  private roles: MockRoleOptions[] = [];
  private _id = nextId();

  withId(id: string): this { this._id = id; return this; }
  withRole(role: MockRoleOptions): this { this.roles.push(role); return this; }

  build(): GuildMember {
    const roleMap = new Map(this.roles.map((r) => [r.id ?? nextId(), r]));
    return {
      id: this._id,
      createDM: vi.fn().mockResolvedValue({ send: vi.fn().mockResolvedValue(undefined) }),
      roles: {
        cache: {
          some: (pred: (r: { name: string }) => boolean) =>
            this.roles.some(pred),
        },
      },
    } as unknown as GuildMember;
  }
}

// ── Message ──────────────────────────────────────────────────────────────────

export class MessageBuilder {
  private _content = '';
  private _authorId = nextId();
  private _isBot = false;
  private _guild: unknown = null;   // null = DM, object = guild message
  private _channelName = 'test-channel';
  private _channelType: 'DM' | 'TextChannel' = 'TextChannel';
  private _member: GuildMember | null = null;
  private _attachments: Map<string, unknown> = new Map();
  private _reference: { messageId: string } | null = null;

  withContent(text: string): this { this._content = text; return this; }
  withAuthorId(id: string): this { this._authorId = id; return this; }
  asBot(): this { this._isBot = true; return this; }
  inGuild(guildObj: unknown = {}): this { this._guild = guildObj; return this; }
  inChannel(name: string): this { this._channelName = name; return this; }
  asDM(): this { this._guild = null; this._channelType = 'DM'; return this; }
  withMember(member: GuildMember): this { this._member = member; return this; }
  withAttachment(id: string, att: unknown): this { this._attachments.set(id, att); return this; }
  withReference(messageId: string): this { this._reference = { messageId }; return this; }

  build(): Message {
    const replyFn = vi.fn().mockResolvedValue(undefined);
    const reactFn = vi.fn().mockResolvedValue(undefined);
    const sendTypingFn = vi.fn().mockResolvedValue(undefined);
    const sendFn = vi.fn().mockResolvedValue(undefined);

    const channel = {
      name: this._channelName,
      type: this._channelType === 'DM' ? 1 : 0,
      send: sendFn,
      sendTyping: sendTypingFn,
      // Allows `message.channel instanceof TextChannel` to be mocked via:
      // vi.spyOn(channel, Symbol.hasInstance) — or we avoid instanceof check in test setup
      messages: {
        fetch: vi.fn().mockResolvedValue(new Map()),
      },
    };

    return {
      author: { id: this._authorId, bot: this._isBot, displayName: `User-${this._authorId}` },
      content: this._content,
      guild: this._guild,
      channel,
      channelId: nextId(),
      member: this._member,
      attachments: this._attachments,
      reference: this._reference,
      reply: replyFn,
      react: reactFn,
    } as unknown as Message;
  }
}

// ── ChatInputCommandInteraction ──────────────────────────────────────────────

export class CommandInteractionBuilder {
  private _member: GuildMember | null = null;
  private _options: Record<string, string | number | boolean | null> = {};
  private _guild: unknown = { channels: { cache: { find: vi.fn() } }, roles: { cache: { find: vi.fn() } }, members: { fetch: vi.fn() } };

  withMember(member: GuildMember): this { this._member = member; return this; }
  withIntegerOption(name: string, value: number): this { this._options[name] = value; return this; }
  withStringOption(name: string, value: string): this { this._options[name] = value; return this; }
  withGuild(guild: unknown): this { this._guild = guild; return this; }

  build(): ChatInputCommandInteraction {
    const deferReplyFn = vi.fn().mockResolvedValue(undefined);
    const editReplyFn = vi.fn().mockResolvedValue(undefined);
    const replyFn = vi.fn().mockResolvedValue(undefined);

    return {
      member: this._member,
      user: { id: this._member ? (this._member as GuildMember).id : nextId() },
      guild: this._guild,
      deferReply: deferReplyFn,
      editReply: editReplyFn,
      reply: replyFn,
      options: {
        getInteger: (name: string, _required?: boolean) => this._options[name] as number ?? null,
        getString: (name: string, _required?: boolean) => this._options[name] as string ?? null,
      },
    } as unknown as ChatInputCommandInteraction;
  }
}

// ── ButtonInteraction ────────────────────────────────────────────────────────

export class ButtonInteractionBuilder {
  private _customId = 'review_open_test-exercise-id';
  private _guild: unknown = null;
  private _channel: unknown = null;
  private _clientUserId = nextId();

  withCustomId(id: string): this { this._customId = id; return this; }
  withGuild(guild: unknown): this { this._guild = guild; return this; }
  withChannel(ch: unknown): this { this._channel = ch; return this; }
  withClientUserId(id: string): this { this._clientUserId = id; return this; }

  build(): ButtonInteraction {
    const deferReplyFn = vi.fn().mockResolvedValue(undefined);
    const editReplyFn = vi.fn().mockResolvedValue(undefined);
    const replyFn = vi.fn().mockResolvedValue(undefined);

    return {
      customId: this._customId,
      guild: this._guild,
      channel: this._channel,
      deferReply: deferReplyFn,
      editReply: editReplyFn,
      reply: replyFn,
      client: { user: { id: this._clientUserId } },
    } as unknown as ButtonInteraction;
  }
}
```

### Pattern 2: Anthropic SDK Mock + JSON Fixtures

**What:** `vi.mock('@anthropic-ai/sdk')` at the top of agent test files, with `mockCreate.mockResolvedValueOnce()` chains that feed pre-baked fixture responses.

**When to use:** Any test that runs `runDmAgent`, `runTsaragAgent`, or `answerFaqQuestion`.

**Critical shape:** The SDK response must include all required fields or the agent's tool dispatch loop crashes silently. The exact shape required by `dm-agent.ts` (which uses `Anthropic` class directly):

```typescript
// packages/bot-discord/src/__mocks__/fixtures/anthropic/dm-agent-tool-use.json
{
  "id": "msg_test_tool_use",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "tool_use",
      "id": "call_1",
      "name": "get_student_progress",
      "input": { "discord_id": "discord-123" }
    }
  ],
  "stop_reason": "tool_use",
  "stop_sequence": null,
  "model": "claude-sonnet-4-5",
  "usage": { "input_tokens": 100, "output_tokens": 50 }
}
```

```typescript
// packages/bot-discord/src/__mocks__/fixtures/anthropic/dm-agent-final-text.json
{
  "id": "msg_test_final",
  "type": "message",
  "role": "assistant",
  "content": [{ "type": "text", "text": "Твоё задание принято! Тренер проверит его в ближайшее время." }],
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "model": "claude-sonnet-4-5",
  "usage": { "input_tokens": 200, "output_tokens": 80 }
}
```

```typescript
// In a dm-agent test file
import { vi, describe, it, expect, beforeEach } from 'vitest';
import toolUseResponse from '../__mocks__/fixtures/anthropic/dm-agent-tool-use.json' assert { type: 'json' };
import finalTextResponse from '../__mocks__/fixtures/anthropic/dm-agent-final-text.json' assert { type: 'json' };

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

it('routes get_student_progress tool call and returns final text', async () => {
  // Sequence: tool_use → (tool_result injected by agent loop) → end_turn
  mockCreate
    .mockResolvedValueOnce(toolUseResponse)
    .mockResolvedValueOnce(finalTextResponse);

  // ... call runDmAgent and assert
});
```

**MOCK-03 scope clarification:** Per D-04, MSW is NOT used in Phase 2. `vi.mock('@anthropic-ai/sdk')` replaces HTTP entirely. The REQUIREMENTS.md requirement MOCK-03 ("MSW v2 handlers for Supabase REST and Claude API HTTP") is therefore deferred to Phase 3 when integration tests are built. Phase 2 uses `vi.mock('@assistme/core')` for Supabase (mocking the abstraction layer, not the HTTP).

### Pattern 3: Mocking `@assistme/core` Functions

**What:** `vi.mock('@assistme/core')` returns auto-mocked stubs; specific functions get `mockResolvedValue()` implementations per test.

**When to use:** Handler tests that call `runDmAgent`, `runTsaragAgent`, `getAllFaqEntries`, `answerFaqQuestion`, `getExercise`, `getStudent`, etc.

**The `@assistme/core` alias is already set** in `vitest.config.ts` (Phase 1) to point to `packages/core/src/index.ts`. `vi.mock('@assistme/core')` will resolve to this path and auto-mock all exports.

```typescript
// In a handler test (e.g., faq.test.ts)
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@assistme/core'); // auto-mocks all named exports

import { getAllFaqEntries, answerFaqQuestion } from '@assistme/core';

// In each test:
vi.mocked(getAllFaqEntries).mockResolvedValue([]);
vi.mocked(answerFaqQuestion).mockResolvedValue({
  answer: 'Les agents IA sont des systèmes autonomes.',
  confidence: 85,
  matchedFaqId: 'faq-1',
  suggestAddToFaq: false,
});
```

### Pattern 4: Handler State Isolation (DM and Admin Handlers)

**What:** Export a `_clearStateForTesting()` function from handlers that resets module-level Maps, guarded by `NODE_ENV === 'test'`. Call it in `beforeEach`.

**When to use:** dm-handler.ts and admin-handler.ts tests — both use module-level `conversations` and `processingLocks` Maps that persist between tests in the same worker (Pitfall 9 from PITFALLS.md).

**Required production code changes (minimal, D-02 compliant):**

1. **dm-handler.ts**: Add at the bottom:
   ```typescript
   // Test-only: export for state isolation between tests
   export function _clearStateForTesting(): void {
     if (process.env['NODE_ENV'] !== 'test') return;
     conversations.clear();
     processingLocks.clear();
   }
   ```

2. **dm-handler.ts** `notifyAdminChannel` function uses module-level `discordClient`. This is only called after a submission is created and the test confirms `result.submissionId` is set. In tests that mock `runDmAgent` to NOT return a `submissionId`, this code path is never reached. For tests that DO exercise `notifyAdminChannel`, call `setupDmHandler(mockClient)` with a mock client in `beforeEach`.

3. **admin-handler.ts**: Same pattern — add `_clearStateForTesting()` that resets `conversations` and `processingLocks`.

4. **faq.ts** and **review-buttons.ts**: No module-level state — no change needed.

### Pattern 5: `instanceof TextChannel` Check in faq.ts

**What:** `faq.ts` line 14 uses `message.channel instanceof TextChannel` which fails with plain object mocks because the mock is not a real `TextChannel` instance.

**Solution:** In faq tests, mock the channel as `Object.setPrototypeOf(channel, TextChannel.prototype)` — this makes instanceof return true without calling the constructor. Alternatively, since D-01 says minimal code changes, restructure the check in tests by ensuring the mock's prototype chain satisfies instanceof:

```typescript
// packages/bot-discord/src/__mocks__/discord/builders.ts — channel section
import { TextChannel } from 'discord.js';

// In MessageBuilder for guild text channel:
const channel = Object.assign(Object.create(TextChannel.prototype), {
  name: this._channelName,
  send: sendFn,
  sendTyping: sendTypingFn,
  messages: { fetch: vi.fn().mockResolvedValue(new Map()) },
});
```

**Confidence:** MEDIUM — `Object.create(TextChannel.prototype)` bypasses the private constructor and makes instanceof return true. Verified pattern from discord.js discussion #6179. Risk: if `TextChannel` constructor sets up required internal state that faq.ts accesses beyond just `name` and `send`, additional props must be manually added to the object.

### Pattern 6: Domain Fixture Factories

**What:** Factory functions that produce typed domain objects from `@assistme/core` types with sensible defaults, supporting partial overrides.

**Location:** `packages/bot-discord/src/__mocks__/fixtures/domain/` (per D-06, co-located in bot-discord)

```typescript
// packages/bot-discord/src/__mocks__/fixtures/domain/student.ts
import type { Student } from '@assistme/core';

let seq = 0;

export function createStudent(overrides: Partial<Student> = {}): Student {
  seq++;
  return {
    id: `student-${seq}`,
    discord_id: `discord-${seq}`,
    name: `Test Student ${seq}`,
    session_id: 'session-1',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
```

Factories needed: `createStudent`, `createSession`, `createExercise` (with `StudentExercise` type), `createFaqEntry`.

### Anti-Patterns to Avoid

- **Never import from `index.ts` in tests** — import handlers and agents directly. `index.ts` connects to Discord gateway.
- **Never call `new Message(client, data)`** — private constructor, TypeScript strict mode rejects it.
- **Never share mock object instances between tests** — factory functions must return fresh objects per `it()` block.
- **Never skip `vi.clearAllMocks()` in `beforeEach`** — mock call history from previous tests corrupts `toHaveBeenCalledWith()` assertions.
- **Never use `vi.mock()` inside `it()` blocks** — Vitest hoists `vi.mock()` to the top of the file; calling it inside a test body is a no-op.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Anthropic SDK response shape | Custom response objects from scratch | Static JSON fixtures + `mockCreate.mockResolvedValueOnce()` | The exact shape must match SDK internals exactly or agent tool dispatch silently fails |
| Discord type-safe stubs | Full recreation of discord.js class graph | Plain objects with `as unknown as DiscordType` + `vi.fn()` for methods | discord.js v14 private constructors make full recreation impossible under strict TS |
| Supabase query chain stub | Complex recursive Proxy | `vi.mock('@assistme/core')` and mock individual DB functions | The codebase wraps all Supabase calls in `packages/core/src/db/*.ts` — mock the abstraction, not the client |
| Multi-turn agent loop fixture | Stateful mock that simulates tool call cycles | Array of `mockResolvedValueOnce()` calls matching each turn | Explicit sequential fixture is debuggable; stateful mocks hide which turn is failing |

**Key insight:** Mock at the highest useful abstraction boundary. For handlers: mock `@assistme/core` exports (not Supabase or Anthropic clients). For agent tests: mock `@anthropic-ai/sdk` directly (agents call it directly, not through a core wrapper).

---

## Lazy Init vs Pure vi.mock() — Handler-by-Handler Assessment

Per D-02, only change what is actually broken. Here is the assessment for each target:

| Handler | Module-Level State | Discord Client Dependency | Resolution |
|---------|-------------------|--------------------------|------------|
| `dm-handler.ts` | `conversations` Map, `processingLocks` Map, `discordClient` var | `notifyAdminChannel` uses `discordClient.channels.cache` | Call `setupDmHandler(mockClient)` in `beforeEach` + export `_clearStateForTesting()` |
| `admin-handler.ts` | `conversations` Map, `processingLocks` Map | None (client passed only to `setupAdminHandler()`) | Export `_clearStateForTesting()` only — no client ref persisted |
| `faq.ts` | None | None (client passed to `setupFaqHandler()` but unused beyond event binding) | Pure `vi.mock()` — no production code changes |
| `review-buttons.ts` | None | None (uses `interaction.guild` per-call) | Pure `vi.mock()` — no production code changes |
| Slash commands (`commands/admin/*.ts`) | None | None (use `interaction.guild` per-call) | Pure `vi.mock()` — no production code changes |

**Total production file changes required: 2** (`dm-handler.ts` and `admin-handler.ts` each get one exported `_clearStateForTesting()` function).

---

## Common Pitfalls

### Pitfall 1: `vi.mock('@anthropic-ai/sdk')` Has No Effect If DM Agent Imports Anthropic as Default

**What goes wrong:** `dm-agent.ts` line 1 uses `import Anthropic from '@anthropic-ai/sdk'`. When `vi.mock('@anthropic-ai/sdk')` factory returns `{ default: vi.fn()... }`, if the factory omits the `default` key or uses `{ Anthropic: ... }` instead, the mock is a no-op — the real Anthropic constructor is called, making real API calls.

**Prevention:** The mock factory must return `{ default: vi.fn().mockImplementation(() => ({ messages: { create: mockCreate } })) }` — the `default` export key is critical.

**Detection:** Test takes >2 seconds or throws `ANTHROPIC_API_KEY is required`.

### Pitfall 2: `message.channel instanceof TextChannel` Fails With Plain Object Mock

**What goes wrong:** `faq.ts` line 14 guards with `instanceof TextChannel`. A plain `{}` mock returns false for instanceof — the handler exits immediately and no assertions fire.

**Prevention:** Use `Object.create(TextChannel.prototype)` to construct the channel object so instanceof returns true, or stub the channel's prototype chain in the builder.

**Detection:** Test passes (no error) but `vi.mocked(getAllFaqEntries)` is never called — the handler returned early.

### Pitfall 3: `conversations` Map State Leaks Between Tests in the Same File

**What goes wrong:** Test A calls `processDmMessage` with user ID `discord-1`. Test B (same file) expects a fresh conversation but instead receives Test A's partially-built conversation state.

**Prevention:** Call the exported `_clearStateForTesting()` in `beforeEach` across all tests in dm-handler.test.ts and admin-handler.test.ts.

**Detection:** Test B passes when run alone but fails when run as part of the full file.

### Pitfall 4: Anthropic Fixture JSON Missing `stop_reason` or `usage` Fields

**What goes wrong:** The agent loop in `dm-agent.ts` checks `response.stop_reason === 'tool_use'` to decide whether to continue iterating. If the JSON fixture omits `stop_reason`, the condition is `undefined !== 'tool_use'` which evaluates as `true` for a text response — meaning the loop doesn't terminate correctly, or conversely fails to fire tools.

**Prevention:** Every fixture JSON must include `stop_reason`, `model`, `usage.input_tokens`, `usage.output_tokens`, and `content` (array). Validate fixtures once against the `Message` type from `@anthropic-ai/sdk` after writing them.

**Detection:** `TypeError: Cannot read properties of undefined` on `response.stop_reason`.

### Pitfall 5: `setupDmHandler(mockClient)` Called Once Per File, Not Per Test

**What goes wrong:** `discordClient` is a module-level `let` variable assigned by `setupDmHandler`. If called once at the top of the test file (outside `beforeEach`), all tests share the same mock client reference. If one test modifies mock method return values, other tests inherit those modifications.

**Prevention:** Always call `setupDmHandler(createMockClient())` inside `beforeEach` so each test gets a fresh mock client. Pair with `vi.clearAllMocks()`.

**Detection:** The second test in a file gets mock return values that were configured in the first test.

### Pitfall 6: `isAdmin()` Returns False Because `member.roles.cache.some` Stub Returns Wrong Value

**What goes wrong:** `auth.ts` `isAdmin()` calls `member.roles.cache.some((role) => role.name === ROLES.admin)`. If the mock's `roles.cache.some` is `vi.fn()` with no implementation (returns `undefined`), `isAdmin()` returns falsy and all admin-protected handlers skip execution.

**Prevention:** The `GuildMemberBuilder.withRole()` method must wire a real `.some()` function that iterates the role list, not a `vi.fn()` stub. See the builder code example above.

**Detection:** Handler test never reaches the agent call — `runTsaragAgent` is never called.

---

## Code Examples

### Running the Unit Test Suite

```bash
# Run all unit tests (sub-5 seconds target)
pnpm test:unit

# Run only bot-discord tests
pnpm vitest run --project bot-discord

# Watch mode for TDD
pnpm test:watch
```

### Complete Test File: FAQ Handler

```typescript
// packages/bot-discord/src/handlers/faq.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@assistme/core');

import { setupFaqHandler } from './faq.js';
import { getAllFaqEntries, answerFaqQuestion, incrementFaqUsage, createFaqEntry, createFormationEvent } from '@assistme/core';
import { MessageBuilder, GuildMemberBuilder } from '../__mocks__/discord/builders.js';
import { TextChannel } from 'discord.js';
import type { Client } from 'discord.js';

function makeClient(): Client {
  const handlers = new Map<string, Function>();
  return {
    on: (event: string, handler: Function) => { handlers.set(event, handler); return {} as Client; },
    emit: (event: string, ...args: unknown[]) => handlers.get(event)?.(...args),
  } as unknown as Client;
}

describe('FAQ handler', () => {
  let client: ReturnType<typeof makeClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = makeClient();
    setupFaqHandler(client as Client);
  });

  it('ignores bot messages', async () => {
    const msg = new MessageBuilder().asBot().build();
    await (client as any).emit('messageCreate', msg);
    expect(getAllFaqEntries).not.toHaveBeenCalled();
  });

  it('ignores messages outside FAQ channel', async () => {
    const student = new GuildMemberBuilder().withRole({ name: 'Étudiant' }).build();
    const msg = new MessageBuilder()
      .inGuild({})
      .withMember(student)
      .inChannel('general')
      .withContent('Quelle est la différence entre AI et ML?')
      .build();
    // Override channel to be instanceof TextChannel
    Object.setPrototypeOf((msg as any).channel, TextChannel.prototype);
    await (client as any).emit('messageCreate', msg);
    expect(getAllFaqEntries).not.toHaveBeenCalled();
  });

  it('answers student question with high confidence', async () => {
    const student = new GuildMemberBuilder().withRole({ name: 'Étudiant' }).build();
    const msg = new MessageBuilder()
      .inGuild({})
      .withMember(student)
      .inChannel('faq')
      .withContent('Quelle est la différence entre AI et ML?')
      .build();
    Object.setPrototypeOf((msg as any).channel, TextChannel.prototype);

    vi.mocked(getAllFaqEntries).mockResolvedValue([]);
    vi.mocked(answerFaqQuestion).mockResolvedValue({
      answer: 'AI est le domaine général, ML en est une sous-catégorie.',
      confidence: 85,
      matchedFaqId: 'faq-1',
      suggestAddToFaq: false,
    });

    await (client as any).emit('messageCreate', msg);

    expect(answerFaqQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ question: 'Quelle est la différence entre AI et ML?' })
    );
    expect((msg as any).reply).toHaveBeenCalled();
    expect(incrementFaqUsage).toHaveBeenCalledWith('faq-1');
  });

  it('creates formation event when confidence is low', async () => {
    const student = new GuildMemberBuilder().withRole({ name: 'Étudiant' }).build();
    const msg = new MessageBuilder()
      .inGuild({})
      .withMember(student)
      .inChannel('faq')
      .withContent('Question très spécifique sans réponse?')
      .build();
    Object.setPrototypeOf((msg as any).channel, TextChannel.prototype);

    vi.mocked(getAllFaqEntries).mockResolvedValue([]);
    vi.mocked(answerFaqQuestion).mockResolvedValue({
      answer: 'Je ne suis pas sûr.',
      confidence: 40,
      matchedFaqId: null,
      suggestAddToFaq: false,
    });

    await (client as any).emit('messageCreate', msg);

    expect(createFormationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'student_alert' })
    );
  });
});
```

### Anthropic Mock Setup for Agent Tests

```typescript
// packages/bot-discord/src/__mocks__/core/anthropic-mock.ts
import { vi } from 'vitest';

export const mockAnthropicCreate = vi.fn();

// Call this at the top of any agent test file (before imports):
// vi.mock('@anthropic-ai/sdk', () => ({
//   default: vi.fn().mockImplementation(() => ({
//     messages: { create: mockAnthropicCreate },
//   })),
// }));

export function mockToolUseSequence(
  toolName: string,
  toolInput: Record<string, unknown>,
  finalText: string
): void {
  mockAnthropicCreate
    .mockResolvedValueOnce({
      id: 'msg_tool_use',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'call_1', name: toolName, input: toolInput }],
      stop_reason: 'tool_use',
      stop_sequence: null,
      model: 'claude-sonnet-4-5',
      usage: { input_tokens: 100, output_tokens: 50 },
    })
    .mockResolvedValueOnce({
      id: 'msg_final',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: finalText }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      model: 'claude-sonnet-4-5',
      usage: { input_tokens: 200, output_tokens: 80 },
    });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `vitest.workspace.ts` | `projects:` array in root `vitest.config.ts` | Vitest v3.2 | Workspace file deprecated — existing config already uses correct pattern |
| `@vitest/coverage-c8` | `@vitest/coverage-v8` | ~2023 | c8 package is dead, v8 provider is the standard |
| `pool: 'vmThreads'` | `pool: 'forks'` (default) | Vitest v3.x | vmThreads causes ESM instability with Node.js 20 native modules — config already correct |

**Deprecated/outdated:**
- `jest-discordjs-mocks`: Targets Jest + discord.js v12/v13. Not compatible with Vitest or d.js v14.
- `@shoginn/discordjs-mock`: Last published >1 year ago, v14 compatibility unverified, explicitly excluded in REQUIREMENTS.md out-of-scope list.
- `corde` (E2E): Last release November 2022, does not support discord.js v14.

---

## Open Questions

1. **Which dm-agent tools need separate fixture files?**
   - What we know: DM agent has 5 tools: `get_student_progress`, `get_session_exercise`, `create_submission`, `get_pending_feedback`, `search_course_content`
   - What's unclear: Are some tools only exercised in specific flows? How many fixture files to create vs how many to inline as helpers?
   - Recommendation: Create 3 fixture scenarios: (1) get_student_progress only (simple query), (2) create_submission multi-turn (3 turns), (3) search_course_content. Inline simple single-turn mocks using `mockToolUseSequence()` helper.

2. **Does `admin-handler.ts` `processAdminMessage` need to be exported for testing?**
   - What we know: It's unexported. The handler is registered via `client.on('messageCreate', ...)` in `setupAdminHandler()`. We can test it by emitting fake events on a mock client (same pattern as FAQ test above).
   - What's unclear: Whether the processing lock queue (`processingLocks` Map) adds test complexity.
   - Recommendation: Use the mock-client emit pattern (no export needed). Add `_clearStateForTesting()` export to reset the lock map between tests.

3. **`review-buttons.ts` imports `@assistme/core` dynamically on line 163**
   - What we know: `await import('@assistme/core').then((m) => m.getAttachmentsByExercise(exerciseId))` — a dynamic import inside a function.
   - What's unclear: Does `vi.mock('@assistme/core')` at the static import level also intercept dynamic imports of the same specifier in Vitest?
   - Recommendation: Based on Vitest docs (module mocking applies to all imports including dynamic), this should work. Mark as HIGH priority to verify with a quick test during Wave 1. If it fails, refactor the one line to a static import (minimal change per D-02).

---

## Environment Availability

Step 2.6: SKIPPED (Phase 2 is code-only — no external services, no Docker, no CLI tools beyond what Phase 1 already verified).

---

## Project Constraints (from CLAUDE.md)

| Directive | Applies To Phase 2 |
|-----------|-------------------|
| TypeScript strict mode, no `any` | All mock/fixture/test files must use proper types or `as unknown as T` casts |
| ESM imports with explicit `.js` extension | All test file imports must use `.js` extension (e.g., `'../handlers/faq.js'`, `'../__mocks__/discord/builders.js'`) |
| Use Zod for runtime validation of external data | Not applicable to test files |
| Use pino for logging | Not applicable to test files — use `LOG_LEVEL: 'silent'` (already set in vitest.config.ts) |
| No `any` types | Use `Partial<T>` + `as unknown as T` pattern for Discord mocks — not raw `any` |
| All Supabase queries go through `packages/core/src/db/` | Tests mock at `@assistme/core` level (correct — mocking the abstraction boundary) |
| All Claude API calls go through `packages/core/src/ai/` | Agent tests mock `@anthropic-ai/sdk` directly because `dm-agent.ts` calls Anthropic directly |
| Spec-first development | Read `specs/04-bot-discord/SPEC.md` before implementing handler tests |
| Handlers: dm-handler.ts, admin-handler.ts, faq.ts, review-buttons.ts | Phase 2 target files confirmed — matches spec |
| `packages/bot-discord/src/__mocks__/` | D-06 aligns with CLAUDE.md co-location preference |
| pnpm workspaces, not npm/yarn | All install commands use `pnpm` |

---

## Sources

### Primary (HIGH confidence)

- Vitest 4.1.1 configuration — verified from `vitest.config.ts` Phase 1 artifact in project
- discord.js v14.16.0 handler source code — direct read of `dm-handler.ts`, `admin-handler.ts`, `faq.ts`, `review-buttons.ts`, `session.ts`
- `.planning/research/PITFALLS.md` — codebase-verified pitfall analysis from Phase 0 research
- `.planning/research/STACK.md` — technology stack research with official source citations
- `.planning/research/ARCHITECTURE.md` — test architecture patterns with confidence levels

### Secondary (MEDIUM confidence)

- `discord.js discussion #6179` — community consensus on private constructor mock approach (cited in PITFALLS.md)
- `vitest-dev/vitest issue #5633` — pnpm symlink module split; already mitigated by Phase 1 resolve.alias

### Tertiary (LOW confidence)

- `Object.create(TextChannel.prototype)` for instanceof — community pattern, not in official discord.js docs; mark for quick validation in Wave 0 of planning

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and working (Phase 1 smoke tests pass)
- Architecture: HIGH for mock patterns; MEDIUM for `instanceof TextChannel` workaround (needs quick validation)
- Pitfalls: HIGH — all identified pitfalls are verified against actual source code read this session
- Handler surface audit: HIGH — directly read all four handler files and all slash commands

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable libraries, conservative estimate)
