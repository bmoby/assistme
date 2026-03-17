# Session 2 — Quick Win + La salle et la cuisine

> Dimanche, Semaine 1 | Video pre-session (10 min) : "Votre site n'est qu'un restaurant — partie 1"
> **Artefact** : URL deployee (Quick Win) + schema d'architecture (salle + cuisine + recettes)

---

## Structure de la session (2h)

| Temps | Bloc | Contenu |
|-------|------|---------|
| 0:00-0:01 | Accueil | Emoji check-in |
| 0:01-0:15 | Quick Win : celebration + rattrapage | Montrer les URLs, aider ceux qui ont bloque |
| 0:15-0:20 | Connexion narrative | "Vous avez deploye. Mais COMMENT ca marche ?" |
| 0:20-0:50 | Analogie restaurant + decomposition | Front/back, algorithme, pseudocode |
| 0:50-0:55 | Pause active | Stretch, questions informelles |
| 0:55-1:50 | Exercice pratique | Dessiner le restaurant d'une app + DevTools |
| 1:50-1:56 | Debrief 3-2-1 | 3 choses apprises / 2 questions / 1 action |
| 1:56-2:00 | Annonce exercice | Description + deadline + conseil |

---

## PARTIE 0 — Quick Win : celebration + rattrapage (15 min)

### Ceux qui ont reussi (5 min)
- "Qui a deploye sa page cette semaine ? Postez vos URLs dans le chat !"
- Magomed ouvre 3-4 pages en partage d'ecran, commente, felicite
- "Vous avez un site EN LIGNE. Accessible par n'importe qui dans le monde."
- Reactions, celebration collective

### Ceux qui ont bloque (10 min)
- "Qui a eu un probleme ? C'est normal, dites-nous ou ca a coince."
- Magomed ou un mentor aide en direct les cas les plus courants (compte, OAuth, prompt)
- Les cas complexes → "Ton mentor t'aide apres la session, on ne bloque pas le groupe"
- "L'objectif c'est que TOUT LE MONDE ait son URL avant mercredi prochain"

### Transition
"Maintenant que vous avez deploye une page... comment ca marche ? Qu'est-ce qui se passe quand quelqu'un tape votre URL ? C'est ce qu'on va comprendre aujourd'hui."

---

*(Note : le retrieval quiz classique commence a partir de S3, car S1 etait un onboarding — pas de contenu technique a tester)*

## PARTIE 1 — L'analogie restaurant (35 min)

### 1.1 Introduction de l'analogie (10 min)

**Transition depuis le Quick Win** :
"La semaine derniere, vous avez deploye une page en ligne. Mais COMMENT ca marche ? Qu'est-ce qui se passe quand quelqu'un tape votre URL ?"

"Pour comprendre, on va utiliser une analogie que vous connaissez tous : le restaurant."

**Le mapping de base** :

| Restaurant | Digital |
|------------|---------|
| La salle (ce que le client voit) | **Front-end** : l'interface, les boutons, le design |
| La cuisine (ou on prepare) | **Back-end** : la logique, les calculs, le traitement |
| Le menu | **L'interface utilisateur (UI)** : les options disponibles |
| Les recettes | **Les algorithmes** : les etapes pour accomplir une tache |
| Le serveur (personne) | **L'API** : l'intermediaire qui transmet les demandes |

**Point cle** : "Le client ne voit JAMAIS la cuisine. Il ne sait pas si les pates sont faites maison ou surgelees. Il ne sait pas si c'est un robot ou un humain qui cuisine. Il s'en fiche. Il veut juste son plat."

"C'est EXACTEMENT comme sur le web. L'utilisateur ne voit que le front-end. Il ne sait pas et ne se soucie pas de ce qui se passe dans le back-end."

### 1.2 Front-end — La salle (5 min)

**Ce que le client voit quand il entre** :
- Le decor, les tables, les chaises = le design, la mise en page, les couleurs
- Le menu sur la table = les boutons, les liens, les formulaires
- L'ambiance, l'eclairage = l'experience utilisateur (UX) — le "feeling" de l'app
- Le serveur (personne) qui vient a la table = les interactions (cliquer, scroller, taper)

**Demo rapide** : Ouvrir Instagram sur l'ecran partage.
"Tout ce que vous voyez la — le feed, les stories, les boutons like et comment, le menu en bas — c'est la SALLE du restaurant Instagram. C'est le front-end."

### 1.3 Back-end — La cuisine (5 min)

**Ce qui se passe derriere les portes battantes** :
- Les cuisiniers = les algorithmes qui traitent les demandes
- Les recettes = la logique metier (les regles qui dictent comment faire)
- L'organisation de la cuisine = l'architecture du serveur
- Le chef executif = le systeme d'orchestration

"Quand vous tapez 'like' sur une photo Instagram, votre doigt touche la SALLE (front-end). Mais derriere, la CUISINE (back-end) fait plein de choses : enregistrer votre like, mettre a jour le compteur, peut-etre notifier la personne, peut-etre ajuster l'algorithme de feed..."

### 1.4 La separation — Pourquoi c'est important (5 min)

**Le concept fondamental** : La salle et la cuisine sont SEPAREES. Elles communiquent par le serveur (la personne), mais elles ont chacune leur role.

**Pourquoi** :
- Le decorateur peut refaire la salle sans toucher a la cuisine
- Le chef peut changer les recettes sans toucher a la salle
- Si la cuisine brule, la salle peut continuer a accueillir (mode degrade)

"En digital, c'est pareil : on peut refaire le design d'un site (front) sans toucher a la logique (back). Et inversement."

### 1.5 Misconceptions a casser immediatement

1. **"Le front-end c'est juste du visuel"** : Non, le front-end contient aussi de la logique. La salle du restaurant a ses propres regles : comment placer les gens, gerer les reservations.

2. **"Le back-end est plus important"** : Ni l'un ni l'autre. Un restaurant avec une cuisine extraordinaire mais une salle repoussante ne tiendra pas. Et inversement.

3. **"C'est deux choses separees qui ne se parlent pas"** : Le serveur (personne) fait des allers-retours CONSTANTS entre salle et cuisine. C'est l'API.

---

## PARTIE 2 — Decomposition et pseudocode (10 min)

### 2.1 L'algorithme de la routine du matin (5 min)

**Exercice eclair** : "Ecrivez en 2 minutes votre routine du matin. Chaque etape = une ligne."

Exemple que Magomed ecrit en live :
```
1. Le reveil sonne
2. Se lever
3. Aller a la salle de bain
4. Douche
5. S'habiller
6. Petit-dejeuner
7. Partir
```

**Puis, ajouter les conditions** :
```
1. Le reveil sonne
2. SI snooze → attendre 10 min → retour a 1
3. Se lever
4. Aller a la salle de bain
5. SI jour de semaine → douche rapide (10 min)
   SINON (weekend) → douche longue (20 min)
6. S'habiller
7. SI frigo vide → commander petit-dej
   SINON → preparer petit-dej
8. Manger
9. SI retard → taxi
   SINON → marcher
10. Arriver
```

**Revelation** : "Vous venez d'ecrire un algorithme. Avec des conditions (SI/SINON). C'est EXACTEMENT ce que fait le code — mais dans un langage que l'ordinateur comprend."

### 2.2 Conditions IF/SINON dans la vie (5 min)

**Exemples supplementaires** :

**Le thermostat** :
```
SI temperature < 20°C → allumer le chauffage
SINON SI temperature > 25°C → allumer la clim
SINON → ne rien faire
```

**Netflix** :
```
SI l'utilisateur a regarde > 3 episodes aujourd'hui
  → afficher "Vous etes toujours la ?"
SINON
  → lancer l'episode suivant automatiquement
```

**Le serveur du restaurant** :
```
SI le client commande un plat au menu
  → transmettre a la cuisine
SINON SI le client a une allergie
  → verifier avec le chef
  → SI substitution possible → proposer alternative
  → SINON → recommander un autre plat
```

**Point cle** : "Chaque app que vous utilisez est REMPLIE de conditions IF/SINON. Ce n'est pas de la magie — c'est de la logique de tous les jours, ecrite de maniere precise."

---

## PARTIE 3 — Demo DevTools (10 min)

### 3.1 Onglet Elements (3 min)

- Ouvrir DevTools sur un site connu (google.com ou instagram.com)
- Montrer que le site est "fait de boites" imbriquees
- Survoler les elements → ils se surlignent sur la page
- "Chaque site web est une pile de boites imbriquees. L'IA genere ces boites pour vous."

**Exercice eclair** : "Changez le titre de la page en votre nom."
(Modifier le texte directement dans DevTools — 30 secondes. Les rires sont garantis.)

### 3.2 Onglet Network (3 min) — Le plus impressionnant

- Rafraichir la page avec l'onglet Network ouvert
- Montrer toutes les requetes : "Chaque ligne est un aller-retour entre votre navigateur (la salle) et le serveur (la cuisine)"
- Montrer le nombre : "Pour afficher cette page, votre navigateur a fait 47 demandes au serveur"
- Cliquer sur une requete, montrer la reponse : "Voila ce que le serveur a renvoye"
- **"C'est ca, une API en action. Votre navigateur DEMANDE, le serveur REPOND."**

### 3.3 Mode responsive (2 min)

- Basculer en mode mobile dans DevTools
- Le site s'adapte a la taille de l'ecran
- "C'est le responsive design. Le meme restaurant, mais la salle change de forme selon le client."

### 3.4 Console — Demystifier (2 min)

- Taper `document.title = "Je suis un hacker"` → Le titre de l'onglet change
- Taper `document.body.style.backgroundColor = "pink"` → La page devient rose
- Rires. "Vous venez d'ecrire du code. C'est tout. C'est pas plus mysterieux que ca."
- **Important** : "Ce que vous changez ici, c'est JUSTE sur votre ecran. Le vrai site n'a pas change. Vous avez modifie la salle de VOTRE cote, pas la cuisine du serveur."

---

## PARTIE 4 — Exercice pratique (60 min)

### L'exercice "Dessine le restaurant" (45 min)

**Consigne** :
1. Choisir une app que tu utilises tous les jours (Instagram, Uber, Spotify, WhatsApp, Amazon...)
2. Dessiner son "restaurant" avec 3 zones :
   - **LA SALLE** : qu'est-ce que l'utilisateur voit ? Quels ecrans ? Quels boutons ?
   - **LA CUISINE** : que se passe-t-il quand on appuie sur chaque bouton ? Quelles "recettes" ?
   - **LES RECETTES** : quelles regles l'app suit ? (ex: "SI pas connecte → afficher page de login")

**Template a distribuer** (version simplifiee pour S2) :
```
APP : _______________

LA SALLE (ce que je vois)
  - Ecran principal : _______________
  - Boutons principaux : _______________
  - Ce que je peux faire : _______________

LA CUISINE (ce qui se passe derriere)
  - Quand je clique sur [action], que fait le serveur ? _______________
  - Quelles "recettes" l'app suit ? _______________

LES RECETTES (les conditions)
  - SI [condition] ALORS [action] : _______________
  - SI [condition] ALORS [action] : _______________
```

**Format** : 25 min de travail individuel → 20 min de presentation au pod.

### Presentations en pod (15 min)

- Chaque etudiant presente son "restaurant" au pod (3-4 min chacun)
- Le pod compare : "Vous avez tous dessine le meme type de restaurant, avec des plats differents"
- **Preparation pour S3** : "La prochaine fois, on ajoutera le frigo (base de donnees), les fournisseurs (APIs externes), et le vigile (auth). Le restaurant sera complet."

---

## Annonce exercice

**Titre** : "Complete ton restaurant"

**Consigne** :
1. Reprends ton schema de la session
2. Ajoute 3 "recettes" supplementaires (conditions IF/SINON que l'app utilise)
3. Essaie de deviner : ou sont les DONNEES stockees dans cette app ? (preparation pour S3)
4. Partage ton schema dans ton canal de pod

**Deadline** : Vendredi 20h.

---

## Video pre-session (a preparer)

**Titre** : "Votre site n'est qu'un restaurant — partie 1"
**Duree** : 10 min
**Format** : Magomed face camera + illustrations simples

**Plan** :
1. (0:00-2:00) "La semaine derniere, vous avez deploye un site. Mais comment ca marche ?"
2. (2:00-5:00) L'analogie restaurant : salle = front-end, cuisine = back-end
3. (5:00-7:00) Exemples concrets : Instagram, Uber (ce qu'on voit vs ce qui se passe derriere)
4. (7:00-9:00) "Pourquoi cette separation est importante"
5. (9:00-10:00) "Dimanche, on va dessiner le restaurant de VOTRE app preferee. Reflechissez a quelle app vous choisiriez."

---

## Visuels a creer

1. **Schema "Le restaurant digital"** : Dessin simple avec salle a gauche, portes battantes au milieu, cuisine a droite. Annotations claires. Style enfantin, PAS UML.

2. **Slide "Front-end vs Back-end"** : 2 colonnes avec exemples concrets (ce qu'on voit / ce qui se passe derriere)

3. **Template "Dessine ton restaurant"** : Feuille A4 avec les 3 zones pre-dessinees (salle, cuisine, recettes) a remplir

4. **Slide "Routine du matin = algorithme"** : L'exemple complet avec les conditions

5. **Capture DevTools** : Screenshots annotes de chaque etape de la demo

---

## Recherche detaillee — L'analogie restaurant

### Pourquoi cette analogie domine (source : Recherche B + recherche web)

L'analogie restaurant est la plus utilisee et la plus efficace pour expliquer l'architecture web. Elle fonctionne parce que :
- **Universalite** : tout le monde a ete au restaurant
- **Completude** : elle couvre front, back, DB, API, auth, DNS — tout en une seule metaphore
- **Extensibilite** : on peut ajouter des elements au fur et a mesure (S2 → S3)
- **Memoire** : les etudiants se souviennent du restaurant longtemps apres la formation

### Source neurologique (Hofstadter)
Douglas Hofstadter considere que "l'analogie est le coeur de la cognition." Quand on apprend quelque chose de nouveau, le cerveau cherche des structures similaires dans sa memoire a long terme. L'analogie utilise ce mecanisme : au lieu d'introduire un concept de zero, on le greffe sur une structure existante.

### Le cycle en 3 temps
1. **Introduction par analogie** : "Tu connais un restaurant ? Un site web, c'est pareil."
2. **Construction sur l'analogie** : Travailler avec les concepts en s'appuyant sur la metaphore
3. **Rupture explicite** : "Maintenant je vais te dire ou l'analogie ne tient plus..." (a faire en S3)

Sauter l'etape 3 cree des malentendus durables.

### Ce qu'il ne faut PAS dire
- **Eviter le jargon** : Ne pas dire "endpoint" quand on peut dire "adresse du serveur". Ne pas dire "payload" quand on peut dire "contenu de la demande".
- **Ne pas minimiser** : "C'est simple" est la phrase la plus demotivante pour un debutant.
- **Ne pas melanger les analogies** : Restaurant + hopital + usine dans la meme session = confusion.

### La confusion du mot "serveur"
En francais, "serveur" designe a la fois la machine (server) et la personne (waiter). Ca cree de la confusion. Solutions :
- En S2 : utiliser uniquement "serveur = la personne qui transmet les commandes"
- En S3 : introduire "machine-serveur = l'ordinateur qui heberge le site"
- Faire la distinction explicitement : "Attention, deux sens differents du mot serveur !"
