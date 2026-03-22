import type { Session } from '../types/index.js';

const DISPLAY_TZ = 'Europe/Paris';

function formatDateRussian(date: string): string {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: DISPLAY_TZ,
  });
  const timeStr = d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DISPLAY_TZ,
  });
  return `${dateStr}, ${timeStr} (Paris)`;
}

/**
 * Builds a clean, student-facing forum post for a session.
 * Only includes sections that have data — no placeholders.
 */
export function buildSessionForumContent(session: Session): string {
  const sections: string[] = [];

  // Header
  sections.push(`# Сессия ${session.session_number} — ${session.title}\nМодуль ${session.module}`);

  // Video
  if (session.pre_session_video_url) {
    sections.push(`🎬 **Видео к сессии:**\n${session.pre_session_video_url}`);
  }

  // Description / Theme
  if (session.description) {
    sections.push(`📝 **Тема:**\n${session.description}`);
  }

  // Live (date + Meet link)
  if (session.live_at) {
    const liveDate = formatDateRussian(session.live_at);
    const meetLink = session.live_url
      ? `\n[Присоединиться к live](${session.live_url})`
      : '';
    sections.push(`🟢 **Live:** ${liveDate}${meetLink}`);
  }

  // Exercise
  if (session.exercise_description) {
    const lines = [session.exercise_description];
    if (session.expected_deliverables) lines.push(`\n**Что сдать:** ${session.expected_deliverables}`);
    if (session.exercise_tips) lines.push(`**Советы:** ${session.exercise_tips}`);
    sections.push(`📋 **Задание:**\n${lines.join('\n')}`);
  }

  // Deadline
  if (session.deadline) {
    sections.push(`📅 **Сдать задание до:** ${formatDateRussian(session.deadline)}`);
  }

  // Replay
  if (session.replay_url) {
    sections.push(`🎥 **Replay:**\n${session.replay_url}`);
  }

  return sections.join('\n\n');
}

/**
 * Builds a dynamic announcement message for #объявления.
 */
export function buildSessionAnnouncement(session: Session): string {
  const parts = [`🆕 **Доступна Сессия ${session.session_number}!**\n${session.title}`];

  if (session.pre_session_video_url) {
    parts.push(`🎬 Видео: ${session.pre_session_video_url}`);
  }

  if (session.live_at) {
    const liveDate = formatDateRussian(session.live_at);
    const meetLink = session.live_url ? `\n[Присоединиться](${session.live_url})` : '';
    parts.push(`🟢 Live: ${liveDate}${meetLink}`);
  }

  if (!session.pre_session_video_url && !session.live_at) {
    parts.push('Подробности в посте сессии.');
  }

  return parts.join('\n\n');
}
