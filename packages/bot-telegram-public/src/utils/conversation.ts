/**
 * Simple in-memory conversation history per chat.
 * Keeps the last N messages for context.
 */

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

const conversations = new Map<number, Message[]>();
const MAX_MESSAGES = 20;
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export function addMessage(chatId: number, role: 'user' | 'assistant', text: string): void {
  if (!conversations.has(chatId)) {
    conversations.set(chatId, []);
  }

  const history = conversations.get(chatId)!;
  history.push({ role, text, timestamp: Date.now() });

  // Keep only last N messages
  if (history.length > MAX_MESSAGES) {
    history.splice(0, history.length - MAX_MESSAGES);
  }
}

export function getHistory(chatId: number): Message[] {
  const history = conversations.get(chatId);
  if (!history) return [];

  // Filter out expired messages
  const now = Date.now();
  const fresh = history.filter((m) => now - m.timestamp < TTL_MS);

  if (fresh.length !== history.length) {
    conversations.set(chatId, fresh);
  }

  return fresh;
}

export function formatHistoryForPrompt(chatId: number): string {
  const history = getHistory(chatId);
  if (history.length === 0) return '';

  return history
    .map((m) => `${m.role === 'user' ? 'Пользователь' : 'Бот'}: ${m.text}`)
    .join('\n');
}

export function clearHistory(chatId: number): void {
  conversations.delete(chatId);
}
