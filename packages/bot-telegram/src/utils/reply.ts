import type { Context } from 'grammy';
import { InputFile } from 'grammy';
import { textToSpeech, getMemoryEntry, upsertMemory, logger } from '@assistme/core';

const TELEGRAM_MAX_LENGTH = 4096;

// In-memory cache — loaded from DB on first call, toggled by /voice
let voiceModeCache: boolean | null = null;

export async function isVoiceMode(): Promise<boolean> {
  if (voiceModeCache !== null) return voiceModeCache;

  try {
    const entry = await getMemoryEntry('preference', 'voice_responses');
    voiceModeCache = entry?.content === 'true';
  } catch {
    voiceModeCache = false;
  }
  return voiceModeCache;
}

export async function setVoiceMode(enabled: boolean): Promise<void> {
  voiceModeCache = enabled;
  await upsertMemory({
    category: 'preference',
    key: 'voice_responses',
    content: String(enabled),
    source: 'commande_voice',
  });
}

export async function sendLongMessage(ctx: Context, text: string): Promise<void> {
  if (text.length <= TELEGRAM_MAX_LENGTH) {
    await ctx.reply(text);
    return;
  }

  const paragraphs = text.split('\n\n');
  let current = '';

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length + 2 > TELEGRAM_MAX_LENGTH) {
      if (current.trim()) await ctx.reply(current.trim());
      if (paragraph.length > TELEGRAM_MAX_LENGTH) {
        const lines = paragraph.split('\n');
        current = '';
        for (const line of lines) {
          if (current.length + line.length + 1 > TELEGRAM_MAX_LENGTH) {
            if (current.trim()) await ctx.reply(current.trim());
            current = line + '\n';
          } else {
            current += line + '\n';
          }
        }
      } else {
        current = paragraph + '\n\n';
      }
    } else {
      current += paragraph + '\n\n';
    }
  }

  if (current.trim()) await ctx.reply(current.trim());
}

export async function sendVoiceReply(ctx: Context, text: string): Promise<void> {
  if (text.length > 4096) {
    await sendLongMessage(ctx, text);
    return;
  }

  try {
    const audioBuffer = await textToSpeech(text);
    await ctx.replyWithVoice(new InputFile(audioBuffer, 'response.ogg'));
  } catch (error) {
    logger.warn({ err: error instanceof Error ? error.message : error }, 'TTS failed, falling back to text');
    await ctx.reply(text);
  }
}

export async function smartReply(ctx: Context, text: string): Promise<void> {
  const voice = await isVoiceMode();
  if (voice) {
    await sendVoiceReply(ctx, text);
  } else {
    await ctx.reply(text);
  }
}
