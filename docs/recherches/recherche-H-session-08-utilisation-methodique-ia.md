# Recherche H -- Session 8 -- Utilisation methodique de l'IA : regles, skills et agents

> Document de preparation pedagogique pour la Session 8.
> Public vise : debutants non techniques qui ont deja manipule un projet Next.js, Git/GitHub/Vercel et un premier fichier d'instructions IA.
> Angle : passer du prompt ponctuel a une configuration de travail stable, reutilisable et verifiable.

---

## Objectif pedagogique

La Session 8 doit faire comprendre une transition precise :

- **prompt** = une demande ponctuelle
- **fichier de regles / memoire projet** = le contexte stable que l'IA relit souvent
- **skill** = une procedure reutilisable que l'IA active quand la tache correspond
- **agent / subagent** = un role specialise auquel on delegue une mission limitee

La phrase centrale :

> On ne devient pas meilleur avec l'IA seulement en ecrivant de meilleurs prompts. On devient meilleur en construisant un environnement de travail que l'IA peut relire, reutiliser et verifier.

---

## Sources consultees

### Codex / OpenAI

- OpenAI, page Codex : https://openai.com/codex/
  - Codex est presente comme un agent de code utilisable dans l'app, l'editeur et le terminal.
  - La page mentionne explicitement les **Skills** comme mecanisme pour aligner Codex avec les standards d'equipe.
- OpenAI, Introducing Codex : https://openai.com/index/introducing-codex/
  - Codex peut etre guide par des fichiers `AGENTS.md` places dans le repository.
  - Ces fichiers servent a expliquer comment naviguer le codebase, quelles commandes de test lancer et quelles pratiques respecter.
- OpenAI, How OpenAI uses Codex : https://openai.com/business/guides-and-resources/how-openai-uses-codex/
  - Recommande d'utiliser `AGENTS.md` pour fournir un contexte persistant.
  - Recommande des taches bien scopees, proches d'une issue GitHub.
- Contexte local Codex dans ce repo :
  - Le repo possede un skill Codex a `.agents/skills/gsd/SKILL.md`.
  - Les skills Codex locaux suivent la structure `skill-name/SKILL.md` avec frontmatter `name` et `description`.

### Claude Code / Anthropic

- Claude Code memory : https://code.claude.com/docs/en/memory
  - Chaque session Claude Code commence avec un contexte frais.
  - `CLAUDE.md` donne des instructions persistantes, mais reste du contexte, pas une configuration dure.
  - Emplacements importants : `./CLAUDE.md`, `./.claude/CLAUDE.md`, `~/.claude/CLAUDE.md`.
  - `.claude/rules/` permet des regles modulaires et eventuellement scopees par chemins.
  - Claude Code ne lit pas directement `AGENTS.md`, mais un `CLAUDE.md` peut importer `@AGENTS.md`.
- Claude Code skills : https://code.claude.com/docs/en/skills
  - Un skill est un dossier avec `SKILL.md`.
  - Emplacements : `.claude/skills/<skill>/SKILL.md` pour le projet, `~/.claude/skills/<skill>/SKILL.md` pour l'utilisateur.
  - `description` aide Claude a decider quand activer le skill.
- Claude Code subagents : https://code.claude.com/docs/en/subagents
  - Les subagents sont des fichiers Markdown avec frontmatter YAML.
  - Emplacements : `.claude/agents/` pour le projet, `~/.claude/agents/` pour l'utilisateur.
  - Un subagent a son propre contexte, ses outils et son prompt systeme.

### Gemini CLI / Google

- Gemini CLI `GEMINI.md` : https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html
  - `GEMINI.md` donne du contexte projet et evite de repeter les memes instructions dans chaque prompt.
  - Emplacements : `~/.gemini/GEMINI.md`, puis `GEMINI.md` dans le projet et ses ancetres, puis sous-dossiers.
  - Le nom du fichier peut etre personnalise dans `settings.json` avec `context.fileName`, par exemple `["AGENTS.md", "CONTEXT.md", "GEMINI.md"]`.
- Gemini CLI custom commands : https://google-gemini.github.io/gemini-cli/docs/cli/custom-commands.html
  - Commandes projet : `<project>/.gemini/commands/*.toml`.
  - Commandes globales : `~/.gemini/commands/*.toml`.
  - Ce n'est pas exactement un skill : c'est un raccourci de prompt invoque par l'utilisateur.
- Gemini CLI skills : https://geminicli.com/docs/cli/skills/
  - Les Agent Skills etendent Gemini CLI avec expertise et procedures.
  - Les skills peuvent etre installes en scope utilisateur ou workspace.
  - La doc indique que Gemini decouvre les skills dans `.gemini/skills` et peut aussi utiliser `.agents/skills` comme alternative plus generique.
- Gemini CLI commands reference : https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/cli-reference.md
  - Commandes utiles : `/skills reload`, `/agents reload`, `/commands reload`, `/memory reload`.
  - Gestion CLI : `gemini skills list`, `gemini skills install`, `gemini skills link`, `gemini skills enable/disable`.
- Gemini CLI subagents : https://geminicli.com/docs/core/subagents/
  - Les subagents ont un contexte isole et des outils limites.
  - Les agents peuvent etre geres avec `/agents`.
  - Les chemins mentionnes par la commande `/agents` sont `~/.gemini/agents` et `.gemini/agents`.

### Google Antigravity

- Google Developers Blog, lancement Antigravity : https://developers.googleblog.com/en/build-with-google-antigravity-our-new-agentic-development-platform/
  - Antigravity combine une vue editeur et une surface Agent Manager.
  - Les agents peuvent planifier, executer et verifier des taches via editeur, terminal et navigateur.
  - Les agents produisent des **Artifacts** : task lists, implementation plans, screenshots, browser recordings.
  - Les agents peuvent conserver du contexte utile dans une knowledge base.
- Google AI Developers Forum, reponse sur regles Antigravity : https://discuss.ai.google.dev/t/conductor-should-be-integrated-into-antigravity-to-ensure-long-term-context-retention/113384
  - La reponse recommande d'utiliser les **Workspace Rules** dans `.agent/rules/`.
  - Elle cite `~/.gemini/GEMINI.md` pour des regles globales.
  - Elle reference les docs `antigravity.google/docs/rules-workflows` et `antigravity.google/docs/task-list`.

Nuance importante :

- Les docs publiques Antigravity evoluent vite.
- Les faits les plus solides pour la session :
  - Antigravity est agent-first.
  - Les regles workspace existent via `.agent/rules/`.
  - Le contexte global est proche de l'ecosysteme Gemini (`~/.gemini/GEMINI.md`).
  - Les agents Antigravity se pilotent surtout via l'Agent Manager et des Artifacts, pas seulement via des fichiers Markdown comme Claude Code.
- Pour les **skills Antigravity**, enseigner prudemment :
  - verifier la version installee et le menu de customisation ;
  - privilegier `.agent/skills/<skill>/SKILL.md` si le support Agent Skills est disponible ;
  - garder une alternative portable via `.agents/skills/<skill>/SKILL.md` pour Codex/Gemini.

---

## Carte simple des outils

| Besoin | Codex | Claude Code | Gemini CLI | Antigravity |
|---|---|---|---|---|
| Regles projet | `AGENTS.md` | `CLAUDE.md` ou `.claude/CLAUDE.md` | `GEMINI.md` | `GEMINI.md`, `AGENTS.md` selon version, `.agent/rules/` |
| Regles modulaires | `AGENTS.md` par dossier ou repo `.agents/` | `.claude/rules/*.md` | `GEMINI.md` par dossier, `.gemini/commands` | `.agent/rules/*.md` |
| Skills projet | `.agents/skills/<nom>/SKILL.md` | `.claude/skills/<nom>/SKILL.md` | `.gemini/skills/<nom>/SKILL.md` ou `.agents/skills/<nom>/SKILL.md` | `.agent/skills/<nom>/SKILL.md` si support disponible |
| Agents projet | Codex app / sous-agents selon environnement | `.claude/agents/<nom>.md` | `.gemini/agents/<nom>.md` | Agent Manager / missions / Artifacts |
| Verification | diff, tests, citations, logs | tests, `/memory`, artifacts de session | `/memory`, `/skills`, `/agents`, tests | Artifacts, screenshots, recordings, plans |

---

## Structure de dossier pedagogique recommandee

Pour un projet etudiant qui veut rester portable :

```text
mon-projet/
  AGENTS.md
  CLAUDE.md
  GEMINI.md
  .agents/
    skills/
      spec-check/
        SKILL.md
  .claude/
    skills/
      spec-check/
        SKILL.md
    agents/
      spec-reviewer.md
    rules/
      testing.md
  .gemini/
    skills/
      spec-check/
        SKILL.md
    agents/
      spec-reviewer.md
    commands/
      review/spec.toml
  .agent/
    rules/
      project-context.md
    skills/
      spec-check/
        SKILL.md
```

Pour les debutants, ne pas leur demander de tout creer d'un coup. La progression conseillee :

1. `AGENTS.md` ou fichier equivalent de leur outil principal.
2. Un seul skill `spec-check`.
3. Un seul agent `spec-reviewer`.
4. Plus tard seulement : regler les variantes par outil.

---

## Explication pedagogique : regler, skiller, agentifier

### Regle

Une regle dit a l'IA ce qui est vrai presque tout le temps.

Exemples :

- "Le projet est une app Next.js."
- "Utiliser TypeScript."
- "Ne jamais modifier `.env`."
- "Avant de finir, lancer `npm run build` si le changement touche le code."

### Skill

Un skill dit a l'IA comment faire une procedure recurrente.

Exemples :

- verifier une spec
- preparer un commit propre
- faire une revue UX
- diagnostiquer une erreur de build

Un bon skill a :

- un nom court
- une description claire
- une procedure en etapes
- des limites
- un resultat attendu

### Agent

Un agent est un role specialise a qui on delegue une mission.

Exemples :

- `spec-reviewer` : lit le produit et la spec, liste les incoherences
- `debugger` : reproduit un bug, isole la cause, propose une correction
- `ux-reviewer` : regarde les ecrans et remonte les frictions

La difference principale :

- skill = procedure que le meme agent peut charger
- agent = autre role / autre contexte / autre responsabilite

---

## Exemple de skill pour la session

Nom conseille : `spec-check`.

Objectif :

> Comparer un projet etudiant avec sa spec et produire une liste d'ecarts concrete.

Structure portable minimale :

```text
.agents/skills/spec-check/
  SKILL.md
```

Contenu pedagogique :

```md
---
name: spec-check
description: Verifie l'alignement entre une spec projet et le code existant. Utiliser quand l'utilisateur demande une revue de spec, un controle d'ecarts ou une preparation de peer review.
---

# Spec Check

## Objectif

Comparer la spec du projet avec le code existant et produire une liste d'ecarts actionnable.

## Procedure

1. Lire d'abord la spec indiquee par l'utilisateur.
2. Identifier les fonctionnalites promises.
3. Explorer seulement les fichiers necessaires pour verifier ces promesses.
4. Classer chaque ecart :
   - bloquant
   - important
   - amelioration
5. Proposer une prochaine action pour chaque ecart.

## Sortie attendue

- Resume en 3 lignes maximum.
- Tableau : promesse, etat reel, ecart, action conseillee.
- Liste des questions ouvertes.

## Limites

- Ne pas corriger le code pendant la revue.
- Ne pas inventer des exigences absentes de la spec.
- Si la spec est trop vague, signaler ce qui manque.
```

---

## Exemple d'agent pour la session

Nom conseille : `spec-reviewer`.

Version Claude Code / Gemini CLI sous forme de fichier :

```md
---
name: spec-reviewer
description: Specialiste de revue de spec. Utiliser quand il faut comparer une application, une spec et les attentes utilisateur avant de coder.
tools: Read, Grep, Glob
model: inherit
---

Tu es un reviewer de spec pour une formation de non-techniciens.

Mission :
1. Lire la spec fournie.
2. Lire uniquement les fichiers utiles du projet.
3. Identifier les contradictions, promesses floues, fonctionnalites manquantes et risques UX.
4. Ne pas modifier les fichiers.
5. Produire une revue courte, priorisee et actionnable.

Format de sortie :
- Verdict global : clair / fragile / incomplet
- 3 problemes prioritaires
- 3 corrections recommandees
- 1 question a poser au porteur du projet
```

Pour Antigravity, l'equivalent pedagogique est plutot une **mission Agent Manager** :

```text
Mission pour l'agent :

Tu es mon spec-reviewer.
Lis `SPEC.md`, puis inspecte le projet sans modifier les fichiers.
Produis un Artifact avec :
1. les promesses de la spec,
2. ce que le projet contient vraiment,
3. les ecarts,
4. les 5 corrections prioritaires.

Ne code pas tant que je n'ai pas valide l'Artifact.
```

---

## Points de vigilance a enseigner

1. Les fichiers d'instructions ne sont pas des lois absolues.
2. Plus une regle est vague, moins elle est suivie.
3. Plus un fichier est long, plus il consomme du contexte.
4. Un skill doit rester specialise.
5. Un agent doit avoir une mission limitee.
6. Tout ce que l'IA produit doit etre verifie par un humain.
7. Les chemins exacts changent selon les outils et les versions : il faut apprendre a verifier ce que l'outil a charge.

---

## Verification a montrer en live

Commandes / gestes utiles :

- Codex : relancer une session et demander quels skills ou instructions sont disponibles.
- Claude Code : `/memory` pour voir les fichiers charges, `/agents` pour voir les agents.
- Gemini CLI : `/memory show`, `/skills list`, `/agents list`, `/commands reload`.
- Antigravity : ouvrir les Customizations / Workspace Rules, puis verifier les Artifacts generes par l'agent.

La bonne question finale :

> Comment sais-tu que l'IA a vraiment vu tes instructions ?

La bonne reponse :

> Je le verifie dans l'outil, je lui demande de les reformuler, puis je teste une petite tache ou la regle doit changer son comportement.

