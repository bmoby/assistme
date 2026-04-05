# CODEX.md — Formation Pilote Neuro

Ce fichier sert de memoire operative pour tout travail lie a la formation `Pilote Neuro` dans ce repo.

## Portee

Utiliser ce fichier quand la demande concerne :
- le programme de formation
- les sessions pedagogiques
- les quiz
- les devoirs et artefacts
- le fonctionnement Discord / bot formation
- l'etat courant de progression de la cohorte

## Sources de verite

Ordre de priorite a respecter :

1. Le fichier de session concerne (`learning-knowledge/module-*/session-XX.md`)
2. `learning-knowledge/programme.md`
3. `learning-knowledge/regles-discord.md`
4. `learning-knowledge/setup-etudiant.md`
5. Les specs et le code du bot Discord / quiz

References principales :
- `learning-knowledge/programme.md`
- `learning-knowledge/regles-discord.md`
- `learning-knowledge/setup-etudiant.md`
- `learning-knowledge/quiz-format-template.txt`
- `specs/04-bot-discord/SPEC.md`
- `specs/04-bot-discord/SPEC-DM-AGENT.md`
- `specs/CONNEXIONS.md`
- `packages/bot-discord-quiz/src/commands/quiz-create.ts`
- `packages/bot-discord-quiz/src/commands/quiz-status.ts`
- `packages/bot-discord-quiz/src/commands/quiz-close.ts`

## Vue d'ensemble de la formation

- Formation de 12 semaines
- 24 sessions
- 6 modules
- Objectif : apprendre a des non-techniciens a concevoir des systemes numeriques avec l'IA
- La formation n'enseigne pas le code pour lui-meme ; elle enseigne la logique, l'architecture, la decomposition, l'usage des IA et l'esprit critique

Progression globale :
- Module 1 : Ouvrir
- Module 2 : Methode et vraie application
- Module 3 : Arsenal IA
- Module 4 : Construire
- Module 5 : Professionnalisation
- Module 6 : Livrer

Principes structurants a ne jamais perdre :
- concret avant abstrait
- spec-driven development
- projet personnel comme fil rouge
- outils introduits juste au moment utile
- artefact a chaque session
- flipped classroom
- peer review

## Format pedagogique standard

Une session type dure 2h et suit cette logique :
- mini retrieval quiz au debut
- lien narratif avec la session precedente
- nouveau concept
- pratique en direct
- debrief 3-2-1
- devoir explicite avec deadline et canal

Regles stables :
- jamais de nouveau contenu dans les 10 dernieres minutes
- deadline principale : vendredi 20:00
- deadline tardive : mardi 20:00
- questions de preference en public

## Etat courant infere

Etat observe dans le repo au 2026-04-05 :
- `learning-knowledge/module-1/session-01.md` a `session-04.md` existent
- `learning-knowledge/module-2/session-05.md` existe
- deux quiz Session 4 existent :
  - `learning-knowledge/module-1/session-04-quiz-01.txt`
  - `learning-knowledge/module-1/session-04-quiz-02.txt`
- l'utilisateur avait ouvert `session-04-quiz-02.txt`

Hypothese de travail par defaut :
- la cohorte est actuellement a la transition entre le Module 1 et le Module 2
- le point courant est "Session 5 en cours de conception / refinement"
- la prochaine etape probable est une Session 5 orientee serveur local, bibliotheques et Next.js

Confiance :
- moyenne

Regle :
- si l'utilisateur donne une info plus recente, elle prime
- si un nouveau fichier de session apparait, mettre a jour cette section

## Resume de l'avancement connu

Session 1 :
- kick-off, onboarding, Discord, programme, regles
- artefact : Discord configure, planning choisi

Session 2 :
- modele Client / API / Serveur / Base de donnees
- analogie du restaurant
- artefact : schema d'architecture d'une application

Session 3 :
- installation IDE + IA
- premiere manipulation locale de fichiers et HTML
- artefact : 3 pages HTML dans 3 dossiers

Session 4 :
- demystification du code
- structure fichiers/dossiers, role de JavaScript, DevTools, reseau
- artefact : page HTML avec interaction JS + screenshot Network
- les quiz de Session 4 sont deja en cours de production dans le repo

Session 5 (direction decidee) :
- passage de la page statique a la vraie application web
- serveur local, bibliotheques et Next.js
- structure de projet moderne + lancement local + premier deploiement Vercel
- artefact vise : projet Next.js utile, lance localement puis mis en ligne

## Discord et fonctionnement de la formation

Canaux pedagogiques stables d'apres `regles-discord.md` :
- `#правила` / `#regles`
- `#объявления` / `#annonces`
- `#знакомство`
- `#сессии` forum : un thread par session
- `#победы`
- `#хаос-отзывы`
- `#faq`
- `#general`

Logique de fonctionnement a retenir :
- `#сессии` / forum session = lieu principal pour video, recap, consignes, devoir
- `#faq` = questions publiques ; le bot repond d'abord si possible
- les questions doivent idealement rester publiques
- les deadlines et rappels font partie du rituel de formation

Nuance importante :
- les documents pedagogiques du Module 1 demandent souvent de poster les artefacts dans le thread `#сессии`
- les specs produit plus recentes implementent une soumission formelle par DM au bot Discord

Regle d'arbitrage :
- pour un contenu de session, suivre d'abord le fichier de session
- ne pas "corriger" un document pedagogique ancien avec le workflow bot moderne sans instruction explicite
- si besoin, signaler clairement qu'il existe deux niveaux :
  - consigne pedagogique visible par l'etudiant
  - workflow technique actuel du bot

## Workflow quiz a retenir

Format attendu :
- langue etudiant : russe
- source : `learning-knowledge/quiz-format-template.txt`
- types de questions autorises : `QCM`, `VF`, `OPEN`

Pipeline reel du bot quiz :
- l'admin cree un fichier `.txt`
- upload via `/quiz-create`
- le bot telecharge le TXT
- Claude parse le fichier
- le bot affiche un preview pour verification
- l'admin confirme
- le quiz est cree en base
- un DM est envoye a chaque etudiant actif avec un bouton de demarrage

Cote etudiant :
- clic sur "Commencer"
- progression en DM
- QCM / VF avec boutons
- OPEN en texte libre
- quiz one-shot mais resumable tant qu'il est `in_progress`

Cote admin :
- `/quiz-status` pour voir qui a commence / termine / expire
- `/quiz-close` pour fermer manuellement un quiz

## Regles de generation de quiz pour Codex

Quand l'utilisateur demande un quiz :
- lire d'abord le fichier de session cible
- utiliser seulement le contenu de cette session et ses prerequis deja vus
- respecter le niveau pedagogique reel de la session
- ecrire le quiz en russe sauf demande contraire
- respecter strictement le template TXT existant
- melanger les types de questions
- rendre les mauvaises reponses plausibles
- privilegier la comprehension plutot que la recitation
- ajouter `EXPLANATION` quand c'est utile

Si plusieurs quiz sont necessaires pour une meme session :
- les separer par blocs cognitifs ou thematiques
- reutiliser la convention `session-XX-quiz-01.txt`, `session-XX-quiz-02.txt`, etc.

Pour la Session 4 en particulier :
- il est coherent de separer
  - structure projet / fichiers / terminal
  - JavaScript / navigateur / fonctionnement du web

## Regles de production de contenu formation

Quand l'utilisateur demande un support, un post Discord ou une consigne :
- aligner le contenu avec l'artefact de la session
- mentionner explicitement le canal de rendu si connu
- mentionner la deadline si connue
- garder la logique pedagogique de la session
- ne pas sauter des concepts futurs sans raison

Pour la Session 5 :
- partir du probleme avant les definitions
- expliquer `localhost` avant tout jargon technique
- limiter au maximum les notions nouvelles
- presenter la bibliotheque comme du code reutilisable cree par d'autres developpeurs
- presenter Next.js comme la reponse pratique aux limites d'un projet HTML/CSS/JS isole

Quand l'utilisateur demande "ou en est-on ?" :
- partir de la section "Etat courant infere"
- citer l'etat comme une inference si aucune confirmation explicite n'existe

Quand l'utilisateur demande une adaptation :
- conserver la voix de la formation
- conversation avec l'utilisateur : francais
- contenu eleve-facing : russe, sauf demande contraire

## Regles de maintenance de ce fichier

Mettre a jour ce fichier si :
- une nouvelle session est ajoutee
- le workflow Discord change
- le format de quiz change
- l'utilisateur precise un nouvel etat d'avancement

Ne pas inventer la progression.
En cas d'incertitude, noter l'inference explicitement.
