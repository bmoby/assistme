import { Type, type Static } from '@sinclair/typebox';
import { getSupabase } from '../client.js';

const TABLE = 'daily_plans';

// --- Get Today ---
export const plannerGetTodayParams = Type.Object({});

export async function plannerGetToday(): Promise<string> {
  const db = getSupabase();
  const today = new Date().toISOString().split('T')[0]!;
  const { data, error } = await db.from(TABLE).select().eq('date', today).single();
  if (error) {
    if (error.code === 'PGRST116') return JSON.stringify({ date: today, plan: null, message: 'Pas de plan pour aujourd\'hui' });
    throw new Error(`Failed to get daily plan: ${error.message}`);
  }
  return JSON.stringify({ date: today, plan: data.plan, status: data.status, productivity_score: data.productivity_score });
}

// --- Get Productivity Trend ---
export const plannerTrendParams = Type.Object({
  days: Type.Optional(Type.Number({ description: 'Nombre de jours a analyser', default: 7 })),
});

export async function plannerTrend(params: Static<typeof plannerTrendParams>): Promise<string> {
  const db = getSupabase();
  const days = params.days ?? 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
  const { data, error } = await db.from(TABLE).select('date,status,productivity_score')
    .gte('date', since).order('date', { ascending: true });
  if (error) throw new Error(`Failed to get productivity trend: ${error.message}`);
  const plans = (data ?? []).map((p: Record<string, unknown>) => ({
    date: p.date, status: p.status, score: p.productivity_score,
  }));
  const scores = plans.filter((p: { score: unknown }) => p.score != null).map((p: { score: unknown }) => p.score as number);
  const avg = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null;
  return JSON.stringify({ days, plans, average_score: avg });
}
