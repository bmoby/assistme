# SPEC : Infrastructure Partagee

## Vue d'ensemble
Infrastructure commune a tous les composants du systeme. Definit la base de donnees, l'hebergement, les API partagees et les conventions.

---

## 1. Base de donnees (Supabase)

### 1.1 Instance
- **Instance existante** : Deja en place (utilisee pour inscriptions etudiants + paiements)
- **Action** : Etendre le schema existant avec les nouvelles tables

### 1.2 Schema de la base de donnees

#### Table `profiles` (utilisateur principal)
```sql
- id UUID PRIMARY KEY
- name TEXT
- role TEXT ('admin')
- telegram_chat_id TEXT
- settings JSONB (preferences de notifications, horaires, etc.)
- created_at TIMESTAMPTZ
```

#### Table `tasks`
```sql
- id UUID PRIMARY KEY
- title TEXT NOT NULL
- description TEXT
- category TEXT ('client', 'student', 'content', 'personal', 'dev', 'team')
- priority TEXT ('urgent', 'important', 'normal', 'low')
- status TEXT ('todo', 'in_progress', 'waiting', 'done', 'cancelled')
- due_date TIMESTAMPTZ
- due_time TEXT (heure specifique si necessaire)
- estimated_minutes INTEGER
- completed_at TIMESTAMPTZ
- source TEXT ('telegram', 'discord', 'instagram', 'auto', 'manual')
- related_id UUID (lien vers client, student, etc.)
- related_type TEXT ('client', 'student', 'team_member', 'content')
- notes TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
```

#### Table `daily_plans`
```sql
- id UUID PRIMARY KEY
- date DATE UNIQUE
- plan JSONB (liste ordonnee de taches avec horaires)
- status TEXT ('generated', 'active', 'completed')
- review TEXT (bilan de fin de journee)
- productivity_score INTEGER (1-10, auto-evalue)
- created_at TIMESTAMPTZ
```

#### Table `students` (etendre l'existant)
```sql
- id UUID PRIMARY KEY
- name TEXT NOT NULL
- phone TEXT
- email TEXT
- telegram_id TEXT
- discord_id TEXT
- session INTEGER (1, 2, ...)
- status TEXT ('interested', 'registered', 'paid', 'active', 'completed', 'dropped')
- payment_status TEXT ('pending', 'partial', 'paid')
- payment_amount DECIMAL
- payment_method TEXT ('bank_transfer', 'crypto')
- payment_details JSONB (echeances, dates, montants)
- enrolled_at TIMESTAMPTZ
- completed_at TIMESTAMPTZ
- notes TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
```

#### Table `student_exercises`
```sql
- id UUID PRIMARY KEY
- student_id UUID REFERENCES students(id)
- module INTEGER
- exercise_number INTEGER
- submission_url TEXT
- submission_type TEXT ('link', 'file', 'discord_message')
- submitted_at TIMESTAMPTZ
- ai_review JSONB (pre-review automatique)
- manual_review TEXT (review du formateur)
- status TEXT ('submitted', 'ai_reviewed', 'reviewed', 'approved', 'revision_needed')
- reviewed_at TIMESTAMPTZ
- feedback TEXT
- created_at TIMESTAMPTZ
```

#### Table `clients`
```sql
- id UUID PRIMARY KEY
- name TEXT NOT NULL
- phone TEXT
- source TEXT ('instagram', 'tiktok', 'telegram', 'referral')
- business_type TEXT (metier du client)
- need TEXT (description du besoin)
- budget_range TEXT ('500-1000', '1000-2000', '2000-3000', '3000+')
- status TEXT ('lead', 'qualified', 'proposal_sent', 'accepted', 'in_progress', 'delivered', 'paid')
- qualification_data JSONB (donnees du bot telegram)
- proposal_url TEXT
- assigned_to UUID REFERENCES team_members(id)
- project_deadline TIMESTAMPTZ
- amount DECIMAL
- commission_amount DECIMAL
- notes TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
```

#### Table `team_members`
```sql
- id UUID PRIMARY KEY
- name TEXT NOT NULL
- discord_id TEXT
- telegram_id TEXT
- phone TEXT
- skills JSONB
- availability TEXT ('available', 'busy', 'unavailable')
- current_project_id UUID
- total_projects INTEGER DEFAULT 0
- notes TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
```

#### Table `messages_log`
```sql
- id UUID PRIMARY KEY
- platform TEXT ('instagram', 'tiktok', 'telegram', 'whatsapp', 'discord')
- sender_name TEXT
- sender_id TEXT
- message_text TEXT
- category TEXT ('client', 'student', 'social', 'technical', 'vip', 'unknown')
- auto_response TEXT (reponse envoyee automatiquement)
- requires_manual BOOLEAN DEFAULT false
- handled BOOLEAN DEFAULT false
- handled_at TIMESTAMPTZ
- created_at TIMESTAMPTZ
```

#### Table `content_ideas`
```sql
- id UUID PRIMARY KEY
- title TEXT NOT NULL
- topic TEXT
- angle TEXT
- type TEXT ('educational', 'demo', 'storytelling', 'tutorial')
- platform TEXT ('instagram', 'tiktok', 'both')
- key_points JSONB
- status TEXT ('idea', 'researched', 'scripted', 'filmed', 'published')
- published_at TIMESTAMPTZ
- published_url TEXT
- engagement JSONB (vues, likes, commentaires)
- created_at TIMESTAMPTZ
```

#### Table `habits`
```sql
- id UUID PRIMARY KEY
- date DATE
- wake_up_time TIMESTAMPTZ
- sleep_time TIMESTAMPTZ
- work_start TIMESTAMPTZ
- work_end TIMESTAMPTZ
- sport_done BOOLEAN DEFAULT false
- sport_duration INTEGER (minutes)
- tasks_completed INTEGER
- tasks_total INTEGER
- mood INTEGER (1-5)
- notes TEXT
- created_at TIMESTAMPTZ
```

#### Table `reminders`
```sql
- id UUID PRIMARY KEY
- message TEXT NOT NULL
- trigger_at TIMESTAMPTZ
- repeat TEXT ('once', 'daily', 'weekly', 'custom')
- repeat_config JSONB
- channel TEXT ('telegram', 'discord')
- status TEXT ('active', 'sent', 'cancelled')
- task_id UUID REFERENCES tasks(id)
- created_at TIMESTAMPTZ
```

### 1.3 Supabase Storage
- **Bucket `course-videos`** : Videos des cours enregistrees
- **Bucket `course-resources`** : PDFs, documents, supports de cours
- **Bucket `exercise-submissions`** : Fichiers soumis par les etudiants
- **Bucket `client-proposals`** : Propositions clients (PDF)
- **Acces** : Policies RLS pour securiser par role

### 1.4 Supabase Edge Functions
- Utilisees pour les webhooks (Instagram, Telegram)
- Ou comme alternative legere au serveur Node.js pour certaines fonctions

---

## 2. Serveur Backend (Orchestrateur)

### 2.1 Stack
- **Runtime** : Node.js 20+ avec TypeScript
- **Framework** : Fastify (leger, performant) ou Hono (ultra-leger)
- **ORM** : Supabase JS Client (pas besoin d'ORM externe)
- **Cron** : node-cron pour les taches planifiees
- **File structure** : Monorepo avec workspaces

### 2.2 Hebergement
- **Option 1** : Railway (simple, auto-deploy depuis Git)
- **Option 2** : Fly.io (plus de controle, bon free tier)
- **Option 3** : VPS (Hetzner, ~5€/mois, controle total)
- **Recommandation** : Railway pour demarrer rapidement, migrer si besoin

### 2.3 Structure du monorepo
```
vibe-coder/
├── packages/
│   ├── core/              # Logique partagee (DB, Claude API, utils)
│   │   ├── src/
│   │   │   ├── db/        # Client Supabase, queries
│   │   │   ├── ai/        # Client Claude API, prompts
│   │   │   ├── scheduler/ # Cron jobs, rappels
│   │   │   └── types/     # Types TypeScript partages
│   │   └── package.json
│   ├── bot-telegram/      # Bot Telegram Copilote
│   │   ├── src/
│   │   └── package.json
│   ├── bot-discord/       # Bot Discord Formateur
│   │   ├── src/
│   │   └── package.json
│   └── bot-instagram/     # Bot Instagram Filtre
│       ├── src/
│       └── package.json
├── specs/                 # Specifications (ce dossier)
├── docs/                  # Documentation
├── package.json           # Workspace root
├── tsconfig.json          # Config TypeScript partagee
├── CLAUDE.md              # Instructions Claude Code
└── .env                   # Variables d'environnement
```

---

## 3. APIs externes

### 3.1 Claude API (Anthropic)
- **Usage** : Raisonnement, classification messages, generation propositions, pre-review code, FAQ
- **Modeles** :
  - `claude-sonnet-4-6` : Taches rapides (classification, reponses courtes, FAQ)
  - `claude-opus-4-6` : Taches complexes (propositions clients, recherche metier, plans)
- **Cle API** : Variable d'environnement `ANTHROPIC_API_KEY`
- **Budget estime** : ~$20-50/mois selon usage

### 3.2 Telegram Bot API
- **Usage** : Bot Copilote (interface principale)
- **Token** : Via @BotFather
- **Gratuit** et sans limite significative

### 3.3 Discord API
- **Usage** : Bot Formateur (etudiants + equipe)
- **Token** : Via Discord Developer Portal
- **Gratuit**

### 3.4 Meta Graph API (Instagram)
- **Usage** : Bot Filtre (DMs Instagram)
- **Prerequis** : Compte Instagram Business + Page Facebook + Meta Developer App
- **App Review** : 2-6 semaines (⚠️ SOUMETTRE MAINTENANT)
- **Limite** : 200 DMs/heure, fenetre 24h
- **Gratuit** (API elle-meme)

---

## 4. Variables d'environnement
```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Claude API
ANTHROPIC_API_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=

# Discord
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=

# Instagram (Meta)
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
INSTAGRAM_ACCOUNT_ID=

# Server
NODE_ENV=production
PORT=3000
```

---

## 5. Conventions de developpement

### 5.1 Code
- TypeScript strict mode
- ESLint + Prettier
- Pas de `any`, typage explicite
- Fonctions pures quand possible
- Gestion d'erreurs avec types Result

### 5.2 Git
- Branch principale : `main`
- Branches feature : `feat/nom-de-la-feature`
- Branches fix : `fix/nom-du-fix`
- Commits conventionnels : `feat:`, `fix:`, `docs:`, `chore:`

### 5.3 Tests
- Tests unitaires pour la logique core (Vitest)
- Tests d'integration pour les bots (optionnel, phase 2)

---

## 6. Securite
- Toutes les cles en variables d'environnement
- RLS Supabase active sur toutes les tables
- Validation des inputs sur tous les webhooks
- Rate limiting sur les endpoints publics
- Pas de donnees sensibles dans les logs
