import { askClaude } from '@assistme/core';
import type { QuizQuestion } from '@assistme/core';

const EVAL_SYSTEM_PROMPT =
  'Ты — строгий, но справедливый преподаватель. Оценивай ответы студентов семантически: принимай синонимы, перефразировки и частичные совпадения если основная идея верна. Только полностью неверные или нерелевантные ответы считаются неправильными. Отвечай JSON: {"isCorrect": boolean, "reasoning": string}';

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
    model: 'sonnet',
    maxTokens: 256,
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
