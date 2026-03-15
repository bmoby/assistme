import { getSupabase } from '../client.js';
import type { Student, NewStudent, StudentStatus } from '../../types/index.js';
import { logger } from '../../logger.js';

const TABLE = 'students';

export async function createStudent(student: Partial<NewStudent> & { name: string }): Promise<Student> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .insert({
      name: student.name,
      phone: student.phone ?? null,
      email: student.email ?? null,
      telegram_id: student.telegram_id ?? null,
      discord_id: student.discord_id ?? null,
      session: student.session ?? 2,
      status: student.status ?? 'interested',
      payment_status: student.payment_status ?? 'pending',
      payment_amount: student.payment_amount ?? null,
      payment_method: student.payment_method ?? null,
      payment_details: student.payment_details ?? null,
      pod_id: student.pod_id ?? null,
      mentor_id: student.mentor_id ?? null,
      enrolled_at: student.enrolled_at ?? null,
      notes: student.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error }, 'Failed to create student');
    throw error;
  }
  return data as Student;
}

export async function getStudent(id: string): Promise<Student | null> {
  const db = getSupabase();
  const { data, error } = await db.from(TABLE).select().eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error({ error, id }, 'Failed to get student');
    throw error;
  }
  return data as Student;
}

export async function getStudentByDiscordId(discordId: string): Promise<Student | null> {
  const db = getSupabase();
  const { data, error } = await db.from(TABLE).select().eq('discord_id', discordId).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error({ error, discordId }, 'Failed to get student by Discord ID');
    throw error;
  }
  return data as Student;
}

export async function updateStudent(id: string, updates: Partial<Omit<Student, 'id' | 'created_at'>>): Promise<Student> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error({ error, id }, 'Failed to update student');
    throw error;
  }
  return data as Student;
}

export async function getStudentsBySession(session: number): Promise<Student[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('session', session)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ error, session }, 'Failed to get students by session');
    throw error;
  }
  return (data ?? []) as Student[];
}

export async function getStudentsByStatus(status: StudentStatus): Promise<Student[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ error, status }, 'Failed to get students by status');
    throw error;
  }
  return (data ?? []) as Student[];
}

export async function getStudentsByPod(podId: number): Promise<Student[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('pod_id', podId)
    .order('name', { ascending: true });

  if (error) {
    logger.error({ error, podId }, 'Failed to get students by pod');
    throw error;
  }
  return (data ?? []) as Student[];
}

export async function getActiveStudents(): Promise<Student[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .in('status', ['paid', 'active'])
    .order('name', { ascending: true });

  if (error) {
    logger.error({ error }, 'Failed to get active students');
    throw error;
  }
  return (data ?? []) as Student[];
}

export async function linkDiscordId(studentId: string, discordId: string): Promise<Student> {
  return updateStudent(studentId, { discord_id: discordId });
}

export async function searchStudentByName(name: string): Promise<Student[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .ilike('name', `%${name}%`)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ error, name }, 'Failed to search student');
    throw error;
  }
  return (data ?? []) as Student[];
}
