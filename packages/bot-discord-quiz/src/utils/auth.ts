import { ChatInputCommandInteraction, GuildMember, ButtonInteraction } from 'discord.js';
import { ROLES } from '../config.js';

function getMember(interaction: ChatInputCommandInteraction | ButtonInteraction): GuildMember | null {
  if (interaction.member instanceof GuildMember) return interaction.member;
  return null;
}

export function isAdmin(interaction: ChatInputCommandInteraction | ButtonInteraction): boolean {
  const member = getMember(interaction);
  if (!member) return false;
  return member.roles.cache.some((role) => role.name === ROLES.admin);
}
