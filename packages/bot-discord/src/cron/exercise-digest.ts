import { getExerciseSummary, getPendingExercises, createFormationEvent } from '@assistme/core';
import { logger } from '@assistme/core';

export async function sendExerciseDigest(): Promise<void> {
  try {
    const summary = await getExerciseSummary();
    const pending = await getPendingExercises();

    if (pending.length === 0) {
      logger.info('No pending exercises for digest');
      return;
    }

    await createFormationEvent({
      type: 'daily_exercise_digest',
      source: 'discord',
      target: 'telegram-admin',
      data: {
        total: summary.total,
        pending: summary.pending,
        approved: summary.approved,
        revision_needed: summary.revision_needed,
        pending_details: pending.map((e) => ({
          module: e.module,
          exercise_number: e.exercise_number,
          status: e.status,
          submitted_at: e.submitted_at,
        })),
      },
    });

    logger.info({ pending: summary.pending }, 'Exercise digest event created');
  } catch (error) {
    logger.error({ error }, 'Failed to create exercise digest');
  }
}
