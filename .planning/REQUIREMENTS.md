# Requirements: Bot Discord Quiz

**Defined:** 2026-03-27
**Core Value:** Identifier les étudiants qui décrochent via des quiz automatisés — sans correction manuelle.

## v1 Requirements

### Admin — Création de quiz (ADMIN)

- [ ] **ADMIN-01**: Admin peut créer un quiz via slash command `/quiz-create {session_number}` avec un fichier TXT en pièce jointe
- [ ] **ADMIN-02**: Le bot parse le TXT libre via IA et extrait les questions structurées (QCM, Vrai/Faux, Ouverte)
- [ ] **ADMIN-03**: Le bot affiche un preview structuré du quiz parsé dans le channel admin avec boutons Confirmer/Annuler
- [ ] **ADMIN-04**: Après confirmation, le bot envoie immédiatement le quiz en DM à tous les étudiants actifs
- [ ] **ADMIN-05**: Admin peut voir le statut d'un quiz via `/quiz-status [session_number]` (qui a répondu, scores, en cours)
- [ ] **ADMIN-06**: Admin peut fermer manuellement un quiz via `/quiz-close {session_number}`

### Étudiant — Prise de quiz (QUIZ)

- [ ] **QUIZ-01**: L'étudiant reçoit un DM avec titre du quiz, session, et bouton "Начать" (Commencer)
- [ ] **QUIZ-02**: Les questions sont présentées une par une dans l'ordre du TXT
- [ ] **QUIZ-03**: Questions QCM : l'étudiant répond via boutons Discord (A, B, C, D)
- [ ] **QUIZ-04**: Questions Vrai/Faux : l'étudiant répond via boutons "Правда" / "Ложь"
- [ ] **QUIZ-05**: Questions ouvertes : l'étudiant tape sa réponse en texte dans le DM
- [ ] **QUIZ-06**: L'étudiant peut quitter et reprendre plus tard — état sauvegardé en BDD
- [ ] **QUIZ-07**: 1 seul quiz actif par étudiant — un nouveau quiz ferme automatiquement l'ancien avec score partiel (statut expired_incomplete)
- [ ] **QUIZ-08**: Pas de re-tentative — one-shot uniquement

### Évaluation et Feedback (EVAL)

- [ ] **EVAL-01**: QCM et Vrai/Faux évalués par exact match avec la réponse correcte du TXT
- [ ] **EVAL-02**: Questions ouvertes évaluées par IA — comparaison souple avec la réponse attendue du TXT
- [ ] **EVAL-03**: À la fin du quiz, feedback question par question : correct/incorrect + explication tirée du TXT
- [ ] **EVAL-04**: Score total affiché en pourcentage
- [ ] **EVAL-05**: Message de clôture : "Tes réponses ont été enregistrées"
- [ ] **EVAL-06**: Tout le feedback et les messages côté étudiant sont en russe

### Notifications Admin (NOTIF)

- [ ] **NOTIF-01**: Alerte dans le channel admin si un étudiant score < 60%
- [ ] **NOTIF-02**: Digest régulier : qui a complété, qui n'a pas commencé, qui est en cours, scores
- [ ] **NOTIF-03**: Signal de décrochage : quiz fermé automatiquement (expired_incomplete) remonté dans le digest

### Données et Infrastructure (DATA)

- [ ] **DATA-01**: Table `quizzes` : id, session_number, status (draft/active/closed), questions_data (JSONB), created_at, closed_at
- [ ] **DATA-02**: Table `quiz_questions` : id, quiz_id, question_number, type (mcq/true_false/open), question_text, choices (JSONB), correct_answer, explanation
- [ ] **DATA-03**: Table `student_quiz_sessions` : id, student_id, quiz_id, status (not_started/in_progress/completed/expired_incomplete), current_question, score, started_at, completed_at
- [ ] **DATA-04**: Table `student_quiz_answers` : id, session_id, question_id, student_answer, is_correct, ai_evaluation (JSONB pour ouvertes), answered_at
- [ ] **DATA-05**: Cron job pour fermer automatiquement les quiz expirés
- [ ] **DATA-06**: Le fichier TXT original est stocké (Supabase Storage ou en BDD) comme référence
- [ ] **DATA-07**: Modèle de données extensible — timestamps, statuts, scores structurés pour analytics futures

### Bot Séparé (BOT)

- [ ] **BOT-01**: Nouveau package `packages/bot-discord-quiz` dans le monorepo pnpm
- [ ] **BOT-02**: Nouveau token Discord, nouveau bot application, même guild
- [ ] **BOT-03**: Imports uniquement depuis `@assistme/core` — zéro import depuis `packages/bot-discord`
- [ ] **BOT-04**: Entry point indépendant, process séparé, `pnpm -F @assistme/bot-discord-quiz dev`
- [ ] **BOT-05**: Tests unitaires avec Vitest

## v2 Requirements

### Analytics avancées

- **ANALYTICS-01**: Dashboard de progression par étudiant sur l'ensemble des quiz
- **ANALYTICS-02**: Identification des thèmes/concepts mal compris (agrégation par question)
- **ANALYTICS-03**: Comparaison inter-sessions (évolution des scores)

### Améliorations quiz

- **ENHANCE-01**: Questions avec images/médias
- **ENHANCE-02**: Pondération différente par question (certaines valent plus)
- **ENHANCE-03**: Quiz programmés (envoi différé)
- **ENHANCE-04**: Quiz ciblés par pod ou étudiant individuel

## Out of Scope

| Feature | Reason |
|---------|--------|
| Modification du bot Discord principal | Isolation totale — zéro régression |
| Re-tentative de quiz | One-shot, évalue la compréhension réelle |
| Timer par question | Pas un examen, c'est du feedback |
| Quiz dans un channel public | DM uniquement, évaluation individuelle |
| Génération auto de questions par IA | Le TXT est la source de vérité, pas l'IA |
| Correction manuelle par l'admin | Tout est automatisé |
| Intégration Tsarag agent | Slash commands dédiées, pas de langage naturel |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ADMIN-01 | — | Pending |
| ADMIN-02 | — | Pending |
| ADMIN-03 | — | Pending |
| ADMIN-04 | — | Pending |
| ADMIN-05 | — | Pending |
| ADMIN-06 | — | Pending |
| QUIZ-01 | — | Pending |
| QUIZ-02 | — | Pending |
| QUIZ-03 | — | Pending |
| QUIZ-04 | — | Pending |
| QUIZ-05 | — | Pending |
| QUIZ-06 | — | Pending |
| QUIZ-07 | — | Pending |
| QUIZ-08 | — | Pending |
| EVAL-01 | — | Pending |
| EVAL-02 | — | Pending |
| EVAL-03 | — | Pending |
| EVAL-04 | — | Pending |
| EVAL-05 | — | Pending |
| EVAL-06 | — | Pending |
| NOTIF-01 | — | Pending |
| NOTIF-02 | — | Pending |
| NOTIF-03 | — | Pending |
| DATA-01 | — | Pending |
| DATA-02 | — | Pending |
| DATA-03 | — | Pending |
| DATA-04 | — | Pending |
| DATA-05 | — | Pending |
| DATA-06 | — | Pending |
| DATA-07 | — | Pending |
| BOT-01 | — | Pending |
| BOT-02 | — | Pending |
| BOT-03 | — | Pending |
| BOT-04 | — | Pending |
| BOT-05 | — | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 0
- Unmapped: 35

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 after initial definition*
