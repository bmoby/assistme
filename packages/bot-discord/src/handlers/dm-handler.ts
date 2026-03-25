import { Client, Message, DMChannel, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger, getExercise, getSession, getStudentByDiscordId, getAttachmentsByExercise, updateExercise } from '@assistme/core';
import { runDmAgent } from '@assistme/core';
import type { ConversationMessage, PendingAttachment } from '@assistme/core';
import { formatSubmissionNotification } from '../utils/format.js';
import { CHANNELS } from '../config.js';

// Discord client reference (set in setupDmHandler)
let discordClient: Client;

// ============================================
// Conversation state (in-memory)
// ============================================

interface ConversationState {
  studentId: string;
  discordUserId: string;
  messages: ConversationMessage[];
  pendingAttachments: PendingAttachment[];
  lastActivityAt: Date;
}

const conversations = new Map<string, ConversationState>();

// Message queue per student to prevent concurrent processing
const processingLocks = new Map<string, Promise<void>>();

// Accepted file types
const ACCEPTED_MIME_PREFIXES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const ACCEPTED_MIME_EXACT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'application/zip',
];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

function isAcceptedMimeType(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return (
    ACCEPTED_MIME_PREFIXES.some((p) => mimeType.startsWith(p)) ||
    ACCEPTED_MIME_EXACT.includes(mimeType)
  );
}

function getAttachmentType(mimeType: string): PendingAttachment['type'] {
  if (mimeType.startsWith('image/')) return 'image';
  return 'file';
}

// ============================================
// Process a single DM message
// ============================================

async function processDmMessage(message: Message): Promise<void> {
  const userId = message.author.id;

  // Get or create conversation state
  let conv = conversations.get(userId);
  if (!conv) {
    conv = {
      studentId: '', // will be resolved by the agent
      discordUserId: userId,
      messages: [],
      pendingAttachments: [],
      lastActivityAt: new Date(),
    };
    conversations.set(userId, conv);
  }
  conv.lastActivityAt = new Date();

  // Handle file attachments — download to buffer (upload deferred to submission)
  const attachmentInfoParts: string[] = [];
  for (const attachment of message.attachments.values()) {
    const mimeType = attachment.contentType ?? 'application/octet-stream';
    const fileSize = attachment.size;
    const filename = attachment.name ?? 'file';

    // Validate
    if (fileSize > MAX_FILE_SIZE) {
      await message.reply('❌ Файл слишком большой. Максимум 25 МБ. Попробуй сжать или отправить ссылку.');
      return;
    }
    if (!isAcceptedMimeType(mimeType)) {
      await message.reply('❌ Этот формат не поддерживается. Отправь изображение, PDF или ссылку.');
      return;
    }

    try {
      const response = await fetch(attachment.url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());

      const pendingAttachment: PendingAttachment = {
        buffer,
        url: null,
        originalFilename: filename,
        mimeType,
        type: getAttachmentType(mimeType),
        fileSize,
      };
      conv.pendingAttachments.push(pendingAttachment);

      const sizeKB = Math.round(fileSize / 1024);
      attachmentInfoParts.push(`Студент прикрепил файл: ${filename} (${mimeType}, ${sizeKB} КБ). Файл сохранён.`);
    } catch (err) {
      logger.error({ err, filename }, 'Failed to download attachment');
      await message.reply('❌ Ошибка при загрузке файла. Попробуй ещё раз.');
      return;
    }
  }

  // Detect URLs in the message text
  const urlRegex = /https?:\/\/[^\s<>]+/g;
  const urls = message.content.match(urlRegex);
  if (urls) {
    for (const url of urls) {
      conv.pendingAttachments.push({
        buffer: null,
        url,
        originalFilename: url,
        mimeType: 'text/uri-list',
        type: 'url',
        fileSize: 0,
      });
      attachmentInfoParts.push(`Студент отправил ссылку: ${url}`);
    }
  }

  // Add user message to conversation
  const userText = message.content || '(прикрепил файл)';
  conv.messages.push({ role: 'user', content: userText });

  // Trim to last 20 messages
  if (conv.messages.length > 20) {
    conv.messages = conv.messages.slice(-20);
  }

  // Call the DM agent
  try {
    const dmChannel = message.channel as DMChannel;
    await dmChannel.sendTyping();

    const result = await runDmAgent({
      discordUserId: userId,
      messages: conv.messages,
      pendingAttachments: conv.pendingAttachments,
      newAttachmentsInfo: attachmentInfoParts.length > 0 ? attachmentInfoParts.join('\n') : undefined,
    });

    // Add assistant response to conversation
    conv.messages.push({ role: 'assistant', content: result.text });

    // Clear pending attachments if a submission was made
    if (result.submissionId) {
      conv.pendingAttachments = [];

      // Send notification to #админ (fire-and-forget, don't block student response)
      void notifyAdminChannel(result.submissionId, userId).catch((err) => {
        logger.error({ err, submissionId: result.submissionId }, 'Failed to send admin notification');
      });
    }

    // Send response (split if > 2000 chars)
    await sendLongMessage(message, result.text);
  } catch (err) {
    logger.error({ err, userId }, 'DM agent error');
    await message.reply('❌ Произошла ошибка. Попробуй ещё раз через минуту.');
  }
}

// ============================================
// Send long messages (split at 2000 chars)
// ============================================

async function sendLongMessage(message: Message, text: string): Promise<void> {
  const MAX_LENGTH = 2000;
  if (text.length <= MAX_LENGTH) {
    await message.reply(text);
    return;
  }

  // Split on newlines, respecting the limit
  const chunks: string[] = [];
  let current = '';
  for (const line of text.split('\n')) {
    if (current.length + line.length + 1 > MAX_LENGTH) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);

  const dmChannel = message.channel as DMChannel;
  for (const chunk of chunks) {
    await dmChannel.send(chunk);
  }
}

// ============================================
// Notify #админ when a student submits
// ============================================

async function notifyAdminChannel(exerciseId: string, discordUserId: string): Promise<void> {
  const exercise = await getExercise(exerciseId);
  if (!exercise) return;

  const student = await getStudentByDiscordId(discordUserId);
  if (!student) return;

  const session = exercise.session_id ? await getSession(exercise.session_id) : null;
  const attachments = await getAttachmentsByExercise(exerciseId);

  const isResubmission = exercise.submission_count > 1;

  // Find #админ channel
  const adminChannel = discordClient.channels.cache.find(
    (ch) => ch instanceof TextChannel && ch.name === CHANNELS.admin
  ) as TextChannel | undefined;

  if (!adminChannel) {
    logger.warn('Admin channel not found for exercise notification');
    return;
  }

  // Build embed + button
  const embed = formatSubmissionNotification(exercise, session, student.name, attachments, isResubmission);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`review_open_${exerciseId}`)
      .setLabel('Ouvrir la review')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝')
  );

  const msg = await adminChannel.send({ embeds: [embed], components: [row] });

  // Store message ID for later editing (when AI score arrives)
  await updateExercise(exerciseId, { notification_message_id: msg.id });

  logger.info({ exerciseId, messageId: msg.id, isResubmission }, 'Admin notification sent');
}

// ============================================
// Cleanup stale conversations (>30 min inactive)
// ============================================

function cleanupConversations(): void {
  const cutoff = Date.now() - 30 * 60 * 1000;
  let cleaned = 0;
  for (const [userId, conv] of conversations) {
    if (conv.lastActivityAt.getTime() < cutoff) {
      conversations.delete(userId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug({ cleaned }, 'Cleaned up stale DM conversations');
  }
}

// ============================================
// Setup handler
// ============================================

export function setupDmHandler(client: Client): void {
  discordClient = client;

  client.on('messageCreate', async (message: Message) => {
    // Only handle DMs from users (not bots, not guild messages)
    if (message.author.bot && process.env['NODE_ENV'] !== 'test') return;
    if (message.guild !== null) return;

    const userId = message.author.id;

    // Queue: wait for any ongoing processing for this user
    const existingLock = processingLocks.get(userId);
    const currentLock = (existingLock ?? Promise.resolve()).then(async () => {
      await processDmMessage(message);
    }).catch((err) => {
      logger.error({ err, userId }, 'DM processing queue error');
    });

    processingLocks.set(userId, currentLock);

    // Clean up lock when done
    currentLock.finally(() => {
      if (processingLocks.get(userId) === currentLock) {
        processingLocks.delete(userId);
      }
    });
  });

  // Cleanup stale conversations every 5 minutes
  setInterval(cleanupConversations, 5 * 60 * 1000);

  logger.info('DM handler registered');
}

/**
 * Test-only: reset module-level state between tests.
 * Prevents conversation state and processing locks from leaking across test runs.
 */
export function _clearStateForTesting(): void {
  if (process.env['NODE_ENV'] !== 'test') return;
  conversations.clear();
  processingLocks.clear();
}
