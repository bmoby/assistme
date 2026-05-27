# Recherche E -- Session 7 -- Git : explication simple, logique, et difference avec GitHub

> Document de preparation pedagogique pour la session 7.
> Public vise : debutants non techniques.
> Angle : faire comprendre Git comme systeme d'historique d'un projet, avant tout jargon.

---

## Objectif pedagogique

Pour cette partie, il faut faire comprendre 5 choses tres simplement :

1. Git n'est pas "le cloud".
2. Git n'est pas GitHub.
3. Git sert a garder l'historique d'un projet.
4. Un commit est un etat enregistre du projet.
5. Un projet peut exister localement avec Git, puis etre partage en ligne via GitHub.

---

## Le probleme avant la definition

Partir d'une situation concrete :

- on travaille sur un projet
- on change des fichiers
- deux jours plus tard on ne sait plus ce qu'on a change
- on casse quelque chose
- on veut revenir a une version qui marchait
- on veut comparer "avant" et "apres"
- on veut travailler a plusieurs sans s'ecraser

Le besoin apparait naturellement :

> il faut une memoire fiable du projet

---

## Definition la plus simple possible

La phrase la plus utile pour la session :

> Git est un systeme qui enregistre l'historique d'un projet.

Version encore plus concrete :

> Git permet de garder des etats successifs d'un projet, de voir ce qui a change, et de revenir en arriere si besoin.

Il faut insister sur un point :

- Git ne sert pas seulement a "sauvegarder"
- Git sert a garder une histoire structuree

Autrement dit :

- un dossier normal contient des fichiers
- un dossier avec Git contient des fichiers + une memoire de leurs evolutions

---

## Le bon modele mental

Le meilleur modele pour des debutants :

> Git = la machine a historique du projet

On peut dire aussi :

- le projet = ce qu'on construit
- Git = le systeme qui garde sa memoire

Tres bonne image mentale :

- a chaque etape importante, on prend une photo du projet
- cette photo s'appelle un `commit`
- plus tard on peut relire la timeline

Attention :

- ce n'est pas une photo visuelle
- c'est une photo technique de l'etat des fichiers a un moment donne

La doc Git insiste justement sur cette idee :

- Git pense en "snapshots"
- pas seulement en liste de petites differences

---

## Ce qu'est un commit

Pour cette session, il ne faut pas noyer les etudiants.
Le niveau suffisant :

> Un commit = un etat enregistre du projet, avec un message.

On peut le dire comme ca :

- "ici j'ai ajoute la navigation"
- "ici j'ai corrige le bug"
- "ici j'ai termine la page contact"

Le commit fait 3 choses pedagogiquement :

1. il donne un point de repere
2. il cree un historique lisible
3. il permet de revenir a un etat precedent

---

## Git n'est pas GitHub

C'est la confusion centrale a corriger.

Formule tres simple :

> Git est le systeme. GitHub est une plateforme en ligne construite autour de Git.

Version encore plus concrete :

- Git travaille avec l'historique
- GitHub heberge cet historique en ligne et facilite la collaboration

On peut le dire comme ca en live :

> Git, c'est le moteur. GitHub, c'est le lieu en ligne ou on partage et synchronise ce moteur.

Ou encore :

- Git = la logique de version
- GitHub = le site web / la plateforme / le depot distant

Important :

- on peut utiliser Git sans GitHub
- mais GitHub utilise Git

Donc :

- Git peut exister seulement sur l'ordinateur
- GitHub arrive quand on veut stocker, partager ou synchroniser en ligne

---

## Formule ultra simple a faire retenir

Si on doit resumer en une ligne :

> Git garde l'histoire du projet. GitHub la met en ligne et la partage.

---

## Le schema minimal a montrer

```text
Mon ordinateur
  -> dossier du projet
  -> Git garde l'historique local

GitHub
  -> copie distante du depot Git
  -> partage, sauvegarde, collaboration
```

Ou encore :

```text
Projet local -> Git -> historique local
Projet local -> GitHub -> historique partage en ligne
```

---

## Ce qu'il faut dire sur "n'importe quel projet"

Point important pour des non-techniciens :

Git ne concerne pas seulement "du gros code".

On peut presenter Git comme utile pour :

- un site
- une application
- un projet personnel
- un prototype
- un dossier avec HTML/CSS/JS
- un projet a plusieurs personnes

Pedagogiquement, la bonne idee est :

> des qu'un projet evolue dans le temps, Git devient utile

---

## Vocabulaire minimum a introduire

Il ne faut pas tout enseigner d'un coup.
Pour cette session, le strict minimum :

- `repository` / `repo` : le projet suivi par Git
- `commit` : un etat enregistre
- `history` : la suite des commits
- `branch` : une ligne de travail
- `remote` : la copie distante, par exemple sur GitHub

Si le temps est court, on peut meme garder seulement :

- projet
- historique
- commit
- GitHub

---

## Les 4 verbes utiles pour debuter

Sans transformer la session en cours de terminal trop lourd, on peut donner le sens logique de :

- `git add`
  - je prepare ce que je veux enregistrer
- `git commit`
  - j'enregistre un nouvel etat dans l'historique
- `git push`
  - j'envoie mes commits vers GitHub
- `git pull`
  - je recupere les commits distants

Le plus important ici :

> `commit` n'envoie pas sur internet

et

> `push` n'est pas "Git", c'est l'envoi vers un depot distant

---

## Le raisonnement logique a faire apparaitre

Il faut que l'etudiant comprenne cette progression :

1. J'ai un projet.
2. Ce projet change dans le temps.
3. J'ai besoin d'un historique.
4. Git gere cet historique.
5. Si je veux le partager en ligne, j'utilise GitHub.

Cette logique est plus importante que les commandes elles-memes.

---

## Ce qu'il ne faut pas dire trop tot

Pour garder la clarte, il vaut mieux eviter au debut :

- rebase
- stash
- cherry-pick
- detached HEAD
- conflits complexes
- workflows d'equipe avances

Ce n'est pas faux, mais c'est trop tot.

---

## Les confusions les plus frequentes

### 1. "GitHub = Git"

Correction :

> Non. GitHub repose sur Git, mais GitHub n'est pas Git lui-meme.

### 2. "Un commit met mon projet en ligne"

Correction :

> Non. Le commit enregistre localement. C'est `push` qui envoie vers le depot distant.

### 3. "Git sert seulement quand on est plusieurs"

Correction :

> Non. Meme seul, Git est utile parce qu'il garde l'historique et permet de revenir en arriere.

### 4. "Git sert seulement pour les developpeurs avances"

Correction :

> Non. Des qu'on a un projet qui evolue, Git devient utile.

---

## Script oral tres simple

Version quasi prete a dire :

> "Git, ce n'est pas GitHub. Git, c'est le systeme qui garde l'historique d'un projet."

> "Quand vous travaillez sur un projet, vous changez des fichiers, vous corrigez, vous testez, vous revenez, vous avancez. Git sert a garder la memoire de toutes ces etapes."

> "Un commit, c'est un etat enregistre du projet. Donc au lieu d'avoir un dossier chaotique avec des versions du type final-v2-bon-cette-fois, vous avez un vrai historique."

> "GitHub, lui, c'est la plateforme en ligne qui permet de stocker ce depot Git a distance, de le partager, et de collaborer plus facilement."

---

## Formules courtes a reutiliser

- Git = historique du projet
- Commit = photo technique d'un etat du projet
- GitHub = depot distant + collaboration
- Commit = local
- Push = en ligne

---

## Ce qu'un etudiant doit retenir a la fin

Si a la fin de la session l'etudiant sait dire cela, l'objectif est atteint :

> "Git garde l'historique de mon projet. GitHub est la plateforme en ligne ou je peux envoyer cet historique."

---

## Sources officielles consultees le 2026-04-12

- Git Book, "About Version Control" : https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control
- Git Book, "What is Git?" : https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F
- GitHub Docs, "About GitHub and Git" : https://docs.github.com/en/get-started/start-your-journey/about-github-and-git
- GitHub Docs, "Getting started with Git" : https://docs.github.com/en/get-started/git-basics/set-up-git
