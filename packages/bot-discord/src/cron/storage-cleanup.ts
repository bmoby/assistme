import { getSupabase, logger } from '@vibe-coder/core';

/**
 * Clean up orphaned files in Supabase Storage.
 * Files uploaded during DM conversations but never attached to a submission
 * (e.g., student uploaded a file but didn't confirm) remain in storage.
 * This cron removes files older than 24h that have no matching submission_attachments record.
 */
export async function cleanupOrphanedFiles(): Promise<void> {
  try {
    const db = getSupabase();

    // Get all attachment records to know which storage paths are valid
    const { data: attachments, error: attachError } = await db
      .from('submission_attachments')
      .select('storage_path')
      .not('storage_path', 'is', null);

    if (attachError) {
      logger.error({ error: attachError }, 'Failed to fetch attachments for cleanup');
      return;
    }

    const validPaths = new Set(
      (attachments ?? []).map((a: { storage_path: string }) => a.storage_path)
    );

    // List all files in the bucket
    const { data: folders, error: listError } = await db.storage
      .from('exercise-submissions')
      .list('', { limit: 100 });

    if (listError) {
      logger.error({ error: listError }, 'Failed to list storage folders');
      return;
    }

    if (!folders || folders.length === 0) return;

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let cleaned = 0;

    // Check each student folder
    for (const folder of folders) {
      if (!folder.id) continue; // skip non-folder items

      const { data: subfolders } = await db.storage
        .from('exercise-submissions')
        .list(folder.name, { limit: 100 });

      if (!subfolders) continue;

      for (const subfolder of subfolders) {
        const subPath = `${folder.name}/${subfolder.name}`;

        const { data: files } = await db.storage
          .from('exercise-submissions')
          .list(subPath, { limit: 100 });

        if (!files) continue;

        for (const file of files) {
          const filePath = `${subPath}/${file.name}`;

          // Skip if file is referenced by a submission
          if (validPaths.has(filePath)) continue;

          // Skip if file is less than 24h old
          const fileDate = file.created_at ? new Date(file.created_at) : null;
          if (fileDate && fileDate > cutoff) continue;

          // Delete orphaned file
          const { error: deleteError } = await db.storage
            .from('exercise-submissions')
            .remove([filePath]);

          if (!deleteError) {
            cleaned++;
          } else {
            logger.warn({ error: deleteError, filePath }, 'Failed to delete orphaned file');
          }
        }
      }
    }

    if (cleaned > 0) {
      logger.info({ cleaned }, 'Orphaned files cleaned from storage');
    }
  } catch (error) {
    logger.error({ error }, 'Storage cleanup failed');
  }
}
