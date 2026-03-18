// Tasks
import {
  tasksCreateParams, tasksCreate, tasksCompleteParams, tasksComplete,
  tasksListActiveParams, tasksListActive, tasksGetByCategoryParams, tasksGetByCategory,
  tasksUpdateParams, tasksUpdate, tasksDeleteParams, tasksDelete,
  tasksNextPriorityParams, tasksNextPriority,
} from './tools/tasks.js';

// Clients
import {
  clientsCreateParams, clientsCreate, clientsPipelineParams, clientsPipeline,
  clientsUpdateStatusParams, clientsUpdateStatus, clientsUpdateParams, clientsUpdate,
} from './tools/clients.js';

// Memory & Knowledge
import {
  memoryGetAllParams, memoryGetAll, memoryUpsertParams, memoryUpsert,
  memoryDeleteParams, memoryDelete, memorySearchParams, memorySearch,
  knowledgeGetAllParams, knowledgeGetAll, knowledgeUpsertParams, knowledgeUpsert,
  knowledgeDeleteParams, knowledgeDelete,
} from './tools/memory.js';

// Reminders
import {
  remindersCreateParams, remindersCreate, remindersTodayParams, remindersToday,
  remindersCancelParams, remindersCancel, remindersDueParams, remindersDue,
} from './tools/reminders.js';

// Planner
import {
  plannerGetTodayParams, plannerGetToday, plannerTrendParams, plannerTrend,
} from './tools/planner.js';

// Formation
import {
  studentsListParams, studentsList, studentsCreateParams, studentsCreate,
  studentsUpdateParams, studentsUpdate,
  exercisesListParams, exercisesList, exercisesPendingParams, exercisesPending,
  exercisesReviewParams, exercisesReview,
  sessionsListParams, sessionsList,
  faqSearchParams, faqSearch, faqCreateParams, faqCreate,
} from './tools/formation.js';

function jsonResult(data: unknown) {
  return { type: 'text' as const, text: JSON.stringify(data, null, 2) };
}

function parseAndWrap(fn: (...args: unknown[]) => Promise<string>) {
  return async (...args: unknown[]) => {
    const result = await fn(...args);
    return jsonResult(JSON.parse(result));
  };
}

function tool(name: string, label: string, description: string, parameters: unknown, fn: (...args: unknown[]) => Promise<string>) {
  const wrapped = parseAndWrap(fn);
  return {
    name, label, description, parameters,
    async execute(_toolCallId: unknown, rawParams: unknown) { return wrapped(rawParams); },
  };
}

export default {
  id: 'supabase-tools',
  name: 'Supabase Tools',
  description: 'Custom tools for Supabase database operations (tasks, clients, memory, reminders, planner)',
  configSchema: { type: 'object', additionalProperties: false, properties: {} },

  register(api: { registerTool: (t: unknown) => void }) {
    // === TASKS (7) ===
    api.registerTool(tool('tasks_create', 'Create Task',
      'Cree une tache avec titre, categorie (client|student|content|personal|dev|team), priorite (urgent|important|normal|low)',
      tasksCreateParams, tasksCreate));
    api.registerTool(tool('tasks_complete', 'Complete Task',
      'Marque une tache comme terminee par son ID', tasksCompleteParams, tasksComplete));
    api.registerTool(tool('tasks_list_active', 'List Active Tasks',
      'Liste les taches actives, filtrable par categorie', tasksListActiveParams, tasksListActive));
    api.registerTool(tool('tasks_get_by_category', 'Tasks by Category',
      'Taches actives par categorie', tasksGetByCategoryParams, tasksGetByCategory));
    api.registerTool(tool('tasks_update', 'Update Task',
      "Met a jour une tache par son ID", tasksUpdateParams, tasksUpdate));
    api.registerTool(tool('tasks_delete', 'Delete Task',
      'Supprime une tache par son ID', tasksDeleteParams, tasksDelete));
    api.registerTool({
      name: 'tasks_next_priority', label: 'Next Priority Task',
      description: 'Prochaine tache prioritaire (urgent > important > normal > low, puis deadline)',
      parameters: tasksNextPriorityParams,
      async execute() { return jsonResult(JSON.parse(await tasksNextPriority())); },
    });

    // === CLIENTS (4) ===
    api.registerTool(tool('clients_create', 'Create Client',
      'Cree un lead avec nom, besoin, budget, source', clientsCreateParams, clientsCreate));
    api.registerTool(tool('clients_pipeline', 'Client Pipeline',
      'Affiche le pipeline clients, filtrable par statut', clientsPipelineParams, clientsPipeline));
    api.registerTool(tool('clients_update_status', 'Update Client Status',
      'Change le statut d\'un client (lead → qualified → proposal_sent → accepted → in_progress → delivered → paid)',
      clientsUpdateStatusParams, clientsUpdateStatus));
    api.registerTool(tool('clients_update', 'Update Client',
      'Met a jour les infos d\'un client', clientsUpdateParams, clientsUpdate));

    // === MEMORY (4) ===
    api.registerTool(tool('memory_get_all', 'Get Memory',
      'Charge la memoire personnelle, filtrable par tier (core|working|archival)', memoryGetAllParams, memoryGetAll));
    api.registerTool(tool('memory_upsert', 'Upsert Memory',
      'Cree ou modifie une entree memoire (category: identity|situation|preference|relationship|lesson)',
      memoryUpsertParams, memoryUpsert));
    api.registerTool(tool('memory_delete', 'Delete Memory',
      'Supprime une entree memoire', memoryDeleteParams, memoryDelete));
    api.registerTool(tool('memory_search_text', 'Search Memory',
      'Recherche dans la memoire par texte', memorySearchParams, memorySearch));

    // === PUBLIC KNOWLEDGE (3) ===
    api.registerTool(tool('knowledge_get_all', 'Get Knowledge',
      'Lit la base de connaissances publique, filtrable par categorie (formation|services|faq|free_courses|general)',
      knowledgeGetAllParams, knowledgeGetAll));
    api.registerTool(tool('knowledge_upsert', 'Upsert Knowledge',
      'Cree ou modifie une entree dans la base publique', knowledgeUpsertParams, knowledgeUpsert));
    api.registerTool(tool('knowledge_delete', 'Delete Knowledge',
      'Supprime une entree de la base publique', knowledgeDeleteParams, knowledgeDelete));

    // === REMINDERS (4) ===
    api.registerTool(tool('reminders_create', 'Create Reminder',
      'Cree un rappel a une date/heure precise (once|daily|weekly)', remindersCreateParams, remindersCreate));
    api.registerTool({
      name: 'reminders_today', label: 'Today Reminders',
      description: 'Liste les rappels du jour', parameters: remindersTodayParams,
      async execute() { return jsonResult(JSON.parse(await remindersToday())); },
    });
    api.registerTool(tool('reminders_cancel', 'Cancel Reminder',
      'Annule un rappel par son ID', remindersCancelParams, remindersCancel));
    api.registerTool({
      name: 'reminders_due', label: 'Due Reminders',
      description: 'Liste les rappels en retard (trigger_at depasse)', parameters: remindersDueParams,
      async execute() { return jsonResult(JSON.parse(await remindersDue())); },
    });

    // === PLANNER (2) ===
    api.registerTool({
      name: 'planner_get_today', label: 'Today Plan',
      description: 'Recupere le plan du jour', parameters: plannerGetTodayParams,
      async execute() { return jsonResult(JSON.parse(await plannerGetToday())); },
    });
    api.registerTool(tool('planner_trend', 'Productivity Trend',
      'Tendance de productivite sur N jours', plannerTrendParams, plannerTrend));

    // === FORMATION — STUDENTS (3) ===
    api.registerTool(tool('formation_students_list', 'List Students',
      'Liste les etudiants, filtrable par statut et session', studentsListParams, studentsList));
    api.registerTool(tool('formation_students_create', 'Create Student',
      'Ajoute un etudiant a la formation', studentsCreateParams, studentsCreate));
    api.registerTool(tool('formation_students_update', 'Update Student',
      "Met a jour un etudiant (statut, paiement, pod, discord...)", studentsUpdateParams, studentsUpdate));

    // === FORMATION — EXERCISES (3) ===
    api.registerTool(tool('formation_exercises_list', 'List Exercises',
      'Liste les exercices, filtrable par etudiant/statut/module', exercisesListParams, exercisesList));
    api.registerTool({
      name: 'formation_exercises_pending', label: 'Pending Exercises',
      description: 'Exercices en attente de review (submitted + ai_reviewed)',
      parameters: exercisesPendingParams,
      async execute() { return jsonResult(JSON.parse(await exercisesPending())); },
    });
    api.registerTool(tool('formation_exercises_review', 'Review Exercise',
      'Review un exercice (approved ou revision_needed + feedback)', exercisesReviewParams, exercisesReview));

    // === FORMATION — SESSIONS (1) ===
    api.registerTool({
      name: 'formation_sessions_list', label: 'List Sessions',
      description: 'Liste toutes les sessions de formation',
      parameters: sessionsListParams,
      async execute() { return jsonResult(JSON.parse(await sessionsList())); },
    });

    // === FORMATION — FAQ (2) ===
    api.registerTool(tool('formation_faq_search', 'Search FAQ',
      'Recherche dans la FAQ par texte', faqSearchParams, faqSearch));
    api.registerTool(tool('formation_faq_create', 'Create FAQ',
      'Ajoute une entree FAQ (question + reponse)', faqCreateParams, faqCreate));
  },
};
