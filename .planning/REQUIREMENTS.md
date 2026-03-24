# Requirements: Dev Environment & Automated Tests - Bot Discord

**Defined:** 2026-03-24
**Core Value:** Pouvoir modifier le bot Discord et savoir immediatement si ca marche ou si ca casse quelque chose -- sans deployer en prod.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Test Foundation

- [x] **FOUND-01**: Vitest configure pour le monorepo ESM avec `projects:` API et `pool: 'forks'`
- [x] **FOUND-02**: `@assistme/core` resolu via `resolve.alias` vers les sources (pas `dist/`)
- [x] **FOUND-03**: Variables d'environnement factices dans la config test pour eviter les crashes a l'import
- [x] **FOUND-04**: Scripts `pnpm test`, `pnpm test:unit`, `pnpm test:integration` fonctionnels
- [x] **FOUND-05**: Watch mode (`pnpm test:watch`) avec filtrage par fichier

### Mock Infrastructure

- [x] **MOCK-01**: Factories Discord.js (Message, Guild, GuildMember, Interaction) via plain objects + `vi.fn()`
- [x] **MOCK-02**: Fixtures Claude API avec sequences tool-use multi-turn (DM Agent, Tsarag, FAQ)
- [ ] **MOCK-03**: MSW v2 handlers pour intercepter Supabase REST et Claude API HTTP (deferred from Phase 2 to Phase 3 per D-04: vi.mock() only in Phase 2)
- [x] **MOCK-04**: Fixtures domaine partagees (students, sessions, exercises, formation knowledge)

### Unit Tests

- [x] **UNIT-01**: Handler isolation refactor -- extraire la logique pure des handlers couples au Client Discord
- [ ] **UNIT-02**: Tests unitaires dm-handler (routing DM, parsing messages, delegation au DM Agent)
- [ ] **UNIT-03**: Tests unitaires admin-handler (messages #admin, delegation Tsarag Agent)
- [ ] **UNIT-04**: Tests unitaires FAQ handler (detection patterns, reponses)
- [ ] **UNIT-05**: Tests unitaires review-buttons (interactions boutons, exercise review flow)
- [ ] **UNIT-06**: Tests unitaires slash commands (/session, /session-update, admin commands)
- [ ] **UNIT-07**: Tests logique agents (tool routing, response parsing, error handling)

### Integration Tests

- [ ] **INTG-01**: Supabase local Docker setup (`supabase start` / `supabase db reset` dans le test lifecycle)
- [ ] **INTG-02**: Tests DB layer (queries, RPC functions type `search_formation_knowledge`)
- [ ] **INTG-03**: Tests pgvector (hybrid search vector cosine + BM25)
- [ ] **INTG-04**: Tests agent + DB integration (vraies queries Supabase, Claude API mocke)
- [ ] **INTG-05**: Test isolation par prefixage de donnees + cleanup `afterAll`

### E2E Tests

- [ ] **E2E-01**: Bot Discord de dev cree (token separe, application Discord dediee)
- [ ] **E2E-02**: Serveur Discord de test cree avec channels miroir de la prod
- [ ] **E2E-03**: Scenario E2E: flux DM etudiant complet (message -> DM Agent -> reponse)
- [ ] **E2E-04**: Scenario E2E: soumission exercice (upload -> review -> feedback)
- [ ] **E2E-05**: Scenario E2E: FAQ (question -> detection pattern -> reponse)

### CI Pipeline

- [ ] **CI-01**: GitHub Actions: tests unitaires sur chaque push (rapide, pas de Docker)
- [ ] **CI-02**: GitHub Actions: tests integration sur PR (job separe avec Docker/Supabase)
- [ ] **CI-03**: E2E en trigger manuel uniquement (workflow_dispatch)
- [ ] **CI-04**: Coverage thresholds sur handlers et agents

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Extended Coverage

- **V2-01**: Tests pour les bots Telegram (admin + public)
- **V2-02**: Tests de performance/load sur les agents IA
- **V2-03**: Snapshot-based response recording pour Claude API
- **V2-04**: Fixture builder pattern composable et type

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Tests bots Telegram | Scope limite au bot Discord pour ce milestone |
| Tests UI / visual regression | Backend only, pas de frontend |
| Load testing | Pas la priorite -- stabilite d'abord |
| Migration framework de test | Aucun test n'existe, on part de zero |
| `@shoginn/discordjs-mock` / libs tierces | Non maintenues, incompatibles discord.js v14 + Vitest |
| Mock du Client Discord entier | Anti-pattern confirme par les maintainers discord.js |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| MOCK-01 | Phase 2 | Complete |
| MOCK-02 | Phase 2 | Complete |
| MOCK-03 | Phase 3 | Pending (deferred from Phase 2 per D-04) |
| MOCK-04 | Phase 2 | Complete |
| UNIT-01 | Phase 2 | Complete |
| UNIT-02 | Phase 2 | Pending |
| UNIT-03 | Phase 2 | Pending |
| UNIT-04 | Phase 2 | Pending |
| UNIT-05 | Phase 2 | Pending |
| UNIT-06 | Phase 2 | Pending |
| UNIT-07 | Phase 2 | Pending |
| INTG-01 | Phase 3 | Pending |
| INTG-02 | Phase 3 | Pending |
| INTG-03 | Phase 3 | Pending |
| INTG-04 | Phase 3 | Pending |
| INTG-05 | Phase 3 | Pending |
| CI-01 | Phase 3 | Pending |
| CI-02 | Phase 3 | Pending |
| CI-03 | Phase 3 | Pending |
| CI-04 | Phase 3 | Pending |
| E2E-01 | Phase 4 | Pending |
| E2E-02 | Phase 4 | Pending |
| E2E-03 | Phase 4 | Pending |
| E2E-04 | Phase 4 | Pending |
| E2E-05 | Phase 4 | Pending |
