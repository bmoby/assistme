import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { agents, logger } from '@assistme/core';
import { isAdmin } from '../../utils/auth.js';
import { ROLES } from '../../config.js';

export const createCommand = new SlashCommandBuilder()
  .setName('create')
  .setDescription('[Admin] Invoquer un agent autonome')
  .addStringOption((opt) =>
    opt
      .setName('agent')
      .setDescription('Nom de l\'agent')
      .setRequired(true)
      .addChoices(
        { name: 'Artisan (PPTX)', value: 'artisan' },
        { name: 'Chercheur (Recherche)', value: 'chercheur' },
      )
  )
  .addStringOption((opt) =>
    opt.setName('тема').setDescription('Тема / sujet').setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt.setName('слайды').setDescription('Nombre de slides (artisan)').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('детали').setDescription('Details supplementaires').setRequired(false)
  );

export async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Команда доступна только тренеру.', ephemeral: true });
    return;
  }

  const agentName = interaction.options.getString('agent', true);
  const topic = interaction.options.getString('тема', true);
  const slideCount = interaction.options.getInteger('слайды') ?? undefined;
  const details = interaction.options.getString('детали') ?? undefined;

  try {
    // Determine caller role from Discord roles
    const member = interaction.member;
    const roleNames = member && 'roles' in member
      ? (member.roles as { cache: { map: (fn: (r: { name: string }) => string) => string[] } }).cache.map((r: { name: string }) => r.name)
      : [];
    const callerRole = agents.resolveRole({
      platform: 'discord',
      userId: interaction.user.id,
      discordRoles: roleNames,
    });

    const input: Record<string, unknown> = { topic };
    if (slideCount) input['slideCount'] = slideCount;
    if (details) input['details'] = details;

    await agents.invoke(agentName, input, {
      platform: 'discord',
      chatId: interaction.channelId,
      messageId: interaction.id,
      callerRole,
    });

    const agentDef = agents.getAgent(agentName);
    const displayName = agentDef?.displayName ?? agentName;

    await interaction.reply({
      content: `${displayName} s'en occupe. Le resultat sera envoye ici des que c'est pret.`,
      ephemeral: true,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error, agentName }, 'Failed to invoke agent from Discord');
    await interaction.reply({ content: `Erreur: ${errMsg}`, ephemeral: true });
  }
}
