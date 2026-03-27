-- ============================================
-- Vibe Coder - Quiz System
-- Migration 018
-- ============================================

-- quizzes table (DATA-01)
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'closed')),
  questions_data JSONB,
  original_txt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- quiz_questions table (DATA-02)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'true_false', 'open')),
  question_text TEXT NOT NULL,
  choices JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- student_quiz_sessions table (DATA-03)
CREATE TABLE IF NOT EXISTS student_quiz_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'expired_incomplete')),
  current_question INTEGER NOT NULL DEFAULT 0,
  score DECIMAL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- student_quiz_answers table (DATA-04)
CREATE TABLE IF NOT EXISTS student_quiz_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES student_quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  student_answer TEXT NOT NULL,
  is_correct BOOLEAN,
  ai_evaluation JSONB,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_session_number ON quizzes(session_number);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_number ON quiz_questions(quiz_id, question_number);
CREATE INDEX IF NOT EXISTS idx_student_quiz_sessions_student ON student_quiz_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_quiz_sessions_quiz ON student_quiz_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_student_quiz_sessions_status ON student_quiz_sessions(status);
CREATE INDEX IF NOT EXISTS idx_student_quiz_answers_session ON student_quiz_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_student_quiz_answers_question ON student_quiz_answers(question_id);
