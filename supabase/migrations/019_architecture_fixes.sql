-- ============================================
-- Vibe Coder - Architecture Fixes
-- Migration 019
-- ============================================

-- Fix 1: reminders FK — add ON DELETE SET NULL for task_id
-- Previously had FK without DELETE action, causing errors when deleting tasks with reminders
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_task_id_fkey;
ALTER TABLE reminders
  ADD CONSTRAINT reminders_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- Fix 2: Compound index for closeExpiredQuizSessions query (status + created_at)
CREATE INDEX IF NOT EXISTS idx_student_quiz_sessions_status_created
  ON student_quiz_sessions(status, created_at);

-- Fix 3: Index on is_correct for score aggregation queries
CREATE INDEX IF NOT EXISTS idx_student_quiz_answers_is_correct
  ON student_quiz_answers(is_correct);

-- Fix 4: Index on quizzes.created_at for time-based expiration queries
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at
  ON quizzes(created_at);
