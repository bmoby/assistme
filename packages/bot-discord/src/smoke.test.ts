import { describe, it, expect } from 'vitest';

describe('bot-discord: infrastructure smoke', () => {
  it('runs without crashing', () => {
    expect(true).toBe(true);
  });

  it('has access to fake env vars including Discord-specific ones', () => {
    expect(process.env['SUPABASE_URL']).toBe('http://localhost:54321');
    expect(process.env['DISCORD_BOT_TOKEN']).toBeTruthy();
    expect(process.env['DISCORD_CLIENT_ID']).toBeTruthy();
    expect(process.env['DISCORD_GUILD_ID']).toBeTruthy();
    expect(process.env['LOG_LEVEL']).toBe('silent');
  });
});
