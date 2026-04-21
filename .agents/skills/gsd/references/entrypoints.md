# GSD entrypoints

All paths below are repo-relative.

## Shared context

Before any route:

1. Read `.planning/STATE.md`.
2. Read `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, and `.planning/ROADMAP.md` only when scope, milestones, or phase context are unclear.
3. Read `CODEX.md` for formation-specific memory when the task touches content, bots, quizzes, or operational rules.
4. Read `CLAUDE.md` when you need repo conventions or managed-section rules.

## quick

Use for small fixes, doc updates, and ad-hoc tasks that still need GSD traceability.

Default flow:

1. Create or reuse a note under `.planning/quick/<yyyymmdd>-<slug>/` when the task deserves persisted context.
2. Capture a short problem statement, scope, likely files, and verification plan.
3. Execute the change directly.
4. Update `.planning/STATE.md` if the task should be recorded in the repo state.
5. Run the smallest relevant verification and record the result in the quick task note if you created one.

Optional modes to honor only when the user asks for them:

- `discuss`: capture assumptions and open questions before editing
- `research`: do focused repo research before planning
- `full`: add explicit plan review and post-change verification

Suggested quick note fields:

- task
- scope
- files
- verification
- outcome

Use this route when the user references old Claude syntax such as `/gsd:quick`.

## debug

Use for investigations, regressions, broken tests, production bugs, or any task where the root cause is not yet known.

Default flow:

1. Check for active sessions under `.planning/debug/` if that directory exists.
2. If starting fresh, gather `expected`, `actual`, `errors`, `reproduction`, and `timeline`.
3. Create `.planning/debug/<slug>.md` when the investigation needs persisted state.
4. Track hypotheses, evidence, attempted checks, and next actions in that file.
5. Eliminate hypotheses with evidence before changing code.
6. Only implement a fix once the root cause is supported.
7. Record verification and mark the session `resolved` or `paused`.

Suggested debug session fields:

- status
- summary
- expected
- actual
- errors
- reproduction
- timeline
- hypotheses
- evidence
- next_action
- resolution

If a human checkpoint is needed, ask one short direct question.

Use this route when the user references old Claude syntax such as `/gsd:debug`.

## execute-phase

Use when the task maps to an existing planned phase under `.planning/phases/` or when the user refers to a phase, wave, or gap-closure pass.

Default flow:

1. Identify the target phase folder and the relevant plans.
2. Respect explicit filters such as `wave N`, `gaps-only`, or `interactive` only when the user mentions them.
3. Execute against the planned tasks instead of inventing ad-hoc work.
4. Reflect progress in the phase docs and `.planning/STATE.md`.
5. Run verification and completion steps only after the targeted phase work is done.

Flags to preserve when explicitly requested:

- `wave N`: run only the selected wave
- `gaps-only`: run only gap-closure work
- `interactive`: execute inline and pause for checkpoints

Use this route when the user references old Claude syntax such as `/gsd:execute-phase`.

## Optional legacy context

If legacy `.claude` GSD files exist locally, you may read them as supplemental context, but the Codex workflow must remain functional without them.
