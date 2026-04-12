# Recherche G -- Session 7 -- AGENTS.md, CLAUDE.md, GEMINI.md, Cursor rules : a quoi servent ces fichiers

> Document de preparation pedagogique pour la session 7.
> Public vise : debutants non techniques.
> Angle : expliquer pourquoi les assistants IA comprennent mieux un projet quand des fichiers d'instructions sont presents.

---

## Objectif pedagogique

Pour cette partie, il faut faire comprendre 6 choses :

1. Une IA de code ne "connait" pas votre projet par magie.
2. Chaque session recommence avec un contexte frais ou limite.
3. Les fichiers d'instructions servent a injecter un contexte stable et reutilisable.
4. Le nom du fichier depend souvent de l'outil.
5. Ces fichiers n'augmentent pas l'intelligence du modele ; ils ameliorent surtout le cadrage.
6. Un bon fichier d'instructions contient des faits utiles, pas du flou.

---

## La phrase centrale

> Ces fichiers servent a donner a l'IA une memoire de projet au debut de chaque session.

Version encore plus simple :

> Au lieu de tout reexpliquer a chaque fois, on ecrit les regles importantes une fois dans un fichier que l'agent relit.

---

## Le probleme a poser

Un etudiant ouvre Codex, Claude Code, Gemini CLI ou Cursor.

Sans fichier d'instructions :

- l'IA voit le prompt du moment
- elle decouvre le repo progressivement
- elle oublie plus facilement les preferences de l'equipe
- elle risque de proposer des actions incoherentes

Avec un fichier d'instructions :

- l'outil charge des regles du projet
- le modele commence avec plus de contexte
- il suit mieux les conventions et les commandes utiles

---

## Pourquoi l'IA "ecoute mieux"

Il faut rester precis ici.

La vraie explication n'est pas magique.

L'IA "ecoute mieux" pour 4 raisons principales :

1. Les instructions sont chargees des le depart
   - elles arrivent tres tot dans le contexte du modele
2. Elles sont reutilisees a chaque session
   - on ne depend pas d'un rappel humain a chaque fois
3. Elles sont plus stables qu'un prompt improvise
   - meme structure, meme vocabulaire, meme priorites
4. Elles sont souvent scopees au projet ou au dossier
   - donc l'agent recoit des indications adaptees a ce qu'il touche

La bonne formulation pedagogique :

> l'IA n'obeit pas mieux parce qu'elle devient plus intelligente ; elle travaille mieux parce qu'on lui donne un cadre plus clair, plus tot, et plus souvent

---

## Ce qu'il faut dire honnetement

Ces fichiers ne sont pas des lois absolues.

La doc Claude Code l'explique clairement :

- ces fichiers sont du contexte
- pas une configuration "dure" et parfaitement enforcee

Donc il faut dire :

> ces fichiers ameliorent fortement la coherence, mais ils ne garantissent pas 100 % d'obeissance

Trois raisons a cela :

- le modele reste probabiliste
- des instructions contradictoires peuvent exister
- un fichier trop long ou trop flou est moins bien suivi

---

## Les noms changent selon l'outil

Le concept est general.
Le nom concret depend de l'agent.

| Outil | Fichier / mecanisme principal | Idee a retenir |
|------|-------------------------------|----------------|
| Codex | `AGENTS.md` | instructions du projet pour Codex |
| Claude Code | `CLAUDE.md` | memoire projet / workflow / conventions |
| Gemini CLI | `GEMINI.md` | contexte projet charge a chaque prompt |
| Cursor | `.cursor/rules` ou `AGENTS.md` | regles projet ; `.cursorrules` est legacy |

Inference pedagogique :

> le principe est le meme partout : donner un contexte persistant au modele

Ce qui change surtout :

- le nom du fichier
- la hierarchie de chargement
- le niveau de granularite

---

## Codex : comment le presenter simplement

D'apres la doc officielle OpenAI :

- Codex lit les fichiers `AGENTS.md` avant de commencer le travail
- on peut avoir un fichier global dans `~/.codex/AGENTS.md`
- on peut avoir un fichier projet a la racine
- on peut avoir des overrides plus specifiques comme `AGENTS.override.md`
- Codex construit une chaine d'instructions entre la racine du projet et le dossier courant

Formule simple a dire :

> Avec Codex, `AGENTS.md` est le mode d'emploi du projet pour l'agent.

---

## Claude Code : comment le presenter simplement

D'apres la doc officielle Anthropic :

- Claude Code charge des `CLAUDE.md`
- il existe plusieurs niveaux : projet, utilisateur, local, organisation
- des fichiers plus specifiques peuvent prendre le dessus contextuellement
- Claude charge aussi des instructions de sous-dossiers quand il lit ces zones
- Claude peut importer un `AGENTS.md` dans `CLAUDE.md`

Tres important pedagogiquement :

- Anthropic dit explicitement que chaque session commence avec un contexte frais
- `CLAUDE.md` sert justement a ramener du contexte persistant

Formule simple :

> Avec Claude Code, `CLAUDE.md` sert a ecrire ce que vous n'avez pas envie de reexpliquer a chaque session.

---

## Gemini CLI : comment le presenter simplement

D'apres la doc officielle Gemini CLI :

- le nom par defaut est `GEMINI.md`
- Gemini charge ces fichiers dans une hierarchie
- il peut charger un fichier global dans `~/.gemini/GEMINI.md`
- il peut charger des fichiers de workspace et des fichiers "just in time" selon les dossiers touches
- on peut meme personnaliser le nom du fichier, par exemple accepter `AGENTS.md`

Formule simple :

> Avec Gemini CLI, `GEMINI.md` est le fichier de contexte du projet, mais le nom peut etre personnalise si on veut standardiser autrement.

---

## Cursor : comment le presenter simplement

La doc Cursor explique :

- le mecanisme recommande aujourd'hui est `.cursor/rules`
- `AGENTS.md` existe comme alternative simple
- `.cursorrules` est encore supporte, mais considere legacy / obsolete
- ces regles sont injectees en debut de contexte

Formule simple :

> Dans Cursor, on parle surtout de rules. `AGENTS.md` peut marcher pour un cas simple, mais `.cursor/rules` est le format plus moderne.

---

## Donc : qu'est-ce qu'on met dedans ?

La regle pedagogique la plus importante :

> on met ce qu'on voudrait que l'IA sache avant de toucher au projet

Tres concretement, un bon fichier contient :

- l'objectif du projet
- la stack technique
- les commandes utiles
- les conventions de code
- les zones sensibles a ne pas casser
- les attentes de verification
- les regles de communication si elles sont importantes

---

## Le contenu ideal, section par section

### 1. Le projet

Il faut dire :

- ce que fait le produit
- a qui il sert
- quels packages ou dossiers sont importants

Exemple :

- "Monorepo TypeScript pour un assistant multi-bots"
- "Le package `core` contient la logique partagee"

### 2. Les commandes utiles

Il faut donner :

- comment lancer le projet
- comment tester
- comment build
- quoi lancer avant commit

Exemple :

- `pnpm install`
- `pnpm dev`
- `pnpm test:unit`
- `pnpm build`

### 3. Les conventions de code

Il faut mettre :

- style d'import
- regles de typing
- conventions de nommage
- choix techniques stables

Exemple :

- "TypeScript strict, pas de `any`"
- "Toutes les queries Supabase passent par `packages/core/src/db/`"

### 4. Les frontieres d'architecture

Tres utile pour eviter les erreurs grossieres :

- quel dossier fait quoi
- ou vont les appels API
- quels modules ne doivent pas importer d'autres modules

### 5. Les verifications obligatoires

Tres important :

- quels tests lancer
- quel niveau de verification est attendu
- quelles actions sont interdites

Exemple :

- "run tests before commit"
- "ne pas modifier les migrations existantes"
- "ne pas ecrire de secrets dans le code"

### 6. Les preferences de communication

Optionnel mais utile :

- langue des reponses
- niveau de concision
- format attendu des comptes rendus

Attention :

- cela releve souvent plutot d'un fichier utilisateur que d'un fichier projet

---

## Ce qu'il ne faut pas mettre

Un mauvais fichier d'instructions contient :

- des banalites vagues
- des phrases impossibles a verifier
- des ordres contradictoires
- trop d'informations temporaires
- des details personnels a partager a toute l'equipe

Exemples faibles :

- "fais du code propre"
- "sois intelligent"
- "utilise les meilleures pratiques"

Exemples forts :

- "utilise `pnpm test:unit` avant commit"
- "ne fais pas d'import direct depuis `packages/bot-discord-quiz`"
- "les fichiers de session sont source de verite pour le contenu pedagogique"

---

## La difference entre README et fichier agent

Tres bon point a enseigner.

On peut dire :

- `README.md` parle d'abord aux humains
- `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` parlent d'abord a l'agent

Le `README` peut contenir :

- presentation du projet
- installation
- usage general

Le fichier agent contient plutot :

- conventions a respecter
- commandes exactes
- zones a risque
- habitudes d'equipe
- workflow de verification

Formule simple :

> README = documentation humaine
> fichier agent = cadre operatoire pour l'IA

---

## Le bon niveau de granularite

Il faut aider les etudiants a distinguer 3 couches :

### Ce qui est permanent

Va dans le fichier agent.

Exemples :

- stack
- commandes
- conventions
- architecture

### Ce qui est personnel

Va plutot dans un fichier local ou utilisateur.

Exemples :

- preferences personnelles
- URL de sandbox perso
- donnees de test privees

### Ce qui est ponctuel

Va dans le prompt du moment, pas dans le fichier.

Exemples :

- "corrige uniquement ce bug"
- "prepare un plan en 3 etapes"
- "ecris la home page aujourd'hui"

---

## Le template minimal a montrer en live

```md
# Project

## Goal
- Application Next.js pour ...

## Stack
- Next.js
- TypeScript
- Supabase

## Commands
- Install: `pnpm install`
- Dev: `pnpm dev`
- Test: `pnpm test:unit`
- Build: `pnpm build`

## Architecture Rules
- Les appels DB passent par `src/db/`
- Ne pas contourner les services existants

## Code Rules
- TypeScript strict
- Pas de `any`
- Reutiliser les composants existants

## Verification
- Lancer les tests lies a la zone modifiee
- Resumer les risques restants si un test n'a pas pu etre lance
```

---

## Le message pedagogique le plus important

Si on devait tout resumer en une seule idee :

> un bon fichier d'instructions permet de transformer une IA generaliste en assistant mieux calibre pour votre projet

Pas parce qu'elle devient magiquement meilleure,
mais parce qu'elle commence avec de meilleurs reperes.

---

## Script oral tres simple

Version prete a dire :

> "Quand vous ouvrez un agent IA, il ne connait pas vraiment votre projet. Il voit surtout le prompt du moment et le contexte qu'on lui donne."

> "Ces fichiers, comme `AGENTS.md`, `CLAUDE.md` ou `GEMINI.md`, servent a lui donner des regles persistantes : le but du projet, les commandes, les conventions, les limites, les tests."

> "Donc l'IA ne vous ecoute pas mieux par magie. Elle vous suit mieux parce qu'on a reduit l'ambiguite."

> "Le nom du fichier change selon l'outil, mais l'idee reste la meme : mettre dans le repo une memoire operationnelle pour l'agent."

---

## Formules courtes a reutiliser

- Fichier agent = memoire de projet pour l'IA
- Meilleur contexte = meilleures reponses
- Instructions persistantes > repetition manuelle
- Le nom change selon l'outil, pas le principe
- Trop long ou contradictoire = moins bien suivi

---

## Sources officielles consultees le 2026-04-12

- OpenAI Developers, "Custom instructions with AGENTS.md" : https://developers.openai.com/codex/guides/agents-md
- Anthropic, "How Claude remembers your project" : https://code.claude.com/docs/en/memory
- Gemini CLI Docs, "Provide context with GEMINI.md files" : https://geminicli.com/docs/cli/gemini-md/
- Gemini CLI Docs, "Memory tool" : https://geminicli.com/docs/tools/memory/
- Cursor Docs, "Rules" : https://docs.cursor.com/id/context/rules
