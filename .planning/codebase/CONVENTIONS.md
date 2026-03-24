# Coding Conventions

**Analysis Date:** 2026-03-24

## Naming Patterns

**Files:**
- Lowercase with hyphens for directories and modules: `agent-jobs.ts`, `memory-agent.ts`, `bot-telegram`
- PascalCase for type/interface files if exporting types: `types/index.ts` contains interfaces like `Task`, `Student`
- Index files (`index.ts`) as module entry points for directory-based organization
- Function files use kebab-case that matches functionality: `memory-agent.ts`, `context-builder.ts`, `pptx-builder.ts`

**Functions:**
- camelCase for all function names
- Async functions follow same naming convention without async suffix: `createTask()`, `getSupabase()`, `runMemoryAgent()`
- Private helper functions prefixed with underscore discouraged; instead use module scoping
- Action-verb prefix for database operations: `getTask()`, `createTask()`, `updateTask()`, `deleteMemory()`
- Query functions: `get*` for single/array returns, `search*` for filtered results
- Boolean functions: `is*`, `has*`, `can*` prefix: `isOpen` (redis check pattern)

**Variables:**
- camelCase for all local variables and parameters
- Constant strings (prompts, messages): UPPER_SNAKE_CASE
- Example: `MEMORY_AGENT_PROMPT`, `ORCHESTRATOR_PROMPT`, `TABLE = 'tasks'`
- Interface implementations use camelCase properties
- Configuration objects: camelCase keys

**Types:**
- PascalCase for all type and interface names: `Task`, `AgentJob`, `AgentDefinition`, `AgentOutput`
- Union types: PascalCase: `TaskStatus`, `TaskPriority`, `CallerRole`
- Zod schemas: PascalCase suffix with "Schema": `ArtisanInputSchema`, `AgentOriginSchema`
- Type inference from Zod: `type ArtisanInput = z.infer<typeof ArtisanInputSchema>`

## Code Style

**Formatting:**
- ESM modules only (`import`/`export`, no `require`)
- Import `.js` extension explicitly in ESM files: `import { logger } from '../logger.js'`
- No auto-formatting tool configured (prettier/eslint configs missing)
- Standard indentation observed: 2 spaces
- Line length: typically under 100 characters for readability

**Linting:**
- Root package.json defines lint commands but no config files present
- Commands available: `pnpm lint` (eslint), `pnpm lint:fix`, `pnpm format` (prettier)
- Actual linting configuration files not present in repo (may be inherited from node_modules)
- No strict linting enforcement observed in codebase review

## Import Organization

**Order:**
1. External npm packages (`import { z } from 'zod'`)
2. Type-only imports from other modules (`import type { Task } from '../types/index.js'`)
3. Regular imports from core modules (`import { logger } from '../logger.js'`)
4. Relative imports from same package (`import { registerAgent } from '../registry.js'`)
5. Sub-package imports (e.g., `import { getSupabase } from '../db/client.js'`)

**Example from `packages/core/src/agents/artisan/index.ts`:**
```typescript
import { z } from 'zod';
import { askClaude } from '../../ai/client.js';
import { logger } from '../../logger.js';
import type { AgentDefinition, AgentOutput, AgentExecutionContext } from '../types.js';
import { registerAgent } from '../registry.js';
import { ARTISAN_SYSTEM_PROMPT, buildArtisanPrompt } from './prompt.js';
import { buildPptx } from './pptx-builder.js';
```

**Path Aliases:**
- No path aliases configured (no `@/` or `~` patterns)
- Direct relative paths used throughout: `../../ai/client.js`, `../db/memory.js`

## Error Handling

**Patterns:**
- Throw explicit Error objects with descriptive messages: `throw new Error('Missing ANTHROPIC_API_KEY environment variable')`
- Error messages are developer-facing strings that include context
- Database errors logged before rethrowing: `logger.error({ error }, 'Failed to get task'); throw error;`
- Non-critical operations use graceful degradation (see cache module):
  ```typescript
  if (error) {
    logger.error({ error, id }, 'Failed to get task');
    return null;  // Return null instead of throwing
  }
  ```
- Try-catch used for JSON parsing, graceful fallback to plain text:
  ```typescript
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    const cleanResponse = response.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    return { response: cleanResponse, actions: [] };
  }
  ```
- Async operations use Promise.all for parallel execution: `const [coreMemory, workingMemory] = await Promise.all([...])`
- Supabase errors checked via `error` field in response object, not exceptions

## Logging

**Framework:** pino (with pino-pretty for development)

**Setup location:** `packages/core/src/logger.ts`

**Patterns:**
- Centralized logger instance exported: `export const logger = pino({ ... })`
- Log levels: 'debug', 'info', 'warn', 'error' observed in use
- Context object as first parameter (structured logging): `logger.error({ error, id }, 'Failed to get task')`
- Informational logs use logger.info: `logger.info('Supabase client initialized')`
- Debug logs for detailed traces: `logger.debug({ model, promptLength }, 'Calling Claude API')`
- Warning logs for recoverable issues: `logger.warn({ count }, 'Recovered zombie agent jobs')`
- Non-critical failures (cache) logged at debug level to avoid noise
- Log level determined by `LOG_LEVEL` env var, defaults to 'info'

## Comments

**When to Comment:**
- Block comments for major system prompts (multi-line, placed above constant)
- Comments on complex logic like zombie job recovery or memory tier classification
- Section comments for grouping related functionality (e.g., `// ============================================` separators in types)
- No JSDoc observed in codebase; type inference from TypeScript sufficient

**Example style from types:**
```typescript
// ============================================
// Task Types
// ============================================

export type TaskCategory = 'client' | 'student' | 'content' | 'personal' | 'dev' | 'team';
```

## Function Design

**Size:**
- Typical functions 10-40 lines for database operations
- Larger functions (50-100+ lines) used for complex orchestration logic (orchestrator, agents)
- Agent execute functions contain substantial business logic but maintain readability through clear sections

**Parameters:**
- Single object parameter preferred for functions with 2+ arguments: `{ agentName, input, origin }`
- Type-safe via TypeScript interfaces or Zod schemas
- Optional parameters use `?` nullability or defaults: `slideCount?: number`, `model?: ModelChoice`
- Default values provided in function body: `category: task.category ?? 'personal'`

**Return Values:**
- Explicit return types always specified in function signature
- Async functions return Promise<T>: `Promise<Task>`, `Promise<void>`, `Promise<AgentOutput>`
- Database functions return entity types or null: `Task | null`, `Task[]`
- Orchestration functions return structured objects: `{ response: string; actions: Array<{...}> }`
- Errors thrown explicitly rather than returning Result<T> types

## Module Design

**Exports:**
- Default export rare; named exports preferred
- Each module exports main functions plus supporting types
- Database modules (`packages/core/src/db/`) export CRUD operations and query functions
- AI modules (`packages/core/src/ai/`) export main entry points with clear names: `askClaude()`, `runMemoryAgent()`
- Agents register themselves via `registerAgent()` pattern

**Barrel Files:**
- `packages/core/src/index.ts` serves as single export point for entire core package
- `packages/core/src/agents/index.ts` exports all agent registration functions
- `packages/core/src/ai/formation/index.ts` exports formation-related agents
- Internal barrel files re-export from subdirectories for clean API surface

## Validation

**Approach:** Zod for runtime validation of external data

**Usage patterns:**
- Agent input validation via Zod schemas: `ArtisanInputSchema.parse(input)`
- API data validation before database operations
- Example schema:
  ```typescript
  const ArtisanInputSchema = z.object({
    topic: z.string().min(1),
    slideCount: z.number().min(1).max(50).optional(),
    details: z.string().optional(),
  });
  ```
- Type inference from schema: `type ArtisanInput = z.infer<typeof ArtisanInputSchema>`
- JSON response parsing with fallback: `JSON.parse()` with catch block returning degraded result

## Database Access Pattern

**Centralization:** All database queries through `packages/core/src/db/` modules

**File locations:**
- `packages/core/src/db/client.ts` — Supabase client initialization
- `packages/core/src/db/tasks.ts` — Task CRUD operations
- `packages/core/src/db/clients.ts` — Client/lead operations
- `packages/core/src/db/memory.ts` — Memory tier operations
- `packages/core/src/db/formation/` — Formation-specific queries
- `packages/core/src/db/formation/knowledge.ts` — Knowledge base operations

**Pattern:**
```typescript
export async function createTask(task: Partial<NewTask> & { title: string }): Promise<Task> {
  const db = getSupabase();
  const { data, error } = await db.from(TABLE).insert({...}).select().single();
  if (error) {
    logger.error({ error }, 'Failed to create task');
    throw error;
  }
  return data as Task;
}
```

## API Call Pattern

**Centralization:** All Claude API calls through `packages/core/src/ai/client.ts`

**File location:** `packages/core/src/ai/client.ts`

**Pattern:**
```typescript
export async function askClaude(params: {
  prompt: string;
  systemPrompt?: string;
  model?: ModelChoice;
  maxTokens?: number;
}): Promise<string>
```

**Usage:**
- Model selection via enum: `'sonnet' | 'opus'` mapped to full model names
- System prompts passed separately for cleaner separation
- Token usage logged for monitoring
- Singleton client pattern (initialized once, reused)

---

*Convention analysis: 2026-03-24*
