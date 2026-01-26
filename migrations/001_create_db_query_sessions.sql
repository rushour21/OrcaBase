-- Migration: Create database chat sessions tables
-- Version: 001
-- Description: Session management for database chat with query state persistence

-- Create db_query_sessions table
CREATE TABLE IF NOT EXISTS db_query_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  title VARCHAR(255) DEFAULT 'New Session',
  
  -- Query state for follow-ups
  last_query_plan JSONB,
  last_tables_used TEXT[],
  last_filters JSONB,
  
  -- Web search toggle
  web_search_enabled BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT fk_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON db_query_sessions(user_id);
CREATE INDEX idx_sessions_workspace ON db_query_sessions(workspace_id);
CREATE INDEX idx_sessions_created ON db_query_sessions(created_at DESC);

-- Create session_messages table
CREATE TABLE IF NOT EXISTS session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Metadata for special messages
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES db_query_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_session ON session_messages(session_id);
CREATE INDEX idx_messages_created ON session_messages(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_session_timestamp
BEFORE UPDATE ON db_query_sessions
FOR EACH ROW
EXECUTE FUNCTION update_session_timestamp();

-- Comments for documentation
COMMENT ON TABLE db_query_sessions IS 'Database chat sessions with query state for follow-ups';
COMMENT ON COLUMN db_query_sessions.last_query_plan IS 'Last logical query plan for follow-up modifications';
COMMENT ON COLUMN db_query_sessions.last_tables_used IS 'Tables used in last query for context';
COMMENT ON COLUMN db_query_sessions.web_search_enabled IS 'Whether web search tool is enabled for this session';

COMMENT ON TABLE session_messages IS 'Chat messages within a session';
COMMENT ON COLUMN session_messages.metadata IS 'Additional data like SQL, approval status, etc.';
