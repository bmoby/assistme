import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { logger } from '@vibe-coder/core';
import { isAdmin } from '../../utils/auth.js';
import { CHANNELS, ROLES } from '../../config.js';

export const deadlineCommand = new SlashCommandBuilder()
  .setName('deadline')
  .setDescription('[Admin] Установить дедлайн')
  .addIntegerOption((opt) =>
    opt.setName('модуль').setDescription('Номер модуля (1-6)').setRequired(true).setMinValue(1).setMaxValue(6)
  )
  .addIntegerOption((opt) =>
    opt.setName('задание').setDescription('Номер задания').setRequired(true).setMinValue(1)
  )
  .addStringOption((opt) =>
    opt.setName('дата').setDescription('Крайний срок (напр: 2026-03-22)').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('время').setDescription('Время (напр: 20:00)').setRequired(false)
  );

export async function handleDeadline(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Команда доступна только тренеру.', ephemeral: true });
    return;
  }

  const module = interaction.options.getInteger('модуль', true);
  const exercice = interaction.options.getInteger('задание', true);
  const date = interaction.options.getString('дата', true);
  const heure = interaction.options.getString('время') ?? '20:00';

  try {
    const exercicesChannel = interaction.guild?.channels.cache.find(
      (ch) => ch.name === CHANNELS.exercices && ch instanceof TextChannel
    ) as TextChannel | undefined;

    if (!exercicesChannel) {
      await interaction.reply({ content: `Канал #${CHANNELS.exercices} не найден.`, ephemeral: true });
      return;
    }

    const studentRole = interaction.guild?.roles.cache.find((r) => r.name === ROLES.student);
    const mention = studentRole ? `<@&${studentRole.id}> ` : '';

    await exercicesChannel.send(
      `${mention}⏰ **Дедлайн — Модуль ${module}, Задание ${exercice}**\n\n` +
      `📅 Крайний срок: **${date} в ${heure}**\n` +
      `Используйте \`/submit\` чтобы сдать работу.`
    );

    await interaction.reply({ content: `Дедлайн M${module}-З${exercice} установлен на ${date} в ${heure}.`, ephemeral: true });
  } catch (error) {
    logger.error({ error }, 'Failed to set deadline');
    await interaction.reply({ content: 'Ошибка при установке дедлайна.', ephemeral: true });
  }
}
