import type { Student } from '@assistme/core';

let seq = 0;

export function resetSeq(): void {
  seq = 0;
}

export function createStudent(overrides: Partial<Student> = {}): Student {
  const id = seq++;
  return {
    id: `student-${id}`,
    name: `Test Student ${id}`,
    phone: null,
    email: null,
    telegram_id: null,
    discord_id: `discord-${id}`,
    session: 2,
    status: 'active',
    payment_status: 'paid',
    payment_amount: null,
    payment_method: null,
    payment_details: null,
    pod_id: null,
    mentor_id: null,
    enrolled_at: null,
    completed_at: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
