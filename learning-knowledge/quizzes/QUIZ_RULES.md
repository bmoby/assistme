# Quiz Generation Rules

## Default Format

- Student-facing language: Russian.
- Default quiz type: QCM only.
- Standard length: 10 to 15 questions, default 12.
- File format: strict TXT format from `learning-knowledge/quiz-format-template.txt`.
- Storage: `learning-knowledge/quizzes/session-XX/`.

## Source Discipline

- Read the target session file first.
- For multi-session revision, read only the requested source sessions.
- Do not introduce future concepts that students have not seen.
- Use `learning-knowledge/programme.md` only for curriculum position and naming.

## Pedagogical Quality

Each question must do at least one useful job:

- test whether the student understood a central idea;
- expose a common confusion;
- make the student apply the idea in a concrete situation;
- teach through the explanation after a wrong answer.

Prefer:

- concrete scenarios over abstract definitions;
- "what happens if..." questions;
- confusion checks such as Git vs GitHub, local vs remote, page vs component;
- explanations that restate the concept simply.

Avoid:

- trivia;
- trick questions;
- vocabulary tests without application;
- overly technical questions unless the technical detail is necessary for understanding;
- multiple correct answers hidden inside one QCM.

## QCM Rules

- Exactly four choices: A, B, C, D.
- Exactly one correct answer.
- Distractors must be plausible for a beginner.
- Do not make the correct answer obviously longer or more precise every time.
- Every question must include `EXPLANATION`.
- `ANSWER` must contain only `A`, `B`, `C` or `D`.

## Recommended Distribution For 12 Questions

- 3 recall questions that reactivate important ideas.
- 5 applied comprehension questions.
- 3 anti-confusion questions.
- 1 synthesis question that checks the full chain or mental model.

For 15 questions, add 2 applied comprehension questions and 1 anti-confusion question.

## Review Checklist

Before upload:

- `pnpm quiz:check <file>` passes.
- The quiz has 10 to 15 questions if it is named `qcm-*.txt`.
- Every question has a clear pedagogical purpose.
- Every wrong answer is plausible.
- The file can be uploaded directly with `/quiz-create`.
