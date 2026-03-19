import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../logger.js';
import {
  getStudentByDiscordId,
  getExercisesByStudent,
  getPublishedSessions,
  getSessionByNumber,
  addAttachment,
  createFormationEvent,
  searchFormationKnowledge,
} from '../../db/formation/index.js';
import { submitExercise } from '../../db/formation/exercises.js';
import { getEmbedding } from '../embeddings.js';
import type { Student, Session, StudentExercise, AttachmentType } from '../../types/index.js';

// ============================================
// Types
// ============================================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PendingAttachment {
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  type: AttachmentType;
}

export interface DmAgentContext {
  discordUserId: string;
  messages: ConversationMessage[];
  pendingAttachments: PendingAttachment[];
  /** Info about files the user just sent (appended to the user message for Claude) */
  newAttachmentsInfo?: string;
}

export interface DmAgentResponse {
  text: string;
  /** If the agent created a submission, its ID */
  submissionId?: string;
}

// ============================================
// System prompt
// ============================================

const SYSTEM_PROMPT = `Ты — ассистент обучения «Pilote Neuro». Говори только на русском.
Помогаешь студентам сдавать задания, смотреть прогресс, отвечаешь на вопросы об обучении.

ТОН:
- Доброжелательный и ободряющий
- Краткий и чёткий, без лишней воды
- На «ты»

ТЫ ДЕЛАЕШЬ:
- Помогаешь студенту сдать задание (спрашиваешь какую сессию, просишь прикрепить файлы/ссылки)
- Рассказываешь, что именно нужно сдать (формат, содержание) — берёшь из описания сессии
- Подтверждаешь, когда задание отправлено
- Показываешь прогресс (какие сессии сданы, какие нет)
- Передаёшь отзывы тренера
- Отвечаешь на вопросы о процессе обучения
- Объясняешь концепции из уроков (аналогии, архитектура, инструменты) — ищешь в материалах курса

ТЫ НЕ ДЕЛАЕШЬ:
- Не даёшь ответы на задания
- Не делишься информацией о других студентах
- Не обсуждаешь темы вне обучения (финансы, политика, личная жизнь)
- Не рассказываешь о внутренней технической системе (БД, код, архитектура)
- Не изменяешь данные без явного подтверждения студента

ПРАВИЛА СДАЧИ:
- Всегда уточни для какой сессии задание, если студент не сказал
- Перед отправкой покажи, что будет отправлено, и спроси подтверждение
- Если формат файла не совпадает с ожидаемым (expected_deliverables), предупреди, но не блокируй
- Если задание по этой сессии уже одобрено, сообщи об этом`;

// ============================================
// Tool definitions
// ============================================

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'get_student_progress',
    description: 'Получить профиль и прогресс текущего студента. Вызывай, когда студент спрашивает о своём прогрессе или когда нужно узнать, какие сессии он ещё не сдал.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_session_exercise',
    description: 'Получить детали задания конкретной сессии. Вызывай, когда нужно рассказать студенту, что нужно сдать.',
    input_schema: {
      type: 'object' as const,
      properties: {
        session_number: {
          type: 'integer',
          description: 'Номер сессии (1-24)',
        },
      },
      required: ['session_number'],
    },
  },
  {
    name: 'create_submission',
    description: 'Создать сдачу задания. Вызывай ТОЛЬКО после того, как собрал все файлы/ссылки/текст и получил подтверждение от студента.',
    input_schema: {
      type: 'object' as const,
      properties: {
        session_number: {
          type: 'integer',
          description: 'Номер сессии',
        },
        student_comment: {
          type: 'string',
          description: 'Комментарий студента к заданию (если есть)',
        },
      },
      required: ['session_number'],
    },
  },
  {
    name: 'get_pending_feedback',
    description: 'Посмотреть последние проверки (ИИ или тренер), которые студент ещё не видел.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'search_course_content',
    description: 'Найти информацию из материалов курса (уроки, концепции, аналогии, упражнения). Используй, когда студент спрашивает о содержании урока, концепции или аналогии.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Текст запроса для поиска в материалах курса',
        },
        session_number: {
          type: 'integer',
          description: 'Номер сессии (если известен)',
        },
        module: {
          type: 'integer',
          description: 'Номер модуля (если известен)',
        },
      },
      required: ['query'],
    },
  },
];

// ============================================
// Tool handlers
// ============================================

async function handleGetStudentProgress(student: Student): Promise<string> {
  const exercises = await getExercisesByStudent(student.id);
  const sessions = await getPublishedSessions();

  const progress = sessions.map((session) => {
    const exercise = exercises.find((e) => e.session_id === session.id);
    // Fallback: match by module + exercise_number (for exercises without session_id)
    const exerciseFallback = exercise ?? exercises.find(
      (e) => e.module === session.module && e.exercise_number === session.session_number
    );

    return {
      session_number: session.session_number,
      session_title: session.title,
      status: exerciseFallback?.status ?? null,
      score: (exerciseFallback?.ai_review as Record<string, unknown>)?.score ?? null,
      feedback: exerciseFallback?.feedback ?? null,
    };
  });

  return JSON.stringify({
    student: {
      name: student.name,
      pod_id: student.pod_id,
      status: student.status,
    },
    submissions: progress,
  });
}

async function handleGetSessionExercise(
  sessionNumber: number,
  student: Student
): Promise<string> {
  const session = await getSessionByNumber(sessionNumber);

  if (!session) {
    return JSON.stringify({ error: 'session_not_found', message: `Сессия ${sessionNumber} не найдена.` });
  }

  if (session.status !== 'published') {
    return JSON.stringify({ error: 'session_not_published', message: `Сессия ${sessionNumber} ещё не опубликована.` });
  }

  // Check if already submitted
  const exercises = await getExercisesByStudent(student.id);
  const existing = exercises.filter((e) => e.session_id === session.id);
  const latestSubmission = existing.length > 0 ? existing[existing.length - 1] : null;
  const alreadyApproved = latestSubmission?.status === 'approved';

  return JSON.stringify({
    session_number: session.session_number,
    title: session.title,
    module: session.module,
    exercise_title: session.exercise_title,
    exercise_description: session.exercise_description,
    expected_deliverables: session.expected_deliverables,
    exercise_tips: session.exercise_tips,
    deadline: session.deadline,
    already_submitted: latestSubmission !== null,
    latest_status: latestSubmission?.status ?? null,
    already_approved: alreadyApproved,
  });
}

async function handleCreateSubmission(
  sessionNumber: number,
  studentComment: string | undefined,
  student: Student,
  pendingAttachments: PendingAttachment[]
): Promise<string> {
  const session = await getSessionByNumber(sessionNumber);

  if (!session) {
    return JSON.stringify({ error: 'session_not_found' });
  }

  if (session.status !== 'published') {
    return JSON.stringify({ error: 'session_not_published' });
  }

  // Create the exercise submission
  const exercise = await submitExercise({
    student_id: student.id,
    module: session.module,
    exercise_number: session.session_number,
    submission_url: pendingAttachments.find((a) => a.type === 'url')?.storagePath ?? '',
    submission_type: pendingAttachments.length > 0
      ? pendingAttachments.map((a) => a.type).join('+')
      : 'text',
  });

  // Update session_id on the exercise
  const { getSupabase } = await import('../../db/client.js');
  const db = getSupabase();
  await db.from('student_exercises').update({ session_id: session.id }).eq('id', exercise.id);

  // Create attachment records
  for (const attachment of pendingAttachments) {
    await addAttachment({
      exercise_id: exercise.id,
      type: attachment.type,
      url: attachment.type === 'url' ? attachment.storagePath : undefined,
      storage_path: attachment.type !== 'url' ? attachment.storagePath : undefined,
      original_filename: attachment.originalFilename,
      mime_type: attachment.mimeType,
      text_content: attachment.type === 'text' ? attachment.storagePath : undefined,
    });
  }

  // Create event for Telegram notification
  await createFormationEvent({
    type: 'exercise_submitted',
    source: 'discord',
    target: 'telegram-admin',
    data: {
      student_name: student.name,
      student_id: student.id,
      session_number: sessionNumber,
      session_title: session.title,
      exercise_id: exercise.id,
      attachment_count: pendingAttachments.length,
      comment: studentComment ?? null,
    },
  });

  logger.info(
    { studentId: student.id, sessionNumber, exerciseId: exercise.id, attachments: pendingAttachments.length },
    'Exercise submitted via DM agent'
  );

  return JSON.stringify({
    success: true,
    exercise_id: exercise.id,
    message: 'Задание отправлено на проверку',
  });
}

async function handleSearchCourseContent(
  query: string,
  sessionNumber?: number,
  module?: number
): Promise<string> {
  const queryEmbedding = await getEmbedding(query);

  const results = await searchFormationKnowledge(query, queryEmbedding, {
    matchCount: 5,
    sessionNumber: sessionNumber ?? null,
    module: module ?? null,
  });

  if (results.length === 0) {
    return JSON.stringify({ results: [], message: 'Ничего не найдено по этому запросу.' });
  }

  return JSON.stringify({
    results: results.map((r) => ({
      title: r.title,
      content: r.content,
      module: r.module,
      session_number: r.session_number,
      type: r.content_type,
      score: Math.round(r.final_score * 100) / 100,
    })),
  });
}

async function handleGetPendingFeedback(student: Student): Promise<string> {
  const exercises = await getExercisesByStudent(student.id);

  const feedback = exercises
    .filter((e) => e.status === 'ai_reviewed' || e.status === 'approved' || e.status === 'revision_needed')
    .map((e) => {
      const aiReview = e.ai_review as Record<string, unknown> | null;
      return {
        session_number: e.exercise_number,
        module: e.module,
        type: e.status === 'ai_reviewed'
          ? 'ai_review'
          : e.status === 'approved'
            ? 'approved'
            : 'revision_needed',
        score: aiReview?.score ?? null,
        summary: aiReview?.summary ?? null,
        strengths: aiReview?.strengths ?? null,
        improvements: aiReview?.improvements ?? null,
        feedback: e.feedback,
      };
    });

  return JSON.stringify({ feedback });
}

// ============================================
// Main agent function
// ============================================

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (anthropicClient) return anthropicClient;
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');
  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

export async function runDmAgent(context: DmAgentContext): Promise<DmAgentResponse> {
  const client = getAnthropicClient();

  // 1. Identify student
  const student = await getStudentByDiscordId(context.discordUserId);
  if (!student) {
    return {
      text: 'Привет! Я не нашёл тебя в списке студентов. Свяжись с тренером для получения доступа.',
    };
  }

  // 2. Build messages array for Claude
  const messages: Anthropic.Messages.MessageParam[] = context.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Append attachment info to the last user message if present
  if (context.newAttachmentsInfo && messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'user' && typeof lastMsg.content === 'string') {
      lastMsg.content = `${lastMsg.content}\n\n[Система: ${context.newAttachmentsInfo}]`;
    }
  }

  // 3. Tool use loop (max 5 iterations to prevent infinite loops)
  let response: Anthropic.Messages.Message;
  let iterations = 0;
  const maxIterations = 5;
  let submissionId: string | undefined;

  while (iterations < maxIterations) {
    iterations++;

    logger.debug(
      { studentId: student.id, iteration: iterations, messageCount: messages.length },
      'DM agent calling Claude'
    );

    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    // Check if Claude wants to use tools
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
    );

    if (toolUseBlocks.length === 0) {
      // No tools, just text — we're done
      break;
    }

    // Add Claude's response (with tool_use blocks) to messages
    messages.push({ role: 'assistant', content: response.content });

    // Execute each tool and add results
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const input = toolUse.input as Record<string, unknown>;
      let result: string;

      try {
        switch (toolUse.name) {
          case 'get_student_progress':
            result = await handleGetStudentProgress(student);
            break;
          case 'get_session_exercise':
            result = await handleGetSessionExercise(
              input.session_number as number,
              student
            );
            break;
          case 'create_submission': {
            result = await handleCreateSubmission(
              input.session_number as number,
              input.student_comment as string | undefined,
              student,
              context.pendingAttachments
            );
            const parsed = JSON.parse(result) as { success?: boolean; exercise_id?: string };
            if (parsed.success && parsed.exercise_id) {
              submissionId = parsed.exercise_id;
            }
            break;
          }
          case 'get_pending_feedback':
            result = await handleGetPendingFeedback(student);
            break;
          case 'search_course_content':
            result = await handleSearchCourseContent(
              input.query as string,
              input.session_number as number | undefined,
              input.module as number | undefined
            );
            break;
          default:
            result = JSON.stringify({ error: `Unknown tool: ${toolUse.name}` });
        }
      } catch (err) {
        logger.error({ err, tool: toolUse.name, studentId: student.id }, 'DM agent tool error');
        result = JSON.stringify({ error: 'internal_error', message: 'Ошибка при обработке запроса' });
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    // Add tool results as user message
    messages.push({ role: 'user', content: toolResults });
  }

  // Extract text from the final response
  const textBlocks = response!.content.filter(
    (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
  );
  const text = textBlocks.map((b) => b.text).join('\n') || 'Не удалось обработать запрос. Попробуй ещё раз.';

  logger.info(
    { studentId: student.id, iterations, hasSubmission: !!submissionId },
    'DM agent response ready'
  );

  return { text, submissionId };
}
