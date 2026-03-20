/**
 * Formation Context — Layer 1 (global knowledge)
 *
 * Builds a compact curriculum overview injected into agent system prompts.
 * Merges static curriculum map (all 24 sessions) with live DB data (published sessions).
 * Cached in memory with TTL.
 */
import { getAllSessions } from '../../db/formation/index.js';
import { logger } from '../../logger.js';
import type { Session } from '../../types/index.js';

// ============================================
// Static curriculum map — what each session covers
// Updated when curriculum changes (source: recherche/CURRICULUM.md)
// ============================================

interface CurriculumEntry {
  module: number;
  moduleName: string;
  title: string;
  concepts: string;
  exercise: string;
  deliverable: string;
}

const CURRICULUM: Record<number, CurriculumEntry> = {
  1: {
    module: 1, moduleName: 'Decouvrir',
    title: 'Kick-Off + Quick Win',
    concepts: 'Presentation formation, journey map, vallee du desespoir, pods, alumni-mentors',
    exercise: 'Deployer une landing page avec v0/Lovable',
    deliverable: 'URL en ligne partageable',
  },
  2: {
    module: 1, moduleName: 'Decouvrir',
    title: 'Le digital : la salle et la cuisine',
    concepts: 'Analogie restaurant partie 1 — front-end (salle), back-end (cuisine), interface (menu), algorithme (recette). Decomposition, pseudocode',
    exercise: 'Choisir une app connue, dessiner son restaurant (salle + cuisine + recettes)',
    deliverable: 'image (schema)',
  },
  3: {
    module: 1, moduleName: 'Decouvrir',
    title: 'Le digital : le frigo, les fournisseurs et le vigile',
    concepts: 'Analogie restaurant partie 2 — base de donnees (frigo), API (serveur), APIs tierces (fournisseurs), authentification (badge), DNS (adresse). Patterns entre apps',
    exercise: 'Completer le schema de S2 avec les nouveaux elements',
    deliverable: 'image (schema complet)',
  },
  4: {
    module: 1, moduleName: 'Decouvrir',
    title: 'Le paysage IA 2026',
    concepts: '3 categories: generateurs (v0, Lovable), editeurs IA (Cursor, Windsurf), assistants code (Claude Code, Codex CLI). Progression du generateur vers l\'assistant',
    exercise: 'Construire avec Cursor ou Claude Code en suivant le brief decompose',
    deliverable: 'URL (page construite avec editeur IA)',
  },
  5: {
    module: 2, moduleName: 'La Methode',
    title: 'Le chaos controle',
    concepts: 'Choisir son projet fil rouge. Experience du chaos : coder sans methode, decouvrir les limites. Debrief des frustrations',
    exercise: 'Construire un prototype sans methode puis ajouter une feature qui casse tout',
    deliverable: 'prototype + liste de frustrations',
  },
  6: {
    module: 2, moduleName: 'La Methode',
    title: 'La revelation — la methode en 6 etapes',
    concepts: 'DECRIRE → RECHERCHER → QUESTIONNER → COMPRENDRE → PRIORISER → SPECIFIER. Chaque etape resout une frustration de S5',
    exercise: 'Appliquer les etapes 1-3 a son projet (description + recherche + questions)',
    deliverable: 'document texte (etapes 1-3)',
  },
  7: {
    module: 2, moduleName: 'La Methode',
    title: 'Ecrire la spec + fichier de config',
    concepts: 'Template de spec (vue d\'ensemble, architecture, schema, features, roadmap). Fichier de config IA (CLAUDE.md / .cursorrules) = spec comme contexte permanent',
    exercise: 'Ecrire la spec complete de son projet + creer le fichier de config',
    deliverable: 'document (spec) + fichier (config IA)',
  },
  8: {
    module: 2, moduleName: 'La Methode',
    title: 'Piloter l\'IA avec la spec + peer review',
    concepts: 'IA fait vs humain fait. Sprint spec-driven. Peer review de specs entre pods',
    exercise: 'Executer 3-4 taches avec la spec + reviewer la spec d\'un autre pod',
    deliverable: 'taches executees + retours peer review',
  },
  9: {
    module: 3, moduleName: 'L\'Arsenal IA',
    title: 'Skills et prompts reutilisables',
    concepts: 'Skills = instructions pre-ecrites. 4 skills essentiels : Explainer, UX Review, Spec Sync, Pre-commit Review',
    exercise: 'Creer les 4 skills et les tester sur son code',
    deliverable: 'fichiers skills configures',
  },
  10: {
    module: 3, moduleName: 'L\'Arsenal IA',
    title: 'Agents et sprint',
    concepts: 'Agent = IA avec role specifique + system prompt. Sub-agents. Creer un agent personnalise',
    exercise: 'Creer un agent pour son projet + sprint avec l\'arsenal complet',
    deliverable: 'fichier agent + avancees projet',
  },
  11: {
    module: 3, moduleName: 'L\'Arsenal IA',
    title: 'Sprint approfondi',
    concepts: 'Auth (Supabase Auth), integrations externes (paiement, email, IA). Creer comptes + cles API + .env',
    exercise: 'Implementer auth et/ou integration externe',
    deliverable: 'projet avec auth/integration fonctionnelle',
  },
  12: {
    module: 3, moduleName: 'L\'Arsenal IA',
    title: 'Ceremonie mi-parcours + peer review technique',
    concepts: 'Retrospective, celebration. Peer review technique : le produit fait ce que la spec promet ?',
    exercise: 'Tester le projet d\'un autre pod avec grille d\'evaluation',
    deliverable: 'retours structures + projet ameliore',
  },
  13: {
    module: 4, moduleName: 'Construire',
    title: 'Sprint : interface + donnees',
    concepts: 'Design avec 5 regles UX. Tables Supabase, CRUD, regles metier',
    exercise: 'Construire front-end + DB connectes',
    deliverable: 'CRUD fonctionnel',
  },
  14: {
    module: 4, moduleName: 'Construire',
    title: 'Sprint : features avancees',
    concepts: 'Features specifiques au projet. Lecture de code avec Explainer + Spec Sync',
    exercise: 'Implementer features avancees + review du code genere',
    deliverable: 'projet enrichi',
  },
  15: {
    module: 4, moduleName: 'Construire',
    title: 'Debug et esprit critique',
    concepts: 'L\'IA ment parfois. Think-Aloud Protocol. 4 questions de review (inattendu, reseau, securite, responsabilite unique)',
    exercise: 'Appliquer les 4 questions a son projet + trouver des bugs dans du code IA',
    deliverable: 'bugs corriges + checklist de review',
  },
  16: {
    module: 4, moduleName: 'Construire',
    title: 'Peer review specs vs produit',
    concepts: 'Review SPECS vs PRODUIT (pas le code). Ecarts, bugs, manques',
    exercise: 'Tester le projet d\'un autre pod contre sa spec',
    deliverable: 'projet ameliore + roadmap finalisee',
  },
  17: {
    module: 5, moduleName: 'Professionnaliser',
    title: 'Exercice : proposition client',
    concepts: 'Scenario client reel (brief vague). Workflow methode appliquee : recherche → questions → spec → proposition',
    exercise: 'Chaque pod recoit un brief client et produit une proposition',
    deliverable: 'proposition client (spec + estimation + roadmap)',
  },
  18: {
    module: 5, moduleName: 'Professionnaliser',
    title: 'Sprint autonome',
    concepts: 'Autonomie totale. Magomed + mentors en support',
    exercise: 'Avancer le projet en autonomie',
    deliverable: 'avancees concretes',
  },
  19: {
    module: 5, moduleName: 'Professionnaliser',
    title: 'Peer review de specs avancee',
    concepts: 'Analyser la spec d\'un autre etudiant avec l\'IA. Proposer des SPECS ALTERNATIVES',
    exercise: 'Analyser + proposer des specs alternatives a un pair',
    deliverable: 'spec amelioree + alternatives proposees',
  },
  20: {
    module: 5, moduleName: 'Professionnaliser',
    title: 'MVP Checkpoint',
    concepts: 'Deadline MVP. Demo rapide. Plan pour les 2 dernieres semaines',
    exercise: 'Le projet DOIT fonctionner — demo 3 min',
    deliverable: 'MVP fonctionnel',
  },
  21: {
    module: 6, moduleName: 'Livrer',
    title: 'Tests utilisateur reel',
    concepts: 'Tester par quelqu\'un d\'exterieur. Protocole : tache, observer, noter les frictions',
    exercise: 'Faire tester son projet par un utilisateur externe',
    deliverable: 'retours utilisateurs + corrections',
  },
  22: {
    module: 6, moduleName: 'Livrer',
    title: 'Deploiement production',
    concepts: 'Deploiement reel (Vercel, Railway). Domaine, partage, checklist de lancement',
    exercise: 'Deployer le projet en production',
    deliverable: 'URL accessible au monde',
  },
  23: {
    module: 6, moduleName: 'Livrer',
    title: 'Repetition Demo Day',
    concepts: 'Format presentation : probleme → solution → demo → apprentissages → next steps (7 min)',
    exercise: 'Dry run en pods + feedback',
    deliverable: 'presentation rodee',
  },
  24: {
    module: 6, moduleName: 'Livrer',
    title: 'DEMO DAY + Graduation',
    concepts: 'Presentations finales, votes, roles Discord, opportunites equipe',
    exercise: 'Presentation finale devant la cohorte + alumni S1',
    deliverable: 'produit fini presente',
  },
};

// ============================================
// Cache
// ============================================

let cachedContext: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Build the global formation context for agent system prompts.
 * Merges static curriculum with live session data from DB.
 */
export async function buildFormationContext(): Promise<string> {
  const now = Date.now();
  if (cachedContext && now - cacheTimestamp < CACHE_TTL) {
    return cachedContext;
  }

  let dbSessions: Session[] = [];
  try {
    dbSessions = await getAllSessions();
  } catch (err) {
    logger.warn({ err }, 'Failed to load sessions for formation context');
  }

  const sessionMap = new Map<number, Session>();
  for (const s of dbSessions) {
    sessionMap.set(s.session_number, s);
  }

  const lines: string[] = [
    'FORMATION PILOTE NEURO — 12 semaines, 6 modules, 24 sessions',
    'Format: 2 sessions de 2h/semaine + exercices + videos pre-session',
    '',
  ];

  let currentModule = 0;
  for (let i = 1; i <= 24; i++) {
    const entry = CURRICULUM[i]!;
    const dbSession = sessionMap.get(i);

    // Module header
    if (entry.module !== currentModule) {
      currentModule = entry.module;
      if (i > 1) lines.push('');
      lines.push(`MODULE ${currentModule} — ${entry.moduleName} (S${i}-S${i + (currentModule <= 2 ? 3 : currentModule === 6 ? 3 : 3)})`);
    }

    // Session status
    let status: string;
    if (dbSession) {
      status = dbSession.status === 'published' ? 'PUBLIEE' : dbSession.status === 'completed' ? 'TERMINEE' : 'BROUILLON';
    } else {
      status = 'NON CREEE';
    }

    // Deadline info
    const deadline = dbSession?.deadline
      ? ` | Deadline: ${new Date(dbSession.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
      : '';

    // Exercise from DB if available, else static
    const exerciseDesc = dbSession?.exercise_description || entry.exercise;
    const deliverable = dbSession?.expected_deliverables || entry.deliverable;

    lines.push(`  S${i}: ${entry.title} [${status}]${deadline}`);
    lines.push(`    Concepts: ${entry.concepts}`);
    lines.push(`    Exercice: ${exerciseDesc} → Format: ${deliverable}`);
  }

  lines.push('');
  lines.push('Pour plus de details sur un concept ou une session, utilise search_course_content.');

  cachedContext = lines.join('\n');
  cacheTimestamp = now;

  logger.debug(
    { sessions: dbSessions.length, chars: cachedContext.length },
    'Formation context built'
  );

  return cachedContext;
}

/** Invalidate cache (call after session create/update) */
export function invalidateFormationContext(): void {
  cachedContext = null;
  cacheTimestamp = 0;
}
