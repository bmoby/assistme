import { Client, Message } from 'discord.js';

// CRITICAL: Register the listener BEFORE sending any message to avoid the race
// condition where the reply arrives before the listener is set up (research pitfall 7).
export function waitForMessage(
  client: Client,
  predicate: (msg: Message) => boolean,
  timeoutMs = 15_000
): Promise<Message> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off('messageCreate', handler);
      reject(new Error(`waitForMessage timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    function handler(msg: Message): void {
      if (predicate(msg)) {
        clearTimeout(timer);
        client.off('messageCreate', handler);
        resolve(msg);
      }
    }

    client.on('messageCreate', handler);
  });
}
