import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { logger } from '@vibe-coder/core';
import { isAdmin } from '../../utils/auth.js';
import { CHANNELS, ROLES } from '../../config.js';

export const liveCommand = new SlashCommandBuilder()
  .setName('live')
  .setDescription('[Admin] Запланировать эфир')
  .addStringOption((opt) =>
    opt.setName('дата').setDescription('Дата эфира (напр: 2026-03-20)').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('время').setDescription('Время эфира (напр: 19:00)').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('тема').setDescription('Тема сессии').setRequired(true)
  );

export async function handleLive(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Команда доступна только тренеру.', ephemeral: true });
    return;
  }

  const date = interaction.options.getString('дата', true);
  const heure = interaction.options.getString('время', true);
  const sujet = interaction.options.getString('тема', true);

  try {
    const livesChannel = interaction.guild?.channels.cache.find(
      (ch) => ch.name === CHANNELS.lives && ch instanceof TextChannel
    ) as TextChannel | undefined;

    if (!livesChannel) {
      await interaction.reply({ content: `Канал #${CHANNELS.lives} не найден.`, ephemeral: true });
      return;
    }

    const studentRole = interaction.guild?.roles.cache.find((r) => r.name === ROLES.student);
    const mention = studentRole ? `<@&${studentRole.id}> ` : '';

    await livesChannel.send(
      `${mention}🔴 **Запланирован эфир!**\n\n` +
      `📅 **Дата**: ${date}\n` +
      `🕐 **Время**: ${heure}\n` +
      `📝 **Тема**: ${sujet}\n\n` +
      `Будьте готовы!`
    );

    await interaction.reply({ content: `Эфир запланирован на ${date} в ${heure}.`, ephemeral: true });
  } catch (error) {
    logger.error({ error }, 'Failed to schedule live');
    await interaction.reply({ content: 'Ошибка при планировании эфира.', ephemeral: true });
  }
}
