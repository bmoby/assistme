import {
  Client,
  Message,
  DMChannel,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
} from 'discord.js';
import {
  logger,
  getExercise,
  getSession,
  getStudentByDiscordId,
  getAttachmentsByExercise,
  updateExercise,
  getSupabase,
  getSessionByNumber,
  getExercisesByStudent,
  submitExercise,
  resubmitExercise,
  getExerciseByStudentAndSession,
  addAttachment,
  deleteAttachmentsByExercise,
  deleteStorageFiles,
  getSignedUrlsForExercise,
  createFormationEvent,
} from '@assistme/core';
import { runDmAgent } from '@assistme/core';
import type {
  ConversationMessage,
  PendingAttachment,
  SubmissionIntent,
  Student,
  Session,
  StudentExercise,
} from '@assistme/core';
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

function normalizeMimeType(mimeType: string): string {
  // Strip parameters like "; charset=utf-8"
  const base = mimeType.split(';')[0] ?? mimeType;
  return base.trim().toLowerCase();
}

const EXTENSION_MIME_MAP: Record<string, string> = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.zip': 'application/zip',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

function guessMimeFromFilename(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return EXTENSION_MIME_MAP[ext] ?? 'application/octet-stream';
}

function isAcceptedMimeType(mimeType: string | null): boolean {
  if (!mimeType) return false;
  const normalized = normalizeMimeType(mimeType);
  return (
    ACCEPTED_MIME_PREFIXES.some((p) => normalized.startsWith(p)) ||
    ACCEPTED_MIME_EXACT.includes(normalized)
  );
}

function getAttachmentType(mimeType: string): PendingAttachment['type'] {
  if (mimeType.startsWith('image/')) return 'image';
  return 'file';
}

// ============================================
// Storage upload (moved from dm-agent)
// ============================================

async function uploadFileToStorage(
  buffer: Buffer,
  studentId: string,
  sessionNumber: number,
  filename: string,
  mimeType: string
): Promise<string> {
  const db = getSupabase();

  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${studentId}/session-${sessionNumber}/${timestamp}-${safeName}`;

  // Add charset=utf-8 for text-based files so browsers display Cyrillic correctly
  const isTextBased = mimeType.startsWith('text/') || mimeType === 'application/json';
  const finalContentType = isTextBased ? `${mimeType}; charset=utf-8` : mimeType;

  const { error } = await db.storage
    .from('exercise-submissions')
    .upload(storagePath, buffer, {
      contentType: finalContentType,
      upsert: false,
    });

  if (error) {
    logger.error({ error, storagePath }, 'Failed to upload to Supabase Storage');
    throw error;
  }

  logger.info({ storagePath, size: buffer.length }, 'File uploaded to Supabase Storage');
  return storagePath;
}

// ============================================
// Execute submission after confirm
// ============================================

async function executeSubmission(
  message: Message,
  conv: ConversationState,
  intent: SubmissionIntent,
  student: Student,
  session: Session,
  isResubmission: boolean,
  revisionExercise: StudentExercise | null
): Promise<void> {
  // Upload new files to storage
  const storagePaths: string[] = [];
  for (const attachment of conv.pendingAttachments) {
    if (attachment.buffer && attachment.type !== 'url') {
      const path = await uploadFileToStorage(
        attachment.buffer,
        student.id,
        intent.session_number,
        attachment.originalFilename,
        attachment.mimeType
      );
      storagePaths.push(path);
    }
  }

  const submissionType = conv.pendingAttachments.length > 0
    ? conv.pendingAttachments.map((a) => a.type).join('+')
    : 'text';
  const submissionUrl = conv.pendingAttachments.find((a) => a.type === 'url')?.url ?? '';

  let exercise: StudentExercise;

  if (isResubmission && revisionExercise) {
    // RE-SUBMISSION: delete old attachments, update existing record
    const oldStoragePaths = await deleteAttachmentsByExercise(revisionExercise.id);

    exercise = await resubmitExercise(revisionExercise.id, {
      submission_url: submissionUrl || null,
      submission_type: submissionType,
    });

    // Delete old files from storage (fire-and-forget)
    void deleteStorageFiles(oldStoragePaths).catch((err) => {
      logger.warn({ err, exerciseId: exercise.id }, 'Failed to delete old storage files');
    });

    logger.info(
      { studentId: student.id, sessionNumber: intent.session_number, exerciseId: exercise.id, submissionCount: exercise.submission_count },
      'Exercise re-submitted via DM handler'
    );
  } else {
    // FIRST SUBMISSION: create new record with session_id atomically
    exercise = await submitExercise({
      student_id: student.id,
      session_id: session.id,
      module: session.module,
      exercise_number: session.session_number,
      submission_url: submissionUrl,
      submission_type: submissionType,
    });

    logger.info(
      { studentId: student.id, sessionNumber: intent.session_number, exerciseId: exercise.id, attachments: conv.pendingAttachments.length },
      'Exercise submitted via DM handler'
    );
  }

  // Create attachment records for new files
  let storageIdx = 0;
  for (const attachment of conv.pendingAttachments) {
    if (attachment.type === 'url') {
      await addAttachment({
        exercise_id: exercise.id,
        type: 'url',
        url: attachment.url ?? undefined,
        original_filename: attachment.originalFilename,
        mime_type: attachment.mimeType,
        file_size: attachment.fileSize,
      });
    } else if (attachment.type === 'text') {
      await addAttachment({
        exercise_id: exercise.id,
        type: 'text',
        storage_path: storagePaths[storageIdx],
        original_filename: attachment.originalFilename,
        mime_type: attachment.mimeType,
        file_size: attachment.fileSize,
        text_content: attachment.buffer?.toString('utf-8'),
      });
      storageIdx++;
    } else {
      await addAttachment({
        exercise_id: exercise.id,
        type: attachment.type,
        storage_path: storagePaths[storageIdx],
        original_filename: attachment.originalFilename,
        mime_type: attachment.mimeType,
        file_size: attachment.fileSize,
      });
      storageIdx++;
    }
  }

  // Clear pending attachments
  conv.pendingAttachments = [];

  // Send confirmation to student
  const confirmMsg = isResubmission
    ? '✅ Исправленное задание отправлено на проверку!'
    : '✅ Задание отправлено на проверку!';
  await message.reply(confirmMsg);

  // Fire admin notification (fire-and-forget)
  void notifyAdminChannel(exercise.id, conv.discordUserId).catch((err) => {
    logger.error({ err, exerciseId: exercise.id }, 'Failed to send admin notification');
  });
}

// ============================================
// Handle submission intent: preview-confirm flow
// ============================================

async function handleSubmissionIntent(
  message: Message,
  conv: ConversationState,
  intent: SubmissionIntent,
  _agentText: string
): Promise<void> {
  // Step 1: Resolve student
  const student = await getStudentByDiscordId(conv.discordUserId);
  if (!student) {
    await message.reply('❌ Не удалось найти твой профиль студента. Свяжись с тренером.');
    return;
  }

  // Step 2: Empty submission check (SUB-02, D-07)
  const hasAttachments = conv.pendingAttachments.length > 0;
  const hasComment = (intent.student_comment ?? '').trim().length > 0;
  if (!hasAttachments && !hasComment) {
    await message.reply('❌ Нечего отправлять. Прикрепи файл, ссылку или напиши текст ответа.');
    return;
  }

  // Step 3: Session validation (D-04, UX-02)
  const session = await getSessionByNumber(intent.session_number);
  if (!session || session.status !== 'published') {
    await message.reply(
      `❌ Сессия ${intent.session_number} не найдена или ещё не опубликована. Проверь номер и попробуй снова.`
    );
    return; // Attachments preserved for retry
  }

  // Step 4: Check for active submission (D-06)
  const activeSubmission = await getExerciseByStudentAndSession(student.id, session.id);
  if (activeSubmission) {
    await message.reply('⏳ Задание по этой сессии уже на проверке. Дождись результата.');
    return;
  }

  // Step 5: Check for re-submission eligibility (D-05, D-06, UX-03)
  const allExercises = await getExercisesByStudent(student.id);
  const revisionExercise = allExercises.find(
    (e) =>
      e.session_id === session.id &&
      (e.status === 'revision_needed' || e.status === 'approved')
  ) ?? null;
  const isResubmission = revisionExercise !== null;

  // Step 6: Build preview embed (D-01, UX-01)
  const embed = new EmbedBuilder()
    .setTitle(`📝 Сдача задания — Сессия ${intent.session_number}`)
    .setColor(0x5865F2);

  embed.addFields({
    name: 'Сессия',
    value: `${session.title} (Модуль ${session.module})`,
    inline: true,
  });

  if (intent.student_comment) {
    const excerpt =
      intent.student_comment.length > 200
        ? intent.student_comment.slice(0, 200) + '...'
        : intent.student_comment;
    embed.addFields({ name: 'Комментарий', value: excerpt });
  }

  const files = conv.pendingAttachments.filter((a) => a.type !== 'url');
  if (files.length > 0) {
    const fileList = files
      .map((f) => {
        const sizeKB = Math.round(f.fileSize / 1024);
        return `• ${f.originalFilename} (${sizeKB} КБ)`;
      })
      .join('\n');
    embed.addFields({ name: `Файлы (${files.length})`, value: fileList });
  }

  const links = conv.pendingAttachments.filter((a) => a.type === 'url');
  if (links.length > 0) {
    const linkList = links.map((l) => `• ${l.url}`).join('\n');
    embed.addFields({ name: `Ссылки (${links.length})`, value: linkList });
  }

  if (isResubmission && revisionExercise) {
    embed.setFooter({
      text: `Повторная сдача (попытка ${(revisionExercise.submission_count ?? 0) + 1})`,
    });
  }

  // Step 7: Build buttons (D-01)
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('submission_confirm')
      .setLabel('Soumettre')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId('submission_cancel')
      .setLabel('Annuler')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌')
  );

  // Step 8: Send preview and wait for interaction (D-02)
  const previewMsg = await message.reply({ embeds: [embed], components: [row] });

  const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('submission_confirm')
      .setLabel('Soumettre')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('submission_cancel')
      .setLabel('Annuler')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌')
      .setDisabled(true)
  );

  try {
    const interaction = await previewMsg.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === message.author.id,
      time: 120_000, // 2 minutes per D-02
    });

    if (interaction.customId === 'submission_confirm') {
      await interaction.deferUpdate();
      // Execute submission (writes to DB)
      await executeSubmission(message, conv, intent, student, session, isResubmission, revisionExercise);
      // Disable buttons after confirm
      await previewMsg.edit({ components: [disabledRow] });
    } else {
      // Cancel (D-03, UX-04)
      await interaction.deferUpdate();
      conv.pendingAttachments = [];
      await previewMsg.edit({
        embeds: [embed.setColor(0xed4245).setTitle('❌ Сдача отменена')],
        components: [disabledRow],
      });
      await message.reply('Сдача отменена. Данные очищены.');
    }
  } catch {
    // Timeout (D-02) — buttons disable, attachments stay for retry
    await previewMsg.edit({
      embeds: [embed.setColor(0x95a5a6).setTitle('⏱ Время истекло')],
      components: [disabledRow],
    });
    // Per D-02: pendingAttachments stay so student can retry
  }
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
    const rawMime = attachment.contentType ?? guessMimeFromFilename(attachment.name ?? 'file');
    const mimeType = normalizeMimeType(rawMime);
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

    if (result.submissionIntent) {
      // New flow: show preview-confirm flow (handles all submission logic)
      await handleSubmissionIntent(message, conv, result.submissionIntent, result.text);
    } else if (result.submissionId) {
      // Legacy path (safety fallback — should not happen with new agent)
      conv.pendingAttachments = [];
      void notifyAdminChannel(result.submissionId, userId).catch((err) => {
        logger.error({ err, submissionId: result.submissionId }, 'Failed to send admin notification');
      });
      // Send agent text response
      await sendLongMessage(message, result.text);
    } else {
      // Normal response — send agent text
      await sendLongMessage(message, result.text);
    }
  } catch (err) {
    logger.error({ err, userId }, 'DM agent error');
    // SUB-04: Clear pendingAttachments on error to prevent stale leakage
    if (conv) {
      conv.pendingAttachments = [];
    }
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
  const attachmentsWithUrls = await getSignedUrlsForExercise(exerciseId);

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
  const embed = formatSubmissionNotification(exercise, session, student.name, attachmentsWithUrls, isResubmission);
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
