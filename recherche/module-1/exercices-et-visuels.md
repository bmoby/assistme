# Module 1 — Exercices, Templates et Visuels a preparer

---

## Exercices par session

### S1 — "Prepare-toi et deploie ta premiere page"
- **Type** : Guide (tout est montre, reproduire + iterer)
- **Duree estimee** : 30-60 min
- **Livrable** : Compte v0 cree + URL deployee + capture dans Discord #victoires
- **Criteres** : La page est en ligne, partagee a au moins 1 personne, URL postee dans #victoires
- **Feedback** : Encouragements + 1 suggestion d'amelioration

### S2 — "Complete ton restaurant"
- **Type** : Guide (template fourni, remplir)
- **Duree estimee** : 1-2h
- **Livrable** : Schema complete avec 3 recettes IF/SINON supplementaires + hypothese sur les donnees
- **Criteres** : Les 3 zones sont remplies (salle, cuisine, recettes), les conditions sont logiques
- **Feedback** : Commentaire sur la qualite de la decomposition

### S3 — "3 apps, 1 restaurant"
- **Type** : Guide → semi-guide (le template est fourni, mais l'etudiant choisit les apps)
- **Duree estimee** : 2-3h
- **Livrable** : 3 schemas de restaurants + paragraphe de synthese
- **Criteres** : Les 6 zones sont remplies pour chaque app, la synthese identifie le pattern commun
- **Feedback** : Commentaire sur la capacite a voir les patterns

### S4 — "Ton portfolio personnel"
- **Type** : Guide (etapes donnees, mais choix creatifs libres)
- **Duree estimee** : 3-5h
- **Livrable** : URL du portfolio deploye sur Vercel
- **Criteres** : 4 sections minimum (accueil, a propos, projets, contact), deploye, partageable
- **Feedback** : Review UX rapide + encouragements

---

## Progression des exercices

```
S1 : Deployer (creer un compte + deployer chez soi) → Bloom: Comprendre
S2 : Analyser (decomposer une app existante)      → Bloom: Analyser
S3 : Comparer (identifier des patterns)            → Bloom: Analyser
S4 : Creer (construire son propre projet)          → Bloom: Appliquer
```

**Scaffolding** : Chaque exercice donne un peu plus de liberte que le precedent, mais reste dans le cadre "guide".

---

## Templates a distribuer

### Template 1 — "Dessine ton restaurant" (S2)

```
╔══════════════════════════════════════════════════════════╗
║  APP : _______________________________________________  ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  🏪 LA SALLE (ce que l'utilisateur voit)                ║
║  ┌──────────────────────────────────────────────┐       ║
║  │ Ecran principal : __________________________ │       ║
║  │ Boutons/actions : __________________________ │       ║
║  │ Ce qu'on peut faire : ______________________ │       ║
║  └──────────────────────────────────────────────┘       ║
║                                                          ║
║  🍳 LA CUISINE (ce qui se passe derriere)               ║
║  ┌──────────────────────────────────────────────┐       ║
║  │ Quand je clique [action], il se passe : ____ │       ║
║  │ Logique principale : _______________________ │       ║
║  └──────────────────────────────────────────────┘       ║
║                                                          ║
║  📋 LES RECETTES (les conditions)                       ║
║  ┌──────────────────────────────────────────────┐       ║
║  │ SI _____________ ALORS _____________________ │       ║
║  │ SI _____________ ALORS _____________________ │       ║
║  │ SI _____________ ALORS _____________________ │       ║
║  └──────────────────────────────────────────────┘       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

### Template 2 — "Le restaurant complet" (S3)

```
╔══════════════════════════════════════════════════════════╗
║  APP : _______________________________________________  ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  🏪 LA SALLE (front-end)                                ║
║  Ecrans : ______________________________________________║
║  Actions : _____________________________________________║
║                                                          ║
║  🍳 LA CUISINE (back-end)                               ║
║  Logique : _____________________________________________║
║  Recettes : ____________________________________________║
║                                                          ║
║  🗄️ LE FRIGO (base de donnees)                          ║
║  Donnees stockees : ____________________________________║
║  Nb de "tables" : _____________________________________║
║                                                          ║
║  🚛 LES FOURNISSEURS (APIs tierces)                     ║
║  Cartes : ______________________________________________║
║  Paiement : ____________________________________________║
║  Notifications : _______________________________________║
║  Autre : _______________________________________________║
║                                                          ║
║  👮 LE VIGILE (authentification)                        ║
║  Connexion : ___________________________________________║
║  Permissions (normal vs admin) : _______________________║
║                                                          ║
║  📍 L'ADRESSE (DNS)                                     ║
║  Nom de domaine : ______________________________________║
║  Ou est le serveur : ___________________________________║
║                                                          ║
║  💥 POINT DE RUPTURE                                    ║
║  Nb d'utilisateurs : ___________________________________║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

## Visuels a creer — Liste complete

### Session 1

| # | Visuel | Format | Description |
|---|--------|--------|-------------|
| 1 | Journey Map | Slide/Image | Timeline des 12 semaines, 6 phases, indication vallee du desespoir |
| 2 | Guide Quick Win | PDF 1 page | 5 etapes v0 → Vercel avec captures d'ecran |
| 3 | Regles de vie | Slide | Les 5 regles essentielles en format poster |

### Session 2

| # | Visuel | Format | Description |
|---|--------|--------|-------------|
| 4 | Le restaurant digital | Dessin/Slide | Salle a gauche, portes battantes, cuisine a droite. Style enfantin. |
| 5 | Front-end vs Back-end | Slide | 2 colonnes avec exemples concrets |
| 6 | Routine = algorithme | Slide | L'exemple complet avec conditions IF/SINON |
| 7 | Template "Dessine ton restaurant" | PDF A4 | 3 zones a remplir (voir template 1) |
| 8 | Captures DevTools | Screenshots | Chaque etape de la demo annotee |

### Session 3

| # | Visuel | Format | Description |
|---|--------|--------|-------------|
| 9 | Le restaurant complet | Dessin/Slide | TOUS les elements : salle, cuisine, frigo, serveur, fournisseurs, vigile, adresse |
| 10 | Flux d'une requete | Diagramme | Parcours d'un clic etape par etape (style plan de metro) |
| 11 | Tableur vs Base de donnees | Slide | Tableau comparatif visuel |
| 12 | Le pattern universel | Slide | Tableau Instagram/Uber/Airbnb/Spotify |
| 13 | Template "Restaurant complet" | PDF A4 | 6 zones a remplir (voir template 2) |
| 14 | Les erreurs du serveur | Slide | 404/401/503 avec icones restaurant |

### Session 4

| # | Visuel | Format | Description |
|---|--------|--------|-------------|
| 15 | 3 niveaux d'outils IA | Infographie | Pyramide : generateurs → editeurs → assistants |
| 16 | Tableau comparatif outils | Slide | 7 outils avec etoiles |
| 17 | Progression dans la formation | Timeline | Quel outil est introduit a quel moment |
| 18 | Guide installation Cursor | PDF 1 page | Avec captures d'ecran |
| 19 | Captures demo comparative | Screenshots | v0 vs Cursor vs Claude Code sur le meme projet |

### Transversal

| # | Visuel | Format | Description |
|---|--------|--------|-------------|
| 20 | Checklist pre-boarding J-3 | Message/Image | Les 4 pre-requis techniques |
| 21 | Message de bienvenue J-7 | Template texte | A personnaliser par etudiant |

**Total : 21 visuels a preparer pour le Module 1.**

---

## Videos pre-session a preparer

| Video | Session | Duree | A tourner avant |
|-------|---------|-------|-----------------|
| "Votre site n'est qu'un restaurant — partie 1" | S2 | 10 min | Semaine 1 (avant dimanche) |
| "Votre site n'est qu'un restaurant — partie 2" | S3 | 10 min | Semaine 2 (avant mercredi) |
| "Claude, Cursor, Codex — c'est quoi la difference ?" | S4 | 15 min | Semaine 2 (avant dimanche) |

**Note** : Pas de video pour S1 (c'est la premiere session).

---

## Recaps PDF a preparer (apres chaque session)

| Recap | Contenu | Longueur |
|-------|---------|----------|
| Recap S1 | Qu'est-ce qu'on a fait, URL v0, exercice | 1 page |
| Recap S2 | L'analogie restaurant (salle/cuisine), decomposition, IF/SINON, DevTools | 2 pages |
| Recap S3 | DB, API, auth, DNS, patterns, template restaurant complet | 2 pages |
| Recap S4 | Les 3 niveaux d'outils IA, tableau comparatif, portfolio | 2 pages |

**Format** : PDF epure, couleurs de la marque, les points cles en bullet points, un schema visuel par page.

---

## Retrieval quizzes

### Quiz S2 (debut de session, sur S1)
1. "Quel outil on a utilise pour creer la landing page ?"
2. "Qu'est-ce qu'on a fait APRES avoir cree la page ?"
3. "Pourquoi c'est important d'avoir une URL partageable ?"

### Quiz S3 (debut de session, sur S2)
1. "Qu'est-ce que le front-end d'une app ?"
2. "Qu'est-ce que le back-end ?"
3. "Donnez un exemple de condition IF/SINON dans une app"

### Quiz S4 (debut de session, sur S3)
1. "Qu'est-ce que le frigo dans notre analogie restaurant ?"
2. "Donnez un exemple de fournisseur (API tierce)"
3. "Quelle est la difference entre authentification et autorisation ?"

### Quiz S5 (debut du Module 2, sur tout le Module 1)
1. "Dessinez en 30 secondes le restaurant complet d'une app"
2. "Nommez les 3 niveaux d'outils IA"
3. "Qu'est-ce qu'un algorithme, en une phrase ?"

---

## Criteres d'evaluation par exercice

**Grille simple (pas de notes, feedback qualitatif)** :

| Critere | Description |
|---------|-------------|
| ✅ Complet | Toutes les sections sont remplies |
| ✅ Logique | Les conditions IF/SINON sont coherentes |
| ✅ Patterns | L'etudiant identifie des points communs entre apps |
| ✅ Deploye | Le projet est en ligne et accessible |
| ✅ Partage | L'etudiant a partage dans Discord |

**Pas de note numerique.** Le feedback est un commentaire personnalise :
- Ce qui est bien fait
- 1 suggestion d'amelioration
- 1 encouragement pour la suite

---

## Preparation technique pour Magomed

### Avant S1
- [ ] Tester le workflow v0 → Vercel une derniere fois
- [ ] Preparer 3-4 exemples de prompts v0
- [ ] Avoir les instructions de secours si v0 est down (Bolt.new)
- [ ] Liste des pods finalisee
- [ ] Bot Discord fonctionnel (welcome DM, commandes)
- [ ] Message pre-boarding J-7 envoye
- [ ] Checklist J-3 envoyee

### Avant S2
- [ ] Video "restaurant partie 1" tournee et uploadee
- [ ] Schema "le restaurant digital" cree
- [ ] Template "dessine ton restaurant" pret
- [ ] Demo DevTools repete
- [ ] Recap S1 PDF poste dans Discord

### Avant S3
- [ ] Video "restaurant partie 2" tournee et uploadee
- [ ] Schema "le restaurant complet" cree
- [ ] Template "restaurant complet" pret
- [ ] Tableau "pattern universel" prepare
- [ ] Recap S2 PDF poste

### Avant S4
- [ ] Video "Claude, Cursor, Codex" tournee et uploadee (15 min)
- [ ] Cursor installe et teste
- [ ] Mini-projet de demo prepare (meme projet dans v0, Cursor, Claude Code)
- [ ] Guide d'installation Cursor envoye aux etudiants
- [ ] Recap S3 PDF poste

---

## Timeline de preparation

```
J-14 : Finaliser le curriculum detaille (✅ ce document)
J-10 : Creer les visuels et templates (slides, PDF, schemas)
J-7  : Envoyer le pre-boarding aux etudiants
J-5  : Tourner la video S2 ("restaurant partie 1")
J-3  : Envoyer la checklist technique
J-1  : Rappel + test final des outils
J    : SESSION 1
J+1  : Poster le recap S1 + quiz
J+2  : Tourner la video S3 si pas deja fait
J+4  : SESSION 2
J+5  : Poster le recap S2 + quiz
J+6  : Tourner la video S4
J+7  : SESSION 3
J+8  : Poster le recap S3 + quiz + rappel installer Cursor
J+11 : SESSION 4
J+12 : Poster le recap S4 + preview Module 2
```
