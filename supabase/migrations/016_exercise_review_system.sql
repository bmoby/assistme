-- Support re-submission tracking + Discord notification
ALTER TABLE student_exercises ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 1;
ALTER TABLE student_exercises ADD COLUMN IF NOT EXISTS review_history JSONB DEFAULT '[]';
ALTER TABLE student_exercises ADD COLUMN IF NOT EXISTS notification_message_id TEXT;
