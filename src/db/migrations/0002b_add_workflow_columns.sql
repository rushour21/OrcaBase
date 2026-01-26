-- ============================================================
-- ADD MISSING COLUMNS TO db_query_sessions
-- Run this to update existing table with new workflow fields
-- ============================================================

-- Add query state columns for follow-ups
ALTER TABLE db_query_sessions 
ADD COLUMN IF NOT EXISTS last_query_plan JSONB;

ALTER TABLE db_query_sessions 
ADD COLUMN IF NOT EXISTS last_tables_used TEXT[];

ALTER TABLE db_query_sessions 
ADD COLUMN IF NOT EXISTS last_filters JSONB;

-- Add web search toggle
ALTER TABLE db_query_sessions 
ADD COLUMN IF NOT EXISTS web_search_enabled BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN db_query_sessions.last_query_plan IS 'Last logical query plan for follow-up modifications';
COMMENT ON COLUMN db_query_sessions.last_tables_used IS 'Tables used in last query for context';
COMMENT ON COLUMN db_query_sessions.web_search_enabled IS 'Whether web search tool is enabled for this session';
