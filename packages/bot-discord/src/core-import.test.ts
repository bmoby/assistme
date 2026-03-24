import { describe, it, expect } from 'vitest';

describe('@assistme/core resolution', () => {
  it('imports from source without needing pnpm build', async () => {
    // If dist/ is absent or stale and alias is wrong, this dynamic import throws
    const core = await import('@assistme/core');
    expect(core).toBeDefined();
    // Verify logger is exported (a known export from core/src/index.ts)
    expect(core.logger).toBeDefined();
  });
});
