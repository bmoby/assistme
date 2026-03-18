import { Type, type Static } from '@sinclair/typebox';
import { getSupabase } from '../client.js';

const TABLE = 'reminders';

// --- Create ---
export const remindersCreateParams = Type.Object({
  message: Type.String({ description: 'Message du rappel' }),
  trigger_at: Type.String({ description: 'Date/heure ISO du rappel (ex: 2026-03-19T10:00:00+07:00)' }),
  repeat: Type.Optional(Type.Union([
    Type.Literal('once'), Type.Literal('daily'), Type.Literal('weekly'), Type.Literal('custom'),
  ])),
  channel: Type.Optional(Type.Union([Type.Literal('telegram'), Type.Literal('discord')])),
});

export async function remindersCreate(params: Static<typeof remindersCreateParams>): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db.from(TABLE).insert({
    message: params.message, trigger_at: params.trigger_at,
    repeat: params.repeat ?? 'once', channel: params.channel ?? 'telegram',
  }).select().single();
  if (error) throw new Error(`Failed to create reminder: ${error.message}`);
  return JSON.stringify({ id: data.id, message: data.message, trigger_at: data.trigger_at });
}

// --- Today ---
export const remindersTodayParams = Type.Object({});

export async function remindersToday(): Promise<string> {
  const db = getSupabase();
  const today = new Date().toISOString().split('T')[0]!;
  const { data, error } = await db.from(TABLE).select()
    .gte('trigger_at', `${today}T00:00:00`).lte('trigger_at', `${today}T23:59:59`)
    .order('trigger_at', { ascending: true });
  if (error) throw new Error(`Failed to get today reminders: ${error.message}`);
  const reminders = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id, message: r.message, trigger_at: r.trigger_at, status: r.status,
  }));
  return JSON.stringify({ date: today, count: reminders.length, reminders });
}

// --- Cancel ---
export const remindersCancelParams = Type.Object({
  id: Type.String({ description: 'ID du rappel a annuler' }),
});

export async function remindersCancel(params: Static<typeof remindersCancelParams>): Promise<string> {
  const db = getSupabase();
  const { error } = await db.from(TABLE).update({ status: 'cancelled' }).eq('id', params.id);
  if (error) throw new Error(`Failed to cancel reminder: ${error.message}`);
  return JSON.stringify({ id: params.id, action: 'cancelled' });
}

// --- Due ---
export const remindersDueParams = Type.Object({});

export async function remindersDue(): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db.from(TABLE).select()
    .eq('status', 'active').lte('trigger_at', new Date().toISOString())
    .order('trigger_at', { ascending: true });
  if (error) throw new Error(`Failed to get due reminders: ${error.message}`);
  const reminders = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id, message: r.message, trigger_at: r.trigger_at,
  }));
  return JSON.stringify({ count: reminders.length, reminders });
}
