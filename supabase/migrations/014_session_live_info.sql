-- Add live session info (date/time + channel)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS live_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS live_channel TEXT;
