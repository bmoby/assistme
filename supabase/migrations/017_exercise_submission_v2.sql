-- 017_exercise_submission_v2.sql — Partial unique index + review thread columns

-- ============================================
-- Part 1: Partial unique index to prevent duplicate active submissions
-- per (student_id, session_id) pair.
-- Uses a DO block to safely check for existing duplicates before creating.
-- ============================================
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO dup_count
  FROM (
    SELECT student_id, session_id
    FROM student_exercises
    WHERE status IN ('submitted', 'ai_reviewed')
      AND session_id IS NOT NULL
    GROUP BY student_id, session_id
    HAVING COUNT(*) > 1
  ) dups;

  IF dup_count > 0 THEN
    RAISE WARNING 'Found % duplicate (student_id, session_id) pairs in active statuses. Index not created — manual cleanup required.', dup_count;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_student_exercise_active
      ON student_exercises (student_id, session_id)
      WHERE status IN ('submitted', 'ai_reviewed');
    RAISE NOTICE 'Unique index uq_student_exercise_active created successfully.';
  END IF;
END $$;

-- ============================================
-- Part 2: Review thread columns for Discord thread-based review UX
-- ============================================
ALTER TABLE student_exercises
  ADD COLUMN IF NOT EXISTS review_thread_id TEXT,
  ADD COLUMN IF NOT EXISTS review_thread_ai_message_id TEXT;
