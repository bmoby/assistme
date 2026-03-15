-- ============================================
-- Vibe Coder - Students System (Formation Session 2)
-- Migration 004
-- ============================================

-- ============================================
-- STUDENTS
-- ============================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  telegram_id TEXT,
  discord_id TEXT UNIQUE,
  session INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'interested'
    CHECK (status IN ('interested', 'registered', 'paid', 'active', 'completed', 'dropped')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'partial', 'paid')),
  payment_amount DECIMAL,
  payment_method TEXT,
  payment_details JSONB,
  pod_id INTEGER CHECK (pod_id BETWEEN 1 AND 8),
  mentor_id UUID,
  enrolled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foreign key: students.mentor_id -> team_members
ALTER TABLE students
  ADD CONSTRAINT fk_students_mentor
  FOREIGN KEY (mentor_id) REFERENCES team_members(id);

-- Foreign key: student_exercises.student_id -> students (was missing)
ALTER TABLE student_exercises
  ADD CONSTRAINT fk_student_exercises_student
  FOREIGN KEY (student_id) REFERENCES students(id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_students_discord_id ON students(discord_id);
CREATE INDEX IF NOT EXISTS idx_students_session ON students(session);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_student_exercises_student ON student_exercises(student_id);
CREATE INDEX IF NOT EXISTS idx_student_exercises_status ON student_exercises(status);
CREATE INDEX IF NOT EXISTS idx_faq_entries_category ON faq_entries(category);
