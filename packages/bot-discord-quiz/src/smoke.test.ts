import { describe, it, expect } from 'vitest';
import { CHANNELS, ROLES } from './config.js';

describe('bot-discord-quiz smoke tests', () => {
  describe('config', () => {
    it('exports CHANNELS with quizAdmin', () => {
      expect(CHANNELS.quizAdmin).toBe('quiz-admin');
    });

    it('exports ROLES with admin and student', () => {
      expect(ROLES.admin).toBe('tsarag');
      expect(ROLES.student).toBe('student');
    });
  });

  describe('environment', () => {
    it('has DISCORD_QUIZ_BOT_TOKEN env var set (by vitest config)', () => {
      expect(process.env['DISCORD_QUIZ_BOT_TOKEN']).toBeDefined();
      expect(process.env['DISCORD_QUIZ_BOT_TOKEN']).not.toBe('');
    });

    it('has DISCORD_QUIZ_CLIENT_ID env var set (by vitest config)', () => {
      expect(process.env['DISCORD_QUIZ_CLIENT_ID']).toBeDefined();
      expect(process.env['DISCORD_QUIZ_CLIENT_ID']).not.toBe('');
    });

    it('has DISCORD_GUILD_ID env var set (shared with bot-discord)', () => {
      expect(process.env['DISCORD_GUILD_ID']).toBeDefined();
      expect(process.env['DISCORD_GUILD_ID']).not.toBe('');
    });
  });
});
