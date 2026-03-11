/**
 * Stores pending changes awaiting user confirmation.
 * One pending change at a time per chat.
 */

export interface PendingChange {
  target: 'memory' | 'kb';
  action: 'create' | 'update' | 'delete';
  category: string;
  key: string;
  oldContent: string | null;
  newContent: string | null;
  timestamp: number;
}

const pending = new Map<string, PendingChange>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function setPending(chatId: string, change: PendingChange): void {
  pending.set(chatId, change);
}

export function getPending(chatId: string): PendingChange | null {
  const entry = pending.get(chatId);
  if (!entry) return null;

  // Expire after 5 minutes
  if (Date.now() - entry.timestamp > TTL_MS) {
    pending.delete(chatId);
    return null;
  }

  return entry;
}

export function clearPending(chatId: string): void {
  pending.delete(chatId);
}

const CONFIRM_WORDS = ['oui', 'ok', 'yes', 'confirme', 'go', 'valide', 'da', 'yep', 'ouais', 'ок', 'да'];
const REJECT_WORDS = ['non', 'no', 'annule', 'cancel', 'stop', 'nope', 'нет'];

export function isConfirmation(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return CONFIRM_WORDS.some((w) => lower === w || lower.startsWith(w + ' '));
}

export function isRejection(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return REJECT_WORDS.some((w) => lower === w || lower.startsWith(w + ' '));
}
