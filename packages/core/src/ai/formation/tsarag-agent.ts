import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'node:crypto';
import { logger } from '../../logger.js';
import {
  getStudentsBySession,
  searchStudentByName,
  getExercisesByStudent,
  getPendingExercises,
  getSessionByNumber,
  getAllSessions,
  getExerciseSummary,
  createSession,
  updateSession,
  updateExerciseStatus,
  createFormationEvent,
  searchFormationKnowledge,
} from '../../db/formation/index.js';
import { getEmbedding } from '../embeddings.js';
import { createMeetEvent } from '../../google/meet.js';
import type {
  TsaragAgentContext,
  TsaragAgentResponse,
  PendingAction,
  Student,
} from '../../types/index.js';

// ============================================
// System prompt
// ============================================

const SYSTEM_PROMPT = `Tu es Tsarag, l'assistant admin de la formation "Pilote Neuro".
Tu parles en francais avec Magomed (le formateur/admin). Le contenu destine aux etudiants est TOUJOURS en russe.

TON :
- Direct, efficace, pas de blabla
- Tutoiement
- Proactif : si tu detectes un probleme ou une opportunite, signale-le

TU FAIS :
- Gerer les sessions (creer, modifier, publier)
- Gerer les exercices (approuver, demander revision, lister en attente)
- Gerer les etudiants (voir profil, progression, envoyer DM)
- Envoyer des annonces (en russe) dans le canal annonces
- Chercher dans les materiaux de cours
- Donner des stats sur la formation

FLOW D'ACTIONS (obligatoire pour toute operation d'ecriture) :
1. Tu collectes les infos necessaires (appels READ si besoin)
2. Tu appelles propose_action avec le type, les params et un resume en francais
3. Tu presentes le resume et demandes "Tu confirmes ?"
4. Si l'utilisateur confirme ("oui" / "go" / "ok") -> tu appelles execute_pending
5. Si "change X" / "modifie Y" -> tu appelles propose_action avec les params ajustes (remplace le precedent)
6. Si "annule" / "non" -> tu abandonnes (ni propose_action ni execute_pending)

CHOIX D'OUTIL — sessions vs contenu :
- "qu'est-ce qu'on enseigne en session 3", "c'est quoi le programme du module 1", "l'analogie du restaurant" → search_course_content (cherche dans les materiaux pedagogiques)
- "montre la session 3", "quelle est la deadline de la session 3", "statut des sessions" → get_session_details / list_sessions (donnees operationnelles en DB)
- En cas de doute, utilise search_course_content D'ABORD. Si aucun resultat, essaie get_session_details.

REGLE CRITIQUE — TEXTE VERBATIM :
Quand l'utilisateur fournit un texte exact (titre, description, exercice, annonce, message, etc.),
tu le recopies A L'IDENTIQUE dans les params de propose_action. ZERO reformulation, ZERO correction,
ZERO amelioration. Si c'est en russe, tu le passes en russe. Si c'est en francais, en francais.
Tu ne traduis PAS, tu ne reorganises PAS, tu ne "completes" PAS.
Tu es un relai fidele, pas un redacteur. Si une info manque, DEMANDE-LA au lieu d'inventer.

INTERDIT :
- Ne remplis JAMAIS un champ avec du contenu invente
- Ne propose JAMAIS un texte "ameliore" sans qu'on te le demande
- Si l'utilisateur n'a pas fourni une info, le champ reste vide (ne mets rien)
- Ne melange JAMAIS les infos de sessions differentes

REGLE CRITIQUE — DATES :
Les champs de date (deadline, live_at) ne sont JAMAIS generes par toi.
- Tu ne convertis PAS "demain", "lundi prochain", "dans 3 jours" en date. DEMANDE le format exact.
- L'admin DOIT taper la date au format : JJ/MM/AAAA HH:MM (ex: 23/03/2026 20:00)
- Si l'admin donne une date floue ("demain a 20h", "mardi"), reponds : "Donne-moi la date exacte au format JJ/MM/AAAA HH:MM"
- Tu recopies la date TELLE QUELLE dans les params. Le systeme gere la conversion.
- L'heure fournie est en heure de Bangkok (ou l'admin se trouve). L'affichage aux etudiants sera en heure de Paris.

FLOW CREATION DE SESSION :
Quand l'utilisateur veut creer une session, suis ce flow :

1. Demande les infos MANQUANTES une par une (ou accepte plusieurs d'un coup)
2. Apres CHAQUE reponse de l'utilisateur, affiche le template mis a jour :

📋 Session {N} — Модуль {M}
━━━━━━━━━━━━━━━━━━━━━
Название: {titre ou ❌}
Тема: {description ou ❌}
🎬 Видео: {url ou —}
🟢 Live: {date + канал ou —}
📝 Задание: {description ou ❌}
📦 Что сдать: {deliverables ou ❌}
💡 Советы: {tips ou —}
📅 Сдать до: {date ou —}
━━━━━━━━━━━━━━━━━━━━━

3. Quand tous les champs obligatoires (❌) sont remplis, propose la confirmation
4. N'appelle propose_action QUE quand le template est complet et confirme
5. Les champs avec — sont optionnels, ne les invente JAMAIS
6. Si l'utilisateur dit "aide-moi" pour un champ, propose des suggestions MAIS laisse-le choisir

REGLES :
- N'appelle JAMAIS execute_pending sans confirmation explicite de l'utilisateur dans le DERNIER message
- Quand tu generes du contenu etudiant (annonces, DM, posts forum), genere-le en russe
- Si un etudiant n'est pas trouve, demande de preciser le nom
- Si plusieurs exercices en attente pour un etudiant, liste-les et demande lequel traiter
- Si execute_pending retourne already_executed, ne retente PAS`;

// ============================================
// Helpers
// ============================================

/** Heuristic: check if text is mostly Cyrillic (Russian) */
function looksRussian(text: string): boolean {
  const cyrillicCount = (text.match(/[\u0400-\u04FF]/g) ?? []).length;
  const latinCount = (text.match(/[a-zA-Z]/g) ?? []).length;
  const totalAlpha = cyrillicCount + latinCount;
  if (totalAlpha < 5) return true; // Too short to tell, allow it
  return cyrillicCount >= latinCount;
}

const STUDENT_FACING_FIELDS = [
  'title', 'description', 'exercise_description',
  'expected_deliverables', 'exercise_tips', 'text', 'message', 'feedback',
];

/** Timezone constants for formation */
const DISPLAY_TZ = 'Europe/Paris';   // Student-facing display timezone
const BANGKOK_OFFSET = '+07:00';

/** Expected admin date format: JJ/MM/AAAA HH:MM */
const ADMIN_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;

/**
 * Parse admin date (JJ/MM/AAAA HH:MM, Bangkok time) → UTC ISO string.
 * Also accepts ISO formats as fallback for programmatic use.
 * Returns null if the format is invalid.
 */
function parseAdminDate(dateStr: string): string | null {
  // Format attendu: JJ/MM/AAAA HH:MM (Bangkok)
  const match = dateStr.match(ADMIN_DATE_REGEX);
  if (match) {
    const [, day, month, year, hour, minute] = match;
    const iso = `${year}-${month}-${day}T${hour}:${minute}:00${BANGKOK_OFFSET}`;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  // Fallback: ISO format (from slash commands or programmatic use)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const withTz = /[Zz]$/.test(dateStr) || /[+-]\d{2}:\d{2}$/.test(dateStr)
      ? dateStr : dateStr + BANGKOK_OFFSET;
    const d = new Date(withTz);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  return null; // Invalid format
}

/** Format a UTC date for student-facing display (Paris timezone, Russian locale) */
function formatDateParis(date: Date | string): { dateStr: string; timeStr: string } {
  const d = typeof date === 'string' ? new Date(date) : date;
  return {
    dateStr: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long', timeZone: DISPLAY_TZ }),
    timeStr: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: DISPLAY_TZ }),
  };
}

// ============================================
// Tool definitions
// ============================================

const READ_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'list_students',
    description: 'Lister les etudiants de la session 2. Filtre optionnel par statut.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status_filter: {
          type: 'string',
          description: 'Filtre par statut: interested, registered, paid, active, completed, dropped',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_student_details',
    description: 'Obtenir le profil et la progression d\'un etudiant par nom.',
    input_schema: {
      type: 'object' as const,
      properties: {
        student_name: {
          type: 'string',
          description: 'Nom (ou partie du nom) de l\'etudiant',
        },
      },
      required: ['student_name'],
    },
  },
  {
    name: 'list_pending_exercises',
    description: 'Lister tous les exercices en attente de correction (submitted ou ai_reviewed).',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_session_details',
    description: 'Obtenir les details d\'une session par son numero.',
    input_schema: {
      type: 'object' as const,
      properties: {
        session_number: {
          type: 'integer',
          description: 'Numero de la session',
        },
      },
      required: ['session_number'],
    },
  },
  {
    name: 'list_sessions',
    description: 'Lister toutes les sessions de la formation.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'search_course_content',
    description: 'Chercher dans les materiaux de cours (lecons, concepts, exercices).',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Texte de recherche',
        },
        session_number: {
          type: 'integer',
          description: 'Numero de session (optionnel)',
        },
        module: {
          type: 'integer',
          description: 'Numero de module (optionnel)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_formation_stats',
    description: 'Obtenir les statistiques agregees de la formation (etudiants, exercices, sessions).',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

// === ACTION tools (propose + execute) ===
const PROPOSE_ACTION_TOOL: Anthropic.Messages.Tool = {
  name: 'propose_action',
  description: `Proposer une operation d'ecriture. Le systeme la stocke et attend la confirmation de l'utilisateur.

LANGUE : TOUS les champs contenant du texte visible aux etudiants (title, description, exercise_description, expected_deliverables, exercise_tips, text, message, feedback) DOIVENT etre en RUSSE. Le champ "summary" est en francais (destine a l'admin).

Types d'actions et parametres attendus dans "params" :
- send_announcement: { text: string (RUSSE), mention_students?: boolean }
- create_session: { session_number: int, module: int, title: string (RUSSE), description?: string (RUSSE), exercise_description?: string (RUSSE), expected_deliverables?: string (RUSSE), exercise_tips?: string (RUSSE), deadline?: string (ISO), video_url?: string, live_at?: string (ISO, date+heure du live), status?: "draft"|"published" }
- update_session: { session_number: int, + champs a modifier (memes champs que create_session) }
- approve_exercise: { student_name: string, feedback?: string (RUSSE), exercise_id?: string }
- request_revision: { student_name: string, feedback: string (RUSSE), exercise_id?: string }
- dm_student: { student_name: string, message: string (RUSSE) }`,
  input_schema: {
    type: 'object' as const,
    properties: {
      action_type: {
        type: 'string',
        enum: ['create_session', 'update_session', 'approve_exercise', 'request_revision', 'send_announcement', 'dm_student'],
        description: 'Type d\'action',
      },
      params: {
        type: 'object' as const,
        description: 'Parametres de l\'action (voir description pour le format par type)',
      },
      summary: {
        type: 'string',
        description: 'Resume en francais de ce qui sera fait (affiche a l\'admin)',
      },
    },
    required: ['action_type', 'params', 'summary'],
  },
};

const EXECUTE_PENDING_TOOL: Anthropic.Messages.Tool = {
  name: 'execute_pending',
  description: 'Executer l\'action en attente apres confirmation explicite de l\'utilisateur. Aucun parametre — execute ce qui a ete propose.',
  input_schema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

// ============================================
// Tool handlers
// ============================================

async function handleListStudents(statusFilter?: string): Promise<string> {
  const students = await getStudentsBySession(2);
  const filtered = statusFilter
    ? students.filter((s) => s.status === statusFilter)
    : students;

  return JSON.stringify({
    total: filtered.length,
    students: filtered.map((s) => ({
      name: s.name,
      status: s.status,
      payment_status: s.payment_status,
      discord_id: s.discord_id,
      pod_id: s.pod_id,
    })),
  });
}

async function handleGetStudentDetails(studentName: string): Promise<string> {
  const students = await searchStudentByName(studentName);
  if (students.length === 0) {
    return JSON.stringify({ error: 'student_not_found', message: `Aucun etudiant trouve avec le nom "${studentName}"` });
  }

  const student = students[0]!;
  const exercises = await getExercisesByStudent(student.id);

  return JSON.stringify({
    student: {
      id: student.id,
      name: student.name,
      status: student.status,
      payment_status: student.payment_status,
      discord_id: student.discord_id,
      pod_id: student.pod_id,
      enrolled_at: student.enrolled_at,
      notes: student.notes,
    },
    exercises: exercises.map((e) => ({
      id: e.id,
      module: e.module,
      exercise_number: e.exercise_number,
      status: e.status,
      submitted_at: e.submitted_at,
      feedback: e.feedback,
      score: (e.ai_review as Record<string, unknown>)?.score ?? null,
    })),
    multiple_matches: students.length > 1 ? students.map((s) => s.name) : undefined,
  });
}

async function handleListPendingExercises(): Promise<string> {
  const pending = await getPendingExercises();

  // Enrich with student names
  const studentCache = new Map<string, string>();
  const enriched = [];
  for (const ex of pending) {
    if (!studentCache.has(ex.student_id)) {
      const students = await getStudentsBySession(2);
      for (const s of students) studentCache.set(s.id, s.name);
    }
    enriched.push({
      id: ex.id,
      student_name: studentCache.get(ex.student_id) ?? 'Inconnu',
      module: ex.module,
      exercise_number: ex.exercise_number,
      status: ex.status,
      submitted_at: ex.submitted_at,
      score: (ex.ai_review as Record<string, unknown>)?.score ?? null,
    });
  }

  return JSON.stringify({ total: enriched.length, exercises: enriched });
}

async function handleGetSessionDetails(sessionNumber: number): Promise<string> {
  const session = await getSessionByNumber(sessionNumber);
  if (!session) {
    return JSON.stringify({ error: 'session_not_found', message: `Session ${sessionNumber} non trouvee` });
  }
  return JSON.stringify(session);
}

async function handleListSessions(): Promise<string> {
  const sessions = await getAllSessions();
  return JSON.stringify({
    total: sessions.length,
    sessions: sessions.map((s) => ({
      session_number: s.session_number,
      module: s.module,
      title: s.title,
      status: s.status,
      deadline: s.deadline,
    })),
  });
}

async function handleSearchCourseContent(
  query: string,
  sessionNumber?: number,
  module?: number
): Promise<string> {
  const queryEmbedding = await getEmbedding(query);
  const results = await searchFormationKnowledge(query, queryEmbedding, {
    matchCount: 5,
    sessionNumber: sessionNumber ?? null,
    module: module ?? null,
  });

  if (results.length === 0) {
    return JSON.stringify({ results: [], message: 'Rien trouve pour cette requete.' });
  }

  return JSON.stringify({
    results: results.map((r) => ({
      title: r.title,
      content: r.content,
      module: r.module,
      session_number: r.session_number,
      type: r.content_type,
      score: Math.round(r.final_score * 100) / 100,
    })),
  });
}

async function handleGetFormationStats(): Promise<string> {
  const students = await getStudentsBySession(2);
  const summary = await getExerciseSummary();
  const sessions = await getAllSessions();

  const statusCounts: Record<string, number> = {};
  for (const s of students) {
    statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
  }

  return JSON.stringify({
    students: {
      total: students.length,
      by_status: statusCounts,
    },
    exercises: summary,
    sessions: {
      total: sessions.length,
      published: sessions.filter((s) => s.status === 'published').length,
      draft: sessions.filter((s) => s.status === 'draft').length,
      completed: sessions.filter((s) => s.status === 'completed').length,
    },
  });
}

async function handleCreateSession(
  input: Record<string, unknown>,
  context: TsaragAgentContext
): Promise<string> {
  const sessionNumber = input.session_number as number;
  const module = input.module as number;
  const title = input.title as string;
  const status = (input.status as string) ?? 'published';

  let session = await createSession({
    session_number: sessionNumber,
    module,
    title,
    description: input.description as string | undefined,
    exercise_description: input.exercise_description as string | undefined,
    expected_deliverables: input.expected_deliverables as string | undefined,
    exercise_tips: input.exercise_tips as string | undefined,
    deadline: input.deadline ? parseAdminDate(input.deadline as string) ?? undefined : undefined,
    live_at: input.live_at ? parseAdminDate(input.live_at as string) ?? undefined : undefined,
    live_url: input.live_url as string | undefined,
    status: status as 'draft' | 'published',
  });

  // Auto-generate Google Meet link if live_at is provided
  if (input.live_at && session.live_at) {
    try {
      const { meetUrl } = await createMeetEvent(
        `Session ${sessionNumber} — ${title}`,
        session.live_at
      );
      await updateSession(session.id, { live_url: meetUrl });
      session = { ...session, live_url: meetUrl };
    } catch (meetError) {
      logger.warn({ error: meetError }, 'Failed to create Google Meet link for new session');
    }
  }

  // Update video URL if provided
  if (input.video_url) {
    await updateSession(session.id, { pre_session_video_url: input.video_url as string });
  }

  let threadId: string | null = null;

  // Post to forum
  if (status === 'published') {
    // Format live date for display
    let liveInfo: string | null = null;
    if (input.live_at) {
      const liveUtc = parseAdminDate(input.live_at as string);
      if (liveUtc) {
        const { dateStr, timeStr } = formatDateParis(liveUtc);
        const meetLink = session.live_url ? `\n[Присоединиться к live](${session.live_url})` : '';
        liveInfo = `\ud83d\udfe2 **LIVE:** ${dateStr}, ${timeStr} (Paris)${meetLink}`;
      }
    }

    // Build clean, readable forum post with proper spacing
    const sections: string[] = [];

    // Header
    sections.push(`# \u0421\u0435\u0441\u0441\u0438\u044f ${sessionNumber} \u2014 ${title}\n\u041c\u043e\u0434\u0443\u043b\u044c ${module}`);

    // Info block (live + video)
    const infoLines: string[] = [];
    if (liveInfo) infoLines.push(liveInfo);
    if (input.video_url) infoLines.push(`\ud83c\udfac **\u0412\u0438\u0434\u0435\u043e:** ${input.video_url as string}`);
    if (infoLines.length > 0) sections.push(infoLines.join('\n'));

    // Description
    if (input.description) {
      sections.push(`## \u0422\u0435\u043c\u0430\n${input.description as string}`);
    }

    // Exercise block
    const exerciseLines: string[] = [];
    if (input.exercise_description) exerciseLines.push(input.exercise_description as string);
    if (input.expected_deliverables) exerciseLines.push(`\n**\u0427\u0442\u043e \u0441\u0434\u0430\u0442\u044c:** ${input.expected_deliverables as string}`);
    if (input.exercise_tips) exerciseLines.push(`\n**\u0421\u043e\u0432\u0435\u0442\u044b:** ${input.exercise_tips as string}`);
    if (exerciseLines.length > 0) sections.push(`## \u0417\u0430\u0434\u0430\u043d\u0438\u0435\n${exerciseLines.join('\n')}`);

    // Deadline — display in Paris time
    if (input.deadline) {
      const deadlineUtc = parseAdminDate(input.deadline as string);
      if (deadlineUtc) {
        const { dateStr: dlDate, timeStr: dlTime } = formatDateParis(deadlineUtc);
        sections.push(`\ud83d\udcc5 **\u0421\u0434\u0430\u0442\u044c \u0437\u0430\u0434\u0430\u043d\u0438\u0435 \u0434\u043e:** ${dlDate}, ${dlTime} (Paris)`);
      }
    }

    const forumContent = sections.join('\n\n');

    threadId = await context.discordActions.sendToSessionsForum(sessionNumber, title, forumContent, module);

    if (threadId) {
      await updateSession(session.id, { discord_thread_id: threadId });
    }

    // Announce — dynamic content based on what's provided
    const announceParts = [`\ud83c\udd95 **\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u0421\u0435\u0441\u0441\u0438\u044f ${sessionNumber}!**\n${title}`];
    if (input.video_url) {
      announceParts.push(`\ud83c\udfac \u0412\u0438\u0434\u0435\u043e: ${input.video_url as string}`);
    }
    if (liveInfo) {
      announceParts.push(liveInfo);
    }
    await context.discordActions.sendAnnouncement(announceParts.join('\n'), true);
  }

  return JSON.stringify({
    success: true,
    session_id: session.id,
    session_number: sessionNumber,
    thread_id: threadId,
    status,
  });
}

async function handleUpdateSession(input: Record<string, unknown>, context: TsaragAgentContext): Promise<string> {
  const sessionNumber = input.session_number as number;
  const session = await getSessionByNumber(sessionNumber);
  if (!session) {
    return JSON.stringify({ error: 'session_not_found', message: `Session ${sessionNumber} non trouvee` });
  }

  const updates: Record<string, unknown> = {};
  if (input.title) updates.title = input.title;
  if (input.description) updates.description = input.description;
  if (input.exercise_description) updates.exercise_description = input.exercise_description;
  if (input.expected_deliverables) updates.expected_deliverables = input.expected_deliverables;
  if (input.exercise_tips) updates.exercise_tips = input.exercise_tips;
  if (input.deadline) updates.deadline = parseAdminDate(input.deadline as string) ?? undefined;
  if (input.video_url) updates.pre_session_video_url = input.video_url;
  if (input.live_at) {
    const liveIso = parseAdminDate(input.live_at as string);
    if (liveIso) {
      updates.live_at = liveIso;
      // Auto-generate Google Meet link
      try {
        const sessionTitle = (input.title as string) ?? session.title;
        const { meetUrl } = await createMeetEvent(
          `Session ${sessionNumber} — ${sessionTitle}`,
          liveIso
        );
        updates.live_url = meetUrl;
      } catch (meetError) {
        logger.warn({ error: meetError }, 'Failed to create Google Meet link for session update');
      }
    }
  }
  if (input.live_url) updates.live_url = input.live_url;
  if (input.status) updates.status = input.status;

  const updated = await updateSession(session.id, updates);

  if (input.status === 'draft' && session.discord_thread_id) {
    await context.discordActions.archiveForumThread(session.discord_thread_id);
  }
  if (input.status === 'published' && session.discord_thread_id) {
    await context.discordActions.unarchiveForumThread(session.discord_thread_id);
  }

  return JSON.stringify({ success: true, session: updated });
}

async function handleApproveExercise(
  input: Record<string, unknown>,
  context: TsaragAgentContext
): Promise<string> {
  const studentName = input.student_name as string;
  const feedback = input.feedback as string | undefined;
  const exerciseId = input.exercise_id as string | undefined;

  const students = await searchStudentByName(studentName);
  if (students.length === 0) {
    return JSON.stringify({ error: 'student_not_found', message: `Etudiant "${studentName}" non trouve` });
  }

  const student = students[0]!;
  const exercises = await getExercisesByStudent(student.id);
  const pending = exercises.filter((e) => e.status === 'submitted' || e.status === 'ai_reviewed');

  if (pending.length === 0) {
    return JSON.stringify({ error: 'no_pending', message: `${student.name} n'a aucun exercice en attente` });
  }

  const exercise = exerciseId
    ? pending.find((e) => e.id === exerciseId)
    : pending[0];

  if (!exercise) {
    return JSON.stringify({ error: 'exercise_not_found', message: `Exercice non trouve` });
  }

  if (pending.length > 1 && !exerciseId) {
    return JSON.stringify({
      error: 'multiple_pending',
      message: `${student.name} a ${pending.length} exercices en attente. Precise lequel :`,
      exercises: pending.map((e) => ({
        id: e.id,
        module: e.module,
        exercise_number: e.exercise_number,
        submitted_at: e.submitted_at,
      })),
    });
  }

  await updateExerciseStatus(exercise.id, 'approved', feedback);

  await createFormationEvent({
    type: 'exercise_reviewed',
    source: 'discord',
    target: 'telegram-admin',
    data: {
      student_name: student.name,
      module: exercise.module,
      exercise_number: exercise.exercise_number,
      status: 'approved',
    },
  });

  // DM the student — report delivery status
  let dmSent = false;
  if (student.discord_id) {
    const dmText = `\u2705 **\u0417\u0430\u0434\u0430\u043d\u0438\u0435 \u043e\u0434\u043e\u0431\u0440\u0435\u043d\u043e!** M${exercise.module}-\u0417${exercise.exercise_number}\n` +
      (feedback ? `\n\ud83d\udcac \u041e\u0442\u0437\u044b\u0432: ${feedback}` : '\n\u0425\u043e\u0440\u043e\u0448\u0430\u044f \u0440\u0430\u0431\u043e\u0442\u0430!');
    dmSent = await context.discordActions.dmStudent(student.discord_id, dmText);
  }

  return JSON.stringify({
    success: true,
    student_name: student.name,
    module: exercise.module,
    exercise_number: exercise.exercise_number,
    dm_sent: dmSent,
    ...((!student.discord_id) && { warning: 'Etudiant sans Discord ID — DM non envoye' }),
    ...(student.discord_id && !dmSent && { warning: 'DM non delivre — l\'etudiant a peut-etre bloque les DMs' }),
  });
}

async function handleRequestRevision(
  input: Record<string, unknown>,
  context: TsaragAgentContext
): Promise<string> {
  const studentName = input.student_name as string;
  const feedback = input.feedback as string;
  const exerciseId = input.exercise_id as string | undefined;

  const students = await searchStudentByName(studentName);
  if (students.length === 0) {
    return JSON.stringify({ error: 'student_not_found', message: `Etudiant "${studentName}" non trouve` });
  }

  const student = students[0]!;
  const exercises = await getExercisesByStudent(student.id);
  const pending = exercises.filter((e) => e.status === 'submitted' || e.status === 'ai_reviewed');

  if (pending.length === 0) {
    return JSON.stringify({ error: 'no_pending', message: `${student.name} n'a aucun exercice en attente` });
  }

  const exercise = exerciseId
    ? pending.find((e) => e.id === exerciseId)
    : pending[0];

  if (!exercise) {
    return JSON.stringify({ error: 'exercise_not_found', message: `Exercice non trouve` });
  }

  if (pending.length > 1 && !exerciseId) {
    return JSON.stringify({
      error: 'multiple_pending',
      message: `${student.name} a ${pending.length} exercices en attente. Precise lequel :`,
      exercises: pending.map((e) => ({
        id: e.id,
        module: e.module,
        exercise_number: e.exercise_number,
        submitted_at: e.submitted_at,
      })),
    });
  }

  await updateExerciseStatus(exercise.id, 'revision_needed', feedback);

  await createFormationEvent({
    type: 'exercise_reviewed',
    source: 'discord',
    target: 'telegram-admin',
    data: {
      student_name: student.name,
      module: exercise.module,
      exercise_number: exercise.exercise_number,
      status: 'revision_needed',
    },
  });

  // DM the student — report delivery status
  let dmSent = false;
  if (student.discord_id) {
    const dmText = `\ud83d\udd04 **\u0417\u0430\u0434\u0430\u043d\u0438\u0435 \u043d\u0430 \u0434\u043e\u0440\u0430\u0431\u043e\u0442\u043a\u0443** M${exercise.module}-\u0417${exercise.exercise_number}\n\n\ud83d\udcac ${feedback}`;
    dmSent = await context.discordActions.dmStudent(student.discord_id, dmText);
  }

  return JSON.stringify({
    success: true,
    student_name: student.name,
    module: exercise.module,
    exercise_number: exercise.exercise_number,
    dm_sent: dmSent,
    ...((!student.discord_id) && { warning: 'Etudiant sans Discord ID — DM non envoye' }),
    ...(student.discord_id && !dmSent && { warning: 'DM non delivre — l\'etudiant a peut-etre bloque les DMs' }),
  });
}

async function handleSendAnnouncement(
  input: Record<string, unknown>,
  context: TsaragAgentContext
): Promise<string> {
  const text = input.text as string;
  const mentionStudents = (input.mention_students as boolean) ?? false;

  await context.discordActions.sendAnnouncement(text, mentionStudents);

  return JSON.stringify({ success: true, message: 'Annonce envoyee' });
}

async function handleDmStudent(
  input: Record<string, unknown>,
  context: TsaragAgentContext
): Promise<string> {
  const studentName = input.student_name as string;
  const message = input.message as string;

  const students = await searchStudentByName(studentName);
  if (students.length === 0) {
    return JSON.stringify({ error: 'student_not_found', message: `Etudiant "${studentName}" non trouve` });
  }

  const student = students[0]!;
  if (!student.discord_id) {
    return JSON.stringify({ error: 'no_discord_id', message: `${student.name} n'a pas de Discord ID lie` });
  }

  const sent = await context.discordActions.dmStudent(student.discord_id, message);
  return JSON.stringify({
    success: sent,
    student_name: student.name,
    message: sent ? 'DM envoye' : 'Echec de l\'envoi du DM',
  });
}

// ============================================
// Main agent function
// ============================================

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (anthropicClient) return anthropicClient;
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');
  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

/** Dispatch a pending action to the appropriate write handler */
async function executePendingAction(
  action: { type: string; params: Record<string, unknown> },
  context: TsaragAgentContext
): Promise<{ result: string; label: string }> {
  switch (action.type) {
    case 'create_session':
      return {
        result: await handleCreateSession(action.params, context),
        label: `Session ${action.params.session_number} creee`,
      };
    case 'update_session':
      return {
        result: await handleUpdateSession(action.params, context),
        label: `Session ${action.params.session_number} mise a jour`,
      };
    case 'approve_exercise':
      return {
        result: await handleApproveExercise(action.params, context),
        label: `Exercice de ${action.params.student_name} approuve`,
      };
    case 'request_revision':
      return {
        result: await handleRequestRevision(action.params, context),
        label: `Revision demandee a ${action.params.student_name}`,
      };
    case 'send_announcement':
      return {
        result: await handleSendAnnouncement(action.params, context),
        label: 'Annonce envoyee',
      };
    case 'dm_student':
      return {
        result: await handleDmStudent(action.params, context),
        label: `DM envoye a ${action.params.student_name}`,
      };
    default:
      return {
        result: JSON.stringify({ error: 'unknown_action', message: `Type d'action inconnu: ${action.type}` }),
        label: `Action inconnue: ${action.type}`,
      };
  }
}

export async function runTsaragAgent(context: TsaragAgentContext): Promise<TsaragAgentResponse> {
  const client = getAnthropicClient();
  const actionsPerformed: string[] = [];
  let proposedAction: PendingAction | null = null;
  let pendingConsumed = false;
  let pendingExecutedThisTurn = false;
  let executedActionId: string | null = null;

  // Build tools list: READ tools + propose_action + execute_pending (only if there's a pending action)
  const tools: Anthropic.Messages.Tool[] = [...READ_TOOLS, PROPOSE_ACTION_TOOL];
  if (context.pendingAction) {
    tools.push(EXECUTE_PENDING_TOOL);
  }

  // Build messages array for Claude
  const messages: Anthropic.Messages.MessageParam[] = context.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Append attachment info to the last user message if present
  if (context.attachmentsInfo && messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'user' && typeof lastMsg.content === 'string') {
      lastMsg.content = `${lastMsg.content}\n\n[Pieces jointes: ${context.attachmentsInfo}]`;
    }
  }

  // Inject pending action context if present
  let systemPrompt = SYSTEM_PROMPT;
  if (context.pendingAction) {
    systemPrompt += `\n\nACTION EN ATTENTE DE CONFIRMATION :\nType: ${context.pendingAction.type}\nResume: ${context.pendingAction.summary}\nSi l'utilisateur confirme, appelle execute_pending. Si il veut modifier, appelle propose_action avec les nouveaux params.`;
  }

  // Track initial message count to extract turn messages later
  const initialMessageCount = messages.length;

  // Tool use loop
  let response: Anthropic.Messages.Message;
  let iterations = 0;
  const maxIterations = 8;

  while (iterations < maxIterations) {
    iterations++;

    logger.debug(
      { iteration: iterations, messageCount: messages.length },
      'Tsarag agent calling Claude'
    );

    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      messages,
    });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
    );

    if (toolUseBlocks.length === 0) {
      break;
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const input = toolUse.input as Record<string, unknown>;
      let result: string;

      try {
        switch (toolUse.name) {
          // === READ tools ===
          case 'list_students':
            result = await handleListStudents(input.status_filter as string | undefined);
            break;
          case 'get_student_details':
            result = await handleGetStudentDetails(input.student_name as string);
            break;
          case 'list_pending_exercises':
            result = await handleListPendingExercises();
            break;
          case 'get_session_details':
            result = await handleGetSessionDetails(input.session_number as number);
            break;
          case 'list_sessions':
            result = await handleListSessions();
            break;
          case 'search_course_content':
            result = await handleSearchCourseContent(
              input.query as string,
              input.session_number as number | undefined,
              input.module as number | undefined
            );
            break;
          case 'get_formation_stats':
            result = await handleGetFormationStats();
            break;

          // === ACTION tools ===
          case 'propose_action': {
            const actionType = input.action_type as string;
            const params = input.params as Record<string, unknown>;
            const summary = input.summary as string;
            proposedAction = { type: actionType, params, summary, id: randomUUID() };

            // Validate date fields — must be in format JJ/MM/AAAA HH:MM or valid ISO
            const DATE_FIELDS = ['deadline', 'live_at'];
            const dateErrors: string[] = [];
            for (const field of DATE_FIELDS) {
              const value = params[field];
              if (typeof value === 'string' && value.length > 0) {
                if (!parseAdminDate(value)) {
                  dateErrors.push(`"${field}": "${value}" — format invalide. Attendu: JJ/MM/AAAA HH:MM`);
                }
              }
            }
            if (dateErrors.length > 0) {
              result = JSON.stringify({
                error: 'invalid_date_format',
                message: `Format de date invalide :\n${dateErrors.join('\n')}\nDemande a l'admin le format exact : JJ/MM/AAAA HH:MM`,
              });
              break;
            }

            // Warn if student-facing fields don't look Russian
            const langWarnings: string[] = [];
            for (const field of STUDENT_FACING_FIELDS) {
              const value = params[field];
              if (typeof value === 'string' && value.length > 0 && !looksRussian(value)) {
                langWarnings.push(`"${field}" ne semble pas en russe`);
              }
            }
            const warningNote = langWarnings.length > 0
              ? `\n\n⚠️ ATTENTION LANGUE : ${langWarnings.join('; ')}. Les etudiants parlent russe.`
              : '';

            result = JSON.stringify({ proposed: true, summary: summary + warningNote });
            break;
          }

          case 'execute_pending': {
            if (pendingExecutedThisTurn) {
              result = JSON.stringify({ already_executed: true, message: 'Action deja executee.' });
              break;
            }
            if (!context.pendingAction) {
              result = JSON.stringify({ error: 'no_pending', message: 'Aucune action en attente.' });
              break;
            }
            if (context.executedActionIds.has(context.pendingAction.id)) {
              result = JSON.stringify({ already_executed: true, message: 'Action deja executee (idempotency).' });
              break;
            }
            pendingExecutedThisTurn = true;
            pendingConsumed = true;
            executedActionId = context.pendingAction.id;
            const execResult = await executePendingAction(context.pendingAction, context);
            actionsPerformed.push(execResult.label);
            result = execResult.result;
            break;
          }

          default:
            result = JSON.stringify({ error: `Unknown tool: ${toolUse.name}` });
        }
      } catch (err) {
        logger.error({ err, tool: toolUse.name }, 'Tsarag agent tool error');
        result = JSON.stringify({ error: 'internal_error', message: 'Erreur lors du traitement' });
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  // Extract text from final response
  const textBlocks = response!.content.filter(
    (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
  );
  const text = textBlocks.map((b) => b.text).join('\n') || 'Erreur de traitement. Reessaie.';

  // Collect turn messages: all assistant/user messages added during the tool-use loop + final text
  const turnMessages: import('../../types/index.js').AdminConversationMessage[] = [];
  for (let i = initialMessageCount; i < messages.length; i++) {
    const msg = messages[i]!;
    turnMessages.push({
      role: msg.role,
      content: msg.content as string | Anthropic.Messages.ContentBlockParam[],
    });
  }
  // Add the final assistant text (or full content if no tool calls happened)
  turnMessages.push({ role: 'assistant', content: response!.content });

  logger.info(
    { iterations, actionsCount: actionsPerformed.length },
    'Tsarag agent response ready'
  );

  return { text, actionsPerformed, proposedAction, pendingConsumed, turnMessages, executedActionId };
}
