---
name: implement
description: Implement a feature from a spec. Reads the spec FIRST, then codes according to it. Spec-first development.
user-invocable: true
argument-hint: "[component/feature - ex: 04-bot-discord/student-faq, 01-cerveau-central/new-agent]"
---

# Implement - Developpement Spec-First

Tu vas implementer une fonctionnalite en suivant strictement la methodologie spec-first.

## Cible
$ARGUMENTS

Le format est `composant/feature` ou juste `composant` pour tout implementer.

## Methodologie OBLIGATOIRE

### Phase 1 : COMPRENDRE (ne pas coder)
1. Lire la spec du composant : `specs/[composant]/SPEC.md` + fichiers associes
2. Lire `specs/CONNEXIONS.md` pour comprendre les dependances
3. Lire `specs/00-infrastructure/SPEC.md` pour le schema DB
4. Identifier exactement ce qui doit etre implemente et ce qui existe deja
5. Lister les fichiers a creer/modifier

### Phase 2 : PLANIFIER (toujours pas coder)
1. Definir l'ordre d'implementation (DB -> Types -> Core -> Bot)
2. Identifier les interfaces et types necessaires
3. Verifier les dependances entre packages

### Phase 3 : IMPLEMENTER
1. Suivre les conventions du `CLAUDE.md` :
   - TypeScript strict, pas de `any`
   - ESM imports
   - Zod pour validation externe
   - pino pour logging
   - Fonctionnel, pas d'effets de bord inutiles
   - DB via `packages/core/src/db/`
   - AI via `packages/core/src/ai/`
2. Implementer dans l'ordre defini
3. Verifier le typecheck apres chaque fichier majeur

### Phase 4 : VERIFIER
1. `pnpm typecheck` doit passer
2. Tester manuellement si possible
3. Verifier que l'implementation correspond a la spec

### Phase 5 : METTRE A JOUR LA SPEC
1. Mettre a jour le statut dans la spec (`A implementer` -> `Implementee`)
2. Corriger la spec si l'implementation a diverge (avec justification)
3. Mettre a jour `specs/ROADMAP.md` si necessaire
