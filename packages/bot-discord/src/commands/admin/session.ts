import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ForumChannel,
  ChannelType,
  TextChannel,
} from 'discord.js';
import { logger, createSession, updateSession } from '@vibe-coder/core';
import { isAdmin } from '../../utils/auth.js';
import { CHANNELS, ROLES } from '../../config.js';

export const sessionCommand = new SlashCommandBuilder()
  .setName('session')
  .setDescription('[Admin] Создать сессию (пост в форуме + запись в БД)')
  .addIntegerOption((opt) =>
    opt.setName('номер').setDescription('Номер сессии (1-24)').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('название').setDescription('Название сессии').setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt.setName('модуль').setDescription('Номер модуля (1-6)').setRequired(true)
  );

export async function handleSession(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Команда доступна только тренеру.', ephemeral: true });
    return;
  }

  const sessionNumber = interaction.options.getInteger('номер', true);
  const title = interaction.options.getString('название', true);
  const module = interaction.options.getInteger('модуль', true);

  await interaction.deferReply({ ephemeral: true });

  try {
    // 1. Create session in DB (status = published)
    const session = await createSession({
      session_number: sessionNumber,
      module,
      title,
      status: 'published',
    });

    // 2. Find the Forum channel
    const forumChannel = interaction.guild?.channels.cache.find(
      (ch) => ch.name === CHANNELS.sessions && ch.type === ChannelType.GuildForum
    ) as ForumChannel | undefined;

    let threadId: string | null = null;

    if (forumChannel) {
      const moduleTagName = `Модуль ${module}`;
      const moduleTag = forumChannel.availableTags.find((t) => t.name === moduleTagName);

      const thread = await forumChannel.threads.create({
        name: `Сессия ${sessionNumber} — ${title}`,
        message: {
          content: [
            `📌 **Сессия ${sessionNumber} — ${title}**`,
            `Модуль ${module}`,
            '',
            '🎬 **ВИДЕО К СЕССИИ:**',
            '_(добавить ссылку)_',
            '',
            '📝 **ТЕМА:**',
            '_(добавить описание)_',
            '',
            '📋 **ЗАДАНИЕ:**',
            '_(добавить описание задания)_',
            '⏰ Дедлайн: _(добавить)_',
            '',
            '🔴 **REPLAY:**',
            'Будет добавлен после эфира',
          ].join('\n'),
        },
        appliedTags: moduleTag ? [moduleTag.id] : [],
      });

      threadId = thread.id;
      await updateSession(session.id, { discord_thread_id: threadId });
    } else {
      logger.warn('Forum channel not found — post not created');
    }

    // 3. Announce
    const announcesChannel = interaction.guild?.channels.cache.find(
      (ch) => ch.name === CHANNELS.annonces && ch instanceof TextChannel
    ) as TextChannel | undefined;

    if (announcesChannel) {
      const studentRole = interaction.guild?.roles.cache.find((r) => r.name === ROLES.student);
      const mention = studentRole ? `<@&${studentRole.id}> ` : '';
      await announcesChannel.send(
        `${mention}🆕 **Доступна Сессия ${sessionNumber}!**\n${title}\n\nПосмотри видео и приходи на эфир.`
      );
    }

    const forumNote = forumChannel
      ? `Пост создан в #${CHANNELS.sessions}.`
      : `⚠️ Канал-форум «${CHANNELS.sessions}» не найден.`;

    await interaction.editReply(
      `✅ Сессия ${sessionNumber} «${title}» создана и опубликована.\n${forumNote}`
    );

    logger.info({ sessionNumber, title, module, threadId }, 'Session created');
  } catch (error) {
    logger.error({ error, sessionNumber }, 'Failed to create session');
    await interaction.editReply('❌ Ошибка при создании сессии.');
  }
}
