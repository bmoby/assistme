import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logger, getSessionByNumber, updateSession } from '@assistme/core';
import { isAdmin } from '../../utils/auth.js';

export const sessionUpdateCommand = new SlashCommandBuilder()
  .setName('session-update')
  .setDescription('[Admin] Обновить данные сессии (задание, дедлайн, видео)')
  .addIntegerOption((opt) =>
    opt.setName('номер').setDescription('Номер сессии').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('задание').setDescription('Описание задания').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('формат').setDescription('Ожидаемый формат (image, url, document, text)').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('дедлайн').setDescription('Дедлайн (YYYY-MM-DD или YYYY-MM-DDTHH:MM)').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('видео').setDescription('Ссылка на видео к сессии').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('replay').setDescription('Ссылка на запись эфира').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('советы').setDescription('Советы по выполнению задания').setRequired(false)
  );

export async function handleSessionUpdate(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Команда доступна только тренеру.', ephemeral: true });
    return;
  }

  const sessionNumber = interaction.options.getInteger('номер', true);
  const exerciseDescription = interaction.options.getString('задание');
  const expectedDeliverables = interaction.options.getString('формат');
  const deadline = interaction.options.getString('дедлайн');
  const videoUrl = interaction.options.getString('видео');
  const replayUrl = interaction.options.getString('replay');
  const exerciseTips = interaction.options.getString('советы');

  // Check that at least one field is provided
  if (!exerciseDescription && !expectedDeliverables && !deadline && !videoUrl && !replayUrl && !exerciseTips) {
    await interaction.reply({
      content: 'Укажи хотя бы одно поле для обновления.',
      ephemeral: true,
    });
    return;
  }

  try {
    const session = await getSessionByNumber(sessionNumber);
    if (!session) {
      await interaction.reply({
        content: `Сессия ${sessionNumber} не найдена.`,
        ephemeral: true,
      });
      return;
    }

    // Build updates
    const updates: Record<string, unknown> = {};
    const changes: string[] = [];

    if (exerciseDescription) {
      updates.exercise_description = exerciseDescription;
      changes.push('задание');
    }
    if (expectedDeliverables) {
      updates.expected_deliverables = expectedDeliverables;
      changes.push('формат');
    }
    if (deadline) {
      // Parse deadline — accept YYYY-MM-DD or YYYY-MM-DDTHH:MM
      const deadlineDate = deadline.includes('T') ? deadline : `${deadline}T20:00:00`;
      updates.deadline = new Date(deadlineDate).toISOString();
      changes.push('дедлайн');
    }
    if (videoUrl) {
      updates.pre_session_video_url = videoUrl;
      changes.push('видео');
    }
    if (replayUrl) {
      updates.replay_url = replayUrl;
      changes.push('replay');
    }
    if (exerciseTips) {
      updates.exercise_tips = exerciseTips;
      changes.push('советы');
    }

    await updateSession(session.id, updates);

    await interaction.reply({
      content: `✅ Сессия ${sessionNumber} обновлена: ${changes.join(', ')}.`,
      ephemeral: true,
    });

    logger.info({ sessionNumber, changes }, 'Session updated');
  } catch (error) {
    logger.error({ error, sessionNumber }, 'Failed to update session');
    await interaction.reply({ content: '❌ Ошибка при обновлении сессии.', ephemeral: true });
  }
}
