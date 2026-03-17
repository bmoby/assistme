# Recherche D : Le Paysage des Outils IA de Coding en 2025-2026

> Recherche approfondie pour le programme de formation "Piloter l'IA pour construire des produits digitaux"
> Date : Mars 2026

---

## Table des matieres

1. [Contexte : Le "Vibe Coding"](#1-contexte--le-vibe-coding)
2. [Niveau 1 — Les Generateurs](#2-niveau-1--les-generateurs)
   - [v0 by Vercel](#21-v0-by-vercel)
   - [Lovable (ex GPT Engineer)](#22-lovable-ex-gpt-engineer)
   - [Bolt.new](#23-boltnew)
3. [Niveau 2 — Les Editeurs IA](#3-niveau-2--les-editeurs-ia)
   - [Cursor](#31-cursor)
   - [Windsurf (ex Codeium)](#32-windsurf-ex-codeium)
4. [Niveau 3 — Les Assistants Code](#4-niveau-3--les-assistants-code)
   - [Claude Code (Anthropic CLI)](#41-claude-code-anthropic-cli)
   - [OpenAI Codex CLI](#42-openai-codex-cli)
5. [Tableau Comparatif Complet](#5-tableau-comparatif-complet)
6. [La Progression Pedagogique](#6-la-progression-pedagogique)
7. [Exemples Concrets et Reels](#7-exemples-concrets-et-reels)
8. [Le Deploiement avec Vercel](#8-le-deploiement-avec-vercel)
9. [Tendances et Direction du Marche](#9-tendances-et-direction-du-marche)
10. [Recommandations pour la Formation](#10-recommandations-pour-la-formation)

---

## 1. Contexte : Le "Vibe Coding"

### Origine du terme

Le terme **"vibe coding"** a ete invente par **Andrej Karpathy** (co-fondateur d'OpenAI, ex-directeur IA chez Tesla) en **fevrier 2025**. Sa definition originale :

> "There's a new kind of coding I call 'vibe coding', where you fully give in to the vibes, embrace exponentials, and forget that the code even exists."

### Ce que ca signifie concretement

Le vibe coding consiste a **decrire ce qu'on veut construire en langage naturel** et laisser l'IA gerer l'implementation. On s'appuie sur des prompts conversationnels pour generer du code et debugger les erreurs, plutot que de maitriser la syntaxe traditionnelle.

### Reconnaissance institutionnelle

Le **MIT Technology Review** a designe le "generative coding" comme l'une des **10 technologies de rupture de 2026**. Ce n'est plus une tendance marginale — c'est une revolution reconnue par les institutions les plus serieuses.

### Statistiques cles (2025-2026)

- **Microsoft** : 20-30% de son code est genere par l'IA
- **Google** : plus de 30% du nouveau code vient de l'IA (en hausse, etait a 25% quelques mois avant)
- **Mark Zuckerberg** (Meta) : predit que "peut-etre la moitie du developpement sera fait par l'IA" d'ici un an
- **95% des developpeurs** declarent utiliser des outils IA au moins une fois par semaine
- **75%** utilisent l'IA pour la moitie ou plus de leur travail

### Pourquoi c'est important pour la formation

Ce contexte valide la these centrale de la formation : **on n'a plus besoin de savoir coder pour construire des produits digitaux**. On a besoin de savoir **piloter l'IA**. Le vibe coding democratise la creation logicielle pour les personnes non-techniques — a condition de comprendre les outils et leurs limites.

---

## 2. Niveau 1 — Les Generateurs

Les generateurs sont des outils qui transforment une description en langage naturel en application fonctionnelle. Peu de controle, mais des resultats rapides. Ideal pour les debutants.

---

### 2.1 v0 by Vercel

**Site** : https://v0.dev / https://v0.app

#### Qu'est-ce que c'est ?

v0 est un **generateur de frontend alimente par l'IA**, construit par l'equipe derriere **Vercel** et **Next.js**. Il convertit des prompts en langage naturel en **composants React + Tailwind CSS** prets pour la production.

#### Comment ca marche ?

1. On decrit ce qu'on veut en francais/anglais (ex: "une page d'accueil pour un SaaS de fitness avec hero section, pricing et temoignages")
2. v0 genere plusieurs versions du composant
3. On choisit, on itere par le chat, on affine
4. On deploie en un clic sur Vercel

#### Ce qu'on peut construire

- Landing pages et sites vitrine
- Composants d'interface (formulaires, tableaux de bord, cartes)
- Prototypes UI rapides
- Pages marketing

#### Forces

- **Qualite visuelle exceptionnelle** : les composants generes sont propres et professionnels
- **Integration Vercel native** : deploiement en un clic
- **Apercu instantane** : on voit le resultat en temps reel
- **Design responsive** : comprend les concepts de design et genere du code adapte a tous les ecrans
- **Capacites avancees** : peut chercher sur le web, inspecter des sites existants, debugger, importer depuis Figma

#### Limites

- **Frontend uniquement** : ne genere PAS de backend, base de donnees ou authentification
- **React/Tailwind seulement** : pas de Vue, Angular, ou autres frameworks
- **Composants, pas applications** : genere des morceaux d'UI, pas une app complete
- **Qualite variable** : fonctionne bien pour des patterns UI classiques, mais peut avoir du mal avec des designs tres complexes ou sur-mesure
- **Necessite un dev pour assembler** : les non-developpeurs auront du mal a transformer les composants en application fonctionnelle

#### Pricing (2026)

| Plan | Prix | Credits | Details |
|------|------|---------|---------|
| **Free** | 0$/mois | 5$ de credits/mois | Deploy Vercel, Design Mode visuel, sync GitHub |
| **Premium** | 20$/mois | 20$ de credits/mois | Achat de credits supplementaires, imports Figma, API v0 |
| **Team** | 30$/user/mois | Credits partages | Collaboration, facturation centralisee |
| **Enterprise** | Sur devis | Custom | SSO, acces prioritaire, support dedie |

Le systeme est base sur les **tokens** (input/output) convertis en credits — plus previsible que l'ancien systeme de messages fixes.

#### Meilleur usage pour debutants

v0 est ideal pour **apprendre a generer des interfaces** et comprendre la logique prompt → resultat visuel. C'est le premier "wow moment" de la formation : decrire une page et la voir apparaitre en secondes.

---

### 2.2 Lovable (ex GPT Engineer)

**Site** : https://lovable.dev

#### Qu'est-ce que c'est ?

Lovable a commence comme le projet open-source **GPT Engineer**, rebaptise en 2024. Il se positionne comme **"le premier ingenieur IA full-stack au monde"**. C'est le plus accessible des generateurs pour les personnes non-techniques.

#### Trajectoire impressionnante

- **Decembre 2025** : Serie B de 330M$ a une valorisation de **6,6 milliards de dollars**
- **200M$ de revenus annuels recurrents** (ARR)
- Levee totale de **530M$**

#### Comment ca marche ?

1. On decrit son application en langage naturel
2. Lovable genere une **application complete** : frontend + backend + base de donnees + authentification
3. L'**Agent Mode** prend une description en anglais simple et genere l'app avec schema de base de donnees et auth
4. On itere par le chat pour affiner

#### L'arme secrete : l'integration Supabase

La force majeure de Lovable est son **integration profonde avec Supabase**. Quand on dit "ajoute l'authentification utilisateur", Lovable :
- Provisionne un projet Supabase
- Configure les tables d'authentification
- Ecrit les politiques de securite (Row Level Security)
- Connecte le frontend au backend

Depuis **Lovable Cloud**, cette integration est encore plus fluide : base de donnees production-ready, mises a jour temps reel, auth utilisateur et stockage — sans configurer Supabase separement.

#### Ce qu'on peut construire

- **MVPs complets** de SaaS
- Applications avec authentification utilisateur
- Marketplaces
- Tableaux de bord avec donnees
- Applications CRUD completes

#### Forces

- **Le plus accessible** pour les non-techniques : interface chat intuitive
- **Full-stack** : genere frontend + backend + base de donnees + auth
- **Phase de planification structuree** : comprend le besoin metier avant de generer
- **Integration Supabase profonde** : la partie la plus difficile (backend) est automatisee
- **Adapte aux entrepreneurs** : pense "produit", pas "code"

#### Limites

- **Le "probleme des 70%"** : vous amene a ~70% d'une application production-ready. Les derniers 30% necessitent souvent de l'aide technique
- **Securite** : un test reel a revele **14 vulnerabilites** dans une app Lovable, dont **3 critiques**
- **Credits limites** : le plan gratuit (5 credits/jour) s'epuise vite
- **Dependance Supabase** : moins flexible si on veut un autre backend
- **Personnalisation avancee** : les modifications fines deviennent compliquees sans connaissances techniques

#### Pricing (2026)

| Plan | Prix | Details |
|------|------|---------|
| **Free** | 0$/mois | 5 credits/jour (max 30/mois) |
| **Starter** | 20$/mois | Plus de messages, projets prives, pas de badge Lovable |
| **Pro (Launch)** | 50$/mois | 2,5x plus de messages, support prioritaire, evenements VIP |

Lovable Cloud : chaque workspace commence avec **25$ d'utilisation gratuite/mois** (offre temporaire jusqu'a fin Q1 2026).

**Cout moyen d'un MVP** : 50$ a 100$ en credits (les credits brulent pendant le debugging).

#### Comparaison avec v0

| Critere | v0 | Lovable |
|---------|-----|---------|
| **Perimetre** | Composants frontend | Application complete |
| **Backend** | Non | Oui (Supabase) |
| **Auth** | Non | Oui |
| **Base de donnees** | Non | Oui |
| **Cible** | Devs frontend | Non-techniques / entrepreneurs |
| **Deploiement** | Vercel | Integre |
| **Qualite UI** | Excellente | Tres bonne |

---

### 2.3 Bolt.new

**Site** : https://bolt.new

#### Qu'est-ce que c'est ?

Bolt.new est un **constructeur d'applications IA** qui genere des sites web, applications web et applications mobiles a partir d'un seul prompt. Il est construit sur la technologie **WebContainers de StackBlitz** — les projets tournent **entierement dans le navigateur**, zero installation locale.

#### Comment ca marche ?

1. On decrit son idee (texte, image, fichier Figma, ou repo GitHub)
2. L'**AI Enhancer** convertit les idees brutes en specifications techniques structurees
3. Bolt genere une application full-stack en temps reel dans un sandbox navigateur
4. On itere, on corrige, on deploie en un clic (sur Netlify)

#### Ce qui le differencie

- **Tout dans le navigateur** : aucune installation, aucune configuration locale. On ouvre bolt.new et on commence
- **Vitesse** : d'un prompt texte a une app fonctionnelle en **moins de 2 minutes**
- **Bolt V2 (octobre 2025)** : passage d'un outil experimental a un outil de grade entreprise
  - **Debugging autonome** : reduit les boucles d'erreur de **98%**
  - **Bolt Cloud** : bases de donnees integrees, hosting, authentification, analytics, stockage de fichiers
- **Inputs multiples** : texte, images, fichiers Figma, repositories GitHub
- **URLs Netlify editables** : changer l'URL de son site publie sans redeployer

#### Ce qu'on peut construire

- Sites web et landing pages
- Applications web full-stack
- Prototypes rapides
- Applications avec base de donnees et auth (via Bolt Cloud)

#### Forces

- **Zero configuration** : tout fonctionne dans le navigateur
- **Le plus rapide** des generateurs : prompt → app en < 2 minutes
- **Multi-input** : accepte texte, images, Figma, GitHub
- **Bolt Cloud** : solution hebergement + backend tout-en-un
- **Debugging autonome** (V2) : resout 98% des erreurs automatiquement

#### Limites

- **Consommation de tokens** : les projets plus gros consomment plus de tokens par message (l'IA synchronise tout le codebase)
- **Assume une certaine familiarite technique** : moins guide que Lovable pour les debutants complets
- **Branding Bolt** sur le plan gratuit
- **Le meme "probleme des 70%"** que Lovable : les derniers 30% vers la production necessitent du travail

#### Pricing (2026)

| Plan | Prix | Tokens/mois | Details |
|------|------|-------------|---------|
| **Free** | 0$/mois | 1M (300K/jour max) | Projets publics/prives, hosting, BDD illimitees, branding Bolt |
| **Pro** | 25$/mois | 10M (pas de limite quotidienne) | Sans branding, uploads 100MB, domaines custom, SEO, edition images IA |
| **Teams** | 30$/member/mois | Partages | Admin controls, workspaces partages |
| **Enterprise** | Jusqu'a 2000$/mois | Jusqu'a 1200M | Power users |

Facturation annuelle : -10% sur tous les plans payes.

---

## 3. Niveau 2 — Les Editeurs IA

Les editeurs IA sont des environnements de developpement (IDE) augmentes par l'intelligence artificielle. Plus de controle que les generateurs, mais necessitent de comprendre les bases du code.

---

### 3.1 Cursor

**Site** : https://cursor.com

#### Qu'est-ce que c'est ?

Cursor est un **editeur de code natif IA** construit sur VS Code, utilise par plus de **1 million de developpeurs** en 2026 (dont **360 000 payants** et **40 000 ingenieurs NVIDIA**). Valorise a **29 milliards de dollars**.

Contrairement a GitHub Copilot (qui ajoute l'IA a VS Code), Cursor a **reconstruit l'editeur autour de l'IA**.

#### Comment ca marche ?

- **Autocompletion predictive** : predit les prochaines 10 lignes de code avec une precision remarquable
- **Edition multi-fichiers** : l'IA comprend le contexte de tout le projet et peut modifier plusieurs fichiers simultanement
- **Chat contextuel** : pas juste un chatbot — il comprend votre codebase entier
- **Detection d'erreurs temps reel** : identifie les erreurs et stack traces et suggere des corrections automatiquement
- **Agents en arriere-plan** : peuvent travailler sur des taches pendant qu'on code
- **@Codebase** : recherche semantique avancee dans tout le projet

#### Ce qui le differencie de VS Code

- Meme interface (fork de VS Code), **100% compatible** avec toutes les extensions VS Code
- Mais l'IA est integree **au niveau du noyau**, pas comme un plugin
- Experience fluide : l'IA est partout (autocompletion, chat, edition, terminal)

#### Pour qui ?

- **Developpeurs** qui veulent accelerer leur workflow
- **Apprenants** qui veulent comprendre le code genere
- **Equipes** qui veulent standardiser leurs pratiques avec l'IA
- Dans le contexte de la formation : pour les etudiants qui veulent **plus de controle** et comprendre ce qui se passe

#### Forces

- **Le plus populaire** des editeurs IA en 2026
- **Autocompletion superieure** : la meilleure du marche
- **Context-aware** : comprend tout le projet, pas juste le fichier courant
- **Multi-modeles** : supporte Claude, GPT-4o, Gemini
- **Ecosysteme VS Code** : toutes les extensions fonctionnent

#### Limites

- **Changement de pricing controverse** (juin 2025) : passage d'un systeme fixe (500 requetes) a un systeme de credits, reduisant effectivement les requetes a ~225/mois au meme prix. Le CEO a du s'excuser publiquement
- **Courbe d'apprentissage** : necessite de comprendre les bases du code pour en tirer parti
- **Pas un generateur** : ne cree pas d'application a partir de zero comme Lovable/Bolt

#### Pricing (2026)

| Plan | Prix | Details |
|------|------|---------|
| **Hobby** | 0$/mois | 2000 completions, 50 requetes premium lentes |
| **Pro** | 20$/mois | Completions illimitees + pool de credits pour modeles premium |
| **Pro+** | 60$/mois | Plus de credits |
| **Ultra** | 200$/mois | Usage intensif |
| **Teams** | 40$/user/mois | Admin, collaboration |

Facturation annuelle : -20% sur les plans payes.

---

### 3.2 Windsurf (ex Codeium)

**Site** : https://windsurf.com

#### Qu'est-ce que c'est ?

Windsurf est un **editeur de code IA agentique**. Anciennement Codeium, rebaptise en 2025. Rachete par **Cognition AI** (createurs de Devin) en decembre 2025 pour ~250M$.

#### Philosophie

La ou Cursor met l'IA **au service du developpeur**, Windsurf brouille la frontiere entre "vous tapez" et "l'IA tape". L'IA n'est pas un outil qu'on invoque — c'est un **partenaire** avec lequel on collabore en temps reel.

#### Feature cle : Cascade

**Cascade** est le systeme central de Windsurf. Il :
- Comprend le **contexte entier du projet** de maniere persistante
- Suggere des modifications multi-fichiers
- Execute des commandes terminal
- **Se souvient** des conversations precedentes (contrairement a d'autres outils qui rechargent le contexte a chaque session)

#### Comparaison avec Cursor

| Critere | Cursor | Windsurf |
|---------|--------|----------|
| **Prix Pro** | 20$/mois | 15$/mois |
| **Philosophie** | Controle developeur + IA | Collaboration fluide IA/humain |
| **Autocompletion** | Legerement meilleure | Excellente |
| **Gros projets (500K+ lignes)** | Plus fiable | Peut avoir des difficultes |
| **Memoire de contexte** | Rechargee a chaque session | Persistante (Cascade) |
| **Communaute** | 180K+ sur r/cursor | Plus petite mais croissante |
| **Meilleur pour** | IDE IA natif, gros projets | Budget serre, collaboration fluide |

#### Forces

- **Meilleur rapport qualite/prix** : 15$/mois vs 20$ pour Cursor
- **Cascade** : memoire persistante du projet
- **Collaboration fluide** : l'IA participe naturellement au workflow
- **Plan gratuit genereux** : completions de code illimitees + 25 credits prompt/mois

#### Limites

- **Gros projets** : moins fiable que Cursor sur les codebases massifs (500K+ lignes)
- **Communaute plus petite** : moins de ressources et tutoriels
- **Avenir incertain post-acquisition** : le rachat par Cognition AI pourrait changer la direction du produit
- **Indexation** : l'auto-indexation de Windsurf est moins mature que la recherche semantique de Cursor

#### Pricing (2026)

| Plan | Prix | Details |
|------|------|---------|
| **Free** | 0$/mois | 25 credits prompt/mois |
| **Pro** | 15$/mois | 500 credits |
| **Teams** | 30$/user/mois | Collaboration |
| **Enterprise** | 60$/user/mois | SSO, audit, support |

---

## 4. Niveau 3 — Les Assistants Code

Les assistants code sont des agents autonomes qui operent dans le terminal. Le niveau de controle et de puissance le plus eleve — mais aussi le plus technique.

---

### 4.1 Claude Code (Anthropic CLI)

**Site** : https://code.claude.com | https://github.com/anthropics/claude-code

#### Qu'est-ce que c'est ?

Claude Code est un **outil de coding agentique en ligne de commande (CLI)** qui vit dans votre terminal. Ce n'est **pas un IDE** — c'est un **agent autonome** qui peut lire votre codebase, editer des fichiers, executer des commandes et resoudre des problemes complexes.

#### Comment ca marche ?

1. On ouvre son terminal
2. On lance `claude` dans le repertoire du projet
3. On decrit ce qu'on veut en langage naturel
4. Claude Code **lit le codebase**, **planifie** une strategie multi-etapes, **execute** les modifications, et **demande approbation** avant chaque action
5. On valide ou on ajuste

#### Pourquoi c'est "le plus puissant" ?

- **Raisonnement architectural** : ne genere pas juste du code — il **pense** l'architecture, les patterns, les separations de responsabilites
- **Contexte massif** : fenetre de contexte de **1M tokens** (plans Max, Team, Enterprise) — peut comprendre des projets enormes
- **Agent Teams** (Opus 4.6) : orchestration multi-agents parallele — plusieurs instances de Claude travaillent simultanement sur differentes parties d'une tache
- **Code le plus maintenable** : dans les comparatifs, le code genere par Claude Code est le plus propre, avec separation des responsabilites, patterns coherents, blocs try/catch et messages d'erreur significatifs
- **MCP (Model Context Protocol)** : integration standard avec Figma, Jira, GitHub, et d'autres outils
- **Leader des benchmarks** : meilleur score sur SWE-bench (taches de coding du monde reel)

#### Plateformes disponibles

- **CLI** : terminal natif (macOS, Linux, Windows 11)
- **Extensions IDE** : VS Code, Cursor, Windsurf, JetBrains
- **App Desktop** : application native
- **Web** : version navigateur connectee a GitHub, taches paralleles sur infrastructure cloud Anthropic

#### Outils recents (2026)

- **Claude Cowork** (janvier 2026) : version avec interface graphique pour les non-techniques
- **Claude Code Security** (fevrier 2026) : revue de codebase pour identifier les vulnerabilites
- **Elicitation MCP** : les serveurs MCP peuvent demander des inputs structures pendant une tache via un dialogue interactif

#### Forces

- **Le plus puissant** pour les taches complexes multi-fichiers
- **Raisonnement superieur** : pense comme un architecte, pas comme un completeur de code
- **Autonomie reelle** : peut planifier, executer et verifier
- **Code de qualite superieure** : le plus maintenable des comparatifs
- **Contexte de 1M tokens** : comprend des projets massifs
- **Outil #1 des developpeurs** : a depasse GitHub Copilot et Cursor en seulement 8 mois (lance en mai 2025)

#### Limites

- **Le plus technique** des outils : necessite un terminal, des concepts de base (fichiers, repertoires, git)
- **Pas d'interface visuelle** (sauf extensions IDE) : l'experience principale est dans le terminal
- **Necessite un abonnement payant** : pas de plan gratuit pour Claude Code
- **Courbe d'apprentissage** : le plus difficile a prendre en main pour un debutant

#### Pricing (2026)

| Plan | Prix | Details |
|------|------|---------|
| **Pro** | 20$/mois (17$/an) | Acces Claude Code, usage standard |
| **Max 5x** | 100$/mois | 5x plus d'usage que Pro |
| **Max 20x** | 200$/mois | 20x plus d'usage que Pro |
| **Team Standard** | 25$/user/mois | Collaboration equipe |
| **Team Premium** | 150$/user/mois | Acces Claude Code + usage eleve |

---

### 4.2 OpenAI Codex CLI

**Site** : https://openai.com/codex | https://github.com/openai/codex

#### Qu'est-ce que c'est ?

Codex CLI est l'**agent de coding d'OpenAI** qui fonctionne dans le terminal. Open source, construit en **Rust** (pour la performance). Disponible sur plusieurs surfaces : CLI, web (chatgpt.com/codex), extensions IDE, et application desktop macOS.

#### Comment ca marche ?

1. Installation : `npm i -g @openai/codex` ou `brew install --cask codex`
2. Authentification avec un compte ChatGPT ou une cle API
3. On lance `codex` pour une session interactive dans le terminal
4. On peut switcher entre modeles (GPT-5.4, GPT-5.3-Codex) avec `/model`

#### Ce qui le differencie de Claude Code

| Critere | Claude Code | Codex CLI |
|---------|-------------|-----------|
| **Philosophie** | Developeur dans la boucle, local | Local + delegation cloud asynchrone |
| **Modele phare** | Opus 4.6 | GPT-5.3-Codex |
| **Force** | Raisonnement architectural, code maintenable | Taches terminal-native (DevOps, scripts, CI/CD) |
| **Terminal-Bench 2.0** | 65,4% | **77,3%** (leader) |
| **SWE-bench** | **Leader** | Second |
| **Multi-modal** | Texte + code | Texte + code + **images** (screenshots, diagrammes) |
| **Open source** | Oui (GitHub) | Oui (GitHub, Rust) |
| **Agent Teams** | Oui (multi-agents paralleles) | Non (mais delegation cloud) |
| **Contexte** | 1M tokens | Plus limite |

#### Forces

- **Open source** et construit en Rust (rapide)
- **Multi-modal** : accepte images, screenshots, diagrammes en input
- **Leader sur Terminal-Bench** : meilleur pour les workflows DevOps, scripts, outils CLI
- **Multi-surface** : CLI + web + IDE + desktop macOS
- **Inclus dans ChatGPT Plus** : pas d'abonnement supplementaire si on a deja ChatGPT

#### Limites

- **Moins bon sur le raisonnement architectural** que Claude Code
- **Code moins maintenable** dans les comparatifs
- **Windows experimental** : support limite
- **Pas d'Agent Teams** : pas d'orchestration multi-agents

#### Pricing (2026)

Codex CLI est **inclus dans les abonnements ChatGPT** — pas de prix separe :

| Plan ChatGPT | Prix | Acces Codex |
|--------------|------|-------------|
| **Go** | 8$/mois | Oui |
| **Plus** | 20$/mois | Oui |
| **Pro** | 200$/mois | Oui, usage eleve |
| **Business** | Custom | Oui |

**API** : modele codex-mini-latest a 1,50$/1M tokens en entree, 6$/1M tokens en sortie.

---

## 5. Tableau Comparatif Complet

### Par niveau

| Outil | Niveau | Facilite | Controle | Ce qu'on peut construire | Prix depart | Ideal pour |
|-------|--------|----------|----------|--------------------------|-------------|------------|
| **v0** | Generateur | ★★★★★ | ★★☆☆☆ | Composants UI, landing pages | Gratuit (5$/credits) | Maquettes rapides, UI |
| **Lovable** | Generateur | ★★★★★ | ★★☆☆☆ | Apps completes, MVPs, SaaS | Gratuit (5 credits/jour) | Non-techniques, entrepreneurs |
| **Bolt.new** | Generateur | ★★★★☆ | ★★★☆☆ | Apps web, prototypes | Gratuit (1M tokens) | Prototypage rapide |
| **Cursor** | Editeur IA | ★★★☆☆ | ★★★★☆ | Tout type de projet code | Gratuit (limite) | Devs, apprenants avances |
| **Windsurf** | Editeur IA | ★★★☆☆ | ★★★★☆ | Tout type de projet code | Gratuit (25 credits) | Budget serre, collaboration |
| **Claude Code** | Assistant Code | ★★☆☆☆ | ★★★★★ | Projets complexes, architecture | 20$/mois | Pilotage avance, projets serieux |
| **Codex CLI** | Assistant Code | ★★☆☆☆ | ★★★★★ | Projets complexes, DevOps | 8$/mois (via ChatGPT) | DevOps, scripts, multi-modal |

### Par cas d'usage

| Besoin | Meilleur outil | Pourquoi |
|--------|---------------|----------|
| "Je veux une landing page en 5 min" | **v0** | Qualite UI exceptionnelle, deploiement Vercel instantane |
| "Je veux un MVP complet sans coder" | **Lovable** | Full-stack, Supabase integre, le plus accessible |
| "Je veux prototyper tres vite" | **Bolt.new** | Le plus rapide, tout dans le navigateur |
| "Je veux comprendre et controler le code" | **Cursor** | IDE complet, autocompletion, multi-fichiers |
| "Je veux un IDE IA a petit prix" | **Windsurf** | 15$/mois, Cascade, bon rapport qualite/prix |
| "Je veux construire un vrai produit" | **Claude Code** | Raisonnement architectural, code maintenable, le plus puissant |
| "J'ai deja ChatGPT et je veux coder" | **Codex CLI** | Inclus dans l'abonnement, multi-modal |

---

## 6. La Progression Pedagogique

### Pourquoi commencer par les generateurs et progresser vers les assistants code ?

#### Etape 1 : Generateurs — Le "wow moment" (Semaines 1-2)

**Objectif** : Decouvrir qu'on peut creer avec l'IA, gagner en confiance.

Les generateurs (v0, Lovable, Bolt) offrent :
- **Gratification instantanee** : prompt → resultat en secondes/minutes
- **Zero pre-requis technique** : pas besoin de terminal, fichiers, git
- **Interface familiere** : chat, comme WhatsApp ou ChatGPT
- **Resultats visuels** : on voit son produit, pas du code

C'est la phase ou l'etudiant **tombe amoureux de la possibilite**. Il se dit : "Si je peux faire CA en 5 minutes, qu'est-ce que je pourrais faire en une semaine ?"

#### Etape 2 : Editeurs IA — Le controle (Semaines 3-6)

**Objectif** : Comprendre ce que l'IA genere, pouvoir modifier et iterer avec precision.

Les editeurs IA (Cursor, Windsurf) introduisent :
- **Le concept de fichiers et de structure de projet**
- **La possibilite de modifier le code genere** au lieu de tout regenerer
- **La comprehension des erreurs** : lire un message d'erreur et comprendre quoi faire
- **L'iteration precise** : changer une couleur, un texte, un comportement specifique

C'est la phase ou l'etudiant passe de **consommateur** a **pilote**. Il ne demande plus "fais-moi une app" — il dit "change cette section, ajoute ce bouton, corrige cette erreur".

#### Etape 3 : Assistants Code — La maitrise (Semaines 7-12)

**Objectif** : Piloter l'IA comme un chef de projet pilote une equipe de developpeurs.

Les assistants code (Claude Code, Codex CLI) permettent :
- **La planification architecturale** : penser la structure avant de coder
- **Le travail multi-fichiers** : l'IA comprend et modifie des projets entiers
- **L'automatisation** : tests, deploiement, maintenance
- **La qualite production** : code propre, maintenable, securise

C'est la phase ou l'etudiant devient **chef de projet IA**. Il sait ce qu'il veut, il sait comment le demander, et il comprend assez pour valider le resultat.

### La courbe d'apprentissage

```
Puissance & Controle
     ^
     |                                    ● Claude Code / Codex CLI
     |                                   /
     |                                  /
     |                        ● Cursor / Windsurf
     |                       /
     |                      /
     |           ● Bolt.new
     |          /
     |     ● Lovable
     |    /
     |  ● v0
     |
     +-------------------------------------------------> Competences requises
       "Je parle"    "Je vois le code"    "Je pilote l'IA"
```

### Analogie pour les etudiants

- **Generateurs** = Taxi (on dit ou on veut aller, on ne conduit pas)
- **Editeurs IA** = Voiture avec GPS et assistance (on conduit, mais avec beaucoup d'aide)
- **Assistants Code** = Voiture de course (on pilote, avec toute la puissance — mais il faut savoir conduire)

---

## 7. Exemples Concrets et Reels

### Ce qu'une personne non-technique peut construire

#### Avec les Generateurs

**v0 :**
- Une landing page professionnelle pour son business en **5 minutes**
- Un portfolio personnel responsive
- Une page de pricing avec comparaison de plans
- Un formulaire de contact avec validation
- Temps moyen : **5-30 minutes** par page

**Lovable :**
- Un **MVP complet de marketplace** avec auth Supabase, integration Stripe, UI soignee — en **4 heures** pour environ **25$ de credits**
- Exemple reel : **Backchannel** — un fondateur (Mindaugas) est passe de l'idee a des clients payants sans ecrire une ligne de code
- Un SaaS avec tableau de bord, gestion utilisateurs, et base de donnees
- Temps moyen : **2-8 heures** pour un MVP fonctionnel

**Bolt.new :**
- Un prototype fonctionnel en **moins de 2 minutes** a partir d'un prompt
- Une application web complete deployee sur Netlify
- Un outil interne avec base de donnees (via Bolt Cloud)
- Temps moyen : **30 minutes - 4 heures** pour une app fonctionnelle

#### Avec les Editeurs IA

**Cursor / Windsurf :**
- Modifier et personnaliser en profondeur une app generee par Lovable/Bolt
- Creer un site web complet avec animations, interactions avancees
- Ajouter des fonctionnalites que les generateurs ne savent pas faire
- Debugger et corriger les problemes des generateurs
- Temps moyen : **quelques heures a quelques jours** selon la complexite

#### Avec les Assistants Code

**Claude Code :**
- Construire un **systeme complet** avec architecture propre
- Gerer un projet avec plusieurs composants interconnectes
- Automatiser des workflows (tests, deploiement, CI/CD)
- Creer des APIs, des services backend, des integrations complexes
- Temps moyen : **quelques jours a quelques semaines** pour un produit complet

### Cas d'usage de la formation

Un etudiant non-technique de la formation pourrait, en 3 mois :

1. **Semaine 1** : Creer sa premiere landing page avec v0 + la deployer sur Vercel (URL live)
2. **Semaine 2-3** : Construire un MVP de son idee avec Lovable (app complete avec auth et BDD)
3. **Semaine 4-6** : Ouvrir Cursor pour personnaliser et ameliorer son MVP
4. **Semaine 7-9** : Passer a Claude Code pour ajouter des fonctionnalites avancees
5. **Semaine 10-12** : Avoir un produit deployable, testable, montrable a des investisseurs ou clients

---

## 8. Le Deploiement avec Vercel

### Pourquoi Vercel ?

Vercel est la plateforme de deploiement la plus simple du marche. C'est le createur de Next.js et v0 — tout l'ecosysteme est integre.

### Les etapes pour un debutant

#### Methode 1 : Deploiement direct depuis v0

1. **Creer son projet dans v0** : decrire ce qu'on veut via le chat
2. **Cliquer sur "Publish"** : un seul bouton
3. **Obtenir son URL** : `votre-projet.vercel.app` — c'est en ligne
4. **Iterer** : chaque "Deploy Changes" remplace la version precedente automatiquement
5. **En cas d'erreur** : cliquer sur "Fix with v0" — l'IA diagnostique et corrige

#### Methode 2 : Deploiement via GitHub

1. **Sync GitHub** depuis v0 ou Cursor
2. **Connecter Vercel a GitHub** : se connecter sur vercel.com, lier son repo
3. **Deploiement automatique** : chaque push sur la branche main declenche un deploiement
4. **Preview deployments** : chaque pull request genere une URL de preview
5. **Custom domain** : ajouter son propre domaine, SSL automatique

#### Ce que Vercel gere automatiquement

- **HTTPS/SSL** : certificat provisionne automatiquement
- **CDN global** : le site est servi depuis le serveur le plus proche de l'utilisateur
- **Serverless** : pas de serveur a gerer
- **Rollbacks** : revenir a une version precedente en un clic
- **Analytics** : voir le trafic et les performances

#### Pricing Vercel

| Plan | Prix | Ideal pour |
|------|------|------------|
| **Hobby** | Gratuit | Projets personnels, prototypes |
| **Pro** | 20$/mois | Projets serieux, domaines custom |
| **Enterprise** | Sur devis | Entreprises |

**Pour la formation** : le plan gratuit suffit pour tous les projets des etudiants.

---

## 9. Tendances et Direction du Marche

### Les grandes tendances 2025-2026

#### 1. Des outils aux agents

L'industrie est passee d'une IA qui **repond** a une IA qui **agit**. Les agents peuvent maintenant :
- Naviguer sur le web
- Executer du code
- Gerer des fichiers
- Orchestrer des workflows multi-etapes
- Ameliorer leurs propres capacites
- Fonctionner en continu sur des machines

#### 2. Le "vibe coding" mature

Ce qui etait un concept experimental en fevrier 2025 est devenu une **pratique etablie** en 2026. La MIT Technology Review l'a reconnu comme technologie de rupture. Les outils sont plus fiables, plus puissants, et plus accessibles.

#### 3. La guerre des prix et des tokens

L'un des debats les plus vifs dans la communaute developpeur est **"quel outil ne va pas bruler mes credits ?"**. Les modeles de pricing sont maintenant discutes avec autant de passion que les capacites des outils. Les developpeurs gravitent vers les outils qui delivrent **plus par token** : meilleure gestion de contexte, moins de retries, des resultats corrects du premier coup.

#### 4. Claude Code : #1 en 8 mois

Claude Code est passe de zero a **outil #1** des developpeurs en seulement 8 mois (lance en mai 2025). Il a depasse GitHub Copilot et Cursor — un fait remarquable qui montre la vitesse d'evolution du marche.

#### 5. Consolidation et rachats

- **Windsurf rachete par Cognition AI** (decembre 2025, ~250M$)
- **Lovable** : Series B de 330M$ a 6,6Mds$ de valorisation
- **Cursor** : valorise a 29Mds$
- Le marche se consolide rapidement autour de quelques gros acteurs

#### 6. L'intelligence de repository

La prochaine frontiere n'est pas juste comprendre les lignes de code, mais comprendre les **relations et l'historique** derriere elles. L'IA commence a comprendre pourquoi le code a ete ecrit ainsi, pas juste ce qu'il fait.

#### 7. Limites et prudence

Malgre l'enthousiasme, des voix prudentes emergent :
- **Taux d'acceptation ~30%** pour les suggestions Copilot
- **45% des outputs testes** contiennent des patterns de vulnerabilites connues (Veracode)
- **Baisse de 27,5%** de l'emploi des programmeurs entre 2023 et 2025
- Certains developpeurs rapportent **aucune baisse de productivite** apres avoir arrete d'utiliser ces outils

### Ce que les etudiants doivent savoir

1. **Le marche evolue tres vite** : les outils d'aujourd'hui seront depasses dans 6-12 mois. Apprendre a **apprendre de nouveaux outils** est plus important qu'apprendre un outil specifique
2. **Les prix vont baisser** et les capacites vont augmenter — c'est le bon moment pour se former
3. **La qualite du prompt est la competence cle** : savoir decrire ce qu'on veut est plus important que savoir coder
4. **Le "probleme des 70%"** : les outils vous amenent a 70% du chemin. Les derniers 30% sont la ou la valeur reelle est creee — et c'est la que la formation fait la difference
5. **La securite est un angle mort** : les outils generent du code fonctionnel mais pas necessairement securise. Il faut en etre conscient
6. **Piloter l'IA est une competence du futur** : 95% des developpeurs utilisent deja ces outils. Ceux qui savent les piloter auront un avantage enorme

---

## 10. Recommandations pour la Formation

### Stack recommande pour le programme

| Phase | Outil principal | Outil secondaire | Pourquoi |
|-------|----------------|-------------------|----------|
| **Decouverte** (S1-2) | v0 | Lovable | "Wow moment" + premier deploiement |
| **Construction** (S3-4) | Lovable | Bolt.new | MVP complet sans code |
| **Personnalisation** (S5-6) | Cursor | Windsurf (alternative budget) | Comprendre et modifier le code |
| **Maitrise** (S7-10) | Claude Code | Codex CLI (exploration) | Piloter l'IA comme un pro |
| **Production** (S11-12) | Claude Code + Vercel | - | Deployer un vrai produit |

### Budget etudiant estime

| Outil | Cout/mois | Notes |
|-------|-----------|-------|
| v0 | 0$ | Plan gratuit suffisant |
| Lovable | 0-20$ | Plan gratuit pour decouvrir, Starter pour le MVP |
| Bolt.new | 0$ | Plan gratuit suffisant pour prototypage |
| Cursor | 0-20$ | Plan gratuit pour decouvrir, Pro recommande |
| Claude Code | 20$ | Pro minimum requis |
| Vercel | 0$ | Plan Hobby gratuit |
| **TOTAL** | **20-60$/mois** | Pendant la phase active de construction |

### Points pedagogiques cles

1. **Chaque outil a sa place** : il ne s'agit pas de choisir "le meilleur" mais d'utiliser le bon outil pour le bon besoin
2. **La progression est naturelle** : generateur → editeur → assistant, comme apprendre a conduire
3. **Le prompt engineering est transversal** : la competence de bien decrire ce qu'on veut s'applique a TOUS les outils
4. **L'erreur est le meilleur professeur** : quand l'IA fait une erreur, c'est l'opportunite d'apprendre a la corriger et a mieux formuler
5. **Le deploiement des le debut** : chaque etudiant doit avoir une URL live des la premiere semaine — rien ne motive plus que de montrer son travail au monde

---

## Sources

### v0 by Vercel
- [Vercel v0 Pricing Guide 2026 - UI Bakery](https://uibakery.io/blog/vercel-v0-pricing-explained-what-you-get-and-how-it-compares)
- [v0 Pricing officiel](https://v0.app/pricing)
- [Vercel v0 Pricing - Shipper](https://shipper.now/v0-pricing/)
- [Vercel v0 Review 2025 - Trickle](https://trickle.so/blog/vercel-v0-review)
- [v0 Complete Guide - Prismetric](https://www.prismetric.com/what-is-vercel-v0/)
- [Updated v0 Pricing - Vercel Blog](https://vercel.com/blog/updated-v0-pricing)
- [v0 Deployments Docs](https://v0.app/docs/deployments)

### Lovable
- [Lovable Pricing officiel](https://lovable.dev/pricing)
- [Lovable Review 2026 - UCStrategies](https://ucstrategies.com/news/lovable-dev-review-2026-pricing-features-pros-cons-explained/)
- [Lovable vs Top AI Builders - ToolJet](https://blog.tooljet.com/lovable-vs-top-ai-app-builders/)
- [Lovable vs Bolt vs v0 - ToolJet](https://blog.tooljet.com/lovable-vs-bolt-vs-v0/)
- [8 AI Platforms 2026 - Lovable](https://lovable.dev/guides/top-ai-platforms-app-development-2026)

### Bolt.new
- [Bolt Pricing officiel](https://bolt.new/pricing)
- [Bolt.new Review 2026 - Banani](https://www.banani.co/blog/bolt-new-ai-review-and-alternatives)
- [Bolt Review 2026 - Taskade](https://www.taskade.com/blog/bolt-review)
- [Bolt Review 2026 - NoCode MBA](https://www.nocode.mba/articles/bolt-ai-new-guide)
- [Bolt Pricing 2026 - NoCode MBA](https://www.nocode.mba/articles/bolt-pricing-2026)

### Cursor
- [Cursor Pricing 2026 - AI Tool Discovery](https://www.aitooldiscovery.com/guides/cursor-ai-pricing)
- [Cursor Review 2026 - NxCode](https://www.nxcode.io/resources/news/cursor-review-2026)
- [Cursor Review 2026 - Taskade](https://www.taskade.com/blog/cursor-review)
- [Zed vs Cursor vs VS Code 2026 - DevToolReviews](https://www.devtoolreviews.com/reviews/zed-vs-cursor-vs-vs-code-2026)
- [Cursor Pricing 2026 - NoCode MBA](https://www.nocode.mba/articles/cursor-pricing)

### Windsurf
- [Codeium vs Cursor 2026 - UI Bakery](https://uibakery.io/blog/codeium-vs-cursor)
- [AI Code Tools Comparison 2026 - CalmOps](https://calmops.com/ai/ai-coding-tools-comparison-2026-cursor-windsurf/)
- [Windsurf vs Cursor 2026 - MarkAICode](https://markaicode.com/vs/windsurf-vs-cursor/)
- [Windsurf Review 2026 - Taskade](https://www.taskade.com/blog/windsurf-review)
- [Windsurf vs Cursor 2026 - Design Revision](https://designrevision.com/blog/windsurf-vs-cursor)

### Claude Code
- [Claude Code Overview - Docs officiels](https://code.claude.com/docs/en/overview)
- [Claude Code - Anthropic](https://www.anthropic.com/claude-code)
- [Claude Code GitHub](https://github.com/anthropics/claude-code)
- [Inside Claude Code - Medium](https://medium.com/@dingzhanjun/inside-claude-code-a-deep-dive-into-anthropics-agentic-cli-assistant-a4bedf3e6f08)
- [Claude Code Pricing - ClaudeLog](https://claudelog.com/claude-code-pricing/)
- [How to Use Claude Code - Builder.io](https://www.builder.io/blog/how-to-use-claude-code)

### OpenAI Codex CLI
- [Codex CLI Docs](https://developers.openai.com/codex/cli)
- [Codex GitHub](https://github.com/openai/codex)
- [Codex vs Claude Code - Builder.io](https://www.builder.io/blog/codex-vs-claude-code)
- [Claude Code vs Codex - Northflank](https://northflank.com/blog/claude-code-vs-openai-codex)
- [Codex vs Claude Code - DataCamp](https://www.datacamp.com/blog/codex-vs-claude-code)
- [Codex vs Claude Code 2026 - SmartScope](https://smartscope.blog/en/generative-ai/chatgpt/codex-vs-claude-code-2026-benchmark/)

### Comparatifs et tendances
- [V0 vs Bolt vs Lovable 2026 - NxCode](https://www.nxcode.io/resources/news/v0-vs-bolt-vs-lovable-ai-app-builder-comparison-2025)
- [V0 vs Bolt vs Lovable 2026 - Free Academy](https://freeacademy.ai/blog/v0-vs-bolt-vs-lovable-ai-app-builders-comparison-2026)
- [Cursor vs Windsurf vs Claude Code 2026 - DEV Community](https://dev.to/pockit_tools/cursor-vs-windsurf-vs-claude-code-in-2026-the-honest-comparison-after-using-all-three-3gof)
- [Generative Coding Breakthrough 2026 - MIT Technology Review](https://www.technologyreview.com/2026/01/12/1130027/generative-coding-ai-software-2026-breakthrough-technology/)
- [AI Coding Trends 2026 - Code Week EU](https://codeweek.eu/blog/ai-coding-tech-trends-2026/)
- [AI Tooling for Software Engineers 2026 - Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/ai-tooling-2026)
- [AI Coding Statistics 2026 - NetCorp](https://www.netcorpsoftwaredevelopment.com/blog/ai-generated-code-statistics)
- [Vibe Coding - Wikipedia](https://en.wikipedia.org/wiki/Vibe_coding)
- [Andrej Karpathy - Tweet original](https://x.com/karpathy/status/1886192184808149383)
- [Best AI Coding Agents 2026 - Faros AI](https://www.faros.ai/blog/best-ai-coding-agents-2026)
