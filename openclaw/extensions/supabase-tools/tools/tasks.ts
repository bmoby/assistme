import { Type, type Static } from '@sinclair/typebox';
import { getSupabase } from '../client.js';

const TABLE = 'tasks';

// --- Schemas ---

const TaskCategorySchema = Type.Union([
  Type.Literal('client'),
  Type.Literal('student'),
  Type.Literal('content'),
  Type.Literal('personal'),
  Type.Literal('dev'),
  Type.Literal('team'),
]);

const TaskPrioritySchema = Type.Union([
  Type.Literal('urgent'),
  Type.Literal('important'),
  Type.Literal('normal'),
  Type.Literal('low'),
]);

// --- Tool definitions ---

export const tasksCreateParams = Type.Object({
  title: Type.String({ description: 'Titre de la tache' }),
  description: Type.Optional(Type.String({ description: 'Description detaillee' })),
  category: Type.Optional(TaskCategorySchema),
  priority: Type.Optional(TaskPrioritySchema),
  due_date: Type.Optional(Type.String({ description: 'Date limite YYYY-MM-DD' })),
  due_time: Type.Optional(Type.String({ description: 'Heure limite HH:MM' })),
  estimated_minutes: Type.Optional(Type.Number({ description: 'Estimation en minutes' })),
});

export async function tasksCreate(params: Static<typeof tasksCreateParams>): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .insert({
      title: params.title,
      description: params.description ?? null,
      category: params.category ?? 'personal',
      priority: params.priority ?? 'normal',
      status: 'todo',
      due_date: params.due_date ?? null,
      due_time: params.due_time ?? null,
      estimated_minutes: params.estimated_minutes ?? null,
      source: 'openclaw',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return JSON.stringify({ id: data.id, title: data.title, category: data.category, priority: data.priority });
}

export const tasksCompleteParams = Type.Object({
  id: Type.String({ description: 'ID de la tache a completer' }),
});

export async function tasksComplete(params: Static<typeof tasksCompleteParams>): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .update({ status: 'done', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) throw new Error(`Failed to complete task: ${error.message}`);
  return JSON.stringify({ id: data.id, title: data.title, status: 'done' });
}

export const tasksListActiveParams = Type.Object({
  category: Type.Optional(TaskCategorySchema),
  limit: Type.Optional(Type.Number({ description: 'Nombre max de taches', default: 20 })),
});

export async function tasksListActive(params: Static<typeof tasksListActiveParams>): Promise<string> {
  const db = getSupabase();
  let query = db
    .from(TABLE)
    .select()
    .neq('status', 'done')
    .neq('status', 'cancelled')
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(params.limit ?? 20);

  if (params.category) {
    query = query.eq('category', params.category);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list tasks: ${error.message}`);

  const tasks = (data ?? []).map((t: Record<string, unknown>) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    priority: t.priority,
    status: t.status,
    due_date: t.due_date,
  }));

  return JSON.stringify({ count: tasks.length, tasks });
}

export const tasksGetByCategoryParams = Type.Object({
  category: TaskCategorySchema,
});

export async function tasksGetByCategory(params: Static<typeof tasksGetByCategoryParams>): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('category', params.category)
    .neq('status', 'done')
    .neq('status', 'cancelled')
    .order('priority', { ascending: true });

  if (error) throw new Error(`Failed to get tasks by category: ${error.message}`);

  const tasks = (data ?? []).map((t: Record<string, unknown>) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    due_date: t.due_date,
  }));

  return JSON.stringify({ category: params.category, count: tasks.length, tasks });
}

export const tasksUpdateParams = Type.Object({
  id: Type.String({ description: 'ID de la tache' }),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  category: Type.Optional(TaskCategorySchema),
  priority: Type.Optional(TaskPrioritySchema),
  status: Type.Optional(Type.String()),
  due_date: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
});

export async function tasksUpdate(params: Static<typeof tasksUpdateParams>): Promise<string> {
  const { id, ...updates } = params;
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update task: ${error.message}`);
  return JSON.stringify({ id: data.id, title: data.title, updated: Object.keys(updates) });
}

export const tasksDeleteParams = Type.Object({
  id: Type.String({ description: 'ID de la tache a supprimer' }),
});

export async function tasksDelete(params: Static<typeof tasksDeleteParams>): Promise<string> {
  const db = getSupabase();
  const { error } = await db.from(TABLE).delete().eq('id', params.id);
  if (error) throw new Error(`Failed to delete task: ${error.message}`);
  return JSON.stringify({ deleted: params.id });
}

export const tasksNextPriorityParams = Type.Object({});

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  important: 1,
  normal: 2,
  low: 3,
};

export async function tasksNextPriority(): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .neq('status', 'done')
    .neq('status', 'cancelled')
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw new Error(`Failed to get next task: ${error.message}`);
  if (!data || data.length === 0) return JSON.stringify({ task: null, message: 'Aucune tache active' });

  const sorted = data.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const pa = PRIORITY_ORDER[a.priority as string] ?? 2;
    const pb = PRIORITY_ORDER[b.priority as string] ?? 2;
    if (pa !== pb) return pa - pb;
    if (a.due_date && b.due_date) return (a.due_date as string).localeCompare(b.due_date as string);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  const next = sorted[0]!;
  return JSON.stringify({
    task: {
      id: next.id,
      title: next.title,
      category: next.category,
      priority: next.priority,
      due_date: next.due_date,
      estimated_minutes: next.estimated_minutes,
    },
  });
}
