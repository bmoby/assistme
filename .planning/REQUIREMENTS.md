# Requirements: Simplification Flow Exercices

**Defined:** 2026-03-31
**Core Value:** Le formateur peut gerer les soumissions d'exercices sans goulot d'etranglement -- archiver par session, corriger quand il veut, sans bruit IA inutile.

## v1 Requirements

Requirements pour cette iteration. Chaque requirement mappe a une phase du roadmap.

### Suppression Auto-Review IA

- [ ] **CLEAN-01**: Supprimer le fire-and-forget de l'AI review apres soumission dans dm-handler
- [ ] **CLEAN-02**: Supprimer le placeholder/message IA dans les threads de review
- [ ] **CLEAN-03**: Supprimer le score IA et la recommandation des notifications admin
- [ ] **CLEAN-04**: Simplifier le DM etudiant apres soumission (accuse de reception sans score IA)
- [ ] **CLEAN-05**: Le statut passe directement de `submitted` a en attente de review admin (plus de `ai_reviewed`)
- [ ] **CLEAN-06**: Nettoyer les imports et references a exercise-reviewer dans le codebase

### Archivage par Session

- [ ] **ARCH-01**: Ajouter le statut `archived` aux exercices en DB (migration SQL)
- [ ] **ARCH-02**: Commande admin Discord `/archive-session` pour archiver tous les exercices d'une session
- [ ] **ARCH-03**: Les exercices archives ne declenchent plus de notifications ni de digests admin
- [ ] **ARCH-04**: Les exercices archives restent consultables en DB (pas de suppression)

## v2 Requirements

### Ameliorations futures

- **IMPROV-01**: Archivage bulk (toutes les sessions d'un coup)
- **IMPROV-02**: Statistiques de soumission par session/module (combien ont soumis, combien manquent)
- **IMPROV-03**: Archivage automatique apres X jours sans review

## Out of Scope

| Feature | Reason |
|---------|--------|
| Modification du bot quiz | Projet separe, pas touche ici |
| Correction automatique IA | Supprimee volontairement -- non fiable pour non-codeurs |
| Gamification des soumissions | Pas demande par le formateur |
| Modification du flow review admin | Thread, boutons, feedback restent identiques |
| Archivage automatique | Reste manuel pour cette version |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLEAN-01 | Phase 1 | Pending |
| CLEAN-02 | Phase 1 | Pending |
| CLEAN-03 | Phase 1 | Pending |
| CLEAN-04 | Phase 1 | Pending |
| CLEAN-05 | Phase 1 | Pending |
| CLEAN-06 | Phase 3 | Pending |
| ARCH-01 | Phase 2 | Pending |
| ARCH-02 | Phase 2 | Pending |
| ARCH-03 | Phase 2 | Pending |
| ARCH-04 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after roadmap creation*
