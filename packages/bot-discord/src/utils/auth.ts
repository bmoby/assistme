import { ChatInputCommandInteraction, GuildMember, Message } from 'discord.js';
import { getStudentByDiscordId } from '@vibe-coder/core';
import type { Student } from '@vibe-coder/core';
import { logger } from '@vibe-coder/core';
import { ROLES } from '../config.js';

function getMember(interaction: ChatInputCommandInteraction | Message): GuildMember | null {
  if (interaction.member instanceof GuildMember) return interaction.member;
  return null;
}

export function isAdmin(interaction: ChatInputCommandInteraction | Message): boolean {
  const member = getMember(interaction);
  if (!member) return false;
  return member.roles.cache.some((role) => role.name === ROLES.admin);
}

export function isStudent(interaction: ChatInputCommandInteraction | Message): boolean {
  const member = getMember(interaction);
  if (!member) return false;
  return member.roles.cache.some((role) => role.name === ROLES.student);
}

export async function getStudentFromInteraction(
  interaction: ChatInputCommandInteraction
): Promise<Student | null> {
  const discordId = interaction.user.id;
  try {
    return await getStudentByDiscordId(discordId);
  } catch (error) {
    logger.error({ error, discordId }, 'Failed to get student from interaction');
    return null;
  }
}

export function getAdminDiscordId(): string {
  const adminId = process.env['DISCORD_ADMIN_USER_ID'];
  if (!adminId) throw new Error('DISCORD_ADMIN_USER_ID not set');
  return adminId;
}
