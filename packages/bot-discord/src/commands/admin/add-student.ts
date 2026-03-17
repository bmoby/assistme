import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember } from 'discord.js';
import { createStudent } from '@assistme/core';
import { logger } from '@assistme/core';
import { isAdmin } from '../../utils/auth.js';
import { formatStudentEmbed } from '../../utils/format.js';
import { ROLES } from '../../config.js';

export const addStudentCommand = new SlashCommandBuilder()
  .setName('add-student')
  .setDescription('[Admin] Добавить студента')
  .addStringOption((opt) =>
    opt.setName('имя').setDescription('Имя студента').setRequired(true)
  )
  .addUserOption((opt) =>
    opt.setName('discord').setDescription('Пользователь Discord').setRequired(false)
  )
  .addIntegerOption((opt) =>
    opt.setName('под').setDescription('Номер пода (1-8)').setRequired(false).setMinValue(1).setMaxValue(8)
  );

export async function handleAddStudent(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Команда доступна только тренеру.', ephemeral: true });
    return;
  }

  const name = interaction.options.getString('имя', true);
  const discordUser = interaction.options.getUser('discord');
  const podId = interaction.options.getInteger('под');

  await interaction.deferReply();

  try {
    const student = await createStudent({
      name,
      discord_id: discordUser?.id ?? null,
      status: 'paid',
      payment_status: 'paid',
      pod_id: podId ?? null,
    });

    // Assign student role if Discord user is provided
    if (discordUser && interaction.guild) {
      try {
        const member = await interaction.guild.members.fetch(discordUser.id);
        const studentRole = interaction.guild.roles.cache.find((r) => r.name === ROLES.student);
        if (studentRole && member) {
          await member.roles.add(studentRole);
        }
      } catch (roleError) {
        logger.warn({ roleError, discordUserId: discordUser.id }, 'Could not assign student role');
      }
    }

    const embed = formatStudentEmbed(student);
    await interaction.editReply({
      content: `Студент **${name}** успешно добавлен!${discordUser ? ` Роль @${ROLES.student} назначена.` : ' Аккаунт Discord не привязан.'}`,
      embeds: [embed],
    });
  } catch (error) {
    logger.error({ error, name }, 'Failed to add student');
    await interaction.editReply('Ошибка при добавлении студента.');
  }
}
