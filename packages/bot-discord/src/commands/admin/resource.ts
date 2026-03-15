import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { logger } from '@vibe-coder/core';
import { isAdmin } from '../../utils/auth.js';
import { CHANNELS } from '../../config.js';

export const resourceCommand = new SlashCommandBuilder()
  .setName('resource')
  .setDescription('[Admin] Поделиться ресурсом')
  .addIntegerOption((opt) =>
    opt.setName('модуль').setDescription('Номер модуля (1-6)').setRequired(true).setMinValue(1).setMaxValue(6)
  )
  .addStringOption((opt) =>
    opt.setName('название').setDescription('Название ресурса').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('ссылка').setDescription('Ссылка на ресурс (URL)').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('описание').setDescription('Описание ресурса').setRequired(false)
  );

export async function handleResource(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Команда доступна только тренеру.', ephemeral: true });
    return;
  }

  const module = interaction.options.getInteger('модуль', true);
  const title = interaction.options.getString('название', true);
  const link = interaction.options.getString('ссылка');
  const description = interaction.options.getString('описание');

  try {
    const resourcesChannel = interaction.guild?.channels.cache.find(
      (ch) => ch.name === CHANNELS.ressources && ch instanceof TextChannel
    ) as TextChannel | undefined;

    if (!resourcesChannel) {
      await interaction.reply({ content: `Канал #${CHANNELS.ressources} не найден.`, ephemeral: true });
      return;
    }

    let message = `📚 **Модуль ${module} — ${title}**`;
    if (description) message += `\n${description}`;
    if (link) message += `\n\n🔗 ${link}`;

    await resourcesChannel.send(message);
    await interaction.reply({ content: `Ресурс «${title}» отправлен в #${CHANNELS.ressources}.`, ephemeral: true });
  } catch (error) {
    logger.error({ error }, 'Failed to share resource');
    await interaction.reply({ content: 'Ошибка при отправке ресурса.', ephemeral: true });
  }
}
