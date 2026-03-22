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

export async function getSignedUrl(storagePath: string, expiresIn = 604800): Promise<string> {
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

export async function deleteAttachmentsByExercise(exerciseId: string): Promise<string[]> {
  const db = getSupabase();

  // Get storage paths before deleting
  const attachments = await getAttachmentsByExercise(exerciseId);
  const storagePaths = attachments
    .filter((a) => a.storage_path)
    .map((a) => a.storage_path as string);

  // Delete attachment records
  const { error } = await db
    .from(TABLE)
    .delete()
    .eq('exercise_id', exerciseId);

  if (error) {
    logger.error({ error, exerciseId }, 'Failed to delete attachments by exercise');
    throw error;
  }

  return storagePaths;
}

export async function getSignedUrlsForExercise(exerciseId: string): Promise<Array<{
  attachment: SubmissionAttachment;
  signedUrl: string | null;
}>> {
  const attachments = await getAttachmentsByExercise(exerciseId);

  const results = await Promise.all(
    attachments.map(async (attachment) => {
      let signedUrl: string | null = null;
      if (attachment.storage_path) {
        try {
          signedUrl = await getSignedUrl(attachment.storage_path);
        } catch {
          logger.warn({ storagePath: attachment.storage_path }, 'Failed to generate signed URL');
        }
      }
      return { attachment, signedUrl };
    })
  );

  return results;
}

export async function deleteStorageFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  const db = getSupabase();
  const { error } = await db.storage
    .from('exercise-submissions')
    .remove(paths);

  if (error) {
    logger.warn({ error, paths }, 'Failed to delete storage files (will be cleaned by cron)');
  }
}
