-- ============================================================
-- DB QUERY SESSIONS (CHAT CONTEXT) - Updated for Industry Workflow
-- ============================================================

CREATE TABLE IF NOT EXISTS db_query_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL,
  database_id UUID
    REFERENCES workspace_databases(id)
    ON DELETE CASCADE,

  user_id UUID NOT NULL,

  title TEXT DEFAULT 'New Session',
  status VARCHAR(20) DEFAULT 'active', -- active | closed | archived
  
  -- Query state for follow-ups (NEW)
  last_query_plan JSONB,
  last_tables_used TEXT[],
  last_filters JSONB,
  
  -- Web search toggle (NEW)
  web_search_enabled BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_db_query_sessions_workspace
  ON db_query_sessions(workspace_id);

CREATE INDEX IF NOT EXISTS idx_db_query_sessions_user
  ON db_query_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_db_query_sessions_created
  ON db_query_sessions(created_at DESC);

-- ============================================================
-- SESSION MESSAGES (NEW TABLE)
-- ============================================================

CREATE TABLE IF NOT EXISTS session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Metadata for special messages (SQL, approval status, etc.)
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_session FOREIGN KEY (session_id) 
    REFERENCES db_query_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON session_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON session_messages(created_at);

-- ============================================================
-- TRIGGER FOR AUTO-UPDATE TIMESTAMP
-- ============================================================

CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_session_timestamp ON db_query_sessions;
CREATE TRIGGER trigger_update_session_timestamp
BEFORE UPDATE ON db_query_sessions
FOR EACH ROW
EXECUTE FUNCTION update_session_timestamp();

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE db_query_sessions IS 'Database chat sessions with query state for follow-ups';
COMMENT ON COLUMN db_query_sessions.last_query_plan IS 'Last logical query plan for follow-up modifications';
COMMENT ON COLUMN db_query_sessions.last_tables_used IS 'Tables used in last query for context';
COMMENT ON COLUMN db_query_sessions.web_search_enabled IS 'Whether web search tool is enabled for this session';

COMMENT ON TABLE session_messages IS 'Chat messages within a session';
COMMENT ON COLUMN session_messages.metadata IS 'Additional data like SQL, approval status, etc.';
