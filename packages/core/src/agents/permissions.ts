import type { CallerRole, AgentDefinition } from './types.js';

export function canInvoke(agent: AgentDefinition, role: CallerRole): boolean {
  return agent.allowedRoles.includes(role);
}

export function resolveRole(params: {
  platform: 'telegram' | 'discord' | 'system';
  userId: string;
  discordRoles?: string[];
}): CallerRole {
  // System calls are always admin
  if (params.platform === 'system') return 'admin';

  // Telegram: only admin (Magomed) uses the admin bot
  if (params.platform === 'telegram') {
    const adminChatId = process.env['TELEGRAM_ADMIN_CHAT_ID'];
    if (adminChatId && params.userId === adminChatId) return 'admin';
    return 'public';
  }

  // Discord: check roles
  if (params.platform === 'discord') {
    const roles = params.discordRoles ?? [];
    if (roles.includes('tsarag')) return 'admin';
    if (roles.includes('mentor')) return 'mentor';
    if (roles.includes('student')) return 'student';
    return 'public';
  }

  return 'public';
}
