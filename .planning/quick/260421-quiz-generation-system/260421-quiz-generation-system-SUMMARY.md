# Summary: Quiz generation system

## outcome

Added a repo-level workflow for generating, storing and validating pedagogical QCM quizzes.

The default quiz workflow is now:

- generate a 10-15 question QCM from one session or several source sessions;
- store the TXT under `learning-knowledge/quizzes/session-XX/`;
- validate locally before Discord upload;
- upload the validated TXT with `/quiz-create`.

## files changed

- Added `learning-knowledge/quizzes/README.md`
- Added `learning-knowledge/quizzes/QUIZ_RULES.md`
- Moved the existing Session 7 mixed quiz to `learning-knowledge/quizzes/session-07/mixed-01.txt`
- Added `scripts/generate-quiz.ts`
- Added `scripts/check-quiz.ts`
- Added `scripts/quiz-utils.ts`
- Added `quiz:generate` and `quiz:check` package scripts
- Updated `CODEX.md` quiz memory and old Session 7 quick notes

## verification

- `pnpm quiz:check` passes on the stored mixed Session 7 quiz.
- `pnpm quiz:check learning-knowledge/quizzes/session-07/mixed-01.txt --qcm-only` fails as expected, proving strict QCM validation catches legacy mixed files.
- `pnpm quiz:generate -- --sessions 7 --count 12 --dry-run` resolves the target path and builds the generation prompt without calling the API.
- Targeted TypeScript check passes for `scripts/quiz-utils.ts`, `scripts/check-quiz.ts`, and `scripts/generate-quiz.ts`.

## notes

- The Discord bot flow is unchanged: `/quiz-create` still receives a TXT upload.
- The repository now controls generation quality and file organization before upload.
