import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { QuizQuestion, StudentQuizAnswer } from '@assistme/core';

const MAX_MSG_LEN = 2000;
const EXPLANATION_HARD_CUT = 120;
const MAX_BUTTON_LABEL = 80;

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

  let description = q.question_text;

  // For MCQ, append choices to the embed so buttons can stay short
  if (q.type === 'mcq' && q.choices) {
    const choiceLines = Object.entries(q.choices as Record<string, string>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `**${key}.** ${val}`);
    description += '\n\n' + choiceLines.join('\n');
  }

  return new EmbedBuilder()
    .setTitle(`Вопрос ${questionNumber}/${totalQuestions}`)
    .setDescription(description)
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
        .setLabel(key)
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

export function buildFeedbackMessages(
  answers: StudentQuizAnswer[],
  questions: QuizQuestion[],
  score: number
): string[] {
  const correct = answers.filter((a) => a.is_correct).length;
  const total = questions.length;

  const header = `**Результат: ${correct}/${total} (${Math.round(score)}%)**\n\n`;

  const lines: string[] = [];

  for (const q of questions) {
    const ans = answers.find((a) => a.question_id === q.id);

    if (!ans) {
      lines.push(`⬜ Вопрос ${q.question_number}: пропущен`);
      continue;
    }

    if (ans.is_correct) {
      lines.push(`✅ **Q${q.question_number}:** ${ans.student_answer}`);
    } else {
      let correctDisplay = q.correct_answer;
      if (q.type === 'mcq' && q.choices) {
        const choiceText = (q.choices as Record<string, string>)[q.correct_answer];
        if (choiceText) {
          correctDisplay = `${q.correct_answer}) ${choiceText}`;
        }
      }

      let line = `❌ **Q${q.question_number}:** ${ans.student_answer}\n> Правильно: ${correctDisplay}`;

      if (q.explanation && q.explanation.length > 0) {
        let explanation = q.explanation;
        if (explanation.length > EXPLANATION_HARD_CUT) {
          explanation = explanation.slice(0, EXPLANATION_HARD_CUT) + '...';
        }
        line += `\n> ${explanation}`;
      }

      lines.push(line);
    }
  }

  // Split lines into chunks that fit Discord's 2000-char limit
  const messages: string[] = [];
  let current = header;

  for (const line of lines) {
    const candidate = current + line + '\n';
    if (candidate.length > MAX_MSG_LEN) {
      messages.push(current);
      current = line + '\n';
    } else {
      current = candidate;
    }
  }

  if (current.length > 0) {
    messages.push(current);
  }

  return messages;
}
