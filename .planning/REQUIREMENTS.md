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

- [x] **ADM-01**: Re-soumission reutilise le thread de review existant au lieu d'en creer un nouveau
- [x] **ADM-02**: Bouton "Ouvrir review" est idempotent — double-clic ne cree pas de thread doublon
- [x] **ADM-03**: Message AI dans le thread se met a jour en place quand la review AI est terminee

### Tests

- [ ] **TST-01**: Tests unitaires et d'integration couvrant tous les nouveaux comportements

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
| TST-01 | Phase 7 | Pending |
