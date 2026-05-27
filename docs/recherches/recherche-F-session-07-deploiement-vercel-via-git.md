# Recherche F -- Session 7 -- Deploiement avec Git : comment Vercel fonctionne vraiment

> Document de preparation pedagogique pour la session 7.
> Public vise : debutants non techniques.
> Angle : expliquer le mecanisme logique du deploiement, pas seulement une recette de clics.

---

## Objectif pedagogique

Pour cette partie, il faut faire comprendre 5 choses :

1. Git ne deploie pas tout seul.
2. Vercel observe un depot Git connecte.
3. Chaque nouveau commit pousse peut declencher un nouveau deploiement.
4. Les branches de preview et la branche de production n'ont pas le meme role.
5. Mettre sur GitHub n'est pas exactement la meme chose que mettre en production.

---

## La phrase centrale

> Git envoie l'historique du projet. Vercel lit cet historique et construit une version en ligne.

Ou, encore plus simplement :

> Git transporte le code. Vercel le transforme en site deploye.

---

## Le probleme a poser

Un projet Next.js fonctionne en local.

Tres bien.

Mais si on veut qu'une autre personne y accede sur internet, il faut :

- prendre le code actuel
- l'envoyer a un endroit partage
- lancer une construction du projet
- obtenir une URL en ligne

C'est exactement la que Vercel intervient.

---

## Ce qu'il faut absolument corriger

Beaucoup de debutants pensent :

- "je fais un commit, donc mon site est en ligne"
- "GitHub = le site en production"
- "Vercel = juste un hebergeur passif"

Il faut remplacer cela par le bon schema :

- Git garde l'historique
- GitHub stocke le depot distant
- Vercel est connecte a ce depot
- Vercel construit et publie une version du projet

---

## Le mecanisme complet, en langage simple

### Etape 1 -- Le projet vit en local

L'etudiant travaille sur son ordinateur :

- il modifie les fichiers
- il teste localement
- il voit le resultat sur `localhost`

### Etape 2 -- Git enregistre un etat

L'etudiant fait un commit.

Cela signifie :

- il cree un nouvel etat dans l'historique local
- cet etat reste encore sur sa machine tant qu'il n'est pas pousse

### Etape 3 -- Le projet est envoye vers GitHub

L'etudiant fait un `push`.

Cela signifie :

- les commits locaux sont envoyes vers le depot distant
- GitHub recoit la nouvelle version de l'historique

### Etape 4 -- Vercel detecte ce nouvel etat

Quand le depot Git est connecte a Vercel :

- Vercel peut creer un nouveau deploiement a partir d'un commit, d'une branche, ou d'une PR
- Vercel relance alors le build du projet

### Etape 5 -- Vercel construit le projet

Concretement, Vercel doit :

- identifier le framework
- utiliser la bonne racine du projet
- lancer la construction
- prendre le resultat de build
- produire une URL deployee

### Etape 6 -- Une URL apparait

Si tout se passe bien :

- on obtient une URL de preview
- ou une URL de production

Donc :

> le code ne devient pas un site en ligne parce qu'il est sur GitHub
> il devient un site en ligne parce que Vercel le construit et le deploie

---

## Preview vs production

C'est la distinction la plus importante a enseigner.

### Preview

Les branches non productives servent a previsualiser des changements.

Idee simple :

- j'essaie une nouvelle version
- je veux la voir en ligne sans casser le site principal

Vercel cree alors une URL de preview.

### Production

La branche de production represente la version officielle du projet.

Tres souvent, cette branche s'appelle :

- `main`

Quand on fusionne dans cette branche :

- Vercel cree un deploiement de production

La formule a faire retenir :

> preview = version de test visible en ligne
> production = version officielle visible par les visiteurs

---

## Le schema minimal a montrer

```text
Ordinateur local
  -> code modifie
  -> commit
  -> push

GitHub
  -> depot distant mis a jour

Vercel
  -> detecte le commit
  -> lance le build
  -> cree une URL deployee
```

Version "branches" :

```text
branche feature -> push -> preview deployment
merge dans main -> production deployment
```

---

## Ce que dit la doc Vercel, traduit pedagogiquement

La documentation officielle de Vercel explique en substance :

- chaque push peut produire un deploiement de preview
- les merges sur la branche de production produisent un deploiement de production
- la branche de production est souvent `main`, mais on peut la changer

Donc pedagogiquement :

> Vercel transforme la structure Git du projet en flux de publication

---

## Le premier branchement initial a expliquer

Quand on connecte un repo a Vercel pour la premiere fois, on ne fait pas "juste deploy".

Vercel demande aussi une configuration initiale :

- nom du projet
- framework preset
- repertoire racine si besoin
- build output settings
- variables d'environnement

Cela permet de montrer une idee importante :

> deployer ne veut pas dire "copier des fichiers a l'aveugle"

Il faut aussi dire a Vercel :

- quel projet construire
- comment le construire
- avec quels parametres

---

## Ce qu'il faut faire comprendre sur les variables d'environnement

On peut rester simple.

Si le projet a besoin de secrets ou de cles :

- elles ne doivent pas etre ecrites en dur dans le code
- on les configure dans Vercel

Pour cette session, l'idee minimale suffit :

> le code seul ne suffit pas toujours ; l'environnement de deploiement compte aussi

---

## La bonne phrase sur Git et Vercel

Phrase tres utile :

> Git gere les versions. Vercel gere la mise en ligne a partir de ces versions.

---

## Les 3 erreurs classiques des debutants

### 1. "J'ai push, donc c'est forcement en production"

Correction :

> Pas forcement. Si tu pushes sur une branche de preview, tu obtiens souvent une preview, pas la production.

### 2. "GitHub affiche le code, donc le site est deja deploye"

Correction :

> Non. GitHub heberge le depot. Vercel construit et sert le site.

### 3. "Si ca ne deploie pas, Git est casse"

Correction :

> Pas forcement. Le probleme peut venir du build, du framework preset, du root directory, ou des variables d'environnement.

---

## La timeline ideale a faire dire a l'etudiant

Un etudiant a compris si il peut raconter :

1. Je code en local.
2. Je commit.
3. Je push vers GitHub.
4. Vercel voit la nouvelle version.
5. Vercel construit le projet.
6. J'obtiens une URL de preview ou de production.

---

## Ce qu'il faut volontairement simplifier pour la session

Il ne faut pas noyer les gens dans :

- le Vercel CLI
- les monorepos complexes
- les headers et rewrites avances
- l'infra reseau
- les fonctions serverless en profondeur

Pour cette session, l'objectif n'est pas "maitriser Vercel".
L'objectif est :

> comprendre le pont logique entre Git et mise en ligne

---

## Script oral tres simple

Version prete a dire :

> "Votre projet commence en local. Vous codez, vous testez, tout se passe sur votre ordinateur."

> "Quand vous faites un commit, vous enregistrez un etat du projet dans Git. Quand vous faites un push, vous envoyez cet etat sur GitHub."

> "Comme Vercel est connecte a votre depot Git, il peut voir cette nouvelle version, lancer le build, puis creer une URL."

> "Si vous poussez sur une branche de travail, vous obtenez souvent une preview. Si vous fusionnez dans la branche de production, souvent `main`, vous obtenez la version officielle en ligne."

---

## Formules courtes a reutiliser

- Git n'heberge pas
- GitHub ne build pas le site
- Vercel deploie a partir du depot Git
- Preview != production
- `main` est souvent la branche de production, mais pas obligatoirement

---

## Ce qu'un etudiant doit retenir a la fin

La phrase de sortie ideale :

> "Je pousse mon code sur le depot Git, et Vercel utilise cette version pour creer une preview ou une production."

---

## Sources officielles consultees le 2026-04-12

- Vercel Docs, "Deploying Git Repositories with Vercel" : https://vercel.com/docs/deployments/git
- Vercel Docs, "Deploying to Vercel" : https://vercel.com/docs/deployments
- Vercel Docs, "Git Configuration" : https://vercel.com/docs/project-configuration/git-configuration

