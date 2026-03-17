import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getStudentsBySession } from '@assistme/core';
import { logger } from '@assistme/core';
import { isAdmin } from '../../utils/auth.js';

export const studentListCommand = new SlashCommandBuilder()
  .setName('students')
  .setDescription('[Admin] Список студентов сессии');

export async function handleStudentList(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Команда доступна только тренеру.', ephemeral: true });
    return;
  }

  try {
    const students = await getStudentsBySession(2);

    if (students.length === 0) {
      await interaction.reply({ content: 'Нет зарегистрированных студентов для сессии 2.', ephemeral: true });
      return;
    }

    const statusEmoji: Record<string, string> = {
      interested: '⚪',
      registered: '🔵',
      paid: '🟡',
      active: '🟢',
      completed: '🏆',
      dropped: '🔴',
    };

    const lines = students.map((s, i) => {
      const emoji = statusEmoji[s.status] ?? '⚪';
      const pod = s.pod_id ? `Под ${s.pod_id}` : '-';
      const discord = s.discord_id ? '✓' : '✗';
      return `${i + 1}. ${emoji} **${s.name}** | ${s.status} | ${pod} | Discord: ${discord}`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`📋 Студенты Сессия 2 (${students.length})`)
      .setDescription(lines.join('\n'))
      .setColor(0x5865f2)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    logger.error({ error }, 'Failed to list students');
    await interaction.reply({ content: 'Ошибка при получении списка студентов.', ephemeral: true });
  }
}
