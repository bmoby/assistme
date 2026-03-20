# Regle : Formation Knowledge Base

## Principe
Le contenu pedagogique (`recherche/`) est synchronise vers la table `formation_knowledge` via un script de seed. Les fichiers markdown restent la source de verite.

## Apres modification de fichiers formation
Si tu modifies un fichier dans :
- `recherche/GUIDE-FORMATEUR.md` (guide formateur)
- `recherche/CURRICULUM.md` (curriculum complet)
- `recherche/module-*/` (plans de session, exercices, syntheses)
- `recherche/recherches/` (rapports de recherche)

**Rappelle a l'utilisateur** de re-synchroniser la base de connaissances :
```
pnpm seed:knowledge
```

## Table `formation_knowledge`
- Stocke des chunks de contenu avec embeddings (vector 384d, MiniLM-L6-v2)
- Recherche hybride : vector cosine + BM25 (tsvector) via RPC `search_formation_knowledge()`
- Utilisee par : DM Agent (outil `search_course_content`), FAQ Agent, Exercise Reviewer

## Fichiers cles
- `supabase/migrations/010_formation_knowledge.sql` — schema + RPC
- `packages/core/src/db/formation/knowledge.ts` — module DB
- `scripts/seed-formation-knowledge.ts` — script d'ingestion
- `packages/core/src/ai/formation/dm-agent.ts` — outil `search_course_content`
