import { logger } from '@assistme/core';

/**
 * Send a notification to the admin via the ADMIN bot.
 * Uses the admin bot token to send directly to the admin chat.
 */
export async function notifyAdmin(message: string): Promise<void> {
  const adminToken = process.env['TELEGRAM_BOT_TOKEN'];
  const adminChatId = process.env['TELEGRAM_ADMIN_CHAT_ID'];

  if (!adminToken || !adminChatId) {
    logger.warn('Cannot notify admin: missing TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${adminToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, body: errorText }, 'Failed to notify admin');
    } else {
      logger.info('Admin notified successfully');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to send admin notification');
  }
}
