import { EmbedBuilder } from 'discord.js';
import type { Student, StudentExercise, SubmissionAttachment, Session, ReviewHistoryEntry } from '@assistme/core';

const STATUS_EMOJI: Record<string, string> = {
  interested: '⚪',
  registered: '🔵',
  paid: '🟢',
  active: '🟢',
  completed: '🏆',
  dropped: '🔴',
  submitted: '📩',
  ai_reviewed: '🤖',
  reviewed: '👁️',
  approved: '✅',
  revision_needed: '🔄',
};

export function formatStudentEmbed(student: Student): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`${STATUS_EMOJI[student.status] ?? '⚪'} ${student.name}`)
    .addFields(
      { name: 'Статус', value: student.status, inline: true },
      { name: 'Оплата', value: student.payment_status, inline: true },
      { name: 'Под', value: student.pod_id ? `Под ${student.pod_id}` : 'Не назначен', inline: true },
    )
    .setColor(student.status === 'active' ? 0x00ff00 : 0x808080)
    .setTimestamp();
}

export function formatExerciseEmbed(
  exercise: StudentExercise,
  studentName?: string,
  attachments?: SubmissionAttachment[]
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`${STATUS_EMOJI[exercise.status] ?? '📩'} Задание M${exercise.module}-З${exercise.exercise_number}`)
    .addFields(
      { name: 'Статус', value: exercise.status, inline: true },
      { name: 'Отправлено', value: new Date(exercise.submitted_at).toLocaleDateString('ru-RU', { timeZone: 'Europe/Paris' }), inline: true },
    )
    .setColor(exercise.status === 'approved' ? 0x00ff00 : exercise.status === 'revision_needed' ? 0xff0000 : 0xffaa00)
    .setTimestamp();

  if (studentName) embed.addFields({ name: 'Студент', value: studentName, inline: true });
  if (exercise.submission_url) embed.addFields({ name: 'Ссылка', value: exercise.submission_url });
  if (exercise.feedback) embed.addFields({ name: 'Отзыв', value: exercise.feedback.slice(0, 1024) });

  if (attachments && attachments.length > 0) {
    const lines = attachments.map((a) => {
      if (a.type === 'url') return `🔗 [${a.original_filename ?? 'Ссылка'}](${a.url})`;
      if (a.type === 'image') return `🖼️ ${a.original_filename ?? 'Изображение'}`;
      return `📎 ${a.original_filename ?? 'Файл'}`;
    });
    embed.addFields({ name: `📁 Файлы (${attachments.length})`, value: lines.join('\n').slice(0, 1024) });
  }

  return embed;
}

export function formatProgressEmbed(
  student: Student,
  exercises: StudentExercise[]
): EmbedBuilder {
  const approved = exercises.filter((e) => e.status === 'approved').length;
  const pending = exercises.filter((e) => e.status === 'submitted' || e.status === 'ai_reviewed').length;
  const revision = exercises.filter((e) => e.status === 'revision_needed').length;

  const progressBar = (count: number, total: number): string => {
    if (total === 0) return 'Нет сданных заданий';
    const filled = Math.round((count / total) * 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${count}/${total}`;
  };

  return new EmbedBuilder()
    .setTitle(`📊 Прогресс: ${student.name}`)
    .addFields(
      { name: '✅ Одобрено', value: progressBar(approved, exercises.length), inline: false },
      { name: '📩 На проверке', value: String(pending), inline: true },
      { name: '🔄 На доработке', value: String(revision), inline: true },
      { name: '📚 Всего сдано', value: String(exercises.length), inline: true },
    )
    .setColor(0x5865f2)
    .setTimestamp();
}

// ============================================
// Exercise Review System — New Embeds
// ============================================

/**
 * Notification embed posted in #админ when a student submits an exercise.
 */
export function formatSubmissionNotification(
  exercise: StudentExercise,
  session: Session | null,
  studentName: string,
  attachmentsWithUrls: Array<{ attachment: SubmissionAttachment; signedUrl: string | null }>,
  isResubmission: boolean
): EmbedBuilder {
  const aiReview = exercise.ai_review as Record<string, unknown> | null;
  const aiScore = aiReview?.score as number | undefined;
  const aiRec = aiReview?.recommendation as string | undefined;

  const title = isResubmission
    ? `🔄 Re-soumission (#${exercise.submission_count})`
    : '📩 Nouveau exercice soumis';

  const embed = new EmbedBuilder()
    .setTitle(title)
    .addFields(
      { name: '👤 Etudiant', value: studentName, inline: true },
      { name: '📚 Session', value: session ? `${session.session_number} — ${session.title}` : `S${exercise.exercise_number}`, inline: true },
    )
    .setColor(isResubmission ? 0xff9900 : 0x5865f2)
    .setTimestamp();

  // Files with clickable links and inline image
  if (attachmentsWithUrls.length > 0) {
    const lines: string[] = [];
    let firstImageUrl: string | null = null;

    for (const { attachment: a, signedUrl } of attachmentsWithUrls) {
      if (a.type === 'url') {
        lines.push(`🔗 [${a.original_filename ?? 'Lien'}](${a.url})`);
      } else if (a.type === 'image' && signedUrl) {
        lines.push(`🖼️ [${a.original_filename ?? 'Image'}](${signedUrl})`);
        if (!firstImageUrl) firstImageUrl = signedUrl;
      } else if (signedUrl) {
        lines.push(`📎 [${a.original_filename ?? 'Fichier'}](${signedUrl})`);
      } else {
        lines.push(`📎 ${a.original_filename ?? 'Fichier'}`);
      }
    }

    embed.addFields({ name: `📁 Fichiers (${attachmentsWithUrls.length})`, value: lines.join('\n').slice(0, 1024) });

    // Show first image inline in the embed
    if (firstImageUrl) {
      embed.setImage(firstImageUrl);
    }
  }

  // AI score
  if (aiScore !== undefined) {
    const recLabel = aiRec === 'approve' ? 'approve' : aiRec === 'revision_needed' ? 'revision' : aiRec ?? '?';
    embed.addFields({ name: '🤖 Score IA', value: `${aiScore}/10 — ${recLabel}`, inline: true });
  } else {
    embed.addFields({ name: '🤖 Score IA', value: 'en cours...', inline: true });
  }

  // Previous feedback (for re-submissions)
  if (isResubmission && exercise.review_history.length > 0) {
    const last = exercise.review_history[exercise.review_history.length - 1]!;
    if (last.feedback) {
      embed.addFields({ name: '💬 Ancien retour', value: last.feedback.slice(0, 200) + (last.feedback.length > 200 ? '...' : '') });
    }
  }

  return embed;
}

/**
 * Messages for the review thread (soumission, IA review, history).
 */
export function formatReviewThreadMessages(
  exercise: StudentExercise,
  session: Session | null,
  studentName: string,
  attachmentsWithUrls: Array<{ attachment: SubmissionAttachment; signedUrl: string | null }>,
): { submissionMsg: string; aiReviewMsg: string | null; historyMsg: string | null; imageUrl: string | null } {
  const sessionTitle = session ? `${session.session_number} — ${session.title}` : `S${exercise.exercise_number}`;
  const countLabel = exercise.submission_count > 1 ? ` (soumission #${exercise.submission_count})` : '';

  // Message 1: Submission
  const submissionLines: string[] = [
    `🔍 **Review : ${studentName} — Session ${sessionTitle}**${countLabel}`,
    '',
    '── SOUMISSION ──',
  ];

  // Files
  let imageUrl: string | null = null;
  if (attachmentsWithUrls.length > 0) {
    submissionLines.push('', '📁 **Fichiers soumis :**');
    for (const { attachment: a, signedUrl } of attachmentsWithUrls) {
      if (a.type === 'url') {
        submissionLines.push(`🔗 ${a.url ?? a.original_filename ?? 'Lien'}`);
      } else if (a.type === 'image' && signedUrl) {
        submissionLines.push(`🖼️ ${a.original_filename ?? 'Image'}`);
        if (!imageUrl) imageUrl = signedUrl; // First image displayed inline
      } else if (signedUrl) {
        submissionLines.push(`📎 [${a.original_filename ?? 'Fichier'}](${signedUrl})`);
      } else {
        submissionLines.push(`📎 ${a.original_filename ?? 'Fichier'} (lien indisponible)`);
      }
    }
  }

  const submissionMsg = submissionLines.join('\n').slice(0, 1900);

  // Message 2: AI Review
  let aiReviewMsg: string | null = null;
  const aiReview = exercise.ai_review as Record<string, unknown> | null;
  if (aiReview) {
    const score = aiReview.score as number | undefined;
    const rec = aiReview.recommendation as string | undefined;
    const strengths = aiReview.strengths as string[] | undefined;
    const improvements = aiReview.improvements as string[] | undefined;
    const detailed = aiReview.detailedReview as string | undefined;

    const lines: string[] = [
      '── REVIEW IA ──',
      '',
      `**Score :** ${score ?? '?'}/10`,
      `**Recommandation :** ${rec ?? '?'}`,
    ];

    if (strengths && strengths.length > 0) {
      lines.push('', '✅ **Points forts :**');
      for (const s of strengths) lines.push(`• ${s}`);
    }
    if (improvements && improvements.length > 0) {
      lines.push('', '⚠️ **A ameliorer :**');
      for (const i of improvements) lines.push(`• ${i}`);
    }
    if (detailed) {
      lines.push('', '── Detail (pour le formateur) ──', detailed);
    }

    aiReviewMsg = lines.join('\n').slice(0, 1900);
  }

  // Message 4: History (if re-submission)
  let historyMsg: string | null = null;
  if (exercise.review_history.length > 0) {
    const historyLines: string[] = ['── HISTORIQUE ──'];
    for (const entry of exercise.review_history) {
      const date = new Date(entry.reviewed_at).toLocaleDateString('ru-RU', { timeZone: 'Europe/Paris' });
      const entryAi = entry.ai_review as Record<string, unknown> | null;
      const entryScore = entryAi?.score as number | undefined;

      historyLines.push('');
      historyLines.push(`🔄 **Soumission #${entry.submission_count}** (${date})`);
      if (entryScore !== undefined) historyLines.push(`Score IA : ${entryScore}/10`);
      historyLines.push(`Statut : ${entry.status}`);
      if (entry.feedback) {
        const feedbackLines = entry.feedback.split('\n').map((l) => `— ${l}`).join('\n');
        historyLines.push(`Retour formateur :\n${feedbackLines}`);
      }
    }
    historyMsg = historyLines.join('\n').slice(0, 1900);
  }

  return { submissionMsg, aiReviewMsg, historyMsg, imageUrl };
}

/**
 * DM message sent to the student after the trainer validates the review.
 */
export function formatStudentFeedbackDM(
  exercise: StudentExercise,
  session: Session | null,
  feedback: string,
  status: 'approved' | 'revision_needed'
): string {
  const sessionTitle = session ? `Сессия ${session.session_number} : ${session.title}` : `Сессия ${exercise.exercise_number}`;
  const aiReview = exercise.ai_review as Record<string, unknown> | null;
  const aiScore = aiReview?.score as number | undefined;

  const emoji = status === 'approved' ? '✅' : '🔄';
  const statusText = status === 'approved' ? 'Задание одобрено' : 'Нужна доработка';
  const footer = status === 'approved'
    ? 'Отличная работа!'
    : 'Исправь указанные моменты и отправь задание заново.';

  const lines: string[] = [
    `${emoji} **${statusText}** — ${sessionTitle}`,
  ];

  if (aiScore !== undefined) {
    lines.push('', `🤖 Оценка IA : ${aiScore}/10`);
  }

  lines.push('', '💬 **Отзыв преподавателя :**', feedback);
  lines.push('', footer);

  return lines.join('\n');
}
