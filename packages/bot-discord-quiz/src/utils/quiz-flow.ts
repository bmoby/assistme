import { updateQuizSession, getAnswersBySession, logger } from '@assistme/core';
import type { StudentQuizSession, QuizQuestion } from '@assistme/core';
import type { DMChannel, TextChannel, NewsChannel, ThreadChannel } from 'discord.js';
import {
  buildQuestionEmbed,
  buildMcqRow,
  buildTrueFalseRow,
  buildOpenQuestionEmbed,
  buildFeedbackMessage,
} from './quiz-messages.js';

// Quiz bot only sends to DMs and text channels — PartialGroupDMChannel excluded
type SendableChannel = DMChannel | TextChannel | NewsChannel | ThreadChannel;

export async function sendQuestion(
  dmChannel: SendableChannel,
  session: StudentQuizSession,
  question: QuizQuestion,
  totalQuestions: number
): Promise<void> {
  const displayNumber = session.current_question + 1;

  if (question.type === 'mcq') {
    const embed = buildQuestionEmbed(question, displayNumber, totalQuestions);
    const row = buildMcqRow(session.id, question.choices as Record<string, string>);
    await dmChannel.send({ embeds: [embed], components: [row] });
  } else if (question.type === 'true_false') {
    const embed = buildQuestionEmbed(question, displayNumber, totalQuestions);
    const row = buildTrueFalseRow(session.id);
    await dmChannel.send({ embeds: [embed], components: [row] });
  } else {
    // open question — student types text, no buttons
    const embed = buildOpenQuestionEmbed(question, displayNumber, totalQuestions);
    await dmChannel.send({ embeds: [embed] });
  }
}

export async function advanceOrComplete(
  userId: string,
  session: StudentQuizSession,
  questions: QuizQuestion[],
  dmChannel: SendableChannel
): Promise<StudentQuizSession | null> {
  const nextIndex = session.current_question + 1;

  if (nextIndex >= questions.length) {
    // Quiz complete
    const answers = await getAnswersBySession(session.id);
    const correctCount = answers.filter((a) => a.is_correct).length;
    const score = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;

    await updateQuizSession(session.id, {
      status: 'completed',
      score,
      completed_at: new Date().toISOString(),
    });

    const feedback = buildFeedbackMessage(answers, questions, score);
    await dmChannel.send(feedback);

    logger.info({ userId, sessionId: session.id, score }, 'Quiz completed');
    return null;
  } else {
    // Advance to next question
    const updatedSession = await updateQuizSession(session.id, {
      current_question: nextIndex,
    });

    const nextQ = questions[nextIndex];
    if (!nextQ) {
      logger.error({ userId, sessionId: session.id, nextIndex }, 'Next question not found — questions array may be inconsistent');
      return null;
    }
    await sendQuestion(dmChannel, updatedSession, nextQ, questions.length);

    return updatedSession;
  }
}
