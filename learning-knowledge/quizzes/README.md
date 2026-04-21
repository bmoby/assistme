# Quiz Repository

This directory stores Discord-ready quiz TXT files before they are uploaded with `/quiz-create`.

## Layout

```text
learning-knowledge/quizzes/
  QUIZ_RULES.md
  session-07/
    mixed-01.txt
    qcm-01.txt
  session-08/
    revision-s05-s06-s07-qcm-01.txt
```

## Naming

- `session-XX/qcm-NN.txt` for a standard QCM focused on one session.
- `session-XX/revision-s05-s06-qcm-NN.txt` for a QCM delivered in session XX but covering several earlier sessions.
- `mixed-NN.txt` is reserved for legacy or special quizzes that use QCM, VF and OPEN together.

`SESSION:` inside the TXT is the Discord delivery session. For a revision quiz, this can differ from the source sessions.

## Commands

Generate a standard 12-question QCM for one session:

```bash
pnpm quiz:generate -- --sessions 7 --count 12
```

Generate a mixed-source revision QCM to deliver in session 8:

```bash
pnpm quiz:generate -- --sessions 5,6,7 --delivery-session 8 --count 15
```

Check one file:

```bash
pnpm quiz:check learning-knowledge/quizzes/session-07/qcm-01.txt
```

Check all stored quiz files:

```bash
pnpm quiz:check
```

Inspect the generation prompt without calling the API:

```bash
pnpm quiz:generate -- --sessions 7 --count 12 --dry-run
```

Add a focus when needed:

```bash
pnpm quiz:generate -- --sessions 7 --count 12 --focus "commit vs push"
```

## Discord Upload

After local validation, upload the TXT with:

```text
/quiz-create session:<SESSION> fichier:<TXT>
```

Do not upload several active quizzes for the same session unless you intentionally want the latest one to become the one used by `/quiz-status` and `/quiz-close`.
