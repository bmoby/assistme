-- ============================================
-- Vibe Coder - Public Knowledge Base
-- For the public-facing Telegram bot (Russian)
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL
    CHECK (category IN ('formation', 'services', 'faq', 'free_courses', 'general')),
  key TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, key)
);

CREATE INDEX IF NOT EXISTS idx_public_knowledge_category ON public_knowledge(category);

-- ============================================
-- SEED: Initial public knowledge
-- Content in French (Claude translates to Russian at runtime)
-- ============================================
INSERT INTO public_knowledge (category, key, content) VALUES
  -- Formation Pilote Neuro
  ('formation', 'description', 'Formation "Pilote Neuro" : apprendre a developper n''importe quel systeme en utilisant l''intelligence artificielle. On apprend le codage, les infrastructures, architectures, logiciels, architecture projet, front-end, back-end, et surtout comment travailler efficacement avec l''IA.'),
  ('formation', 'prix', '1200 euros, payable en 4 fois (4 x 300 euros).'),
  ('formation', 'dates', 'La session 2 demarre le 23 mars 2026. Duree : 3 mois.'),
  ('formation', 'places', 'Maximum 30 places par session.'),
  ('formation', 'format', 'Mix de sessions en live et de videos enregistrees.'),
  ('formation', 'prerequis', 'Aucune base solide requise dans un domaine specifique. Ce qui compte c''est la motivation et la disponibilite. L''information transmise n''est pas complexe. Le defi c''est la quantite d''information a absorber, pas la difficulte. La qualite de la transmission est garantie.'),
  ('formation', 'apres', 'Ceux qui terminent leur projet correctement et sont capables de travailler rejoignent l''equipe de Magomed. A partir de la, Magomed se charge de trouver des clients. C''est un vrai pipeline vers l''emploi.'),
  ('formation', 'session1', 'Session 1 terminee : 14 inscrits, 10 ont fini les cours, 6 sont maintenant operationnels et travaillent sur des projets reels.'),
  ('formation', 'site', 'Toutes les informations detaillees, les retours d''anciens eleves (temoignages vocaux), les explications completes et l''inscription sont disponibles sur le site officiel.'),

  -- Services / Agence
  ('services', 'description', 'Nous proposons : creation de sites web, automatisation, analyse, bots Telegram, et consultations business (strategie, investissement, etc.). Tout est fait avec une equipe de developpeurs formes par Magomed.'),
  ('services', 'prix', 'Les services commencent a partir de 500 euros. Le prix depend du temps necessaire. Aucun projet ne prend moins de 3-4 jours.'),
  ('services', 'processus', 'Etape 1 : Discussion approfondie pour comprendre le business du client (comment il travaille, ses clients, fournisseurs, habitudes, localisation). Etape 2 : Recherches et analyse de ce qui est possible. Etape 3 : Preparation d''une ou plusieurs propositions selon le budget. Etape 4 : Si le client accepte, on prend en charge le projet et on demarre.'),
  ('services', 'equipe', 'L''equipe est composee de diplomes de la formation Pilote Neuro. Ils sont formes et operationnels. Magomed supervise les projets et cherche les clients.'),

  -- FAQ
  ('faq', 'capable', 'Question : "Est-ce que je suis capable de suivre la formation ?" Reponse : Ca depend entierement de la personne. Il faut etre motive et disponible. Chacun a son experience de vie. Ce que je peux garantir : l''information n''est pas complexe, il ne faut pas de bases solides. Le challenge c''est la quantite d''info a absorber, mais la qualite de transmission est garantie.'),
  ('faq', 'comment_demarrer', 'Question : "Comment demarrer ? Quelles bases faut-il ?" Reponse : Nous avons des cours gratuits "Portal" qui expliquent l''infrastructure, l''architecture projet, les differents metiers IT, le mecanisme de la programmation et de l''IA. C''est fait pour comprendre comment la tech fonctionne avant de s''inscrire aux cours payants.'),
  ('faq', 'difference_gratuit_payant', 'Les cours gratuits Portal donnent les bases theoriques et une vue d''ensemble. La formation payante Pilote Neuro est pratique : on construit de vrais projets, on apprend a travailler avec l''IA, et a la fin on peut rejoindre l''equipe pour travailler sur des projets clients reels.'),

  -- Cours gratuits
  ('free_courses', 'portal', 'Cours gratuits "Portal" : introduction a l''infrastructure, architecture projet, les differents metiers dans l''informatique, le mecanisme de la programmation, et le mecanisme de l''intelligence artificielle. Objectif : comprendre comment la tech marche avant de s''inscrire aux cours payants.'),

  -- General
  ('general', 'magomed', 'Magomed est un developpeur expert avec plus de 10 ans d''experience (ex Renault, Prisma Media, Cegid, Cresus). Il est aussi createur de contenu tech avec 30 000 abonnes. Il a cree la formation Pilote Neuro et dirige une equipe de developpeurs.'),
  ('general', 'contact', 'Pour les questions specifiques, il y a un groupe Telegram. Pour l''inscription a la formation, tout est sur le site officiel.')
ON CONFLICT (category, key) DO NOTHING;
