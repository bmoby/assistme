-- Migration 006: Memory Tiers System — core/working/archival
-- Adds tier column (core/working/archival) to memory table
-- for intelligent context building and memory consolidation.

-- Add tier column with default 'working'
ALTER TABLE memory ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'working'
  CHECK (tier IN ('core', 'working', 'archival'));

-- Indexes for tier-based queries
CREATE INDEX IF NOT EXISTS idx_memory_tier ON memory (tier);
CREATE INDEX IF NOT EXISTS idx_memory_tier_category ON memory (tier, category);
CREATE INDEX IF NOT EXISTS idx_memory_expires_at ON memory (expires_at) WHERE expires_at IS NOT NULL;

-- Migrate existing data to appropriate tiers
UPDATE memory SET tier = 'core' WHERE category = 'identity';
UPDATE memory SET tier = 'archival' WHERE category = 'lesson';
-- situation, preference, relationship stay as 'working'

-- Set default expiration for working memories that don't have one
UPDATE memory SET expires_at = NOW() + INTERVAL '30 days'
  WHERE tier = 'working' AND expires_at IS NULL;
