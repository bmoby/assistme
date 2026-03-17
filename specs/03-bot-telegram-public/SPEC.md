# 03 — Bot Telegram Public (Audience)

> **Statut : ✅ IMPLEMENTE**

**Package** : `packages/bot-telegram-public`
**Librairie** : grammY
**Dependance** : `@assistme/core` (DB uniquement, pas l'orchestrateur)
**Langue** : Russe

Bot public pour l'audience de Magomed. Repond aux questions sur la formation, les services, les cours gratuits. Detecte et qualifie les leads automatiquement.

---

## 1. Architecture

### Differences avec le bot admin
- **Pas d'orchestrateur** : appel Claude direct avec `public_knowledge` en contexte
- **Pas d'actions** (pas de create_task, create_client, etc.)
- **Lecture seule** sur Supabase (lit `public_knowledge`, n'ecrit rien)
- **Langue russe** : tout le system prompt et les reponses en russe
- **Ouvert a tous** : pas d'authentification admin

### Flow principal
```
Utilisateur externe → Bot Public
  → [Whisper si vocal → transcription RU]
  → Charge public_knowledge depuis Supabase
  → Claude avec system prompt russe + knowledge base
  → Reponse en russe
  → Detection de lead (si pertinent)
  → Historique conversation (30min TTL)
```

---

## 2. Base de connaissances

Le bot repond en se basant sur la table `public_knowledge` :

| Categorie | Exemples de cles |
|-----------|-----------------|
| `formation` | program, pricing, duration, format, results, testimonials |
| `services` | website_creation, pricing_services, process |
| `faq` | experience_required, language, guarantee, refund |
| `free_courses` | portal, telegram_group |
| `general` | bio, expertise, social_links |

Les connaissances sont gerees depuis le bot admin via le Memory Manager ou la commande `/kb`.

---

## 3. Detection de leads ✅

Le system prompt demande a Claude d'ajouter un tag cache quand il detecte un lead serieux :

```
[LEAD: name="Ivan" need="formation" budget="unknown" business="coaching"]
```

**Criteres de detection :**
- L'utilisateur pose des questions specifiques sur les prix ou les modalites
- L'utilisateur exprime un besoin concret de services
- L'utilisateur montre de l'urgence ou de la motivation

**Quand un lead est detecte :**
1. Le tag est supprime de la reponse envoyee a l'utilisateur
2. Une notification est envoyee a l'admin via l'API Telegram du bot admin
3. Format : "Nouveau lead : [nom] - Besoin : [besoin] - Budget : [budget] - Business : [business]"

---

## 4. Messages vocaux ✅

```
Voice message → fetch Telegram file → Buffer
  → transcribeAudio(buffer, 'voice.ogg', 'ru')
  → Meme flow que texte (Claude + public_knowledge)
```

---

## 5. Historique de conversation ✅

**Fichier** : `src/utils/conversation.ts`

- In-memory `Map<chatId, messages[]>`
- Max 20 messages par chat
- TTL : 30 minutes (plus court que l'admin, les conversations publiques sont plus ephemeres)

---

## 6. Notification admin ✅

**Fichier** : `src/utils/notify-admin.ts`

Utilise l'API Telegram directement (HTTP POST) avec le token du bot admin pour envoyer des notifications :

```typescript
notifyAdmin(message: string): Promise<void>
// POST https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage
// { chat_id: ADMIN_CHAT_ID, text: message }
```

Variables requises : `TELEGRAM_BOT_TOKEN` (admin), `TELEGRAM_ADMIN_CHAT_ID`

---

## 7. Commande /start ✅

Message de bienvenue en russe quand un utilisateur demarre le bot.

---

## 8. Variables d'environnement

```env
PUBLIC_BOT_TOKEN=          # Token du bot public (different du bot admin)
TELEGRAM_BOT_TOKEN=        # Token du bot admin (pour les notifications)
TELEGRAM_ADMIN_CHAT_ID=    # Chat ID de l'admin
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

---

## 9. Dependances

```json
{
  "grammy": "^1.x",
  "@assistme/core": "workspace:*"
}
```
