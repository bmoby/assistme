---
name: gsd
description: Use in this repository when the user explicitly asks for GSD or when a non-trivial repo task should follow the tracked Get Shit Done workflow in `.planning` instead of ad-hoc edits. This skill adapts the repository's existing Claude-oriented `/gsd:*` docs for Codex CLI and the Codex IDE extension. Do not use for simple read-only questions or when the user explicitly says to bypass GSD.
---

# GSD

This skill is the Codex-facing GSD entrypoint for this repository. It uses `.planning` as the shared state layer and keeps the route-specific instructions in `references/entrypoints.md`.

If legacy `.claude` GSD assets are present in the working tree, treat them as optional extra context. Do not depend on them.

## First pass

1. Decide whether the task is `quick`, `debug`, or `execute-phase`.
2. Read only the matching section in `references/entrypoints.md`.
3. Then load the repo files named there.
4. Keep `.planning` artifacts in sync. Do not bypass them unless the user explicitly asks.

## Route selection

- `quick`
  Use for small fixes, doc updates, and ad-hoc tasks that still need GSD guarantees.
- `debug`
  Use for investigations, regressions, broken tests, production bugs, or unclear root causes.
- `execute-phase`
  Use when the task maps to an existing planned phase in `.planning/phases/` or when the user refers to a phase or wave.

If the task does not clearly fit one of these entrypoints, start with `quick`.

## Codex translation rules

The repo's GSD docs were authored for Claude. Translate them as follows when running inside Codex:

- `Read`, `Glob`, and `Grep` mean normal repository inspection. Prefer `rg`, `sed`, `find`, `ls`, and focused file reads.
- `Bash` means shell commands in the current Codex environment.
- `Write` and `Edit` mean normal Codex file edits.
- `Task` or subagent instructions are optional. Use delegation only if the current Codex environment allows it and the user explicitly asked for subagents. Otherwise execute inline while preserving the same checkpoints and outputs.
- `AskUserQuestion` means ask a short direct question only when a material ambiguity blocks safe progress. If a safe default exists, take it and state the assumption.
- `TodoWrite` means local task tracking if available; it is not a reason to stop the workflow.

## Repo-specific rules

- If the task touches formation content or bot behavior, read `CODEX.md` for repo memory and source-of-truth order.
- Keep changes aligned with `CLAUDE.md` conventions unless the user explicitly asks to change the workflow itself.
- Treat `references/entrypoints.md` as the default GSD playbook for Codex in this repo.
- If legacy `.claude` helpers exist, you may use them opportunistically, but the workflow must still work without them.
- Do not edit managed sections in `CLAUDE.md` unless the user explicitly asks.

## Invocation hints

In Codex CLI or the Codex IDE extension, the user can invoke this skill explicitly with `$gsd`.
If the user mentions old Claude commands such as `/gsd:quick`, `/gsd:debug`, or `/gsd:execute-phase`, interpret that as a request to use this skill and the matching entrypoint.
