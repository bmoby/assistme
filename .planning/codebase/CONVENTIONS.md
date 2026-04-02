# Coding Conventions

**Analysis Date:** 2026-03-31

## Naming Patterns

**Files:**
- Use kebab-case for all source files: `dm-agent.ts`, `context-builder.ts`, `quiz-eval.ts`
- Use kebab-case for directories: `bot-discord-quiz`, `formation`
- Index files (`index.ts`) as module entry points for directories: `packages/core/src/db/index.ts`, `packages/core/src/ai/index.ts`
- Test files: co-located with source, `*.test.ts` suffix: `dm-agent.test.ts` next to `dm-agent.ts`
- Integration tests: `*.integration.test.ts` suffix: `knowledge.integration.test.ts`
- E2E tests: `*.e2e.test.ts` suffix in `test/e2e/`: `dm-student-flow.e2e.test.ts`

**Functions:**
- camelCase for all function names: `askClaude()`, `getStudentByDiscordId()`, `runDmAgent()`
- Action-verb prefix for DB operations: `get*`, `create*`, `update*`, `delete*`, `search*`
- `run*` prefix for agent execution: `runDmAgent()`, `runTsaragAgent()`, `runMemoryAgent()`
- `handle*` prefix for event/interaction handlers: `handleSession()`, `handleQuizAnswer()`
- `setup*` prefix for wiring handler registration: `setupFaqHandler()`, `setupDmHandler()`
- `build*` prefix for constructing formatted output: `buildSessionForumContent()`, `buildContext()`
- `is*` / `has*` / `can*` for boolean functions: `isAdmin()`, `isStudent()`, `isMentor()`
- `parse*` prefix for parsing external data: `parseQuizFromTxt()`, `parseUserMessage()`

**Variables:**
- camelCase for local variables and parameters: `discordUserId`, `queryEmbedding`, `pendingSubmissionIntent`
- UPPER_SNAKE_CASE for constants (especially prompts and table names):
  ```typescript
  const SYSTEM_PROMPT = `...`;
  const TABLE = 'students';
  const EVAL_SYSTEM_PROMPT = '...';
  ```

**Types/Interfaces:**
- PascalCase for all types and interfaces: `Student`, `DmAgentContext`, `ExerciseReviewResult`
- Union types: PascalCase: `TaskStatus`, `StudentQuizSessionStatus`, `QuizQuestionType`
- `New*` type alias using `Omit` for creation payloads: `type NewStudent = Omit<Student, 'id' | 'created_at' | 'updated_at'>`
- Zod schemas: PascalCase with `Schema` suffix: `ParsedQuizSchema`, `AgentOriginSchema`, `InvokeAgentDataSchema`
- Type inference from Zod: `type ParsedQuiz = z.infer<typeof ParsedQuizSchema>`
- Interfaces for function parameter objects: `DmAgentContext`, `TsaragAgentContext`
- Interfaces for function return objects: `DmAgentResponse`, `ExerciseReviewResult`, `EvalResult`

## Code Style

**Formatting:**
- No ESLint config or Prettier config files present at project root
- Root `package.json` defines lint commands (`pnpm lint`, `pnpm format`) but no `.eslintrc` / `.prettierrc` files exist
- De facto formatting: 2-space indentation, single quotes for strings
- Line length: typically under 100 characters
- Trailing commas used in multi-line structures

**TypeScript Strictness:**
- `strict: true` in root `tsconfig.json`
- `noUncheckedIndexedAccess: true` -- array/object index access returns `T | undefined`
- `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`
- Target: ES2022, Module: ESNext, moduleResolution: bundler
- Always use bracket notation with string literal for env access: `process.env['ANTHROPIC_API_KEY']` (enforced by `noUncheckedIndexedAccess`)

**ESM Modules:**
- All packages use `"type": "module"` in `package.json`
- ESM only: `import`/`export` syntax, no `require`
- Import paths include `.js` extension explicitly: `import { logger } from '../logger.js'`
- Exception: imports from `@assistme/core` use bare specifier (resolved by workspace): `import { askClaude } from '@assistme/core'`

## Import Organization

**Order (observed pattern):**
1. External SDK/framework imports: `import Anthropic from '@anthropic-ai/sdk'`
2. Workspace package imports: `import { askClaude } from '@assistme/core'`
3. Relative imports (deepest first): `import { getStudentByDiscordId } from '../../db/formation/index.js'`
4. Type-only imports: `import type { Student } from '../../types/index.js'`

**Path Aliases:**
- No path aliases in source code (`@/` not used)
- Direct relative paths everywhere: `../../ai/client.js`, `../db/memory.js`
- The `@assistme/core` alias is resolved at vitest level via `resolve.alias` in `vitest.config.ts`

**Barrel Files:**
- `packages/core/src/index.ts` -- single export point for entire core package
- `packages/core/src/ai/index.ts` -- re-exports all AI functions and types
- `packages/core/src/db/index.ts` -- re-exports all DB modules
- `packages/core/src/ai/formation/index.ts` -- re-exports formation agents
- `packages/bot-discord/src/__mocks__/fixtures/domain/index.ts` -- re-exports all fixture factories

## Error Handling

**Database Operations:**
- Supabase errors checked via `error` field in response, not exceptions
- Pattern: log error, then throw
  ```typescript
  const { data, error } = await db.from(TABLE).select().eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found -> null
    logger.error({ error, id }, 'Failed to get student');
    throw error;
  }
  return data as Student;
  ```
- "Not found" returns `null` (check `PGRST116` Supabase error code), other errors throw

**AI/Claude Responses:**
- JSON parsing with try/catch, fallback to degraded result:
  ```typescript
  try {
    const parsed = JSON.parse(raw) as { isCorrect: boolean; reasoning: string };
    return { isCorrect: Boolean(parsed.isCorrect), reasoning: String(parsed.reasoning) };
  } catch {
    return {
      isCorrect: studentAnswer.toLowerCase().includes(question.correct_answer.toLowerCase()),
      reasoning: 'parsing fallback',
    };
  }
  ```
- Extract JSON from Claude preamble text: `raw.match(/\{[\s\S]*\}/)`
- Markdown code block stripping for JSON extraction

**Agent Tool Loops:**
- Each tool call wrapped in try/catch individually
- Error results returned as JSON tool_result so Claude can recover:
  ```typescript
  } catch (err) {
    logger.error({ err, tool: toolUse.name }, 'DM agent tool error');
    result = JSON.stringify({ error: 'internal_error', message: '...' });
  }
  ```
- Maximum iteration limit prevents infinite tool loops (typically 5 iterations)

**Handler Error Handling:**
- Top-level try/catch in handlers, reply with user-facing error message:
  ```typescript
  // On error, reply with generic error to user
  expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('Ошибка'));
  ```

**Environment Variables:**
- Throw explicit `Error` if required env var is missing at initialization:
  ```typescript
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
  }
  ```

## Logging

**Framework:** pino (structured JSON logging)

**Configuration:** `packages/core/src/logger.ts`
- Log level from `LOG_LEVEL` env var, defaults to `'info'`
- Pretty-print in development, JSON in production
- Tests use `LOG_LEVEL=silent`

**Patterns:**
- Always use structured context object as first parameter:
  ```typescript
  logger.info({ studentId: student.id, iterations }, 'DM agent response ready');
  logger.error({ error, id }, 'Failed to get student');
  logger.debug({ model, promptLength: params.prompt.length }, 'Calling Claude API');
  ```
- `debug`: detailed traces, API call params, token counts
- `info`: operation completed successfully, initialization
- `warn`: recoverable issues
- `error`: operation failures with error object included

**In Tests:**
- Logger always mocked to silence output:
  ```typescript
  vi.mock('../../logger.js', () => ({
    logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
  }));
  ```

## Type Patterns

**Interface Design:**
- Separate interfaces for context (input) and response (output): `DmAgentContext` / `DmAgentResponse`
- Use `Record<string, unknown>` for flexible JSON objects: `payment_details: Record<string, unknown> | null`
- Union literal types for status fields: `type StudentStatus = 'interested' | 'registered' | 'paid' | 'active' | 'completed' | 'dropped'`
- Section comments with `// ============================================` separators between type groups

**Explicit Return Types:**
- Always specify return type on exported functions:
  ```typescript
  export async function getStudent(id: string): Promise<Student | null> { ... }
  export async function runDmAgent(context: DmAgentContext): Promise<DmAgentResponse> { ... }
  ```

**Null vs Undefined:**
- `null` for DB fields that are empty: `phone: string | null`
- `undefined` for optional function params: `model?: ModelChoice`
- Nullish coalescing for defaults: `params.model ?? 'sonnet'`

**Zod Usage:**
- Runtime validation for external data (Claude API output, file parsing):
  ```typescript
  const result = ParsedQuizSchema.parse(parsed); // throws ZodError if malformed
  ```
- Located in: `packages/bot-discord-quiz/src/ai/parse-quiz.ts`, `packages/core/src/agents/types.ts`
- Discriminated unions for complex structures: `z.discriminatedUnion('type', [McqSchema, TrueFalseSchema, OpenSchema])`

## Database Access

**Singleton Client:**
- `packages/core/src/db/client.ts` exports `getSupabase()` -- lazy singleton initialization
- Same pattern for Anthropic client: `packages/core/src/ai/client.ts` with `getClient()`, `getFormationClient()`

**CRUD Pattern:**
- Each entity module in `packages/core/src/db/`:
  - `const TABLE = 'table_name';` at top
  - `get*()` returns `Entity | null` for single, `Entity[]` for multiple
  - `create*()` accepts `Partial<NewEntity> & { required_field: string }`
  - `update*()` adds `updated_at: new Date().toISOString()` automatically
  - `search*()` uses `ilike` for text search
- Always cast Supabase result: `return data as Student`
- Empty arrays default: `return (data ?? []) as Student[]`

**Query Patterns:**
- Filter by foreign key: `.eq('discord_id', discordId)`
- Multiple status filter: `.in('status', ['paid', 'active'])`
- Ordering: `.order('created_at', { ascending: false })`
- Text search: `.ilike('name', `%${name}%`)`

## AI/Agent Patterns

**Simple AI Call (askClaude):**
- `packages/core/src/ai/client.ts` -- `askClaude({ prompt, systemPrompt?, model?, maxTokens?, formation? })`
- Model choice: `'sonnet' | 'opus'` mapped to full model names
- Used by: FAQ agent, quiz evaluator, quiz parser

**Tool-Use Agent Loop:**
- Pattern in `packages/core/src/ai/formation/dm-agent.ts`, `packages/core/src/ai/formation/tsarag-agent.ts`
- Steps: (1) define TOOLS array, (2) call Claude with tools, (3) check for tool_use blocks, (4) execute tools, (5) feed tool_result back, (6) repeat until end_turn or max iterations
- Max iterations guard (typically 5) prevents infinite loops
- Tool results returned as JSON strings via `JSON.stringify()`

**Agent Return Pattern:**
- Agents return structured objects with text + optional intent/action data:
  ```typescript
  return { text, submissionIntent: pendingSubmissionIntent };
  ```
- The handler layer processes intents (e.g., showing a confirmation UI), NOT the agent itself

**System Prompts:**
- Stored as `const SYSTEM_PROMPT = \`...\`` at module level
- Admin-facing prompts in French
- Student-facing prompts in Russian
- Security instructions embedded in prompts (ignore injection attempts)

**Config Constants:**
- Role and channel names centralized in `packages/bot-discord/src/config.ts`:
  ```typescript
  export const ROLES = { admin: 'tsarag', student: 'student', mentor: 'mentor' } as const;
  export const CHANNELS = { annonces: 'объявления', sessions: 'сессии', ... } as const;
  ```

---

*Convention analysis: 2026-03-31*
