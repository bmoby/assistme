-- Migration: Remove ai_reviewed status from student_exercises
-- Any exercises still in ai_reviewed status (legacy from AI auto-review)
-- are moved to submitted so they appear in the admin pending queue.
UPDATE student_exercises
SET status = 'submitted'
WHERE status = 'ai_reviewed';
