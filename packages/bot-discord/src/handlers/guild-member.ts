import { Client, GuildMember } from 'discord.js';
import { getStudentByDiscordId } from '@vibe-coder/core';
import { logger } from '@vibe-coder/core';
import { ROLES } from '../config.js';

export function setupGuildMemberHandler(client: Client): void {
  client.on('guildMemberAdd', async (member: GuildMember) => {
    try {
      // Check if this Discord user is pre-registered as a student
      const student = await getStudentByDiscordId(member.id);

      if (student && (student.status === 'paid' || student.status === 'active')) {
        // Auto-assign student role
        const studentRole = member.guild.roles.cache.find((r) => r.name === ROLES.student);
        if (studentRole) {
          await member.roles.add(studentRole);
          logger.info({ studentId: student.id, discordId: member.id }, 'Auto-assigned student role');
        }

        // Welcome DM
        try {
          const dm = await member.createDM();
          await dm.send(
            `Добро пожаловать в Pilote Neuro, **${student.name}**! 🎉\n\n` +
            `Ты автоматически подтверждён(а). Тебе доступны все каналы обучения.\n\n` +
            `📩 **Как сдавать задания:** напиши мне прямо сюда в личные сообщения!\n` +
            `Я подскажу какое задание нужно сдать и помогу с отправкой.\n\n` +
            `Попробуй — напиши «привет» 👇`
          );
        } catch {
          logger.warn({ memberId: member.id }, 'Could not DM new member');
        }
      } else {
        // Not pre-registered — send generic welcome
        try {
          const dm = await member.createDM();
          await dm.send(
            `Добро пожаловать на сервер Pilote Neuro! 👋\n\n` +
            `Для доступа к каналам обучения нужна регистрация и подтверждение тренера.\n` +
            `Если ты уже зарегистрирован(а), свяжись с тренером для получения доступа.`
          );
        } catch {
          logger.warn({ memberId: member.id }, 'Could not DM unregistered member');
        }
      }
    } catch (error) {
      logger.error({ error, memberId: member.id }, 'Guild member add handler error');
    }
  });
}
