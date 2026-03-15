/**
 * Script standalone pour lancer les 3 recherches de l'Etape 1 — Formation Session 2
 * Usage: pnpm -F @vibe-coder/core tsx ../../scripts/run-formation-research.ts
 */

import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually without dotenv dependency
const envPath = resolve(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex).trim();
  const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = value;
}

import { runResearchAgent } from '../packages/core/src/ai/research-agent.js';
import { writeFile, mkdir } from 'fs/promises';
const OUTPUT_DIR = join(__dirname, '..', 'specs', '06-formation', 'recherches');

const researches = [
  {
    id: 'A',
    filename: 'recherche-A-psychologie-apprenants.md',
    topic: 'Psychologie des apprenants non-techniques qui apprennent la tech',
    details: `Contexte : je prepare une formation de 3 mois (2x2h/semaine, 30 etudiants) pour enseigner a des non-techniques comment concevoir des systemes digitaux avec l'IA. Ce n'est PAS un cours de code — c'est apprendre a penser, structurer, et utiliser l'IA pour construire.

Points cles a explorer en profondeur :
- Barrieres cognitives face au code et a l'abstraction chez les non-techniques
- Syndrome de l'imposteur dans l'apprentissage tech — comment le detecter et le depasser
- Courbe de motivation sur 3 mois (lune de miel → vallee du desespoir → plateau → maitrise)
- Comment transformer un "consommateur de tech" en "createur de tech" — le shift mental necessaire
- Growth mindset applique a l'apprentissage tech
- Techniques de motivation qui marchent pour des adultes autodidactes payants (1200€)
- Comment gerer le moment "je suis pas fait pour ca" — interventions concretes
- Differences entre apprenants visuels, pratiques, theoriques — comment les servir tous
- Role de la communaute/cohorte dans la motivation individuelle`,
  },
  {
    id: 'B',
    filename: 'recherche-B-pedagogie-tech-non-techniques.md',
    topic: 'Pedagogie pour enseigner la tech a des non-techniques (concepts, pas syntaxe)',
    details: `Contexte : formation 3 mois pour 30 non-techniques. L'objectif n'est PAS d'enseigner la programmation mais de transmettre : la comprehension (comment le code fonctionne), l'architecture (comment decomposer un projet), l'utilisation de l'IA (communiquer avec Claude/ChatGPT pour construire), l'esprit critique (verifier le travail de l'IA), le design/UX.

Points cles a explorer en profondeur :
- Computational thinking (decomposition, patterns, abstraction, algorithmes) — comment l'enseigner sans coder
- Apprentissage par analogies (recette = algorithme, restaurant = client-serveur, etc.) — les meilleures analogies tech
- Project-based learning vs theorie-first pour des adultes qui veulent des resultats concrets
- Comment expliquer le code sans enseigner le code — methodes eprouvees
- Feedback loops efficaces en formation en ligne (comment corriger sans decourager)
- Gestion d'une cohorte de 30 personnes avec des vitesses tres differentes
- Role des exercices pratiques dans la retention a long terme — quel type d'exercice pour quel objectif
- Pair programming / entraide entre etudiants — comment le structurer
- Scaffolding : comment retirer progressivement l'aide pour rendre autonome
- Bloom's taxonomy appliquee a l'apprentissage tech`,
  },
  {
    id: 'C',
    filename: 'recherche-C-structure-programme-3-mois.md',
    topic: 'Structure optimale pour un programme de formation en ligne de 3 mois',
    details: `Contexte : formation de 12 semaines, 2 sessions de 2h par semaine (mardi + jeudi soir), 30 etudiants non-techniques, prix 1200€ (4x300€). Session 1 a eu 14 inscrits, 10 termines, 6 operationnels. Problemes session 1 : Google Drive (autorisations), exercices soumis a la derniere minute, pas de PDFs de resume, enregistrements manuels.

Points cles a explorer en profondeur :
- Frequence et duree ideales des sessions — pourquoi 2x2h est bon ou pas, alternatives
- Spacing effect et retention a long terme — comment espacer l'apprentissage
- Design d'exercices progressifs : guides → semi-ouverts → projets libres — avec exemples concrets
- Discord comme plateforme d'apprentissage (canaux, gamification, bots, communaute)
- Onboarding premiere semaine — comment bien demarrer une cohorte pour maximiser la retention
- Comment gerer l'abandon — quand et pourquoi les gens decrochent, interventions preventives
- Mix optimal live vs pre-enregistre vs lecture vs exercice — ratios recommandes
- Evaluation et feedback : comment evaluer sans decourager, rubrics, auto-evaluation
- Deadlines echelonnees vs deadline unique — impact sur la qualite et le stress
- Ceremonies de cohorte (kick-off, mi-parcours, demo day, graduation) — impact sur l'engagement
- Comment structurer les premieres et dernieres 10 minutes de chaque session`,
  },
];

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log('=== FORMATION SESSION 2 — Etape 1 : Recherches approfondies ===\n');

  for (const research of researches) {
    console.log(`\n🔬 Recherche ${research.id} en cours...`);
    console.log(`   Topic: ${research.topic}\n`);

    const startTime = Date.now();

    const result = await runResearchAgent({
      topic: research.topic,
      details: research.details,
      includeMemory: true,
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    const outputPath = join(OUTPUT_DIR, research.filename);

    const header = `# Recherche ${research.id} — ${research.topic}\n\n> Generee le ${new Date().toISOString().split('T')[0]} via Research Agent\n\n---\n\n`;
    await writeFile(outputPath, header + result.content, 'utf-8');

    console.log(`   ✅ Terminee en ${duration}s — ${result.content.length} caracteres`);
    console.log(`   📄 Sauvegardee: ${outputPath}`);
  }

  console.log('\n=== Les 3 recherches sont terminees ! ===');
}

main().catch((err) => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
