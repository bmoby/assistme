import { Type, type Static } from '@sinclair/typebox';
import { getSupabase } from '../client.js';

const TABLE = 'clients';

const ClientStatusSchema = Type.Union([
  Type.Literal('lead'), Type.Literal('qualified'), Type.Literal('proposal_sent'),
  Type.Literal('accepted'), Type.Literal('in_progress'), Type.Literal('delivered'), Type.Literal('paid'),
]);

// --- Create ---
export const clientsCreateParams = Type.Object({
  name: Type.String({ description: 'Nom du client' }),
  phone: Type.Optional(Type.String()),
  source: Type.Optional(Type.String({ description: 'Source: instagram, tiktok, whatsapp, referral...' })),
  business_type: Type.Optional(Type.String({ description: 'Type de business du client' })),
  need: Type.Optional(Type.String({ description: 'Besoin exprime' })),
  budget_range: Type.Optional(Type.String({ description: 'Fourchette budget' })),
  notes: Type.Optional(Type.String()),
});

export async function clientsCreate(params: Static<typeof clientsCreateParams>): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db.from(TABLE).insert({
    name: params.name, phone: params.phone ?? null, source: params.source ?? 'conversation',
    business_type: params.business_type ?? null, need: params.need ?? null,
    budget_range: params.budget_range ?? null, status: 'lead', notes: params.notes ?? null,
  }).select().single();
  if (error) throw new Error(`Failed to create client: ${error.message}`);
  return JSON.stringify({ id: data.id, name: data.name, status: 'lead' });
}

// --- Pipeline ---
export const clientsPipelineParams = Type.Object({
  status: Type.Optional(ClientStatusSchema),
});

export async function clientsPipeline(params: Static<typeof clientsPipelineParams>): Promise<string> {
  const db = getSupabase();
  let query = db.from(TABLE).select().order('created_at', { ascending: false });
  if (params.status) query = query.eq('status', params.status);
  else query = query.neq('status', 'paid');
  const { data, error } = await query;
  if (error) throw new Error(`Failed to get pipeline: ${error.message}`);
  const clients = (data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id, name: c.name, status: c.status, need: c.need, budget_range: c.budget_range, source: c.source,
  }));
  return JSON.stringify({ count: clients.length, clients });
}

// --- Update Status ---
export const clientsUpdateStatusParams = Type.Object({
  id: Type.String({ description: 'ID du client' }),
  status: ClientStatusSchema,
});

export async function clientsUpdateStatus(params: Static<typeof clientsUpdateStatusParams>): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db.from(TABLE)
    .update({ status: params.status, updated_at: new Date().toISOString() })
    .eq('id', params.id).select().single();
  if (error) throw new Error(`Failed to update client status: ${error.message}`);
  return JSON.stringify({ id: data.id, name: data.name, status: data.status });
}

// --- Update ---
export const clientsUpdateParams = Type.Object({
  id: Type.String({ description: 'ID du client' }),
  name: Type.Optional(Type.String()),
  need: Type.Optional(Type.String()),
  budget_range: Type.Optional(Type.String()),
  business_type: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
  assigned_to: Type.Optional(Type.String()),
});

export async function clientsUpdate(params: Static<typeof clientsUpdateParams>): Promise<string> {
  const { id, ...updates } = params;
  const db = getSupabase();
  const { data, error } = await db.from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw new Error(`Failed to update client: ${error.message}`);
  return JSON.stringify({ id: data.id, name: data.name, updated: Object.keys(updates) });
}
