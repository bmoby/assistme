# SPEC : Bot Instagram "Filtre"

## Vue d'ensemble
Filtre automatique des DMs Instagram. Classe les messages, repond automatiquement aux cas simples, redirige les clients potentiels, et ne fait remonter que les messages importants.

**Package** : `packages/bot-instagram`
**API** : Meta Graph API (Instagram Messenger API)
**Dependance** : `packages/core`

---

## 1. Prerequis techniques

### 1.1 Compte Meta
- [x] Compte Instagram Business ou Creator (a verifier)
- [ ] Page Facebook liee au compte Instagram
- [ ] Meta Developer App creee
- [ ] Permissions demandees : `pages_messaging`, `instagram_manage_messages`, `pages_show_list`, `instagram_basic`
- [ ] App Review soumise (⚠️ **2-6 semaines de delai**)

### 1.2 Webhook
- Endpoint HTTPS sur le serveur backend
- Recoit les evenements `messaging` en temps reel
- Verification du token Meta

### 1.3 Limites
- **200 DMs/heure** (largement suffisant pour le volume actuel)
- **Fenetre 24h** : le bot ne peut repondre que dans les 24h suivant le message de l'utilisateur
- **Reactive uniquement** : le bot ne peut pas initier une conversation

---

## 2. Logique de classification

### 2.1 Pipeline de traitement
```
Message DM recu
      |
      v
[1] Extraction du texte + metadata (nom, photo, nb abonnes, langue)
      |
      v
[2] Classification par Claude API (Sonnet = rapide + pas cher)
      |
      v
[3] Routage selon la categorie
      |
      ├── CLIENT POTENTIEL → Reponse auto + redirection bot Telegram
      ├── INTERESSE PAR LES COURS → Reponse auto + lien pilotneuro.com
      ├── QUESTION TECHNIQUE → Reponse IA + lien vers contenu existant
      ├── SOCIAL / CONNAISSANCE → Reponse polie auto
      └── VIP / IMPORTANT / INCERTAIN → Notification Telegram (traitement manuel)
```

### 2.2 Prompt de classification
```
Tu es l'assistant de Magomed, un formateur tech avec 30K+ abonnes.
Classe ce message Instagram en UNE categorie :

- CLIENT : La personne veut un service (site web, bot, app, etc.)
- COURS : La personne s'interesse aux cours/formation
- TECHNIQUE : La personne pose une question technique
- SOCIAL : La personne veut juste discuter, faire connaissance
- VIP : Message important, personne connue, ou tu n'es pas sur

Message de [Nom] :
"[texte du message]"

Reponds en JSON :
{
  "category": "CLIENT|COURS|TECHNIQUE|SOCIAL|VIP",
  "confidence": 0.0-1.0,
  "language": "chechen|french|english|other",
  "summary": "resume en 1 ligne"
}
```

---

## 3. Reponses automatiques par categorie

### 3.1 CLIENT POTENTIEL
```
Reponse (en tchetchene ou francais selon la langue detectee) :

"Merci pour ton message ! Pour mieux comprendre ton besoin et te donner
une estimation, j'ai un assistant qui va te poser quelques questions :

👉 [Lien vers le bot Telegram de qualification]

Ca prend 2 minutes et ca me permettra de te preparer une proposition
adaptee. A tout de suite !"
```

→ Log dans Supabase : nouveau lead
→ Notification Telegram : "Nouveau lead redirige vers qualification : [nom] - [resume]"

### 3.2 INTERESSE PAR LES COURS
```
"Merci pour ton interet ! Toutes les informations sur mes cours
sont disponibles ici :

👉 https://pilotneuro.com

Tu y trouveras le programme, les avis des anciens eleves, et
le formulaire d'inscription.

Si tu as des questions apres avoir consulte le site, n'hesite pas !"
```

→ Si la personne revient avec des questions apres → escalade vers traitement manuel
→ Notification Telegram seulement si la personne insiste (2e message)

### 3.3 QUESTION TECHNIQUE
```
[Reponse generee par Claude API basee sur la question]

"J'ai d'ailleurs fait une video sur ce sujet : [lien si pertinent]

Pour plus de contenu comme ca, suis mon compte !"
```

→ Si la question est trop complexe ou hors scope → escalade

### 3.4 SOCIAL / FAIRE CONNAISSANCE
```
"Merci pour ton message ! Je recois beaucoup de messages et je ne peux
pas repondre a tout personnellement.

Le meilleur moyen de rester connecte, c'est de suivre mes contenus
ou j'explique plein de choses sur la tech et l'entrepreneuriat.

A bientot !"
```

→ Pas de notification Telegram (sauf si VIP detecte)

### 3.5 VIP / IMPORTANT / INCERTAIN
```
Pas de reponse automatique.

→ Notification Telegram :
"Message non classe de [Nom] ([nb abonnes] abonnes) :
'[resume du message]'

[Repondre] [Ignorer] [Voir le profil]"
```

---

## 4. Regles anti-spam et securite

- Ne pas repondre plus d'1 fois au meme utilisateur par heure
- Si un utilisateur envoie 5+ messages sans reponse manuelle → escalade
- Ne jamais partager d'informations personnelles
- Ne jamais promettre de prix ou de delais
- Toujours rester professionnel et chaleureux
- Logger tous les messages et reponses dans Supabase

---

## 5. Tableau de bord (via Telegram)

Commande `/instagram` sur le bot Copilote :
```
📊 Instagram - 7 derniers jours :

Messages recus : 45
  - Clients potentiels : 8 (rediriges vers bot qualification)
  - Interesses cours : 12 (rediriges vers pilotneuro.com)
  - Questions techniques : 10 (repondu par IA)
  - Social : 12 (repondu auto)
  - A traiter manuellement : 3

Taux de traitement auto : 93%
Messages en attente : 1
```

---

## 6. Alternative rapide : ManyChat

Si la review Meta prend trop de temps ou si on veut aller plus vite :
- **ManyChat** ($15-65/mois) permet de faire tout ca sans code
- Interface drag-and-drop pour les flux
- Integrations Zapier/Make pour connecter a Supabase
- **Inconvenient** : moins de controle, cout mensuel, dependance
- **Avantage** : operationnel en quelques heures au lieu de jours

**Recommandation** : Soumettre l'app review Meta maintenant + utiliser ManyChat en attendant si le besoin est urgent.

---

## 7. Dependances
```json
{
  // Pas de librairie specifique, on utilise l'API REST directement
  // ou un wrapper leger
}
```

---

## 8. Priorite de developpement

### Phase 1 (Mois 2 - semaine 1)
- Soumettre Meta App Review (FAIRE MAINTENANT)
- Setup webhook endpoint
- Classification basique (4 categories)
- Reponses auto pour COURS et SOCIAL
- Redirection CLIENT vers bot Telegram

### Phase 2 (Mois 2 - semaine 2-3)
- Reponses IA pour TECHNIQUE
- Detection VIP
- Notifications Telegram
- Logging complet dans Supabase

### Phase 3 (Mois 3)
- Statistiques via `/instagram`
- Reponses multilingues (tchetchene, francais, anglais)
- Amelioration continue de la classification
- TikTok DMs (si API disponible)
