import { Client, TextChannel } from 'discord.js';
import {
  logger,
  getPendingExercises,
  getStudentsBySession,
  getExercisesByStudent,
  getAllSessions,
} from '@assistme/core';
import { CHANNELS } from '../config.js';

export async function sendAdminDigest(client: Client, guildId: string): Promise<void> {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      logger.warn({ guildId }, 'Guild not found for admin digest');
      return;
    }

    const adminChannel = guild.channels.cache.find(
      (ch) => ch.name === CHANNELS.admin && ch instanceof TextChannel
    ) as TextChannel | undefined;

    if (!adminChannel) {
      logger.warn('Admin channel not found for digest');
      return;
    }

    const now = new Date();
    const parts: string[] = [];

    // 1. Pending exercises (urgent if > 48h)
    const pending = await getPendingExercises();
    const students = await getStudentsBySession(2);
    const studentMap = new Map(students.map((s) => [s.id, s]));

    if (pending.length > 0) {
      const exerciseLines: string[] = [];
      for (const ex of pending) {
        const student = studentMap.get(ex.student_id);
        const submittedAt = new Date(ex.submitted_at);
        const hoursAgo = Math.round((now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60));
        const urgent = hoursAgo > 48 ? ' \u26a0\ufe0f' : '';
        exerciseLines.push(
          `  \u2022 ${student?.name ?? 'Inconnu'} — M${ex.module}-З${ex.exercise_number} (${hoursAgo}h)${urgent}`
        );
      }
      parts.push(`\ud83d\udcdd **Exercices en attente (${pending.length}):**\n${exerciseLines.join('\n')}`);
    }

    // 2. Deadlines in next 48h + students who haven't submitted
    const sessions = await getAllSessions();
    const upcomingDeadlines = sessions.filter((s) => {
      if (!s.deadline || s.status !== 'published') return false;
      const deadline = new Date(s.deadline);
      const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntil > 0 && hoursUntil <= 48;
    });

    if (upcomingDeadlines.length > 0) {
      const deadlineLines: string[] = [];
      for (const session of upcomingDeadlines) {
        const deadline = new Date(session.deadline!);
        const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

        // Count students who haven't submitted
        let notSubmitted = 0;
        const activeStudents = students.filter((s) => s.status === 'active' || s.status === 'paid');
        for (const student of activeStudents) {
          const exercises = await getExercisesByStudent(student.id);
          const hasSubmitted = exercises.some(
            (e) => e.session_id === session.id || (e.module === session.module && e.exercise_number === session.session_number)
          );
          if (!hasSubmitted) notSubmitted++;
        }

        deadlineLines.push(
          `  \u2022 Session ${session.session_number} — ${hoursLeft}h restantes, ${notSubmitted} n'ont pas soumis`
        );
      }
      parts.push(`\u23f0 **Deadlines proches (${upcomingDeadlines.length}):**\n${deadlineLines.join('\n')}`);
    }

    // 3. Inactive students (5+ days)
    const activeStudents = students.filter((s) => s.status === 'active' || s.status === 'paid');
    const inactiveStudents: string[] = [];
    for (const student of activeStudents) {
      const exercises = await getExercisesByStudent(student.id);
      if (exercises.length === 0) {
        // No submissions at all — check enrollment date
        const enrolled = student.enrolled_at ? new Date(student.enrolled_at) : new Date(student.created_at);
        const daysSince = Math.round((now.getTime() - enrolled.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 5) {
          inactiveStudents.push(`  \u2022 ${student.name} (aucune soumission, ${daysSince}j)`);
        }
      } else {
        const lastSubmission = exercises.reduce((latest, e) => {
          const d = new Date(e.submitted_at);
          return d > latest ? d : latest;
        }, new Date(0));
        const daysSince = Math.round((now.getTime() - lastSubmission.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 5) {
          inactiveStudents.push(`  \u2022 ${student.name} (${daysSince}j sans soumission)`);
        }
      }
    }

    if (inactiveStudents.length > 0) {
      parts.push(`\u26a0\ufe0f **Etudiants inactifs (${inactiveStudents.length}):**\n${inactiveStudents.join('\n')}`);
    }

    // 4. New submissions in last 12h
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const recentSubmissions = pending.filter((e) => new Date(e.submitted_at) > twelveHoursAgo);
    if (recentSubmissions.length > 0) {
      parts.push(`\ud83c\udd95 **Nouvelles soumissions (${recentSubmissions.length} en 12h)**`);
    }

    // Send digest
    if (parts.length === 0) {
      await adminChannel.send('\u2705 Tout est en ordre — aucun exercice en attente.');
    } else {
      const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
      const digest = `\ud83d\udcca **Digest Formation — ${dateStr}**\n\n${parts.join('\n\n')}`;
      await adminChannel.send(digest);
    }

    logger.info({ sections: parts.length }, 'Admin digest sent');
  } catch (error) {
    logger.error({ error }, 'Failed to send admin digest');
  }
}
