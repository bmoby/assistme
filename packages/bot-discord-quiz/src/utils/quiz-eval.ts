import { askClaude } from '@assistme/core';
import type { QuizQuestion } from '@assistme/core';

const EVAL_SYSTEM_PROMPT =
  'Ты — справедливый и снисходительный преподаватель. Оценивай ответы студентов МАКСИМАЛЬНО ЛОЯЛЬНО: принимай синонимы, перефразировки, частичные совпадения, объяснения своими словами, примеры и аналогии. Если студент показывает ПОНИМАНИЕ концепции — даже неточными словами — это правильный ответ. Неправильный ответ — это ТОЛЬКО когда студент явно не понимает тему или отвечает совершенно не по теме. В случае сомнений — ставь правильно. Отвечай JSON: {"isCorrect": boolean, "reasoning": string}';

export interface EvalResult {
  isCorrect: boolean;
  reasoning: string;
}

export async function evaluateOpenAnswer(
  question: QuizQuestion,
  studentAnswer: string
): Promise<EvalResult> {
  const prompt = `Вопрос: ${question.question_text}\nПравильный ответ: ${question.correct_answer}\nОтвет студента: ${studentAnswer}`;

  const raw = await askClaude({
    prompt,
    systemPrompt: EVAL_SYSTEM_PROMPT,
    model: 'opus',
    maxTokens: 256,
    formation: true,
  });

  try {
    const parsed = JSON.parse(raw) as { isCorrect: boolean; reasoning: string };
    return {
      isCorrect: Boolean(parsed.isCorrect),
      reasoning: String(parsed.reasoning),
    };
  } catch {
    return {
      isCorrect: studentAnswer.toLowerCase().includes(question.correct_answer.toLowerCase()),
      reasoning: 'parsing fallback',
    };
  }
}
