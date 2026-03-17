# Session 4 — Le paysage IA 2026

> Dimanche, Semaine 2 | Video pre-session (15 min) : "Claude, Cursor, Codex — c'est quoi la difference ?"
> **Artefact** : une page construite avec un editeur IA (pas un generateur)

---

## Structure de la session (2h)

| Temps | Bloc | Contenu |
|-------|------|---------|
| 0:00-0:01 | Accueil | Emoji check-in |
| 0:01-0:06 | Retrieval quiz | 3 questions sur S3 |
| 0:06-0:10 | Connexion narrative | "On comprend le digital. Maintenant les outils pour CONSTRUIRE." |
| 0:10-0:45 | Les 3 categories d'outils IA + demo | Generateurs, editeurs, assistants code |
| 0:45-0:50 | Pause active | Stretch |
| 0:50-1:50 | Exercice pratique | Construire avec un editeur IA |
| 1:50-1:56 | Debrief 3-2-1 | 3 choses / 2 questions / 1 action |
| 1:56-2:00 | Annonce exercice + preview M2 | Description + teaser du Module 2 |

---

## Retrieval quiz (5 min)

3 questions sur S3 :

1. "Qu'est-ce que le frigo dans notre analogie restaurant ?" (la base de donnees — stocke les donnees)
2. "Donnez un exemple de fournisseur (API tierce) qu'une app utilise" (Google Maps, Stripe, etc.)
3. "Quelle est la difference entre authentification et autorisation ?" (qui tu es vs ce que tu as le droit de faire)

---

## PARTIE 1 — Les 3 categories d'outils IA (35 min)

### 1.1 La progression naturelle (5 min)

"En S1, vous avez utilise v0 pour deployer une landing page. v0 est un GENERATEUR : vous decrivez, il genere. C'est magique, mais vous n'avez pas beaucoup de controle."

"Aujourd'hui, on va voir les 3 niveaux d'outils IA. Chaque niveau donne PLUS de controle."

**L'analogie de la construction** :
1. **Generateur** = Commander une maison prefabriquee. Tu choisis le modele, c'est livree pret a habiter. Simple, rapide, peu personnalisable.
2. **Editeur IA** = Travailler avec un architecte qui dessine et modifie en temps reel selon tes retours. Plus de controle, mais tu dois savoir ce que tu veux.
3. **Assistant code** = Avoir une equipe de construction a tes ordres. Tu diriges tout, ils executent. Le plus puissant, mais tu dois savoir diriger.

"Dans cette formation, on progresse du generateur vers l'assistant code. A la fin, vous piloterez l'IA comme un chef de chantier."

### 1.2 Niveau 1 — Les generateurs (8 min)

**Ce qu'ils sont** : Des outils ou tu decris ce que tu veux en langage naturel, et l'IA genere le resultat.

#### v0 by Vercel
- **Quoi** : Generateur d'interfaces (UI) par prompt texte
- **Comment** : Tu decris → v0 genere du code React/Tailwind → apercu en direct
- **Forces** : Resultats visuellement soignes, deploiement Vercel en 1 clic
- **Limites** : Controle limite, peu adapte au backend
- **Prix** : Gratuit (limite), Premium ~$20/mois
- **Usage en formation** : S1 Quick Win

#### Bolt.new (StackBlitz)
- **Quoi** : IDE cloud avec IA integree
- **Comment** : Tout dans le navigateur, IA genere et modifie en temps reel
- **Forces** : Pas d'installation, plusieurs frameworks supportes
- **Limites** : Consommation de tokens rapide
- **Prix** : Gratuit (limite), ~$20-40/mois

### 1.3 Niveau 2 — Les editeurs IA (8 min)

**Ce qu'ils sont** : Des editeurs de code (comme Word, mais pour du code) avec l'IA integree qui comprend le projet entier.

**La transition** : "Les generateurs montrent leurs limites quand on veut modifier specifiquement. 'Je veux changer CE bouton, pas refaire toute la page.' C'est la que les editeurs IA entrent en jeu."

#### Cursor
- **Quoi** : Fork de VS Code avec IA native (Claude, GPT-4)
- **Comment** : L'IA indexe et comprend tout le codebase. Tu demandes des modifications specifiques.
- **Forces** :
  - Controle granulaire (on voit chaque ligne modifiee)
  - Tab completion intelligente (l'IA devine la suite)
  - Chat contextuel qui comprend le projet
  - Composer pour des changements multi-fichiers
- **Limites** : Installation locale, courbe d'apprentissage
- **Prix** : Gratuit (limite), Pro $20/mois
- **Pour la formation** : C'est le "sweet spot" — M2-M3

#### Windsurf (Codeium)
- **Quoi** : Editeur similaire a Cursor, concurrent direct
- **Comment** : Mode "Cascade" qui enchaine les actions automatiquement
- **Forces** : Interface epuree, bon pour les debutants
- **Limites** : Communaute plus petite
- **Prix** : Gratuit (genereux), Pro $15/mois

**Demo live** (5 min) : Ouvrir le meme mini-projet dans Cursor. Montrer :
1. Le chat contextuel : "Ajoute un bouton qui change la couleur"
2. Le diff : on VOIT exactement ce qui a change
3. Le Tab complete : l'IA propose, on accepte ou refuse
4. "Vous voyez le code. Vous ne l'ecrivez pas, mais vous le COMPRENEZ et vous le DIRIGEZ."

### 1.4 Niveau 3 — Les assistants code (8 min)

**Ce qu'ils sont** : Des agents IA en ligne de commande qui peuvent lire, ecrire, executer du code et naviguer le web. Le plus autonome de tous.

**La transition** : "L'editeur IA attend vos instructions a chaque etape. L'assistant code peut enchainer des taches complexes tout seul : lire le code → le modifier → tester → corriger si erreur."

#### Claude Code (Anthropic CLI)
- **Quoi** : Agent IA en ligne de commande
- **Comment** : Tu lances Claude Code dans un terminal, il explore le projet, propose et execute
- **Forces** :
  - Le plus autonome de tous
  - Comprend le contexte complet du projet
  - Enchaine des actions complexes (lire → modifier → tester → corriger)
  - Fichiers de config (.claude/) pour le contexte permanent
- **Limites** : Terminal uniquement (intimidant au debut)
- **Prix** : Base sur la consommation API (~$15-50/mois)
- **Pour la formation** : C'est le "endgame" — M3-M4

#### OpenAI Codex CLI
- **Quoi** : Agent IA similaire par OpenAI
- **Comment** : Terminal, lecture/ecriture de fichiers
- **Forces** : Gratuit (inclus dans ChatGPT Pro/Plus)
- **Limites** : Moins autonome que Claude Code

**Demo live** (3 min) : Montrer Claude Code en action — pas pour que les etudiants l'utilisent maintenant, mais pour montrer ou on va :
1. "Ajoute un formulaire de contact a la page"
2. Claude Code lit le code, comprend la structure, modifie, teste
3. "Voila ce que vous saurez faire en semaine 6-7."

### 1.5 Tableau comparatif recapitulatif (3 min)

| Outil | Facilite | Controle | Full-stack | Prix/mois | Utilise en |
|-------|----------|----------|------------|-----------|------------|
| v0 | ★★★★★ | ★★ | Non (UI) | $0-20 | M1 (S1) |
| Bolt.new | ★★★★ | ★★ | Partiel | $0-40 | Optionnel |
| Cursor | ★★★ | ★★★★ | Oui | $0-20 | M2-M3 |
| Windsurf | ★★★ | ★★★★ | Oui | $0-15 | Alternative |
| Claude Code | ★★ | ★★★★★ | Oui | $15-50 | M3-M4+ |
| Codex CLI | ★★ | ★★★★ | Oui | Inclus | Alternative |

**Message cle** : "On progresse de gauche a droite dans ce tableau. Plus de controle = plus de puissance = plus de precision. Mais chaque outil a sa place."

### 1.6 Ce que la formation couvre vs ce qui est optionnel

| Outil | Statut dans la formation |
|-------|--------------------------|
| v0 | ✅ Utilise en S1 (Quick Win) |
| Cursor | ✅ Outil principal M2-M4 |
| Claude Code | ✅ Introduit en M3, utilise en M4-M6 |
| Bolt.new | 📌 Optionnel (alternative a v0) |
| Windsurf | 📌 Optionnel (alternative a Cursor) |
| Codex CLI | 📌 Optionnel (alternative a Claude Code) |

---

## PARTIE 2 — Demo live comparative (10 min)

### Le meme mini-projet avec 3 outils

**Projet** : Une page "A propos" avec photo, texte, et bouton de contact.

**Round 1 — v0 (3 min)** :
1. Prompt : "Cree une page a propos avec photo, bio, et bouton contact"
2. Resultat en 10 secondes
3. "Rapide, joli, mais difficile de changer un detail precis"

**Round 2 — Cursor (4 min)** :
1. Ouvrir le code genere dans Cursor
2. Chat : "Change le bouton en vert et ajoute un lien email"
3. Le diff apparait : on VOIT exactement ce qui change
4. "Plus lent, mais je CONTROLE chaque detail"

**Round 3 — Claude Code (3 min)** :
1. Terminal : "Ajoute un formulaire de contact fonctionnel avec validation"
2. Claude Code lit le code, ajoute le formulaire, ajoute la validation
3. "Le plus puissant. Il fait tout seul ce qui prendrait 30 min manuellement."

**Conclusion** : "3 outils, 3 niveaux. En S1 vous avez fait le niveau 1. Aujourd'hui on monte au niveau 2. En M3-M4 on atteindra le niveau 3."

---

## PARTIE 3 — Exercice pratique (60 min)

### Construire avec un editeur IA (Cursor ou equivalent)

**Objectif** : L'etudiant construit une page plus elaboree en utilisant un editeur IA (pas juste un generateur). Il commence a voir le code et a donner des instructions precises.

**Pre-requis** : Installer Cursor AVANT la session (ajouter a la checklist J-3 de la semaine 2).

**Etapes guidees** :

**0:00-0:10 — Setup**
- Ouvrir Cursor
- Creer un nouveau projet (ou ouvrir le projet v0 de S1)
- "Voila votre atelier de travail. C'est ici que vous allez construire."

**0:10-0:25 — Premier brief decompose**
Reprendre ce qu'on a appris en S2-S3 :
1. Qu'est-ce que je veux comme SALLE (front-end) ? "Une page avec un header, un hero, et un formulaire"
2. Qu'est-ce que la CUISINE doit faire ? "Quand quelqu'un remplit le formulaire, sauvegarder le message"

Donner ce brief a Cursor via le chat :
> "Cree une page web avec un header de navigation, une section hero avec un titre et un sous-titre, et un formulaire de contact avec nom, email, et message."

**0:25-0:45 — Iteration guidee**
- "La couleur ne me plait pas" → instruction precise a l'IA
- "Je veux ajouter mes projets en dessous" → instruction precise
- "Le bouton devrait etre plus visible" → instruction precise
- A chaque iteration, REGARDER le diff (ce qui a change)

**0:45-0:55 — Deploiement**
- Deployer sur Vercel (via CLI ou via GitHub)
- L'etudiant a maintenant une 2eme page en ligne, plus elaboree que la premiere

**0:55-1:00 — Partage**
- URL dans Discord #victoires
- Comparer avec la page de S1 : "Vous voyez la progression en 4 sessions ?"

### Pour les plus rapides

Si un etudiant finit en avance :
- Ajouter une page "Projets" ou "Blog"
- Rendre la page responsive (tester en mode mobile)
- Ajouter une animation ou un effet visuel

### Pour ceux qui bloquent

- L'etudiant travaille en binome avec un camarade plus avance
- Le mentor du pod aide en 1-to-1
- En dernier recours : revenir a v0 et iterer avec plus de precision (c'est deja du progres)

---

## Annonce exercice + Preview M2

### Exercice de la semaine 2

**Titre** : "Ton portfolio personnel"

**Consigne** :
1. Avec Cursor, cree un mini-portfolio :
   - Page d'accueil avec ton nom et une phrase d'accroche
   - Section "A propos" avec ta bio
   - Section "Projets" (meme si tu n'as que ta landing page de S1)
   - Formulaire de contact
2. Deploie sur Vercel
3. Partage l'URL dans Discord #victoires

**Deadline** : Vendredi 20h.

**Pourquoi ce portfolio** : C'est le premier projet PERSONNEL. L'etudiant commence a construire quelque chose qui le represente, pas un exercice generique.

### Preview du Module 2

"Module 1 est termine. Vous comprenez le digital, vous savez utiliser les outils IA, vous avez 2 pages en ligne."

"La semaine prochaine commence le Module 2 — LA METHODE. Preparez-vous : mercredi, je ne vais PAS vous donner de methode. Je vais vous laisser construire SANS methode. Et vous allez voir pourquoi la methode existe."

(Tease du chaos controle de S5 — cree l'anticipation)

---

## Video pre-session (a preparer)

**Titre** : "Claude, Cursor, Codex — c'est quoi la difference ?"
**Duree** : 15 min

**Plan** :
1. (0:00-2:00) "En S1 vous avez utilise v0. Mais v0 c'est qu'un debut."
2. (2:00-5:00) Les 3 niveaux : generateur, editeur, assistant code
3. (5:00-8:00) Demo v0 vs Cursor — le meme projet, 2 approches
4. (8:00-11:00) Apercu de Claude Code — "voila ou on va"
5. (11:00-13:00) Tableau comparatif — quel outil pour quel besoin
6. (13:00-14:00) "Dimanche, on va construire avec Cursor. Installez-le avant !"
7. (14:00-15:00) Comment installer Cursor (lien + 3 etapes)

**Note** : Cette video est plus longue (15 min vs 10) parce que le sujet est plus dense et les etudiants auront besoin d'installer Cursor avant la session.

---

## Visuels a creer

1. **Infographie "3 niveaux d'outils IA"** : Pyramide avec generateurs en bas, editeurs au milieu, assistants en haut. Flleche "controle" qui monte.

2. **Tableau comparatif** : Les 7 outils avec etoiles (facilite, controle, full-stack)

3. **Slide "La progression dans la formation"** : Timeline montrant quel outil est introduit a quel moment (M1 → M2 → M3 → M4)

4. **Guide d'installation Cursor** : PDF 1 page avec captures d'ecran

5. **Captures de la demo** : Screenshots annotes de chaque outil sur le meme projet

---

## Tendances 2025-2026 (context pour Magomed, pas pour les etudiants)

- **Convergence** : Les outils fusionnent les categories (Cursor ajoute de la generation, Bolt.new du controle)
- **Agents autonomes** : Claude Code et Codex CLI prefigurent des agents qui executent des taches complexes en autonomie
- **Contexte projet** : Les fichiers de config (.claude/, .cursor/) deviennent essentiels
- **No-code → Low-code → AI-code** : La frontiere entre "pas de code" et "code assiste" disparait
- **Prix en baisse** : La competition fait baisser les prix rapidement

**Implication pour la formation** : Les outils evoluent vite. Les CONCEPTS (decomposition, spec, iteration) restent. C'est pourquoi la formation enseigne les concepts, pas les boutons.

---

## Fin du Module 1 — Bilan

A la fin de S4, l'etudiant :
- ✅ Comprend l'architecture digitale (front/back/DB/API/auth/DNS)
- ✅ Sait decomposer un systeme en composants
- ✅ Reconnait les patterns entre les apps
- ✅ Connait les 3 niveaux d'outils IA
- ✅ A 2 pages en ligne (landing page S1 + page editeur S4)
- ✅ Est pret pour construire avec methode (Module 2)
