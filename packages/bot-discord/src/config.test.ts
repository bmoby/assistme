import { describe, expect, it } from 'vitest';
import { isFaqHandlerEnabled } from './config.js';

describe('isFaqHandlerEnabled', () => {
  it('keeps the FAQ handler enabled by default', () => {
    expect(isFaqHandlerEnabled({})).toBe(true);
  });

  it.each(['false', '0', 'no', 'off', ' FALSE '])(
    'disables the FAQ handler when DISCORD_FAQ_HANDLER_ENABLED=%s',
    (value) => {
      expect(isFaqHandlerEnabled({ DISCORD_FAQ_HANDLER_ENABLED: value })).toBe(false);
    }
  );

  it('keeps the FAQ handler enabled for truthy values', () => {
    expect(isFaqHandlerEnabled({ DISCORD_FAQ_HANDLER_ENABLED: 'true' })).toBe(true);
  });
});
