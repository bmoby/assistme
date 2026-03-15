# 06 — Formation "Pilote Neuro" Session 2

> **Statut : EN PREPARATION**

**Objectif** : Enseigner a des non-techniques comment concevoir n'importe quel systeme digital en s'appuyant sur l'IA.
**Format** : 3 mois, 2 sessions de 2h/semaine + exercices + documents
**Etudiants** : 30 max, debutants avec motivation
**Prix** : 1200€ (4 versements de 300€)

---

## Vision de la formation

La formation ne vise PAS a enseigner la programmation. Elle vise a transmettre :

1. **La comprehension** — Comment le code fonctionne (pas la syntaxe, la logique)
2. **L'architecture** — Comment un projet se decompose et se structure
3. **L'utilisation de l'IA** — Comment communiquer avec Claude, ChatGPT, etc. pour construire
4. **L'esprit critique** — Verifier, tester, remettre en question le travail de l'IA
5. **Le design et l'ergonomie** — Regles objectives (pas les gouts), mobile-first, UX
6. **Le mindset** — L'IA rend les choses plus rapides, pas plus faciles. Quand tout le monde va vite, il faut faire MIEUX.

---

## Lecons de la Session 1

### Ce qui a marche
- Qualite de l'enseignement (motivation elevee)
- Sessions live tres appreciees
- 14 inscrits → 10 termines → 6 operationnels dans l'equipe

### Ce qui a echoue (logistique)
1. **Google Drive** → problemes d'autorisations repetitifs
2. **Enregistrement lives** → processus 100% manuel
3. **PDFs de resume** → jamais eu le temps
4. **Exercices** → tout le monde soumettait la veille → surcharge de correction

### Solutions pour Session 2
- Supabase Storage remplace Google Drive (zero probleme d'autorisation)
- Systeme de soumission structure avec deadlines echelonnees
- Pre-review IA des exercices (reduit 80% de la charge)
- Notifications automatiques (deadlines, rappels, nouveau contenu)
- Discord bot automatise la logistique

---

## Roadmap — Etape par etape

Chaque etape est un travail en profondeur. On ne passe a la suivante que quand l'etape en cours est terminee et validee.

---

### ETAPE 1 — Recherches approfondies ✅
> **Statut : TERMINE** | Completee le 2026-03-13

3 recherches profondes lancees via le Research Agent. Rapports dans `specs/06-formation/recherches/`.

#### Recherche A — Psychologie des apprenants non-techniques

**Objectif** : Comprendre comment pensent les gens sans background technique quand ils approchent la tech. Quelles sont leurs peurs, leurs blocages, et comment les depasser.

**Points cles a explorer :**
- Barrieres cognitives face au code et a l'abstraction
- Syndrome de l'imposteur dans l'apprentissage tech
- Courbe de motivation sur 3 mois (lune de miel → vallee du desespoir → plateau → maitrise)
- Comment transformer un "consommateur de tech" en "createur de tech"
- Growth mindset applique a l'apprentissage tech
- Techniques de motivation qui marchent pour des adultes autodidactes
- Comment gerer le moment "je suis pas fait pour ca"

#### Recherche B — Pedagogie pour enseigner la tech (concepts, pas syntaxe)

**Objectif** : Trouver les meilleures methodes pour enseigner des concepts techniques a des non-techniques, sans jamais tomber dans la syntaxe pure.

**Points cles a explorer :**
- Computational thinking (decomposition, patterns, abstraction, algorithmes)
- Apprentissage par analogies (recette = algorithme, restaurant = client-serveur, etc.)
- Project-based learning vs theorie-first pour adultes
- Comment expliquer le code sans enseigner le code
- Feedback loops efficaces en formation en ligne
- Gestion d'une cohorte de 30 personnes avec des vitesses differentes
- Role des exercices pratiques dans la retention a long terme
- Pair programming / entraide entre etudiants

#### Recherche C — Structure optimale d'un programme de 3 mois en ligne

**Objectif** : Definir la meilleure structure pour un programme de 12 semaines avec 2 sessions de 2h par semaine.

**Points cles a explorer :**
- Frequence et duree ideales des sessions (pourquoi 2x2h est bon ou pas)
- Spacing effect et retention a long terme
- Design d'exercices progressifs : guides → semi-ouverts → projets libres
- Discord comme plateforme d'apprentissage (canaux, gamification, bots)
- Onboarding premiere semaine (comment bien demarrer une cohorte)
- Comment gerer l'abandon (quand et pourquoi les gens decrochent)
- Mix optimal live vs pre-enregistre vs lecture vs exercice
- Evaluation et feedback : comment evaluer sans decourager

#### Livrable etape 1
3 rapports de recherche detailles qui servent de fondation pour toutes les decisions de l'etape 2.
- `recherches/recherche-A-psychologie-apprenants.md` (50K chars)
- `recherches/recherche-B-pedagogie-tech-non-techniques.md` (52K chars)
- `recherches/recherche-C-structure-programme-3-mois.md` (49K chars)

---

### ETAPE 2 — Structurer le curriculum
> **Statut : EN COURS** | **Prochaine action**

---

#### Principes pedagogiques

1. **Concret avant abstrait** — L'etudiant vit le probleme (1 session de chaos controle) puis recoit la methode comme solution desiree. Jamais de theorie sans experience prealable.
2. **Spec-Driven Development** — La spec est la source de verite. Enseigne APRES que l'etudiant ait vecu le chaos — cycle chaos→revelation en 4 sessions max, pas 8.
3. **Projet fil rouge** — Chaque etudiant construit SON projet personnel. Toute theorie sert le projet.
4. **Just-in-time tooling** — Chaque outil IA (config, skills, agents) est introduit AU MOMENT ou l'etudiant en a besoin, pas avant.
5. **L'humain fait ce que l'IA ne peut pas** — Env vars, API keys, inscriptions, comptes, validation. Le role irreductible du pilote.
6. **Scaffolding coherent** — Guide (M1) → semi-ouvert (M2-M3) → libre (M4-M5). Jamais de retour en arriere.
7. **Flipped classroom** — Video courte (10-15 min) AVANT la session. Live = 100% pratique.
8. **Peer review de SPECS** — Evaluer les specs des autres, trouver les fragilites, proposer des alternatives.
9. **Pods de 3-4** — 7-8 pods stables. Entraide, accountability, check-in hebdo.
10. **Alumni S1 comme mentors** — 6 alumni, chacun mentor de 5 etudiants (2-3h/semaine). Support premier niveau + proteges effect.
11. **Anticiper la vallee** — Nommer la vallee des S1. Interventions planifiees aux semaines 5-6.
12. **Artefact a chaque session** — Chaque session produit quelque chose de concret (URL, schema, spec, prototype). Jamais de session purement documentaire.

---

#### Format de chaque session (2h)

| Temps | Bloc | Contenu |
|-------|------|---------|
| 0:00-1:00 | Accueil | Emoji check-in dans le chat (activation) |
| 1:00-6:00 | Retrieval quiz | 3 questions sur la session precedente (60s reflexion → reponses chat → debrief rapide) |
| 6:00-10:00 | Connexion narrative | "Semaine X sur 12. On a fait A, B. Aujourd'hui C qui debloque D." |
| 10:00-45:00 | Contenu + demo live | Nouveau concept (analogie → definition → demo) — max 35 min |
| 45:00-50:00 | Pause active | 5 min, stretch, questions informelles |
| 50:00-110:00 | Exercice pratique | Pratique guidee/autonome avec support en direct — 60 min |
| 110:00-116:00 | Debrief 3-2-1 | Chaque etudiant tape : 3 choses apprises / 2 questions ouvertes / 1 action avant la prochaine session |
| 116:00-120:00 | Annonce exercice | Description, deadline, canal de soumission, 1 conseil pour demarrer |

**Regle absolue** : JAMAIS de nouveau contenu dans les 10 dernieres minutes. Consolidation uniquement.

---

#### Repartition hebdomadaire

| Format | Volume | Quand |
|--------|--------|-------|
| Live (2x2h) | 4h | Mercredi soir + Dimanche apres-midi ← *ajustable* |
| Video pre-session | 2x 10-15 min | Mardi soir + Samedi soir (veille de chaque live) ← *ajustable* |
| Exercice | 3-5h | Entre les sessions |
| Recap PDF | 15-20 min lecture | Apres chaque session |

**Ratio global** : 40% pratique / 25% live interactif / 20% video / 15% lecture

---

#### Systeme de deadlines (exercices)

| Type | Delai | Feedback |
|------|-------|----------|
| Soumission primaire | Vendredi 20h (2 jours apres session Mer) | Feedback personnalise de Magomed |
| Soumission tardive | Mardi 20h (veille de la prochaine session) | Auto-correction avec corrige, pas de feedback perso |
| Soumission anticipee | Avant le delai primaire | Reaction visible sur Discord (reconnaissance) |

---

#### Systeme anti-decrochage

**4 moments critiques de decrochage :**
1. **Semaines 1-2** : Mauvais fit, problemes techniques, isolement → Pre-boarding solide + contact individuel dans les 72h
2. **Semaines 4-5** : Vallee du desespoir, nouveaute disparue → Ceremonie mi-parcours, exercice facile et gratifiant
3. **Semaines 7-8** : Fatigue de mi-parcours → Charge d'exercices allegee, sessions plus legeres
4. **Semaines 10-11** : Mur du projet → Milestones obligatoires aux semaines 9-10 pour detecter tot

**Indicateurs a tracker par etudiant :**
- Presence aux lives
- Activite Discord
- Soumission des exercices
- Participation aux rituels hebdomadaires

**Regle** : 2 indicateurs rouges = contact dans 48h. 3+ = appel vocal personnel.

---

#### Ceremonies

| Ceremonie | Quand | Objectif |
|-----------|-------|----------|
| **Kick-Off** | Session 1 | Histoire de Magomed + alumni S1 (5 min) + journey map + Quick Win + tour de table + regles |
| **Mi-parcours** | Semaine 5-6 | Retrospective + celebration des progres + preview phase 2 |
| **Pitch projets** | Semaine 9 | Chaque etudiant presente son projet (5 min) — probleme, use case, plan technique |
| **Demo Day** | Semaine 12 | Presentation finale — projet teste avec un vrai utilisateur. Gate d'acces a `#equipe` |

---

### Le curriculum — 12 semaines, 24 sessions

#### Fil rouge de progression

```
Semaines 1-2 : DECOUVRIR       → "Je comprends le digital et je sais utiliser l'IA"
Semaines 3-4 : LA METHODE      → 1h de chaos → revelation → spec → rebuild (cycle complet)
Semaines 5-6 : L'ARSENAL IA    → Config, skills, agents — chaque outil quand il sert + ceremonie
Semaines 7-8 : CONSTRUIRE      → Sprints structures avec spec + arsenal complet
Semaines 9-10: PROFESSIONNALISER → Proposition client, peer review avancee, MVP
Semaines 11-12: LIVRER          → Tests, deploy, demo day, graduation
```

**Principe psychologique** : le chaos dure 1 session (S5), la revelation arrive en S6 (48h apres). Le contraste est puissant mais la frustration est courte. Chaque session produit un artefact concret.

---

#### MODULE 1 — Decouvrir (Semaines 1-2)

**Objectif module** : L'etudiant comprend le digital, sait decomposer, et decouvre les outils IA. Concepts tech repartis sur 2 sessions (spacing). Identite "createur" installee.

**Bloom** : Comprendre + Appliquer (basique)
**Scaffolding** : Guide (tout est montre, l'etudiant reproduit)

---

**Session 1 (Mer) — Kick-Off + Quick Win**

*Pas de video pre-session (jour 1)*

> **Artefact** : URL en ligne partageable.

- **Ceremonie Kick-Off (50 min)**
  - Histoire de Magomed (5 min) + temoignage alumni S1 (5 min)
  - Journey map (10 min) : les 6 phases. Nommer la vallee du desespoir.
  - Tour de table (15 min) : prenom, pourquoi je suis la, un probleme concret
  - Regles (5 min) : deadlines, Discord, pods, "droit a la question bete"
  - Presentation des alumni-mentors (les 6 alumni S1 qui accompagneront la cohorte)

- **Quick Win (60 min)** : deployer une landing page avec l'IA (Vercel + v0/Lovable)
  - Magomed fait la demo → chaque etudiant reproduit avec son contenu
  - Partager dans Discord `#wins-et-victoires`

- **Formation des pods** (5 min) : 7-8 groupes de 3-4, chaque pod a un alumni-mentor attribue

---

**Session 2 (Dim) — Le digital : la salle et la cuisine**

*Video pre-session (10 min) : "Votre site n'est qu'un restaurant — partie 1"*

> **Artefact** : schema d'architecture d'une app connue (salle + cuisine + recettes).

- **Analogie restaurant — partie 1**
  - Salle = front-end | Cuisine = back-end | Menu = interface | Recette = algorithme
  - **Concept cle** : la separation front/back — l'utilisateur ne voit jamais la cuisine
  - Demo live : DevTools sur un site connu

- **Decomposition (premiere approche)**
  - Exercice eclair : algorithme de sa routine du matin
  - Conditions IF/SINON : "SI frigo vide ALORS..."
  - Pseudocode : ecrire la logique en francais

- **Exercice (45 min)** : choisir une app (Uber, Instagram), dessiner son restaurant (salle + cuisine + recettes). Presenter au pod.

---

**Session 3 (Mer) — Le digital : le frigo, les fournisseurs et le vigile**

*Video pre-session (10 min) : "Votre site n'est qu'un restaurant — partie 2"*

> **Artefact** : schema d'architecture COMPLET de la meme app (tous les elements).

- **Analogie restaurant — partie 2 (le systeme complet)**
  - Frigo = base de donnees (tableur avec superpouvoirs)
  - Serveur (personne) = API (liaison salle-cuisine)
  - Fournisseurs = APIs tierces (services externes)
  - Badge du personnel = authentification
  - Adresse = DNS
  - **Point de rupture** : un serveur web gere 1000 clients en parallele

- **Patterns** : comparer 3 apps similaires — "elles ont toutes le meme restaurant"

- **Exercice (45 min)** : completer le schema de S2 avec les nouveaux elements. Peer review en pod.

**Spacing** : les concepts de S2 sont REVUS en S3 (meme app, schema enrichi = rappel a J+5)

---

**Session 4 (Dim) — Le paysage IA 2026**

*Video pre-session (15 min) : "Claude, Cursor, Codex — c'est quoi la difference ?"*

> **Artefact** : une page construite avec un editeur IA (pas un generateur).

- **Les 3 categories d'outils IA**
  1. **Generateurs (v0, Lovable, Bolt)** : simple, peu controlable (= S1)
  2. **Editeurs IA (Cursor, Windsurf)** : controle iteratif, plus de precision
  3. **Assistants code (Claude Code, Codex CLI)** : pilotage avance, le plus puissant

- **"On progresse du generateur vers l'assistant code"**

- **Demo live** : meme mini-projet avec 3 outils — voir les differences

- **Exercice (45 min)** : construire avec Cursor ou Claude Code. Brief decompose (S2-S3) → IA → resultat → iteration.

**Fin Module 1** : l'etudiant comprend le digital, sait decomposer, connait les outils IA. 2 choses en ligne. Pret pour construire.

---

#### MODULE 2 — La Methode (Semaines 3-4)

**Objectif module** : L'etudiant vit 1 session de chaos controle, puis decouvre la methode spec-driven comme solution. Il ecrit sa spec, pilote l'IA methodiquement, et fait reviewer par ses pairs. Le cycle chaos→revelation est COMPLET en 4 sessions.

**Bloom** : Analyser + Appliquer
**Scaffolding** : Semi-ouvert (cadre donne, l'etudiant fait des choix)

**⚠️ S5 : Annoncer la vallee.** "Dans 2-3 semaines, vous voudrez abandonner. C'est prevu."

---

**Session 5 (Mer) — Le chaos controle (1 session, pas 4)**

*Video pre-session (10 min) : "Comment choisir un projet qui vous motivera pendant 10 semaines"*

> **Artefact** : un prototype bancal mais fonctionnel — ET une liste de frustrations.

- **Choisir son projet fil rouge (20 min)**
  - Criteres : personnel, scopable, techniquement varie
  - 5-8 templates proposes : bot Telegram, app de gestion, landing + CRM, dashboard, portfolio
  - "Choisissez quelque chose qui vous fait vibrer"

- **Phase 1 : "Foncez" (40 min)**
  - Consigne legere : "Decrivez votre projet a l'IA et commencez a construire. Pas de methode imposee."
  - Les etudiants se lancent. Resultats variables. Magomed observe, aide techniquement, mais ne donne PAS la methode.

- **Phase 2 : "Ajoutez une feature" (30 min)**
  - Consigne : "Maintenant ajoutez [une fonctionnalite qui necessite une DB ou une API]"
  - C'est la que ca casse. L'etudiant n'a pas prevu la structure de donnees. L'IA ne comprend pas le contexte. Il faut revenir en arriere.

- **Debrief immediat (20 min)** — PAS de frustration qui traine
  - "Qu'est-ce qui a marche ? Qu'est-ce qui a casse ? Qu'est-ce qui vous a MANQUE ?"
  - Ecrire les frustrations dans Discord `#retours-chaos`
  - Magomed : "Tout ce que vous venez de vivre, c'est le quotidien de 80% des projets IA. Dimanche, je vous montre la methode qui resout TOUT ca."

**Psychologie** : le chaos dure 70 minutes, pas 2 semaines. La frustration est vive mais courte. Le tease de la solution cree l'anticipation.

---

**Session 6 (Dim) — La revelation (48h apres le chaos)**

*Video pre-session (12 min) : "Pourquoi 80% des projets IA echouent — et la methode qui change tout"*

> **Artefact** : les etapes 1-3 de la methode appliquees a son projet (description + recherche + questions). Un document concret, pas de la theorie.

- **Ouverture (10 min)** : reprendre les frustrations du Discord `#retours-chaos`
  - "Brief vague → resultat vague" = probleme de SPECIFICATION
  - "J'ai oublie de dire que..." = probleme de DECOUVERTE
  - "Je ne sais plus ou j'en suis" = probleme de ROADMAP
  - "Je sais pas si c'est bon" = probleme de VALIDATION

- **La methode en 6 etapes (25 min)** :
  1. **DECRIRE** : tout sort de la tete sur papier → fini les briefs vagues
  2. **RECHERCHER** : l'IA fait une recherche approfondie → fini les zones d'ombre
  3. **QUESTIONNER** : l'IA pose des questions + "POURQUOI cette question est importante" → fini les oublis
  4. **COMPRENDRE** : lire les questions, chercher les reponses → fini "je ne savais pas"
  5. **PRIORISER** : urgent vs peut attendre, MVP vs V2 → fini la paralysie
  6. **SPECIFIER** : document formel = source de verite → fini "ou j'en suis ?"

  Chaque etape est illustree par le contraste avec l'experience de S5 : "vous avez fait X, voici ce qui aurait change avec la methode"

- **Exercice (70 min)** : appliquer les etapes 1-3 a SON projet
  - Etape 1 : ecrire la description complete
  - Etape 2 : lancer la recherche avec l'IA
  - Etape 3 : generer les questions + "pourquoi chaque question est utile"
  - **Moment cle** : l'etudiant realise tout ce qu'il avait oublie en S5

---

**Session 7 (Mer) — Ecrire la spec + premier fichier de config**

*Video pre-session (10 min) : "Anatomie d'une spec qui fonctionne"*

> **Artefact** : spec complete du projet + fichier CLAUDE.md ou .cursorrules (premier outil integre a la methode).

- **Ecrire la spec (50 min)** : completer les etapes 4-6
  - Template fourni : vue d'ensemble, architecture, schema de donnees, fonctionnalites, regles metier, roadmap de taches
  - Chaque section repond a un besoin vecu en S5 : "ce que je n'avais pas clarifie", "ce que j'ai du refaire 3 fois"

- **Premier outil IA : le fichier de config (30 min)** — just-in-time, pas dans un module separe
  - "Vous avez une spec. Maintenant DONNEZ-LA a l'IA comme contexte permanent."
  - Creer un `CLAUDE.md` ou `.cursorrules` a partir de la spec
  - Tester : meme question avec et sans config → voir la difference
  - "Vous ne retaperez plus jamais le contexte de votre projet."

- **Exercice (30 min)** : finaliser spec + config, les deux ensemble

**Just-in-time** : le fichier de config arrive au moment EXACT ou l'etudiant en a besoin (il vient d'ecrire sa spec, il va piloter l'IA).

---

**Session 8 (Dim) — Piloter l'IA avec la spec + peer review**

*Video pre-session (10 min) : "Comment donner votre spec a l'IA pour qu'elle execute parfaitement"*

> **Artefact** : premieres taches executees avec la methode + spec amelioree par les pairs.

- **Ce que l'IA fait vs ce que l'humain fait (10 min)**

  | L'IA fait | L'humain fait |
  |-----------|---------------|
  | Generer du code | Ecrire les specs |
  | Proposer une architecture | Valider les choix |
  | Debugger | Decider quoi corriger |

  Ce que l'IA ne peut PAS faire : creer des comptes, generer des cles API, injecter les `.env`, tester avec de vrais utilisateurs, decider si le resultat est bon.

- **Sprint spec-driven (50 min)** : executer 3-4 taches de la roadmap
  - Workflow : tache → contexte de la spec → IA genere → lire le resume → tester → roadmap (TERMINE)
  - Creer les comptes necessaires + recuperer les cles API + `.env`
  - **Constat** : c'est plus rapide, plus precis, et on sait ou on en est vs S5

- **Peer review de specs (50 min)**
  - Chaque pod recoit la spec d'un autre pod
  - Methode : lire → IA trouve les fragilites → analyse personnelle → propositions d'amelioration
  - Presentation des retours + discussion + mise a jour des specs

- **Checkpoint** : auto-evaluation (comprehension, motivation, qualite de la spec)

**Fin Module 2** : en 4 sessions, l'etudiant a vecu le chaos (S5), decouvert la methode (S6), ecrit sa spec + config (S7), pilote l'IA et fait reviewer (S8). Le cycle complet. Le reste = approfondir et appliquer.

---

#### MODULE 3 — L'Arsenal IA (Semaines 5-6)

**Objectif module** : L'etudiant configure son infra IA complete (skills, agents) et avance significativement sur son projet. Chaque outil est introduit au moment ou il sert. Ceremonie mi-parcours.

**Bloom** : Appliquer + Analyser
**Scaffolding** : Semi-ouvert → debut d'autonomie

**⚠️ Semaines 5-6 : Zone vallee du desespoir. MAIS : la revelation de M2 a cree un pic de motivation. Les outils IA donnent des wins tangibles a chaque session. Message vocal personnel de Magomed.**

---

**Session 9 (Mer) — Skills et prompts reutilisables**

*Video pre-session (10 min) : "Les skills : votre boite a outils permanente"*

> **Artefact** : 4 skills configures et testes sur le code du projet.

- **Le probleme (vecu en M2)** : on repete les memes instructions 50 fois. "Verifie l'ergonomie", "Explique ce que tu as fait" → ca devrait etre automatique.

- **Skills / prompts reutilisables**
  - Un skill = instruction pre-ecrite, invocable a volonte
  - Claude Code : `.claude/commands/` | Cursor : prompt library
  - Ecrire UNE fois, reutiliser a l'infini

- **4 skills essentiels** :
  1. **Explainer** : lister fichiers modifies + expliquer en langage simple
  2. **UX Review** : critiquer l'interface (hierarchie, contraste, espacement, coherence, mobile-first)
  3. **Spec Sync** : comparer code vs spec (implemente, manquant, divergent)
  4. **Pre-commit Review** : cas limites, securite, lisibilite

- **Exercice (60 min)** : creer les 4 skills, les tester sur son code existant
  - Voir le resultat : l'IA fait maintenant des reviews automatiques
  - Sprint rapide : avancer 2-3 taches de la roadmap AVEC les skills actifs

- **Intervention vallee** : message vocal personnel de Magomed cette semaine

---

**Session 10 (Dim) — Agents et sprint**

*Video pre-session (12 min) : "Les agents IA — votre equipe de specialistes"*

> **Artefact** : 1 agent personnalise + avancees concretes sur le projet.

- **Le concept d'agent (20 min)**
  - Agent = IA avec role specifique, contexte, instructions
  - Exemples : Code Reviewer, Design Critic, Researcher
  - Chaque agent a son "fichier de personnalite" (system prompt)
  - Sub-agent = un agent lance par un autre pour une sous-tache

- **Exercice : creer un agent (30 min)**
  - Choisir le role le plus utile pour son projet
  - Ecrire le system prompt
  - Tester sur une tache reelle
  - Iterer le prompt

- **Sprint de construction (60 min)** : avancer le projet avec l'arsenal complet
  - Spec → config → skills → agent → workflow methodique
  - Mettre a jour la roadmap

---

**Session 11 (Mer) — Sprint approfondi**

*Video pre-session (8 min) : "Auth, integrations : les briques qui rendent votre projet reel"*

> **Artefact** : projet avec auth et/ou integration externe fonctionnelle.

- **Sprint de construction (100 min)** : taches avancees de la roadmap
  - Authentification (Supabase Auth) — si le projet le necessite
  - Integration externe (paiement, email, IA, notifications)
  - Pour chaque service : creer le compte → cle API → `.env` (le travail de l'humain)
  - Les skills et agents tournent en continu

- **Checkpoint rapide (20 min)** : ou en est chacun ? quelles taches restent ?

---

**Session 12 (Dim) — Ceremonie mi-parcours + peer review technique**

*Pas de video pre-session*

> **Artefact** : projet ameliore + motivation renouvelee.

- **Peer review technique (50 min)** :
  - Chaque pod teste le projet d'un autre pod
  - Grille : le produit fait ce que la spec promet ? quels manques ? quels bugs ?
  - Skill Spec Sync utilise en live
  - Retours structures + 20 min de corrections

- **Ceremonie mi-parcours (60 min)**
  - Retrospective : 5 choses que je sais faire aujourd'hui vs S1
  - "Vous avez une spec, un config, des skills, un agent, un projet qui avance — vous etes outilles comme des pros"
  - Celebration : meilleures realisations, meilleures specs, meilleure utilisation des outils
  - Preview : "les 6 prochaines semaines — vous construisez en autonomie, vous professionnalisez, et vous livrez"
  - Checkpoint : auto-evaluation

**Fin Module 3** : l'etudiant a spec + config + skills + agent + projet bien avance. La vallee est traversee (la methode + les outils = wins constants). Le reste = construire en autonomie, se professionnaliser, livrer.

---

#### MODULE 4 — Construire (Semaines 7-8)

**Objectif module** : L'etudiant construit son projet en autonomie croissante. Sprints structures. Debug et esprit critique. Le projet devient un vrai produit.

**Bloom** : Appliquer + Evaluer
**Scaffolding** : Semi-ouvert → libre (l'aide se retire progressivement)

---

**Session 13 (Mer) — Sprint : interface + donnees**

> **Artefact** : front-end + DB connectes, CRUD fonctionnel.

- **Sprint de construction (100 min)**
  - Interface (si pas encore fait) : design avec les 5 regles UX, le skill UX Review valide
  - Donnees + logique : tables Supabase, CRUD, regles metier
  - L'Explainer documente chaque changement automatiquement
  - Roadmap mise a jour

- **Demo en fin de session** : chaque pod montre l'avancement (5 min)

---

**Session 14 (Dim) — Sprint : features avancees**

> **Artefact** : projet enrichi avec features avancees.

- **Sprint de construction (100 min)** : taches avancees de la roadmap
  - Auth, integrations, API tierces (si pas fait en S11)
  - Features specifiques au projet
  - L'agent review en continu

- **Exercice de lecture de code (20 min)** : utiliser le skill Explainer sur ce que l'IA a genere
  - "Est-ce que ca correspond a la spec ? (Spec Sync)"
  - "Est-ce que c'est solide ? (Pre-commit Review)"

---

**Session 15 (Mer) — Debug et esprit critique**

*Video pre-session (10 min) : "L'IA ment parfois — comment le detecter"*

> **Artefact** : bugs trouves et corriges + checklist de review personnelle.

- **Pourquoi cette session maintenant** : le projet est assez avance pour avoir des vrais bugs. L'esprit critique arrive au moment ou il y a quelque chose a critiquer.

- **Think-Aloud Protocol (20 min)** : Magomed review du code en direct, narrant sa reflexion
  - "Je vois 'if user' mais si user est null ?"
  - "Cette fonction fait 3 choses — signal d'alerte"
  - L'etudiant apprend le PROCESSUS, pas la syntaxe

- **4 questions de review** (checklist simple) :
  1. "Que se passe-t-il si l'utilisateur fait l'inattendu ?"
  2. "Que se passe-t-il si le reseau est lent ou coupe ?"
  3. "Donnees sensibles protegees ?"
  4. "Le code fait UNE chose ou trop de choses ?"

- **Exercice (60 min)** : appliquer les 4 questions a son propre projet + corriger
  - Puis : l'IA genere du code avec bugs volontaires — l'etudiant les trouve

- **Sprint polish (30 min)** : etats de chargement, messages d'erreur clairs, responsive

---

**Session 16 (Dim) — Peer review specs vs produit**

> **Artefact** : projet ameliore par feedback + roadmap finalisee.

- **Peer review (70 min)** :
  - PAS du code — review SPECS vs PRODUIT
  - Chaque pod teste le projet d'un autre pod
  - Grille : le produit fait ce que la spec promet ? quels ecarts ? quels bugs ?
  - L'etudiant revieweur utilise l'IA pour analyser
  - Retours structures + corrections

- **Sprint corrections (40 min)** : corriger les problemes identifies

- **Checkpoint** : auto-evaluation + comparaison avec tous les checkpoints precedents

**Fin Module 4** : le projet est fonctionnel, debug, reviewe. L'etudiant maitrise spec + outils + esprit critique. Pret pour l'autonomie totale.

---

#### MODULE 5 — Professionnaliser (Semaines 9-10)

**Objectif module** : Appliquer la methode en contexte pro reel. Peer review avancee avec propositions d'alternatives. Autonomie totale. MVP.

**Bloom** : Evaluer + Creer
**Scaffolding** : Libre (l'etudiant pilote tout, Magomed = support)

---

**Session 17 (Mer) — Exercice : proposition client**

*Video pre-session (10 min) : "Un client te dit 'tu peux me faire un site ?' — voila ce que tu fais"*

> **Artefact** : proposition client structuree avec spec + estimation + roadmap.

- **Scenario** : Magomed joue le client, brief vague. Les pods sont des "agences".

- **Workflow methode appliquee au contexte client** :
  1. Le client decrit (vague, incomplet)
  2. **Recherche** : l'IA recherche marche, concurrence, solutions
  3. **Questions** : l'IA pose des questions + "A QUOI elle sert dans la creation du produit" → l'etudiant apprend en lisant
  4. **Spec** : rediger une mini-spec
  5. **Proposition** : presenter au "client" avec estimation et roadmap

- **Exercice (90 min)** : chaque pod recoit un brief different
  - 30 min : recherche + questions
  - 30 min : spec + proposition
  - 30 min : presentations + feedback

---

**Session 18 (Dim) — Sprint autonome**

> **Artefact** : avancees concretes sur le projet.

- 2h de travail — autonomie totale
- Magomed + alumni-mentors disponibles pour support
- Entraide en pods

---

**Session 19 (Mer) — Peer review de specs avancee**

> **Artefact** : spec amelioree + specs alternatives proposees aux pairs.

- **Exercice avance** (evolution de S8 et S12) :
  - Recevoir la spec d'un autre etudiant
  - Analyser avec l'IA : fragilites, manques, incoherences
  - Etudier le sujet en profondeur
  - Proposer des **SPECS ALTERNATIVES** avec justification : "Tu voulais faire X mais je pense que Y serait meilleur parce que..."
  - Presentation + discussion

---

**Session 20 (Dim) — MVP Checkpoint**

> **Artefact** : MVP fonctionnel + plan pour les 2 dernieres semaines.

- **Deadline MVP** : le projet DOIT fonctionner
- Demo rapide (3 min par etudiant)
- Identification des gaps pour le demo day
- Plan d'action individuel semaines 11-12

**Fin Module 5** : l'etudiant sait appliquer la methode en contexte pro et a un MVP fonctionnel.

---

#### MODULE 6 — Livrer (Semaines 11-12)

**Objectif module** : Polir, tester, deployer, presenter. Graduation.

**Bloom** : Creer
**Scaffolding** : Libre total

---

**Session 21 (Mer) — Tests utilisateur reel**

> **Artefact** : retours utilisateurs + liste de corrections.

- Tester par quelqu'un d'EXTERIEUR a la formation
- Protocole : donner une tache, observer sans aider, noter les frictions
- Atelier : corriger les problemes critiques

---

**Session 22 (Dim) — Deploiement production**

> **Artefact** : projet en ligne, URL accessible au monde.

- Deploiement reel (Vercel, Railway)
- Domaine personnalise (optionnel)
- Partager a 3+ personnes + collecter feedback
- Checklist de lancement

---

**Session 23 (Mer) — Repetition Demo Day**

> **Artefact** : presentation rodee et validee.

- Format 7 min : probleme → solution → demo → apprentissages → next steps
- Dry run en pods + feedback mutuel

---

**Session 24 (Dim) — DEMO DAY + Graduation**

> **Artefact** : produit fini presente, role Discord, potentiellement place dans l'equipe.

- Presentations finales (+ alumni S1 invites)
- Votes : meilleur projet, meilleur pitch, meilleure progression
- Roles Discord : Pilote Neuro → acces `#equipe`
- Opportunites : projets clients, equipe, collaboration

**Fin de formation** : l'etudiant sait specifier, outiller son IA, construire methodiquement, et livrer un produit reel.

---

#### Livrable etape 2
Curriculum complet : 6 modules, 24 sessions. Chaos→revelation en 4 sessions. Scaffolding coherent (guide→semi-ouvert→libre). Chaque outil just-in-time. Chaque session = artefact concret. Alumni-mentors integres. Vallee contrecarree par la revelation methodologique.

---

### ETAPE 3 — Designer les exercices et livrables
> **Statut : EN ATTENTE** | Depend de l'etape 2

Pour chaque session : quel exercice, quel livrable, quels criteres d'evaluation. Comment rendre les exercices progressifs et motivants.

---

### ETAPE 4 — Concevoir les outils et l'automatisation
> **Statut : TERMINE**

Decider quels outils techniques mettre en place en fonction des besoins reels identifies aux etapes precedentes. Discord bot, systeme d'exercices, FAQ auto, ressources, notifications.

Systeme de gestion concu avec isolation (namespace formation/), auth par roles Discord, communication inter-bots via table events.

---

### ETAPE 5 — Implementer le systeme technique
> **Statut : TERMINE**

Coder : bot Discord, agents IA (review exercices, FAQ), CRUD database (students, exercises), integration avec le systeme existant (Telegram, notifications dynamiques).

Migration 004 (students table), CRUD formation, AI agents (exercise-reviewer, faq-agent), Bot Discord complet (11 commandes slash, FAQ auto, crons), integration Telegram.

---

### ETAPE 6 — Creer le contenu et les supports
> **Statut : EN ATTENTE** | Depend des etapes 2+5

Preparer les slides, documents, ressources pour chaque session. Automatiser la generation de supports quand possible.

---

### ETAPE 7 — Tester et lancer
> **Statut : EN ATTENTE** | Depend de l'etape 6

Test end-to-end avec l'equipe comme cobayes. Ajustements. Deploiement. Lancement session 2.

---

## Infrastructure existante (deja prete)

| Composant | Statut | Details |
|-----------|--------|---------|
| Table `student_exercises` | ✅ Schema cree | Supabase migration 001 |
| Table `faq_entries` | ✅ Schema cree | Supabase migration 001 |
| Table `team_members` | ✅ Schema cree | Supabase migration 001 |
| Table `students` | ✅ Schema cree | Supabase migration 004 |
| Types TypeScript | ✅ Definis | Student, StudentExercise, TeamMember dans types/index.ts |
| Storage buckets | ✅ Definis | course-videos, course-resources, exercise-submissions |
| Bot Discord package | ✅ Cree | packages/bot-discord (vide, src/ a implementer) |
| Spec Discord | ✅ Ecrite | specs/04-bot-discord/SPEC.md |
| Notification dynamiques | ✅ Implemente | Systeme IA-driven dans le bot Telegram |
| Research Agent | ✅ Implemente | Pour lancer les recherches de l'etape 1 |
| CRUD Formation (core) | ✅ Implemente | db/formation/ (students, exercises, faq, events) |
| AI Agents Formation | ✅ Implemente | ai/formation/ (exercise-reviewer, faq-agent) |
| Bot Discord | ✅ Structure creee | packages/bot-discord/ (commandes, handlers, crons) |
| Integration Telegram | ✅ Implemente | formation-events cron dans bot-telegram |

---

*Ce fichier evolue etape par etape. Chaque etape sera detaillee quand on y arrive.*
