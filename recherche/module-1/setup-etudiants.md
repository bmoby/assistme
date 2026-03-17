# Setup etudiants — Quoi installer, quels comptes, quel budget

> Ce document liste TOUT ce dont un etudiant a besoin, semaine par semaine.
> Principe : on n'installe RIEN a l'avance. Chaque outil arrive au moment ou il sert.

---

## Vue d'ensemble — Les outils de la formation

| Outil | Type | Quand | Gratuit ? | Alternatives |
|-------|------|-------|-----------|--------------|
| Discord | Communication | Pre-S1 | Oui | — |
| Navigateur (Chrome) | Web | Deja la | Oui | Firefox |
| v0.dev | Generateur IA | S1 (exercice) | Oui (limite) | Bolt.new |
| Cursor | Editeur IA | S4 | Oui (limite) | Windsurf |
| GitHub | Stockage de code | S4 | Oui | — |
| Claude.ai / ChatGPT | Assistant IA (chat) | S5-S6 | Oui (limite) | L'un ou l'autre |
| Supabase | Base de donnees | M3 (S11+) | Oui | — |
| Vercel | Hebergement | Auto (via v0) | Oui | — |
| Claude Code | Assistant code CLI | M3-M4 (optionnel) | Non (~$15-50/mois) | Codex CLI |

---

## Semaine par semaine — ce qu'il faut preparer

### AVANT la S1 (pre-boarding, J-7 a J-1)

**Comptes a creer :**
- [ ] Compte Google (si pas deja un) — pour se connecter a tous les outils
- [ ] Discord installe (desktop OU mobile) + rejoint le serveur Pilote Neuro

**A installer :**
- Rien.

**Abonnements :**
- Rien.

**Temps estime** : 10 minutes.

---

### Exercice S1 → avant la S2 (4 jours)

**Comptes a creer :**
- [ ] Compte v0.dev — gratuit, connexion avec Google, 30 secondes
  - Aller sur https://v0.dev → "Sign in with Google"
  - C'est tout. Pas de carte bancaire.

**A installer :**
- Rien. v0 fonctionne dans le navigateur.

**Le Quick Win :**
1. Aller sur v0.dev
2. Ecrire un prompt (exemples fournis dans le guide)
3. L'IA genere une page
4. Cliquer "Deploy" → le site est en ligne
5. Copier l'URL → poster dans Discord #victoires

**Guide pas-a-pas** : PDF/post Discord avec captures d'ecran de chaque etape. A poster dans #sessions juste apres la S1.

**Si ca bloque :**
- v0 demande de creer un compte Vercel → se connecter avec Google (meme compte)
- Le prompt ne donne pas un bon resultat → exemples de prompts fournis
- "Deploy" ne marche pas → poster le probleme dans #entraide, le mentor aide

**Temps estime** : 30 minutes a 1 heure.

---

### Avant la S4 (fin de semaine 1)

C'est le premier vrai setup technique. A faire CHEZ SOI avec un guide.

**Comptes a creer :**
- [ ] Compte GitHub — gratuit, https://github.com → "Sign up"
  - Necessaire pour sauvegarder le code et deployer
  - Guide fourni : captures d'ecran, etape par etape

**A installer :**
- [ ] **Cursor** — editeur de code avec IA integree
  - Aller sur https://cursor.com → "Download"
  - Installer comme n'importe quelle app (double-clic)
  - Se connecter avec Google ou GitHub
  - C'est un editeur de texte "intelligent" — pas besoin de savoir coder pour l'utiliser
  - **Plan gratuit** : suffisant pour la formation (completions IA limitees mais ok pour apprendre)

**Guide d'installation** : PDF avec captures d'ecran pour Mac et Windows. Poste dans #sessions avant S3.

**Problemes prevus et solutions :**
| Probleme | Solution |
|----------|----------|
| "C'est quoi un editeur de code ?" | "C'est comme Word, mais pour du code. L'IA ecrit pour vous." |
| Cursor ne s'installe pas (Mac) | Autoriser dans Parametres > Securite |
| Cursor ne s'installe pas (Windows) | Executer en tant qu'administrateur |
| "Il faut payer ?" | Non, le plan gratuit suffit. Cliquer "Continue with Free" |
| "Je comprends rien a l'interface" | Normal, on verra ensemble en S4. Juste l'installer. |

**Temps estime** : 15-20 minutes.

---

### Avant la S5 (debut Module 2, semaine 3)

**Comptes a creer :**
- [ ] Compte Claude.ai (Anthropic) — gratuit, https://claude.ai
  - OU compte ChatGPT (OpenAI) — gratuit, https://chatgpt.com
  - L'un OU l'autre. Les deux fonctionnent. Claude est recommande (c'est ce que Magomed utilise).
  - **Plan gratuit** : suffisant pour les exercices du Module 2

**Pourquoi maintenant et pas avant** : En M1 on utilise un generateur (v0) et un editeur (Cursor) — l'IA est DANS l'outil. En M2, on commence a CONVERSER avec l'IA directement (recherche, questions, methode). C'est la que Claude.ai/ChatGPT entre en jeu.

**A installer :**
- Rien de nouveau.

---

### Avant la S11 (Module 3, semaine 6)

Pour les projets qui ont besoin d'une base de donnees :

**Comptes a creer :**
- [ ] Compte Supabase — gratuit, https://supabase.com → "Start your project"
  - Connexion avec GitHub (deja cree)
  - Plan gratuit : 2 projets, 500MB de stockage — largement suffisant

**A installer :**
- Rien.

---

### Module 3-4 (semaines 5-8) — OPTIONNEL pour les plus avances

**Claude Code** (assistant code en terminal) :
- Necessite : Node.js + cle API Anthropic
- **Pas obligatoire.** Cursor suffit pour 90% des etudiants
- Pour ceux qui veulent aller plus loin
- Cout : $15-50/mois selon l'usage (consommation API)

**Alternative gratuite : Codex CLI** (OpenAI) :
- Inclus dans ChatGPT Plus ($20/mois)
- Ou gratuit avec limites

**Recommandation** : Ne pas pousser Claude Code/Codex CLI sur tout le monde. Les presenter en S10 (session agents), laisser les volontaires essayer.

---

## Budget etudiant — Combien ca coute ?

### Scenario 1 : Tout gratuit (0€/mois)

| Outil | Plan |
|-------|------|
| Discord | Gratuit |
| v0.dev | Gratuit (credits limites) |
| Cursor | Free (completions limitees) |
| Claude.ai | Gratuit (usage limite) |
| GitHub | Gratuit |
| Vercel | Hobby (gratuit) |
| Supabase | Free (2 projets) |

**Fonctionnel pour toute la formation.** Les limites des plans gratuits sont suffisantes pour apprendre. On ne construit pas des apps de production en M1-M3.

### Scenario 2 : Confort (20€/mois)

| Outil | Plan | Prix |
|-------|------|------|
| Cursor Pro | Completions illimitees | $20/mois (~18€) |
| Tout le reste | Gratuit | 0€ |

**Recommande a partir du Module 2** quand les etudiants utilisent Cursor intensivement. Mais pas obligatoire.

### Scenario 3 : Avance (40-60€/mois)

| Outil | Plan | Prix |
|-------|------|------|
| Cursor Pro | Completions illimitees | $20/mois |
| Claude Pro | Usage illimite | $20/mois |
| Claude Code | API usage | $15-30/mois |

**Pour les plus motives a partir du Module 3.** Pas du tout necessaire pour la majorite.

### Ce qu'il faut dire aux etudiants

"La formation peut se faire a **0€ de cout supplementaire** avec les plans gratuits. Si vous voulez plus de confort a partir du Module 2, Cursor Pro a $20/mois est le seul investissement recommande. Tout le reste est optionnel."

---

## Checklist de pre-boarding (a envoyer J-3)

```
AVANT LA PREMIERE SESSION — Checklist (5 minutes)

[ ] J'ai un compte Google
[ ] J'ai installe Discord (desktop ou mobile)
[ ] J'ai rejoint le serveur Pilote Neuro (lien : ...)
[ ] J'ai dit bonjour dans #general
[ ] Mon navigateur est Chrome ou Firefox (a jour)
[ ] Ma connexion internet tient un appel video

C'est TOUT. On verra le reste ensemble.
```

---

## Checklist exercice S1 (a envoyer apres la S1)

```
EXERCICE SEMAINE 1 — Ton premier site en ligne

ETAPE 1 — Creer ton compte v0 (2 min)
[ ] Aller sur https://v0.dev
[ ] Cliquer "Sign in" → choisir Google
[ ] Accepter les conditions

ETAPE 2 — Creer ta page (15 min)
[ ] Cliquer sur "New Chat" ou le champ de prompt
[ ] Ecrire un prompt, par exemple :
    "Cree une landing page moderne pour [ton prenom],
     [ton activite ou ta passion]. Avec un hero,
     une section a propos, et un bouton de contact.
     Style epure, couleurs [ta preference]."
[ ] Attendre que l'IA genere la page (~30 secondes)
[ ] Si le resultat ne te plait pas, ecris ce que tu veux changer :
    "Change la couleur en bleu", "Ajoute une photo de fond", etc.

ETAPE 3 — Deployer (2 min)
[ ] Cliquer sur "Deploy" ou "Publish"
[ ] Si on te demande de creer un compte Vercel → "Continue with Google"
[ ] Attendre 30 secondes → ton URL apparait : xxx.vercel.app
[ ] COPIER cette URL

ETAPE 4 — Partager (2 min)
[ ] Coller l'URL dans Discord #victoires
[ ] Envoyer l'URL a au moins 1 personne (famille, ami)
[ ] Felicitations, tu as un site en ligne !

SI TU BLOQUES :
→ Poste ta question + un screenshot dans #entraide
→ Ou ecris a ton mentor de pod
→ On t'aide sous 24h max

DEADLINE : Vendredi 20h
```

---

## Checklist avant S4 (a envoyer apres S3)

```
AVANT LA SESSION 4 — Installer Cursor (15 min)

ETAPE 1 — Creer un compte GitHub (5 min)
[ ] Aller sur https://github.com
[ ] Cliquer "Sign up"
[ ] Email + mot de passe + nom d'utilisateur
[ ] Verifier l'email de confirmation

ETAPE 2 — Installer Cursor (10 min)
[ ] Aller sur https://cursor.com
[ ] Cliquer "Download" (Mac ou Windows)
[ ] Installer l'application (comme n'importe quelle app)
[ ] Ouvrir Cursor
[ ] Se connecter avec Google ou GitHub
[ ] Choisir "Continue with Free plan"
[ ] C'est pret !

NE PANIQUEZ PAS si l'interface vous parait complexe.
On verra tout ensemble en Session 4.
L'objectif c'est juste de l'INSTALLER.

SI TU BLOQUES :
→ Screenshot du probleme dans #entraide
→ Ton mentor t'aide
```

---

## Documentation et ressources pour les etudiants

### Fourni par Magomed (dans Discord #sessions)

| Ressource | Quand | Format |
|-----------|-------|--------|
| Guide Quick Win (v0 → Vercel) | Apres S1 | PDF/Post avec captures |
| Guide installation Cursor | Apres S3 | PDF/Post avec captures |
| Guide installation GitHub | Apres S3 | PDF/Post avec captures |
| Recap de chaque session | Apres chaque session | PDF 1-2 pages |
| Video pre-session | Avant chaque session (sauf S1) | Video 10-15 min |
| Exemples de prompts v0 | Avec l'exercice S1 | Liste dans le post |
| Template "Dessine ton restaurant" | En S2 | PDF A4 |
| Template "Restaurant complet" | En S3 | PDF A4 |
| Tableau comparatif outils IA | En S4 | Slide/Image |

### Ressources externes recommandees (optionnel)

| Ressource | Pour quoi | Lien |
|-----------|-----------|------|
| Documentation Cursor | Comprendre l'editeur | cursor.com/docs |
| Claude.ai | Converser avec l'IA | claude.ai |
| Vercel docs (basics) | Comprendre le deploiement | vercel.com/docs |

**Pas de liste de 50 liens.** Les etudiants ne les liront pas. Tout ce dont ils ont besoin est dans Discord, poste par Magomed au bon moment.

---

## Resume en 1 phrase par moment

| Moment | Ce qu'il faut | Temps |
|--------|---------------|-------|
| Pre-boarding (J-3) | Discord + navigateur | 10 min |
| Exercice S1 | Compte v0.dev + Quick Win | 30-60 min |
| Avant S4 | GitHub + Cursor installe | 15-20 min |
| Avant S5 | Compte Claude.ai ou ChatGPT | 5 min |
| Avant S11 | Compte Supabase | 5 min |
| M3-4 (optionnel) | Claude Code ou Codex CLI | 30 min + $15-50/mois |

**Total obligatoire sur 12 semaines : 4 comptes gratuits + 1 app installee.** C'est tout.
