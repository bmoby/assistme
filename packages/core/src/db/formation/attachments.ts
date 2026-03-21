import { getSupabase } from '../client.js';
import type { SubmissionAttachment, AttachmentType } from '../../types/index.js';
import { logger } from '../../logger.js';

const TABLE = 'submission_attachments';

export async function addAttachment(params: {
  exercise_id: string;
  type: AttachmentType;
  url?: string;
  storage_path?: string;
  original_filename?: string;
  mime_type?: string;
  file_size?: number;
  text_content?: string;
}): Promise<SubmissionAttachment> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .insert({
      exercise_id: params.exercise_id,
      type: params.type,
      url: params.url ?? null,
      storage_path: params.storage_path ?? null,
      original_filename: params.original_filename ?? null,
      mime_type: params.mime_type ?? null,
      file_size: params.file_size ?? null,
      text_content: params.text_content ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error, exercise_id: params.exercise_id }, 'Failed to add attachment');
    throw error;
  }

  return data as SubmissionAttachment;
}

export async function getAttachmentsByExercise(exerciseId: string): Promise<SubmissionAttachment[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('exercise_id', exerciseId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error({ error, exerciseId }, 'Failed to get attachments');
    throw error;
  }

  return (data ?? []) as SubmissionAttachment[];
}

export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db.storage
    .from('exercise-submissions')
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    logger.error({ error, storagePath }, 'Failed to create signed URL');
    throw error;
  }

  return data.signedUrl;
}

export async function deleteAttachment(id: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from(TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    logger.error({ error, id }, 'Failed to delete attachment');
    throw error;
  }
}
