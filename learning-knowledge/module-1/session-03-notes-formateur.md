# С3 — Notes formateur (aide-memoire live)

> Ce document est ton teleprompter. Suis-le de haut en bas pendant le cours.
> Les phrases en **gras italique** sont des phrases a dire telles quelles.
> Les `→` sont des transitions — ne les saute pas.

---

## PARTIE 1 — Pourquoi le web (0:00–0:10)

**_D'apres le cours precedent, vous comprenez que n'importe quel systeme informatique est compose d'un client, d'une API, d'un serveur et d'une base de donnees._**

**_Vous etes capable d'imaginer n'importe quelle application et la decomposer. Instagram, WhatsApp, n'importe quoi._**

→ TRANSITION :

**_Maintenant, nous devons demarrer par developper. Et pour demarrer, nous allons commencer par le web. Car je le dis toujours : un site web nous permet d'apprendre vraiment profondement tout ce qui est client, serveur, base de donnees, API. C'est exactement ca que nous avons besoin partout._**

**_Mais cette fois-ci, nous n'allons pas le faire via une plateforme comme V0. Nous allons le faire nous-memes sur notre ordinateur avec du vrai code._**

**_Ici, vous n'allez pas avoir de limites. Vous vous souvenez dans V0, la plupart d'entre vous ont atteint leurs limites avec quelques prompts. Et bien ici vous pouvez jouer toute la journee._**

---

## PARTIE 2 — Choix de l'outil (0:10–0:20)

→ TRANSITION :

**_Alors maintenant, pour coder sur votre ordinateur, il faut un outil. Je vais vous recommander une solution pour la formation._**

### Recommandation : Antigravity

**_Pour cette formation, je vous recommande d'utiliser Google Antigravity. Pourquoi ?_**

- C'est **gratuit** — vous n'avez rien a payer
- Ca fonctionne sur **Mac ET Windows** sans probleme
- L'intelligence artificielle est **deja integree** — rien a installer en plus
- Vous telechargez, vous vous connectez avec votre compte Google, c'est pret

### Alternatives (en bref)

**_Il existe d'autres options. J'ai prepare un document PDF detaille avec toutes les differences, les prix, et les etapes pour s'abonner a chaque service. Lisez-le attentivement et faites votre choix._**

Mentionner rapidement :
- **ChatGPT+ / Codex** (20$/mois) — si deja abonne. **Attention : sur Windows, le support est experimental, ca peut poser des problemes.**
- **Claude Code** (20-100$/mois) — pour les plus techniques. C'est pour plus tard, pas maintenant.

→ TRANSITION IMPORTANTE :

**_Ce n'est pas un choix definitif. Vous pouvez a tout moment annuler un abonnement et passer sur un autre. D'ailleurs, plus tard quand on terminera la formation et qu'on commencera a faire de vrais systemes, on va surement passer sur Claude Code. Mais pour demarrer, Antigravity c'est le plus simple._**

→ AVERTISSEMENT :

**_Ne faites pas d'achat par vous-meme. Il y a enormement de sites intermediaires qui vendent des abonnements sous les noms ChatGPT, Codex, Claude. Ce sont des arnaques ou des surfacturations. Attendez le document PDF avec les liens officiels._**

---

## PARTIE 3 — L'IDE (0:20–0:50)

→ TRANSITION :

**_Maintenant on va installer et decouvrir notre outil de travail. Ca s'appelle un IDE — un editeur de texte intelligent._**

### Explication

**_C'est tout simplement un logiciel comme Word. Tout le monde connait Word pour ecrire du texte. C'est exactement la meme chose, mais avec des fenetres supplementaires pour gerer un projet._**

- A gauche : tous vos dossiers avec l'ensemble des fichiers
- Au milieu : le contenu du fichier ouvert
- En haut : les onglets des fichiers ouverts (comme un navigateur web)

**_Un projet se compose de plein de fichiers et de dossiers. Avec un IDE c'est facile de gerer tout ca._**

**_Et on peut installer notre intelligence artificielle directement dans l'IDE. Elle peut lire tous nos fichiers et les modifier._**

### Demo Antigravity (partager ecran)

Installation :
1. Aller sur **antigravity.google/download**
2. Telecharger pour votre systeme
3. Installer
4. Ouvrir

Premier lancement :
1. Import de parametres → **demarrer de zero**
2. Theme → choisir (sombre ou clair)
3. Autonomie → **Review-driven Development**
4. Se connecter avec **Google** → choisir son Gmail

### Demo interface (PRENDRE SON TEMPS)

Montrer en live, lentement :
1. **Fichier → Ouvrir un dossier** → creer "mon-site" sur le bureau → ouvrir
2. **Panneau gauche** : c'est ici qu'on voit tout
3. **Creer un fichier** : clic droit → Nouveau fichier → "test.txt"
4. **Ecrire dedans** : cliquer au milieu, taper du texte
5. **Montrer le point** (●) sur l'onglet → fichier pas sauvegarde

**_Lorsque je modifie ce fichier, ce n'est pas automatiquement sauvegarde. Pour enregistrer : Commande S sur Mac, Control S sur Windows._**

**_Pour savoir si votre fichier a ete enregistre : ce petit point disparait quand vous sauvegardez._**

6. **Creer un dossier** : clic droit → Nouveau dossier → "dossier-1"
7. **Creer un fichier dans ce dossier** : naviguer, clic droit, nouveau fichier
8. **Ouvrir plusieurs fichiers** → montrer les onglets en haut, basculer entre eux

### Exercice tout le monde ensemble (5 min)

**_Faites la meme chose que moi maintenant._**

1. Creez un dossier "mon-site" sur votre bureau
2. Ouvrez-le dans Antigravity / VS Code
3. Creez trois sous-dossiers : `page-1`, `page-2`, `page-3`
4. Dans chaque dossier, creez un fichier `index.txt`
5. Ecrivez quelque chose de different dans chaque fichier (nom, ville, hobby)
6. Sauvegardez chaque fichier (`Cmd+S` / `Ctrl+S`)
7. Basculez entre les fichiers via les onglets

**_Si ca marche, vous venez de faire votre premiere manipulation de projet. C'est ca la base._**

→ TRANSITION (vers Antigravity/Claude) :

**_Pour ceux qui ont choisi Antigravity, tout ce que je viens de montrer est exactement pareil. Pour Claude Code, les choses sont un peu plus techniques — on en parlera plus tard._**

---

## PAUSE — 10 min (0:50–1:00)

---

## PARTIE 4 — IA + HTML (1:00–1:15)

→ TRANSITION :

**_Maintenant on va activer le plus important : l'intelligence artificielle dans notre IDE._**

### Pour Antigravity

**_Si vous utilisez Antigravity, l'IA est deja la. Vous n'avez rien a faire. Le chat est accessible a droite ou avec le raccourci Cmd+L sur Mac, Ctrl+L sur Windows._**

### Pour VS Code + Codex (rapide)

Pour ceux sur VS Code :
1. Bouton Extensions (carres a gauche) → Rechercher "Codex"
2. Installer **"Codex – OpenAI's coding agent"** (editeur : OpenAI)
3. Se connecter avec son compte ChatGPT+
4. Le chat apparait a droite

**_Rappel : sur Windows, Codex est experimental. Si vous avez des problemes, passez sur Antigravity._**

### Ce qu'on peut faire

**_Cette fenetre de chat, c'est exactement le meme ChatGPT ou Gemini avec lequel vous parlez sur votre mobile. Sauf que celui-ci est specialise dans le code. Il peut creer des fichiers, les modifier, lire tout votre projet._**

→ TRANSITION :

**_C'est comme si vous etiez maintenant dans un char, mais vous ne savez pas encore tout ce que ce char vous permet de faire._**

### HTML en 2 minutes

**_Avant de creer notre premiere page, 3 choses a savoir :_**

1. **_Votre site se trouve sur votre ordinateur. Il n'est pas sur internet._**
2. **_Un site fonctionne dans un navigateur : Chrome, Safari._**
3. **_Le navigateur comprend un certain type de fichier. Sa langue, c'est le HTML. Pour le moment retenez juste ca : HTML = page web._**

### Demo : premiere page

1. Dans le chat IA : "Cree-moi un fichier index.html avec mon nom centre au milieu"
2. **_"Tout ca, c'est l'IA qui l'a cree."_** — montrer le code qui apparait
3. Ouvrir le fichier HTML dans le navigateur → le resultat s'affiche
4. Revenir dans l'IDE → demander une modification → "Change le fond en sombre"
5. Retourner dans le navigateur

**_Pour voir les modifications : cliquez sur le bouton rafraichir dans votre navigateur — la petite fleche. Ou cliquez sur l'adresse en haut et appuyez sur Entree. Pas besoin de fermer et rouvrir le fichier._**

### Messages et confirmations

**_Des messages vont apparaitre : "Voulez-vous ceci ? Confirmez-vous cela ?" N'ayez pas peur, confirmez. Et si vous ne comprenez pas, demandez a l'IA ce que ca veut dire._**

---

## PARTIE 5 — Pratique guidee (1:15–1:55)

→ TRANSITION :

**_Maintenant c'est a vous. Vous avez 40 minutes pour faire l'exercice suivant. Je passe dans la salle pour vous aider._**

### Exercice : 3 dossiers, 3 pages

**_L'objectif n'est PAS de faire un beau site. L'objectif c'est de vous habituer a naviguer dans votre IDE : creer des dossiers, des fichiers, passer de l'un a l'autre._**

Expliquer les etapes :

**Etape 1 (5 min)** — Creer la structure a la main (PAS via l'IA) :
```
mon-site/
├── page-accueil/
│   └── index.html
├── page-a-propos/
│   └── index.html
└── page-contact/
    └── index.html
```

**_Vous creez les dossiers et les fichiers vous-memes. Clic droit, nouveau dossier, nouveau fichier. C'est important de le faire a la main._**

**Etape 2 (15 min)** — Demander a l'IA de creer le contenu :
- Page accueil : "Cree une page d'accueil avec mon nom et un texte de bienvenue"
- Page a propos : "Cree une page 'A propos' avec mon age, ma ville, mes hobbies"
- Page contact : "Cree une page contact avec mon email"

**Etape 3 (5 min)** — Navigation :
- Ouvrir les 3 fichiers → basculer entre eux par les onglets
- Ouvrir chacun dans le navigateur
- Modifier un truc → rafraichir dans le navigateur

**Etape 4 (5 min)** — Preuve :
- Screenshot de l'IDE avec la structure visible a gauche
- Screenshot d'une page dans le navigateur
- Envoyer dans Discord `#sessions` (thread Session 3)

→ Pendant l'exercice, PASSER AIDER. Problemes courants :
- "Je ne trouve pas le fichier" → montrer le panneau gauche
- "Ca n'affiche rien" → verifier que le fichier est bien .html pas .txt
- "Le navigateur affiche du code" → il faut ouvrir le fichier .html avec Chrome, pas avec l'IDE

### Pour ceux qui finissent tot

**_Si vous avez fini, posez des questions a votre IA :_**
- "Qu'est-ce que HTML ?"
- "Explique-moi le code de cette page"
- "Ajoute une image a ma page"

---

## DEBRIEFING (1:55–2:00)

**_Ce cours n'a pas pour but de vous expliquer comment fonctionne un site web. Ca c'est le cours suivant. Ce cours etait la pour installer votre environnement et vous habituer a l'interface._**

→ Encouragement :

**_Posez des questions a votre IA sur n'importe quoi. Pour les plus motives : demandez ce que c'est qu'un fichier HTML, CSS, JavaScript. Comment fonctionne le site que vous avez cree. C'est comme ca que vous vous preparez pour le cours suivant._**

→ Avertissement rythme :

**_C'est normal quand il y a beaucoup d'informations. Il faut du temps pour assimiler. C'est pour cela qu'on a commence petit a petit. Mais sachez que les choses vont aller de plus en plus vite et de plus en plus en profondeur._**

→ Phrase de cloture :

**_Preparez-vous, faites des efforts, ne faites pas uniquement ce que je vous demande. Vous avez l'environnement, vous avez l'IA. Jouez avec, experimentez. Si vous faites les exercices et assistez en cours, tout devrait se passer parfaitement bien._**

### 3-2-1

- 3 choses apprises
- 2 questions
- 1 action : refaire l'exercice 3 dossiers / 3 pages a la maison, de zero
