import { describe, it, expect } from 'vitest';

describe('core: infrastructure smoke', () => {
  it('runs without crashing', () => {
    expect(true).toBe(true);
  });

  it('has access to fake env vars', () => {
    expect(process.env['SUPABASE_URL']).toBe('http://localhost:54321');
    expect(process.env['SUPABASE_SERVICE_ROLE_KEY']).toBeTruthy();
    expect(process.env['LOG_LEVEL']).toBe('silent');
  });
});
