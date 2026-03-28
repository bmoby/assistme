import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { logger, createQuiz, createQuizQuestion, updateQuizStatus, getActiveStudents, createQuizSession } from '@assistme/core';
import { parseQuizFromTxt } from '../ai/parse-quiz.js';
import type { ParsedQuiz, ParsedQuizQuestion } from '../ai/parse-quiz.js';
import { isAdmin } from '../utils/auth.js';
import { registerButton } from '../handlers/index.js';

// ============================================
// Slash command definition
// ============================================

export const quizCreateCommand = new SlashCommandBuilder()
  .setName('quiz-create')
  .setDescription('Creer un quiz pour une session a partir d\'un fichier TXT')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addIntegerOption((opt) =>
    opt.setName('session').setDescription('Numero de session (ex: 2)').setRequired(true)
  )
  .addAttachmentOption((opt) =>
    opt.setName('fichier').setDescription('Fichier TXT contenant les questions du quiz').setRequired(true)
  );

// ============================================
// In-memory pending store (TTL 5 min)
// ============================================

interface PendingQuizData {
  parsed: ParsedQuiz;
  txtContent: string;
  sessionNumber: number;
  expiresAt: number;
}

const pendingQuizzes = new Map<string, PendingQuizData>();

const PENDING_TTL_MS = 5 * 60 * 1000;

function storePending(adminId: string, sessionNumber: number, parsed: ParsedQuiz, txtContent: string): string {
  const key = `${adminId}_${sessionNumber}`;
  // Clear any previous pending for this key
  pendingQuizzes.delete(key);

  pendingQuizzes.set(key, {
    parsed,
    txtContent,
    sessionNumber,
    expiresAt: Date.now() + PENDING_TTL_MS,
  });

  setTimeout(() => {
    pendingQuizzes.delete(key);
  }, PENDING_TTL_MS);

  return key;
}

function consumePending(key: string): PendingQuizData | null {
  const data = pendingQuizzes.get(key);
  if (!data) return null;
  pendingQuizzes.delete(key);
  if (Date.now() > data.expiresAt) return null;
  return data;
}

// ============================================
// Preview description builder
// ============================================

const TYPE_LABELS: Record<ParsedQuizQuestion['type'], string> = {
  mcq: 'QCM',
  true_false: 'V/F',
  open: 'Ouverte',
};

const MAX_DESCRIPTION_LENGTH = 3800;

function buildPreviewDescription(parsed: ParsedQuiz): string {
  const lines: string[] = [];
  let currentLength = 0;

  for (let i = 0; i < parsed.questions.length; i++) {
    const q = parsed.questions[i]!;
    const typeLabel = TYPE_LABELS[q.type];

    let block = `**Q${q.question_number} [${typeLabel}]** ${q.question_text}`;

    // Add choices for MCQ
    if (q.type === 'mcq' && q.choices) {
      const choiceParts = Object.entries(q.choices).map(([key, val]) => `${key}) ${val}`);
      block += `\n${choiceParts.join(' \u00b7 ')}`;
    }

    // Add correct answer and explanation
    const explanationPart = q.explanation ? ` | ${q.explanation}` : '';
    block += `\n> Reponse: ${q.correct_answer}${explanationPart}`;

    const blockWithNewline = block + '\n';

    if (currentLength + blockWithNewline.length > MAX_DESCRIPTION_LENGTH) {
      const remaining = parsed.questions.length - i;
      lines.push(`*(+ ${remaining} questions non affichees -- parsing complet confirme)*`);
      break;
    }

    lines.push(block);
    currentLength += blockWithNewline.length;
  }

  return lines.join('\n\n');
}

// ============================================
// Helper: build disabled button row
// ============================================

function buildDisabledRow(adminId: string, sessionNumber: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`quiz_confirm_${adminId}_${sessionNumber}`)
      .setLabel('Confirmer l\'envoi')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`quiz_cancel_${adminId}_${sessionNumber}`)
      .setLabel('Annuler l\'envoi')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true),
  );
}

// ============================================
// Main handler
// ============================================

export async function handleQuizCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  // Step 1: Auth check
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Commande reservee au formateur.', ephemeral: true });
    return;
  }

  // Step 2: Defer FIRST (3 second window)
  await interaction.deferReply({ ephemeral: true });

  const sessionNumber = interaction.options.getInteger('session', true);
  const attachment = interaction.options.getAttachment('fichier', true);

  // Step 3: Validate attachment is TXT
  if (!attachment.name?.endsWith('.txt') && !attachment.contentType?.startsWith('text/')) {
    const ext = attachment.name?.split('.').pop() ?? 'inconnu';
    await interaction.editReply(`Le fichier doit etre un .txt (recu: ${ext}).`);
    return;
  }

  // Step 3b: Validate file size (max 512KB)
  const MAX_TXT_SIZE_BYTES = 512 * 1024;
  if (attachment.size > MAX_TXT_SIZE_BYTES) {
    await interaction.editReply('Le fichier est trop volumineux (max 512 Ko).');
    return;
  }

  // Step 4: Download TXT
  let txtContent: string;
  try {
    const response = await fetch(attachment.url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    txtContent = await response.text();
  } catch (error) {
    logger.error({ error, attachmentUrl: attachment.url }, 'Failed to download quiz TXT');
    await interaction.editReply('Erreur lors du telechargement du fichier.');
    return;
  }

  if (!txtContent.trim()) {
    await interaction.editReply('Le fichier est vide.');
    return;
  }

  // Step 5: Parse via Claude
  let parsed: ParsedQuiz;
  try {
    parsed = await parseQuizFromTxt(txtContent, sessionNumber);
  } catch (error) {
    logger.error({ error, sessionNumber }, 'Quiz TXT parsing failed');
    await interaction.editReply('Impossible de parser le fichier. Verifiez le format et reessayez.');
    return;
  }

  // Step 6: Store pending + build preview
  const pendingKey = storePending(interaction.user.id, sessionNumber, parsed, txtContent);

  const embed = new EmbedBuilder()
    .setTitle(`Quiz \u2014 Session ${sessionNumber}`)
    .setColor(0x5865F2)
    .setDescription(buildPreviewDescription(parsed))
    .setFooter({ text: `${parsed.questions.length} questions \u2022 Verifiez le parsing avant de confirmer` });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`quiz_confirm_${interaction.user.id}_${sessionNumber}`)
      .setLabel('Confirmer l\'envoi')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`quiz_cancel_${interaction.user.id}_${sessionNumber}`)
      .setLabel('Annuler l\'envoi')
      .setStyle(ButtonStyle.Danger),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

// ============================================
// Button handler: Confirm
// ============================================

async function handleQuizConfirm(interaction: ButtonInteraction): Promise<void> {
  // Extract adminUserId and sessionNumber from customId: quiz_confirm_{adminId}_{sessionNumber}
  const parts = interaction.customId.replace('quiz_confirm_', '').split('_');
  const adminId = parts.slice(0, -1).join('_');
  const sessionNumber = parseInt(parts.at(-1) ?? '0', 10);
  const pendingKey = `${adminId}_${sessionNumber}`;

  const pending = consumePending(pendingKey);
  if (!pending) {
    await interaction.reply({ content: 'Donnees expirees, relancez /quiz-create.', ephemeral: true });
    return;
  }

  // Disable both buttons
  const disabledRow = buildDisabledRow(adminId, sessionNumber);
  await interaction.update({ components: [disabledRow] });

  try {
    // Write quiz to DB as draft (activated after all questions are inserted)
    const quiz = await createQuiz({
      session_number: pending.sessionNumber,
      status: 'draft',
      questions_data: { questions: pending.parsed.questions },
      original_txt: pending.txtContent,
    });

    // Write each question to DB
    for (const q of pending.parsed.questions) {
      await createQuizQuestion({
        quiz_id: quiz.id,
        question_number: q.question_number,
        type: q.type,
        question_text: q.question_text,
        choices: q.choices,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      });
    }

    // All questions inserted — activate the quiz
    await updateQuizStatus(quiz.id, 'active');

    // Fetch active students with Discord IDs
    const students = await getActiveStudents();
    const discordStudents = students.filter((s) => s.discord_id !== null);

    if (discordStudents.length === 0) {
      const infoEmbed = new EmbedBuilder()
        .setTitle(`Quiz \u2014 Session ${sessionNumber}`)
        .setColor(0x5865F2)
        .setDescription('Aucun etudiant actif trouve. Le quiz a ete cree mais n\'a pas ete envoye.');
      await interaction.editReply({ embeds: [infoEmbed], components: [disabledRow] });
      return;
    }

    // Dispatch DMs to students in batches to avoid Discord rate limits (~5 DMs/sec)
    const BATCH_SIZE = 5;
    const BATCH_DELAY_MS = 1500;
    const results: PromiseSettledResult<string>[] = [];

    for (let i = 0; i < discordStudents.length; i += BATCH_SIZE) {
      const batch = discordStudents.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (student) => {
          const session = await createQuizSession({
            student_id: student.id,
            quiz_id: quiz.id,
          });

          const member = await interaction.guild!.members.fetch(student.discord_id!);
          const dm = await member.createDM();

          const studentEmbed = new EmbedBuilder()
            .setTitle(`\u0422\u0435\u0441\u0442 \u2014 \u0421\u0435\u0441\u0441\u0438\u044F ${sessionNumber}`)
            .setDescription(pending.parsed.title)
            .setColor(0x5865F2)
            .setFooter({ text: '\u041E\u0442\u0432\u0435\u0442\u044C\u0442\u0435 \u043D\u0430 \u0432\u0441\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B. \u041C\u043E\u0436\u043D\u043E \u043F\u0440\u0435\u0440\u0432\u0430\u0442\u044C\u0441\u044F \u0438 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u043F\u043E\u0437\u0436\u0435.' });

          const startRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`quiz_start_${session.id}`)
              .setLabel('\u041D\u0430\u0447\u0430\u0442\u044C \u0442\u0435\u0441\u0442')
              .setStyle(ButtonStyle.Primary),
          );

          await dm.send({ embeds: [studentEmbed], components: [startRow] });
          return student.id;
        })
      );

      results.push(...batchResults);

      // Wait between batches (skip delay after last batch)
      if (i + BATCH_SIZE < discordStudents.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    const delivered = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Log failed student IDs
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const student = discordStudents[i];
        logger.warn(
          { studentId: student?.id, discordId: student?.discord_id, error: r.reason },
          'Failed to deliver quiz DM to student'
        );
      }
    });

    if (failed === 0) {
      // All delivered - success
      const successEmbed = new EmbedBuilder()
        .setTitle('Quiz cree et envoye')
        .setColor(0x57F287)
        .setDescription(`Session ${sessionNumber} \u2022 ${pending.parsed.questions.length} questions \u2022 ${delivered} etudiants contactes`);
      await interaction.editReply({ embeds: [successEmbed], components: [disabledRow] });
    } else {
      // Partial failure - warning
      const warningEmbed = new EmbedBuilder()
        .setTitle('Quiz cree et envoye')
        .setColor(0xFEE75C)
        .setDescription(
          `Session ${sessionNumber} \u2022 ${delivered} etudiants contactes \u2022 ${failed} echecs (DMs fermes) \u2014 voir /quiz-status pour detail`
        );
      await interaction.editReply({ embeds: [warningEmbed], components: [disabledRow] });
    }

    logger.info(
      { quizId: quiz.id, sessionNumber, delivered, failed, totalQuestions: pending.parsed.questions.length },
      'Quiz created and dispatched'
    );
  } catch (error) {
    logger.error({ error, sessionNumber }, 'Failed to confirm and dispatch quiz');
    await interaction.editReply({ content: 'Erreur lors de la creation du quiz.', components: [disabledRow] });
  }
}

// ============================================
// Button handler: Cancel
// ============================================

async function handleQuizCancel(interaction: ButtonInteraction): Promise<void> {
  // Extract adminUserId and sessionNumber from customId: quiz_cancel_{adminId}_{sessionNumber}
  const parts = interaction.customId.replace('quiz_cancel_', '').split('_');
  const adminId = parts.slice(0, -1).join('_');
  const sessionNumber = parseInt(parts.at(-1) ?? '0', 10);
  const pendingKey = `${adminId}_${sessionNumber}`;

  // Clean up pending data
  consumePending(pendingKey);

  // Disable both buttons
  const disabledRow = buildDisabledRow(adminId, sessionNumber);
  await interaction.update({
    content: 'Quiz annule. Vous pouvez re-uploader un TXT corrige.',
    embeds: [],
    components: [disabledRow],
  });
}

// ============================================
// Register button handlers at module level
// ============================================

registerButton('quiz_confirm_', handleQuizConfirm);
registerButton('quiz_cancel_', handleQuizCancel);
