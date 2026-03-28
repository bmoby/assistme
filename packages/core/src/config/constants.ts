// Business-rule time constants used across the codebase.
// Only QUIZ_EXPIRATION_HOURS is env-configurable; the rest are fixed constants.

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined) return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

// -- Quiz --
export const QUIZ_EXPIRATION_HOURS = envInt('QUIZ_EXPIRATION_HOURS', 48);
export const QUIZ_EXPIRATION_MS = QUIZ_EXPIRATION_HOURS * 60 * 60 * 1000;

// -- Memory --
export const WORKING_MEMORY_TTL_DAYS = 30;
export const WORKING_MEMORY_TTL_MS = WORKING_MEMORY_TTL_DAYS * 24 * 60 * 60 * 1000;
export const DECAY_HALF_LIFE_DAYS = 30;

// -- Reminders --
export const REMINDER_STALE_THRESHOLD_HOURS = 6;
export const REMINDER_STALE_THRESHOLD_MS = REMINDER_STALE_THRESHOLD_HOURS * 60 * 60 * 1000;
export const REMINDER_ZOMBIE_THRESHOLD_HOURS = 24;
export const REMINDER_ZOMBIE_THRESHOLD_MS = REMINDER_ZOMBIE_THRESHOLD_HOURS * 60 * 60 * 1000;
