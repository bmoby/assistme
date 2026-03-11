-- ============================================
-- Vibe Coder - Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TASKS
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'personal'
    CHECK (category IN ('client', 'student', 'content', 'personal', 'dev', 'team')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('urgent', 'important', 'normal', 'low')),
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'waiting', 'done', 'cancelled')),
  due_date TIMESTAMPTZ,
  due_time TEXT,
  estimated_minutes INTEGER,
  completed_at TIMESTAMPTZ,
  source TEXT DEFAULT 'manual',
  related_id UUID,
  related_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DAILY PLANS
-- ============================================
CREATE TABLE IF NOT EXISTS daily_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL,
  plan JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'generated'
    CHECK (status IN ('generated', 'active', 'completed')),
  review TEXT,
  productivity_score INTEGER CHECK (productivity_score BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLIENTS
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  source TEXT DEFAULT 'instagram',
  business_type TEXT,
  need TEXT,
  budget_range TEXT,
  status TEXT NOT NULL DEFAULT 'lead'
    CHECK (status IN ('lead', 'qualified', 'proposal_sent', 'accepted', 'in_progress', 'delivered', 'paid')),
  qualification_data JSONB,
  proposal_url TEXT,
  assigned_to UUID,
  project_deadline TIMESTAMPTZ,
  amount DECIMAL,
  commission_amount DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEAM MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  discord_id TEXT,
  telegram_id TEXT,
  phone TEXT,
  skills JSONB,
  availability TEXT DEFAULT 'available'
    CHECK (availability IN ('available', 'busy', 'unavailable')),
  current_project_id UUID,
  total_projects INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for clients.assigned_to -> team_members
ALTER TABLE clients
  ADD CONSTRAINT fk_clients_assigned_to
  FOREIGN KEY (assigned_to) REFERENCES team_members(id);

-- ============================================
-- STUDENT EXERCISES
-- ============================================
CREATE TABLE IF NOT EXISTS student_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID,
  module INTEGER,
  exercise_number INTEGER,
  submission_url TEXT,
  submission_type TEXT DEFAULT 'link',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  ai_review JSONB,
  manual_review TEXT,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'ai_reviewed', 'reviewed', 'approved', 'revision_needed')),
  reviewed_at TIMESTAMPTZ,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MESSAGES LOG
-- ============================================
CREATE TABLE IF NOT EXISTS messages_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  sender_name TEXT,
  sender_id TEXT,
  message_text TEXT NOT NULL,
  category TEXT,
  auto_response TEXT,
  requires_manual BOOLEAN DEFAULT FALSE,
  handled BOOLEAN DEFAULT FALSE,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTENT IDEAS
-- ============================================
CREATE TABLE IF NOT EXISTS content_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  topic TEXT,
  angle TEXT,
  type TEXT DEFAULT 'educational',
  platform TEXT DEFAULT 'both',
  key_points JSONB,
  status TEXT NOT NULL DEFAULT 'idea'
    CHECK (status IN ('idea', 'researched', 'scripted', 'filmed', 'published')),
  published_at TIMESTAMPTZ,
  published_url TEXT,
  engagement JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HABITS
-- ============================================
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  wake_up_time TIMESTAMPTZ,
  sleep_time TIMESTAMPTZ,
  work_start TIMESTAMPTZ,
  work_end TIMESTAMPTZ,
  sport_done BOOLEAN DEFAULT FALSE,
  sport_duration INTEGER,
  tasks_completed INTEGER DEFAULT 0,
  tasks_total INTEGER DEFAULT 0,
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REMINDERS
-- ============================================
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT NOT NULL,
  trigger_at TIMESTAMPTZ NOT NULL,
  repeat TEXT DEFAULT 'once'
    CHECK (repeat IN ('once', 'daily', 'weekly', 'custom')),
  repeat_config JSONB,
  channel TEXT DEFAULT 'telegram',
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'sent', 'cancelled')),
  task_id UUID REFERENCES tasks(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FAQ ENTRIES (for Discord bot)
-- ============================================
CREATE TABLE IF NOT EXISTS faq_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  times_used INTEGER DEFAULT 0,
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_daily_plans_date ON daily_plans(date);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_messages_log_handled ON messages_log(handled);
CREATE INDEX idx_reminders_trigger ON reminders(trigger_at) WHERE status = 'active';
CREATE INDEX idx_habits_date ON habits(date);
