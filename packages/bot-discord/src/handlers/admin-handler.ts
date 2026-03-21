import { Client, Message, TextChannel, ForumChannel, ChannelType } from 'discord.js';
import { logger, runTsaragAgent } from '@assistme/core';
import type { AdminConversationMessage, DiscordActionCallbacks, PendingAction } from '@assistme/core';
import { isAdmin } from '../utils/auth.js';
import { CHANNELS, ROLES } from '../config.js';

// ============================================
// Conversation state (in-memory)
// ============================================

interface AdminConversationState {
  messages: AdminConversationMessage[];
  pendingAction: PendingAction | null;
  executedActionIds: Set<string>;
  lastActivityAt: Date;
}

const conversations = new Map<string, AdminConversationState>();
const processingLocks = new Map<string, Promise<void>>();

const MAX_MESSAGES = 30;
const CONVERSATION_TTL = 60 * 60 * 1000; // 60 min

// ============================================
// Discord action callbacks
// ============================================

function createDiscordCallbacks(message: Message): DiscordActionCallbacks {
  const guild = message.guild!;

  return {
    sendAnnouncement: async (text: string, mentionStudents: boolean) => {
      const channel = guild.channels.cache.find(
        (ch) => ch.name === CHANNELS.annonces && ch instanceof TextChannel
      ) as TextChannel | undefined;

      if (!channel) {
        throw new Error(`Canal "${CHANNELS.annonces}" non trouve`);
      }

      let finalText = text;
      if (mentionStudents) {
        const studentRole = guild.roles.cache.find((r) => r.name === ROLES.student);
        if (studentRole) {
          finalText = `<@&${studentRole.id}> ${text}`;
        }
      }

      await channel.send(finalText);
    },

    sendToSessionsForum: async (sessionNumber: number, title: string, content: string, module: number) => {
      const forumChannel = guild.channels.cache.find(
        (ch) => ch.name === CHANNELS.sessions && ch.type === ChannelType.GuildForum
      ) as ForumChannel | undefined;

      if (!forumChannel) {
        throw new Error(`Forum "${CHANNELS.sessions}" non trouve`);
      }

      const moduleTagName = `\u041c\u043e\u0434\u0443\u043b\u044c ${module}`;
      const moduleTag = forumChannel.availableTags.find((t) => t.name === moduleTagName);

      const thread = await forumChannel.threads.create({
        name: `\u0421\u0435\u0441\u0441\u0438\u044f ${sessionNumber} \u2014 ${title}`,
        message: { content },
        appliedTags: moduleTag ? [moduleTag.id] : [],
      });

      return thread.id;
    },

    dmStudent: async (discordId: string, dmMessage: string) => {
      try {
        const member = await guild.members.fetch(discordId);
        const dm = await member.createDM();
        await dm.send(dmMessage);
        return true;
      } catch (err) {
        logger.warn({ err, discordId }, 'Could not DM student');
        return false;
      }
    },

    archiveForumThread: async (threadId: string) => {
      const thread = await guild.channels.fetch(threadId);
      if (thread?.isThread()) {
        await thread.setArchived(true);
      }
    },

    unarchiveForumThread: async (threadId: string) => {
      const thread = await guild.channels.fetch(threadId);
      if (thread?.isThread()) {
        await thread.setArchived(false);
      }
    },
  };
}

// ============================================
// Process admin message
// ============================================

async function processAdminMessage(message: Message): Promise<void> {
  const channelId = message.channel.id;

  // Get or create conversation
  let conv = conversations.get(channelId);
  if (!conv) {
    conv = { messages: [], pendingAction: null, executedActionIds: new Set(), lastActivityAt: new Date() };
    conversations.set(channelId, conv);
  }
  conv.lastActivityAt = new Date();

  // Build attachments info (CDN URLs, no upload)
  const attachmentParts: string[] = [];
  for (const attachment of message.attachments.values()) {
    const sizeKB = Math.round(attachment.size / 1024);
    attachmentParts.push(`${attachment.name ?? 'fichier'} (${attachment.contentType ?? 'unknown'}, ${sizeKB} KB) — ${attachment.url}`);
  }

  // Add user message
  const userText = message.content || '(fichier joint)';
  conv.messages.push({ role: 'user', content: userText });

  // Trim to max messages — find a safe cut point (user message)
  // to avoid splitting tool_use/tool_result pairs
  if (conv.messages.length > MAX_MESSAGES) {
    let cutIndex = conv.messages.length - MAX_MESSAGES;
    // Walk forward to the next plain user text message (safe boundary)
    while (cutIndex < conv.messages.length - 1) {
      const msg = conv.messages[cutIndex]!;
      if (msg.role === 'user' && typeof msg.content === 'string') break;
      cutIndex++;
    }
    conv.messages = conv.messages.slice(cutIndex);
  }

  // Send typing + call agent
  try {
    const textChannel = message.channel as TextChannel;
    await textChannel.sendTyping();

    const result = await runTsaragAgent({
      messages: conv.messages,
      attachmentsInfo: attachmentParts.length > 0 ? attachmentParts.join('\n') : undefined,
      discordActions: createDiscordCallbacks(message),
      pendingAction: conv.pendingAction,
      executedActionIds: conv.executedActionIds,
    });

    // Update pending action state
    if (result.pendingConsumed) {
      conv.pendingAction = null;
    }
    if (result.proposedAction) {
      conv.pendingAction = result.proposedAction;
    }

    // Track executed action ID (layer 2 — idempotency)
    if (result.executedActionId) {
      conv.executedActionIds.add(result.executedActionId);
      // Reset conversation to avoid context pollution from previous session
      conv.messages = conv.messages.slice(-4);
    }

    // Store full turn history (layer 1 — tool_use + tool_result + final text)
    for (const msg of result.turnMessages) {
      conv.messages.push(msg);
    }

    // Send response (split if > 2000 chars)
    await sendLongMessage(textChannel, result.text);

    if (result.actionsPerformed.length > 0) {
      logger.info({ actions: result.actionsPerformed }, 'Tsarag admin actions performed');
    }
  } catch (err) {
    logger.error({ err }, 'Tsarag agent error');
    await message.reply('Erreur de traitement. Reessaie.');
  }
}

// ============================================
// Send long messages (split at 2000 chars)
// ============================================

async function sendLongMessage(channel: TextChannel, text: string): Promise<void> {
  const MAX_LENGTH = 2000;
  if (text.length <= MAX_LENGTH) {
    await channel.send(text);
    return;
  }

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

  for (const chunk of chunks) {
    await channel.send(chunk);
  }
}

// ============================================
// Cleanup stale conversations
// ============================================

function cleanupConversations(): void {
  const cutoff = Date.now() - CONVERSATION_TTL;
  let cleaned = 0;
  for (const [id, conv] of conversations) {
    if (conv.lastActivityAt.getTime() < cutoff) {
      conversations.delete(id);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug({ cleaned }, 'Cleaned up stale admin conversations');
  }
}

// ============================================
// Setup handler
// ============================================

export function setupAdminHandler(client: Client): void {
  client.on('messageCreate', async (message: Message) => {
    // Only handle guild messages, not bots, in admin channel
    if (message.author.bot) return;
    if (!message.guild) return;

    const channel = message.channel;
    if (!('name' in channel) || channel.name !== CHANNELS.admin) return;

    // Defense in depth: verify admin role
    if (!isAdmin(message)) return;

    const channelId = message.channel.id;

    // Sequential lock per channel
    const existingLock = processingLocks.get(channelId);
    const currentLock = (existingLock ?? Promise.resolve()).then(async () => {
      await processAdminMessage(message);
    }).catch((err) => {
      logger.error({ err, channelId }, 'Admin processing queue error');
    });

    processingLocks.set(channelId, currentLock);

    currentLock.finally(() => {
      if (processingLocks.get(channelId) === currentLock) {
        processingLocks.delete(channelId);
      }
    });
  });

  // Cleanup every 10 minutes
  setInterval(cleanupConversations, 10 * 60 * 1000);

  logger.info('Admin handler registered');
}
