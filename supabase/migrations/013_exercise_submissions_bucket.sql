-- Create private bucket for exercise submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-submissions', 'exercise-submissions', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: service role only (all access via signed URLs)
-- No additional RLS policies needed — service_role key bypasses RLS
