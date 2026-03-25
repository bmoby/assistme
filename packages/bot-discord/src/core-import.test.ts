import { describe, it, expect } from 'vitest';
import { logger } from '@assistme/core';

describe('@assistme/core resolution', () => {
  it('imports from source without needing pnpm build', () => {
    // If resolve.alias is wrong, this import fails at module load time
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });
});
