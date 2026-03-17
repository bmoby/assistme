import { getActiveStudents, getExercisesByStudent, createFormationEvent } from '@assistme/core';
import { logger } from '@assistme/core';

const INACTIVITY_THRESHOLD_DAYS = 7;

export async function detectDropouts(): Promise<void> {
  try {
    const students = await getActiveStudents();
    const now = Date.now();

    for (const student of students) {
      const exercises = await getExercisesByStudent(student.id);

      // Check last exercise submission
      const lastSubmission = exercises.length > 0
        ? Math.max(...exercises.map((e) => new Date(e.submitted_at).getTime()))
        : student.enrolled_at ? new Date(student.enrolled_at).getTime() : new Date(student.created_at).getTime();

      const daysSinceLastActivity = Math.floor((now - lastSubmission) / (1000 * 60 * 60 * 24));

      if (daysSinceLastActivity >= INACTIVITY_THRESHOLD_DAYS) {
        const indicators = {
          days_inactive: daysSinceLastActivity,
          total_exercises: exercises.length,
          last_submission: exercises.length > 0
            ? new Date(lastSubmission).toISOString().split('T')[0]
            : 'aucune',
        };

        await createFormationEvent({
          type: 'student_alert',
          source: 'discord',
          target: 'telegram-admin',
          data: {
            alert_type: 'dropout_risk',
            student_name: student.name,
            student_id: student.id,
            ...indicators,
          },
        });

        logger.warn(
          { studentName: student.name, ...indicators },
          'Dropout risk detected'
        );
      }
    }
  } catch (error) {
    logger.error({ error }, 'Dropout detection failed');
  }
}
