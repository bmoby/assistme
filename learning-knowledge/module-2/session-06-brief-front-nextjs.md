# Brief S6 — Projet Front-end Next.js intelligent

> Module 2 | Session 6
> **Objectif** : construire un vrai front-end Next.js personnel, avec plusieurs pages, une vraie navigation et une logique utile, sans backend ni base de donnees

---

## Idee centrale

Vous ne construisez pas un site qui se regarde.
Vous construisez un site qui aide un utilisateur a prendre une decision.

Autrement dit :

- ce n'est pas une simple landing page
- ce n'est pas un portfolio statique
- ce n'est pas une page unique avec scroll

Votre projet doit :

- presenter une offre
- laisser l'utilisateur explorer des options
- recolter quelques informations
- recommander un resultat
- pousser vers un contact

---

## Cadre commun

Tous les projets doivent rester comparables.

Chaque projet doit contenir :

1. **plusieurs pages**
2. **une vraie navigation**
3. **plusieurs composants reutilisables**
4. **une fonction intelligente simple**
5. **une collecte d'informations avec recommandation**
6. **un parcours utilisateur complet**

---

## Les pages

Le nombre exact n'a pas besoin d'etre impose.
Mais le projet doit etre un vrai petit site avec plusieurs pages.

Exemples de pages utiles :

- accueil
- offres ou services
- mini-questionnaire
- resultat ou recommandation
- contact ou demande

---

## Les composants

Le nombre exact n'a pas besoin d'etre impose.
Mais il doit y avoir plusieurs composants reutilisables sur differentes pages.

Exemples :

- navigation
- carte d'offre
- bloc CTA
- etape de question
- progress bar
- carte de resultat

La regle est simple :

> on ne copie pas le meme bloc partout, on le reutilise

---

## Les fonctions obligatoires

### 1. Une fonction intelligente simple

Une seule fonction de ce type suffit :

- tri par prix
- tri par date
- tri par niveau
- filtre par categorie
- recherche simple

### 2. Une recommandation apres collecte d'informations

Le visiteur doit repondre a quelques questions.
Ensuite, il doit voir une recommandation.

Le resultat peut etre :

- une offre recommandee
- un package recommande
- un niveau
- un score simple
- une estimation

Pour stocker temporairement des informations, on peut utiliser le navigateur comme mini-base de donnees via `localStorage`.

---

## Niveau de complexite attendu

Complexite attendue :

- plusieurs routes Next.js
- navigation claire
- composants reutilises
- logique conditionnelle simple
- questions puis recommandation
- usage de `localStorage` si utile

Complexite non attendue :

- backend
- base de donnees
- auth
- paiement
- admin dashboard
- API externe obligatoire

---

## Architecture recommandee

Exemple simple :

```text
mon-projet/
├── app/
│   ├── page.tsx
│   ├── offres/
│   │   └── page.tsx
│   ├── questionnaire/
│   │   └── page.tsx
│   ├── resultat/
│   │   └── page.tsx
│   ├── contact/
│   │   └── page.tsx
│   └── layout.tsx
├── components/
│   ├── MainNav.tsx
│   ├── OfferCard.tsx
│   ├── SortBar.tsx
│   ├── QuestionStep.tsx
│   └── ResultCard.tsx
└── lib/
    └── recommendation.ts
```

Vous n'etes pas obliges d'utiliser exactement ces noms.

---

## Templates autorises

Choisissez un de ces templates, puis adaptez-le a votre activite :

- coach ou consultant
- agence ou freelance
- immobilier
- formation
- sante, sport, nutrition
- service local

---

## Ce qui est interdit

Pour garder des projets comparables, vous ne devez pas faire :

- une seule page avec scroll
- un portfolio statique
- un clone sans logique metier
- un projet purement decoratif
- un projet trop grand pour votre niveau actuel

---

## Livrable

Vous devez preparer :

1. **une phrase qui explique le projet**
2. **la liste des fonctions principales**
3. **une capture ou une courte video du questionnaire et du resultat**

Le projet peut rester uniquement en local pour cette etape.

---

## Grille simple

Le projet est acceptable si :

- il a plusieurs pages
- la navigation fonctionne
- il y a plusieurs composants reutilisables
- il y a un tri, filtre ou recherche
- le mini-questionnaire fonctionne
- un resultat s'affiche
- la page contact existe

Le projet est insuffisant si :

- il ressemble a une landing page simple
- il n'y a presque pas de logique
- tout est statique
- il manque le parcours utilisateur

---

## Version courte a dire en live

> "Je ne veux pas juste un beau site. Je veux un petit front-end intelligent."

> "Vous choisissez un projet personnel, mais il doit avoir plusieurs pages, une vraie navigation, plusieurs composants reutilisables, une fonction simple comme un tri, puis une recommandation apres quelques questions."

> "Pas de backend. Pas de base de donnees. On reste sur un projet clair, utile et faisable."
