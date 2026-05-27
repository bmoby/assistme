# Repo Instructions

This repository has a repo-scoped Codex skill at `.agents/skills/gsd`.

Use `$gsd` for repository-changing work that should follow the existing Get Shit Done workflow in `.planning`, especially:

- small tracked fixes or doc updates
- debugging and investigation
- planned phase or wave execution

If the user explicitly says to bypass GSD, follow the user's instruction.

For formation content, bots, quizzes, or repo memory, read `CODEX.md`.
For repo conventions, read `CLAUDE.md`.
The `gsd` skill bundles the current Codex-facing entrypoints under `.agents/skills/gsd/references/`.
If legacy `.claude` GSD assets exist locally, treat them as optional supplemental context.
