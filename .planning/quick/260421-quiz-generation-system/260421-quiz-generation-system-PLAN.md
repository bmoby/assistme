# Quick Task: Quiz generation system

## task

Mettre en place un systeme repo pour generer, ranger et valider regulierement des QCM pedagogiques par session ou par groupe de sessions.

## scope

- Creer un dossier dedie aux quiz generes.
- Definir des regles de generation QCM.
- Ajouter une commande de generation basee sur les fichiers de session.
- Ajouter une commande de validation locale avant upload Discord.
- Mettre a jour la memoire repo pour eviter les futurs rangements ad hoc.

## files

- `learning-knowledge/quizzes/`
- `scripts/generate-quiz.ts`
- `scripts/check-quiz.ts`
- `scripts/quiz-utils.ts`
- `package.json`
- `CODEX.md`
- `.planning/STATE.md`

## verification

- Valider le quiz existant apres deplacement.
- Verifier que le validateur echoue sur les erreurs de format principales.
- Lancer les tests unitaires du repo avant commit.
