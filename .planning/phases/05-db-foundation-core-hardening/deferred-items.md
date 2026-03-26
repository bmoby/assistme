# Deferred Items - Phase 05

## Pre-existing typecheck failures (not caused by plan 05-01)

1. **dm-agent.test.ts** - MOCK_SESSIONS missing `replay_url` property (lines 150, 212)
2. **dm-agent.test.ts** - searchFormationKnowledge mock missing `tags`, `source_file`, `similarity`, `text_rank` (line 228)
3. **faq-agent.test.ts** - FaqEntry mocks missing `times_used`, `created_by` (lines 73, 89, 121, 135)
4. **faq-agent.test.ts** - `keywords` property does not exist on `KnowledgeSearchResult` (line 171)
5. **tsarag-agent.test.ts** - Student mock missing `created_at`, `updated_at` (lines 136, 150, 236)
6. **dm-agent.integration.test.ts** - rootDir issue with `test/integration-helpers.ts` import
7. **students.integration.test.ts** - Object possibly undefined (line 65)

All verified as pre-existing on the base branch (same errors before and after changes).
