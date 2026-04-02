import {
  Client,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getExerciseSummary, getPendingExercises } from '@assistme/core';
import type { StudentExercise } from '@assistme/core';
import { logger } from '@assistme/core';
import { CHANNELS } from '../config.js';

export async function sendExerciseDigest(client: Client, guildId: string): Promise<void> {
  try {
    // Archived exercises excluded at DB query level: getExerciseSummary and getPendingExercises filter .neq('status', 'archived') (ARCH-03)
    const summary = await getExerciseSummary();
    const pending = await getPendingExercises();

    if (pending.length === 0) {
      logger.info('No pending exercises for digest');
      return;
    }

    // Group by session
    const bySession = new Map<number, StudentExercise[]>();
    for (const ex of pending) {
      const sn = ex.exercise_number;
      if (!bySession.has(sn)) bySession.set(sn, []);
      bySession.get(sn)!.push(ex);
    }

    const today = new Date().toLocaleDateString('ru-RU', { timeZone: 'Europe/Paris' });

    const sessionLines: string[] = [];
    for (const [sn, exercises] of [...bySession.entries()].sort((a, b) => a[0] - b[0])) {
      sessionLines.push(`  Session ${sn} : ${exercises.length} soumission(s)`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 Digest exercices — ${today}`)
      .setDescription(
        [
          `**En attente de review : ${summary.pending}**`,
          ...sessionLines,
          '',
          `Approuves : ${summary.approved}`,
          `Revisions demandees : ${summary.revision_needed}`,
        ].join('\n')
      )
      .setColor(summary.pending > 0 ? 0xff9900 : 0x00ff00)
      .setTimestamp();

    // Buttons per session
    const sessions = [...bySession.keys()].sort((a, b) => a - b).slice(0, 25);
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    for (let i = 0; i < sessions.length; i += 5) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (const sn of sessions.slice(i, i + 5)) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`review_session_${sn}`)
            .setLabel(`Session ${sn}`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📋')
        );
      }
      rows.push(row);
    }

    // Post to #админ
    const guild = client.guilds.cache.get(guildId);
    const adminChannel = guild?.channels.cache.find(
      (ch) => ch.name === CHANNELS.admin && ch instanceof TextChannel
    ) as TextChannel | undefined;

    if (adminChannel) {
      await adminChannel.send({ embeds: [embed], components: rows });
      logger.info({ pending: summary.pending }, 'Exercise digest posted to #админ');
    } else {
      logger.warn('Admin channel not found for exercise digest');
    }

  } catch (error) {
    logger.error({ error }, 'Failed to send exercise digest');
  }
}
