import { closeExpiredQuizSessions, logger } from '@assistme/core';

export async function closeExpiredQuizzes(): Promise<void> {
  const result = await closeExpiredQuizSessions();
  if (result.closedQuizzes > 0 || result.expiredSessions > 0) {
    logger.info(
      { closedQuizzes: result.closedQuizzes, expiredSessions: result.expiredSessions },
      'Expired quiz sessions closed by cron'
    );
  }
}
