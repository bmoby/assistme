# Guide Formateur — Mise en place de la formation

Ce document est ton guide personnel, etape par etape. Tu suis les etapes dans l'ordre. Quand une etape est terminee, tu la coches et tu passes a la suivante.

---

## PARTIE 1 — Configuration technique (une seule fois)

### Etape 1 : Executer la migration SQL

La base de donnees n'a pas encore la table `students`. Sans elle, le bot ne peut pas ajouter d'etudiants.

1. Ouvre ton navigateur, va sur le dashboard Supabase de ton projet
2. Dans le menu a gauche, clique sur **SQL Editor**
3. Clique sur **New query** (en haut a droite)
4. Copie-colle le contenu du fichier `supabase/migrations/004_students_system.sql` (tout le fichier, du debut a la fin)
5. Clique sur **Run** (le bouton vert en bas a droite)
6. Tu dois voir un message vert "Success. No rows returned." — c'est normal, c'est une creation de table
7. Pour verifier que ca a marche : dans le menu a gauche, clique sur **Table Editor**. Tu dois voir une table `students` dans la liste avec les colonnes : id, name, phone, email, telegram_id, discord_id, session, status, etc.

Si tu vois une erreur du type "relation team_members does not exist", c'est que la migration 001 n'a pas ete executee avant. Verifie que les tables `team_members`, `student_exercises` et `faq_entries` existent deja.

---

### Etape 2 : Creer les roles Discord

Tu as deja le serveur Discord et le bot tourne. Maintenant tu dois creer les roles qui controlent qui voit quoi.

1. Ouvre Discord (l'application, pas le navigateur)
2. Va sur ton serveur Pilote Neuro
3. Clique sur le nom du serveur en haut a gauche (la fleche vers le bas)
4. Clique sur **Parametres du serveur**
5. Dans le menu a gauche, clique sur **Roles**
6. Clique sur **Creer un role** (bouton en haut)

**Role 1 — tsarag (Treneur) :**
- Nom : `tsarag` (exactement ce nom — le bot cherche ce nom precis)
- Couleur : choisis ce que tu veux (rouge par exemple, pour te distinguer)
- Active **Afficher les membres du role separement** (comme ca tu apparais au-dessus dans la liste des membres)
- Pas besoin de toucher aux permissions, ton compte est deja admin du serveur

**Role 2 — student :**
- Nom : `student` (exactement ce nom, avec le С majuscule et le 2 colle — le bot cherche ce nom precis)
- Couleur : choisis ce que tu veux (vert par exemple)
- Ne coche rien de special dans les permissions. Les permissions seront controlees canal par canal.

**Role 3 — mentor :**
- Nom : `mentor`
- Couleur : choisis ce que tu veux (bleu par exemple)
- Memes permissions que student, rien de special

7. Ferme les parametres
8. **Assigne-toi le role tsarag** : clic droit sur ton nom dans la liste des membres > Roles > coche tsarag

Verifie que tu as bien le role : ton nom dans la liste des membres devrait maintenant avoir la couleur que tu as choisie et apparaitre dans la section "tsarag".

---

### Etape 3 : Creer la categorie ОБЩЕЕ et ses canaux

Les categories sont des dossiers qui regroupent les canaux. Tu vas en creer 4.

1. Clic droit dans la zone vide sous les canaux (la colonne de gauche)
2. Clique sur **Creer une categorie**
3. Nom : `ОБЩЕЕ`
4. Pas de restriction — tout le monde peut la voir
5. Clique sur **Creer**

Maintenant, cree les canaux dans cette categorie :

**Canal #объявления :**
1. Passe ta souris sur la categorie ОБЩЕЕ, tu vois un `+` apparaitre
2. Clique sur le `+`
3. Type : **Textuel**
4. Nom : `объявления` (exactement ce nom, en minuscules — le bot cherche ce nom precis)
5. Clique sur **Creer le salon**
6. Maintenant, configure-le en lecture seule pour les etudiants : clique sur la roue dentee a cote de #объявления > **Permissions** > clique sur le `+` sous "Roles/Membres" > ajoute `@everyone` > desactive **Envoyer des messages** (croix rouge). Les etudiants pourront lire mais pas ecrire. Le bot peut quand meme ecrire parce qu'il a ses propres permissions.

**Canal #правила :**
1. Meme chose : `+` sur ОБЩЕЕ > Textuel > Nom : `правила`
2. Meme config lecture seule que #объявления
3. Apres avoir cree le canal, ecris dedans les regles de la formation. Ce message restera en permanence. Par exemple :

```
**Правила обучения Pilote Neuro — Сессия 2**

1. Эфиры проходят по средам вечером и воскресеньям днём
2. Задания сдаются командой /submit
3. Дедлайны отображаются в #задания
4. Задавайте вопросы в #faq — бот или тренер ответит
5. Делитесь победами в #победы
6. Ваш под — ваша команда, помогайте друг другу
7. Уважайте других, без спама
```

---

### Etape 4 : Creer la categorie ОБУЧЕНИЕ et ses canaux

C'est la categorie principale. Seuls les etudiants avec le role @student et toi pourrez la voir.

1. Clic droit dans la zone des canaux > **Creer une categorie**
2. Nom : `ОБУЧЕНИЕ`
3. **IMPORTANT** : coche la case **Canal prive**
4. Discord va te demander qui peut acceder : ajoute le role `student` et le role `tsarag`
5. Clique sur **Creer**

Tous les canaux crees dans cette categorie heriteront automatiquement de ces permissions. Quelqu'un sans le role @student ne verra meme pas que cette categorie existe.

Maintenant, cree chaque canal dans ОБУЧЕНИЕ (meme methode : `+` sur la categorie) :

| Nom du canal | Type | Notes |
|---|---|---|
| `задания` | Textuel | Le bot poste les deadlines ici. Mets en lecture seule pour les etudiants (comme #объявления). |
| `ресурсы` | Textuel | Le bot poste les ressources ici. Mets en lecture seule pour les etudiants. |
| `эфиры` | Textuel | Le bot poste les annonces de live ici. Mets en lecture seule pour les etudiants. |
| `faq` | Textuel | Les etudiants ecrivent ici et le bot repond. NE PAS mettre en lecture seule — les etudiants doivent pouvoir ecrire. |
| `победы` | Textuel | Les etudiants partagent leurs reussites. NE PAS mettre en lecture seule. |
| `хаос-отзывы` | Textuel | Utilise uniquement pendant la session 5 (semaine 3). NE PAS mettre en lecture seule. Tu peux le creer maintenant ou plus tard. |

**Pour mettre un canal en lecture seule pour les etudiants :**
1. Clique sur la roue dentee a cote du canal
2. Onglet **Permissions**
3. Clique sur le `+` > ajoute le role `student`
4. Desactive (croix rouge) : **Envoyer des messages**
5. Clique sur **Enregistrer les modifications**

Le bot pourra toujours ecrire dans ces canaux parce qu'il a les permissions du serveur.

---

### Etape 5 : Creer la categorie ПОДЫ et ses canaux

1. Clic droit > **Creer une categorie**
2. Nom : `ПОДЫ`
3. Coche **Canal prive**
4. Ajoute `student` et `tsarag`
5. Clique sur **Creer**

Cree 8 canaux textuels dedans :

| Canal | Nom |
|---|---|
| Под 1 | `под-1` |
| Под 2 | `под-2` |
| Под 3 | `под-3` |
| Под 4 | `под-4` |
| Под 5 | `под-5` |
| Под 6 | `под-6` |
| Под 7 | `под-7` |
| Под 8 | `под-8` |

Note : pour l'instant tous les etudiants student verront tous les canaux de pods. Si tu veux que chaque etudiant ne voie QUE son pod, il faudra creer un role par pod et restreindre chaque canal a son role. Tu peux commencer sans cette restriction et l'ajouter plus tard si necessaire.

---

### Etape 6 : Creer la categorie АДМИН

1. Clic droit > **Creer une categorie**
2. Nom : `АДМИН`
3. Coche **Canal prive**
4. Ajoute UNIQUEMENT le role `tsarag` (PAS student)
5. Clique sur **Creer**
6. Cree un canal textuel `админ` dedans

Ce canal est ton espace prive. Les etudiants ne le verront jamais. Tu peux y taper les commandes admin sans que personne ne voie.

---

### Etape 7 : Relancer le bot et verifier

Le bot doit recharger les canaux apres les avoir crees.

1. Dans ton terminal, arrete le bot (Ctrl+C) si il tourne
2. Relance-le :

```bash
pnpm -F @assistme/bot-discord dev
```

3. Tu dois voir dans les logs : "Bot Discord Formateur is online" et "Slash commands registered successfully"

**Pour verifier que tout marche :**
- Va dans le canal `#админ` (que toi seul vois)
- Tape `/` — tu dois voir la liste des 11 commandes apparaitre
- Tape `/announce текст:Тест — если вы видите это сообщение, бот работает!`
- Va dans `#объявления` — le message du bot doit etre la

Si le bot repond "Канал #объявления не найден", c'est que le nom du canal n'est pas exactement `объявления`. Verifie l'orthographe.

---

## PARTIE 2 — Preparer le contenu (avant le lancement)

### Etape 8 : Ajouter tes etudiants

Pour chaque etudiant qui a paye et qui a rejoint le serveur Discord :

1. Va dans n'importe quel canal (par exemple `#админ`)
2. Tape la commande :

```
/add-student имя:Ахмед Джабраилов discord:@Ahmed под:1
```

- `имя` : le nom complet de l'etudiant (obligatoire)
- `discord` : tu cliques sur l'option et tu selectionnes l'utilisateur Discord dans la liste qui apparait (optionnel — si l'etudiant n'a pas encore rejoint, ne mets pas cette option)
- `под` : le numero du pod, de 1 a 8 (optionnel — tu peux l'ajouter plus tard)

**Ce qui se passe quand tu valides :**
- Le bot cree l'etudiant dans la base de donnees Supabase
- Si tu as mis l'option `discord`, le bot assigne automatiquement le role @student a cet utilisateur
- L'etudiant voit maintenant toutes les categories ОБУЧЕНИЕ et ПОДЫ apparaitre dans sa barre laterale Discord (avant, il ne voyait que ОБЩЕЕ)
- Le bot te confirme : "Студент Ахмед Джабраилов успешно добавлен! Роль @student назначена."

**Si l'etudiant n'a pas encore rejoint Discord :**
- Tape `/add-student имя:Ахмед Джабраилов` sans l'option `discord`
- Envoie-lui le lien d'invitation du serveur (Parametres du serveur > Invitations > Creer une invitation)
- Quand il rejoint, le bot ne pourra pas le reconnaitre automatiquement (parce que le discord_id n'est pas enregistre). Tu devras faire la liaison manuellement plus tard en retapant la commande ou en utilisant la base de donnees

**Pour verifier ta liste :**

```
/students
```

Le bot affiche la liste de tous les etudiants Сессия 2 avec leur statut, pod, et si le Discord est lie.

---

### Etape 9 : Preparer le contenu de la Session 1

La Session 1 est le Kick-Off. Il n'y a pas de video pre-session. Tu dois preparer :

1. **Ton histoire personnelle** (5 min de presentation) — tu la connais deja
2. **Un temoignage d'alumni S1** — contacte l'un des 6 alumni et demande-lui de preparer 5 minutes. Ca peut etre un message vocal ou une apparition en live.
3. **La journey map** — un schema des 6 phases (Decouvrir, La Methode, L'Arsenal, Construire, Professionnaliser, Livrer) que tu montreras pendant le kick-off. Tu peux le faire en slide ou sur un tableau blanc.
4. **Le Quick Win** — deployer une landing page avec l'IA. Prepare ta demo : choisis un generateur (v0, Lovable, Bolt), fais un test avant pour t'assurer que le flow marche.
5. **Les pods** — decide de la repartition des 30 etudiants en 7-8 groupes de 3-4. Tu auras besoin de cette liste pour annoncer les pods pendant le kick-off.
6. **Le lien du live** — cree un lien Zoom ou Google Meet recurrent que tu reutiliseras pour tous les lives.

---

### Etape 10 : Preparer le contenu de la Session 2

La Session 2 necessite une video pre-session.

1. **Enregistre la video** (10 min) : "Votre site n'est qu'un restaurant — partie 1"
2. **Upload la video** quelque part : YouTube (non-liste), Google Drive, ou Supabase Storage
3. **Prepare ton schema** d'analogie restaurant (Salle = front-end, Cuisine = back-end, Menu = interface, Recette = algorithme). Tu le montreras en demo.
4. **Prepare les DevTools** : choisis un site connu que tu ouvriras en live pour montrer le front/back

---

## PARTIE 3 — Lancer la formation

### Etape 11 : J-1 avant la Session 1

La veille de la premiere session :

1. Poste une annonce :

```
/announce текст:Завтра большой день! Первая сессия Pilote Neuro Сессия 2. Будьте готовы к 20:00. Ссылка: [твоя ссылка Zoom/Meet]. Начнём с quick win — у вас будет сайт онлайн до конца вечера.
```

2. Verifie que tous les etudiants sont bien ajoutes :

```
/students
```

3. Verifie que chaque etudiant voit bien les canaux (demande a un etudiant de te faire un screenshot de sa barre laterale Discord)

---

### Etape 12 : Le jour de la Session 1

1. **Fais ton live** (Zoom/Meet, pas Discord). Pendant 2h : kick-off, quick win, formation des pods.

2. **Pendant le live**, quand les etudiants deploient leur landing page, dis-leur d'aller partager le lien dans `#победы` sur Discord.

3. **Apres le live**, poste la deadline de l'exercice 1 :

```
/deadline модуль:1 задание:1 дата:2026-XX-XX время:20:00
```

(remplace la date par la date limite reelle — en general le vendredi de la meme semaine)

4. Si tu as un lien vers le replay, poste-le :

```
/resource модуль:1 название:Replay Сессия 1 - Kick-Off + Quick Win ссылка:https://...
```

---

### Etape 13 : Veille de la Session 2

1. Upload ta video pre-session ("Le restaurant partie 1")

2. Envoie-la aux etudiants :

```
/announce текст:Видео к завтрашнему уроку (10 мин): [ссылка на видео]. Это основа завтрашней сессии — если не посмотрите, будет непонятно.
```

3. Poste aussi la ressource :

```
/resource модуль:1 название:Видео к Сессии 2 - Ресторан (часть 1) ссылка:https://...
```

---

### Etape 14 : Le jour de la Session 2

1. Fais ton live. A la fin, poste la deadline :

```
/deadline модуль:1 задание:2 дата:2026-XX-XX время:20:00
```

2. Poste le replay :

```
/resource модуль:1 название:Replay Сессия 2 - Зал и кухня ссылка:https://...
```

---

## PARTIE 4 — Routine hebdomadaire (tu repetes ca chaque semaine)

Chaque semaine se passe comme ca :

### Lundi
- Tu recois le rapport de decrochage sur Telegram (automatique, chaque lundi 10h). Si un etudiant est inactif depuis 7+ jours, tu es alerte.
- Tu corriges les exercices en retard (voir ci-dessous)

### Mardi soir
- Tu uploades la video pre-session du mercredi
- Tu postes l'annonce + la ressource (video) avec `/announce` et `/resource`

### Mercredi soir
- Tu fais le live
- Apres le live, tu postes la deadline avec `/deadline` et le replay avec `/resource`

### Jeudi-Vendredi
- Les exercices arrivent. Tu recois les notifications sur Telegram
- Tu corriges quand tu as le temps (voir ci-dessous)

### Samedi soir
- Tu uploades la video pre-session du dimanche
- Tu postes l'annonce + la ressource

### Dimanche
- Tu fais le live
- Apres le live, tu postes la deadline avec `/deadline` et le replay avec `/resource`

### Tous les jours a 20h
- Tu recois le digest quotidien sur Telegram (automatique) : combien d'exercices soumis, combien en attente, combien d'etudiants actifs

---

## PARTIE 5 — Corriger les exercices

### Comment tu es notifie

Quand un etudiant soumet un exercice avec `/submit`, tu recois un message Telegram en quelques minutes :

> Nouvel exercice soumis — Ahmed — M1-З2 — Score IA : 7/10

Le score IA est une pre-review automatique. L'IA a deja analyse le travail et donne un score, des points forts, des ameliorations, et une recommandation. L'etudiant a deja recu la pre-review en DM.

### Comment tu corriges

1. Ouvre Discord (telephone ou ordi)
2. Tape dans n'importe quel canal :

```
/review студент:Ahmed
```

3. Le bot te montre la liste des exercices en attente d'Ahmed avec le score IA, le statut, et le lien de soumission

4. Tu ouvres le lien, tu regardes le travail

5. **Si c'est bon :**

```
/approve студент:Ahmed отзыв:Хорошая работа, декомпозиция чёткая. Подумай над пограничными случаями.
```

L'etudiant recoit un DM : "Задание одобрено! ..." avec ton feedback.

6. **Si ca doit etre corrige :**

```
/revision студент:Ahmed отзыв:Структура данных неполная. Не хватает таблицы заказов. Перечитай часть о базах данных и отправь заново.
```

L'etudiant recoit un DM : "Нужна доработка — ..." avec ton feedback et l'instruction de resoummettre.

---

## PARTIE 6 — FAQ automatique

### Comment ca marche

Le canal `#faq` fonctionne automatiquement :

1. Un etudiant ecrit une question dans `#faq` : "Как создать файл .env?"
2. Le bot la passe a l'IA. Si l'IA connait la reponse (confiance > 70%), elle repond directement dans le canal.
3. Si l'IA ne sait pas, elle repond "Я не уверен в ответе. Тренер ответит тебе лично." et tu recois une notification sur Telegram.
4. Tu vas dans `#faq`, tu reponds a la question en **repondant au message** de l'etudiant (clic droit > Repondre, ou swipe vers la droite sur telephone)
5. Le bot detecte que c'est toi (le tsarag) qui repond a un message d'etudiant et ajoute automatiquement la paire question/reponse dans la base FAQ
6. La prochaine fois qu'un etudiant pose une question similaire, l'IA saura repondre toute seule

**Important** : tu dois **repondre au message** de l'etudiant (pas juste ecrire un nouveau message dans le canal). Le bot detecte la liaison entre la question et ta reponse grace au systeme de reponse Discord.

---

## CHECKLIST FINALE

Coche chaque etape quand elle est faite :

```
[ ] Etape 1  — Migration SQL executee dans Supabase
[ ] Etape 2  — Roles crees (tsarag, student, mentor) + role tsarag assigne a toi
[ ] Etape 3  — Categorie ОБЩЕЕ + canaux (объявления, правила) + regles ecrites
[ ] Etape 4  — Categorie ОБУЧЕНИЕ (privee) + canaux (задания, ресурсы, эфиры, faq, победы)
[ ] Etape 5  — Categorie ПОДЫ (privee) + 8 canaux под
[ ] Etape 6  — Categorie АДМИН (privee, tsarag uniquement) + canal админ
[ ] Etape 7  — Bot relance + test /announce fonctionne
[ ] Etape 8  — Tous les etudiants ajoutes avec /add-student
[ ] Etape 9  — Contenu Session 1 prepare (histoire, alumni, journey map, quick win, pods, lien live)
[ ] Etape 10 — Contenu Session 2 prepare (video pre-session, schema restaurant)
[ ] Etape 11 — Annonce J-1 envoyee
[ ] Etape 12 — Session 1 faite + deadline + replay postes
```

---

## NOMS EXACTS DES CANAUX (le bot les cherche par nom)

Le bot utilise les noms suivants pour trouver les canaux. Si le canal a un nom different, le bot ne le trouvera pas et renverra une erreur.

| Commande bot | Canal cherche | Nom exact a utiliser |
|---|---|---|
| `/announce` | #объявления | `объявления` |
| `/deadline` | #задания | `задания` |
| `/resource` | #ресурсы | `ресурсы` |
| `/live` | #эфиры | `эфиры` |
| FAQ auto | #faq | `faq` |

---

## COMMANDES DISPONIBLES (aide-memoire)

### Commandes admin (toi uniquement, role tsarag requis)

| Commande | Ce qu'elle fait |
|---|---|
| `/add-student имя:... discord:@... под:...` | Ajoute un etudiant + assigne le role @student |
| `/students` | Liste tous les etudiants Сессия 2 |
| `/announce текст:...` | Envoie une annonce dans #объявления (notifie tous les @student) |
| `/deadline модуль:... задание:... дата:... время:...` | Poste une deadline dans #задания |
| `/resource модуль:... название:... ссылка:... описание:...` | Partage une ressource dans #ресурсы |
| `/live дата:... время:... тема:...` | Planifie un live dans #эфиры |
| `/review студент:...` | Voir les exercices en attente d'un etudiant |
| `/approve студент:... отзыв:...` | Approuver un exercice |
| `/revision студент:... отзыв:...` | Demander une revision |

### Commandes etudiant (role student requis)

| Commande | Ce qu'elle fait |
|---|---|
| `/submit ссылка:... модуль:... задание:...` | Soumettre un exercice |
| `/progress` | Voir sa progression |
