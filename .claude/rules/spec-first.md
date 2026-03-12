# Regle : Developpement Spec-First

## Principe fondamental
Les specs (`specs/`) sont la SOURCE DE VERITE du projet. Tout developpement DOIT :
1. Commencer par lire la spec du composant concerne
2. Implementer selon la spec
3. Mettre a jour la spec si l'implementation diverge

## Avant de coder
- TOUJOURS lire `specs/[composant]/SPEC.md` avant de modifier du code dans le package correspondant
- Verifier `specs/CONNEXIONS.md` si le changement impacte les flux entre composants
- Consulter `specs/ROADMAP.md` pour le statut actuel des phases

## Correspondance composant -> package
| Spec | Package | Phase |
|------|---------|-------|
| `specs/00-infrastructure/` | `supabase/` + schemas | 0 |
| `specs/01-cerveau-central/` | `packages/core/` | 1-2 |
| `specs/02-bot-telegram/` | `packages/bot-telegram/` | 1 |
| `specs/03-bot-telegram-public/` | `packages/bot-telegram-public/` | 2 |
| `specs/04-bot-discord/` | `packages/bot-discord/` | 3 |
| `specs/05-systeme-contenu/` | integre dans core + bots | 4 |

## Apres avoir code
- Verifier que la spec reflette ce qui a ete implemente
- Si la spec et le code divergent, c'est un BUG a corriger (soit la spec soit le code)
- Mettre a jour les statuts dans la spec

## Commandes disponibles
- `/spec-check [composant]` : Verifier la conformite implementation vs spec
- `/spec-update [composant]` : Mettre a jour la spec apres des changements
- `/implement [composant/feature]` : Implementer une feature en suivant la spec
- `/sync-check` : Audit complet de tout le projet
