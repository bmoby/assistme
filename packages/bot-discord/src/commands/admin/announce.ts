import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { logger } from '@assistme/core';
import { isAdmin } from '../../utils/auth.js';
import { CHANNELS, ROLES } from '../../config.js';

export const announceCommand = new SlashCommandBuilder()
  .setName('announce')
  .setDescription('[Admin] Отправить объявление')
  .addStringOption((opt) =>
    opt.setName('текст').setDescription('Текст объявления').setRequired(true)
  );

export async function handleAnnounce(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Команда доступна только тренеру.', ephemeral: true });
    return;
  }

  const text = interaction.options.getString('текст', true);

  try {
    const announcesChannel = interaction.guild?.channels.cache.find(
      (ch) => ch.name === CHANNELS.annonces && ch instanceof TextChannel
    ) as TextChannel | undefined;

    if (!announcesChannel) {
      await interaction.reply({ content: `Канал #${CHANNELS.annonces} не найден.`, ephemeral: true });
      return;
    }

    const studentRole = interaction.guild?.roles.cache.find((r) => r.name === ROLES.student);
    const mention = studentRole ? `<@&${studentRole.id}> ` : '';

    await announcesChannel.send(`${mention}📢 **Объявление**\n\n${text}`);
    await interaction.reply({ content: `Объявление отправлено в #${CHANNELS.annonces}.`, ephemeral: true });
  } catch (error) {
    logger.error({ error }, 'Failed to send announcement');
    await interaction.reply({ content: 'Ошибка при отправке объявления.', ephemeral: true });
  }
}
