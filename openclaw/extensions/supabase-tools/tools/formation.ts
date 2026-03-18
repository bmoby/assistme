import { Type, type Static } from '@sinclair/typebox';
import { getSupabase } from '../client.js';

// === STUDENTS ===

const StudentStatusSchema = Type.Union([
  Type.Literal('interested'), Type.Literal('registered'), Type.Literal('paid'),
  Type.Literal('active'), Type.Literal('completed'), Type.Literal('dropped'),
]);

export const studentsListParams = Type.Object({
  status: Type.Optional(StudentStatusSchema),
  session: Type.Optional(Type.Number({ description: 'Numero de session (1, 2...)' })),
});

export async function studentsList(params: Static<typeof studentsListParams>): Promise<string> {
  const db = getSupabase();
  let query = db.from('students').select().order('name', { ascending: true });
  if (params.status) query = query.eq('status', params.status);
  if (params.session) query = query.eq('session', params.session);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to list students: ${error.message}`);
  const students = (data ?? []).map((s: Record<string, unknown>) => ({
    id: s.id, name: s.name, status: s.status, session: s.session,
    payment_status: s.payment_status, pod_id: s.pod_id, discord_id: s.discord_id,
  }));
  return JSON.stringify({ count: students.length, students });
}

export const studentsCreateParams = Type.Object({
  name: Type.String({ description: 'Nom de l\'etudiant' }),
  phone: Type.Optional(Type.String()),
  email: Type.Optional(Type.String()),
  discord_id: Type.Optional(Type.String()),
  telegram_id: Type.Optional(Type.String()),
  session: Type.Optional(Type.Number({ description: 'Numero de session', default: 2 })),
  notes: Type.Optional(Type.String()),
});

export async function studentsCreate(params: Static<typeof studentsCreateParams>): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db.from('students').insert({
    name: params.name, phone: params.phone ?? null, email: params.email ?? null,
    discord_id: params.discord_id ?? null, telegram_id: params.telegram_id ?? null,
    session: params.session ?? 2, status: 'interested', payment_status: 'pending',
    notes: params.notes ?? null,
  }).select().single();
  if (error) throw new Error(`Failed to create student: ${error.message}`);
  return JSON.stringify({ id: data.id, name: data.name, session: data.session });
}

export const studentsUpdateParams = Type.Object({
  id: Type.String({ description: 'ID de l\'etudiant' }),
  name: Type.Optional(Type.String()),
  status: Type.Optional(StudentStatusSchema),
  payment_status: Type.Optional(Type.Union([
    Type.Literal('pending'), Type.Literal('partial'), Type.Literal('paid'),
  ])),
  pod_id: Type.Optional(Type.Number()),
  discord_id: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
});

export async function studentsUpdate(params: Static<typeof studentsUpdateParams>): Promise<string> {
  const { id, ...updates } = params;
  const db = getSupabase();
  const { data, error } = await db.from('students')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw new Error(`Failed to update student: ${error.message}`);
  return JSON.stringify({ id: data.id, name: data.name, updated: Object.keys(updates) });
}

// === EXERCISES ===

export const exercisesListParams = Type.Object({
  student_id: Type.Optional(Type.String({ description: 'ID etudiant' })),
  status: Type.Optional(Type.Union([
    Type.Literal('submitted'), Type.Literal('ai_reviewed'), Type.Literal('reviewed'),
    Type.Literal('approved'), Type.Literal('revision_needed'),
  ])),
  module: Type.Optional(Type.Number({ description: 'Numero de module' })),
});

export async function exercisesList(params: Static<typeof exercisesListParams>): Promise<string> {
  const db = getSupabase();
  let query = db.from('student_exercises').select().order('submitted_at', { ascending: false });
  if (params.student_id) query = query.eq('student_id', params.student_id);
  if (params.status) query = query.eq('status', params.status);
  if (params.module) query = query.eq('module', params.module);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to list exercises: ${error.message}`);
  const exercises = (data ?? []).map((e: Record<string, unknown>) => ({
    id: e.id, student_id: e.student_id, module: e.module, exercise_number: e.exercise_number,
    status: e.status, submitted_at: e.submitted_at, feedback: e.feedback,
  }));
  return JSON.stringify({ count: exercises.length, exercises });
}

export const exercisesPendingParams = Type.Object({});

export async function exercisesPending(): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db.from('student_exercises').select()
    .in('status', ['submitted', 'ai_reviewed']).order('submitted_at', { ascending: true });
  if (error) throw new Error(`Failed to get pending exercises: ${error.message}`);
  const exercises = (data ?? []).map((e: Record<string, unknown>) => ({
    id: e.id, student_id: e.student_id, module: e.module, exercise_number: e.exercise_number,
    status: e.status, submitted_at: e.submitted_at,
  }));
  return JSON.stringify({ count: exercises.length, exercises });
}

export const exercisesReviewParams = Type.Object({
  id: Type.String({ description: 'ID de l\'exercice' }),
  status: Type.Union([Type.Literal('approved'), Type.Literal('revision_needed')]),
  feedback: Type.Optional(Type.String({ description: 'Feedback pour l\'etudiant' })),
});

export async function exercisesReview(params: Static<typeof exercisesReviewParams>): Promise<string> {
  const db = getSupabase();
  const updates: Record<string, unknown> = {
    status: params.status, reviewed_at: new Date().toISOString(),
  };
  if (params.feedback) updates.feedback = params.feedback;
  const { data, error } = await db.from('student_exercises')
    .update(updates).eq('id', params.id).select().single();
  if (error) throw new Error(`Failed to review exercise: ${error.message}`);
  return JSON.stringify({ id: data.id, status: data.status, action: 'reviewed' });
}

// === SESSIONS ===

export const sessionsListParams = Type.Object({});

export async function sessionsList(): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db.from('sessions').select()
    .order('session_number', { ascending: true });
  if (error) throw new Error(`Failed to list sessions: ${error.message}`);
  const sessions = (data ?? []).map((s: Record<string, unknown>) => ({
    id: s.id, session_number: s.session_number, module: s.module,
    title: s.title, status: s.status, deadline: s.deadline,
  }));
  return JSON.stringify({ count: sessions.length, sessions });
}

// === FAQ ===

export const faqSearchParams = Type.Object({
  query: Type.String({ description: 'Texte de recherche dans la FAQ' }),
});

export async function faqSearch(params: Static<typeof faqSearchParams>): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db.from('faq_entries').select()
    .or(`question.ilike.%${params.query}%,answer.ilike.%${params.query}%`)
    .order('times_used', { ascending: false });
  if (error) throw new Error(`Failed to search FAQ: ${error.message}`);
  const entries = (data ?? []).map((f: Record<string, unknown>) => ({
    id: f.id, question: f.question, answer: f.answer, category: f.category,
  }));
  return JSON.stringify({ query: params.query, count: entries.length, entries });
}

export const faqCreateParams = Type.Object({
  question: Type.String({ description: 'Question' }),
  answer: Type.String({ description: 'Reponse' }),
  category: Type.Optional(Type.String({ description: 'Categorie', default: 'general' })),
});

export async function faqCreate(params: Static<typeof faqCreateParams>): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db.from('faq_entries').insert({
    question: params.question, answer: params.answer,
    category: params.category ?? 'general', created_by: 'openclaw',
  }).select().single();
  if (error) throw new Error(`Failed to create FAQ: ${error.message}`);
  return JSON.stringify({ id: data.id, question: data.question, action: 'created' });
}
