import { Client, TextChannel } from 'discord.js';

/**
 * Discord bots cannot DM other bots (API limitation).
 * This helper emits a synthetic 'messageCreate' event on the devBot client
 * with guild=null (so dm-handler treats it as a DM) but uses a real guild
 * channel for replies (so channel.send() actually delivers to Discord).
 *
 * The test can then waitForMessage on that reply channel.
 */
export interface FakeDmOptions {
  content: string;
  authorId: string;
  devBot: Client;
  replyChannel: TextChannel;
  attachments?: Array<{ id: string; name: string; url: string; contentType: string; size: number }>;
}

export function emitFakeDm(options: FakeDmOptions): void {
  const { content, authorId, devBot, replyChannel, attachments = [] } = options;

  const attachmentMap = new Map<string, object>();
  for (const att of attachments) {
    attachmentMap.set(att.id, att);
  }

  const fakeMessage = {
    id: `fake-${Date.now()}`,
    content,
    author: {
      id: authorId,
      bot: true,
      displayName: 'E2E Test Student',
      username: 'e2e-test-student',
      send: replyChannel.send.bind(replyChannel),
    },
    guild: null,
    channel: {
      id: replyChannel.id,
      type: 1, // ChannelType.DM
      send: replyChannel.send.bind(replyChannel),
      sendTyping: () => Promise.resolve(),
      messages: {
        fetch: () => Promise.resolve(new Map()),
      },
    },
    member: null,
    attachments: attachmentMap,
    reference: null,
    reply: (msg: string | object) => replyChannel.send(msg),
    react: () => Promise.resolve(),
    createdTimestamp: Date.now(),
  };

  devBot.emit('messageCreate', fakeMessage as never);
}
