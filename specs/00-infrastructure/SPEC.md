# 00 — Infrastructure Partagee

## Vue d'ensemble

Infrastructure commune a tous les composants du systeme. Definit la base de donnees, l'hebergement, les API partagees et les conventions.

---

## 1. Base de donnees (Supabase)

### 1.1 Instance
- **Instance existante** : Supabase avec PostgreSQL
- **Migrations** : `supabase/migrations/` (001_initial.sql, 002_memory_and_events.sql, 003_public_knowledge.sql, 004_students_system.sql, 005_sessions_system.sql, 006_memory_tiers.sql, 007_memory_embeddings.sql, 008_hybrid_search_decay.sql, 009_agent_jobs.sql, 010_formation_knowledge.sql)

### 1.2 Schema

#### Table `tasks` ✅
```sql
- id UUID PRIMARY KEY
- title TEXT NOT NULL
- description TEXT
- category TEXT ('client', 'student', 'content', 'personal', 'dev', 'team')
- priority TEXT ('urgent', 'important', 'normal', 'low')
- status TEXT ('todo', 'in_progress', 'waiting', 'done', 'cancelled')
- due_date TIMESTAMPTZ
- due_time TEXT
- estimated_minutes INTEGER
- completed_at TIMESTAMPTZ
- source TEXT ('telegram', 'discord', 'orchestrator', 'auto', 'manual')
- related_id UUID
- related_type TEXT ('client', 'student', 'team_member', 'content')
- notes TEXT
- created_at, updated_at TIMESTAMPTZ
```

#### Table `daily_plans` ✅
```sql
- id UUID PRIMARY KEY
- date DATE UNIQUE
- plan JSONB
- status TEXT ('generated', 'active', 'completed')
- review TEXT
- productivity_score INTEGER (1-10)
- created_at TIMESTAMPTZ
```

#### Table `memory` ✅ (migrations 002 + 006 + 007)
```sql
- id UUID PRIMARY KEY
- category TEXT ('identity', 'situation', 'preference', 'relationship', 'lesson')
- key TEXT NOT NULL
- content TEXT NOT NULL
- confidence DECIMAL DEFAULT 1.0
- source TEXT DEFAULT 'conversation'
- last_confirmed TIMESTAMPTZ
- expires_at TIMESTAMPTZ
- tier TEXT ('core', 'working', 'archival') DEFAULT 'working'  ← migration 006
- embedding VECTOR(384)                                         ← migration 007 (pgvector)
- created_at, updated_at TIMESTAMPTZ
- UNIQUE(category, key)
```

**Memory 3 Tiers (migration 006) :**
- Ajoute colonne `tier` avec mapping automatique par categorie :
  - `identity` → `core`
  - `situation`, `preference`, `relationship` → `working`
  - `lesson` → `archival`
- Working memories : `expires_at` a 30 jours, auto-renew possible via consolidation
- Core memories : jamais d'expiration

**Embeddings (migration 007) :**
- Active extension `pgvector`
- Ajoute colonne `embedding VECTOR(384)` (all-MiniLM-L6-v2)
- Index IVFFlat pour recherche rapide
- Fonction RPC `search_memory_semantic(query_embedding, match_threshold, match_count)` pour recherche par similarite cosinus

#### Table `public_knowledge` ✅
```sql
- id UUID PRIMARY KEY
- category TEXT ('formation', 'services', 'faq', 'free_courses', 'general')
- key TEXT NOT NULL
- content TEXT NOT NULL
- created_at, updated_at TIMESTAMPTZ
- UNIQUE(category, key)
```

#### Table `events` ✅ (creee, pas encore active)
```sql
- id UUID PRIMARY KEY
- type TEXT NOT NULL
- source TEXT NOT NULL
- target TEXT
- data JSONB
- status TEXT ('pending', 'processed', 'failed')
- created_at, processed_at TIMESTAMPTZ
```

#### Table `clients` ✅
```sql
- id UUID PRIMARY KEY
- name TEXT NOT NULL
- phone TEXT
- source TEXT ('telegram', 'referral', 'conversation')
- business_type TEXT
- need TEXT
- budget_range TEXT
- status TEXT ('lead', 'qualified', 'proposal_sent', 'accepted', 'in_progress', 'delivered', 'paid')
- qualification_data JSONB
- proposal_url TEXT
- assigned_to UUID REFERENCES team_members(id)
- project_deadline TIMESTAMPTZ
- amount DECIMAL
- commission_amount DECIMAL
- notes TEXT
- created_at, updated_at TIMESTAMPTZ
```

#### Table `students` ✅ (migration 004)
```sql
- id UUID PRIMARY KEY
- name TEXT NOT NULL, phone, email, telegram_id, discord_id TEXT UNIQUE
- session INTEGER DEFAULT 2
- status TEXT ('interested', 'registered', 'paid', 'active', 'completed', 'dropped')
- payment_status, payment_amount, payment_method, payment_details JSONB
- pod_id INTEGER (1-8), mentor_id UUID REFERENCES team_members(id)
- enrolled_at, completed_at, notes
- created_at, updated_at
```

#### Table `student_exercises` ✅ (migration 004 + 005)
```sql
- id UUID PRIMARY KEY
- student_id UUID REFERENCES students(id)
- module INTEGER, exercise_number INTEGER
- submission_url TEXT, submission_type TEXT
- submitted_at TIMESTAMPTZ
- ai_review JSONB, manual_review TEXT
- status TEXT ('submitted', 'ai_reviewed', 'reviewed', 'approved', 'revision_needed')
- session_id UUID REFERENCES sessions(id)    ← ajouté migration 005
- reviewed_at, feedback
- created_at
```

#### Table `sessions` ✅ (migration 005)
```sql
- id UUID PRIMARY KEY
- session_number INTEGER NOT NULL UNIQUE
- module INTEGER NOT NULL
- title TEXT NOT NULL, description TEXT
- pre_session_video_url TEXT, replay_url TEXT
- exercise_title TEXT, exercise_description TEXT
- expected_deliverables TEXT, exercise_tips TEXT
- deadline TIMESTAMPTZ
- discord_thread_id TEXT
- status TEXT ('draft', 'published', 'completed')
- created_at, updated_at
```

#### Table `submission_attachments` ✅ (migration 005)
```sql
- id UUID PRIMARY KEY
- exercise_id UUID REFERENCES student_exercises(id) ON DELETE CASCADE
- type TEXT ('url', 'file', 'text', 'image')
- url TEXT, storage_path TEXT, original_filename TEXT
- mime_type TEXT, file_size INTEGER, text_content TEXT
- created_at
```

#### Table `team_members` (Phase 3)
```sql
- id UUID PRIMARY KEY
- name, discord_id, telegram_id, phone
- skills JSONB
- availability TEXT ('available', 'busy', 'unavailable')
- current_project_id UUID, total_projects INTEGER
- notes, created_at, updated_at
```

#### Table `content_ideas` (Phase 4)
```sql
- id UUID PRIMARY KEY
- title, topic, angle, type, platform
- key_points JSONB
- status TEXT ('idea', 'researched', 'scripted', 'filmed', 'published')
- published_at, published_url, engagement JSONB
- created_at
```

#### Table `habits` (Phase 4)
```sql
- id UUID PRIMARY KEY
- date DATE, wake_up_time, sleep_time, work_start, work_end
- sport_done BOOLEAN, sport_duration INTEGER
- tasks_completed, tasks_total, mood INTEGER (1-5)
- notes, created_at
```

#### Table `reminders` (Phase 3)
```sql
- id UUID PRIMARY KEY
- message TEXT, trigger_at TIMESTAMPTZ
- repeat TEXT ('once', 'daily', 'weekly', 'custom')
- repeat_config JSONB
- channel TEXT ('telegram', 'discord')
- status TEXT ('active', 'sent', 'cancelled')
- task_id UUID REFERENCES tasks(id)
- created_at
```

#### Hybrid Search Memory (migration 008)

Ajoute la recherche hybride (BM25 + vector + temporal decay) a la table `memory` :
- Colonne `search_text TSVECTOR` (auto-peuplee par trigger sur insert/update de key/content)
- Index GIN `idx_memory_search_text`
- Fonction RPC `search_memory_hybrid(query_text, query_embedding, match_count, match_tier, similarity_threshold, decay_half_life_days, vector_weight, text_weight)` :
  - Score final = (vector_weight * cosine_similarity + text_weight * BM25_rank) * temporal_decay
  - Temporal decay : exponentiel base sur `last_confirmed`, demi-vie configurable (default 30 jours)
  - Filtre optionnel par tier

#### Table `agent_jobs` (migration 009)
```sql
- id UUID PRIMARY KEY
- agent_name TEXT NOT NULL
- input JSONB NOT NULL DEFAULT '{}'
- origin JSONB NOT NULL DEFAULT '{}'
- status TEXT ('pending', 'processing', 'completed', 'failed')
- result_text TEXT
- result_files JSONB DEFAULT '[]'
- chain_to JSONB
- error TEXT
- parent_job_id UUID REFERENCES agent_jobs(id)
- created_at, started_at, completed_at TIMESTAMPTZ
```

Systeme de jobs asynchrones pour les agents autonomes. Index sur `status = 'pending'` et `agent_name`. Bucket Storage `agent-outputs` associe.

#### Table `formation_knowledge` (migration 010)
```sql
- id UUID PRIMARY KEY
- session_number INTEGER, module INTEGER
- content_type TEXT ('lesson_plan', 'exercise', 'research', 'pedagogical_note', 'setup_guide')
- title TEXT NOT NULL, content TEXT NOT NULL
- tags TEXT[] DEFAULT '{}'
- source_file TEXT
- embedding VECTOR(384)
- search_text TSVECTOR (auto-genere)
- created_at, updated_at TIMESTAMPTZ
- UNIQUE(source_file, title)
```

Base de connaissances pedagogique. Recherche hybride via RPC `search_formation_knowledge(query_text, query_embedding, filters)`. Peuplee par `pnpm seed:knowledge` (idempotent). Consommee par DM Agent, FAQ Agent, Exercise Reviewer.

### 1.3 Supabase Storage
- **Bucket `course-videos`** : Videos des cours
- **Bucket `course-resources`** : PDFs, documents, supports
- **Bucket `exercise-submissions`** : Fichiers soumis par les etudiants
- **Bucket `client-proposals`** : Propositions clients

---

## 2. Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Runtime | Node.js 20+ |
| Langage | TypeScript strict, ESM modules |
| DB | Supabase (PostgreSQL + Storage + pgvector) |
| Cache | Redis (redis:7-alpine, ioredis) |
| Embeddings | Python FastAPI + all-MiniLM-L6-v2 (384 dim) |
| IA | Claude API (@anthropic-ai/sdk) |
| Transcription | OpenAI Whisper API |
| Bot Telegram | grammY |
| Bot Discord | discord.js |
| Cron | node-cron |
| Validation | Zod |
| Logging | pino |
| Monorepo | pnpm workspaces |
| Conteneurisation | Docker + Docker Compose |
| Dev | tsx |

### Structure du monorepo
```
assistme/
├── packages/
│   ├── core/                  # Logique partagee (DB, AI, Cache, Scheduler, Types)
│   │   └── src/cache/         # Redis cache (redis.ts)
│   ├── bot-telegram/          # Bot Admin Copilote (FR)
│   ├── bot-telegram-public/   # Bot Public (RU)
│   ├── bot-discord/           # Bot Formateur (Phase 3)
│   └── bot-instagram/         # Reserve (non developpe)
├── embedding-server/          # Serveur Python FastAPI (all-MiniLM-L6-v2)
│   ├── app.py                 # API endpoints /embed, /embed-batch
│   └── Dockerfile             # Image Python avec sentence-transformers
├── scripts/
│   └── backfill-embeddings.ts # Backfill embeddings pour memories existantes
├── supabase/
│   └── migrations/            # SQL migrations (001-007)
├── specs/                     # Specifications
├── docs/                      # Documentation
├── docker-compose.yml         # Orchestration services (redis, embedding-server, bots)
├── CLAUDE.md                  # Instructions Claude Code
└── .env                       # Variables d'environnement
```

### Hebergement
- **Option recommandee** : Railway (simple, auto-deploy depuis Git)
- **Alternative** : Fly.io ou VPS Hetzner (~5€/mois)

---

## 3. APIs externes

### Claude API (Anthropic) ✅
- Modeles : Sonnet (rapide, ~$0.003-0.01/requete), Opus (complexe), Haiku (ultra-leger)
- Variable : `ANTHROPIC_API_KEY`
- Budget : ~$15-20/mois

### OpenAI Whisper API ✅
- Transcription audio multi-langue (FR, RU)
- Variable : `OPENAI_API_KEY`

### Telegram Bot API ✅
- 2 bots : admin (FR) + public (RU)
- Variables : `TELEGRAM_BOT_TOKEN`, `PUBLIC_BOT_TOKEN`
- Gratuit

### Discord API (Phase 3)
- Bot Formateur
- Variable : `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`
- Gratuit

---

## 4. Variables d'environnement

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Claude API
ANTHROPIC_API_KEY=

# OpenAI (Whisper)
OPENAI_API_KEY=

# Telegram Admin Bot
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=

# Telegram Public Bot
PUBLIC_BOT_TOKEN=

# Discord (Phase 3)
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=

# URLs
PILOTE_NEURO_URL=
PORTAL_URL=
TELEGRAM_GROUP_URL=

# Redis (optionnel — fallback gracieux sans Redis)
REDIS_URL=

# Embedding Server (optionnel — fallback gracieux sans serveur)
EMBEDDING_SERVER_URL=

# Server
NODE_ENV=production
PORT=3000
```

---

## 5. Docker Infrastructure

### Services (`docker-compose.yml`)

| Service | Image / Build | Role | Limites |
|---------|--------------|------|---------|
| `redis` | redis:7-alpine | Cache memoire (tiers) | 256 MB max, eviction allkeys-lru |
| `embedding-server` | Build `./embedding-server` | Embeddings all-MiniLM-L6-v2 | 1 GB mem limit |
| `bot-telegram` | Build `./` | Bot Admin Copilote | depends_on: redis, embedding-server |
| `bot-telegram-public` | Build `./` | Bot Public | depends_on: redis, embedding-server |
| `bot-discord` | Build `./` | Bot Formateur | depends_on: redis, embedding-server |

### Embedding Server (Python FastAPI)
- Modele : `all-MiniLM-L6-v2` (sentence-transformers)
- Dimensions : 384
- Endpoints : `POST /embed` (single), `POST /embed-batch` (batch)
- Port : 8100 (interne Docker)

### GitHub Actions
- Detection automatique des changements dans `embedding-server/` pour rebuild

---

## 6. Conventions

### Code
- TypeScript strict mode, pas de `any`
- ESM imports (`import`/`export`)
- Fonctions pures quand possible
- Gestion d'erreurs explicite, pas de catches silencieux
- Toutes les queries DB via `packages/core/src/db/`
- Tous les appels Claude via `packages/core/src/ai/`

### Git
- Branche principale : `main`
- Branches feature : `feat/nom`
- Branches fix : `fix/nom`
- Commits conventionnels : `feat:`, `fix:`, `docs:`, `chore:`

### Securite
- Cles en variables d'environnement uniquement
- Jamais de `.env` dans Git
- Validation des inputs sur endpoints publics
- Pas de donnees sensibles dans les logs
