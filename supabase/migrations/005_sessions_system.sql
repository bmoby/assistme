-- ============================================
-- Vibe Coder - Sessions & DM Agent System
-- Migration 005
-- ============================================

-- ============================================
-- SESSIONS (defines each of the 24 sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_number INTEGER NOT NULL UNIQUE,
  module INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  -- Session content
  pre_session_video_url TEXT,
  replay_url TEXT,
  -- Exercise definition
  exercise_title TEXT,
  exercise_description TEXT,
  expected_deliverables TEXT,
  exercise_tips TEXT,
  deadline TIMESTAMPTZ,
  -- Discord
  discord_thread_id TEXT,
  -- State
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBMISSION ATTACHMENTS (files, URLs, text per exercise)
-- ============================================
CREATE TABLE IF NOT EXISTS submission_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_id UUID NOT NULL REFERENCES student_exercises(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('url', 'file', 'text', 'image')),
  -- For type 'url'
  url TEXT,
  -- For type 'file' or 'image'
  storage_path TEXT,
  original_filename TEXT,
  mime_type TEXT,
  file_size INTEGER,
  -- For type 'text'
  text_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MODIFY student_exercises: add session reference
-- ============================================
ALTER TABLE student_exercises
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sessions_number ON sessions(session_number);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_submission_attachments_exercise ON submission_attachments(exercise_id);
CREATE INDEX IF NOT EXISTS idx_student_exercises_session ON student_exercises(session_id);
