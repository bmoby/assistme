import { Client } from 'discord.js';
import {
  getSessionsWithDeadlineIn,
  getActiveStudents,
  getExercisesByStudent,
  logger,
} from '@assistme/core';

/**
 * Send DM reminders to students who haven't submitted before a deadline.
 * Called twice daily: once for 48h window, once for 24h window.
 */
export async function sendDeadlineReminders(client: Client, hoursBeforeDeadline: number): Promise<void> {
  try {
    const sessions = await getSessionsWithDeadlineIn(hoursBeforeDeadline);

    if (sessions.length === 0) return;

    const students = await getActiveStudents();

    for (const session of sessions) {
      for (const student of students) {
        // Check if student already submitted for this session
        const exercises = await getExercisesByStudent(student.id);
        const hasSubmitted = exercises.some((e) => e.session_id === session.id);

        if (hasSubmitted) continue;
        if (!student.discord_id) continue;

        try {
          const user = await client.users.fetch(student.discord_id);
          const isUrgent = hoursBeforeDeadline <= 24;

          const message = isUrgent
            ? `⚠️ **Завтра дедлайн** по Сессии ${session.session_number} «${session.title}»!\nПоследний день. Отправь задание мне в ЛС.`
            : `⏰ Через 2 дня дедлайн по Сессии ${session.session_number} «${session.title}».\nТы ещё не сдал(а). Нужна помощь? Напиши мне.`;

          await user.send(message);

          logger.debug(
            { studentId: student.id, sessionNumber: session.session_number, hours: hoursBeforeDeadline },
            'Deadline reminder sent'
          );
        } catch (err) {
          // User may have DMs disabled
          logger.warn({ err, studentId: student.id }, 'Could not send deadline reminder DM');
        }
      }
    }

    logger.info(
      { sessionsCount: sessions.length, hours: hoursBeforeDeadline },
      'Deadline reminders processed'
    );
  } catch (error) {
    logger.error({ error, hoursBeforeDeadline }, 'Deadline reminders failed');
  }
}
