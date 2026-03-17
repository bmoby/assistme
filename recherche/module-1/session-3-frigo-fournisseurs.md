# Session 3 — Le digital : le frigo, les fournisseurs et le vigile

> Mercredi, Semaine 2 | Video pre-session (10 min) : "Votre site n'est qu'un restaurant — partie 2"
> **Artefact** : schema d'architecture COMPLET de la meme app (tous les elements)

---

## Structure de la session (2h)

| Temps | Bloc | Contenu |
|-------|------|---------|
| 0:00-0:01 | Accueil | Emoji check-in |
| 0:01-0:06 | Retrieval quiz | 3 questions sur S2 |
| 0:06-0:10 | Connexion narrative | "On a la salle et la cuisine. Il manque des pieces." |
| 0:10-0:45 | Analogie restaurant — partie 2 | DB, API, auth, DNS, point de rupture |
| 0:45-0:50 | Pause active | Stretch |
| 0:50-1:50 | Exercice pratique | Completer le schema + peer review en pod |
| 1:50-1:56 | Debrief 3-2-1 | 3 choses / 2 questions / 1 action |
| 1:56-2:00 | Annonce exercice | Description + deadline |

---

## Retrieval quiz (5 min)

3 questions sur S2 — repondre dans le chat SANS notes :

1. "Qu'est-ce que le front-end d'une app ?" (la salle — ce que l'utilisateur voit)
2. "Qu'est-ce que le back-end ?" (la cuisine — la logique derriere)
3. "Donnez un exemple de condition IF/SINON dans une app" (libre)

**Spacing effect** : Les concepts de S2 sont REVUS en S3 (meme app, schema enrichi = rappel a J+5). C'est exactement l'intervalle optimal de 2-5 jours identifie par Cepeda et al. (2006).

---

## PARTIE 1 — Le restaurant complet (35 min)

### 1.1 Rappel rapide du restaurant de S2 (3 min)

"En S2, on a vu la salle (front-end) et la cuisine (back-end). Mais un restaurant, c'est plus que ca. Aujourd'hui, on complete le tableau."

Afficher le schema de S2 et ajouter les nouveaux elements un par un.

### 1.2 Le frigo = La base de donnees (8 min)

**Introduction** :
"Dans un restaurant, ou est-ce qu'on stocke les ingredients ? Dans le frigo et le garde-manger. Sans stock, la cuisine ne peut rien preparer."

"Dans une app, c'est pareil. Toutes les donnees — les utilisateurs, les photos, les commandes, les messages — sont stockees quelque part. Ce quelque part, c'est la BASE DE DONNEES."

**L'analogie du tableur Excel booste** :
"Vous connaissez tous Excel ou Google Sheets. Une base de donnees, c'est un tableur avec des superpouvoirs."

| Tableur | Base de donnees |
|---------|-----------------|
| Colonnes = types d'info | Colonnes = champs |
| Lignes = entrees | Lignes = enregistrements |
| Onglets = categories | Tables = entites |
| 1 personne modifie | 1000 personnes modifient en meme temps |
| Recherche lente a 10 000 lignes | Recherche instantanee a 10 millions de lignes |
| Pas de liens entre onglets | Relations entre tables |

**CRUD en langage restaurant** :
- **Ajouter** un nouveau plat au menu = **Create** (creer un enregistrement)
- **Consulter** le menu = **Read** (lire les donnees)
- **Changer** le prix d'un plat = **Update** (modifier un enregistrement)
- **Retirer** un plat du menu = **Delete** (supprimer un enregistrement)

"Tout ce que fait une app avec ses donnees se resume a ces 4 operations. TOUT."

**Pourquoi pas juste un tableur ?** (rupture de l'analogie) :
- **Concurrence** : 50 serveurs essaient d'ecrire en meme temps → Excel plante, la DB gere
- **Integrite** : Si tu supprimes un client dans Excel, ses commandes restent orphelines. La DB empeche ca.
- **Securite** : Dans Excel, tout le monde voit tout. Dans une DB, droits d'acces granulaires.
- **Transactions** : Transfert 100€ du compte A au compte B — si ca plante au milieu ? La DB garantit : soit tout passe, soit rien.

**Exemple concret** :
"Instagram stocke dans son frigo : 2 milliards de comptes, des milliards de photos, des milliards de commentaires, des milliards de likes. Imaginez ca dans un tableur Excel..."

### 1.3 Le serveur (personne) = L'API (8 min)

**Introduction** :
"On a la salle, la cuisine, le frigo. Mais comment la commande passe de la salle a la cuisine ? PAR LE SERVEUR — la personne qui fait les allers-retours."

"En digital, cet intermediaire s'appelle une API (Application Programming Interface). C'est le serveur qui prend votre commande, la transmet a la cuisine, et revient avec le plat."

**Le workflow d'une requete** :
```
1. Le client (vous) regarde le menu et choisit un plat
2. Le serveur (API) prend la commande
3. Le serveur transmet a la cuisine (back-end)
4. La cuisine prepare en utilisant le frigo (base de donnees)
5. Le serveur ramene le plat
6. Le client mange (affichage a l'ecran)
```

**Les regles du serveur** :
- Il connait le menu (les requetes disponibles = endpoints)
- Il refuse les commandes hors menu : "Desole, on ne fait pas de sushis" = **erreur 404** (pas trouve)
- Il peut refuser de servir : "Vous n'avez pas reserve" = **erreur 401** (non authentifie)
- Il peut dire "la cuisine est debordee" = **erreur 503** (serveur surcharge)

**Analogie complementaire — La prise electrique** :
"Une API, c'est aussi comme une prise electrique. Tu branches ton appareil. Tu ne sais pas comment l'electricite est produite. Tu n'as pas besoin de le savoir. La prise te fournit un CONTRAT : 230V, 50Hz, format specifique."

"L'API fait pareil : 'envoie-moi cette info dans ce format, je te renvoie ca dans ce format.' Le programme qui utilise l'API n'a pas besoin de savoir comment ca fonctionne derriere."

### 1.4 Les fournisseurs = Les APIs tierces (5 min)

**Introduction** :
"Un restaurant ne fait pas TOUT lui-meme. Le pain vient de la boulangerie, les fleurs viennent du fleuriste, les boissons viennent du distributeur."

"Les apps, c'est pareil. Elles utilisent des services EXTERNES :"

| Fournisseur restaurant | API tierce |
|------------------------|------------|
| La boulangerie | Stripe (paiement) — gere les transactions financieres |
| Le fleuriste | Google Maps (cartes) — affiche les plans et calcule les trajets |
| Le distributeur | SendGrid/Twilio (email/SMS) — envoie les notifications |
| Le decorateur saisonnier | Cloudinary (images) — stocke et optimise les photos |

**Point cle** : "Le restaurant UTILISE ces fournisseurs mais ne les POSSEDE pas. Il passe un contrat avec eux — c'est la CLE API (comme un numero de compte chez le fournisseur). Si le fournisseur de pain ferme, le restaurant doit en trouver un autre, mais sa propre cuisine continue de fonctionner."

**Exemples concrets** :
- Uber utilise Google Maps pour les cartes, Stripe pour le paiement, Twilio pour les SMS
- Airbnb utilise Stripe pour le paiement, Mailgun pour les emails, Cloudinary pour les photos
- "Meme les geants n'ont pas le temps de tout faire eux-memes."

### 1.5 Le vigile = L'authentification (5 min)

**Introduction** :
"A l'entree du restaurant, il y a parfois un vigile. Il verifie si vous avez reserve, si vous etes sur la liste, si vous avez l'age legal."

**Les deux questions de la securite** :
1. **Authentification** : "Es-tu bien un employe de ce restaurant ?" → verifier l'IDENTITE (login + mot de passe)
2. **Autorisation** : "Es-tu autorise a entrer dans la cave a vin ?" → verifier les PERMISSIONS (admin vs utilisateur)

**Analogie du badge** :
- Login/Password = Badge avec code : tu montres ton badge et tu tapes ton code
- Le badge ouvre certaines portes : le cuisinier accede a la cuisine mais pas au bureau du gerant
- Session/Token = Le tampon a l'entree de la boite de nuit. On te l'a donne a l'entree, et tant que tu l'as, tu n'as pas besoin de te re-identifier.

### 1.6 L'adresse = Le DNS (3 min)

"Comment tu trouves un restaurant que tu ne connais pas ? Tu cherches son adresse. 'Le Provencal, 23 rue Victor Hugo.'"

"Sur internet, c'est pareil. Quand tu tapes 'instagram.com', ton navigateur demande a un ANNUAIRE (le DNS) : 'C'est quoi l'adresse de instagram.com ?' L'annuaire repond : '157.240.7.35.' Ton navigateur va ensuite a cette adresse."

- **Nom de domaine** = Le nom du restaurant ("Le Provencal")
- **Adresse IP** = L'adresse physique (23 rue Victor Hugo)
- **Serveur DNS** = L'annuaire qui fait la correspondance

"Pourquoi des noms et pas des numeros ? Parce que personne ne memorise '157.240.7.35'. Mais tout le monde retient 'instagram.com'."

### 1.7 Le point de rupture (3 min) — L'analogie casse

**C'est le moment ou l'analogie CASSE volontairement** (etape 3 du cycle analogie) :

"Dans un vrai restaurant, 1 serveur sert 4-5 tables. 50 clients max. Si 200 personnes arrivent, c'est le chaos."

"Sur le web, UN serveur (machine) peut servir 1000, 10 000, voire 100 000 utilisateurs en meme temps. Comment ?"

"Parce que les demandes durent des millisecondes, pas des minutes. Le serveur fait l'aller-retour en 0.1 seconde, pas en 5 minutes. C'est comme si le serveur du restaurant avait des superpouvoirs : il court a la vitesse de la lumiere."

**Pourquoi c'est important** : "C'est ce qui rend le digital SCALABLE. Ton restaurant en ligne peut servir le monde entier en meme temps. C'est la que le digital depasse tout ce qui est physique."

---

## PARTIE 2 — Patterns : le meme restaurant partout (10 min)

### L'exercice "Le pattern universel"

Montrer que TOUTES les apps suivent le meme schema :

| Pattern | Instagram | Uber | Airbnb | Spotify |
|---------|-----------|------|--------|---------|
| Inscription | Email + mdp | Email + mdp | Email + mdp | Email + mdp |
| Profil | Photo + bio | Photo + note | Photo + avis | Photo + playlists |
| Feed/Liste | Posts des suivis | Voitures dispo | Logements dispo | Morceaux |
| Action principale | Liker/Commenter | Commander trajet | Reserver | Ecouter |
| Recherche | Hashtags | Destination | Lieu/Dates | Artiste |
| Notifications | Likes/DMs | Trajet en cours | Confirmation | Nouveautes |
| Paiement | Pub (indirect) | Carte bancaire | Carte bancaire | Abonnement |

**Revelation** : "Ces 4 apps qui semblent totalement differentes ont EXACTEMENT les memes composants. Seul le CONTENU change."

"Elles ont toutes : une salle, une cuisine, un frigo, des fournisseurs, un vigile. Le meme restaurant, avec des plats differents."

---

## PARTIE 3 — Exercice pratique (60 min)

### Completer le restaurant de S2 (30 min)

**Consigne** : Reprends l'app que tu as analysee en S2. Complete le schema avec les nouveaux elements.

**Template complet** :
```
APP : _______________

LA SALLE (front-end)
  - Ecrans principaux : _______________
  - Boutons/actions : _______________

LA CUISINE (back-end)
  - Logique principale : _______________
  - Recettes/regles : _______________

LE FRIGO (base de donnees)
  - Quelles donnees l'app stocke : _______________
  - Combien de "tables" (categories) : _______________

LES FOURNISSEURS (APIs tierces)
  - Cartes/GPS : _______________
  - Paiement : _______________
  - Notifications : _______________
  - Autre : _______________

LE VIGILE (authentification)
  - Comment on se connecte : _______________
  - Utilisateur normal vs admin : _______________

L'ADRESSE (DNS)
  - Le nom de domaine : _______________
  - Ou est le serveur (machine) : _______________

POINT DE RUPTURE
  - Combien d'utilisateurs cette app a : _______________
```

### Peer review en pod (20 min)

Chaque pod compare ses schemas :
- "Qu'est-ce qui vous a surpris ?"
- "Qu'est-ce qui etait le plus difficile a deviner ?"
- "Voyez-vous le meme restaurant entre vos apps differentes ?"

### Synthese collective (10 min)

Magomed reprend 2-3 schemas et les compare en live :
- Montrer les points communs
- Montrer que l'architecture est la meme
- "Vous comprenez maintenant comment fonctionne le digital. Le reste de la formation, c'est CONSTRUIRE avec cette comprehension."

---

## Annonce exercice

**Titre** : "3 apps, 1 restaurant"

**Consigne** :
1. Prends 2 apps supplementaires (differentes de celle de la session)
2. Dessine leur restaurant (salle, cuisine, frigo, fournisseurs, vigile)
3. Compare les 3 : qu'est-ce qui est identique ? Qu'est-ce qui change ?
4. Ecris 1 paragraphe de synthese : "Toutes les apps ont..."
5. Partage dans ton canal de pod

**Deadline** : Vendredi 20h.

**Objectif** : Solidifier la reconnaissance de patterns. L'etudiant voit que l'architecture est universelle.

---

## Video pre-session (a preparer)

**Titre** : "Votre site n'est qu'un restaurant — partie 2"
**Duree** : 10 min

**Plan** :
1. (0:00-2:00) Rappel S2 : salle + cuisine. "Mais il manque des pieces..."
2. (2:00-4:00) Le frigo (base de donnees) : "Ou sont stockees vos photos Instagram ?"
3. (4:00-6:00) Les fournisseurs (APIs tierces) : "Uber ne fait pas ses propres cartes"
4. (6:00-8:00) Le vigile (auth) : "Comment l'app sait que c'est toi ?"
5. (8:00-9:00) L'adresse (DNS) : "Comment ton navigateur trouve le site"
6. (9:00-10:00) "Mercredi, on complete le tableau. Reprends ton schema de S2."

---

## Visuels a creer

1. **Schema "Le restaurant complet"** : Dessin avec TOUS les elements — salle, cuisine, frigo, serveur (personne), fournisseurs (camions), vigile, adresse. Style enfantin, colore.

2. **Diagramme "Flux d'une requete"** : Le parcours d'un clic, etape par etape, avec des fleches et des verbes d'action (demande, transmet, cherche, renvoie, affiche).

3. **Tableau "Tableur vs Base de donnees"** : Les differences visuelles

4. **Slide "Le pattern universel"** : Le tableau comparatif Instagram/Uber/Airbnb/Spotify

5. **Template "Restaurant complet"** : Feuille A4 avec les 6 zones pre-dessinees a remplir

6. **Slide "Les erreurs du serveur"** : 404 = pas au menu, 401 = pas reserve, 503 = cuisine debordee (avec des icones de restaurant)
