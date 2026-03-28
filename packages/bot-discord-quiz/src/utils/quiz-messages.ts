import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { QuizQuestion, StudentQuizAnswer } from '@assistme/core';

const MAX_MSG_LEN = 2000;
const EXPLANATION_HARD_CUT = 120;

export function buildQuestionEmbed(
  q: QuizQuestion,
  questionNumber: number,
  totalQuestions: number
): EmbedBuilder {
  const typeLabel: Record<string, string> = {
    mcq: 'Выбор ответа',
    true_false: 'Правда/Ложь',
    open: 'Открытый вопрос',
  };

  return new EmbedBuilder()
    .setTitle(`Вопрос ${questionNumber}/${totalQuestions}`)
    .setDescription(q.question_text)
    .setColor(0x5865f2)
    .setFooter({ text: typeLabel[q.type] ?? q.type });
}

export function buildMcqRow(
  sessionId: string,
  choices: Record<string, string>
): ActionRowBuilder<ButtonBuilder> {
  const safeChoices = choices as Record<string, string>;
  const row = new ActionRowBuilder<ButtonBuilder>();

  const sortedEntries = Object.entries(safeChoices).sort(([a], [b]) => a.localeCompare(b));

  for (const [key, label] of sortedEntries) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`quiz_answer_${sessionId}_${key}`)
        .setLabel(`${key}: ${label}`)
        .setStyle(ButtonStyle.Primary)
    );
  }

  return row;
}

export function buildTrueFalseRow(sessionId: string): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`quiz_answer_${sessionId}_true`)
      .setLabel('Правда')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`quiz_answer_${sessionId}_false`)
      .setLabel('Ложь')
      .setStyle(ButtonStyle.Danger)
  );

  return row;
}

export function buildOpenQuestionEmbed(
  q: QuizQuestion,
  questionNumber: number,
  totalQuestions: number
): EmbedBuilder {
  return buildQuestionEmbed(q, questionNumber, totalQuestions).addFields({
    name: 'Ответ',
    value: 'Напишите ваш ответ в чат',
    inline: false,
  });
}

export function buildFeedbackMessage(
  answers: StudentQuizAnswer[],
  questions: QuizQuestion[],
  score: number
): string {
  const correct = answers.filter((a) => a.is_correct).length;
  const total = questions.length;

  let header = `**Результат: ${correct}/${total} (${Math.round(score)}%)**\n\n`;
  let body = '';

  for (const q of questions) {
    const ans = answers.find((a) => a.question_id === q.id);

    if (!ans) {
      body += `⬜ Вопрос ${q.question_number}: пропущен\n`;
      continue;
    }

    if (ans.is_correct) {
      body += `✅ **Q${q.question_number}:** ${ans.student_answer}\n`;
    } else {
      let line = `❌ **Q${q.question_number}:** ${ans.student_answer}\n> Правильно: ${q.correct_answer}`;

      if (q.explanation && q.explanation.length > 0) {
        let explanation = q.explanation;
        if (explanation.length > EXPLANATION_HARD_CUT) {
          explanation = explanation.slice(0, EXPLANATION_HARD_CUT) + '...';
        }
        line += `\n> ${explanation}`;
      }

      body += line + '\n';
    }
  }

  const full = header + body;

  if (full.length <= MAX_MSG_LEN) {
    return full;
  }

  // Truncate body at last newline before limit
  const limit = MAX_MSG_LEN - header.length - 3; // 3 for "..."
  const truncatedBody = body.slice(0, limit);
  const lastNewline = truncatedBody.lastIndexOf('\n');
  const cutBody = lastNewline > 0 ? truncatedBody.slice(0, lastNewline) : truncatedBody;

  return header + cutBody + '...';
}
