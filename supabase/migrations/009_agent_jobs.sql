-- Agent Jobs — autonomous agent system
CREATE TABLE IF NOT EXISTS agent_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}',
  origin JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result_text TEXT,
  result_files JSONB DEFAULT '[]',
  chain_to JSONB,
  error TEXT,
  parent_job_id UUID REFERENCES agent_jobs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_jobs_pending ON agent_jobs(status) WHERE status = 'pending';
CREATE INDEX idx_agent_jobs_agent ON agent_jobs(agent_name);

-- Storage bucket for agent outputs
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-outputs', 'agent-outputs', false)
ON CONFLICT (id) DO NOTHING;
