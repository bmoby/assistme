-- ============================================
-- Vibe Coder - Memory & Events System
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- MEMORY (persistent knowledge)
-- ============================================
CREATE TABLE IF NOT EXISTS memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL
    CHECK (category IN ('identity', 'situation', 'preference', 'relationship', 'lesson')),
  key TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence DECIMAL DEFAULT 1.0,
  source TEXT DEFAULT 'conversation',
  last_confirmed TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, key)
);

CREATE INDEX IF NOT EXISTS idx_memory_category ON memory(category);
CREATE INDEX IF NOT EXISTS idx_memory_key ON memory(key);

-- ============================================
-- EVENTS (inter-agent communication)
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  target TEXT,
  data JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_processed ON events(processed) WHERE processed = FALSE;

-- ============================================
-- SEED: Initial memory from user profile
-- ============================================
INSERT INTO memory (category, key, content, source) VALUES
  -- Identity
  ('identity', 'name', 'Magomed', 'initial_setup'),
  ('identity', 'expertise', 'Developpeur JS/TS expert, 10+ ans experience, autodidacte. Ex: Renault, Prisma Media, Cegid, Cresus (manager 12 devs). Competences: infra, archi, UX/UI, management.', 'initial_setup'),
  ('identity', 'location', 'Vit seul en Thailande. Famille dispersee: France, Jordanie, Canada.', 'initial_setup'),
  ('identity', 'family', 'A des enfants. Parents a contacter regulierement.', 'initial_setup'),
  ('identity', 'languages', 'Parle francais, tchetchene. Contenu en tchetchene.', 'initial_setup'),
  ('identity', 'productive_hours', 'Fenetre productive 10h-15h. Apres 15h ca descend. Fatigue naturelle vers 19h-20h.', 'initial_setup'),
  ('identity', 'motivation_style', 'Motive par objectifs concrets et progression visible. Motive par la peur de perdre quelque chose. Paralyse quand trop de choix - il faut decider pour lui.', 'initial_setup'),
  ('identity', 'weaknesses', 'Procrastination via echecs en ligne et scroll reseaux sociaux. Piege #1: telephone au lit le matin. Epuise apres 10+ ans de travail intense.', 'initial_setup'),
  ('identity', 'sleep', 'Se couche vers 1h, se leve vers 9h. Traine au lit. Aimerait se coucher plus tot.', 'initial_setup'),

  -- Situation
  ('situation', 'content_creation', 'Createur de contenu tech en tchetchene. Instagram + TikTok, 30K abonnes, objectif 100K. Publie 1-2x/mois. Format: face camera, mini studio a domicile, 2-3h par video.', 'initial_setup'),
  ('situation', 'formation_session2', 'Session 2: 30 places max, lancement fin mars 2026, duree 3 mois, prix 1200€. Mix live + videos. Syllabus a ecrire. Plateforme a decider.', 'initial_setup'),
  ('situation', 'formation_session1', 'Session 1 terminee: 14 inscrits, 10 ont fini les cours, 6 operationnels. Contenu excellent, logistique etait chaotique (Google Drive, pas de systeme exercices).', 'initial_setup'),
  ('situation', 'team', '6 membres operationnels. Meme profil: createurs de solutions tech avec IA (Claude Code). Commission 20% sur projets. 1 client en cours.', 'initial_setup'),
  ('situation', 'agency', 'Agence debutante. Services: sites web, bots Telegram, etc. Prix: 500-3000€. Taux conversion: 10% des demandes. Clients via Instagram/TikTok.', 'initial_setup'),
  ('situation', 'bot_frere', 'Bot Telegram pour son frere en Jordanie (livraison gateaux). Quasi fini, ~1 jour de travail restant.', 'initial_setup'),
  ('situation', 'bot_qualification', 'Bot Telegram qualification client deja developpe. Determine besoin, metier, budget. Pas encore utilise en production.', 'initial_setup'),
  ('situation', 'tools', 'Discord (equipe+etudiants), WhatsApp (clients), Supabase (inscriptions), pilotneuro.com (site cours). Pas d''outil de gestion de taches.', 'initial_setup'),
  ('situation', 'finances', 'Dettes envers amis. Situation en amelioration: loyer paye, argent pour enfants, marge 2-3 mois. Stress financier diminue mais present.', 'initial_setup'),

  -- Preferences
  ('preference', 'tools_friction', 'Zero friction obligatoire sinon n''utilise pas. Push > Pull: les infos doivent venir a lui. A essaye Monday.com: echec car trop de gestion manuelle.', 'initial_setup'),
  ('preference', 'communication', 'Prefere vocal. N''aime pas devoir se connecter quelque part. Veut un assistant qui pousse (notifications, rappels insistants).', 'initial_setup'),
  ('preference', 'work_style', 'Aime travailler quand ca avance. Le demarrage est le moment critique. Une fois lance, peut tenir longtemps. Les conversations tardives le poussent au-dela de sa fatigue.', 'initial_setup'),
  ('preference', 'sport', 'Veut faire du shadow boxing a la maison. Sessions en ligne. Aime car objectifs concrets (combinaisons). N''aime pas les exercices repetitifs sans sens.', 'initial_setup'),
  ('preference', 'delegation', 'Regle des 3 niveaux: Manuel (decisions, strategie), Semi-auto (contexte pre-mache), Full auto (tout le reste). Veut faire UNIQUEMENT ce qui a besoin de lui.', 'initial_setup'),

  -- Lessons
  ('lesson', 'session1_logistics', 'Session 1: Google Drive = chaos autorisations. Enregistrement lives = manuel et penible. PDFs resumes = jamais le temps. Exercices = tout le monde envoie la veille.', 'initial_setup'),
  ('lesson', 'monday_failure', 'Monday.com a echoue: trop de temps a remplir manuellement, jamais consulte ensuite. L''outil doit se remplir tout seul.', 'initial_setup'),
  ('lesson', 'message_overload', '90% des messages Instagram ne sont pas serieux. Bot qualification existe mais oublie de rediriger les gens. Faut automatiser le filtre.', 'initial_setup'),
  ('lesson', 'student_reviews', 'Deteste la review des micro-etapes des eleves. Certains demandent du feedback pour chaque detail au lieu d''avancer. A structurer avec checkpoints.', 'initial_setup')
ON CONFLICT (category, key) DO NOTHING;
