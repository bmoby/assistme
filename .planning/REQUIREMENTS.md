# Requirements: Exercise Submission Flow - Bot Discord

**Defined:** 2026-03-25
**Core Value:** Un etudiant soumet un exercice proprement (multi-format, apercu, confirmation), le formateur le review facilement, et personne ne se perd dans des doublons ou des soumissions vides.

## v1.0 Requirements (Complete)

All v1.0 requirements (test infrastructure) were completed in milestone v1.0.
See `.planning/phases/` for phase summaries.

## v2.0 Requirements

Requirements for exercise submission flow milestone. Each maps to roadmap phases.

### Submission Correctness

- [x] **SUB-01**: DB unique constraint `(student_id, session_id)` empeche les doublons de soumission
- [x] **SUB-02**: Soumission vide refusee (pas de fichier, lien, ou texte substantiel)
- [x] **SUB-03**: `session_id` assigne atomiquement dans l'INSERT (pas en UPDATE separe)
- [x] **SUB-04**: `pendingAttachments` nettoye sur erreur agent (pas de fuite d'etat entre messages)

### Student UX

- [x] **UX-01**: Bot affiche un recapitulatif (texte, fichiers, liens) avec bouton "Soumettre" / "Annuler" avant soumission
- [x] **UX-02**: Etudiant precise le numero de session — bot valide l'existence en DB, refuse si inexistant
- [x] **UX-03**: Re-soumission autorisee apres feedback — remplace l'ancienne soumission, meme processus
- [x] **UX-04**: Etudiant peut annuler une soumission en cours ("annuler", bouton Cancel)

### Admin Review UX

- [ ] **ADM-01**: Re-soumission reutilise le thread de review existant au lieu d'en creer un nouveau
- [ ] **ADM-02**: Bouton "Ouvrir review" est idempotent — double-clic ne cree pas de thread doublon
- [ ] **ADM-03**: Message AI dans le thread se met a jour en place quand la review AI est terminee

### Tests

- [ ] **TST-01**: Tests unitaires et d'integration couvrant tous les nouveaux comportements

## v3.0 Requirements (Quiz System — Phase 8+)

### Data Foundation

- [x] **DATA-01**: Table `quizzes` avec session_number, status (draft/active/closed), questions_data JSONB
- [x] **DATA-02**: Table `quiz_questions` avec quiz_id FK, question_number, type (mcq/true_false/open), choices JSONB
- [x] **DATA-03**: Table `student_quiz_sessions` avec student_id FK, quiz_id FK, status (not_started/in_progress/completed/expired_incomplete), score
- [x] **DATA-04**: Table `student_quiz_answers` avec session_id FK, question_id FK, student_answer, is_correct, ai_evaluation JSONB
- [x] **DATA-05**: Cron ferme automatiquement les quiz actifs plus vieux que 48h (closeExpiredQuizSessions)
- [x] **DATA-06**: `original_txt TEXT` column stocke le contenu TXT original du quiz (baseline; Storage deferred)
- [x] **DATA-07**: Schema extensible — timestamps, statuts enum, scores DECIMAL, JSONB pour donnees structurees

### Bot Infrastructure

- [ ] **BOT-01**: Nouveau package `packages/bot-discord-quiz` dans le monorepo pnpm
- [ ] **BOT-02**: Nouveau token Discord (TeacherBot), meme guild, vars DISCORD_QUIZ_BOT_TOKEN + DISCORD_QUIZ_CLIENT_ID
- [ ] **BOT-03**: Imports uniquement depuis @assistme/core — zero import depuis packages/bot-discord
- [ ] **BOT-04**: Entry point independant, process separe, `pnpm -F @assistme/bot-discord-quiz dev`
- [ ] **BOT-05**: Tests unitaires avec Vitest pour le nouveau package

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

- **FUT-01**: Tests pour les bots Telegram (admin + public)
- **FUT-02**: Tests de performance/load sur les agents IA
- **FUT-03**: Confirmation par modal Discord (quand Discord supportera l'upload fichier dans modals)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Refonte complete du DM Agent | On ameliore le flow existant, pas de rewrite |
| Modal Discord pour soumission | Modals limitees a 5 champs texte, pas de fichier upload |
| Soumission automatique sans confirmation | Risque de soumissions accidentelles |
| Multi-session dans une soumission | 1 soumission = 1 session, scope clair |
| Tests bots Telegram | Scope limite au bot Discord |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SUB-01 | Phase 5 | Complete |
| SUB-02 | Phase 6 | Complete |
| SUB-03 | Phase 5 | Complete |
| SUB-04 | Phase 6 | Complete |
| UX-01 | Phase 6 | Complete |
| UX-02 | Phase 6 | Complete |
| UX-03 | Phase 6 | Complete |
| UX-04 | Phase 6 | Complete |
| ADM-01 | Phase 7 | Complete |
| ADM-02 | Phase 7 | Complete |
| ADM-03 | Phase 7 | Complete |
| TST-01 | Phase 7 | Complete |
| DATA-01 | Phase 8 | Complete |
| DATA-02 | Phase 8 | Complete |
| DATA-03 | Phase 8 | Complete |
| DATA-04 | Phase 8 | Complete |
| DATA-05 | Phase 8 | Complete |
| DATA-06 | Phase 8 | Complete |
| DATA-07 | Phase 8 | Complete |
| BOT-01 | Phase 8 | Pending |
| BOT-02 | Phase 8 | Pending |
| BOT-03 | Phase 8 | Pending |
| BOT-04 | Phase 8 | Pending |
| BOT-05 | Phase 8 | Pending |
