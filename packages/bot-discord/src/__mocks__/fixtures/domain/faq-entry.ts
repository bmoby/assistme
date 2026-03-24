import type { FaqEntry } from '@assistme/core';

let seq = 0;

export function resetSeq(): void {
  seq = 0;
}

export function createFaqEntry(overrides: Partial<FaqEntry> = {}): FaqEntry {
  const id = seq++;
  return {
    id: `faq-${id}`,
    question: `Test question ${id}?`,
    answer: `Test answer ${id}`,
    category: 'general',
    times_used: 0,
    created_by: 'admin',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
