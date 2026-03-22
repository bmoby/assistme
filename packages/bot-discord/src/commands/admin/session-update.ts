import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ForumChannel,
  ChannelType,
  TextChannel,
} from 'discord.js';
import { logger, getSessionByNumber, updateSession, createMeetEvent } from '@assistme/core';
import { isAdmin } from '../../utils/auth.js';
import { CHANNELS, ROLES } from '../../config.js';

export const sessionUpdateCommand = new SlashCommandBuilder()
  .setName('session-update')
  .setDescription('[Admin] Обновить данные сессии (задание, дедлайн, видео)')
  .addIntegerOption((opt) =>
    opt.setName('номер').setDescription('Номер сессии').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('задание').setDescription('Описание задания').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('формат').setDescription('Ожидаемый формат (image, url, document, text)').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('дедлайн').setDescription('Сдать до (JJ/MM/AAAA HH:MM или YYYY-MM-DD)').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('live').setDescription('Дата live (JJ/MM/AAAA HH:MM)').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('название').setDescription('Название сессии').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('тема').setDescription('Описание темы сессии').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('видео').setDescription('Ссылка на видео к сессии').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('replay').setDescription('Ссылка на запись эфира').setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName('советы').setDescription('Советы по выполнению задания').setRequired(false)
  )
  .addStringOption((opt) =>
    opt
      .setName('статус')
      .setDescription('Статус сессии')
      .setRequired(false)
      .addChoices(
        { name: 'draft', value: 'draft' },
        { name: 'published', value: 'published' },
        { name: 'completed', value: 'completed' }
      )
  );

export async function handleSessionUpdate(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Команда доступна только тренеру.', ephemeral: true });
    return;
  }

  const sessionNumber = interaction.options.getInteger('номер', true);
  const exerciseDescription = interaction.options.getString('задание');
  const expectedDeliverables = interaction.options.getString('формат');
  const deadline = interaction.options.getString('дедлайн');
  const liveAt = interaction.options.getString('live');
  const title = interaction.options.getString('название');
  const description = interaction.options.getString('тема');
  const videoUrl = interaction.options.getString('видео');
  const replayUrl = interaction.options.getString('replay');
  const exerciseTips = interaction.options.getString('советы');
  const status = interaction.options.getString('статус');

  // Check that at least one field is provided
  if (!exerciseDescription && !expectedDeliverables && !deadline && !liveAt && !title && !description && !videoUrl && !replayUrl && !exerciseTips && !status) {
    await interaction.reply({
      content: 'Укажи хотя бы одно поле для обновления.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const session = await getSessionByNumber(sessionNumber);
    if (!session) {
      await interaction.editReply({
        content: `Сессия ${sessionNumber} не найдена.`,
      });
      return;
    }

    // Build updates
    const updates: Record<string, unknown> = {};
    const changes: string[] = [];

    if (exerciseDescription) {
      updates.exercise_description = exerciseDescription;
      changes.push('задание');
    }
    if (expectedDeliverables) {
      updates.expected_deliverables = expectedDeliverables;
      changes.push('формат');
    }
    if (deadline) {
      // Parse deadline — accept JJ/MM/AAAA HH:MM or YYYY-MM-DD(THH:MM)
      // Admin is in Bangkok (UTC+7), interpret as Bangkok local time
      const ddmmMatch = deadline.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
      let isoUtc: string;
      if (ddmmMatch) {
        const [, dd, mm, yyyy, hh, min] = ddmmMatch;
        isoUtc = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00+07:00`).toISOString();
      } else {
        const deadlineDate = deadline.includes('T') ? deadline : `${deadline}T20:00:00`;
        const withTz = /[Zz]$/.test(deadlineDate) || /[+-]\d{2}:\d{2}$/.test(deadlineDate)
          ? deadlineDate : `${deadlineDate}+07:00`;
        isoUtc = new Date(withTz).toISOString();
      }
      updates.deadline = isoUtc;
      changes.push('дедлайн');
    }
    if (liveAt) {
      const ddmmMatch = liveAt.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
      let liveIso: string;
      if (ddmmMatch) {
        const [, dd, mm, yyyy, hh, min] = ddmmMatch;
        liveIso = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00+07:00`).toISOString();
      } else {
        const withTz = /[Zz]$/.test(liveAt) || /[+-]\d{2}:\d{2}$/.test(liveAt)
          ? liveAt : (liveAt.includes('T') ? liveAt : `${liveAt}T20:00:00`) + '+07:00';
        liveIso = new Date(withTz).toISOString();
      }
      updates.live_at = liveIso;
      changes.push('live');

      // Auto-generate Google Meet link only if date changed or no link exists
      const dateChanged = session.live_at !== liveIso;
      if (dateChanged || !session.live_url) {
        try {
          const sessionTitle = title ?? session.title;
          const { meetUrl } = await createMeetEvent(
            `Session ${sessionNumber} — ${sessionTitle}`,
            liveIso
          );
          updates.live_url = meetUrl;
          changes.push(`meet (${meetUrl})`);
        } catch (meetError) {
          logger.warn({ error: meetError }, 'Failed to create Google Meet link — skipping');
        }
      }
    }
    if (title) {
      updates.title = title;
      changes.push('название');
    }
    if (description) {
      updates.description = description;
      changes.push('тема');
    }
    if (videoUrl) {
      updates.pre_session_video_url = videoUrl;
      changes.push('видео');
    }
    if (replayUrl) {
      updates.replay_url = replayUrl;
      changes.push('replay');
    }
    if (exerciseTips) {
      updates.exercise_tips = exerciseTips;
      changes.push('советы');
    }

    if (status) {
      updates.status = status;
      changes.push(`статус → ${status}`);
    }

    await updateSession(session.id, updates);

    // If publishing a draft → create forum thread + announce
    const isPublishing = status === 'published' && session.status !== 'published';
    if (isPublishing && !session.discord_thread_id) {
      const sessionTitle = (title ?? session.title);
      const sessionModule = session.module;

      // Create forum thread
      const forumChannel = interaction.guild?.channels.cache.find(
        (ch) => ch.name === CHANNELS.sessions && ch.type === ChannelType.GuildForum
      ) as ForumChannel | undefined;

      if (forumChannel) {
        const moduleTagName = `Модуль ${sessionModule}`;
        const moduleTag = forumChannel.availableTags.find((t) => t.name === moduleTagName);

        const liveUrl = (updates.live_url as string) ?? session.live_url;
        const liveSection = liveUrl
          ? `[Присоединиться к live](${liveUrl})`
          : '_(ссылка будет добавлена)_';

        const thread = await forumChannel.threads.create({
          name: `Сессия ${sessionNumber} — ${sessionTitle}`,
          message: {
            content: [
              `📌 **Сессия ${sessionNumber} — ${sessionTitle}**`,
              `Модуль ${sessionModule}`,
              '',
              '🎬 **ВИДЕО К СЕССИИ:**',
              session.pre_session_video_url ?? '_(добавить ссылку)_',
              '',
              '📝 **ТЕМА:**',
              session.description ?? '_(добавить описание)_',
              '',
              '📋 **ЗАДАНИЕ:**',
              session.exercise_description ?? '_(добавить описание задания)_',
              `📅 Сдать задание до: ${session.deadline ? new Date(session.deadline).toLocaleDateString('ru-RU') : '_(добавить)_'}`,
              '',
              `🔴 **LIVE:**`,
              liveSection,
              '',
              '🎥 **REPLAY:**',
              '_(будет добавлен после эфира)_',
            ].join('\n'),
          },
          appliedTags: moduleTag ? [moduleTag.id] : [],
        });

        await updateSession(session.id, { discord_thread_id: thread.id });
        changes.push('форум');
      }

      // Post announcement
      const announcesChannel = interaction.guild?.channels.cache.find(
        (ch) => ch.name === CHANNELS.annonces && ch instanceof TextChannel
      ) as TextChannel | undefined;

      if (announcesChannel) {
        const studentRole = interaction.guild?.roles.cache.find((r) => r.name === ROLES.student);
        const mention = studentRole ? `<@&${studentRole.id}> ` : '';
        await announcesChannel.send(
          `${mention}🆕 **Доступна Сессия ${sessionNumber}!**\n${sessionTitle}\n\nПосмотри видео к сессии. Ссылка на live будет в посте сессии.`
        );
        changes.push('анонс');
      }
    }

    await interaction.editReply({
      content: `✅ Сессия ${sessionNumber} обновлена: ${changes.join(', ')}.`,
    });

    logger.info({ sessionNumber, changes }, 'Session updated');
  } catch (error) {
    logger.error({ error, sessionNumber }, 'Failed to update session');
    await interaction.editReply({ content: '❌ Ошибка при обновлении сессии.' });
  }
}
